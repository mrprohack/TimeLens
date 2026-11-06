import { getLimitStatus, limitDayKeys } from './limits.js';

export function domainMatchesRule(domain, ruleDomain) {
  const current = String(domain || '').toLowerCase().replace(/^\.+|\.+$/g, '');
  const rule = String(ruleDomain || '').toLowerCase().replace(/^\.+|\.+$/g, '');
  if (!current || !rule) return false;
  return current === rule || current.endsWith(`.${rule}`);
}

export function createDomainMatcher(rules = []) {
  const normalizedRules = (Array.isArray(rules) ? rules : [])
    .map((rule) => String(rule || '').toLowerCase().replace(/^\.+|\.+$/g, ''))
    .filter(Boolean);
  const ruleSet = new Set(normalizedRules);

  return function matches(domain) {
    const current = String(domain || '').toLowerCase().replace(/^\.+|\.+$/g, '');
    if (!current || !ruleSet.size) return false;
    if (ruleSet.has(current)) return true;

    const parts = current.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      const suffix = parts.slice(i).join('.');
      if (ruleSet.has(suffix)) return true;
    }
    return false;
  };
}

export function domainInCategory(domain, category) {
  return Array.isArray(category?.domains) && category.domains.some((rule) => domainMatchesRule(domain, rule));
}

export function categoryUsage(dailyUsage, category, now = Date.now()) {
  const matcher = createDomainMatcher(category?.domains);
  const keys = limitDayKeys(category?.period, now);
  const memo = new Map();
  let total = 0;

  for (const key of keys) {
    const day = dailyUsage?.[key] || {};
    for (const [domain, duration] of Object.entries(day)) {
      let isMatch = memo.get(domain);
      if (isMatch === undefined) {
        isMatch = matcher(domain);
        memo.set(domain, isMatch);
      }
      if (isMatch) total += Math.max(0, Number(duration) || 0);
    }
  }
  return total;
}

export function categoryStatus(category, dailyUsage, now = Date.now(), allowanceMs = 0) {
  const usedMs = categoryUsage(dailyUsage, category, now);
  return getLimitStatus(category, usedMs, allowanceMs);
}
