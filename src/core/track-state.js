// Derives the popup status pill from the strongest active boundary so the
// headline state is honest instead of a static decoration.
export function trackState(snapshot) {
  const budget = snapshot?.totalBudget;
  const currentDomain = snapshot?.currentDomain;
  const limit = currentDomain
    ? (snapshot?.limits || []).find((item) => item.domain === currentDomain && item.enabled !== false)
    : null;

  const active = [];
  if (budget?.enabled && budget.effectiveMs > 0) active.push(budget);
  if (limit?.effectiveMs > 0 && limit.scheduleActive !== false) active.push(limit);

  if (active.some((item) => item.reached)) return { label: 'Limit reached', tone: 'reached' };
  if (!active.length) return { label: 'On Track', tone: 'ok' };

  const lowestRatio = active.reduce((lowest, item) => {
    const ratio = Math.max(0, Number(item.remainingMs) || 0) / item.effectiveMs;
    return Math.min(lowest, ratio);
  }, 1);
  if (lowestRatio <= 0.2) return { label: 'Almost up', tone: 'warn' };
  return { label: 'On Track', tone: 'ok' };
}
