import { escapeHtml, formatClock, formatDuration, send, setText } from '../shared/ui.js';

let rangeDays = 7;
let snapshot = null;
let toastTimer = null;
let editingDomain = null;

const PERIOD_WORD = Object.freeze({ daily: 'day', weekly: 'week', monthly: 'month' });
const PERIOD_TITLE = Object.freeze({ daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' });

function periodWord(period) { return PERIOD_WORD[period] || 'day'; }
function periodTitle(period) { return PERIOD_TITLE[period] || 'Daily'; }

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.hidden = false;
  toast.textContent = message;
  toast.style.background = isError ? 'var(--danger)' : 'var(--text)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function dayLabel(day) {
  const date = new Date(`${day}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, { weekday: rangeDays > 7 ? 'narrow' : 'short', day: rangeDays > 7 ? 'numeric' : undefined }).format(date);
}

function formatBytes(bytes = 0) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 ** 2)).toFixed(1)} MB`;
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

function limitStatus(limit) {
  if (!limit.enabled) return { label: 'Paused', tone: 'paused' };
  if (limit.reached) return { label: 'Time up', tone: 'reached' };
  if (limit.remainingMs <= 60_000) return { label: '1 min left', tone: 'critical' };
  if (limit.remainingMs <= 5 * 60_000) return { label: '5 min left', tone: 'warning' };
  return { label: 'Active', tone: 'active' };
}

function renderLimits() {
  const node = document.getElementById('limit-list');
  if (!snapshot.limits.length) {
    node.innerHTML = '<div class="empty">No limits yet. Add a site above when you want one.</div>';
    return;
  }

  node.innerHTML = snapshot.limits.map((limit) => {
    const percent = Math.min(100, Math.max(0, Math.round(limit.ratio * 100)));
    const amount = formatDuration(limit.minutes * 60_000, true);
    const used = formatDuration(limit.usedMs, true);
    const remaining = limit.enabled ? (limit.reached ? 'No time left' : `${formatDuration(limit.remainingMs, true)} left`) : 'Not enforcing';
    const status = limitStatus(limit);
    return `<div class="limit-item ${limit.enabled ? '' : 'is-paused'}">
      <div class="limit-main">
        <div class="limit-title-row"><div class="limit-domain">${escapeHtml(limit.domain)}</div><span class="status-chip ${status.tone}">${escapeHtml(status.label)}</span></div>
        <div class="limit-meta">${escapeHtml(amount)} / ${escapeHtml(periodWord(limit.period))} · ${limit.strict ? 'Strict' : 'Extra time allowed'}</div>
      </div>
      <div class="limit-progress"><small>${escapeHtml(used)} used · ${escapeHtml(remaining)}</small><div class="progress" aria-label="${percent}% of limit used"><span style="width:${percent}%"></span></div></div>
      <div class="limit-actions">
        <button class="btn btn-small edit-limit" type="button" data-domain="${escapeHtml(limit.domain)}">Edit</button>
        <button class="btn btn-small toggle-limit" type="button" data-domain="${escapeHtml(limit.domain)}" data-enabled="${limit.enabled ? 'false' : 'true'}">${limit.enabled ? 'Pause' : 'Resume'}</button>
        <button class="icon-button delete-limit" type="button" data-domain="${escapeHtml(limit.domain)}" aria-label="Delete limit for ${escapeHtml(limit.domain)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');

  node.querySelectorAll('.edit-limit').forEach((button) => button.addEventListener('click', () => startEditing(button.dataset.domain)));
  node.querySelectorAll('.toggle-limit').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await send('TOGGLE_LIMIT', { domain: button.dataset.domain, enabled: button.dataset.enabled === 'true' });
        showToast(button.dataset.enabled === 'true' ? 'Limit resumed.' : 'Limit paused.');
        await refresh();
      } catch (error) { showToast(error.message, true); }
    });
  });
  node.querySelectorAll('.delete-limit').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!confirm(`Delete the limit for ${button.dataset.domain}?`)) return;
      try {
        await send('DELETE_LIMIT', { domain: button.dataset.domain });
        if (editingDomain === button.dataset.domain) stopEditing();
        showToast('Limit removed.');
        await refresh();
      } catch (error) { showToast(error.message, true); }
    });
  });
}

function startEditing(domain) {
  const limit = snapshot.limits.find((item) => item.domain === domain);
  if (!limit) return;
  editingDomain = domain;
  const useHours = limit.minutes >= 60 && limit.minutes % 60 === 0;
  document.getElementById('limit-domain').value = limit.domain;
  document.getElementById('limit-domain').readOnly = true;
  document.getElementById('limit-value').value = String(useHours ? limit.minutes / 60 : limit.minutes);
  document.getElementById('limit-unit').value = useHours ? 'hours' : 'minutes';
  document.getElementById('limit-period').value = limit.period;
  document.getElementById('limit-strict').checked = Boolean(limit.strict);
  document.getElementById('limit-cancel-edit').hidden = false;
  document.getElementById('limit-editing-note').hidden = false;
  setText('limit-editing-domain', limit.domain);
  setText('limit-submit', 'Save changes');
  document.getElementById('limit-domain').focus();
}

function stopEditing() {
  editingDomain = null;
  document.getElementById('limit-form').reset();
  document.getElementById('limit-domain').readOnly = false;
  document.getElementById('limit-value').value = '60';
  document.getElementById('limit-cancel-edit').hidden = true;
  document.getElementById('limit-editing-note').hidden = true;
  setText('limit-submit', 'Save limit');
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
    <div class="history-row"><span class="history-domain">${escapeHtml(session.domain)}</span><span class="history-time">${escapeHtml(formatClock(session.start))}</span><strong>${escapeHtml(formatDuration(session.durationMs, true))}</strong></div>`).join('');
}

function renderSettings() {
  document.getElementById('idle-seconds').value = String(snapshot.settings.idleSeconds);
  document.getElementById('retention-days').value = String(snapshot.settings.retentionDays);
  document.getElementById('alert-five').checked = snapshot.settings.alerts?.fiveMinutes !== false;
  document.getElementById('alert-one').checked = snapshot.settings.alerts?.oneMinute !== false;
  document.getElementById('alert-timeout').checked = snapshot.settings.alerts?.timeout !== false;

  const health = snapshot.health || {};
  const healthy = health.status === 'healthy';
  setText('health-status', healthy ? 'Healthy' : 'Needs attention');
  setText('storage-usage', formatBytes(health.storageBytesApprox));
  setText('diagnostic-count', String(health.diagnosticCount || 0));
  const detail = health.lastDiagnostic
    ? `${health.lastDiagnostic.code}: ${health.lastDiagnostic.message}`
    : 'No runtime problems recorded.';
  setText('health-detail', detail);
  document.getElementById('clear-diagnostics').disabled = !health.diagnosticCount;
}

function render() {
  document.querySelectorAll('#range-control button').forEach((button) => button.classList.toggle('active', Number(button.dataset.days) === rangeDays));
  setText('range-label', rangeDays === 1 ? 'Today' : `Last ${rangeDays} days`);
  setText('range-total', formatDuration(snapshot.rangeTotalMs, true));
  setText('current-domain', snapshot.currentDomain || 'No active website');
  renderChart();
  renderTopSites();
  renderLimits();
  renderFocus();
  renderHistory();
  renderSettings();
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

document.getElementById('limit-cancel-edit').addEventListener('click', stopEditing);

document.getElementById('limit-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  try {
    const value = Number(document.getElementById('limit-value').value);
    const unit = document.getElementById('limit-unit').value;
    const period = document.getElementById('limit-period').value;
    const minutes = unit === 'hours' ? value * 60 : value;
    const wasEditing = Boolean(editingDomain);

    await send('SAVE_LIMIT', {
      limit: {
        domain: editingDomain || document.getElementById('limit-domain').value.trim(),
        minutes,
        period,
        strict: document.getElementById('limit-strict').checked,
        enabled: editingDomain ? snapshot.limits.find((item) => item.domain === editingDomain)?.enabled !== false : true
      }
    });
    stopEditing();
    showToast(wasEditing ? 'Limit updated.' : `${periodTitle(period)} limit saved.`);
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
  try { await send('STOP_FOCUS'); showToast('Focus session ended.'); await refresh(); }
  catch (error) { showToast(error.message, true); }
});

document.getElementById('save-settings').addEventListener('click', async () => {
  try {
    await send('SAVE_SETTINGS', {
      settings: {
        idleSeconds: Number(document.getElementById('idle-seconds').value),
        retentionDays: Number(document.getElementById('retention-days').value),
        alerts: {
          fiveMinutes: document.getElementById('alert-five').checked,
          oneMinute: document.getElementById('alert-one').checked,
          timeout: document.getElementById('alert-timeout').checked
        }
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

document.getElementById('import-data').addEventListener('click', () => document.getElementById('import-file').click());

document.getElementById('import-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!confirm('Restore this TimeLens backup? Your current data will first be preserved as a local backup.')) return;
    await send('IMPORT_DATA', { data: parsed });
    stopEditing();
    showToast('Restore complete. Previous data was kept as a local backup.');
    await refresh();
  } catch (error) {
    showToast(error instanceof SyntaxError ? 'That file is not valid JSON.' : error.message, true);
  }
});

document.getElementById('clear-diagnostics').addEventListener('click', async () => {
  try { await send('CLEAR_DIAGNOSTICS'); showToast('Diagnostics cleared.'); await refresh(); }
  catch (error) { showToast(error.message, true); }
});

document.getElementById('clear-data').addEventListener('click', async () => {
  if (!confirm('Clear all TimeLens usage history? Your limits and preferences will stay.')) return;
  try { await send('CLEAR_DATA'); showToast('Usage history cleared.'); await refresh(); }
  catch (error) { showToast(error.message, true); }
});

refresh().catch((error) => showToast(error.message, true));
setInterval(() => { if (snapshot?.focus) renderFocus(); }, 30_000);
