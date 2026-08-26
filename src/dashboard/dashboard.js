import { escapeHtml, formatDuration, send, setText } from '../shared/ui.js';
import { closeDialog, openDialog, setDisclosure, wireDialog, wireEscapeToClose } from './dialogs.js';
import { DEFAULT_SCHEDULE, buildLimitPayload, readSchedule, setSchedule, splitDomains } from './forms.js';
import { renderHome, renderHistoryDrawer } from './home-view.js';
import { renderLimitsView } from './limits-view.js';
import { renderFocusView, wireFocusView } from './focus-view.js';
import { renderSettingsView, wireSettingsView } from './settings-view.js';

let snapshot = null;
let toastTimer = null;
let editingDomain = null;
let editingCategoryId = null;

const dialogs = [
  'history-drawer',
  'limit-dialog',
  'budget-dialog',
  'category-dialog',
  'focus-settings-dialog'
].map((id) => document.getElementById(id));

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.hidden = false;
  toast.textContent = message;
  toast.style.background = isError ? 'var(--danger)' : 'var(--text)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

export function setDashboardView(viewName) {
  const allowed = new Set(['home', 'limits', 'focus', 'settings']);
  const next = allowed.has(viewName) ? viewName : 'home';
  document.querySelectorAll('[data-view]').forEach((view) => {
    view.hidden = view.dataset.view !== next;
  });
  document.querySelectorAll('[data-dashboard-view]').forEach((control) => {
    const active = control.dataset.dashboardView === next;
    control.classList.toggle('is-active', active);
    if (active) control.setAttribute('aria-current', 'page');
    else control.removeAttribute('aria-current');
  });
  window.scrollTo?.({ top: 0, behavior: 'instant' });
}

function clearFieldErrors() {
  for (const id of ['limit-domain-error', 'limit-value-error']) {
    const node = document.getElementById(id);
    node.hidden = true;
    node.textContent = '';
  }
}

function validateLimitFields(domain, value) {
  clearFieldErrors();
  let valid = true;
  if (!domain.trim()) {
    const error = document.getElementById('limit-domain-error');
    error.textContent = 'Enter a website, for example youtube.com.';
    error.hidden = false;
    valid = false;
  }
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
    const error = document.getElementById('limit-value-error');
    error.textContent = 'Enter a time greater than zero.';
    error.hidden = false;
    valid = false;
  }
  return valid;
}

function resetLimitDialog() {
  editingDomain = null;
  const form = document.getElementById('limit-form');
  form.reset();
  document.getElementById('limit-domain').readOnly = false;
  document.getElementById('limit-value').value = '60';
  document.getElementById('limit-unit').value = 'minutes';
  document.getElementById('limit-period').value = 'daily';
  document.getElementById('limit-strict').checked = false;
  document.getElementById('limit-editing-note').hidden = true;
  document.getElementById('limit-cancel-edit').hidden = true;
  setText('limit-dialog-title', 'Add a limit');
  setText('limit-submit', 'Save limit');
  setSchedule('limit', DEFAULT_SCHEDULE);
  setDisclosure(document.getElementById('limit-advanced-toggle'), document.getElementById('limit-advanced-options'), false);
  clearFieldErrors();
}

function openLimitDialog({ domain = '', limit = null, trigger = document.activeElement } = {}) {
  resetLimitDialog();
  if (limit) {
    editingDomain = limit.domain;
    const useHours = limit.minutes >= 60 && limit.minutes % 60 === 0;
    document.getElementById('limit-domain').value = limit.domain;
    document.getElementById('limit-domain').readOnly = true;
    document.getElementById('limit-value').value = String(useHours ? limit.minutes / 60 : limit.minutes);
    document.getElementById('limit-unit').value = useHours ? 'hours' : 'minutes';
    document.getElementById('limit-period').value = limit.period || 'daily';
    document.getElementById('limit-strict').checked = Boolean(limit.strict);
    setSchedule('limit', limit.schedule || DEFAULT_SCHEDULE);
    document.getElementById('limit-editing-note').hidden = false;
    document.getElementById('limit-cancel-edit').hidden = false;
    setText('limit-editing-domain', limit.domain);
    setText('limit-dialog-title', 'Edit limit');
    setText('limit-submit', 'Save changes');
    const advanced = limit.period !== 'daily' || Boolean(limit.strict) || Boolean(limit.schedule?.enabled);
    setDisclosure(document.getElementById('limit-advanced-toggle'), document.getElementById('limit-advanced-options'), advanced);
  } else if (domain) {
    document.getElementById('limit-domain').value = domain;
  }
  openDialog(document.getElementById('limit-dialog'), trigger);
}

function fillBudgetDialog() {
  const budget = snapshot?.totalBudget || snapshot?.settings?.totalBudget || { enabled: false, minutes: 300, mode: 'warn' };
  document.getElementById('total-budget-enabled').checked = Boolean(budget.enabled);
  document.getElementById('total-budget-minutes').value = String(budget.minutes || 300);
  document.getElementById('total-budget-mode').value = budget.mode === 'block' ? 'block' : 'warn';
}

