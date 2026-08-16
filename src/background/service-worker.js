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
import { createFocusSession, isDomainFocusBlocked, isFocusActive } from '../core/focus.js';
import { dayKey, recentDayKeys } from '../core/time.js';
import {
  addAllowance,
  addCompletedSessions,
  getAllowanceMs,
  getLimitAlertState,
  markLimitAlertSent,
  pruneData,
  readData,
  saveData
} from './store.js';

const RECONCILE_ALARM = 'timelens-reconcile';
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

async function activeTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tabs[0] || null;
}

async function activeDomain() {
  const tab = await activeTab();
  return normalizeDomain(tab?.url || null);
}

function findLimit(data, domain) {
  return data.settings.limits.find((item) => item.domain === domain && item.enabled);
}

function periodName(period) {
  const normalized = normalizeLimitPeriod(period);
  return normalized === 'daily' ? 'daily' : normalized === 'weekly' ? 'weekly' : 'monthly';
}

async function showLimitNotification(domain, limit, alert) {
  const period = periodName(limit.period);
  const content = alert === '5m'
    ? { title: '5 minutes left', message: `${domain} has 5 minutes left on its ${period} limit.`, requireInteraction: false }
    : alert === '1m'
      ? { title: '1 minute left', message: `${domain} has 1 minute left on its ${period} limit. Finish up now.`, requireInteraction: false }
      : { title: 'TimeLens · Time’s up', message: `Time’s up — don’t waste your time. ${domain} reached its ${period} limit.`, requireInteraction: true };

  await chrome.notifications.create(`timelens-limit-${alert}-${domain}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: content.title,
    message: content.message,
    priority: alert === 'timeout' ? 2 : 1,
    requireInteraction: content.requireInteraction
  });
}

async function maybeAlertLimit(data, domain, limit, status, now) {
  const periodKey = limitPeriodKey(limit.period, now);
  const alertState = getLimitAlertState(data, domain, periodKey);
  const alert = nextLimitAlert(status, alertState.sent);
  if (!alert) return null;

  await showLimitNotification(domain, limit, alert);
  markLimitAlertSent(data, domain, periodKey, alert);
  await saveData(data);
  return alert;
}

async function navigateToBlocked(domain, reason) {
  const tab = await activeTab();
  if (!tab?.id || normalizeDomain(tab.url || '') !== domain) return;
  const url = new URL(chrome.runtime.getURL('src/blocked/blocked.html'));
  url.searchParams.set('domain', domain);
  url.searchParams.set('reason', reason);
  if (tab.url) url.searchParams.set('returnUrl', tab.url);
  await chrome.tabs.update(tab.id, { url: url.toString() });
}

async function enforceDomain(data, domain, now = Date.now()) {
  if (!domain) return;

  if (isDomainFocusBlocked(data.focus, domain, now)) {
    await navigateToBlocked(domain, 'focus');
    return;
  }

  const limit = findLimit(data, domain);
  if (!limit) return;
  const usedMs = usageForLimit(data.dailyUsage, domain, limit, now);
  const allowanceMs = getAllowanceMs(data, domain, now);
  const status = getLimitStatus(limit, usedMs, allowanceMs);

  await maybeAlertLimit(data, domain, limit, status, now);
  if (shouldBlockDomain(limit, usedMs, allowanceMs)) {
    await navigateToBlocked(domain, 'limit');
  }
}

async function processActivityEvent(event, { enforce = true } = {}) {
  const data = await readData();
  const result = transitionActivity(data.activityState, event);
  data.activityState = result.state;
  addCompletedSessions(data, result.completed);
  pruneData(data, event.at || Date.now());
  if (data.focus && !isFocusActive(data.focus, event.at || Date.now())) data.focus = null;
  await saveData(data);
  if (enforce) await enforceDomain(data, data.activityState.domain, event.at || Date.now());
  return data;
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
  await saveData(data);
  await enforceDomain(data, domain, now);
}

async function flushAndRead() {
  await processActivityEvent({ type: 'FLUSH', at: Date.now() }, { enforce: false });
  return readData();
}

function limitView(data, domain, now = Date.now()) {
  const limit = findLimit(data, domain);
  if (!limit) return null;
  const period = normalizeLimitPeriod(limit.period);
  const usedMs = usageForLimit(data.dailyUsage, domain, limit, now);
  const allowanceMs = getAllowanceMs(data, domain, now);
  return {
    ...limit,
    period,
    periodKey: limitPeriodKey(period, now),
    ...getLimitStatus(limit, usedMs, allowanceMs),
    allowanceMs
  };
}

function snapshotFromData(data, rangeDays = 7, now = Date.now()) {
  const keys = recentDayKeys(Math.min(30, Math.max(1, Number(rangeDays) || 7)), now);
  const today = keys[0];
  const todayByDomain = data.dailyUsage[today] || {};
  const todayTotalMs = Object.values(todayByDomain).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const range = rangeTotal(data.dailyUsage, keys);
  const limits = data.settings.limits.map((limit) => {
    const period = normalizeLimitPeriod(limit.period);
    const usedMs = usageForLimit(data.dailyUsage, limit.domain, limit, now);
    const allowanceMs = getAllowanceMs(data, limit.domain, now);
    return {
      ...limit,
      period,
      periodKey: limitPeriodKey(period, now),
      ...getLimitStatus(limit, usedMs, allowanceMs),
      allowanceMs
    };
  });

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
    sessions: [...data.sessions].sort((a, b) => b.end - a.end).slice(0, 80),
    settings: data.settings
  };
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
        strict: Boolean(message.limit?.strict)
      };
      const index = data.settings.limits.findIndex((item) => item.domain === domain);
      if (index >= 0) data.settings.limits[index] = limit;
      else data.settings.limits.push(limit);
      delete data.limitAlerts?.[domain];
      await saveData(data);
      await enforceDomain(data, data.activityState.domain);
      return { ok: true, limit };
    }
    case 'DELETE_LIMIT': {
      const domain = normalizeDomain(message.domain || '');
      const data = await readData();
      data.settings.limits = data.settings.limits.filter((item) => item.domain !== domain);
      delete data.limitAlerts?.[domain];
      await saveData(data);
      return { ok: true };
    }
    case 'START_FOCUS': {
      const domains = (message.blockedDomains || []).map((value) => normalizeDomain(value)).filter(Boolean);
      const minutes = Math.max(1, Math.min(480, Number(message.minutes) || 25));
      const data = await readData();
      data.focus = createFocusSession(Date.now(), minutes, domains);
      await saveData(data);
      await enforceDomain(data, data.activityState.domain);
      return { ok: true, focus: data.focus };
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
      const limit = findLimit(data, domain);
      if (!limit || limit.strict) throw new Error('Extra time is disabled for this limit.');
      addAllowance(data, domain, minutes);
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
          limit: limitView(data, domain)
        }
      };
    }
    case 'SAVE_SETTINGS': {
      const data = await readData();
      if (message.settings?.idleSeconds) data.settings.idleSeconds = Math.max(15, Math.min(600, Number(message.settings.idleSeconds)));
      if (message.settings?.retentionDays) data.settings.retentionDays = Math.max(7, Math.min(180, Number(message.settings.retentionDays)));
      chrome.idle.setDetectionInterval(data.settings.idleSeconds);
      pruneData(data);
      await saveData(data);
      return { ok: true, settings: data.settings };
    }
    case 'EXPORT_DATA': {
      const data = await flushAndRead();
      return { ok: true, data };
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

chrome.runtime.onInstalled.addListener(() => {
  enqueue(async () => {
    const data = await readData();
    chrome.idle.setDetectionInterval(data.settings.idleSeconds || 60);
    await chrome.alarms.create(RECONCILE_ALARM, { periodInMinutes: 0.5 });
    await reconcile({ resetTimer: true });
  });
});

chrome.runtime.onStartup.addListener(() => {
  enqueue(async () => {
    const data = await readData();
    chrome.idle.setDetectionInterval(data.settings.idleSeconds || 60);
    await chrome.alarms.create(RECONCILE_ALARM, { periodInMinutes: 0.5 });
    await reconcile({ resetTimer: true });
  });
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  enqueue(async () => {
    const tab = await chrome.tabs.get(tabId);
    await processActivityEvent({ type: 'ACTIVE_DOMAIN', at: Date.now(), domain: normalizeDomain(tab.url || '') });
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.active || (!changeInfo.url && changeInfo.status !== 'complete')) return;
  enqueue(() => processActivityEvent({ type: 'ACTIVE_DOMAIN', at: Date.now(), domain: normalizeDomain(tab.url || '') }));
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  enqueue(async () => {
    const focused = windowId !== chrome.windows.WINDOW_ID_NONE;
    await processActivityEvent({ type: 'FOCUS', at: Date.now(), focused });
    if (focused) {
      await processActivityEvent({ type: 'ACTIVE_DOMAIN', at: Date.now(), domain: await activeDomain() });
    }
  });
});

chrome.idle.onStateChanged.addListener((state) => {
  enqueue(() => processActivityEvent({ type: 'IDLE', at: Date.now(), idle: state !== 'active' }));
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== RECONCILE_ALARM) return;
  enqueue(async () => {
    const now = Date.now();
    const scheduledTime = Number.isFinite(alarm.scheduledTime) ? alarm.scheduledTime : now;
    const delayedBy = Math.max(0, now - scheduledTime);

    // A repeating alarm that fires very late usually means the device slept.
    // Count only up to the missed alarm boundary, discard the sleep gap, then
    // rebuild focus/idle/tab state at the current time.
    if (delayedBy > 90_000) {
      await processActivityEvent({ type: 'FLUSH', at: scheduledTime }, { enforce: false });
      await reconcile({ resetTimer: true });
      return;
    }

    await processActivityEvent({ type: 'FLUSH', at: now });
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  enqueue(() => handleMessage(message))
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error?.message || 'TimeLens error' }));
  return true;
});

enqueue(async () => {
  const data = await readData();
  chrome.idle.setDetectionInterval(data.settings.idleSeconds || 60);
  await chrome.alarms.create(RECONCILE_ALARM, { periodInMinutes: 0.5 });
  await reconcile();
});
