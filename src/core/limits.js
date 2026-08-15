const MINUTE_MS = 60_000;

function limitMs(limit) {
  return Math.max(0, Number(limit?.minutes) || 0) * MINUTE_MS;
}

export function getLimitStatus(limit, usedMs = 0, allowanceMs = 0) {
  const baseMs = limitMs(limit);
  const effectiveMs = baseMs + Math.max(0, allowanceMs || 0);
  const enabled = Boolean(limit?.enabled && baseMs > 0);
  return {
    enabled,
    baseMs,
    effectiveMs,
    usedMs: Math.max(0, usedMs || 0),
    remainingMs: enabled ? Math.max(0, effectiveMs - usedMs) : Infinity,
    ratio: baseMs > 0 ? Math.max(0, usedMs) / baseMs : 0,
    reached: enabled && usedMs >= effectiveMs
  };
}

export function shouldBlockDomain(limit, usedMs = 0, allowanceMs = 0) {
  return getLimitStatus(limit, usedMs, allowanceMs).reached;
}
