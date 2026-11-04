import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POPUP_CACHE_MAX_AGE_MS,
  readCachedSnapshot,
  slimSnapshot,
  writeCachedSnapshot
} from '../../src/shared/snapshot-cache.js';

const NOW = new Date(2026, 7, 15, 10, 0, 0).getTime();

function fullSnapshot(overrides = {}) {
  return {
    now: NOW,
    todayTotalMs: 5_400_000,
    todayTop: [{ domain: 'youtube.com', durationMs: 3_600_000, extra: 'x' }, { domain: 'github.com', durationMs: 1_800_000 }],
    currentDomain: 'youtube.com',
    currentDomainMs: 3_600_000,
    focus: { name: 'Deep work', endsAt: NOW + 600_000, domains: ['reddit.com'], mode: 'block' },
    limits: [{ domain: 'youtube.com', enabled: true, period: 'daily', effectiveMs: 3_600_000, remainingMs: 0, reached: true, scheduleActive: true, minutes: 60, schedule: { enabled: false } }],
    totalBudget: { enabled: true, effectiveMs: 18_000_000, remainingMs: 9_000_000, reached: false, mode: 'warn', minutes: 300 },
    sessions: [{ domain: 'secret.example', start: 1, end: 2 }],
    settings: { limits: [], categories: [] },
    categories: [{ name: 'Social' }],
    health: { storageBytesApprox: 12345 },
    ...overrides
  };
}

function fakeStorage(initial = {}) {
  const store = { ...initial };
  return {
    store,
    async get(key) { return { [key]: store[key] }; },
    async set(value) { Object.assign(store, structuredClone(value)); }
  };
}

test('slimSnapshot keeps only what the popup renders and drops history and settings', () => {
  const slim = slimSnapshot(fullSnapshot());
  assert.deepEqual(Object.keys(slim).sort(), ['currentDomain', 'currentDomainMs', 'focus', 'limits', 'todayTop', 'todayTotalMs', 'totalBudget']);
  assert.deepEqual(slim.todayTop[0], { domain: 'youtube.com', durationMs: 3_600_000 });
  assert.deepEqual(slim.focus, { name: 'Deep work', endsAt: NOW + 600_000 });
  assert.deepEqual(slim.limits[0], { domain: 'youtube.com', enabled: true, period: 'daily', effectiveMs: 3_600_000, remainingMs: 0, reached: true, scheduleActive: true });
  assert.deepEqual(slim.totalBudget, { enabled: true, effectiveMs: 18_000_000, remainingMs: 9_000_000, reached: false });
  assert.doesNotMatch(JSON.stringify(slim), /secret\.example/);
});

test('slimSnapshot tolerates missing or malformed snapshots', () => {
  assert.equal(slimSnapshot(null), null);
  assert.equal(slimSnapshot('nope'), null);
  const slim = slimSnapshot({ todayTotalMs: 'abc', todayTop: 'x', limits: null, focus: { endsAt: 'soon' } });
  assert.equal(slim.todayTotalMs, 0);
  assert.deepEqual(slim.todayTop, []);
  assert.deepEqual(slim.limits, []);
  assert.equal(slim.focus, null);
  assert.equal(slim.currentDomain, null);
});

test('a cached snapshot round-trips and is reused within the freshness window', async () => {
  const storage = fakeStorage();
  await writeCachedSnapshot(fullSnapshot(), { storage, now: NOW });
  const cached = await readCachedSnapshot({ storage, now: NOW + 60_000 });
  assert.equal(cached.todayTotalMs, 5_400_000);
  assert.equal(cached.currentDomain, 'youtube.com');
  assert.equal(cached.focus.endsAt, NOW + 600_000);
});

test('a cached snapshot is never reused when it is old, from another day, or malformed', async () => {
  const storage = fakeStorage();
  await writeCachedSnapshot(fullSnapshot(), { storage, now: NOW });
  assert.equal(await readCachedSnapshot({ storage, now: NOW + POPUP_CACHE_MAX_AGE_MS + 1 }), null, 'too old');

  const lateNight = new Date(2026, 7, 15, 23, 59, 0).getTime();
  const lateStorage = fakeStorage();
  await writeCachedSnapshot(fullSnapshot(), { storage: lateStorage, now: lateNight });
  assert.equal(await readCachedSnapshot({ storage: lateStorage, now: lateNight + 2 * 60_000 }), null, 'crossed local midnight');

  assert.equal(await readCachedSnapshot({ storage: fakeStorage() }), null, 'empty');
  assert.equal(await readCachedSnapshot({ storage: fakeStorage({ timelensPopupSnapshot: { savedAt: NOW, snapshot: 'bad' } }), now: NOW }), null, 'malformed');
  assert.equal(await readCachedSnapshot({ storage: undefined }), null, 'no storage API');
});

test('a Focus session that has already ended is dropped from the cached snapshot', async () => {
  const storage = fakeStorage();
  await writeCachedSnapshot(fullSnapshot(), { storage, now: NOW });
  const cached = await readCachedSnapshot({ storage, now: NOW + 601_000 });
  assert.equal(cached.focus, null);
});

test('storage failures never throw into the popup', async () => {
  const broken = { async get() { throw new Error('boom'); }, async set() { throw new Error('boom'); } };
  assert.equal(await readCachedSnapshot({ storage: broken, now: NOW }), null);
  await assert.doesNotReject(() => writeCachedSnapshot(fullSnapshot(), { storage: broken, now: NOW }));
});
