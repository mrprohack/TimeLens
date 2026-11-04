import { setBusy } from './ui.js';

// A small inline status line with an optional one-tap action (typically Undo).
// `root` must contain [data-notice-text] and [data-notice-action]. Replacing a
// destructive confirm() with Undo is faster for the common case and just as safe.
export function createNotice(root, { defaultTimeoutMs = 8_000 } = {}) {
  const text = root.querySelector('[data-notice-text]');
  const action = root.querySelector('[data-notice-action]');
  let timer = null;
  let handler = null;

  function clear() {
    clearTimeout(timer);
    handler = null;
    text.textContent = '';
    action.hidden = true;
    action.textContent = '';
    root.hidden = true;
  }

  function show(message, { actionLabel = '', onAction = null, timeoutMs = defaultTimeoutMs, tone = 'info' } = {}) {
    clearTimeout(timer);
    text.textContent = message;
    root.dataset.tone = tone;
    handler = typeof onAction === 'function' ? onAction : null;
    action.hidden = !(actionLabel && handler);
    action.textContent = actionLabel;
    root.hidden = false;
    if (timeoutMs > 0) timer = setTimeout(clear, timeoutMs);
  }

  action.addEventListener('click', async () => {
    const run = handler;
    if (!run) return;
    handler = null;
    clearTimeout(timer);
    setBusy(action);
    try {
      const message = await run();
      if (message) show(String(message), { timeoutMs: 4_000 });
      else clear();
    } catch (error) {
      show(error?.message || 'Could not undo that.', { tone: 'error', timeoutMs: 6_000 });
    } finally {
      setBusy(action, false);
    }
  });

  clear();
  return { show, clear };
}
