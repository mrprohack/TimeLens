import { dayKey } from './time.js';

const MINUTE_MS = 60_000;
const LIMIT_PERIODS = new Set(['daily', 'weekly', 'monthly']);

function limitMs(limit) {
  return Math.max(0, Number(limit?.minutes) || 0) * MINUTE_MS;
}

export function normalizeLimitPeriod(period) {
  return LIMIT_PERIODS.has(period) ? period : 'daily';
}

function periodStartDate(period, now = Date.now()) {
  const normalized = normalizeLimitPeriod(period);
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);

  if (normalized === 'weekly') {
    const daysSinceMonday = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - daysSinceMonday);
  } else if (normalized === 'monthly') {
    date.setDate(1);
  }

  return date;
}

export function limitPeriodKey(period, now = Date.now()) {
  const normalized = normalizeLimitPeriod(period);
  const start = periodStartDate(normalized, now);
  if (normalized === 'monthly') return `monthly:${dayKey(start.getTime()).slice(0, 7)}`;
  return `${normalized}:${dayKey(start.getTime())}`;
}

export function limitDayKeys(period, now = Date.now()) {
  const cursor = periodStartDate(period, now);
  const endKey = dayKey(now);
  const keys = [];

  while (true) {
    const key = dayKey(cursor.getTime());
    keys.push(key);
    if (key === endKey) break;
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function usageForLimit(dailyUsage, domain, limit, now = Date.now()) {
  if (!domain) return 0;
  return limitDayKeys(limit?.period, now).reduce(
    (sum, key) => sum + Math.max(0, Number(dailyUsage?.[key]?.[domain]) || 0),
    0
  );
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

export function nextLimitAlert(status, sent = []) {
  if (!status?.enabled) return null;
  const alreadySent = new Set(Array.isArray(sent) ? sent : []);

  if (status.reached || status.remainingMs <= 0) {
    return alreadySent.has('timeout') ? null : 'timeout';
  }
  if (status.remainingMs <= MINUTE_MS) {
    return alreadySent.has('1m') ? null : '1m';
  }
  if (status.remainingMs <= 5 * MINUTE_MS) {
    return alreadySent.has('5m') ? null : '5m';
  }
  return null;
}

export function shouldBlockDomain(limit, usedMs = 0, allowanceMs = 0) {
  return getLimitStatus(limit, usedMs, allowanceMs).reached;
}
