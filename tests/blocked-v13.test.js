import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/blocked/blocked.js', import.meta.url), 'utf8');

test('blocked page has dedicated total-budget and category boundary copy', () => {
  assert.match(source, /reason\s*===\s*['"]budget['"]/);
  assert.match(source, /reason\s*===\s*['"]category['"]/);
  assert.match(source, /Browsing budget/i);
  assert.match(source, /category/i);
});

test('budget and category blocks never expose site-limit extra-time actions', () => {
  assert.match(source, /allowance-actions/);
  assert.match(source, /hidden\s*=\s*true/);
});
