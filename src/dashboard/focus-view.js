import { escapeHtml, formatDuration, send, setText } from '../shared/ui.js';

const DEFAULT_DOMAINS = ['youtube.com', 'reddit.com', 'instagram.com', 'facebook.com', 'x.com'];
let selectedMinutes = 25;
let selectedPresetId = '';

function selectedPreset(snapshot) {
  return (snapshot.settings?.focusPresets || []).find((preset) => preset.id === selectedPresetId) || null;
}

function focusPayload(snapshot) {
  const preset = selectedPreset(snapshot);
  if (preset) return { minutes: preset.minutes, domains: preset.domains, mode: preset.mode, name: preset.name };
  return { minutes: selectedMinutes, domains: DEFAULT_DOMAINS, mode: 'block', name: 'Focus' };
}

function renderPresetChips(snapshot, actions) {
  const node = document.getElementById('focus-preset-chips');
  const presets = snapshot.settings?.focusPresets || [];
  node.innerHTML = presets.slice(0, 6).map((preset) => `<button type="button" class="preset-chip ${preset.id === selectedPresetId ? 'is-selected' : ''}" data-id="${escapeHtml(preset.id)}">${escapeHtml(preset.name)} · ${escapeHtml(formatDuration(preset.minutes * 60_000, true))}</button>`).join('');
  node.querySelectorAll('.preset-chip').forEach((button) => button.addEventListener('click', () => {
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
    selectedPresetId = '';
    selectedMinutes = Number(button.dataset.focusMinutes) || 25;
    actions.render?.();
  });

  document.getElementById('simple-start-focus')?.addEventListener('click', async () => {
    const button = document.getElementById('simple-start-focus');
    button.disabled = true;
    try {
      await send('START_FOCUS', focusPayload(getSnapshot()));
      actions.showToast?.('Focus started.');
      await actions.refresh?.();
    } catch (error) { actions.showToast?.(error.message, true); }
    finally { button.disabled = false; }
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
}
