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
