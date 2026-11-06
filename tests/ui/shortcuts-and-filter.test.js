import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('dashboard includes shortcuts modal and limit filter search', async () => {
  const html = await read('src/dashboard/dashboard.html');
  assert.match(html, /id=["']sidebar-shortcuts["']/);
  assert.match(html, /id=["']shortcuts-dialog["']/);
  assert.match(html, /id=["']shortcuts-dialog-title["']/);
  assert.match(html, /id=["']limit-search["']/);
  assert.match(html, /class=["'][^"']*limit-search-input[^"']*["']/);
});

test('dashboard wires keyboard shortcuts navigation and shortcuts modal', async () => {
  const js = await read('src/dashboard/dashboard.js');
  assert.match(js, /shortcuts-dialog/);
  assert.match(js, /sidebar-shortcuts/);
  assert.match(js, /addEventListener\(['"]keydown['"]/);
  assert.match(js, /event\.key\s*===\s*['"]1['"]/);
  assert.match(js, /event\.key\s*===\s*['"]2['"]/);
  assert.match(js, /event\.key\s*===\s*['"]3['"]/);
  assert.match(js, /event\.key\s*===\s*['"]4['"]/);
  assert.match(js, /event\.key\s*===\s*['"]\/['"]/);
  assert.match(js, /event\.key\s*===\s*['"]\?['"]/);
  assert.match(js, /limit-search/);
});

test('limits view filters site limits in real time with search query', async () => {
  const js = await read('src/dashboard/limits-view.js');
  assert.match(js, /limit-search/);
  assert.match(js, /limitFilterQuery/);
  assert.match(js, /filter\(/);
  assert.match(js, /No site limits match/);
});

test('dashboard css styles keyboard shortcuts and search filter input', async () => {
  const css = await read('src/dashboard/dashboard.css');
  assert.match(css, /kbd\s*\{/);
  assert.match(css, /\.shortcuts-list/);
  assert.match(css, /\.shortcut-item/);
  assert.match(css, /\.limit-search-input/);
  assert.match(css, /\.shortcuts-link/);
});
