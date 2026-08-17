import { escapeHtml, formatClock, formatDuration, send, setText } from '../shared/ui.js';

let rangeDays = 7;
let snapshot = null;
let toastTimer = null;
let editingDomain = null;

const PERIOD_WORD = Object.freeze({ daily: 'day', weekly: 'week', monthly: 'month' });
const PERIOD_TITLE = Object.freeze({ daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' });
const DEFAULT_SCHEDULE = Object.freeze({ enabled: false, days: [1, 2, 3, 4, 5], startMinute: 540, endMinute: 1020 });

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

function splitDomains(value = '') {
  return String(value).split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function timeToMinute(value, fallback) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return fallback;
  return hour * 60 + minute;
}

function minuteToTime(value, fallback = '09:00') {
  const minute = Number(value);
  if (!Number.isFinite(minute) || minute < 0 || minute > 1439) return fallback;
  const hour = Math.floor(minute / 60);
  return `${String(hour).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

function selectedDays(containerId) {
  return [...document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)].map((input) => Number(input.value));
}

function setSelectedDays(containerId, days) {
  const selected = new Set(Array.isArray(days) ? days.map(Number) : DEFAULT_SCHEDULE.days);
  document.querySelectorAll(`#${containerId} input[type="checkbox"]`).forEach((input) => {
    input.checked = selected.has(Number(input.value));
  });
}

function readSchedule(prefix) {
  return {
    enabled: document.getElementById(`${prefix}-schedule-enabled`).checked,
    days: selectedDays(`${prefix}-schedule-days`),
    startMinute: timeToMinute(document.getElementById(`${prefix}-schedule-start`).value, DEFAULT_SCHEDULE.startMinute),
    endMinute: timeToMinute(document.getElementById(`${prefix}-schedule-end`).value, DEFAULT_SCHEDULE.endMinute)
  };
}

function setSchedule(prefix, value = DEFAULT_SCHEDULE) {
  const schedule = value || DEFAULT_SCHEDULE;
  document.getElementById(`${prefix}-schedule-enabled`).checked = Boolean(schedule.enabled);
  setSelectedDays(`${prefix}-schedule-days`, schedule.days);
  document.getElementById(`${prefix}-schedule-start`).value = minuteToTime(schedule.startMinute, '09:00');
  document.getElementById(`${prefix}-schedule-end`).value = minuteToTime(schedule.endMinute, '17:00');
}

function scheduleCopy(schedule) {
  if (!schedule?.enabled) return 'All day';
  const days = Array.isArray(schedule.days) ? schedule.days : [];
  let dayCopy = `${days.length} days/week`;
  if (days.length === 7) dayCopy = 'Every day';
  else if (days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))) dayCopy = 'Weekdays';
  else if (days.length === 2 && days.includes(0) && days.includes(6)) dayCopy = 'Weekends';
  return `${dayCopy} · ${minuteToTime(schedule.startMinute, '00:00')}–${minuteToTime(schedule.endMinute, '23:59')}`;
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
  if (limit.schedule?.enabled && limit.scheduleActive === false) return { label: 'Scheduled off', tone: 'paused' };
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
        <div class="limit-meta">${escapeHtml(amount)} / ${escapeHtml(periodWord(limit.period))} · ${limit.strict ? 'Strict' : 'Extra time allowed'} · ${escapeHtml(scheduleCopy(limit.schedule))}</div>
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
  setSchedule('limit', limit.schedule || DEFAULT_SCHEDULE);
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
  setSchedule('limit', DEFAULT_SCHEDULE);
  document.getElementById('limit-cancel-edit').hidden = true;
  document.getElementById('limit-editing-note').hidden = true;
  setText('limit-submit', 'Save limit');
}

function renderTotalBudget() {
  const budget = snapshot.totalBudget || snapshot.settings.totalBudget;
  document.getElementById('total-budget-enabled').checked = Boolean(budget.enabled);
  document.getElementById('total-budget-minutes').value = String(budget.minutes || 300);
  document.getElementById('total-budget-mode').value = budget.mode === 'block' ? 'block' : 'warn';
  if (!budget.enabled) {
    setText('total-budget-progress', 'Not enabled');
    return;
  }
  setText('total-budget-progress', `${formatDuration(budget.usedMs || 0, true)} / ${formatDuration((budget.minutes || 0) * 60_000, true)}`);
}

