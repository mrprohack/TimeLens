import { formatMinutesShort } from './time.js';

const MINUTE_MS = 60_000;
const FOCUS_MODES = new Set(['block', 'allow']);

function normalizeMode(mode) {
  return FOCUS_MODES.has(mode) ? mode : 'block';
}

export function createFocusSession(startedAt, minutes, domains = [], mode = 'block', name = 'Focus') {
  const durationMs = Math.max(1, Number(minutes) || 0) * MINUTE_MS;
  return {
    startedAt,
    endsAt: startedAt + durationMs,
    mode: normalizeMode(mode),
    name: String(name || 'Focus').slice(0, 80),
    domains: [...new Set(domains.filter(Boolean))],
    // Keep the legacy property for older UI/export consumers while 1.3 migrates.
    blockedDomains: normalizeMode(mode) === 'block' ? [...new Set(domains.filter(Boolean))] : []
  };
}

export function isFocusActive(focus, now = Date.now()) {
  return Boolean(focus && Number.isFinite(focus.endsAt) && now < focus.endsAt);
}

function focusDomains(focus) {
  if (Array.isArray(focus?.domains)) return focus.domains;
  if (Array.isArray(focus?.blockedDomains)) return focus.blockedDomains;
  return [];
}

export function isDomainFocusBlocked(focus, domain, now = Date.now()) {
  if (!domain || !isFocusActive(focus, now)) return false;
  const domains = focusDomains(focus);
  const mode = normalizeMode(focus?.mode);
  return mode === 'allow' ? !domains.includes(domain) : domains.includes(domain);
}

// The one place that decides what a one-tap "Start Focus" does, so the popup, side
// panel and dashboard can never disagree: the preset used last, else the first
// saved preset, else the built-in default.
export const DEFAULT_FOCUS_DOMAINS = Object.freeze(['youtube.com', 'reddit.com', 'instagram.com', 'facebook.com', 'x.com']);

export function quickFocusPayload(presets, lastPresetId) {
  const list = Array.isArray(presets) ? presets.filter((preset) => preset && typeof preset === 'object') : [];
  const preset = list.find((item) => item.id === lastPresetId) || list[0] || null;
  if (!preset) {
    return { presetId: null, minutes: 25, domains: [...DEFAULT_FOCUS_DOMAINS], mode: 'block', name: 'Focus' };
  }
  const mode = preset.mode === 'allow' ? 'allow' : 'block';
  const domains = Array.isArray(preset.domains) ? [...preset.domains] : [];
  return {
    presetId: preset.id,
    minutes: Number(preset.minutes) || 25,
    // A block-list Focus with no sites would start "successfully" and block nothing.
    // Allow-only is left as is: the worker rejects an empty list instead of guessing.
    domains: mode === 'block' && !domains.length ? [...DEFAULT_FOCUS_DOMAINS] : domains,
    mode,
    name: String(preset.name || 'Focus')
  };
}

export function focusStartLabel({ name, minutes }) {
  return `Start ${name} · ${formatMinutesShort(minutes)}`;
}
