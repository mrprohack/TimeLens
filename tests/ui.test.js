import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('popup exposes the essential fast actions', async () => {
  const html = await read('src/popup/popup.html');
  for (const id of ['today-total', 'current-domain', 'top-sites', 'focus-toggle', 'open-dashboard']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /aria-live=/);
});

test('dashboard exposes overview, limits, focus, history, and privacy controls', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const id of ['range-control', 'top-sites', 'daily-chart', 'limit-form', 'focus-form', 'history-list', 'export-data', 'clear-data']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('blocked page has a safe exit and conditional allowance controls', async () => {
  const html = await read('src/blocked/blocked.html');
  assert.match(html, /id=["']close-tab["']/);
  assert.match(html, /id=["']allowance-actions["']/);
});

test('shared theme guarantees hidden state wins over component display rules', async () => {
  const css = await read('src/shared/theme.css');
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s);
});
