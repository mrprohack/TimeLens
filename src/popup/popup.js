import { escapeHtml, formatDuration, send, setBusy, setText } from '../shared/ui.js';
import { trackState } from '../core/track-state.js';

let snapshot = null;
let ticker = null;
const DEFAULT_FOCUS_DOMAINS = ['youtube.com', 'reddit.com', 'instagram.com', 'facebook.com', 'x.com'];

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
  if (!snapshot?.focus) return 'Start Focus';
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

function render() {
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
    clearError();
    render();
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

document.getElementById('focus-toggle').addEventListener('click', async () => {
  const button = document.getElementById('focus-toggle');
  setBusy(button);
  try {
    if (snapshot?.focus) await send('STOP_FOCUS');
    else await send('START_FOCUS', { minutes: 25, domains: DEFAULT_FOCUS_DOMAINS, mode: 'block', name: 'Focus' });
    await refresh();
  } catch (error) { showError(error); }
  finally { setBusy(button, false); }
});

document.getElementById('limit-current-site').addEventListener('click', async () => {
  if (!snapshot?.currentDomain || currentLimit()) return;
  const button = document.getElementById('limit-current-site');
  setBusy(button);
  try {
    await send('SAVE_LIMIT', { limit: { domain: snapshot.currentDomain, minutes: 30, period: 'daily', strict: false, enabled: true } });
    await refresh();
    button.textContent = '30 min/day saved ✓';
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

refresh();
startTicker();
