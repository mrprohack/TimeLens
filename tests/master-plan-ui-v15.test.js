import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('master plan layer is loaded last and defines the shared product shell', async () => {
  const bridge = await read('src/shared/theme.css');
  const css = await read('src/styles/master-plan.css');
  assert.ok(bridge.indexOf('master-plan.css') > bridge.indexOf('appearance-contrast.css'));
  for (const token of ['--mp-page-max:', '--mp-rail-width:', '--mp-card-radius:', '--mp-card-shadow:']) {
    assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(css, /html body \.dashboard-shell\s*\{/);
  for (const selector of ['.page-heading', '.kpi-primary', '.workspace-card', '.kpi-card']) {
    assert.match(css, new RegExp(selector.replace('.', '\\.')));
  }
});

test('dashboard keeps four primary destinations and secondary history in the master plan shell', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const view of ['home', 'limits', 'focus', 'settings']) assert.match(html, new RegExp(`data-dashboard-view="${view}"`));
  assert.match(html, /id="sidebar-history"/);
  assert.match(html, /class="dashboard-shell"/);
});

test('home matches the master plan hierarchy without inventing metrics', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const css = await read('src/styles/master-plan.css');
  assert.match(css, /html body \.kpi-grid\s*\{[\s\S]{0,320}grid-template-columns:\s*minmax\(0,\s*1\.7fr\)\s+repeat\(2,\s*minmax\(0,\s*\.65fr\)\)/);
  assert.match(css, /html body \.kpi-grid\s*>\s*\.kpi-card:nth-child\(2\)\s*\{[\s\S]{0,100}display:\s*none/);
  assert.match(css, /html body \.analytics-grid\s*\{[\s\S]{0,320}grid-template-areas:/);
  for (const id of ['home-today-total','home-site-count','home-budget-kpi','home-breakdown','home-top-sites','home-attention','home-usage-trend','home-recent']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('limits and focus use distinct master plan task layouts', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const css = await read('src/styles/master-plan.css');
  assert.match(css, /html body \[data-view="limits"\] \.workspace-card/);
  assert.match(css, /html body \.limit-item\s*\{[\s\S]{0,300}border-radius:\s*13px/);
  assert.match(css, /html body \.budget-summary-card\s*\{/);
  assert.match(css, /html body \.focus-simple\s*\{[\s\S]{0,520}text-align:\s*center/);
  assert.match(css, /html body \.duration-options\s*\{[\s\S]{0,300}grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  for (const id of ['limit-list','budget-summary','category-section','simple-start-focus','focus-active','stop-focus']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});
