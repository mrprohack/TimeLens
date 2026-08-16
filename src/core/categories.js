import { getLimitStatus, limitDayKeys } from './limits.js';

export function domainMatchesRule(domain, ruleDomain) {
  const current = String(domain || '').toLowerCase().replace(/^\.+|\.+$/g, '');
  const rule = String(ruleDomain || '').toLowerCase().replace(/^\.+|\.+$/g, '');
  if (!current || !rule) return false;
  return current === rule || current.endsWith(`.${rule}`);
}

export function domainInCategory(domain, category) {
  return Array.isArray(category?.domains) && category.domains.some((rule) => domainMatchesRule(domain, rule));
}

export function categoryUsage(dailyUsage, category, now = Date.now()) {
  const keys = limitDayKeys(category?.period, now);
  let total = 0;
  for (const key of keys) {
    const day = dailyUsage?.[key] || {};
    for (const [domain, duration] of Object.entries(day)) {
      if (domainInCategory(domain, category)) total += Math.max(0, Number(duration) || 0);
    }
  }
  return total;
}

export function categoryStatus(category, dailyUsage, now = Date.now(), allowanceMs = 0) {
  const usedMs = categoryUsage(dailyUsage, category, now);
  return getLimitStatus(category, usedMs, allowanceMs);
}
