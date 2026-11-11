import test from 'node:test';
import assert from 'node:assert/strict';

const { trackState } = await import('../../src/core/track-state.js');

test('trackState stays On Track without active boundaries', () => {
  assert.deepEqual(trackState(null), { label: 'On Track', tone: 'ok' });
  assert.deepEqual(trackState({ totalBudget: { enabled: false }, limits: [], currentDomain: 'x.com' }), { label: 'On Track', tone: 'ok' });
});

test('trackState reports reached boundaries first', () => {
  const snapshot = {
    currentDomain: 'youtube.com',
    totalBudget: { enabled: false },
    limits: [{ domain: 'youtube.com', enabled: true, effectiveMs: 100_000, remainingMs: 0, reached: true }]
  };
  assert.deepEqual(trackState(snapshot), { label: 'Limit reached', tone: 'reached' });
});

test('trackState warns when the tightest active boundary is nearly spent', () => {
  const snapshot = {
    currentDomain: 'youtube.com',
    totalBudget: { enabled: true, effectiveMs: 1_000_000, remainingMs: 100_000, reached: false },
    limits: []
  };
  assert.deepEqual(trackState(snapshot), { label: 'Almost up', tone: 'warn' });
});

test('trackState ignores paused, scheduled-off, and other-domain limits', () => {
  const base = {
    currentDomain: 'youtube.com',
    totalBudget: { enabled: false },
    limits: [
      { domain: 'youtube.com', enabled: false, effectiveMs: 10, remainingMs: 0, reached: false },
      { domain: 'youtube.com', enabled: true, scheduleActive: false, effectiveMs: 10, remainingMs: 0, reached: false },
      { domain: 'reddit.com', enabled: true, effectiveMs: 10, remainingMs: 1, reached: false }
    ]
  };
  assert.deepEqual(trackState(base), { label: 'On Track', tone: 'ok' });
});
