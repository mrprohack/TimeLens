import { formatDuration, send, setText } from '../shared/ui.js';

const params = new URLSearchParams(location.search);
const domain = params.get('domain') || '';
const reason = params.get('reason') || 'limit';
const returnUrl = params.get('returnUrl') || '';
let blockStatus = null;

const PERIOD_WORD = Object.freeze({ daily: 'day', weekly: 'week', monthly: 'month' });
const PERIOD_TITLE = Object.freeze({ daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' });

function safeReturnUrl() {
  try {
    const url = new URL(returnUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch { return null; }
}

async function load() {
  setText('site-letter', domain ? domain[0].toUpperCase() : 'T');
  blockStatus = await send('GET_BLOCK_STATUS', { domain });

  if (reason === 'focus' || blockStatus.focusActive) {
    setText('reason-label', 'Focus mode');
    setText('blocked-title', `${domain || 'This site'} is paused while you focus.`);
    const remaining = blockStatus.focus ? Math.max(0, blockStatus.focus.endsAt - Date.now()) : 0;
    setText('blocked-copy', `Your focus session has ${formatDuration(remaining, true)} remaining.`);
    setText('usage-line', 'Stay with the task you chose.');
    document.getElementById('allowance-actions').hidden = true;
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
      const target = safeReturnUrl() || `https://${domain}`;
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
