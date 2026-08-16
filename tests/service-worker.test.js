import test from 'node:test';
import assert from 'node:assert/strict';

class ChromeEvent {
  constructor() { this.listeners = []; }
  addListener(listener) { this.listeners.push(listener); }
  emit(...args) { for (const listener of [...this.listeners]) listener(...args); }
}

function createChrome() {
  const storage = {};
  const tab = { id: 1, active: true, windowId: 1, url: 'about:blank' };
  const updates = [];
  const notifications = [];
  const sequence = [];
  const createdTabs = [];

  const chrome = {
    storage: {
      local: {
        async get(key) {
          if (Array.isArray(key)) return Object.fromEntries(key.map((item) => [item, storage[item]]));
          return { [key]: storage[key] };
        },
        async set(value) { Object.assign(storage, structuredClone(value)); },
        async getBytesInUse() { return JSON.stringify(storage).length; }
      }
    },
    tabs: {
      onActivated: new ChromeEvent(),
      onUpdated: new ChromeEvent(),
      async query() { return [structuredClone(tab)]; },
      async get() { return structuredClone(tab); },
      async update(id, patch) {
        Object.assign(tab, patch);
        updates.push({ id, patch: structuredClone(patch) });
        if (patch.url?.includes('/src/blocked/blocked.html')) sequence.push('block');
        if (patch.url) this.onUpdated.emit(id, { url: patch.url }, structuredClone(tab));
        return structuredClone(tab);
      },
      async create(options) {
        createdTabs.push(structuredClone(options));
        return { id: createdTabs.length + 1, ...options };
      },
      created: createdTabs
    },
    windows: {
      WINDOW_ID_NONE: -1,
      onFocusChanged: new ChromeEvent(),
      async getAll() { return [{ id: 1, focused: true }]; }
    },
    idle: {
      onStateChanged: new ChromeEvent(),
      state: 'active',
      interval: 60,
      async queryState() { return this.state; },
      setDetectionInterval(value) { this.interval = value; }
    },
    alarms: {
      onAlarm: new ChromeEvent(),
      created: [],
      async create(name, options) { this.created.push({ name, options }); }
    },
    notifications: {
      fail: false,
      async create(id, options) {
        if (this.fail) throw new Error('notifications unavailable');
        notifications.push({ id, options: structuredClone(options) });
        if (String(id).includes('timeout')) sequence.push('notify-timeout');
        return id;
      }
    },
    runtime: {
      onInstalled: new ChromeEvent(),
      onStartup: new ChromeEvent(),
      onMessage: new ChromeEvent(),
      getURL(path) { return `chrome-extension://test-extension/${path}`; }
    }
  };

  return { chrome, tab, updates, notifications, sequence, storage, createdTabs };
}

const originalNow = Date.now;
let clock = new Date(2026, 7, 15, 10, 0, 0).getTime();
Date.now = () => clock;

const fake = createChrome();
globalThis.chrome = fake.chrome;
await import(`../src/background/service-worker.js?test=${Math.random()}`);

