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

  const chrome = {
    storage: {
      local: {
        async get(key) { return { [key]: storage[key] }; },
        async set(value) { Object.assign(storage, structuredClone(value)); }
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
        if (patch.url) this.onUpdated.emit(id, { url: patch.url }, structuredClone(tab));
        return structuredClone(tab);
      },
      async create() { return null; }
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
    runtime: {
      onInstalled: new ChromeEvent(),
      onStartup: new ChromeEvent(),
      onMessage: new ChromeEvent(),
      getURL(path) { return `chrome-extension://test-extension/${path}`; }
    }
  };

  return { chrome, tab, updates, storage };
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

test('service worker initializes and returns an empty local snapshot', async () => {
  const data = await snapshot();
  assert.equal(data.todayTotalMs, 0);
  assert.equal(data.focus, null);
  assert.deepEqual(data.limits, []);
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
  clock += 60_000;
  fake.chrome.alarms.onAlarm.emit({ name: 'timelens-reconcile', scheduledTime: clock });
  await snapshot();

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

test.after(() => {
  Date.now = originalNow;
  delete globalThis.chrome;
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
