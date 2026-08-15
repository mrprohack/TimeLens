import { formatDuration } from '../core/time.js';

export { formatDuration };

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

export async function send(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response?.ok) throw new Error(response?.error || 'TimeLens could not complete the request.');
  return response.data ?? response;
}

export function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

export function formatClock(timestamp) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));
}
