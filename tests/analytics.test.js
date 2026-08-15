import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateSessions } from '../src/core/analytics.js';

test('aggregates session duration by domain', () => {
  const result = aggregateSessions([
    { domain: 'youtube.com', durationMs: 60000 },
    { domain: 'github.com', durationMs: 30000 },
    { domain: 'youtube.com', durationMs: 15000 }
  ]);
  assert.equal(result.totalMs, 105000);
  assert.equal(result.byDomain['youtube.com'], 75000);
  assert.equal(result.byDomain['github.com'], 30000);
});
