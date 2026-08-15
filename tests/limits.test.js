import test from 'node:test';
import assert from 'node:assert/strict';
import { getLimitStatus, shouldBlockDomain } from '../src/core/limits.js';

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