function categoryStatusLabel(category) {
  if (!category.enabled) return { label: 'Paused', tone: 'paused' };
  if (category.schedule?.enabled && category.scheduleActive === false) return { label: 'Scheduled off', tone: 'paused' };
  if (category.reached) return { label: 'Time up', tone: 'reached' };
  return { label: 'Active', tone: 'active' };
}

function renderCategories() {
  const node = document.getElementById('category-list');
  const categories = snapshot.categories || [];
  if (!categories.length) {
    node.innerHTML = '<div class="empty">No category limits yet.</div>';
    return;
  }
  node.innerHTML = categories.map((category) => {
    const percent = Math.min(100, Math.max(0, Math.round(category.ratio * 100)));
    const status = categoryStatusLabel(category);
    return `<div class="limit-item ${category.enabled ? '' : 'is-paused'}">
      <div class="limit-main">
        <div class="limit-title-row"><div class="limit-domain">${escapeHtml(category.name)}</div><span class="status-chip ${status.tone}">${escapeHtml(status.label)}</span></div>
        <div class="limit-meta">${escapeHtml(category.domains.join(', '))}<br>${escapeHtml(formatDuration(category.minutes * 60_000, true))} / ${escapeHtml(periodWord(category.period))} · ${escapeHtml(scheduleCopy(category.schedule))}</div>
      </div>
      <div class="limit-progress"><small>${escapeHtml(formatDuration(category.usedMs, true))} used · ${escapeHtml(formatDuration(category.remainingMs, true))} left</small><div class="progress" aria-label="${percent}% of category limit used"><span style="width:${percent}%"></span></div></div>
      <div class="limit-actions"><button class="btn btn-small delete-category" type="button" data-id="${escapeHtml(category.id)}">Delete</button></div>
    </div>`;
  }).join('');

  node.querySelectorAll('.delete-category').forEach((button) => {
    button.addEventListener('click', async () => {
      const category = categories.find((item) => item.id === button.dataset.id);
      if (!category || !confirm(`Delete the ${category.name} category limit?`)) return;
      try {
        await send('DELETE_CATEGORY', { id: category.id });
        showToast('Category removed.');
        await refresh();
      } catch (error) { showToast(error.message, true); }
    });
  });
}