function sendMessage(message) {
  const listener = fake.chrome.runtime.onMessage.listeners[0];
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out: ${message.type}`)), 2000);
    listener(message, {}, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

async function snapshot(days = 7) {
  const response = await sendMessage({ type: 'GET_SNAPSHOT', rangeDays: days });
  assert.equal(response.ok, true, response.error);
  return response.data;
}

async function activate(url) {
  fake.tab.url = url;
  fake.chrome.tabs.onActivated.emit({ tabId: fake.tab.id, windowId: fake.tab.windowId });
  await snapshot();
}

async function flush(minutes) {
  clock += minutes * 60_000;
  fake.chrome.alarms.onAlarm.emit({ name: 'timelens-reconcile', scheduledTime: clock });
  return snapshot();
}

test('service worker initializes and returns an empty local snapshot', async () => {
  const data = await snapshot();
  assert.equal(data.todayTotalMs, 0);
  assert.equal(data.focus, null);
  assert.deepEqual(data.limits, []);
  assert.deepEqual(data.settings.alerts, { fiveMinutes: true, oneMinute: true, timeout: true });
  assert.equal(data.health.status, 'healthy');
});

test('delayed alarm after a sleep-like gap does not count the whole gap', async () => {
  await sendMessage({ type: 'CLEAR_DATA' });
  await activate('https://youtube.com/watch?v=test');
  const started = clock;
  clock += 10 * 60_000;

  fake.chrome.alarms.onAlarm.emit({ name: 'timelens-reconcile', scheduledTime: started + 30_000 });
  const data = await snapshot();

  assert.ok(data.todayByDomain['youtube.com'] <= 60_000, `counted ${data.todayByDomain['youtube.com']}ms across a sleep-like gap`);
});

test('daily limit blocks a site and temporary allowance lets it continue', async () => {
  await sendMessage({ type: 'CLEAR_DATA' });
  const limitResponse = await sendMessage({ type: 'SAVE_LIMIT', limit: { domain: 'youtube.com', minutes: 1, strict: false, enabled: true } });
  assert.equal(limitResponse.ok, true);

  await activate('https://youtube.com/watch?v=test');
  const started = clock;
  await flush(1);

  assert.match(fake.tab.url, /^chrome-extension:\/\/test-extension\/src\/blocked\/blocked\.html/);

  const allowance = await sendMessage({ type: 'ADD_ALLOWANCE', domain: 'youtube.com', minutes: 5 });
  assert.equal(allowance.ok, true);
  await activate('https://youtube.com/watch?v=test');
  assert.equal(fake.tab.url, 'https://youtube.com/watch?v=test');
  assert.ok(clock >= started);
});

test('focus mode immediately blocks a selected active domain and can be stopped', async () => {
  await sendMessage({ type: 'CLEAR_DATA' });
  await activate('https://reddit.com/r/productivity');
  const response = await sendMessage({ type: 'START_FOCUS', minutes: 25, blockedDomains: ['reddit.com'] });
  assert.equal(response.ok, true);
  await snapshot();
  assert.match(fake.tab.url, /^chrome-extension:\/\/test-extension\/src\/blocked\/blocked\.html/);

  const stopped = await sendMessage({ type: 'STOP_FOCUS' });
  assert.equal(stopped.ok, true);
  const data = await snapshot();
  assert.equal(data.focus, null);
});

test('strict limits reject temporary allowance', async () => {
  await sendMessage({ type: 'SAVE_LIMIT', limit: { domain: 'example.com', minutes: 1, strict: true, enabled: true } });
  const response = await sendMessage({ type: 'ADD_ALLOWANCE', domain: 'example.com', minutes: 5 });
  assert.equal(response.ok, false);
  assert.match(response.error, /disabled/i);
});

test('clearing usage history keeps limits and preferences', async () => {
  await sendMessage({ type: 'SAVE_LIMIT', limit: { domain: 'news.example.com', minutes: 20, strict: false, enabled: true } });
  await sendMessage({ type: 'SAVE_SETTINGS', settings: { idleSeconds: 120, retentionDays: 90 } });
  await sendMessage({ type: 'CLEAR_DATA' });
  const data = await snapshot();
  assert.ok(data.limits.some((item) => item.domain === 'news.example.com'));
  assert.equal(data.settings.idleSeconds, 120);
  assert.equal(data.settings.retentionDays, 90);
  assert.equal(data.todayTotalMs, 0);
});

test('snapshot calculates weekly and monthly limit usage from daily aggregates', async () => {
  await sendMessage({ type: 'CLEAR_DATA' });
  const data = fake.storage.timelensData;
  data.dailyUsage = {
    '2026-08-01': { 'monthly.example.com': 25 * 60_000 },
    '2026-08-10': { 'weekly.example.com': 30 * 60_000, 'monthly.example.com': 35 * 60_000 },
    '2026-08-15': { 'weekly.example.com': 40 * 60_000, 'monthly.example.com': 45 * 60_000 }
  };

  await sendMessage({ type: 'SAVE_LIMIT', limit: { domain: 'weekly.example.com', minutes: 120, period: 'weekly', strict: true, enabled: true } });
  await sendMessage({ type: 'SAVE_LIMIT', limit: { domain: 'monthly.example.com', minutes: 240, period: 'monthly', strict: true, enabled: true } });

  const view = await snapshot();
  const weekly = view.limits.find((item) => item.domain === 'weekly.example.com');
  const monthly = view.limits.find((item) => item.domain === 'monthly.example.com');

  assert.equal(weekly.period, 'weekly');
  assert.equal(weekly.usedMs, 70 * 60_000);
  assert.equal(monthly.period, 'monthly');
  assert.equal(monthly.usedMs, 105 * 60_000);
});

test('limit alerts fire once at five minutes, one minute, then timeout', async () => {
  await sendMessage({ type: 'CLEAR_DATA' });
  fake.notifications.length = 0;
  fake.sequence.length = 0;
  await sendMessage({ type: 'SAVE_LIMIT', limit: { domain: 'youtube.com', minutes: 10, period: 'daily', strict: true, enabled: true } });
  await activate('https://youtube.com/watch?v=alerts');

  await flush(5);
  assert.equal(fake.notifications.length, 1);
  assert.match(fake.notifications[0].options.message, /5 minutes/i);

  await flush(0.5);
  assert.equal(fake.notifications.length, 1, '5-minute warning should not repeat');

  await flush(3.5);
  assert.equal(fake.notifications.length, 2);
  assert.match(fake.notifications[1].options.message, /1 minute/i);

  await flush(1);
  assert.equal(fake.notifications.length, 3);
  assert.match(fake.notifications[2].options.message, /don.t waste your time/i);
  assert.match(fake.tab.url, /^chrome-extension:\/\/test-extension\/src\/blocked\/blocked\.html/);
  assert.ok(fake.sequence.indexOf('notify-timeout') < fake.sequence.indexOf('block'), 'timeout notification must be created before blocking');
});

test('notification failure never prevents timeout blocking and records a diagnostic', async () => {
  await sendMessage({ type: 'CLEAR_DATA' });
  await sendMessage({ type: 'SAVE_LIMIT', limit: { domain: 'failure.example.com', minutes: 1, period: 'daily', strict: true, enabled: true } });
  fake.chrome.notifications.fail = true;
  await activate('https://failure.example.com/page');
  await flush(1);
  fake.chrome.notifications.fail = false;

  assert.match(fake.tab.url, /^chrome-extension:\/\/test-extension\/src\/blocked\/blocked\.html/);
  const data = await snapshot();
  assert.ok(data.health.diagnosticCount >= 1);
});

test('alert preferences suppress warnings without disabling enforcement', async () => {
  await sendMessage({ type: 'CLEAR_DATA' });
  fake.notifications.length = 0;
  await sendMessage({ type: 'SAVE_SETTINGS', settings: { alerts: { fiveMinutes: false, oneMinute: false, timeout: false } } });
  await sendMessage({ type: 'SAVE_LIMIT', limit: { domain: 'quiet.example.com', minutes: 1, period: 'daily', strict: true, enabled: true } });
  await activate('https://quiet.example.com');
  await flush(1);

  assert.equal(fake.notifications.length, 0);
  assert.match(fake.tab.url, /^chrome-extension:\/\/test-extension\/src\/blocked\/blocked\.html/);
});

test('weekly extra time is shared inside a week and resets on Monday', async () => {
  await sendMessage({ type: 'CLEAR_DATA' });
  clock = new Date(2026, 7, 14, 12).getTime();
  await sendMessage({ type: 'SAVE_LIMIT', limit: { domain: 'weekly-allowance.example.com', minutes: 1, period: 'weekly', strict: false, enabled: true } });
  const added = await sendMessage({ type: 'ADD_ALLOWANCE', domain: 'weekly-allowance.example.com', minutes: 5 });
  assert.equal(added.ok, true);
  let data = await snapshot();
  let limit = data.limits.find((item) => item.domain === 'weekly-allowance.example.com');
  assert.equal(limit.allowanceMs, 5 * 60_000);

  clock = new Date(2026, 7, 17, 12).getTime();
  data = await snapshot();
  limit = data.limits.find((item) => item.domain === 'weekly-allowance.example.com');
  assert.equal(limit.allowanceMs, 0);
});

test('import replaces data only after saving a local backup', async () => {
  await sendMessage({ type: 'CLEAR_DATA' });
  await sendMessage({ type: 'SAVE_LIMIT', limit: { domain: 'before.example.com', minutes: 20, enabled: true } });
  const imported = {
    version: 2,
    settings: { limits: [{ domain: 'after.example.com', minutes: 30, period: 'daily', enabled: true, strict: false }] },
    dailyUsage: {},
    sessions: []
  };
  const response = await sendMessage({ type: 'IMPORT_DATA', data: imported });
  assert.equal(response.ok, true, response.error);
  const data = await snapshot();
  assert.ok(data.limits.some((item) => item.domain === 'after.example.com'));
  assert.ok(fake.storage.timelensBackup.settings.limits.some((item) => item.domain === 'before.example.com'));
});

test('limits can be paused and resumed without deleting them', async () => {
  await sendMessage({ type: 'SAVE_LIMIT', limit: { domain: 'toggle.example.com', minutes: 30, enabled: true } });
  let response = await sendMessage({ type: 'TOGGLE_LIMIT', domain: 'toggle.example.com', enabled: false });
  assert.equal(response.ok, true, response.error);
  let data = await snapshot();
  assert.equal(data.limits.find((item) => item.domain === 'toggle.example.com').enabled, false);

  response = await sendMessage({ type: 'TOGGLE_LIMIT', domain: 'toggle.example.com', enabled: true });
  assert.equal(response.ok, true, response.error);
  data = await snapshot();
  assert.equal(data.limits.find((item) => item.domain === 'toggle.example.com').enabled, true);
});

test('fresh install opens onboarding while extension updates do not', async () => {
  fake.createdTabs.length = 0;
  fake.chrome.runtime.onInstalled.emit({ reason: 'install' });
  await snapshot();
  assert.equal(fake.createdTabs.length, 1);
  assert.match(fake.createdTabs[0].url, /src\/onboarding\/onboarding\.html$/);

  fake.chrome.runtime.onInstalled.emit({ reason: 'update' });
  await snapshot();
  assert.equal(fake.createdTabs.length, 1);
});

test.after(() => {
  Date.now = originalNow;
  delete globalThis.chrome;
});
