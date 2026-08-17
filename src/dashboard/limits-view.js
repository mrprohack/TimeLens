import { escapeHtml, formatDuration, send, setText } from '../shared/ui.js';
import { scheduleCopy } from './forms.js';

const PERIOD_WORD = Object.freeze({ daily: 'day', weekly: 'week', monthly: 'month' });

function status(limit) {
  if (!limit.enabled) return { label: 'Paused', tone: 'paused' };
  if (limit.schedule?.enabled && limit.scheduleActive === false) return { label: 'Scheduled off', tone: 'paused' };
  if (limit.reached) return { label: 'Time up', tone: 'reached' };
  if (limit.remainingMs <= 60_000) return { label: '1 min left', tone: 'critical' };
  if (limit.remainingMs <= 5 * 60_000) return { label: '5 min left', tone: 'warning' };
  return { label: 'Active', tone: 'active' };
}

function badges(rule) {
  const values = [];
  if (rule.strict) values.push('Strict');
  if (rule.schedule?.enabled) values.push(scheduleCopy(rule.schedule));
  return values;
}

function renderSiteLimits(snapshot, actions) {
  const node = document.getElementById('limit-list');
  const limits = snapshot.limits || [];
  if (!limits.length) {
    node.innerHTML = '<p class="muted">No site limits yet. Add one when a website starts taking too much time.</p>';
    return;
  }

  node.innerHTML = limits.map((limit) => {
    const state = status(limit);
    const used = formatDuration(limit.usedMs || 0, true);
    const total = formatDuration(limit.minutes * 60_000, true);
    const remaining = limit.reached ? 'No time left' : `${formatDuration(Math.max(0, limit.remainingMs || 0), true)} left`;
    const progress = Math.min(100, Math.max(0, Math.round((limit.ratio || 0) * 100)));
    const ruleBadges = badges(limit).map((badge) => `<span class="status-chip">${escapeHtml(badge)}</span>`).join('');
    return `<div class="limit-item ${limit.enabled ? '' : 'is-paused'}">
      <div class="limit-main">
        <div class="limit-title-row"><span class="limit-domain">${escapeHtml(limit.domain)}</span><span class="status-chip ${state.tone}">${escapeHtml(state.label)}</span>${ruleBadges}</div>
        <div class="limit-meta">${escapeHtml(used)} / ${escapeHtml(total)} per ${escapeHtml(PERIOD_WORD[limit.period] || 'day')} · ${escapeHtml(remaining)}</div>
      </div>
      <div class="limit-progress"><div class="progress" aria-label="${progress}% of limit used"><span style="width:${progress}%"></span></div></div>
      <details class="row-menu"><summary aria-label="Actions for ${escapeHtml(limit.domain)}">⋯</summary><div class="row-menu-popover">
        <button type="button" class="menu-edit" data-domain="${escapeHtml(limit.domain)}">Edit</button>
        <button type="button" class="menu-toggle" data-domain="${escapeHtml(limit.domain)}" data-enabled="${limit.enabled ? 'false' : 'true'}">${limit.enabled ? 'Pause' : 'Resume'}</button>
        <button type="button" class="menu-delete danger" data-domain="${escapeHtml(limit.domain)}">Delete</button>
      </div></details>
    </div>`;
  }).join('');

  node.querySelectorAll('.menu-edit').forEach((button) => button.addEventListener('click', () => {
    const limit = limits.find((item) => item.domain === button.dataset.domain);
    actions.openLimit?.(limit, button);
  }));

  node.querySelectorAll('.menu-toggle').forEach((button) => button.addEventListener('click', async () => {
    try {
      await send('TOGGLE_LIMIT', { domain: button.dataset.domain, enabled: button.dataset.enabled === 'true' });
      actions.showToast?.(button.dataset.enabled === 'true' ? 'Limit resumed.' : 'Limit paused.');
      await actions.refresh?.();
    } catch (error) { actions.showToast?.(error.message, true); }
  }));

  node.querySelectorAll('.menu-delete').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm(`Delete the limit for ${button.dataset.domain}?`)) return;
    try {
      await send('DELETE_LIMIT', { domain: button.dataset.domain });
      actions.showToast?.('Limit removed.');
      await actions.refresh?.();
    } catch (error) { actions.showToast?.(error.message, true); }
  }));
}