function renderFocusPresets() {
  const select = document.getElementById('focus-presets');
  const current = select.value;
  select.replaceChildren(new Option('Custom', ''));
  for (const preset of snapshot.settings.focusPresets || []) {
    select.add(new Option(`${preset.name} · ${formatDuration(preset.minutes * 60_000, true)}`, preset.id));
  }
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function renderPresetList() {
  const node = document.getElementById('preset-list');
  const presets = snapshot.settings.focusPresets || [];
  if (!presets.length) {
    node.innerHTML = '<div class="empty">No saved Focus presets.</div>';
    return;
  }
  node.innerHTML = presets.map((preset) => `
    <div class="preset-item">
      <div class="preset-copy"><strong>${escapeHtml(preset.name)}</strong><small>${escapeHtml(formatDuration(preset.minutes * 60_000, true))} · ${preset.mode === 'allow' ? 'Allow only' : 'Block list'} · ${escapeHtml(preset.domains.join(', ') || 'No websites')}</small></div>
      <div class="limit-actions"><button class="btn btn-small use-preset" type="button" data-id="${escapeHtml(preset.id)}">Use</button><button class="btn btn-small delete-preset" type="button" data-id="${escapeHtml(preset.id)}">Delete</button></div>
    </div>`).join('');

  node.querySelectorAll('.use-preset').forEach((button) => button.addEventListener('click', () => loadPreset(button.dataset.id)));
  node.querySelectorAll('.delete-preset').forEach((button) => {
    button.addEventListener('click', async () => {
      const preset = presets.find((item) => item.id === button.dataset.id);
      if (!preset || !confirm(`Delete the ${preset.name} Focus preset?`)) return;
      try {
        await send('DELETE_FOCUS_PRESET', { id: preset.id });
        showToast('Focus preset removed.');
        await refresh();
      } catch (error) { showToast(error.message, true); }
    });
  });
}

function updateFocusModeLabel() {
  const allow = document.getElementById('focus-mode').value === 'allow';
  setText('focus-domains-label', allow ? 'Allowed websites · every other website is blocked' : 'Blocked websites · one per line or comma separated');
}

function loadPreset(id) {
  const preset = snapshot.settings.focusPresets?.find((item) => item.id === id);
  if (!preset) return;
  document.getElementById('focus-presets').value = preset.id;
  document.getElementById('focus-minutes').value = String(preset.minutes);
  document.getElementById('focus-mode').value = preset.mode;
  document.getElementById('focus-domains').value = preset.domains.join('\n');
  updateFocusModeLabel();
  document.getElementById('focus-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderFocus() {
  renderFocusPresets();
  renderPresetList();
  const active = Boolean(snapshot.focus);
  document.getElementById('focus-active').hidden = !active;
  document.getElementById('focus-form').hidden = active;
  if (!active) {
    updateFocusModeLabel();
    return;
  }
  const domains = snapshot.focus.domains || snapshot.focus.blockedDomains || [];
  setText('focus-remaining', formatDuration(Math.max(0, snapshot.focus.endsAt - Date.now()), true));
  setText('focus-blocked-count', snapshot.focus.mode === 'allow'
    ? `${domains.length} websites allowed · everything else blocked`
    : `${domains.length} websites blocked`);
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
  setText('health-detail', health.lastDiagnostic ? `${health.lastDiagnostic.code}: ${health.lastDiagnostic.message}` : 'No runtime problems recorded.');
  document.getElementById('clear-diagnostics').disabled = !health.diagnosticCount;
}

function render() {
  document.querySelectorAll('#range-control button').forEach((button) => button.classList.toggle('active', Number(button.dataset.days) === rangeDays));
  setText('range-label', rangeDays === 1 ? 'Today' : `Last ${rangeDays} days`);
  setText('range-total', formatDuration(snapshot.rangeTotalMs, true));
  setText('current-domain', snapshot.currentDomain || 'No active website');
  renderChart();
  renderTopSites();
  renderTotalBudget();
  renderCategories();
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

document.getElementById('total-budget-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  try {
    await send('SAVE_TOTAL_BUDGET', {
      budget: {
        enabled: document.getElementById('total-budget-enabled').checked,
        minutes: Number(document.getElementById('total-budget-minutes').value),
        mode: document.getElementById('total-budget-mode').value
      }
    });
    showToast('Daily browsing budget saved.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
  finally { submit.disabled = false; }
});

document.getElementById('category-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  try {
    await send('SAVE_CATEGORY', {
      category: {
        name: document.getElementById('category-name').value.trim(),
        domains: splitDomains(document.getElementById('category-domains').value),
        minutes: Number(document.getElementById('category-value').value),
        period: document.getElementById('category-period').value,
        enabled: true,
        strict: document.getElementById('category-strict').checked,
        schedule: readSchedule('category')
      }
    });
    event.currentTarget.reset();
    document.getElementById('category-value').value = '60';
    setSchedule('category', DEFAULT_SCHEDULE);
    showToast('Category limit saved.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
  finally { submit.disabled = false; }
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
        enabled: editingDomain ? snapshot.limits.find((item) => item.domain === editingDomain)?.enabled !== false : true,
        schedule: readSchedule('limit')
      }
    });
    stopEditing();
    showToast(wasEditing ? 'Limit updated.' : `${periodTitle(period)} limit saved.`);
    await refresh();
  } catch (error) { showToast(error.message, true); }
  finally { submit.disabled = false; }
});

document.getElementById('focus-presets').addEventListener('change', (event) => {
  if (event.target.value) loadPreset(event.target.value);
});
document.getElementById('focus-mode').addEventListener('change', updateFocusModeLabel);

document.getElementById('focus-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  try {
    const preset = snapshot.settings.focusPresets?.find((item) => item.id === document.getElementById('focus-presets').value);
    await send('START_FOCUS', {
      minutes: Number(document.getElementById('focus-minutes').value),
      domains: splitDomains(document.getElementById('focus-domains').value),
      mode: document.getElementById('focus-mode').value,
      name: preset?.name || 'Focus'
    });
    showToast('Focus session started.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
  finally { submit.disabled = false; }
});

document.getElementById('preset-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  try {
    await send('SAVE_FOCUS_PRESET', {
      preset: {
        name: document.getElementById('preset-name').value.trim(),
        minutes: Number(document.getElementById('preset-duration').value),
        mode: document.getElementById('preset-mode').value,
        domains: splitDomains(document.getElementById('preset-domains').value)
      }
    });
    event.currentTarget.reset();
    document.getElementById('preset-duration').value = '45';
    showToast('Focus preset saved.');
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

setSchedule('limit', DEFAULT_SCHEDULE);
setSchedule('category', DEFAULT_SCHEDULE);
updateFocusModeLabel();
refresh().catch((error) => showToast(error.message, true));
setInterval(() => { if (snapshot?.focus) renderFocus(); }, 30_000);
