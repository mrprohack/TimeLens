import { createActivityState } from '../core/activity.js';
import { normalizeDomain } from '../core/domain.js';
import { limitPeriodKey, normalizeLimitPeriod } from '../core/limits.js';
import { normalizeSchedule } from '../core/schedule.js';

export const CURRENT_DATA_VERSION = 4;
export const DEFAULT_ALERTS = Object.freeze({
  fiveMinutes: true,
  oneMinute: true,
  timeout: true
});
export const DEFAULT_TOTAL_BUDGET = Object.freeze({
  enabled: false,
  minutes: 300,
  mode: 'warn'
});
export const DEFAULT_FOCUS_PRESETS = Object.freeze([
  Object.freeze({ id: 'work', name: 'Work', minutes: 60, mode: 'block', domains: ['youtube.com', 'reddit.com', 'instagram.com', 'facebook.com', 'x.com'] }),
  Object.freeze({ id: 'study', name: 'Study', minutes: 45, mode: 'block', domains: ['youtube.com', 'reddit.com', 'instagram.com', 'facebook.com', 'x.com'] }),
  Object.freeze({ id: 'deep-work', name: 'Deep Work', minutes: 90, mode: 'block', domains: ['youtube.com', 'reddit.com', 'instagram.com', 'facebook.com', 'x.com'] })
]);

export const DEFAULT_SETTINGS = Object.freeze({
  idleSeconds: 60,
  retentionDays: 30,
  aggregateRetentionDays: 365,
  limits: [],
  alerts: DEFAULT_ALERTS,
  totalBudget: DEFAULT_TOTAL_BUDGET,
  categories: [],
  focusPresets: DEFAULT_FOCUS_PRESETS
});

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function normalizeDomains(value) {
  if (!Array.isArray(value)) return [];
  const domains = [];
  for (const raw of value) {
    const domain = normalizeDomain(raw || '');
    if (domain && !domains.includes(domain)) domains.push(domain);
  }
  return domains;
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
    strict: Boolean(limit.strict),
    schedule: normalizeSchedule(limit.schedule)
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

function normalizeTotalBudget(value) {
  const source = isPlainObject(value) ? value : {};
  return {
    enabled: source.enabled === true,
    minutes: clampNumber(source.minutes, 1, 1440, DEFAULT_TOTAL_BUDGET.minutes),
    mode: source.mode === 'block' ? 'block' : 'warn'
  };
}

function normalizeCategory(category) {
  if (!isPlainObject(category)) return null;
  const id = slug(category.id || category.name);
  const name = String(category.name || '').trim().slice(0, 80);
  const domains = normalizeDomains(category.domains);
  const minutes = Number(category.minutes);
  if (!id || !name || !domains.length || !Number.isFinite(minutes) || minutes <= 0) return null;
  return {
    id,
    name,
    domains,
    minutes: Math.max(1, Math.min(44_640, Math.round(minutes))),
    period: normalizeLimitPeriod(category.period),
    enabled: category.enabled !== false,
    strict: Boolean(category.strict),
    schedule: normalizeSchedule(category.schedule)
  };
}

function normalizeCategories(value) {
  if (!Array.isArray(value)) return [];
  const byId = new Map();
  for (const item of value) {
    const category = normalizeCategory(item);
    if (category) byId.set(category.id, category);
  }
  return [...byId.values()];
}

function normalizeFocusPreset(preset) {
  if (!isPlainObject(preset)) return null;
  const id = slug(preset.id || preset.name);
  const name = String(preset.name || '').trim().slice(0, 80);
  const minutes = Number(preset.minutes);
  const domains = normalizeDomains(preset.domains || preset.blockedDomains);
  if (!id || !name || !Number.isFinite(minutes) || minutes <= 0) return null;
  return {
    id,
    name,
    minutes: Math.max(1, Math.min(480, Math.round(minutes))),
    mode: preset.mode === 'allow' ? 'allow' : 'block',
    domains
  };
}

function cloneDefaultFocusPresets() {
  return DEFAULT_FOCUS_PRESETS.map((preset) => ({ ...preset, domains: [...preset.domains] }));
}

function normalizeFocusPresets(value) {
  if (value === undefined) return cloneDefaultFocusPresets();
  if (!Array.isArray(value)) return cloneDefaultFocusPresets();
  const byId = new Map();
  for (const item of value) {
    const preset = normalizeFocusPreset(item);
    if (preset) byId.set(preset.id, preset);
  }
  return [...byId.values()];
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
    alerts: normalizeAlerts(source.alerts),
    totalBudget: normalizeTotalBudget(source.totalBudget),
    categories: normalizeCategories(source.categories),
    focusPresets: normalizeFocusPresets(source.focusPresets)
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
      idleSeconds: DEFAULT_SETTINGS.idleSeconds,
      retentionDays: DEFAULT_SETTINGS.retentionDays,
      aggregateRetentionDays: DEFAULT_SETTINGS.aggregateRetentionDays,
      limits: [],
      alerts: { ...DEFAULT_ALERTS },
      totalBudget: { ...DEFAULT_TOTAL_BUDGET },
      categories: [],
      focusPresets: cloneDefaultFocusPresets()
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
