import test from 'node:test';
import assert from 'node:assert/strict';
import { addAllowance, addCompletedSessions, defaultData, getAllowanceMs, pruneData } from '../src/background/store.js';
import { dayKey } from '../src/core/time.js';

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

test('allowance is scoped to a website and local day', () => {
  const data = defaultData();
  const now = new Date(2026, 7, 15, 12).getTime();
  addAllowance(data, 'youtube.com', 5, now);
  addAllowance(data, 'youtube.com', 10, now);
  assert.equal(getAllowanceMs(data, 'youtube.com', now), 15 * 60_000);
  assert.equal(getAllowanceMs(data, 'reddit.com', now), 0);
});

test('pruning removes expired detailed sessions but keeps recent data', () => {
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

  pruneData(data, now);
  assert.deepEqual(data.sessions.map((s) => s.domain), ['new.com']);
  assert.equal(data.dailyUsage['2026-06-01'], undefined);
  assert.equal(data.dailyUsage[dayKey(now)]['new.com'], 1000);
});
