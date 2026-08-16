import { normalizeDomain } from '../core/domain.js';
import { transitionActivity, createActivityState } from '../core/activity.js';
import { rangeTotal, sortedUsage } from '../core/analytics.js';
import {
  getLimitStatus,
  limitPeriodKey,
  nextLimitAlert,
  normalizeLimitPeriod,
  shouldBlockDomain,
  usageForLimit
} from '../core/limits.js';
import { categoryStatus, domainInCategory } from '../core/categories.js';
import { createFocusSession, isDomainFocusBlocked, isFocusActive } from '../core/focus.js';
import { isScheduleActive, normalizeSchedule } from '../core/schedule.js';
import { recentDayKeys } from '../core/time.js';
import {
  addAllowance,
  addCompletedSessions,
  backupAndReplaceData,
  getAllowanceMs,
  getLimitAlertState,
  markLimitAlertSent,
  pruneData,
  readData,
  recordDiagnostic,
  saveData
} from './store.js';

const RECONCILE_ALARM = 'timelens-reconcile';
const ONBOARDING_PATH = 'src/onboarding/onboarding.html';
const MAX_LIMIT_MINUTES = Object.freeze({
  daily: 24 * 60,
  weekly: 7 * 24 * 60,
  monthly: 31 * 24 * 60
});
let queue = Promise.resolve();

function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

async function recordBackgroundFailure(code, error) {
  try {
    const data = await readData();
    recordDiagnostic(data, code, error);
    await saveData(data);
  } catch {
    // Storage failures cannot be journaled safely. Keep the worker alive.
  }
}

function enqueueEvent(task, code) {
  enqueue(task).catch((error) => recordBackgroundFailure(code, error));
}

async function activeTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tabs[0] || null;
}

async function activeDomain() {
  const tab = await activeTab();
  return normalizeDomain(tab?.url || null);
}

function findLimit(data, domain, { enabledOnly = true } = {}) {
  return data.settings.limits.find((item) => item.domain === domain && (!enabledOnly || item.enabled));
}

function periodName(period) {
  return normalizeLimitPeriod(period);
}

function alertPreferenceKey(alert) {
  if (alert === '5m') return 'fiveMinutes';
  if (alert === '1m') return 'oneMinute';
  return 'timeout';
}

function alertEnabled(data, alert) {
  return data.settings.alerts?.[alertPreferenceKey(alert)] !== false;
}

function boundaryCopy(kind, label, rule, alert) {
  const period = periodName(rule.period);
  if (kind === 'budget') {
    if (alert === '5m') return { title: '5 minutes left', message: 'Your browsing budget has 5 minutes left today.', requireInteraction: false };
    if (alert === '1m') return { title: '1 minute left', message: 'Your browsing budget has 1 minute left today. Finish up now.', requireInteraction: false };
    return { title: 'TimeLens · Time’s up', message: 'Your browsing budget is reached. Time’s up — don’t waste your time.', requireInteraction: true };
  }
  if (kind === 'category') {
    if (alert === '5m') return { title: '5 minutes left', message: `${label} has 5 minutes left on its ${period} limit.`, requireInteraction: false };
    if (alert === '1m') return { title: '1 minute left', message: `${label} has 1 minute left on its ${period} limit. Finish up now.`, requireInteraction: false };
    return { title: 'TimeLens · Time’s up', message: `Time’s up — don’t waste your time. ${label} reached its ${period} category limit.`, requireInteraction: true };
  }
  if (alert === '5m') return { title: '5 minutes left', message: `${label} has 5 minutes left on its ${period} limit.`, requireInteraction: false };
  if (alert === '1m') return { title: '1 minute left', message: `${label} has 1 minute left on its ${period} limit. Finish up now.`, requireInteraction: false };
  return { title: 'TimeLens · Time’s up', message: `Time’s up — don’t waste your time. ${label} reached its ${period} limit.`, requireInteraction: true };
}

