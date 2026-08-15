import { formatDuration, send, setText } from '../shared/ui.js';

const params = new URLSearchParams(location.search);
const domain = params.get('domain') || '';
const reason = params.get('reason') || 'limit';
const returnUrl = params.get('returnUrl') || '';
let blockStatus = null;

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
  setText('reason-label', 'Daily limit reached');
  setText('blocked-title', `You've reached today's limit for ${domain || 'this site'}.`);
  if (limit) {
    setText('blocked-copy', limit.strict ? 'Strict mode is on, so extra time is disabled until tomorrow.' : 'Your boundary is active. You can close the tab or use a small one-time extension.');
    setText('usage-line', `${formatDuration(limit.usedMs, true)} used · ${limit.minutes}m daily limit`);
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
