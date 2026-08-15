import test from 'node:test';
import assert from 'node:assert/strict';
import { createFocusSession, isFocusActive, isDomainFocusBlocked } from '../src/core/focus.js';

test('focus session blocks selected domains until expiry', () => {
  const focus = createFocusSession(1000, 25, ['youtube.com', 'reddit.com']);
  assert.equal(isFocusActive(focus, 1001), true);
  assert.equal(isDomainFocusBlocked(focus, 'youtube.com', 1001), true);
  assert.equal(isFocusActive(focus, 1000 + 25 * 60000), false);
});
