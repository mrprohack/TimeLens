import test from 'node:test';
import assert from 'node:assert/strict';
import { createFocusSession, isFocusActive, isDomainFocusBlocked } from '../../src/core/focus.js';

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

import { DEFAULT_FOCUS_DOMAINS, focusStartLabel, quickFocusPayload } from '../../src/core/focus.js';

const WORK = { id: 'work', name: 'Work', minutes: 60, mode: 'block', domains: ['reddit.com'] };
const STUDY = { id: 'study', name: 'Study', minutes: 45, mode: 'allow', domains: ['wikipedia.org'] };

test('quick Focus uses the last-used preset, then the first preset, then a built-in default', () => {
  assert.deepEqual(quickFocusPayload([WORK, STUDY], 'study'), {
    presetId: 'study', minutes: 45, domains: ['wikipedia.org'], mode: 'allow', name: 'Study'
  });
  assert.equal(quickFocusPayload([WORK, STUDY], 'deleted-preset').presetId, 'work', 'unknown last-used id falls back to the first preset');
  assert.equal(quickFocusPayload([WORK, STUDY], null).presetId, 'work');
  assert.deepEqual(quickFocusPayload([], 'work'), {
    presetId: null, minutes: 25, domains: [...DEFAULT_FOCUS_DOMAINS], mode: 'block', name: 'Focus'
  });
  assert.equal(quickFocusPayload(undefined, undefined).minutes, 25);
});

test('quick Focus never starts a Focus that blocks nothing', () => {
  const empty = { id: 'empty', name: 'Empty', minutes: 30, mode: 'block', domains: [] };
  const payload = quickFocusPayload([empty], 'empty');
  assert.equal(payload.presetId, 'empty');
  assert.deepEqual(payload.domains, [...DEFAULT_FOCUS_DOMAINS]);
  const allowEmpty = quickFocusPayload([{ ...empty, id: 'a', mode: 'allow' }], 'a');
  assert.equal(allowEmpty.domains.length, 0, 'allow-only needs an explicit list; the worker rejects it rather than guessing');
});

test('quick Focus payloads are copies so callers cannot mutate presets or the defaults', () => {
  const payload = quickFocusPayload([WORK], 'work');
  payload.domains.push('x.com');
  assert.deepEqual(WORK.domains, ['reddit.com']);
  const fallback = quickFocusPayload([], null);
  fallback.domains.push('x.com');
  assert.equal(DEFAULT_FOCUS_DOMAINS.includes('x.com'), true, 'x.com is a real default');
  assert.equal(quickFocusPayload([], null).domains.length, DEFAULT_FOCUS_DOMAINS.length);
});

test('start label states what will happen, including the duration', () => {
  assert.equal(focusStartLabel({ name: 'Work', minutes: 60 }), 'Start Work · 1h');
  assert.equal(focusStartLabel({ name: 'Focus', minutes: 25 }), 'Start Focus · 25m');
  assert.equal(focusStartLabel({ name: 'Deep Work', minutes: 90 }), 'Start Deep Work · 1h 30m');
});
