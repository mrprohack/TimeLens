import { splitSessionByDay } from '../core/time.js';
import { limitPeriodKey } from '../core/limits.js';
import {
  DEFAULT_SETTINGS,
  createDefaultData,
  migrateData,
  validateImport
} from './migrations.js';

export { DEFAULT_SETTINGS };

const STORAGE_KEY = 'timelensData';
const BACKUP_KEY = 'timelensBackup';
const MAX_DIAGNOSTICS = 50;

export function defaultData() {
  return createDefaultData();
}

export async function readData() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return migrateData(result[STORAGE_KEY]);
}

export async function saveData(data) {
  const normalized = migrateData(data);
  await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
  return normalized;
}

export async function backupAndReplaceData(imported) {
  const replacement = validateImport(imported);
  const current = await readData();
  await chrome.storage.local.set({
    [BACKUP_KEY]: current,
    [STORAGE_KEY]: replacement
  });
  return replacement;
}

export async function readBackup() {
  const result = await chrome.storage.local.get(BACKUP_KEY);
  return result[BACKUP_KEY] ? migrateData(result[BACKUP_KEY]) : null;
}

export function addCompletedSessions(data, completed) {
  for (const session of completed) {
    const parts = splitSessionByDay(session);
    for (const part of parts) {
      data.dailyUsage[part.day] ||= {};
      data.dailyUsage[part.day][part.domain] = (data.dailyUsage[part.day][part.domain] || 0) + part.durationMs;
    }
    data.sessions.push({
      ...session,
      id: session.id || `${session.start}:${session.end}:${session.domain}`
    });
  }
}

export function allowancePeriodKey(limit, now = Date.now()) {
  return limitPeriodKey(limit?.period || 'daily', now);
}

export function getAllowanceMs(data, domain, limitOrNow, maybeNow) {
  const legacyCall = typeof limitOrNow === 'number' || limitOrNow === undefined;
  const limit = legacyCall ? { period: 'daily' } : limitOrNow;
  const now = legacyCall ? (limitOrNow ?? Date.now()) : (maybeNow ?? Date.now());
  const key = allowancePeriodKey(limit, now);
  return Math.max(0, Number(data.allowances?.[key]?.[domain]) || 0);
}

export function addAllowance(data, domain, limitOrMinutes, minutesOrNow, maybeNow) {
  const legacyCall = typeof limitOrMinutes === 'number';
  const limit = legacyCall ? { period: 'daily' } : limitOrMinutes;
  const minutes = legacyCall ? limitOrMinutes : minutesOrNow;
  const now = legacyCall ? (minutesOrNow ?? Date.now()) : (maybeNow ?? Date.now());
  const key = allowancePeriodKey(limit, now);
  data.allowances[key] ||= {};
  data.allowances[key][domain] = (data.allowances[key][domain] || 0) + Math.max(0, Number(minutes) || 0) * 60_000;
  return data.allowances[key][domain];
}

export function recordDiagnostic(data, code, error, now = Date.now()) {
  data.diagnostics ||= [];
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  data.diagnostics.push({
    at: Number.isFinite(Number(now)) ? Number(now) : Date.now(),
    code: String(code || 'UNKNOWN').slice(0, 80),
    message: message.slice(0, 300)
  });
  if (data.diagnostics.length > MAX_DIAGNOSTICS) {
    data.diagnostics.splice(0, data.diagnostics.length - MAX_DIAGNOSTICS);
  }
  return data.diagnostics.at(-1);
}

export function getLimitAlertState(data, domain, periodKey) {
  const stored = data.limitAlerts?.[domain];
  if (!stored || stored.periodKey !== periodKey) return { periodKey, sent: [] };
  return {
    periodKey,
    sent: Array.isArray(stored.sent) ? [...new Set(stored.sent)] : []
  };
}

export function markLimitAlertSent(data, domain, periodKey, alert) {
  data.limitAlerts ||= {};
  const state = getLimitAlertState(data, domain, periodKey);
  if (!state.sent.includes(alert)) state.sent.push(alert);
  data.limitAlerts[domain] = state;
  return state;
}

function allowanceDateKey(key) {
  if (/^daily:\d{4}-\d{2}-\d{2}$/.test(key)) return key.slice(6);
  if (/^weekly:\d{4}-\d{2}-\d{2}$/.test(key)) return key.slice(7);
  if (/^monthly:\d{4}-\d{2}$/.test(key)) return `${key.slice(8)}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  return null;
}

export function pruneData(data, now = Date.now()) {
  const retentionMs = Math.max(1, data.settings.retentionDays || 30) * 86_400_000;
  data.sessions = data.sessions.filter((session) => Number.isFinite(session.end) && now - session.end <= retentionMs);

  const aggregateDays = Math.max(data.settings.retentionDays || 30, data.settings.aggregateRetentionDays || 365);
  const oldest = new Date(now);
  oldest.setHours(0, 0, 0, 0);
  oldest.setDate(oldest.getDate() - aggregateDays);
  const year = oldest.getFullYear();
  const month = String(oldest.getMonth() + 1).padStart(2, '0');
  const day = String(oldest.getDate()).padStart(2, '0');
  const oldestKey = `${year}-${month}-${day}`;

  for (const key of Object.keys(data.dailyUsage || {})) {
    if (key < oldestKey) delete data.dailyUsage[key];
  }
  for (const key of Object.keys(data.allowances || {})) {
    const dateKey = allowanceDateKey(key);
    if (!dateKey || dateKey < oldestKey) delete data.allowances[key];
  }
}
