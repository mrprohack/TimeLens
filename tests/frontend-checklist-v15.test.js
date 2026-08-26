import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('limit dialog links validation errors to their fields', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const js = await read('src/dashboard/dashboard.js');

  assert.match(html, /id="limit-domain"[^>]*aria-describedby="limit-domain-error"/);
  assert.match(html, /id="limit-value"[^>]*aria-describedby="limit-value-error"/);
  assert.match(js, /setAttribute\(['"]aria-invalid['"],\s*['"]true['"]\)/);
  assert.match(js, /removeAttribute\(['"]aria-invalid['"]\)/);
});

test('modal dialogs trap Tab focus while open', async () => {
  const js = await read('src/dashboard/dialogs.js');
  assert.match(js, /function\s+trapFocus|const\s+trapFocus/);
  assert.match(js, /event\.key\s*!==\s*['"]Tab['"]/);
  assert.match(js, /Shift|shiftKey/);
});

test('small dashboard text uses AA-safe light-theme colors', async () => {
  const css = await read('src/dashboard/dashboard.css');
  assert.doesNotMatch(css, /\.kpi-head[^}]*color:\s*#7a8396/);
  assert.doesNotMatch(css, /\.kpi-meta[^}]*color:\s*#8b95a7/);
  assert.doesNotMatch(css, /\.sidebar-status small[^}]*color:\s*#8a94a7/);
});

test('theme bridge avoids legacy override-only layers', async () => {
  const css = await read('src/shared/theme.css');
  assert.doesNotMatch(css, /appearance-contrast\.css/);
  assert.doesNotMatch(css, /review-loop\.css/);
});

test('usage trend exposes each value without relying on title tooltips', async () => {
  const js = await read('src/dashboard/home-view.js');
  assert.match(js, /class="trend-column"[^>]*aria-label=/);
  assert.doesNotMatch(js, /class="trend-column"[^>]*title=/);
});
