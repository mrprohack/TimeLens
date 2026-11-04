import { escapeHtml, formatDuration, send, setBusy, setText } from '../shared/ui.js';
import { trackState } from '../core/track-state.js';
import { focusStartLabel, quickFocusPayload } from '../core/focus.js';
import { formatMinutesShort } from '../core/time.js';
import { readCachedSnapshot, writeCachedSnapshot } from '../shared/snapshot-cache.js';
import { createNotice } from '../shared/notice.js';
import {
  LIMIT_MINUTE_CHOICES,
  getLastFocusPresetId,
  getLastLimitMinutes,
  rememberFocusPreset,
  rememberLimitMinutes
} from '../shared/quick-actions.js';

let snapshot = null;
// True only once `snapshot` came from the worker. Cached or failed state must never
// drive an action: it could start a Focus with default sites or limit a stale site.
let snapshotIsLive = false;
let limitMinutes = getLastLimitMinutes();
let ticker = null;
// Resolves once the first live snapshot attempt settles. Actions wait on it so a
// click on the instantly-painted cached state can never act on stale data (for
// example limiting a site the user has already navigated away from).
let livePromise = Promise.resolve();

const notice = createNotice(document.getElementById('notice'));

function presetsOf(source) {
  return source?.settings?.focusPresets || source?.focusPresets || [];
}

function quickPayload() {
  return quickFocusPayload(presetsOf(snapshot), getLastFocusPresetId());
}

function initial(domain) {
  return domain ? domain[0].toUpperCase() : '—';
}

function currentLimit() {
  return snapshot?.limits?.find((limit) => limit.domain === snapshot.currentDomain) || null;
}

function summaryProgress() {
  const budget = snapshot?.totalBudget;
  if (budget?.enabled && budget.effectiveMs > 0) {
    const used = Math.max(0, budget.effectiveMs - Math.max(0, budget.remainingMs || 0));
    return Math.min(100, Math.max(0, Math.round((used / budget.effectiveMs) * 100)));
  }
  const limit = currentLimit();
  if (limit?.effectiveMs > 0) {
    const used = Math.max(0, limit.effectiveMs - Math.max(0, limit.remainingMs || 0));
    return Math.min(100, Math.max(0, Math.round((used / limit.effectiveMs) * 100)));
  }
  return 0;
}

function renderTopSites() {
  const node = document.getElementById('top-sites');
  const sites = (snapshot?.todayTop || []).slice(0, 3);
  document.getElementById('top-sites-section').hidden = !sites.length;
  node.innerHTML = sites.map((site) => `<div class="site-item"><span class="site-name">${escapeHtml(site.domain)}</span><span class="site-time">${escapeHtml(formatDuration(site.durationMs, true))}</span></div>`).join('');
}

function focusButtonCopy() {
  if (!snapshot?.focus) return focusStartLabel(quickPayload());
  const remainingMs = Math.max(0, snapshot.focus.endsAt - Date.now());
  return remainingMs > 0 ? `End Focus · ${formatDuration(remainingMs, true)} left` : 'Focus finishing…';
}

function renderTrackPill() {
  const pill = document.getElementById('on-track-pill');
  if (!pill) return;
  const state = trackState(snapshot);
  pill.textContent = state.label;
  pill.dataset.tone = state.tone;
}

function chip(label, attributes, pressed = false) {
  const extra = Object.entries(attributes).map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(' ');
  return `<button type="button" class="preset-chip${pressed ? ' is-selected' : ''}" ${extra}${pressed ? ' aria-pressed="true"' : ' aria-pressed="false"'}>${escapeHtml(label)}</button>`;
}

// One-tap alternatives. Focus presets other than the one the main button starts, and
// the daily time for "Limit this site", which is remembered between uses.
function renderQuickOptions() {
  const presetNode = document.getElementById('focus-presets');
  const limitNode = document.getElementById('limit-choices');
  const quickId = quickPayload().presetId;
  const others = snapshot?.focus ? [] : presetsOf(snapshot).filter((preset) => preset.id !== quickId).slice(0, 3);
  presetNode.innerHTML = others.map((preset) => `<button type="button" class="preset-chip" data-preset="${escapeHtml(preset.id)}">${escapeHtml(`${preset.name} · ${formatMinutesShort(preset.minutes)}`)}</button>`).join('');
  presetNode.hidden = !others.length;

  const showLimits = Boolean(snapshot?.currentDomain) && !currentLimit();
  limitNode.innerHTML = showLimits
    ? LIMIT_MINUTE_CHOICES.map((minutes) => chip(formatMinutesShort(minutes), { 'data-minutes': String(minutes) }, minutes === limitMinutes)).join('')
    : '';
  limitNode.hidden = !showLimits;
  document.getElementById('quick-options').hidden = presetNode.hidden && limitNode.hidden;
}

