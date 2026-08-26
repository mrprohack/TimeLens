import './form-accessibility.js';

const triggerByDialog = new WeakMap();
const FOCUSABLE_SELECTOR = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function focusableIn(dialog) {
  return dialog.querySelector(FOCUSABLE_SELECTOR);
}

function focusableAll(dialog) {
  return [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter((node) => !node.hidden && node.getAttribute('aria-hidden') !== 'true');
}

function trapFocus(event) {
  if (event.key !== 'Tab') return;
  const dialog = event.currentTarget;
  if (!dialog || dialog.hidden) return;
  const focusable = focusableAll(dialog);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function openDialog(dialog, trigger = document.activeElement) {
  if (!dialog) return;
  if (trigger instanceof HTMLElement) triggerByDialog.set(dialog, trigger);
  dialog.hidden = false;
  dialog.setAttribute('aria-hidden', 'false');
  queueMicrotask(() => focusableIn(dialog)?.focus());
}

export function closeDialog(dialog) {
  if (!dialog) return;
  dialog.hidden = true;
  dialog.setAttribute('aria-hidden', 'true');
  const trigger = triggerByDialog.get(dialog);
  if (trigger?.isConnected) trigger.focus();
  triggerByDialog.delete(dialog);
}

export function setDisclosure(button, panel, expanded) {
  if (!button || !panel) return;
  button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  panel.hidden = !expanded;
}

export function wireDialog(dialog) {
  if (!dialog) return;
  dialog.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => closeDialog(dialog));
  });
  dialog.addEventListener('keydown', trapFocus);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
}

export function wireEscapeToClose(dialogs) {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = dialogs.find((dialog) => dialog && !dialog.hidden);
    if (open) closeDialog(open);
  });
}
