import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDomain } from '../src/core/domain.js';

test('normalizes common website URLs to a stable domain', () => {
  assert.equal(normalizeDomain('https://www.youtube.com/watch?v=abc'), 'youtube.com');
  assert.equal(normalizeDomain('https://m.youtube.com/shorts/abc'), 'youtube.com');
  assert.equal(normalizeDomain('https://github.com/mrprohack/TimeLens'), 'github.com');
});

test('rejects browser and non-web schemes', () => {
  assert.equal(normalizeDomain('chrome://extensions/'), null);
  assert.equal(normalizeDomain('chrome-extension://abc/popup.html'), null);
  assert.equal(normalizeDomain('file:///tmp/test.html'), null);
});
