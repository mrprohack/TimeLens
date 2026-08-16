import { formatDuration, send, setText } from '../shared/ui.js';

const params = new URLSearchParams(location.search);
const domain = params.get('domain') || '';
const reason = params.get('reason') || 'limit';
const RETURN_URL_PREFIX = 'timelensReturnUrl:';
let blockStatus = null;

const PERIOD_WORD = Object.freeze({ daily: 'day', weekly: 'week', monthly: 'month' });
const PERIOD_TITLE = Object.freeze({ daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' });

async function takeSafeReturnUrl() {
  const tab = await chrome.tabs.getCurrent();
  if (!tab?.id || !chrome.storage?.session) return null;
  const key = `${RETURN_URL_PREFIX}${tab.id}`;
  try {
    const result = await chrome.storage.session.get(key);
    await chrome.storage.session.remove(key);
    const url = new URL(result?.[key] || '');
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    // Session data is optional convenience; fall back to the normalized site root.
    try { await chrome.storage.session.remove(key); } catch {}
    return null;
  }
}

function hideAllowance() {
  document.getElementById('allowance-actions').hidden = true;
}

async function load() {
  setText('site-letter', domain ? domain[0].toUpperCase() : 'T');
  blockStatus = await send('GET_BLOCK_STATUS', { domain });

  if (reason === 'focus' || blockStatus.focusActive) {
    setText('reason-label', 'Focus mode');
    setText('blocked-title', `${domain || 'This site'} is paused while you focus.`);
    const remaining = blockStatus.focus ? Math.max(0, blockStatus.focus.endsAt - Date.now()) : 0;
    const modeCopy = blockStatus.focus?.mode === 'allow' ? 'You chose an allow-only Focus session.' : 'You chose to block this distraction during Focus.';
    setText('blocked-copy', `Your focus session has ${formatDuration(remaining, true)} remaining. ${modeCopy}`);
    setText('usage-line', 'Stay with the task you chose.');
    hideAllowance();
    return;
  }

  if (reason === 'budget') {
    const budget = blockStatus.totalBudget;
    setText('reason-label', 'Browsing budget reached');
    setText('blocked-title', 'Time’s up — don’t waste your time.');
    setText('blocked-copy', 'You reached your total active-browsing budget for today. Browsing stays paused until the daily budget resets.');
    setText('usage-line', budget
      ? `${formatDuration(budget.usedMs, true)} used · ${formatDuration(budget.minutes * 60_000, true)} / day`
      : 'Your daily browsing boundary is active.');
    hideAllowance();
    return;
  }

  if (reason === 'category') {
    const category = blockStatus.categories?.find((item) => item.reached && item.scheduleActive !== false) || blockStatus.categories?.[0];
    const period = category?.period || 'daily';
    const periodWord = PERIOD_WORD[period] || 'day';
    setText('reason-label', `${PERIOD_TITLE[period] || 'Daily'} category limit reached`);
    setText('blocked-title', 'Time’s up — don’t waste your time.');
    setText('blocked-copy', category
      ? `${category.name} reached its ${periodWord} category limit. This website is part of that shared boundary.`
      : 'This website belongs to a category that has reached its configured limit.');
    setText('usage-line', category
      ? `${formatDuration(category.usedMs, true)} used · ${formatDuration(category.minutes * 60_000, true)} / ${periodWord}`
      : 'Open the dashboard to review your category limits.');
    hideAllowance();
    return;
  }

  const limit = blockStatus.limit;
  const period = limit?.period || 'daily';
  const periodWord = PERIOD_WORD[period] || 'day';
  setText('reason-label', `${PERIOD_TITLE[period] || 'Daily'} limit reached`);
  setText('blocked-title', 'Time’s up — don’t waste your time.');
  if (limit) {
    setText('blocked-copy', limit.strict
      ? `${domain || 'This site'} reached its ${periodWord} limit. Strict mode keeps it blocked until this limit period resets.`
      : `${domain || 'This site'} reached its ${periodWord} limit. Close the tab, or take a small extension only if you truly need it.`);
    setText('usage-line', `${formatDuration(limit.usedMs, true)} used · ${formatDuration(limit.minutes * 60_000, true)} / ${periodWord}`);
    document.getElementById('allowance-actions').hidden = limit.strict;
  } else {
    hideAllowance();
  }
}

document.getElementById('close-tab').addEventListener('click', async () => {
  const tab = await chrome.tabs.getCurrent();
  if (tab?.id) chrome.tabs.remove(tab.id);
});

document.getElementById('open-dashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
});

document.querySelectorAll('.allowance').forEach((button) => {
  button.addEventListener('click', async () => {
    document.querySelectorAll('.allowance').forEach((item) => { item.disabled = true; });
    try {
      await send('ADD_ALLOWANCE', { domain, minutes: Number(button.dataset.minutes) });
      const target = (await takeSafeReturnUrl()) || `https://${domain}`;
      const tab = await chrome.tabs.getCurrent();
      if (tab?.id) await chrome.tabs.update(tab.id, { url: target });
    } catch (error) {
      const node = document.getElementById('error-message');
      node.hidden = false;
      node.textContent = error.message;
      document.querySelectorAll('.allowance').forEach((item) => { item.disabled = false; });
    }
  });
});

load().catch((error) => {
  const node = document.getElementById('error-message');
  node.hidden = false;
  node.textContent = error.message;
});
