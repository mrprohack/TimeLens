import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('limit dialog links validation errors to their fields', async () => {
  const js = await read('src/dashboard/form-accessibility.js');

  assert.match(js, /limit-domain-error/);
  assert.match(js, /limit-value-error/);
  assert.match(js, /aria-describedby/);
  assert.match(js, /setAttribute\(['"]aria-invalid['"],\s*['"]true['"]\)/);
  assert.match(js, /removeAttribute\(['"]aria-invalid['"]\)/);
});

test('modal dialogs trap Tab focus while open', async () => {
  const js = await read('src/dashboard/dialogs.js');
  assert.match(js, /form-accessibility\.js/);
  assert.match(js, /function\s+trapFocus|const\s+trapFocus/);
  assert.match(js, /event\.key\s*!==\s*['"]Tab['"]/);
  assert.match(js, /shiftKey/);
});

test('final dashboard review layer raises small text to AA-safe colors', async () => {
  const css = await read('src/styles/review-loop.css');
  assert.match(css, /body \.kpi-head\s*\{[^}]*color:\s*#5f6b7e/i);
  assert.match(css, /body \.kpi-meta\s*\{[^}]*color:\s*#667085/i);
  assert.match(css, /body \.sidebar-status small\s*\{[^}]*color:\s*#667085/i);
  assert.match(css, /body \.kpi-meta\.positive\s*\{[^}]*color:\s*#087a4c/i);
});

test('theme bridge consolidates contrast overrides without important rules', async () => {
  const theme = await read('src/shared/theme.css');
  const css = await read('src/styles/review-loop.css');
  assert.doesNotMatch(theme, /appearance-contrast\.css/);
  assert.doesNotMatch(css, /!important/);
  assert.match(css, /body:has\(\.popup-shell\)/);
  assert.match(css, /body:has\(\.side-shell\)/);
});

test('usage trend exposes each value without relying on title tooltips', async () => {
  const js = await read('src/dashboard/home-view.js');
  assert.match(js, /class="trend-column"[^>]*aria-label=/);
  assert.doesNotMatch(js, /class="trend-column"[^>]*title=/);
});
