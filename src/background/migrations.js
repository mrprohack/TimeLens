import { createActivityState } from '../core/activity.js';
import { normalizeDomain } from '../core/domain.js';
import { limitPeriodKey, normalizeLimitPeriod } from '../core/limits.js';

export const CURRENT_DATA_VERSION = 3;
export const DEFAULT_ALERTS = Object.freeze({
  fiveMinutes: true,
  oneMinute: true,
  timeout: true
});

export const DEFAULT_SETTINGS = Object.freeze({
  idleSeconds: 60,
  retentionDays: 30,
  aggregateRetentionDays: 365,
  limits: [],
  alerts: DEFAULT_ALERTS
});

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeLimit(limit) {
  if (!isPlainObject(limit)) return null;
  const domain = normalizeDomain(limit.domain || '');
  const minutes = Number(limit.minutes);
  if (!domain || !Number.isFinite(minutes) || minutes <= 0) return null;
  return {
    domain,
    minutes: Math.max(1, Math.min(44_640, Math.round(minutes))),
    period: normalizeLimitPeriod(limit.period),
    enabled: limit.enabled !== false,
    strict: Boolean(limit.strict)
  };
}

function normalizeLimits(value) {
  if (!Array.isArray(value)) return [];
  const byDomain = new Map();
  for (const item of value) {
    const limit = normalizeLimit(item);
    if (limit) byDomain.set(limit.domain, limit);
  }
  return [...byDomain.values()];
}

function normalizeAlerts(value) {
  const source = isPlainObject(value) ? value : {};
  return {
    fiveMinutes: source.fiveMinutes === undefined ? true : Boolean(source.fiveMinutes),
    oneMinute: source.oneMinute === undefined ? true : Boolean(source.oneMinute),
    timeout: source.timeout === undefined ? true : Boolean(source.timeout)
  };
}

function normalizeSettings(value) {
  const source = isPlainObject(value) ? value : {};
  const retentionDays = clampNumber(source.retentionDays, 7, 180, DEFAULT_SETTINGS.retentionDays);
  return {
    idleSeconds: clampNumber(source.idleSeconds, 15, 600, DEFAULT_SETTINGS.idleSeconds),
    retentionDays,
    aggregateRetentionDays: clampNumber(
      source.aggregateRetentionDays,
      retentionDays,
      3650,
      Math.max(DEFAULT_SETTINGS.aggregateRetentionDays, retentionDays)
    ),
    limits: normalizeLimits(source.limits),
    alerts: normalizeAlerts(source.alerts)
  };
}

function normalizeDailyUsage(value) {
  if (!isPlainObject(value)) return {};
  const result = {};
  for (const [day, usage] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !isPlainObject(usage)) continue;
    const clean = {};
    for (const [rawDomain, rawMs] of Object.entries(usage)) {
      const domain = normalizeDomain(rawDomain);
      const ms = Number(rawMs);
      if (domain && Number.isFinite(ms) && ms >= 0) clean[domain] = ms;
    }
    if (Object.keys(clean).length) result[day] = clean;
  }
  return result;
}

function normalizeSessions(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((session) => {
    if (!isPlainObject(session)) return [];
    const domain = normalizeDomain(session.domain || '');
    const start = Number(session.start);
    const end = Number(session.end);
    const durationMs = Number(session.durationMs);
    if (!domain || !Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(durationMs) || durationMs < 0) return [];
    return [{ ...session, domain, start, end, durationMs }];
  });
}

function dateKeyToTimestamp(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isFinite(date.getTime()) ? date.getTime() : null;
}

function normalizeAllowances(value, limits) {
  if (!isPlainObject(value)) return {};
  const result = {};
  const limitMap = new Map(limits.map((limit) => [limit.domain, limit]));

  for (const [rawKey, byDomain] of Object.entries(value)) {
    if (!isPlainObject(byDomain)) continue;
    for (const [rawDomain, rawMs] of Object.entries(byDomain)) {
      const domain = normalizeDomain(rawDomain);
      const ms = Number(rawMs);
      if (!domain || !Number.isFinite(ms) || ms <= 0) continue;

      let key = rawKey;
      if (!/^(daily|weekly|monthly):/.test(rawKey)) {
        const timestamp = dateKeyToTimestamp(rawKey);
        if (timestamp === null) continue;
        key = limitPeriodKey(limitMap.get(domain)?.period || 'daily', timestamp);
      }

      result[key] ||= {};
      result[key][domain] = (result[key][domain] || 0) + ms;
    }
  }
  return result;
}

function normalizeDiagnostics(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isPlainObject(entry)) return [];
    const at = Number(entry.at);
    const code = String(entry.code || '').slice(0, 80);
    const message = String(entry.message || '').slice(0, 300);
    if (!Number.isFinite(at) || !code) return [];
    return [{ at, code, message }];
  }).slice(-50);
}

function normalizeAlertState(value) {
  return isPlainObject(value) ? value : {};
}

export function createDefaultData() {
  return {
    version: CURRENT_DATA_VERSION,
    settings: {
      ...DEFAULT_SETTINGS,
      limits: [],
      alerts: { ...DEFAULT_ALERTS }
    },
    dailyUsage: {},
    sessions: [],
    activityState: createActivityState(),
    focus: null,
    allowances: {},
    limitAlerts: {},
    diagnostics: []
  };
}

export function migrateData(raw) {
  const base = createDefaultData();
  if (!isPlainObject(raw)) return base;

  const settings = normalizeSettings(raw.settings);
  return {
    ...base,
    ...raw,
    version: CURRENT_DATA_VERSION,
    settings,
    dailyUsage: normalizeDailyUsage(raw.dailyUsage),
    sessions: normalizeSessions(raw.sessions),
    activityState: createActivityState(isPlainObject(raw.activityState) ? raw.activityState : {}),
    focus: isPlainObject(raw.focus) ? raw.focus : null,
    allowances: normalizeAllowances(raw.allowances, settings.limits),
    limitAlerts: normalizeAlertState(raw.limitAlerts),
    diagnostics: normalizeDiagnostics(raw.diagnostics)
  };
}

export function validateImport(raw) {
  if (!isPlainObject(raw)) throw new Error('Choose a valid TimeLens export JSON file.');
  if (!isPlainObject(raw.settings) || !isPlainObject(raw.dailyUsage) || !Array.isArray(raw.sessions)) {
    throw new Error('Choose a valid TimeLens export JSON file.');
  }
  return migrateData(raw);
}
