import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivityState, transitionActivity } from '../src/core/activity.js';

const evt = (type, at, extra = {}) => ({ type, at, ...extra });

test('records elapsed time when switching active domains', () => {
  let state = createActivityState();
  ({ state } = transitionActivity(state, evt('ACTIVE_DOMAIN', 1000, { domain: 'youtube.com' })));
  const result = transitionActivity(state, evt('ACTIVE_DOMAIN', 61000, { domain: 'github.com' }));
  assert.equal(result.completed.length, 1);
  assert.deepEqual(result.completed[0], { domain: 'youtube.com', start: 1000, end: 61000, durationMs: 60000 });
  assert.equal(result.state.domain, 'github.com');
});

test('stops timing while browser is unfocused and resumes cleanly', () => {
  let state = createActivityState();
  ({ state } = transitionActivity(state, evt('ACTIVE_DOMAIN', 0, { domain: 'youtube.com' })));
  let result = transitionActivity(state, evt('FOCUS', 30000, { focused: false }));
  assert.equal(result.completed[0].durationMs, 30000);
  result = transitionActivity(result.state, evt('FOCUS', 90000, { focused: true }));
  result = transitionActivity(result.state, evt('FLUSH', 120000));
  assert.equal(result.completed[0].durationMs, 30000);
});

test('stops timing while user is idle and resumes on active', () => {
  let state = createActivityState();
  ({ state } = transitionActivity(state, evt('ACTIVE_DOMAIN', 0, { domain: 'reddit.com' })));
  let result = transitionActivity(state, evt('IDLE', 20000, { idle: true }));
  assert.equal(result.completed[0].durationMs, 20000);
  result = transitionActivity(result.state, evt('IDLE', 80000, { idle: false }));
  result = transitionActivity(result.state, evt('FLUSH', 100000));
  assert.equal(result.completed[0].durationMs, 20000);
});

test('does not create time for an untrackable active domain', () => {
  let state = createActivityState();
  let result = transitionActivity(state, evt('ACTIVE_DOMAIN', 0, { domain: null }));
  result = transitionActivity(result.state, evt('FLUSH', 60000));
  assert.equal(result.completed.length, 0);
});
