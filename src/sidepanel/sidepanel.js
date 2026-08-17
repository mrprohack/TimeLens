import { escapeHtml, formatDuration, send, setText } from '../shared/ui.js';

let state = null;
const DEFAULT_FOCUS_DOMAINS = ['youtube.com', 'reddit.com', 'instagram.com', 'facebook.com', 'x.com'];

function status(message = '') {
  setText('side-status', message);
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
  node.innerHTML = presets.slice(0, 4).map((preset) => `<button class="preset-chip" type="button" data-preset="${escapeHtml(preset.id)}">${escapeHtml(preset.name)} · ${escapeHtml(formatDuration(preset.minutes * 60_000, true))}</button>`).join('');
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
    focusButton.textContent = 'Start 25 min Focus';
    focusButton.classList.add('btn-primary');
  }
  renderPresets();
}

async function refresh() {
  try {
    state = await send('GET_SNAPSHOT', { rangeDays: 7 });
    render();
  } catch (error) { status(error.message); }
}

document.getElementById('side-limit-site').addEventListener('click', async () => {
  if (!state?.currentDomain || currentLimit()) return;
  const button = document.getElementById('side-limit-site');
  const minutes = Number(document.getElementById('side-limit-minutes').value) || 30;
  button.disabled = true;
  try {
    await send('SAVE_LIMIT', { limit: { domain: state.currentDomain, minutes, period: 'daily', strict: false, enabled: true } });
    status(`${state.currentDomain} limited to ${minutes} minutes per day.`);
    await refresh();
  } catch (error) { status(error.message); }
  finally { button.disabled = false; }
});

document.getElementById('side-focus-action').addEventListener('click', async () => {
  const button = document.getElementById('side-focus-action');
  button.disabled = true;
  try {
    if (state?.focus) await send('STOP_FOCUS');
    else await send('START_FOCUS', { minutes: 25, domains: DEFAULT_FOCUS_DOMAINS, mode: 'block', name: 'Focus' });
    await refresh();
  } catch (error) { status(error.message); }
  finally { button.disabled = false; }
});

document.getElementById('side-focus-presets').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-preset]');
  if (!button) return;
  const preset = state?.settings?.focusPresets?.find((item) => item.id === button.dataset.preset);
  if (!preset) return;
  button.disabled = true;
  try {
    await send('START_FOCUS', { minutes: preset.minutes, domains: preset.domains, mode: preset.mode, name: preset.name });
    status(`${preset.name} started.`);
    await refresh();
  } catch (error) { status(error.message); }
  finally { button.disabled = false; }
});

document.getElementById('side-open-dashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
});

document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
setInterval(() => { if (!document.hidden) refresh(); }, 15_000);
refresh();
