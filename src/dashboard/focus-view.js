import { escapeHtml, formatDuration, send, setBusy, setText } from '../shared/ui.js';
import { DEFAULT_FOCUS_DOMAINS, quickFocusPayload } from '../core/focus.js';
import { formatMinutesShort } from '../core/time.js';
import { getLastFocusPresetId, rememberFocusPreset } from '../shared/quick-actions.js';

let selectedMinutes = 25;
let selectedPresetId = '';
// Until the user picks something, the view opens on the same preset the one-tap
// buttons in the popup and side panel would start.
let selectionTouched = false;

function selectedPreset(snapshot) {
  return (snapshot.settings?.focusPresets || []).find((preset) => preset.id === selectedPresetId) || null;
}

function focusPayload(snapshot) {
  const preset = selectedPreset(snapshot);
  if (preset) {
    const { presetId, ...session } = quickFocusPayload([preset], preset.id);
    return session;
  }
  return { minutes: selectedMinutes, domains: [...DEFAULT_FOCUS_DOMAINS], mode: 'block', name: 'Focus' };
}

function applyDefaultSelection(snapshot) {
  if (selectionTouched) return;
  const presets = snapshot.settings?.focusPresets || [];
  if (!presets.length) return;
  const quick = quickFocusPayload(presets, getLastFocusPresetId());
  selectedPresetId = quick.presetId || '';
  selectedMinutes = quick.minutes;
}

function renderPresetChips(snapshot, actions) {
  const node = document.getElementById('focus-preset-chips');
  const presets = snapshot.settings?.focusPresets || [];
  node.innerHTML = presets.slice(0, 6).map((preset) => `<button type="button" class="preset-chip ${preset.id === selectedPresetId ? 'is-selected' : ''}" data-id="${escapeHtml(preset.id)}">${escapeHtml(preset.name)} · ${escapeHtml(formatMinutesShort(preset.minutes))}</button>`).join('');
  node.querySelectorAll('.preset-chip').forEach((button) => button.addEventListener('click', () => {
    selectionTouched = true;
    selectedPresetId = button.dataset.id;
    const preset = selectedPreset(snapshot);
    if (preset) selectedMinutes = preset.minutes;
    actions.render?.();
  }));
}

export function renderFocusView(snapshot, actions = {}) {
  const active = Boolean(snapshot.focus);
  const idle = document.getElementById('focus-idle-state');
  const activeNode = document.getElementById('focus-active');
  idle.hidden = active;
  activeNode.hidden = !active;

  if (active) {
    const domains = snapshot.focus.domains || snapshot.focus.blockedDomains || [];
    setText('focus-remaining', formatDuration(Math.max(0, snapshot.focus.endsAt - Date.now()), true));
    setText('focus-session-name', snapshot.focus.name || 'Focus');
    setText('focus-blocked-count', snapshot.focus.mode === 'allow'
      ? `${domains.length} websites allowed · everything else blocked`
      : `${domains.length} distracting sites blocked`);
    return;
  }

  applyDefaultSelection(snapshot);
  document.querySelectorAll('[data-focus-minutes]').forEach((button) => {
    button.classList.toggle('is-selected', Number(button.dataset.focusMinutes) === selectedMinutes && !selectedPresetId);
  });
  const preset = selectedPreset(snapshot);
  setText('focus-selection-copy', preset
    ? `Using: ${preset.name} · ${preset.mode === 'allow' ? 'Allow only' : 'Block distractions'}`
    : 'Using: Block distractions');
  renderPresetChips(snapshot, actions);
}

export function wireFocusView(getSnapshot, actions = {}) {
  document.getElementById('focus-duration-options')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-focus-minutes]');
    if (!button) return;
    selectionTouched = true;
    selectedPresetId = '';
    selectedMinutes = Number(button.dataset.focusMinutes) || 25;
    actions.render?.();
  });

  document.getElementById('simple-start-focus')?.addEventListener('click', async () => {
    const button = document.getElementById('simple-start-focus');
    setBusy(button);
    try {
      await send('START_FOCUS', focusPayload(getSnapshot()));
      rememberFocusPreset(selectedPresetId);
      actions.showToast?.('Focus started.');
      await actions.refresh?.();
    } catch (error) { actions.showToast?.(error.message, true); }
    finally { setBusy(button, false); }
  });

  document.getElementById('stop-focus')?.addEventListener('click', async () => {
    try {
      await send('STOP_FOCUS');
      actions.showToast?.('Focus ended.');
      await actions.refresh?.();
    } catch (error) { actions.showToast?.(error.message, true); }
  });

  document.getElementById('open-focus-settings')?.addEventListener('click', (event) => actions.openSettings?.(event.currentTarget));
}

export function resetFocusSelection() {
  selectedMinutes = 25;
  selectedPresetId = '';
  selectionTouched = false;
}
