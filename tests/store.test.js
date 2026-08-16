import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addAllowance,
  addCompletedSessions,
  backupAndReplaceData,
  defaultData,
  getAllowanceMs,
  pruneData,
  recordDiagnostic
} from '../src/background/store.js';
import { dayKey } from '../src/core/time.js';

function limit(period = 'daily') {
  return { domain: 'youtube.com', minutes: 60, period, enabled: true, strict: false };
}

test('default store starts with schema v4 focus assistant settings', () => {
  const data = defaultData();
  assert.equal(data.version, 4);
  assert.deepEqual(data.settings.totalBudget, { enabled: false, minutes: 300, mode: 'warn' });
  assert.deepEqual(data.settings.categories, []);
  assert.equal(data.settings.focusPresets.length, 3);
});

test('completed sessions update daily totals and keep one raw session record', () => {
  const data = defaultData();
  const start = new Date(2026, 7, 15, 23, 59, 30).getTime();
  const end = new Date(2026, 7, 16, 0, 0, 30).getTime();
  addCompletedSessions(data, [{ domain: 'youtube.com', start, end, durationMs: end - start }]);

  assert.equal(data.dailyUsage['2026-08-15']['youtube.com'], 30_000);
  assert.equal(data.dailyUsage['2026-08-16']['youtube.com'], 30_000);
  assert.equal(data.sessions.length, 1);
  assert.equal(data.sessions[0].durationMs, 60_000);
});

test('allowance is scoped to the active website limit period', () => {
  const data = defaultData();
  const friday = new Date(2026, 7, 14, 12).getTime();
  const saturday = new Date(2026, 7, 15, 12).getTime();
  const monday = new Date(2026, 7, 17, 12).getTime();

  addAllowance(data, 'youtube.com', limit('weekly'), 5, friday);
  addAllowance(data, 'youtube.com', limit('weekly'), 10, saturday);
  assert.equal(getAllowanceMs(data, 'youtube.com', limit('weekly'), saturday), 15 * 60_000);
  assert.equal(getAllowanceMs(data, 'youtube.com', limit('weekly'), monday), 0);
  assert.equal(getAllowanceMs(data, 'reddit.com', limit('weekly'), saturday), 0);
});

test('diagnostics are local, sanitized, and capped at fifty entries', () => {
  const data = defaultData();
  for (let index = 0; index < 70; index += 1) {
    recordDiagnostic(data, 'TEST_FAILURE', new Error(`failure ${index}`), index);
  }
  assert.equal(data.diagnostics.length, 50);
  assert.equal(data.diagnostics[0].message, 'failure 20');
  assert.equal(data.diagnostics.at(-1).code, 'TEST_FAILURE');
});

test('backupAndReplaceData saves current live data before a validated import', async () => {
  const originalChrome = globalThis.chrome;
  const storage = {};
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) { return { [key]: storage[key] }; },
        async set(value) { Object.assign(storage, structuredClone(value)); }
      }
    }
  };

  try {
    const current = defaultData();
    current.dailyUsage['2026-08-15'] = { 'youtube.com': 1000 };
    storage.timelensData = current;

    const imported = defaultData();
    imported.settings.totalBudget = { enabled: true, minutes: 240, mode: 'block' };
    imported.settings.categories = [{ id: 'social', name: 'Social', domains: ['reddit.com'], minutes: 60, period: 'daily', enabled: true, strict: false, schedule: { enabled: false, days: [0,1,2,3,4,5,6], startMinute: 0, endMinute: 1439 } }];
    imported.dailyUsage['2026-08-16'] = { 'reddit.com': 2000 };
    const saved = await backupAndReplaceData(imported);

    assert.equal(saved.dailyUsage['2026-08-16']['reddit.com'], 2000);
    assert.equal(saved.settings.totalBudget.mode, 'block');
    assert.equal(saved.settings.categories[0].id, 'social');
    assert.equal(storage.timelensBackup.dailyUsage['2026-08-15']['youtube.com'], 1000);
    assert.equal(storage.timelensData.dailyUsage['2026-08-16']['reddit.com'], 2000);
  } finally {
    globalThis.chrome = originalChrome;
  }
});

test('pruning removes expired detailed sessions but keeps recent data and valid period allowances', () => {
  const data = defaultData();
  data.settings.retentionDays = 7;
  data.settings.aggregateRetentionDays = 30;
  const now = new Date(2026, 7, 15, 12).getTime();
  data.sessions = [
    { domain: 'old.com', end: now - 8 * 86_400_000 },
    { domain: 'new.com', end: now - 2 * 86_400_000 }
  ];
  data.dailyUsage['2026-06-01'] = { 'old.com': 1000 };
  data.dailyUsage[dayKey(now)] = { 'new.com': 1000 };
  data.allowances['weekly:2026-08-10'] = { 'youtube.com': 1000 };
  data.allowances['daily:2026-01-01'] = { 'old.com': 1000 };

  pruneData(data, now);
  assert.deepEqual(data.sessions.map((s) => s.domain), ['new.com']);
  assert.equal(data.dailyUsage['2026-06-01'], undefined);
  assert.equal(data.dailyUsage[dayKey(now)]['new.com'], 1000);
  assert.equal(data.allowances['weekly:2026-08-10']['youtube.com'], 1000);
  assert.equal(data.allowances['daily:2026-01-01'], undefined);
});
