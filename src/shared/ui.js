import { formatDuration } from '../core/time.js';
import { initializeAppearance } from './appearance.js';

initializeAppearance();

export { formatDuration };

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

export const MESSAGE_TIMEOUT_MS = 10_000;
export const MESSAGE_RETRY_DELAY_MS = 250;

// Channel-level failures that usually mean the MV3 worker was asleep or restarting.
// One delayed retry almost always succeeds, so the user never sees them.
const TRANSIENT_PATTERNS = [
  /could not establish connection/i,
  /receiving end does not exist/i,
  /message port closed/i,
  /no tab with id/i,
  /worker (is )?(starting|restarting)/i
];

export function isTransientMessagingError(error) {
  const raw = String(error?.message || error || '');
  return TRANSIENT_PATTERNS.some((pattern) => pattern.test(raw));
}

export function friendlyErrorMessage(error) {
  const raw = String(error?.message || error || '').trim();
  if (/extension context invalidated/i.test(raw)) {
    return 'TimeLens was reloaded. Close and reopen this window, then try again.';
  }
  if (raw === 'TimeLens messaging timeout' || /timed out/i.test(raw)) {
    return 'TimeLens took too long to respond. Please try again.';
  }
  if (!raw || isTransientMessagingError(raw)) {
    return 'TimeLens is waking up. Please try again.';
  }
  return raw;
}

function delay(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

async function sendOnce(type, payload, timeoutMs) {
  let timer = null;
  try {
    const response = await Promise.race([
      chrome.runtime.sendMessage({ type, ...payload }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('TimeLens messaging timeout')), timeoutMs);
      })
    ]);
    if (!response?.ok) throw new Error(response?.error || 'TimeLens could not complete the request.');
    return response.data ?? response;
  } finally {
    clearTimeout(timer);
  }
}

export async function send(type, payload = {}, { timeoutMs = MESSAGE_TIMEOUT_MS, retryDelayMs = MESSAGE_RETRY_DELAY_MS } = {}) {
  try {
    return await sendOnce(type, payload, timeoutMs);
  } catch (error) {
    if (!isTransientMessagingError(error)) throw new Error(friendlyErrorMessage(error));
    try {
      await delay(retryDelayMs);
      return await sendOnce(type, payload, timeoutMs);
    } catch (retryError) {
      throw new Error(friendlyErrorMessage(retryError));
    }
  }
}

export function setBusy(button, isBusy = true) {
  if (!button) return;
  const busy = Boolean(isBusy);
  button.disabled = busy;
  button.classList?.toggle('is-busy', busy);
  button.setAttribute?.('aria-busy', busy ? 'true' : 'false');
}

export function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

export function formatClock(timestamp) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));
}
