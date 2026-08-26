import './sidebar-history.js';
import { escapeHtml, formatClock, formatDuration, setText } from '../shared/ui.js';

const BREAKDOWN_COLORS = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#94a3b8'];

function percent(value, max) {
  if (!max) return 0;
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

function comparisonCopy(snapshot) {
  const series = Array.isArray(snapshot.daySeries) ? snapshot.daySeries : [];
  const today = Number(snapshot.todayTotalMs) || 0;
  if (series.length < 2) return 'Active browsing today';
  const yesterday = Number(series.at(-2)?.totalMs) || 0;
  if (!yesterday && !today) return 'Active browsing today';
  const difference = today - yesterday;
  if (!difference) return 'Same as yesterday';
  return `${formatDuration(Math.abs(difference), true)} ${difference < 0 ? 'less' : 'more'} than yesterday`;
}

function siteLimit(snapshot, domain) {
  return (snapshot.limits || []).find((limit) => limit.domain === domain && limit.enabled !== false);
}

function remainingCopy(limit) {
  if (!limit) return 'Limit';
  if (limit.reached) return 'Time up';
  return `${formatDuration(Math.max(0, limit.remainingMs || 0), true)} left`;
}

function attentionItems(snapshot) {
  const items = [];
  const budget = snapshot.totalBudget;
  if (budget?.enabled && (budget.reached || (budget.effectiveMs > 0 && budget.remainingMs / budget.effectiveMs <= 0.2))) {
    items.push({ label: 'Daily browsing budget', state: budget.reached ? 'Limit reached' : `${formatDuration(budget.remainingMs, true)} left`, kind: 'budget' });
  }
  for (const category of snapshot.categories || []) {
    const low = category.effectiveMs > 0 && category.remainingMs / category.effectiveMs <= 0.2;
    if (category.reached || low || (category.schedule?.enabled && category.scheduleActive)) {
      items.push({ label: category.name, state: category.reached ? 'Limit reached' : low ? `${formatDuration(category.remainingMs, true)} left` : 'Scheduled now', kind: 'category' });
    }
  }
  for (const limit of snapshot.limits || []) {
    if (limit.enabled === false) continue;
    const low = limit.effectiveMs > 0 && limit.remainingMs / limit.effectiveMs <= 0.2;
    if (limit.reached || low || (limit.schedule?.enabled && limit.scheduleActive)) {
      items.push({ label: limit.domain, state: limit.reached ? 'Limit reached' : low ? `${formatDuration(limit.remainingMs, true)} left` : 'Scheduled now', kind: 'site', domain: limit.domain });
    }
  }
  if (snapshot.focus) items.unshift({ label: snapshot.focus.name || 'Focus', state: 'Focus active', kind: 'focus' });
  return items.slice(0, 6);
}

function focusSummary(snapshot) {
  if (!snapshot.focus) return { value: 'Ready', meta: '25 minute quick start' };
  const remaining = Math.max(0, Number(snapshot.focus.endsAt || 0) - Date.now());
  return { value: 'Active', meta: `${formatDuration(remaining, true)} left` };
}

function budgetSummary(snapshot) {
  const budget = snapshot.totalBudget;
  if (!budget?.enabled || !budget.effectiveMs) return { value: 'Off', meta: 'No overall budget', progress: 0 };
  const used = Math.max(0, budget.effectiveMs - Math.max(0, budget.remainingMs || 0));
  return {
    value: `${percent(used, budget.effectiveMs)}%`,
    meta: budget.reached ? 'Budget reached' : `${formatDuration(Math.max(0, budget.remainingMs || 0), true)} left`,
    progress: percent(used, budget.effectiveMs)
  };
}

function dayLabel(item, index) {
  const raw = item?.key || item?.date || item?.day;
  if (raw) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return `D${index + 1}`;
}

function renderBreakdown(snapshot) {
  const node = document.getElementById('home-breakdown');
  const source = (snapshot.todayTop || []).filter((item) => Number(item.durationMs) > 0);
  const total = source.reduce((sum, item) => sum + Number(item.durationMs || 0), 0);
  if (!total) {
    node.innerHTML = '<p class="muted">No active browsing recorded today.</p>';
    return;
  }

  const primary = source.slice(0, 4);
  const otherMs = source.slice(4).reduce((sum, item) => sum + Number(item.durationMs || 0), 0);
  const segments = primary.map((item) => ({ label: item.domain, durationMs: Number(item.durationMs || 0) }));
  if (otherMs) segments.push({ label: 'Other', durationMs: otherMs });

  let start = 0;
  const gradient = segments.map((item, index) => {
    const share = (item.durationMs / total) * 100;
    const end = start + share;
    const color = BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length];
    const slice = `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    start = end;
    return slice;
  }).join(', ');

  node.innerHTML = `<div class="breakdown-donut" style="background:conic-gradient(${gradient})"><span><strong>${escapeHtml(formatDuration(total, true))}</strong><small>Total</small></span></div><div class="breakdown-legend">${segments.map((item, index) => `<div class="breakdown-row"><i style="--dot:${BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length]}"></i><span>${escapeHtml(item.label)}</span><strong>${percent(item.durationMs, total)}%</strong></div>`).join('')}</div>`;
}

function renderTrend(snapshot) {
  const node = document.getElementById('home-usage-trend');
  const series = (snapshot.daySeries || []).slice(-7);
  if (!series.length) {
    node.innerHTML = '<p class="muted">No trend data yet.</p>';
    return;
  }
  const max = Math.max(...series.map((item) => Number(item.totalMs) || 0), 1);
  node.innerHTML = series.map((item, index) => {
    const value = Number(item.totalMs) || 0;
    const label = dayLabel(item, index);
    const duration = formatDuration(value, true);
    return `<div class="trend-column" aria-label="${escapeHtml(`${label}: ${duration}`)}"><div class="trend-track" aria-hidden="true"><span style="--bar:${percent(value, max)}%"></span></div><small>${escapeHtml(label)}</small></div>`;
  }).join('');
}

export function renderHome(snapshot, actions = {}) {
  setText('home-today-total', formatDuration(snapshot.todayTotalMs || 0, true));
  setText('home-comparison', comparisonCopy(snapshot));
  setText('home-current-site', snapshot.currentDomain || 'No active website');
  setText('home-current-time', snapshot.currentDomain ? `${formatDuration(snapshot.currentDomainMs || 0, true)} today` : '0m today');

  const focus = focusSummary(snapshot);
  setText('home-focus-kpi', focus.value);
  setText('home-focus-meta', focus.meta);
  setText('home-site-count', String((snapshot.todayTop || []).length));

  const budget = budgetSummary(snapshot);
  setText('home-budget-kpi', budget.value);
  setText('home-budget-meta', budget.meta);
  document.getElementById('home-budget-ring')?.style.setProperty('--budget-progress', `${budget.progress * 3.6}deg`);

  renderBreakdown(snapshot);
  renderTrend(snapshot);

  const top = document.getElementById('home-top-sites');
  const sites = (snapshot.todayTop || []).slice(0, 5);
  if (!sites.length) {
    top.innerHTML = '<p class="muted">No active browsing recorded today.</p>';
  } else {
    const max = Math.max(...sites.map((item) => item.durationMs), 1);
    top.innerHTML = sites.map((item, index) => {
      const limit = siteLimit(snapshot, item.domain);
      return `<div class="usage-item">
        <div class="usage-rank">${index + 1}</div>
        <div class="usage-main"><div class="usage-row"><span class="usage-domain">${escapeHtml(item.domain)}</span><strong>${escapeHtml(formatDuration(item.durationMs, true))}</strong></div><div class="progress" aria-hidden="true"><span style="width:${percent(item.durationMs, max)}%"></span></div></div>
        <button class="btn btn-quiet btn-small home-site-limit" type="button" data-domain="${escapeHtml(item.domain)}">${escapeHtml(remainingCopy(limit))}</button>
      </div>`;
    }).join('');
    top.querySelectorAll('.home-site-limit').forEach((button) => button.addEventListener('click', () => actions.openLimit?.(button.dataset.domain, button)));
  }

  const attention = document.getElementById('home-attention');
  const attentionRows = attentionItems(snapshot);
  if (!attentionRows.length) {
    attention.innerHTML = '<div class="empty-alert"><span>✓</span><div><strong>All clear</strong><small>No limits need attention right now.</small></div></div>';
  } else {
    attention.innerHTML = attentionRows.map((item) => `<div class="attention-item ${escapeHtml(item.kind)}"><span class="attention-icon">${item.kind === 'focus' ? '◎' : item.state === 'Limit reached' ? '!' : '△'}</span><div class="attention-copy"><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.state)}</small></div>${item.domain ? `<button class="btn btn-quiet btn-small attention-edit" type="button" data-domain="${escapeHtml(item.domain)}">Edit</button>` : ''}</div>`).join('');
    attention.querySelectorAll('.attention-edit').forEach((button) => button.addEventListener('click', () => actions.openLimit?.(button.dataset.domain, button)));
  }

  const recent = document.getElementById('home-recent');
  const sessions = (snapshot.sessions || []).slice(0, 5);
  recent.innerHTML = sessions.length ? sessions.map((session) => `<div class="recent-item"><span class="session-dot" aria-hidden="true"></span><div class="recent-copy"><strong>${escapeHtml(session.domain)}</strong><small>${escapeHtml(formatClock(session.start))}</small></div><strong>${escapeHtml(formatDuration(session.durationMs, true))}</strong></div>`).join('') : '<p class="muted">No recent sessions yet.</p>';
}

export function renderHistoryDrawer(snapshot) {
  const node = document.getElementById('history-list');
  const sessions = snapshot.sessions || [];
  const total = sessions.reduce((sum, session) => sum + Number(session.durationMs || 0), 0);
  setText('history-total-time', formatDuration(total, true));
  setText('history-session-count', String(sessions.length));
  node.innerHTML = sessions.length ? sessions.map((session) => `<div class="history-row"><span class="history-domain">${escapeHtml(session.domain)}</span><span class="history-time">${escapeHtml(formatClock(session.start))}</span><strong>${escapeHtml(formatDuration(session.durationMs, true))}</strong></div>`).join('') : '<p class="muted">No recent sessions yet.</p>';
}
