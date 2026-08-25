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

test('settings and history follow the master plan grouped inspection layout', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const css = await read('src/styles/master-plan.css');
  const settings = await read('src/dashboard/settings-view.js');
  assert.match(css, /html body \.settings-stack\s*\{[\s\S]{0,220}width:\s*min\(860px,\s*100%\)/);
  assert.match(css, /html body \.settings-card\s*\{[\s\S]{0,220}padding:\s*20px/);
  assert.match(css, /html body \.appearance-card\s*\{/);
  assert.match(css, /html body \.history-drawer\s*\{[\s\S]{0,220}width:\s*min\(820px,/);
  assert.match(css, /html body \.history-summary\s*\{[\s\S]{0,240}grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /html body \.history-head\s*\{[\s\S]{0,300}position:\s*sticky/);
  for (const label of ['Notifications','Tracking','Data','Privacy','Extension health']) assert.match(html, new RegExp(label));
  assert.match(settings, /Appearance/);
  for (const value of ['light','dark','system']) assert.match(settings, new RegExp(`value="${value}"`));
  for (const id of ['history-total-time','history-session-count','history-list']) assert.match(html, new RegExp(`id="${id}"`));
});

test('compact surfaces match the master plan while preserving action hooks', async () => {
  const popup = await read('src/popup/popup.html');
  const side = await read('src/sidepanel/sidepanel.html');
  const blocked = await read('src/blocked/blocked.html');
  const css = await read('src/styles/master-plan.css');
  for (const id of ['focus-toggle','limit-current-site','open-dashboard','open-side-panel']) assert.match(popup, new RegExp(`id="${id}"`));
  for (const id of ['side-current-domain','side-current-time','side-limit-site','side-focus-action','side-open-dashboard']) assert.match(side, new RegExp(`id="${id}"`));
  for (const id of ['close-tab','open-dashboard','allowance-actions']) assert.match(blocked, new RegExp(`id="${id}"`));
  assert.match(css, /html body \.popup-shell\s*\{[\s\S]{0,220}gap:\s*10px/);
  assert.match(css, /html body \.current-panel\s*\{[\s\S]{0,260}padding:\s*22px/);
  assert.match(css, /html body \.current-time\s*\{[\s\S]{0,200}font-size:\s*38px/);
  assert.match(css, /html body \.quick-panel\s*\{[\s\S]{0,240}padding:\s*18px/);
  assert.match(css, /html body \.blocked-shell\s*\{[\s\S]{0,280}width:\s*min\(680px,/);
  assert.match(css, /html body \.dialog-panel\s*\{[\s\S]{0,220}border-radius:\s*20px/);
});

test('master plan has explicit mobile and appearance acceptance rules', async () => {
  const css = await read('src/styles/master-plan.css');
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /html\[data-theme="dark"\]\s+body\s*\{/);
  assert.match(css, /html\[data-theme="light"\]\s+body\s*\{/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*html body \.kpi-grid\s*\{[\s\S]{0,240}grid-template-columns:\s*1fr/);
});
