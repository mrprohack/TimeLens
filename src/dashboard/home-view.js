import { escapeHtml, formatClock, formatDuration, setText } from '../shared/ui.js';

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
  if (snapshot.focus) {
    items.unshift({ label: snapshot.focus.name || 'Focus', state: 'Focus active', kind: 'focus' });
  }
  return items.slice(0, 6);
}

export function renderHome(snapshot, actions = {}) {
  setText('home-today-total', formatDuration(snapshot.todayTotalMs || 0, true));
  setText('home-comparison', comparisonCopy(snapshot));
  setText('home-current-site', snapshot.currentDomain || 'No active website');
  setText('home-current-time', snapshot.currentDomain ? `${formatDuration(snapshot.currentDomainMs || 0, true)} today` : '0m today');

  const top = document.getElementById('home-top-sites');
  const sites = (snapshot.todayTop || []).slice(0, 5);
  if (!sites.length) {
    top.innerHTML = '<p class="muted">No active browsing recorded today.</p>';
  } else {
    const max = Math.max(...sites.map((item) => item.durationMs), 1);
    top.innerHTML = sites.map((item) => {
      const limit = siteLimit(snapshot, item.domain);
      return `<div class="usage-item">
        <div class="usage-row"><span class="usage-domain">${escapeHtml(item.domain)}</span><strong>${escapeHtml(formatDuration(item.durationMs, true))}</strong></div>
        <div class="progress" aria-hidden="true"><span style="width:${percent(item.durationMs, max)}%"></span></div>
        <div class="usage-row"><span class="muted small">Today</span><button class="btn btn-quiet btn-small home-site-limit" type="button" data-domain="${escapeHtml(item.domain)}">${escapeHtml(remainingCopy(limit))}</button></div>
      </div>`;
    }).join('');
    top.querySelectorAll('.home-site-limit').forEach((button) => {
      button.addEventListener('click', () => actions.openLimit?.(button.dataset.domain, button));
    });
  }

  const attention = document.getElementById('home-attention');
  const attentionRows = attentionItems(snapshot);
  if (!attentionRows.length) {
    attention.innerHTML = '<p class="muted">All limits look good today.</p>';
  } else {
    attention.innerHTML = attentionRows.map((item) => `<div class="attention-item"><div class="usage-row"><strong>${escapeHtml(item.label)}</strong><span class="muted small">${escapeHtml(item.state)}</span></div>${item.domain ? `<button class="btn btn-quiet btn-small attention-edit" type="button" data-domain="${escapeHtml(item.domain)}">Edit</button>` : ''}</div>`).join('');
    attention.querySelectorAll('.attention-edit').forEach((button) => button.addEventListener('click', () => actions.openLimit?.(button.dataset.domain, button)));
  }

  const recent = document.getElementById('home-recent');
  const sessions = (snapshot.sessions || []).slice(0, 5);
  recent.innerHTML = sessions.length ? sessions.map((session) => `<div class="recent-item"><div class="usage-row"><strong>${escapeHtml(session.domain)}</strong><span>${escapeHtml(formatDuration(session.durationMs, true))}</span></div><div class="muted small">${escapeHtml(formatClock(session.start))}</div></div>`).join('') : '<p class="muted">No recent sessions yet.</p>';
}

export function renderHistoryDrawer(snapshot) {
  const node = document.getElementById('history-list');
  const sessions = snapshot.sessions || [];
  node.innerHTML = sessions.length ? sessions.map((session) => `<div class="history-row"><span class="history-domain">${escapeHtml(session.domain)}</span><span class="history-time">${escapeHtml(formatClock(session.start))}</span><strong>${escapeHtml(formatDuration(session.durationMs, true))}</strong></div>`).join('') : '<p class="muted">No recent sessions yet.</p>';
}
