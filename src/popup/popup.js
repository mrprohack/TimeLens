import { escapeHtml, formatDuration, send, setText } from '../shared/ui.js';

let snapshot = null;

const PERIOD_WORD = Object.freeze({ daily: 'day', weekly: 'week', monthly: 'month' });

function initial(domain) {
  return domain ? domain[0].toUpperCase() : '—';
}

function limitFor(domain) {
  return snapshot?.limits?.find((limit) => limit.domain === domain) || null;
}

function renderSites() {
  const container = document.getElementById('top-sites');
  const sites = snapshot.todayTop.slice(0, 3);
  if (!sites.length) {
    container.innerHTML = '<div class="empty-state">Browse normally and TimeLens will build your day here.</div>';
    return;
  }

  const max = Math.max(...sites.map((item) => item.durationMs), 1);
  container.innerHTML = sites.map((item) => {
    const limit = limitFor(item.domain);
    const width = Math.max(3, Math.min(100, (item.durationMs / max) * 100));
    const period = limit ? (limit.period || 'daily') : 'daily';
    const limitCopy = limit
      ? `${Math.round(limit.ratio * 100)}% of ${formatDuration(limit.minutes * 60_000, true)} / ${PERIOD_WORD[period] || 'day'}`
      : 'No limit';
    return `
      <div class="site-item">
        <div class="site-avatar" aria-hidden="true">${escapeHtml(initial(item.domain))}</div>
        <div class="site-main">
          <div class="site-name">${escapeHtml(item.domain)}</div>
          <div class="progress" aria-hidden="true"><span style="width:${width}%"></span></div>
          <div class="site-limit">${escapeHtml(limitCopy)}</div>
        </div>
        <div class="site-time">${escapeHtml(formatDuration(item.durationMs, true))}</div>
      </div>`;
  }).join('');
}

function render() {
  setText('today-total', formatDuration(snapshot.todayTotalMs, true));
  setText('current-domain', snapshot.currentDomain || 'No active website');
  setText('current-usage', `${formatDuration(snapshot.currentDomainMs, true)} today`);
  setText('current-avatar', initial(snapshot.currentDomain));

  const focusActive = Boolean(snapshot.focus);
  const toggle = document.getElementById('focus-toggle');
  toggle.textContent = focusActive ? 'End focus' : 'Start focus';
  toggle.classList.toggle('btn-primary', !focusActive);
  setText('focus-title', focusActive ? 'Focus is active' : 'Focus mode');
  if (focusActive) {
    const remaining = Math.max(0, snapshot.focus.endsAt - Date.now());
    setText('focus-subtitle', `${formatDuration(remaining, true)} remaining · ${snapshot.focus.blockedDomains.length} sites blocked`);
  } else {
    setText('focus-subtitle', 'Block common distractions for 25 minutes.');
  }

  renderSites();
}

async function refresh() {
  try {
    snapshot = await send('GET_SNAPSHOT', { rangeDays: 7 });
    render();
  } catch (error) {
    const node = document.getElementById('error-message');
    node.hidden = false;
    node.textContent = error.message;
  }
}

document.getElementById('focus-toggle').addEventListener('click', async () => {
  const button = document.getElementById('focus-toggle');
  button.disabled = true;
  try {
    if (snapshot?.focus) {
      await send('STOP_FOCUS');
    } else {
      await send('START_FOCUS', {
        minutes: 25,
        blockedDomains: ['youtube.com', 'reddit.com', 'instagram.com', 'facebook.com', 'x.com']
      });
    }
    await refresh();
  } finally {
    button.disabled = false;
  }
});

document.getElementById('open-dashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
});

refresh();
