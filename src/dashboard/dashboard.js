import { escapeHtml, formatClock, formatDuration, send, setText } from '../shared/ui.js';

let rangeDays = 7;
let snapshot = null;
let toastTimer = null;

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.hidden = false;
  toast.textContent = message;
  toast.style.background = isError ? 'var(--danger)' : 'var(--text)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
}

function dayLabel(day) {
  const date = new Date(`${day}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, { weekday: rangeDays > 7 ? 'narrow' : 'short', day: rangeDays > 7 ? 'numeric' : undefined }).format(date);
}

function renderChart() {
  const chart = document.getElementById('daily-chart');
  const max = Math.max(...snapshot.daySeries.map((item) => item.totalMs), 1);
  chart.innerHTML = snapshot.daySeries.map((item) => {
    const height = Math.max(item.totalMs ? 4 : 1, Math.round((item.totalMs / max) * 100));
    return `<div class="day-bar" title="${escapeHtml(item.day)} · ${escapeHtml(formatDuration(item.totalMs, true))}">
      <div class="day-bar-track"><div class="day-bar-fill" style="height:${height}%"></div></div>
      <div class="day-label">${escapeHtml(dayLabel(item.day))}</div>
    </div>`;
  }).join('');
}

function renderTopSites() {
  const node = document.getElementById('top-sites');
  const sites = snapshot.rangeTop.slice(0, 8);
  if (!sites.length) {
    node.innerHTML = '<div class="empty">No website usage recorded in this range.</div>';
    return;
  }
  const max = Math.max(...sites.map((item) => item.durationMs), 1);
  node.innerHTML = sites.map((item) => `
    <div class="usage-item">
      <div class="usage-row"><span class="usage-domain">${escapeHtml(item.domain)}</span><span class="usage-duration">${escapeHtml(formatDuration(item.durationMs, true))}</span></div>
      <div class="progress" aria-hidden="true"><span style="width:${Math.max(2, (item.durationMs / max) * 100)}%"></span></div>
    </div>`).join('');
}

function renderLimits() {
  const node = document.getElementById('limit-list');
  if (!snapshot.limits.length) {
    node.innerHTML = '<div class="empty">No limits yet. Add a site above when you want one.</div>';
    return;
  }
  node.innerHTML = snapshot.limits.map((limit) => {
    const percent = Math.min(100, Math.round(limit.ratio * 100));
    return `<div class="limit-item">
      <div><div class="limit-domain">${escapeHtml(limit.domain)}</div><div class="limit-meta">${limit.minutes} min/day · ${limit.strict ? 'Strict' : 'Extra time allowed'}</div></div>
      <div class="limit-progress"><small>${percent}% used</small><div class="progress"><span style="width:${percent}%"></span></div></div>
      <button class="icon-button delete-limit" type="button" data-domain="${escapeHtml(limit.domain)}" aria-label="Delete limit for ${escapeHtml(limit.domain)}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>`;
  }).join('');

  node.querySelectorAll('.delete-limit').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await send('DELETE_LIMIT', { domain: button.dataset.domain });
        showToast('Limit removed.');
        await refresh();
      } catch (error) { showToast(error.message, true); }
    });
  });
}

function renderFocus() {
  const active = Boolean(snapshot.focus);
  document.getElementById('focus-active').hidden = !active;
  document.getElementById('focus-form').hidden = active;
  if (!active) return;
  setText('focus-remaining', formatDuration(Math.max(0, snapshot.focus.endsAt - Date.now()), true));
  setText('focus-blocked-count', `${snapshot.focus.blockedDomains.length} websites blocked`);
}

function renderHistory() {
  const node = document.getElementById('history-list');
  if (!snapshot.sessions.length) {
    node.innerHTML = '<div class="empty" style="padding:18px">No recent sessions yet.</div>';
    return;
  }
  node.innerHTML = snapshot.sessions.slice(0, 30).map((session) => `
    <div class="history-row">
      <span class="history-domain">${escapeHtml(session.domain)}</span>
      <span class="history-time">${escapeHtml(formatClock(session.start))}</span>
      <strong>${escapeHtml(formatDuration(session.durationMs, true))}</strong>
    </div>`).join('');
}

function render() {
  document.querySelectorAll('#range-control button').forEach((button) => button.classList.toggle('active', Number(button.dataset.days) === rangeDays));
  setText('range-label', rangeDays === 1 ? 'Today' : `Last ${rangeDays} days`);
  setText('range-total', formatDuration(snapshot.rangeTotalMs, true));
  setText('current-domain', snapshot.currentDomain || 'No active website');
  document.getElementById('idle-seconds').value = String(snapshot.settings.idleSeconds);
  document.getElementById('retention-days').value = String(snapshot.settings.retentionDays);
  renderChart();
  renderTopSites();
  renderLimits();
  renderFocus();
  renderHistory();
}

async function refresh() {
  snapshot = await send('GET_SNAPSHOT', { rangeDays });
  render();
}

document.getElementById('range-control').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-days]');
  if (!button) return;
  rangeDays = Number(button.dataset.days);
  try { await refresh(); } catch (error) { showToast(error.message, true); }
});

document.getElementById('limit-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  try {
    await send('SAVE_LIMIT', {
      limit: {
        domain: document.getElementById('limit-domain').value.trim(),
        minutes: Number(document.getElementById('limit-minutes').value),
        strict: document.getElementById('limit-strict').checked,
        enabled: true
      }
    });
    document.getElementById('limit-domain').value = '';
    showToast('Daily limit saved.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
  finally { submit.disabled = false; }
});

document.getElementById('focus-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  try {
    const blockedDomains = document.getElementById('focus-domains').value.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean);
    await send('START_FOCUS', { minutes: Number(document.getElementById('focus-minutes').value), blockedDomains });
    showToast('Focus session started.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
  finally { submit.disabled = false; }
});

document.getElementById('stop-focus').addEventListener('click', async () => {
  try {
    await send('STOP_FOCUS');
    showToast('Focus session ended.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
});

document.getElementById('save-settings').addEventListener('click', async () => {
  try {
    await send('SAVE_SETTINGS', {
      settings: {
        idleSeconds: Number(document.getElementById('idle-seconds').value),
        retentionDays: Number(document.getElementById('retention-days').value)
      }
    });
    showToast('Preferences saved.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
});

document.getElementById('export-data').addEventListener('click', async () => {
  try {
    const data = await send('EXPORT_DATA');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timelens-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Export downloaded.');
  } catch (error) { showToast(error.message, true); }
});

document.getElementById('clear-data').addEventListener('click', async () => {
  if (!confirm('Clear all TimeLens usage history? Your limits and preferences will stay.')) return;
  try {
    await send('CLEAR_DATA');
    showToast('Usage history cleared.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
});

refresh().catch((error) => showToast(error.message, true));
setInterval(() => {
  if (snapshot?.focus) renderFocus();
}, 30_000);