function render() {
  document.querySelector('.popup-shell')?.removeAttribute('data-loading');
  setText('today-total', formatDuration(snapshot?.todayTotalMs || 0, true));
  setText('popup-site-count', String((snapshot?.todayTop || []).length));
  setText('popup-focus-status', snapshot?.focus ? 'Active' : 'Ready');
  document.querySelector('.summary-ring')?.style.setProperty('--summary-progress', `${summaryProgress() * 3.6}deg`);
  renderTrackPill();

  setText('current-domain', snapshot?.currentDomain || 'No active website');
  setText('current-usage', snapshot?.currentDomain ? `${formatDuration(snapshot.currentDomainMs || 0, true)} today` : '0m today');
  setText('current-avatar', initial(snapshot?.currentDomain));

  const limit = currentLimit();
  setText('current-boundary', limit
    ? (limit.reached ? 'Limit reached' : `${formatDuration(Math.max(0, limit.remainingMs || 0), true)} left on ${limit.period || 'daily'} limit`)
    : 'No limit');

  const focus = document.getElementById('focus-toggle');
  focus.textContent = focusButtonCopy();
  focus.classList.toggle('btn-primary', !snapshot?.focus);

  const limitButton = document.getElementById('limit-current-site');
  limitButton.disabled = !snapshot?.currentDomain || Boolean(limit);
  limitButton.textContent = !snapshot?.currentDomain ? 'No active site' : limit ? 'Limit active ✓' : 'Limit this site';
  renderTopSites();
  renderQuickOptions();
}

function clearError() {
  const node = document.getElementById('error-message');
  node.hidden = true;
  node.textContent = '';
}

function showError(error) {
  const node = document.getElementById('error-message');
  node.hidden = false;
  node.textContent = error?.message || String(error);
}

async function refresh() {
  try {
    snapshot = await send('GET_SNAPSHOT', { rangeDays: 7 });
    snapshotIsLive = true;
    clearError();
    render();
    writeCachedSnapshot(snapshot);
  } catch (error) { showError(error); }
}

// Tick cheaply: only the time-sensitive bits update every second, while
// full list renders happen on real data refreshes.
function renderLive() {
  document.querySelector('.summary-ring')?.style.setProperty('--summary-progress', `${summaryProgress() * 3.6}deg`);
  if (!snapshot?.focus) return;
  document.getElementById('focus-toggle').textContent = focusButtonCopy();
}

// Keep the Focus countdown and summary ring live while the popup is open.
function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(() => {
    if (!snapshot?.focus) return;
    if (snapshot.focus.endsAt - Date.now() <= 0) {
      refresh();
      return;
    }
    renderLive();
  }, 1_000);
}

// Actions only ever run against data that came from the worker.
async function requireLive() {
  await livePromise;
  if (!snapshotIsLive) throw new Error('TimeLens could not refresh just now. Try again in a moment.');
}

async function startFocus(payload) {
  const { presetId, ...session } = payload;
  await send('START_FOCUS', session);
  rememberFocusPreset(presetId);
  await refresh();
}

document.getElementById('focus-toggle').addEventListener('click', async () => {
  const button = document.getElementById('focus-toggle');
  setBusy(button);
  try {
    await requireLive();
    if (snapshot?.focus) {
      await send('STOP_FOCUS');
      await refresh();
    } else {
      await startFocus(quickPayload());
    }
  } catch (error) { showError(error); }
  finally { setBusy(button, false); }
});

// Other presets start in one tap and become the new default for the main button.
document.getElementById('focus-presets').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-preset]');
  if (!button) return;
  setBusy(button);
  try {
    await requireLive();
    const preset = presetsOf(snapshot).find((item) => item.id === button.dataset.preset);
    if (!preset) throw new Error('That Focus preset is no longer available.');
    await startFocus(quickFocusPayload([preset], preset.id));
  } catch (error) { showError(error); }
  finally { setBusy(button, false); }
});

document.getElementById('limit-choices').addEventListener('click', (event) => {
  const button = event.target.closest('[data-minutes]');
  if (!button) return;
  limitMinutes = Number(button.dataset.minutes);
  rememberLimitMinutes(limitMinutes);
  renderQuickOptions();
});

document.getElementById('limit-current-site').addEventListener('click', async () => {
  const button = document.getElementById('limit-current-site');
  setBusy(button);
  try {
    await requireLive();
    if (!snapshot?.currentDomain || currentLimit()) return;
    const domain = snapshot.currentDomain;
    const minutes = limitMinutes;
    await send('SAVE_LIMIT', { limit: { domain, minutes, period: 'daily', strict: false, enabled: true } });
    await refresh();
    notice.show(`${minutes} min/day saved for ${domain}`, {
      actionLabel: 'Undo',
      onAction: async () => {
        await send('DELETE_LIMIT', { domain });
        await refresh();
        return `Limit for ${domain} removed.`;
      }
    });
  } catch (error) { showError(error); }
  finally {
    setBusy(button, false);
    button.disabled = !snapshot?.currentDomain || Boolean(currentLimit());
  }
});

document.getElementById('open-side-panel').addEventListener('click', async () => {
  try {
    const currentWindow = await chrome.windows.getCurrent();
    await chrome.sidePanel.open({ windowId: currentWindow.id });
    globalThis.close();
  } catch (error) { showError(error); }
});

document.getElementById('open-dashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
});

// Paint the last known state at once (a cheap in-memory read) while the live
// snapshot loads, instead of showing placeholders until the worker answers.
async function boot() {
  startTicker();
  livePromise = refresh();
  const cached = await readCachedSnapshot();
  if (cached && !snapshot) {
    snapshot = cached;
    render();
  }
  await livePromise;
}

boot();
