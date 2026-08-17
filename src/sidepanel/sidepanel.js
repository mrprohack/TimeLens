import { escapeHtml, formatDuration, send, setText } from '../shared/ui.js';

let state = null;
const PERIOD_WORD = Object.freeze({ daily: 'day', weekly: 'week', monthly: 'month' });

function percent(value) {
  return Math.max(0, Math.min(100, Math.round((Number(value) || 0) * 100)));
}

function status(message) {
  setText('side-status', message || '');
}

function renderBudget() {
  const budget = state?.totalBudget;
  const copy = document.getElementById('side-budget-copy');
  const bar = document.getElementById('side-budget-bar');
  const progress = bar.parentElement;
  if (!budget?.enabled) {
    copy.textContent = 'Not enabled';
    bar.style.width = '0%';
    progress.setAttribute('aria-valuenow', '0');
    return;
  }
  const used = formatDuration(budget.usedMs, true);
  const total = formatDuration(budget.minutes * 60_000, true);
  copy.textContent = `${used} / ${total}`;
  const ratio = percent(budget.ratio);
  bar.style.width = `${ratio}%`;
  progress.setAttribute('aria-valuenow', String(ratio));
}

function renderBoundaries() {
  const container = document.getElementById('side-boundaries');
  const entries = [];
  const limit = state?.limits?.find((item) => item.domain === state.currentDomain && item.enabled && item.scheduleActive !== false);
  if (limit) {
    entries.push({
      title: 'Website limit',
      meta: `${formatDuration(limit.usedMs, true)} / ${formatDuration(limit.minutes * 60_000, true)} per ${PERIOD_WORD[limit.period] || 'day'}`,
      ratio: limit.ratio
    });
  }
  for (const category of state?.currentCategoryLimits || []) {
    if (!category.enabled || category.scheduleActive === false) continue;
    entries.push({
      title: category.name,
      meta: `${formatDuration(category.usedMs, true)} / ${formatDuration(category.minutes * 60_000, true)} per ${PERIOD_WORD[category.period] || 'day'}`,
      ratio: category.ratio
    });
  }

  if (!entries.length) {
    container.innerHTML = '<p class="muted">No active limits for this website.</p>';
    return;
  }

  container.innerHTML = entries.map((entry) => `
    <div class="boundary-item">
      <div class="boundary-title"><span>${escapeHtml(entry.title)}</span><span>${percent(entry.ratio)}%</span></div>
      <div class="progress" aria-hidden="true"><span style="width:${percent(entry.ratio)}%"></span></div>
      <div class="boundary-copy">${escapeHtml(entry.meta)}</div>
    </div>`).join('');
}

function renderFocus() {
  const presets = state?.settings?.focusPresets || [];
  const container = document.getElementById('side-focus-presets');
  const stop = document.getElementById('side-stop-focus');
  if (state?.focus) {
    const remaining = Math.max(0, state.focus.endsAt - Date.now());
    setText('side-focus-state', `${state.focus.name || 'Focus'} · ${formatDuration(remaining, true)} left`);
    stop.hidden = false;
  } else {
    setText('side-focus-state', 'Ready');
    stop.hidden = true;
  }

  container.innerHTML = presets.map((preset) => `
    <button class="btn preset-button" type="button" data-preset="${escapeHtml(preset.id)}">
      <strong>${escapeHtml(preset.name)}</strong>
      <small>${escapeHtml(formatDuration(preset.minutes * 60_000, true))} · ${preset.mode === 'allow' ? 'allow only' : 'block list'}</small>
    </button>`).join('');
}

function render() {
  setText('side-current-domain', state?.currentDomain || 'No active website');
  setText('side-today-total', formatDuration(state?.todayTotalMs || 0, true));
  document.getElementById('side-limit-site').disabled = !state?.currentDomain;
  renderBudget();
  renderBoundaries();
  renderFocus();
}

async function refresh() {
  try {
    state = await send('GET_SNAPSHOT', { rangeDays: 7 });
    render();
  } catch (error) {
    status(error.message);
  }
}

document.getElementById('side-limit-site').addEventListener('click', async () => {
  if (!state?.currentDomain) return;
  const minutes = Number(document.getElementById('side-limit-minutes').value) || 30;
  const button = document.getElementById('side-limit-site');
  button.disabled = true;
  try {
    await send('SAVE_LIMIT', {
      limit: { domain: state.currentDomain, minutes, period: 'daily', strict: false, enabled: true }
    });
    status(`${state.currentDomain} limited to ${minutes} minutes per day.`);
    await refresh();
  } catch (error) {
    status(error.message);
  } finally {
    button.disabled = false;
  }
});

document.getElementById('side-focus-presets').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-preset]');
  if (!button) return;
  const preset = state?.settings?.focusPresets?.find((item) => item.id === button.dataset.preset);
  if (!preset) return;
  button.disabled = true;
  try {
    await send('START_FOCUS', {
      minutes: preset.minutes,
      domains: preset.domains,
      mode: preset.mode,
      name: preset.name
    });
    status(`${preset.name} started.`);
    await refresh();
  } catch (error) {
    status(error.message);
  } finally {
    button.disabled = false;
  }
});

document.getElementById('side-stop-focus').addEventListener('click', async () => {
  try {
    await send('STOP_FOCUS');
    status('Focus ended.');
    await refresh();
  } catch (error) {
    status(error.message);
  }
});

document.getElementById('side-open-dashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refresh();
});

setInterval(() => {
  if (!document.hidden) refresh();
}, 15_000);

refresh();
