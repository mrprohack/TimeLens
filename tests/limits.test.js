import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLimitStatus,
  limitDayKeys,
  limitPeriodKey,
  nextLimitAlert,
  normalizeLimitPeriod,
  shouldBlockDomain,
  usageForLimit
} from '../src/core/limits.js';

test('reports progress and blocks at the daily limit', () => {
  const limit = { domain: 'youtube.com', minutes: 60, enabled: true, strict: true };
  assert.equal(getLimitStatus(limit, 30 * 60000).ratio, 0.5);
  assert.equal(shouldBlockDomain(limit, 60 * 60000, 0), true);
});

test('temporary allowance prevents blocking until it is consumed', () => {
  const limit = { domain: 'youtube.com', minutes: 60, enabled: true, strict: false };
  assert.equal(shouldBlockDomain(limit, 65 * 60000, 10 * 60000), false);
  assert.equal(shouldBlockDomain(limit, 71 * 60000, 10 * 60000), true);
});

test('missing or invalid period remains backward-compatible as daily', () => {
  assert.equal(normalizeLimitPeriod(undefined), 'daily');
  assert.equal(normalizeLimitPeriod(''), 'daily');
  assert.equal(normalizeLimitPeriod('yearly'), 'daily');
  assert.equal(normalizeLimitPeriod('weekly'), 'weekly');
  assert.equal(normalizeLimitPeriod('monthly'), 'monthly');
});

test('weekly limit starts on local Monday and monthly limit starts on day one', () => {
  const sunday = new Date(2026, 7, 16, 14, 0, 0).getTime();
  assert.equal(limitPeriodKey('daily', sunday), 'daily:2026-08-16');
  assert.equal(limitPeriodKey('weekly', sunday), 'weekly:2026-08-10');
  assert.equal(limitPeriodKey('monthly', sunday), 'monthly:2026-08');

  assert.deepEqual(limitDayKeys('weekly', sunday), [
    '2026-08-10',
    '2026-08-11',
    '2026-08-12',
    '2026-08-13',
    '2026-08-14',
    '2026-08-15',
    '2026-08-16'
  ]);
  assert.equal(limitDayKeys('monthly', sunday)[0], '2026-08-01');
  assert.equal(limitDayKeys('monthly', sunday).at(-1), '2026-08-16');
});

test('usageForLimit sums only the configured local period', () => {
  const now = new Date(2026, 7, 16, 14, 0, 0).getTime();
  const dailyUsage = {
    '2026-07-31': { 'youtube.com': 99 * 60_000 },
    '2026-08-01': { 'youtube.com': 10 * 60_000 },
    '2026-08-09': { 'youtube.com': 20 * 60_000 },
    '2026-08-10': { 'youtube.com': 30 * 60_000 },
    '2026-08-15': { 'youtube.com': 40 * 60_000 },
    '2026-08-16': { 'youtube.com': 50 * 60_000, 'reddit.com': 500 * 60_000 }
  };

  assert.equal(usageForLimit(dailyUsage, 'youtube.com', { period: 'daily' }, now), 50 * 60_000);
  assert.equal(usageForLimit(dailyUsage, 'youtube.com', { period: 'weekly' }, now), 120 * 60_000);
  assert.equal(usageForLimit(dailyUsage, 'youtube.com', { period: 'monthly' }, now), 150 * 60_000);
});

test('alert decision sends only the most urgent unsent threshold', () => {
  const limit = { minutes: 60, enabled: true };

  const fiveMinuteStatus = getLimitStatus(limit, 55.5 * 60_000);
  assert.equal(nextLimitAlert(fiveMinuteStatus, []), '5m');
  assert.equal(nextLimitAlert(fiveMinuteStatus, ['5m']), null);

  const oneMinuteStatus = getLimitStatus(limit, 59.25 * 60_000);
  assert.equal(nextLimitAlert(oneMinuteStatus, []), '1m');
  assert.equal(nextLimitAlert(oneMinuteStatus, ['5m']), '1m');
  assert.equal(nextLimitAlert(oneMinuteStatus, ['1m']), null);

  const timedOut = getLimitStatus(limit, 60 * 60_000);
  assert.equal(nextLimitAlert(timedOut, []), 'timeout');
  assert.equal(nextLimitAlert(timedOut, ['5m', '1m']), 'timeout');
  assert.equal(nextLimitAlert(timedOut, ['timeout']), null);
});
