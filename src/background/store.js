import { createActivityState } from '../core/activity.js';
import { dayKey, splitSessionByDay } from '../core/time.js';

const STORAGE_KEY = 'timelensData';

export const DEFAULT_SETTINGS = Object.freeze({
  idleSeconds: 60,
  retentionDays: 30,
  aggregateRetentionDays: 365,
  limits: []
});

export function defaultData() {
  return {
    version: 2,
    settings: { ...DEFAULT_SETTINGS, limits: [] },
    dailyUsage: {},
    sessions: [],
    activityState: createActivityState(),
    focus: null,
    allowances: {},
    limitAlerts: {}
  };
}

function normalizeData(value) {
  const base = defaultData();
  if (!value || typeof value !== 'object') return base;
  return {
    ...base,
    ...value,
    version: 2,
    settings: {
      ...base.settings,
      ...(value.settings || {}),
      limits: Array.isArray(value.settings?.limits) ? value.settings.limits : []
    },
    dailyUsage: value.dailyUsage && typeof value.dailyUsage === 'object' ? value.dailyUsage : {},
    sessions: Array.isArray(value.sessions) ? value.sessions : [],
    activityState: createActivityState(value.activityState || {}),
    allowances: value.allowances && typeof value.allowances === 'object' ? value.allowances : {},
    limitAlerts: value.limitAlerts && typeof value.limitAlerts === 'object' ? value.limitAlerts : {}
  };
}

export async function readData() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeData(result[STORAGE_KEY]);
}

export async function saveData(data) {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
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
      id: `${session.start}:${session.end}:${session.domain}`
    });
  }
}

export function getAllowanceMs(data, domain, now = Date.now()) {
  return data.allowances?.[dayKey(now)]?.[domain] || 0;
}

export function addAllowance(data, domain, minutes, now = Date.now()) {
  const key = dayKey(now);
  data.allowances[key] ||= {};
  data.allowances[key][domain] = (data.allowances[key][domain] || 0) + Math.max(0, Number(minutes) || 0) * 60_000;
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

export function pruneData(data, now = Date.now()) {
  const retentionMs = Math.max(1, data.settings.retentionDays || 30) * 86_400_000;
  data.sessions = data.sessions.filter((session) => Number.isFinite(session.end) && now - session.end <= retentionMs);

  const aggregateDays = Math.max(data.settings.retentionDays || 30, data.settings.aggregateRetentionDays || 365);
  const oldest = new Date(now);
  oldest.setHours(0, 0, 0, 0);
  oldest.setDate(oldest.getDate() - aggregateDays);
  const oldestKey = dayKey(oldest.getTime());

  for (const key of Object.keys(data.dailyUsage)) {
    if (key < oldestKey) delete data.dailyUsage[key];
  }
  for (const key of Object.keys(data.allowances)) {
    if (key < oldestKey) delete data.allowances[key];
  }
}
