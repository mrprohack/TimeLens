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
