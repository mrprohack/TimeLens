import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('popup uses a compact balanced summary instrument', async () => {
  const css = await read('src/popup/popup.css');
  assert.match(css, /\.popup-shell\s*\{[\s\S]{0,220}gap:\s*10px/);
  assert.match(css, /\.summary-grid\s*\{[\s\S]{0,260}grid-template-columns:\s*118px\s+minmax\(0,\s*1fr\)/);
  assert.match(css, /\.summary-ring\s*\{[\s\S]{0,260}width:\s*112px/);
  assert.match(css, /\.summary-facts\s*>\s*div\s*\{[\s\S]{0,360}border:\s*1px\s+solid\s+var\(--line\)/);
  assert.match(css, /\.summary-facts\s*>\s*div\s*\{[\s\S]{0,420}border-radius:\s*12px/);
});

test('current website row separates identity usage and boundary state', async () => {
  const html = await read('src/popup/popup.html');
  const css = await read('src/popup/popup.css');
  assert.match(html, /class="current-copy"[\s\S]{0,420}<\/div>\s*<div id="current-boundary" class="boundary-copy/);
  assert.match(css, /\.current-card\s*\{[\s\S]{0,280}grid-template-columns:\s*38px\s+minmax\(0,\s*1fr\)\s+auto/);
  assert.match(css, /\.boundary-copy\s*\{[\s\S]{0,300}border-radius:\s*999px/);
});

test('popup actions and footer have intentional equal alignment', async () => {
  const css = await read('src/popup/popup.css');
  assert.match(css, /\.primary-actions\s*\{[\s\S]{0,220}grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.primary-actions \.btn\s*\{[\s\S]{0,240}min-height:\s*48px/);
  assert.match(css, /\.primary-actions \.btn:disabled\s*\{[\s\S]{0,360}opacity:\s*1/);
  assert.match(css, /\.popup-footer\s*\{[\s\S]{0,280}grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});

test('explicit light and dark popup themes win after legacy page styles', async () => {
  const css = await read('src/popup/popup.css');
  assert.match(css, /html\[data-theme="dark"\]\s+body\s*\{[\s\S]{0,240}background:\s*var\(--bg\)/);
  assert.match(css, /html\[data-theme="dark"\]\s+\.summary-facts\s*>\s*div/);
  assert.match(css, /html\[data-theme="light"\]\s+body\s*\{[\s\S]{0,240}background:\s*var\(--bg\)/);
});
