import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('popup exposes the essential fast actions and side panel launcher', async () => {
  const html = await read('src/popup/popup.html');
  for (const id of ['today-total', 'current-domain', 'top-sites', 'focus-toggle', 'open-side-panel', 'open-dashboard']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /aria-live=/);
  const js = await read('src/popup/popup.js');
  assert.match(js, /sidePanel\.open/);
});

test('side panel exposes live usage boundaries and quick focus actions', async () => {
  const html = await read('src/sidepanel/sidepanel.html');
  const js = await read('src/sidepanel/sidepanel.js');
  for (const id of [
    'side-current-domain', 'side-today-total', 'side-budget', 'side-boundaries',
    'side-focus-presets', 'side-limit-site', 'side-open-dashboard', 'side-status'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /aria-live=["']polite["']/);
  assert.match(js, /GET_SNAPSHOT/);
  assert.match(js, /SAVE_LIMIT/);
  assert.match(js, /START_FOCUS/);
  assert.match(js, /escapeHtml/);
});

test('dashboard exposes overview, limits, focus, history, and privacy controls', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const id of ['range-control', 'top-sites', 'daily-chart', 'limit-form', 'focus-form', 'history-list', 'export-data', 'clear-data']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('limit form exposes value period strict mode and smart schedule controls', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const id of [
    'limit-value', 'limit-unit', 'limit-period', 'limit-strict',
    'limit-schedule-enabled', 'limit-schedule-days', 'limit-schedule-start', 'limit-schedule-end'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /value=["']daily["'][^>]*>Daily</i);
  assert.match(html, /value=["']weekly["'][^>]*>Weekly</i);
  assert.match(html, /value=["']monthly["'][^>]*>Monthly</i);
  const js = await read('src/dashboard/dashboard.js');
  assert.match(js, /schedule/);
  assert.match(js, /SAVE_LIMIT/);
});

test('dashboard manages total browsing budget and category limits', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const id of [
    'total-budget-form', 'total-budget-enabled', 'total-budget-minutes', 'total-budget-mode', 'total-budget-progress',
    'category-form', 'category-name', 'category-domains', 'category-value', 'category-period',
    'category-schedule-enabled', 'category-schedule-days', 'category-schedule-start', 'category-schedule-end', 'category-list'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  const js = await read('src/dashboard/dashboard.js');
  assert.match(js, /SAVE_TOTAL_BUDGET/);
  assert.match(js, /SAVE_CATEGORY/);
  assert.match(js, /DELETE_CATEGORY/);
  assert.match(js, /escapeHtml/);
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

test('focus workspace supports block and allow-only modes with saved presets', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const id of [
    'focus-mode', 'focus-presets', 'preset-form', 'preset-name', 'preset-duration',
    'preset-mode', 'preset-domains', 'preset-list'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /value=["']allow["']/);
  const js = await read('src/dashboard/dashboard.js');
  assert.match(js, /SAVE_FOCUS_PRESET/);
  assert.match(js, /DELETE_FOCUS_PRESET/);
  assert.match(js, /START_FOCUS/);
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

test('dashboard popup and side panel render period-aware boundary copy', async () => {
  const dashboardJs = await read('src/dashboard/dashboard.js');
  const popupJs = await read('src/popup/popup.js');
  const sideJs = await read('src/sidepanel/sidepanel.js');
  assert.match(dashboardJs, /limit\.period/);
  assert.match(popupJs, /limit\.period/);
  assert.match(sideJs, /period/);
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
