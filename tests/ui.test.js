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

test('limit form exposes simple value, unit, and daily weekly monthly period controls', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const id of ['limit-value', 'limit-unit', 'limit-period', 'limit-strict']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /value=["']daily["'][^>]*>Daily</i);
  assert.match(html, /value=["']weekly["'][^>]*>Weekly</i);
  assert.match(html, /value=["']monthly["'][^>]*>Monthly</i);
});

test('production limit UX supports edit pause resume and delete', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const js = await read('src/dashboard/dashboard.js');
  assert.match(html, /id=["']limit-cancel-edit["']/);
  assert.match(js, /class=["']?[^`"']*edit-limit/);
  assert.match(js, /class=["']?[^`"']*toggle-limit/);
  assert.match(js, /TOGGLE_LIMIT/);
  assert.match(js, /Editing/);
});

test('dashboard provides alert preferences restore and extension health controls', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const id of [
    'alert-five', 'alert-one', 'alert-timeout', 'import-data', 'import-file',
    'health-status', 'storage-usage', 'diagnostic-count', 'clear-diagnostics'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /aria-live=["']polite["']/);
});

test('dashboard import flow parses JSON and sends IMPORT_DATA', async () => {
  const js = await read('src/dashboard/dashboard.js');
  assert.match(js, /JSON\.parse/);
  assert.match(js, /IMPORT_DATA/);
  assert.match(js, /backup/i);
});

test('first-run onboarding explains privacy and can create a first limit', async () => {
  const html = await read('src/onboarding/onboarding.html');
  const js = await read('src/onboarding/onboarding.js');
  for (const id of [
    'onboarding-form', 'first-limit-domain', 'first-limit-value', 'first-limit-unit',
    'first-limit-period', 'onboarding-alert-five', 'onboarding-alert-one',
    'onboarding-alert-timeout', 'finish-onboarding'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /stays on this device/i);
  assert.match(html, /active.*focused/i);
  assert.match(js, /SAVE_LIMIT/);
  assert.match(js, /SAVE_SETTINGS/);
});

test('dashboard and popup render period-aware limit copy', async () => {
  const dashboardJs = await read('src/dashboard/dashboard.js');
  const popupJs = await read('src/popup/popup.js');
  assert.match(dashboardJs, /limit\.period/);
  assert.match(popupJs, /limit\.period/);
});

test('blocked page has a safe exit and conditional allowance controls', async () => {
  const html = await read('src/blocked/blocked.html');
  assert.match(html, /id=["']close-tab["']/);
  assert.match(html, /id=["']allowance-actions["']/);
});

test('shared theme guarantees hidden state wins and respects reduced motion', async () => {
  const css = await read('src/shared/theme.css');
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
