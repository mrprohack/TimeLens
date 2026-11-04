import { escapeHtml, formatDuration, send, setBusy, setText } from '../shared/ui.js';
import { focusStartLabel, quickFocusPayload } from '../core/focus.js';
import { formatMinutesShort } from '../core/time.js';
import { createNotice } from '../shared/notice.js';
import {
  getLastFocusPresetId,
  getLastLimitMinutes,
  rememberFocusPreset,
  rememberLimitMinutes
} from '../shared/quick-actions.js';

// `state` only ever comes from the worker, so every action below runs on live data.
let state = null;
const notice = createNotice(document.getElementById('side-notice'));

// Poll gently when healthy, back off when the worker is busy or restarting.
const BASE_POLL_MS = 15_000;
const MAX_POLL_MS = 60_000;
let pollTimer = null;
let consecutiveFailures = 0;

function status(message = '', options = {}) {
  if (!message) notice.clear();
  else notice.show(message, { timeoutMs: 6_000, ...options });
}

function statusError(message) {
  status(message, { tone: 'error', timeoutMs: 7_000 });
}

function quickPayload() {
  return quickFocusPayload(state?.settings?.focusPresets, getLastFocusPresetId());
}

async function startFocus(payload) {
  const { presetId, ...session } = payload;
  await send('START_FOCUS', session);
  rememberFocusPreset(presetId);
}

function currentLimit() {
  return state?.limits?.find((limit) => limit.domain === state.currentDomain && limit.enabled && limit.scheduleActive !== false) || null;
}

function strongestBoundary() {
  const candidates = [];
  const limit = currentLimit();
  if (limit) candidates.push({ label: 'Site limit', remainingMs: limit.remainingMs, reached: limit.reached, period: limit.period });
  for (const category of state?.currentCategoryLimits || []) {
    if (!category.enabled || category.scheduleActive === false) continue;
    candidates.push({ label: category.name, remainingMs: category.remainingMs, reached: category.reached, period: category.period });
  }
  const budget = state?.totalBudget;
  if (budget?.enabled) candidates.push({ label: 'Daily budget', remainingMs: budget.remainingMs, reached: budget.reached, period: 'daily' });
  candidates.sort((a, b) => (a.reached === b.reached ? (a.remainingMs || 0) - (b.remainingMs || 0) : a.reached ? -1 : 1));
  return candidates[0] || null;
}

function renderPresets() {
  const node = document.getElementById('side-focus-presets');
  const presets = state?.settings?.focusPresets || [];
  node.innerHTML = presets.slice(0, 4).map((preset) => `<button class="preset-chip" type="button" data-preset="${escapeHtml(preset.id)}">${escapeHtml(preset.name)} · ${escapeHtml(formatMinutesShort(preset.minutes))}</button>`).join('');
  node.hidden = Boolean(state?.focus) || !presets.length;
}

function render() {
  setText('side-current-domain', state?.currentDomain || 'No active website');
  setText('side-current-time', state?.currentDomain ? `${formatDuration(state.currentDomainMs || 0, true)} today` : '0m today');

  const boundary = strongestBoundary();
  setText('side-boundary', boundary
    ? (boundary.reached ? `${boundary.label}: limit reached` : `${boundary.label}: ${formatDuration(Math.max(0, boundary.remainingMs || 0), true)} left`)
    : 'No active limit.');

  const limit = currentLimit();
  const limitButton = document.getElementById('side-limit-site');
  limitButton.disabled = !state?.currentDomain || Boolean(limit);
  limitButton.textContent = limit ? 'Limit set' : 'Set limit';

  const focusButton = document.getElementById('side-focus-action');
  if (state?.focus) {
    const remaining = Math.max(0, state.focus.endsAt - Date.now());
    setText('side-focus-state', state.focus.name || 'Focus');
    focusButton.textContent = `End Focus · ${formatDuration(remaining, true)} left`;
    focusButton.classList.remove('btn-primary');
  } else {
    setText('side-focus-state', 'Ready');
    focusButton.textContent = focusStartLabel(quickPayload());
    focusButton.classList.add('btn-primary');
  }
  renderPresets();
}

async function refresh() {
  try {
    state = await send('GET_SNAPSHOT', { rangeDays: 7 });
    consecutiveFailures = 0;
    render();
  } catch (error) {
    consecutiveFailures += 1;
    statusError(error.message);
  }
}

function schedulePoll() {
  clearTimeout(pollTimer);
  const delayMs = Math.min(MAX_POLL_MS, BASE_POLL_MS * 2 ** consecutiveFailures);
  pollTimer = setTimeout(tick, delayMs);
}

async function tick() {
  if (!document.hidden) await refresh();
  schedulePoll();
}

const limitSelect = document.getElementById('side-limit-minutes');
limitSelect.value = String(getLastLimitMinutes());
limitSelect.addEventListener('change', () => rememberLimitMinutes(limitSelect.value));

document.getElementById('side-limit-site').addEventListener('click', async () => {
  if (!state?.currentDomain || currentLimit()) return;
  const button = document.getElementById('side-limit-site');
  const domain = state.currentDomain;
  const minutes = Number(limitSelect.value) || 30;
  setBusy(button);
  try {
    await send('SAVE_LIMIT', { limit: { domain, minutes, period: 'daily', strict: false, enabled: true } });
    rememberLimitMinutes(minutes);
    status(`${domain} limited to ${minutes} minutes per day.`, {
      actionLabel: 'Undo',
      onAction: async () => {
        await send('DELETE_LIMIT', { domain });
        await refresh();
        return `Limit for ${domain} removed.`;
      }
    });
    await refresh();
  } catch (error) { statusError(error.message); }
  finally {
    setBusy(button, false);
    render();
  }
});

document.getElementById('side-focus-action').addEventListener('click', async () => {
  const button = document.getElementById('side-focus-action');
  if (!state) {
    statusError('TimeLens is still loading. Try again in a moment.');
    return;
  }
  setBusy(button);
  try {
    if (state.focus) await send('STOP_FOCUS');
    else await startFocus(quickPayload());
    await refresh();
  } catch (error) { statusError(error.message); }
  finally {
    setBusy(button, false);
    render();
  }
});

document.getElementById('side-focus-presets').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-preset]');
  if (!button) return;
  const preset = state?.settings?.focusPresets?.find((item) => item.id === button.dataset.preset);
  if (!preset) return;
  setBusy(button);
  try {
    await startFocus(quickFocusPayload([preset], preset.id));
    status(`${preset.name} started.`);
    await refresh();
  } catch (error) { statusError(error.message); }
  finally {
    setBusy(button, false);
    render();
  }
});

document.getElementById('side-open-dashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  consecutiveFailures = 0;
  refresh();
  schedulePoll();
});
tick();