function resetCategoryDialog() {
  editingCategoryId = null;
  const form = document.getElementById('category-form');
  form.reset();
  document.getElementById('category-value').value = '60';
  document.getElementById('category-period').value = 'daily';
  document.getElementById('category-strict').checked = false;
  setSchedule('category', DEFAULT_SCHEDULE);
  setText('category-dialog-title', 'Add category limit');
}

function openCategoryDialog(category = null, trigger = document.activeElement) {
  resetCategoryDialog();
  if (category) {
    editingCategoryId = category.id;
    document.getElementById('category-name').value = category.name;
    document.getElementById('category-domains').value = category.domains.join('\n');
    document.getElementById('category-value').value = String(category.minutes);
    document.getElementById('category-period').value = category.period || 'daily';
    document.getElementById('category-strict').checked = Boolean(category.strict);
    setSchedule('category', category.schedule || DEFAULT_SCHEDULE);
    setText('category-dialog-title', 'Edit category limit');
  }
  openDialog(document.getElementById('category-dialog'), trigger);
}

function renderFocusSettings() {
  if (!snapshot) return;
  const select = document.getElementById('focus-presets');
  const current = select.value;
  select.replaceChildren(new Option('Custom', ''));
  for (const preset of snapshot.settings.focusPresets || []) {
    select.add(new Option(`${preset.name} · ${formatDuration(preset.minutes * 60_000, true)}`, preset.id));
  }
  if ([...select.options].some((option) => option.value === current)) select.value = current;

  const list = document.getElementById('preset-list');
  const presets = snapshot.settings.focusPresets || [];
  list.innerHTML = presets.length ? presets.map((preset) => `<div class="preset-item"><div><strong>${escapeHtml(preset.name)}</strong><div class="muted small">${escapeHtml(formatDuration(preset.minutes * 60_000, true))} · ${preset.mode === 'allow' ? 'Allow only' : 'Block list'}</div></div><div class="limit-actions"><button class="btn btn-small use-preset" type="button" data-id="${escapeHtml(preset.id)}">Use</button><button class="btn btn-small delete-preset" type="button" data-id="${escapeHtml(preset.id)}">Delete</button></div></div>`).join('') : '<p class="muted">No saved presets yet.</p>';

  list.querySelectorAll('.use-preset').forEach((button) => button.addEventListener('click', () => loadPreset(button.dataset.id)));
  list.querySelectorAll('.delete-preset').forEach((button) => button.addEventListener('click', async () => {
    const preset = presets.find((item) => item.id === button.dataset.id);
    if (!preset || !confirm(`Delete the ${preset.name} Focus preset?`)) return;
    try {
      await send('DELETE_FOCUS_PRESET', { id: preset.id });
      showToast('Focus preset removed.');
      await refresh();
    } catch (error) { showToast(error.message, true); }
  }));
}

function updateFocusModeLabel() {
  const allow = document.getElementById('focus-mode').value === 'allow';
  setText('focus-domains-label', allow ? 'Allowed websites · everything else is blocked' : 'Blocked websites');
}

function loadPreset(id) {
  const preset = snapshot?.settings?.focusPresets?.find((item) => item.id === id);
  if (!preset) return;
  document.getElementById('focus-presets').value = preset.id;
  document.getElementById('focus-minutes').value = String(preset.minutes);
  document.getElementById('focus-mode').value = preset.mode;
  document.getElementById('focus-domains').value = preset.domains.join('\n');
  updateFocusModeLabel();
}

function renderAll() {
  if (!snapshot) return;
  renderHome(snapshot, {
    openLimit: (domain, trigger) => {
      const limit = snapshot.limits?.find((item) => item.domain === domain) || null;
      openLimitDialog({ domain, limit, trigger });
    }
  });
  renderHistoryDrawer(snapshot);
  renderLimitsView(snapshot, {
    openLimit: (limit, trigger) => openLimitDialog({ limit, trigger }),
    openCategory: (category, trigger) => openCategoryDialog(category, trigger),
    showToast,
    refresh
  });
  renderFocusView(snapshot, { render: renderAll });
  renderSettingsView(snapshot);
  renderFocusSettings();
}

async function refresh() {
  snapshot = await send('GET_SNAPSHOT', { rangeDays: 7 });
  renderAll();
}

function openSidePanel() {
  return chrome.windows.getCurrent().then((currentWindow) => chrome.sidePanel.open({ windowId: currentWindow.id }));
}

// Primary navigation.
document.querySelectorAll('[data-dashboard-view]').forEach((button) => {
  button.addEventListener('click', () => setDashboardView(button.dataset.dashboardView));
});