function renderBudget(snapshot) {
  const budget = snapshot.totalBudget || snapshot.settings?.totalBudget || { enabled: false, minutes: 300, mode: 'warn' };
  const summary = document.getElementById('budget-summary');
  const button = document.getElementById('open-budget-dialog');
  if (!budget.enabled) {
    setText('total-budget-progress', 'Not enabled');
    summary.querySelector('span').textContent = 'No overall budget set.';
    button.textContent = 'Set budget';
    return;
  }
  const used = formatDuration(budget.usedMs || 0, true);
  const total = formatDuration((budget.minutes || 0) * 60_000, true);
  const remaining = budget.reached ? 'Limit reached' : `${formatDuration(Math.max(0, budget.remainingMs || 0), true)} left`;
  setText('total-budget-progress', `${used} / ${total}`);
  summary.querySelector('span').textContent = remaining;
  button.textContent = 'Edit';
}

function renderCategories(snapshot, actions) {
  const categories = snapshot.categories || [];
  setText('category-count', categories.length ? `${categories.length} configured` : 'Optional shared limits');
  const node = document.getElementById('category-list');
  if (!categories.length) {
    node.innerHTML = '<p class="muted">No category limits yet.</p>';
    return;
  }
  node.innerHTML = categories.map((category) => {
    const progress = Math.min(100, Math.max(0, Math.round((category.ratio || 0) * 100)));
    const remaining = category.reached ? 'Limit reached' : `${formatDuration(Math.max(0, category.remainingMs || 0), true)} left`;
    return `<div class="limit-item ${category.enabled ? '' : 'is-paused'}">
      <div class="limit-main"><div class="limit-title-row"><span class="limit-domain">${escapeHtml(category.name)}</span>${category.strict ? '<span class="status-chip">Strict</span>' : ''}</div><div class="limit-meta">${escapeHtml(category.domains.join(', '))} · ${escapeHtml(formatDuration(category.minutes * 60_000, true))} / ${escapeHtml(PERIOD_WORD[category.period] || 'day')} · ${escapeHtml(remaining)}</div></div>
      <div class="limit-progress"><div class="progress" aria-label="${progress}% of category limit used"><span style="width:${progress}%"></span></div></div>
      <details class="row-menu"><summary aria-label="Actions for ${escapeHtml(category.name)}">⋯</summary><div class="row-menu-popover"><button type="button" class="category-edit" data-id="${escapeHtml(category.id)}">Edit</button><button type="button" class="category-delete danger" data-id="${escapeHtml(category.id)}">Delete</button></div></details>
    </div>`;
  }).join('');

  node.querySelectorAll('.category-edit').forEach((button) => button.addEventListener('click', () => {
    const category = categories.find((item) => item.id === button.dataset.id);
    actions.openCategory?.(category, button);
  }));
  node.querySelectorAll('.category-delete').forEach((button) => button.addEventListener('click', async () => {
    const category = categories.find((item) => item.id === button.dataset.id);
    if (!category || !confirm(`Delete the ${category.name} category limit?`)) return;
    try {
      await send('DELETE_CATEGORY', { id: category.id });
      actions.showToast?.('Category removed.');
      await actions.refresh?.();
    } catch (error) { actions.showToast?.(error.message, true); }
  }));
}

export function renderLimitsView(snapshot, actions = {}) {
  renderSiteLimits(snapshot, actions);
  renderBudget(snapshot);
  renderCategories(snapshot, actions);
}
