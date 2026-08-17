const triggerByDialog = new WeakMap();

function focusableIn(dialog) {
  return dialog.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
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
