import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, recentDayKeys } from '../src/core/time.js';

test('formats compact durations for the UI', () => {
  assert.equal(formatDuration(30 * 60000, true), '30m');
  assert.equal(formatDuration(90 * 60000, true), '1h 30m');
});

test('returns requested number of recent local day keys', () => {
  const keys = recentDayKeys(3, new Date(2026, 7, 15, 12).getTime());
  assert.deepEqual(keys, ['2026-08-15', '2026-08-14', '2026-08-13']);
});

import { splitSessionByDay } from '../src/core/time.js';

test('splits a session that crosses local midnight', () => {
  const start = new Date(2026, 7, 15, 23, 59, 30).getTime();
  const end = new Date(2026, 7, 16, 0, 0, 30).getTime();
  const parts = splitSessionByDay({ domain: 'youtube.com', start, end, durationMs: end - start });
  assert.equal(parts.length, 2);
  assert.equal(parts[0].durationMs, 30_000);
  assert.equal(parts[1].durationMs, 30_000);
  assert.equal(parts[0].day, '2026-08-15');
  assert.equal(parts[1].day, '2026-08-16');
});