async function showBoundaryNotification(alertKey, label, rule, alert, kind = 'site') {
  const content = boundaryCopy(kind, label, rule, alert);
  await chrome.notifications.create(`timelens-${kind}-${alert}-${alertKey}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: content.title,
    message: content.message,
    priority: alert === 'timeout' ? 2 : 1,
    requireInteraction: content.requireInteraction
  });
}

async function maybeAlertBoundary(data, alertKey, label, rule, status, now, kind = 'site') {
  const periodKey = limitPeriodKey(rule.period || 'daily', now);
  const alertState = getLimitAlertState(data, alertKey, periodKey);
  const alert = nextLimitAlert(status, alertState.sent);
  if (!alert) return null;

  if (alertEnabled(data, alert)) {
    try {
      await showBoundaryNotification(alertKey, label, rule, alert, kind);
    } catch (error) {
      recordDiagnostic(data, 'LIMIT_NOTIFICATION_FAILED', error, now);
    }
  }

  markLimitAlertSent(data, alertKey, periodKey, alert);
  await saveData(data);
  return alert;
}

async function navigateToBlocked(data, domain, reason) {
  try {
    const tab = await activeTab();
    if (!tab?.id || normalizeDomain(tab.url || '') !== domain) return false;
    const url = new URL(chrome.runtime.getURL('src/blocked/blocked.html'));
    url.searchParams.set('domain', domain);
    url.searchParams.set('reason', reason);
    if (tab.url) url.searchParams.set('returnUrl', tab.url);
    await chrome.tabs.update(tab.id, { url: url.toString() });
    return true;
  } catch (error) {
    recordDiagnostic(data, 'BLOCK_NAVIGATION_FAILED', error);
    await saveData(data);
    return false;
  }
}

function todayUsage(data, now = Date.now()) {
  const today = recentDayKeys(1, now)[0];
  const byDomain = data.dailyUsage[today] || {};
  const totalMs = Object.values(byDomain).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  return { today, byDomain, totalMs };
}

function totalBudgetStatus(data, now = Date.now()) {
  const budget = data.settings.totalBudget || { enabled: false, minutes: 300, mode: 'warn' };
  const rule = { ...budget, period: 'daily', strict: budget.mode === 'block' };
  return { rule, ...getLimitStatus(rule, todayUsage(data, now).totalMs, 0) };
}

function matchingCategories(data, domain) {
  return (data.settings.categories || []).filter((category) => category.enabled && domainInCategory(domain, category));
}

async function enforceDomain(data, domain, now = Date.now()) {
  if (!domain) return;

  if (isDomainFocusBlocked(data.focus, domain, now)) {
    await navigateToBlocked(data, domain, 'focus');
    return;
  }

  const budget = data.settings.totalBudget;
  if (budget?.enabled) {
    const status = totalBudgetStatus(data, now);
    await maybeAlertBoundary(data, '__total__', 'Browsing budget', status.rule, status, now, 'budget');
    if (budget.mode === 'block' && status.reached) {
      await navigateToBlocked(data, domain, 'budget');
      return;
    }
  }

  for (const category of matchingCategories(data, domain)) {
    if (!isScheduleActive(category.schedule, now)) continue;
    const status = categoryStatus(category, data.dailyUsage, now);
    await maybeAlertBoundary(data, `category:${category.id}`, category.name, category, status, now, 'category');
    if (status.reached) {
      await navigateToBlocked(data, domain, 'category');
      return;
    }
  }

  const limit = findLimit(data, domain);
  if (!limit || !isScheduleActive(limit.schedule, now)) return;
  const usedMs = usageForLimit(data.dailyUsage, domain, limit, now);
  const allowanceMs = getAllowanceMs(data, domain, limit, now);
  const status = getLimitStatus(limit, usedMs, allowanceMs);

  await maybeAlertBoundary(data, domain, domain, limit, status, now, 'site');
  if (shouldBlockDomain(limit, usedMs, allowanceMs)) {
    await navigateToBlocked(data, domain, 'limit');
  }
}

async function processActivityEvent(event, { enforce = true } = {}) {
  const data = await readData();
  const result = transitionActivity(data.activityState, event);
  data.activityState = result.state;
  addCompletedSessions(data, result.completed);
  pruneData(data, event.at || Date.now());
  if (data.focus && !isFocusActive(data.focus, event.at || Date.now())) data.focus = null;
  const saved = await saveData(data);
  if (enforce) await enforceDomain(saved, saved.activityState.domain, event.at || Date.now());
  return saved;
}

async function reconcile({ resetTimer = false } = {}) {
  const now = Date.now();
  const data = await readData();
  if (resetTimer) data.activityState = createActivityState();
  const idleState = await chrome.idle.queryState(data.settings.idleSeconds || 60);
  const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
  const focused = windows.some((window) => window.focused);
  const domain = focused ? await activeDomain() : null;

  let result = transitionActivity(data.activityState, { type: 'FOCUS', at: now, focused });
  addCompletedSessions(data, result.completed);
  result = transitionActivity(result.state, { type: 'IDLE', at: now, idle: idleState !== 'active' });
  addCompletedSessions(data, result.completed);
  result = transitionActivity(result.state, { type: 'ACTIVE_DOMAIN', at: now, domain });
  addCompletedSessions(data, result.completed);
  data.activityState = result.state;
  pruneData(data, now);
  const saved = await saveData(data);
  await enforceDomain(saved, domain, now);
}

async function flushAndRead() {
  await processActivityEvent({ type: 'FLUSH', at: Date.now() }, { enforce: false });
  return readData();
}

function limitView(data, domain, now = Date.now()) {
  const limit = findLimit(data, domain, { enabledOnly: false });
  if (!limit) return null;
  const period = normalizeLimitPeriod(limit.period);
  const usedMs = usageForLimit(data.dailyUsage, domain, limit, now);
  const allowanceMs = getAllowanceMs(data, domain, limit, now);
  return {
    ...limit,
    period,
    periodKey: limitPeriodKey(period, now),
    scheduleActive: isScheduleActive(limit.schedule, now),
    ...getLimitStatus(limit, usedMs, allowanceMs),
    allowanceMs
  };
}

function categoryView(data, category, now = Date.now()) {
  const period = normalizeLimitPeriod(category.period);
  const status = categoryStatus(category, data.dailyUsage, now);
  return {
    ...category,
    period,
    periodKey: limitPeriodKey(period, now),
    scheduleActive: isScheduleActive(category.schedule, now),
    ...status
  };
}

function totalBudgetView(data, now = Date.now()) {
  const status = totalBudgetStatus(data, now);
  return {
    ...data.settings.totalBudget,
    period: 'daily',
    periodKey: limitPeriodKey('daily', now),
    usedMs: status.usedMs,
    baseMs: status.baseMs,
    effectiveMs: status.effectiveMs,
    remainingMs: status.remainingMs,
    ratio: status.ratio,
    reached: status.reached
  };
}

function snapshotFromData(data, rangeDays = 7, now = Date.now()) {
  const keys = recentDayKeys(Math.min(30, Math.max(1, Number(rangeDays) || 7)), now);
  const today = keys[0];
  const todayByDomain = data.dailyUsage[today] || {};
  const todayTotalMs = Object.values(todayByDomain).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const range = rangeTotal(data.dailyUsage, keys);
  const limits = data.settings.limits.map((limit) => limitView(data, limit.domain, now));
  const categories = (data.settings.categories || []).map((category) => categoryView(data, category, now));
  const diagnostics = Array.isArray(data.diagnostics) ? data.diagnostics : [];

  return {
    now,
    today,
    todayTotalMs,
    todayByDomain,
    todayTop: sortedUsage(todayByDomain),
    rangeDays: keys.length,
    rangeTotalMs: range.totalMs,
    rangeTop: sortedUsage(range.byDomain),
    daySeries: [...keys].reverse().map((key) => ({
      day: key,
      totalMs: Object.values(data.dailyUsage[key] || {}).reduce((sum, value) => sum + (Number(value) || 0), 0)
    })),
    currentDomain: data.activityState.domain,
    currentDomainMs: data.activityState.domain ? todayByDomain[data.activityState.domain] || 0 : 0,
    focus: isFocusActive(data.focus, now) ? data.focus : null,
    limits,
    totalBudget: totalBudgetView(data, now),
    categories,
    currentCategoryLimits: data.activityState.domain
      ? categories.filter((category) => domainInCategory(data.activityState.domain, category))
      : [],
    sessions: [...data.sessions].sort((a, b) => b.end - a.end).slice(0, 80),
    settings: data.settings,
    health: {
      status: diagnostics.length ? 'attention' : 'healthy',
      diagnosticCount: diagnostics.length,
      lastDiagnostic: diagnostics.at(-1) || null,
      storageBytesApprox: new TextEncoder().encode(JSON.stringify(data)).length
    }
  };
}

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function normalizeDomains(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => normalizeDomain(value)).filter(Boolean))];
}

async function handleMessage(message) {
  switch (message?.type) {
    case 'GET_SNAPSHOT': {
      const data = await flushAndRead();
      return { ok: true, data: snapshotFromData(data, message.rangeDays) };
    }
    case 'SAVE_LIMIT': {
      const domain = normalizeDomain(message.limit?.domain || '');
      const period = normalizeLimitPeriod(message.limit?.period);
      const requestedMinutes = Number(message.limit?.minutes);
      if (!domain || !Number.isFinite(requestedMinutes) || requestedMinutes <= 0) {
        throw new Error('Enter a valid website and time limit.');
      }
      const minutes = Math.max(1, Math.min(MAX_LIMIT_MINUTES[period], Math.round(requestedMinutes)));
      const data = await readData();
      const limit = {
        domain,
        minutes,
        period,
        enabled: message.limit?.enabled !== false,
        strict: Boolean(message.limit?.strict),
        schedule: normalizeSchedule(message.limit?.schedule)
      };
      const index = data.settings.limits.findIndex((item) => item.domain === domain);
      if (index >= 0) data.settings.limits[index] = limit;
      else data.settings.limits.push(limit);
      delete data.limitAlerts?.[domain];
      const saved = await saveData(data);
      await enforceDomain(saved, saved.activityState.domain);
      return { ok: true, limit: saved.settings.limits.find((item) => item.domain === domain) };
    }
    case 'TOGGLE_LIMIT': {
      const domain = normalizeDomain(message.domain || '');
      if (!domain) throw new Error('Invalid website.');
      const data = await readData();
      const limit = findLimit(data, domain, { enabledOnly: false });
      if (!limit) throw new Error('Limit not found.');
      limit.enabled = Boolean(message.enabled);
      delete data.limitAlerts?.[domain];
      const saved = await saveData(data);
      if (limit.enabled) await enforceDomain(saved, saved.activityState.domain);
      return { ok: true, limit: saved.settings.limits.find((item) => item.domain === domain) };
    }
    case 'DELETE_LIMIT': {
      const domain = normalizeDomain(message.domain || '');
      const data = await readData();
      data.settings.limits = data.settings.limits.filter((item) => item.domain !== domain);
      delete data.limitAlerts?.[domain];
      await saveData(data);
      return { ok: true };
    }
    case 'SAVE_TOTAL_BUDGET': {
      const requestedMinutes = Number(message.budget?.minutes);
      if (!Number.isFinite(requestedMinutes) || requestedMinutes <= 0) throw new Error('Enter a valid daily browsing budget.');
      const data = await readData();
      data.settings.totalBudget = {
        enabled: message.budget?.enabled === true,
        minutes: Math.max(1, Math.min(1440, Math.round(requestedMinutes))),
        mode: message.budget?.mode === 'block' ? 'block' : 'warn'
      };
      delete data.limitAlerts?.__total__;
      const saved = await saveData(data);
      await enforceDomain(saved, saved.activityState.domain);
      return { ok: true, budget: saved.settings.totalBudget };
    }
    case 'SAVE_CATEGORY': {
      const id = slug(message.category?.id || message.category?.name);
      const name = String(message.category?.name || '').trim().slice(0, 80);
      const domains = normalizeDomains(message.category?.domains);
      const period = normalizeLimitPeriod(message.category?.period);
      const requestedMinutes = Number(message.category?.minutes);
      if (!id || !name || !domains.length || !Number.isFinite(requestedMinutes) || requestedMinutes <= 0) {
        throw new Error('Enter a category name, at least one website, and a valid limit.');
      }
      const data = await readData();
      const category = {
        id,
        name,
        domains,
        minutes: Math.max(1, Math.min(MAX_LIMIT_MINUTES[period], Math.round(requestedMinutes))),
        period,
        enabled: message.category?.enabled !== false,
        strict: Boolean(message.category?.strict),
        schedule: normalizeSchedule(message.category?.schedule)
      };
      const index = data.settings.categories.findIndex((item) => item.id === id);
      if (index >= 0) data.settings.categories[index] = category;
      else data.settings.categories.push(category);
      delete data.limitAlerts?.[`category:${id}`];
      const saved = await saveData(data);
      await enforceDomain(saved, saved.activityState.domain);
      return { ok: true, category: saved.settings.categories.find((item) => item.id === id) };
    }
    case 'DELETE_CATEGORY': {
      const id = slug(message.id);
      if (!id) throw new Error('Invalid category.');
      const data = await readData();
      data.settings.categories = data.settings.categories.filter((item) => item.id !== id);
      delete data.limitAlerts?.[`category:${id}`];
      await saveData(data);
      return { ok: true };
    }
    case 'SAVE_FOCUS_PRESET': {
      const id = slug(message.preset?.id || message.preset?.name);
      const name = String(message.preset?.name || '').trim().slice(0, 80);
      const minutes = Math.max(1, Math.min(480, Math.round(Number(message.preset?.minutes) || 0)));
      const mode = message.preset?.mode === 'allow' ? 'allow' : 'block';
      const domains = normalizeDomains(message.preset?.domains || message.preset?.blockedDomains);
      if (!id || !name || !minutes) throw new Error('Enter a valid Focus preset.');
      if (mode === 'allow' && !domains.length) throw new Error('Allow-only Focus needs at least one allowed website.');
      const data = await readData();
      const preset = { id, name, minutes, mode, domains };
      const index = data.settings.focusPresets.findIndex((item) => item.id === id);
      if (index >= 0) data.settings.focusPresets[index] = preset;
      else data.settings.focusPresets.push(preset);
      const saved = await saveData(data);
      return { ok: true, preset: saved.settings.focusPresets.find((item) => item.id === id) };
    }
    case 'DELETE_FOCUS_PRESET': {
      const id = slug(message.id);
      if (!id) throw new Error('Invalid Focus preset.');
      const data = await readData();
      data.settings.focusPresets = data.settings.focusPresets.filter((item) => item.id !== id);
      await saveData(data);
      return { ok: true };
    }
    case 'START_FOCUS': {
      const rawDomains = message.domains ?? message.blockedDomains ?? [];
      const domains = normalizeDomains(rawDomains);
      const minutes = Math.max(1, Math.min(480, Number(message.minutes) || 25));
      const mode = message.mode === 'allow' ? 'allow' : 'block';
      const name = String(message.name || 'Focus').trim().slice(0, 80) || 'Focus';
      if (mode === 'allow' && !domains.length) throw new Error('Allow-only Focus needs at least one allowed website.');
      const data = await readData();
      data.focus = createFocusSession(Date.now(), minutes, domains, mode, name);
      const saved = await saveData(data);
      await enforceDomain(saved, saved.activityState.domain);
      return { ok: true, focus: saved.focus };
    }
    case 'STOP_FOCUS': {
      const data = await readData();
      data.focus = null;
      await saveData(data);
      return { ok: true };
    }
    case 'ADD_ALLOWANCE': {
      const domain = normalizeDomain(message.domain || '');
      const minutes = Math.max(1, Math.min(60, Number(message.minutes) || 5));
      if (!domain) throw new Error('Invalid website.');
      const data = await readData();
      const limit = findLimit(data, domain, { enabledOnly: false });
      if (!limit || limit.strict) throw new Error('Extra time is disabled for this limit.');
      addAllowance(data, domain, limit, minutes);
      await saveData(data);
      return { ok: true };
    }
    case 'GET_BLOCK_STATUS': {
      const domain = normalizeDomain(message.domain || '');
      const data = await flushAndRead();
      return {
        ok: true,
        data: {
          domain,
          focusActive: isDomainFocusBlocked(data.focus, domain, Date.now()),
          focus: data.focus,
          totalBudget: totalBudgetView(data),
          categories: matchingCategories(data, domain).map((category) => categoryView(data, category)),
          limit: limitView(data, domain)
        }
      };
    }
    case 'SAVE_SETTINGS': {
      const data = await readData();
      if (message.settings?.idleSeconds !== undefined) {
        data.settings.idleSeconds = Math.max(15, Math.min(600, Number(message.settings.idleSeconds) || 60));
      }
      if (message.settings?.retentionDays !== undefined) {
        data.settings.retentionDays = Math.max(7, Math.min(180, Number(message.settings.retentionDays) || 30));
      }
      if (message.settings?.alerts && typeof message.settings.alerts === 'object') {
        data.settings.alerts ||= { fiveMinutes: true, oneMinute: true, timeout: true };
        for (const key of ['fiveMinutes', 'oneMinute', 'timeout']) {
          if (message.settings.alerts[key] !== undefined) data.settings.alerts[key] = Boolean(message.settings.alerts[key]);
        }
      }
      chrome.idle.setDetectionInterval(data.settings.idleSeconds);
      pruneData(data);
      const settings = (await saveData(data)).settings;
      return { ok: true, settings };
    }
    case 'EXPORT_DATA': {
      const data = await flushAndRead();
      return { ok: true, data };
    }
    case 'IMPORT_DATA': {
      const imported = await backupAndReplaceData(message.data);
      chrome.idle.setDetectionInterval(imported.settings.idleSeconds || 60);
      await reconcile({ resetTimer: true });
      return { ok: true, data: imported };
    }
    case 'CLEAR_DIAGNOSTICS': {
      const data = await readData();
      data.diagnostics = [];
      await saveData(data);
      return { ok: true };
    }
    case 'CLEAR_DATA': {
      const data = await readData();
      data.dailyUsage = {};
      data.sessions = [];
      data.allowances = {};
      data.limitAlerts = {};
      data.focus = null;
      data.activityState = createActivityState({ domain: await activeDomain() });
      await saveData(data);
      return { ok: true };
    }
    default:
      throw new Error('Unknown TimeLens request.');
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  enqueueEvent(async () => {
    const data = await readData();
    chrome.idle.setDetectionInterval(data.settings.idleSeconds || 60);
    await chrome.alarms.create(RECONCILE_ALARM, { periodInMinutes: 0.5 });
    if (details?.reason === 'install') {
      try {
        await chrome.tabs.create({ url: chrome.runtime.getURL(ONBOARDING_PATH) });
      } catch (error) {
        recordDiagnostic(data, 'ONBOARDING_OPEN_FAILED', error);
        await saveData(data);
      }
    }
    await reconcile({ resetTimer: true });
  }, 'INSTALL_HANDLER_FAILED');
});

chrome.runtime.onStartup.addListener(() => {
  enqueueEvent(async () => {
    const data = await readData();
    chrome.idle.setDetectionInterval(data.settings.idleSeconds || 60);
    await chrome.alarms.create(RECONCILE_ALARM, { periodInMinutes: 0.5 });
    await reconcile({ resetTimer: true });
  }, 'STARTUP_HANDLER_FAILED');
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  enqueueEvent(async () => {
    const tab = await chrome.tabs.get(tabId);
    await processActivityEvent({ type: 'ACTIVE_DOMAIN', at: Date.now(), domain: normalizeDomain(tab.url || '') });
  }, 'TAB_ACTIVATION_FAILED');
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (!tab.active || (!changeInfo.url && changeInfo.status !== 'complete')) return;
  enqueueEvent(
    () => processActivityEvent({ type: 'ACTIVE_DOMAIN', at: Date.now(), domain: normalizeDomain(tab.url || '') }),
    'TAB_UPDATE_FAILED'
  );
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  enqueueEvent(async () => {
    const focused = windowId !== chrome.windows.WINDOW_ID_NONE;
    await processActivityEvent({ type: 'FOCUS', at: Date.now(), focused });
    if (focused) {
      await processActivityEvent({ type: 'ACTIVE_DOMAIN', at: Date.now(), domain: await activeDomain() });
    }
  }, 'WINDOW_FOCUS_FAILED');
});

chrome.idle.onStateChanged.addListener((state) => {
  enqueueEvent(
    () => processActivityEvent({ type: 'IDLE', at: Date.now(), idle: state !== 'active' }),
    'IDLE_STATE_FAILED'
  );
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== RECONCILE_ALARM) return;
  enqueueEvent(async () => {
    const now = Date.now();
    const scheduledTime = Number.isFinite(alarm.scheduledTime) ? alarm.scheduledTime : now;
    const delayedBy = Math.max(0, now - scheduledTime);

    if (delayedBy > 90_000) {
      await processActivityEvent({ type: 'FLUSH', at: scheduledTime }, { enforce: false });
      await reconcile({ resetTimer: true });
      return;
    }

    await processActivityEvent({ type: 'FLUSH', at: now });
  }, 'ALARM_RECONCILE_FAILED');
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  enqueue(() => handleMessage(message))
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error?.message || 'TimeLens error' }));
  return true;
});

enqueueEvent(async () => {
  const data = await readData();
  chrome.idle.setDetectionInterval(data.settings.idleSeconds || 60);
  await chrome.alarms.create(RECONCILE_ALARM, { periodInMinutes: 0.5 });
  await reconcile();
}, 'INITIALIZE_FAILED');
