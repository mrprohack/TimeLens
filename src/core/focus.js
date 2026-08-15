const MINUTE_MS = 60_000;

export function createFocusSession(startedAt, minutes, blockedDomains = []) {
  const durationMs = Math.max(1, Number(minutes) || 0) * MINUTE_MS;
  return {
    startedAt,
    endsAt: startedAt + durationMs,
    blockedDomains: [...new Set(blockedDomains.filter(Boolean))]
  };
}

export function isFocusActive(focus, now = Date.now()) {
  return Boolean(focus && Number.isFinite(focus.endsAt) && now < focus.endsAt);
}

export function isDomainFocusBlocked(focus, domain, now = Date.now()) {
  return Boolean(domain && isFocusActive(focus, now) && focus.blockedDomains?.includes(domain));
}
