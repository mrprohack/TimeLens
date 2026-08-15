export function aggregateSessions(sessions = []) {
  const byDomain = {};
  let totalMs = 0;

  for (const session of sessions) {
    if (!session?.domain || !Number.isFinite(session.durationMs) || session.durationMs <= 0) continue;
    totalMs += session.durationMs;
    byDomain[session.domain] = (byDomain[session.domain] || 0) + session.durationMs;
  }

  return { totalMs, byDomain };
}

export function sortedUsage(byDomain = {}) {
  return Object.entries(byDomain)
    .map(([domain, durationMs]) => ({ domain, durationMs }))
    .sort((a, b) => b.durationMs - a.durationMs || a.domain.localeCompare(b.domain));
}

export function rangeTotal(dailyUsage = {}, dayKeys = []) {
  const byDomain = {};
  let totalMs = 0;
  for (const key of dayKeys) {
    const day = dailyUsage[key] || {};
    for (const [domain, durationMs] of Object.entries(day)) {
      if (!Number.isFinite(durationMs) || durationMs <= 0) continue;
      totalMs += durationMs;
      byDomain[domain] = (byDomain[domain] || 0) + durationMs;
    }
  }
  return { totalMs, byDomain };
}
