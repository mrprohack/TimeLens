import test from 'node:test';
import assert from 'node:assert/strict';
import { createFocusSession, isFocusActive, isDomainFocusBlocked } from '../src/core/focus.js';

test('block-list focus session blocks selected domains until expiry', () => {
  const focus = createFocusSession(1000, 25, ['youtube.com', 'reddit.com']);
  assert.equal(focus.mode, 'block');
  assert.equal(isFocusActive(focus, 1001), true);
  assert.equal(isDomainFocusBlocked(focus, 'youtube.com', 1001), true);
  assert.equal(isDomainFocusBlocked(focus, 'docs.example.com', 1001), false);
  assert.equal(isFocusActive(focus, 1000 + 25 * 60000), false);
});

test('allow-only focus blocks every domain except configured allowed domains', () => {
  const focus = createFocusSession(1000, 45, ['docs.google.com', 'github.com'], 'allow', 'Study');
  assert.equal(focus.mode, 'allow');
  assert.equal(focus.name, 'Study');
  assert.equal(isDomainFocusBlocked(focus, 'docs.google.com', 2000), false);
  assert.equal(isDomainFocusBlocked(focus, 'github.com', 2000), false);
  assert.equal(isDomainFocusBlocked(focus, 'youtube.com', 2000), true);
});

test('inactive focus never blocks regardless of mode', () => {
  const focus = createFocusSession(1000, 1, ['github.com'], 'allow');
  assert.equal(isDomainFocusBlocked(focus, 'youtube.com', 1000 + 60_000), false);
});