// Dialogs and secondary surfaces.
dialogs.forEach(wireDialog);
wireEscapeToClose(dialogs);
document.getElementById('open-history').addEventListener('click', (event) => openDialog(document.getElementById('history-drawer'), event.currentTarget));
document.getElementById('home-add-limit').addEventListener('click', (event) => openLimitDialog({ trigger: event.currentTarget }));
document.getElementById('limits-add-limit').addEventListener('click', (event) => openLimitDialog({ trigger: event.currentTarget }));
document.getElementById('home-start-focus').addEventListener('click', () => setDashboardView('focus'));
document.getElementById('home-open-side-panel').addEventListener('click', () => openSidePanel().catch((error) => showToast(error.message, true)));
document.getElementById('open-budget-dialog').addEventListener('click', (event) => { fillBudgetDialog(); openDialog(document.getElementById('budget-dialog'), event.currentTarget); });
document.getElementById('open-category-dialog').addEventListener('click', (event) => openCategoryDialog(null, event.currentTarget));

document.getElementById('limit-advanced-toggle').addEventListener('click', (event) => {
  const panel = document.getElementById('limit-advanced-options');
  setDisclosure(event.currentTarget, panel, event.currentTarget.getAttribute('aria-expanded') !== 'true');
});
document.getElementById('category-disclosure').addEventListener('click', (event) => {
  const panel = document.getElementById('category-section');
  setDisclosure(event.currentTarget, panel, event.currentTarget.getAttribute('aria-expanded') !== 'true');
});
document.getElementById('health-toggle').addEventListener('click', (event) => {
  const panel = document.getElementById('health-details');
  setDisclosure(event.currentTarget, panel, event.currentTarget.getAttribute('aria-expanded') !== 'true');
});

// Simple site-limit dialog.
document.getElementById('limit-cancel-edit').addEventListener('click', () => closeDialog(document.getElementById('limit-dialog')));
document.getElementById('limit-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const domain = editingDomain || document.getElementById('limit-domain').value;
  const value = document.getElementById('limit-value').value;
  if (!validateLimitFields(domain, value)) return;
  const submit = event.submitter;
  submit.disabled = true;
  try {
    const existing = editingDomain ? snapshot.limits.find((item) => item.domain === editingDomain) : null;
    const limit = buildLimitPayload({
      domain,
      value,
      unit: document.getElementById('limit-unit').value,
      period: document.getElementById('limit-period').value,
      strict: document.getElementById('limit-strict').checked,
      enabled: existing?.enabled !== false,
      schedule: readSchedule('limit')
    });
    await send('SAVE_LIMIT', { limit });
    closeDialog(document.getElementById('limit-dialog'));
    resetLimitDialog();
    showToast(existing ? 'Limit updated.' : 'Daily limit saved.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
  finally { submit.disabled = false; }
});

// Budget dialog.
document.getElementById('total-budget-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  try {
    await send('SAVE_TOTAL_BUDGET', { budget: {
      enabled: document.getElementById('total-budget-enabled').checked,
      minutes: Number(document.getElementById('total-budget-minutes').value),
      mode: document.getElementById('total-budget-mode').value
    }});
    closeDialog(document.getElementById('budget-dialog'));
    showToast('Daily browsing budget saved.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
  finally { submit.disabled = false; }
});

// Category dialog.
document.getElementById('category-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  try {
    await send('SAVE_CATEGORY', { category: {
      id: editingCategoryId || undefined,
      name: document.getElementById('category-name').value.trim(),
      domains: splitDomains(document.getElementById('category-domains').value),
      minutes: Number(document.getElementById('category-value').value),
      period: document.getElementById('category-period').value,
      enabled: editingCategoryId ? snapshot.categories.find((item) => item.id === editingCategoryId)?.enabled !== false : true,
      strict: document.getElementById('category-strict').checked,
      schedule: readSchedule('category')
    }});
    closeDialog(document.getElementById('category-dialog'));
    resetCategoryDialog();
    showToast(editingCategoryId ? 'Category updated.' : 'Category limit saved.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
  finally { submit.disabled = false; }
});

// Focus advanced settings + presets.
document.getElementById('focus-mode').addEventListener('change', updateFocusModeLabel);
document.getElementById('focus-presets').addEventListener('change', (event) => { if (event.target.value) loadPreset(event.target.value); });
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
    closeDialog(document.getElementById('focus-settings-dialog'));
    showToast('Focus started.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
  finally { submit.disabled = false; }
});
document.getElementById('preset-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  try {
    await send('SAVE_FOCUS_PRESET', { preset: {
      name: document.getElementById('preset-name').value.trim(),
      minutes: Number(document.getElementById('preset-duration').value),
      mode: document.getElementById('preset-mode').value,
      domains: splitDomains(document.getElementById('preset-domains').value)
    }});
    event.currentTarget.reset();
    document.getElementById('preset-duration').value = '45';
    showToast('Focus preset saved.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
  finally { submit.disabled = false; }
});

wireFocusView(() => snapshot, {
  render: renderAll,
  refresh,
  showToast,
  openSettings: (trigger) => openDialog(document.getElementById('focus-settings-dialog'), trigger)
});
wireSettingsView({ refresh, showToast });

resetLimitDialog();
resetCategoryDialog();
updateFocusModeLabel();
setDashboardView('home');
refresh().catch((error) => showToast(error.message, true));
setInterval(() => { if (snapshot?.focus) renderFocusView(snapshot, { render: renderAll }); }, 30_000);