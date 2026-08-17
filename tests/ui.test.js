import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('popup exposes only the essential daily actions', async () => {
  const html = await read('src/popup/popup.html');
  for (const id of ['today-total', 'current-domain', 'focus-toggle', 'limit-current-site', 'open-side-panel', 'open-dashboard']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /aria-live=/);
  assert.doesNotMatch(html, /category-form|total-budget-form|preset-form/);
  const js = await read('src/popup/popup.js');
  assert.match(js, /sidePanel\.open/);
  assert.match(js, /SAVE_LIMIT/);
  assert.match(js, /START_FOCUS|STOP_FOCUS/);
});

test('side panel stays a compact live companion', async () => {
  const html = await read('src/sidepanel/sidepanel.html');
  const js = await read('src/sidepanel/sidepanel.js');
  for (const id of ['side-current-domain', 'side-current-time', 'side-boundary', 'side-limit-site', 'side-focus-action', 'side-open-dashboard', 'side-status']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.doesNotMatch(html, /category-form|total-budget-form|preset-form/);
  assert.match(js, /GET_SNAPSHOT/);
  assert.match(js, /SAVE_LIMIT/);
  assert.match(js, /START_FOCUS|STOP_FOCUS/);
});

test('dashboard keeps only four primary destinations and secondary history', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const id of ['home-today-total', 'limit-list', 'focus-idle-state', 'save-settings', 'history-drawer']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /data-primary-nav/);
  assert.doesNotMatch(html.match(/<nav[^>]*data-primary-nav[^>]*>[\s\S]*?<\/nav>/)?.[0] || '', />History<|>Guardrails<|>Privacy</);
});

test('simple limit flow hides advanced controls until requested', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const id of ['limit-domain', 'limit-value', 'limit-submit', 'limit-advanced-toggle', 'limit-period', 'limit-strict', 'limit-schedule-enabled', 'limit-schedule-days']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /id=["']limit-advanced-options["'][^>]*hidden/);
  const forms = await read('src/dashboard/forms.js');
  assert.match(forms, /period:\s*'daily'/);
  assert.match(forms, /strict\s*=\s*false/);
});

test('limits view summarizes budget and collapses categories', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const js = await read('src/dashboard/limits-view.js');
  assert.match(html, /id=["']budget-summary["']/);
  assert.match(html, /id=["']category-section["'][^>]*hidden/);
  assert.match(js, /export function renderLimitsView/);
  assert.match(js, /TOGGLE_LIMIT/);
  assert.match(js, /DELETE_LIMIT/);
  assert.match(js, /DELETE_CATEGORY/);
});

test('focus view is action-first and keeps raw site lists in settings', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const focusSection = html.match(/<section[^>]*data-view=["']focus["'][^>]*>([\s\S]*?)<\/section>/)?.[1] || '';
  for (const minutes of ['25', '45', '60', '90']) assert.match(focusSection, new RegExp(`data-focus-minutes=["']${minutes}["']`));
  assert.match(focusSection, /id=["']simple-start-focus["']/);
  assert.doesNotMatch(focusSection, /<textarea/);
  const js = await read('src/dashboard/focus-view.js');
  assert.match(js, /export function renderFocusView/);
  assert.match(js, /START_FOCUS/);
  assert.match(js, /STOP_FOCUS/);
});

test('settings keeps health quiet and preserves local data controls', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const id of ['alert-five', 'alert-one', 'alert-timeout', 'idle-seconds', 'retention-days', 'export-data', 'import-data', 'clear-data', 'health-toggle', 'health-details']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /id=["']health-details["'][^>]*hidden/);
  const js = await read('src/dashboard/settings-view.js');
  assert.match(js, /SAVE_SETTINGS/);
  assert.match(js, /IMPORT_DATA/);
  assert.match(js, /CLEAR_DIAGNOSTICS/);
});

test('first-run onboarding still explains privacy and can create a first limit', async () => {
  const html = await read('src/onboarding/onboarding.html');
  const js = await read('src/onboarding/onboarding.js');
  for (const id of ['onboarding-form', 'first-limit-domain', 'first-limit-value', 'first-limit-unit', 'first-limit-period', 'finish-onboarding']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /stays on this device/i);
  assert.match(js, /SAVE_LIMIT/);
  assert.match(js, /SAVE_SETTINGS/);
});

test('blocked page keeps a safe exit and conditional allowance controls', async () => {
  const html = await read('src/blocked/blocked.html');
  assert.match(html, /id=["']close-tab["']/);
  assert.match(html, /id=["']allowance-actions["']/);
});

test('shared theme guarantees hidden state wins and respects reduced motion', async () => {
  const css = await read('src/shared/theme.css');
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
