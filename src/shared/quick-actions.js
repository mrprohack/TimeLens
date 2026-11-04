// Per-viewer conveniences shared by the popup, side panel and dashboard (all share
// one extension origin, so they share this localStorage). They only remember which
// choice was used last so repeat actions are one tap. Storage can be blocked, so
// every access is guarded and falls back to defaults.
const FOCUS_PRESET_KEY = 'timelensLastFocusPreset';
const LIMIT_MINUTES_KEY = 'timelensLastLimitMinutes';

export const LIMIT_MINUTE_CHOICES = Object.freeze([15, 30, 60]);
export const DEFAULT_LIMIT_MINUTES = 30;

function defaultStorage() {
  try { return globalThis.localStorage; } catch { return undefined; }
}

export function getLastFocusPresetId(storage = defaultStorage()) {
  try { return storage?.getItem(FOCUS_PRESET_KEY) || null; } catch { return null; }
}

export function rememberFocusPreset(id, storage = defaultStorage()) {
  if (!id) return;
  try { storage?.setItem(FOCUS_PRESET_KEY, String(id)); } catch { /* optional */ }
}

export function getLastLimitMinutes(storage = defaultStorage()) {
  try {
    const value = Number(storage?.getItem(LIMIT_MINUTES_KEY));
    return LIMIT_MINUTE_CHOICES.includes(value) ? value : DEFAULT_LIMIT_MINUTES;
  } catch {
    return DEFAULT_LIMIT_MINUTES;
  }
}

export function rememberLimitMinutes(minutes, storage = defaultStorage()) {
  const value = Number(minutes);
  if (!LIMIT_MINUTE_CHOICES.includes(value)) return;
  try { storage?.setItem(LIMIT_MINUTES_KEY, String(value)); } catch { /* optional */ }
}
