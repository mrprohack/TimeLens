import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

function primaryNavLabels(html) {
  const nav = html.match(/<nav[^>]*data-primary-nav[^>]*>([\s\S]*?)<\/nav>/)?.[1] || '';
  return [...nav.matchAll(/<[^>]+data-dashboard-view=["']([^"']+)["'][^>]*>([^<]+)</g)]
    .map((match) => match[2].trim());
}

test('dashboard has exactly four primary destinations', async () => {
  const html = await read('src/dashboard/dashboard.html');
  assert.deepEqual(primaryNavLabels(html), ['Home', 'Limits', 'Focus', 'Settings']);
  for (const view of ['home', 'limits', 'focus', 'settings']) {
    assert.match(html, new RegExp(`data-view=["']${view}["']`));
  }
  assert.doesNotMatch(primaryNavLabels(html).join(','), /History|Guardrails|Privacy/);
});

test('history and advanced configuration are secondary surfaces', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const id of ['history-drawer', 'limit-dialog', 'budget-dialog', 'category-dialog', 'focus-settings-dialog']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /id=["']limit-advanced-toggle["'][^>]*aria-expanded=["']false["']/);
  assert.match(html, /id=["']limit-advanced-options["'][^>]*hidden/);
  assert.match(html, /id=["']health-details["'][^>]*hidden/);
});

test('home contains only fast daily-use controls', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const home = html.match(/<section[^>]*data-view=["']home["'][^>]*>([\s\S]*?)<\/section>/)?.[1] || '';
  for (const id of ['home-today-total', 'home-current-site', 'home-top-sites', 'home-attention', 'home-recent', 'home-add-limit', 'home-start-focus', 'home-open-side-panel']) {
    assert.match(home, new RegExp(`id=["']${id}["']`));
  }
  assert.doesNotMatch(home, /category-form|total-budget-form|limit-schedule-days|preset-form|health-details/);
});

test('home renderer caps everyday lists and owns the secondary history surface', async () => {
  const js = await read('src/dashboard/home-view.js');
  assert.match(js, /export function renderHome/);
  assert.match(js, /export function renderHistoryDrawer/);
  assert.match(js, /todayTop[\s\S]{0,40}\.slice\(0,\s*5\)/);
  assert.match(js, /sessions[\s\S]{0,40}\.slice\(0,\s*5\)/);
  assert.match(js, /home-today-total/);
  assert.match(js, /home-attention/);
});

test('dashboard controller switches views and wires shared dialogs', async () => {
  const js = await read('src/dashboard/dashboard.js');
  assert.match(js, /setDashboardView/);
  assert.match(js, /from ['"]\.\/dialogs\.js['"]/);
  assert.match(js, /data-dashboard-view/);
  assert.match(js, /history-drawer/);
});

test('mobile navigation keeps the daily destinations compact', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const css = await read('src/dashboard/dashboard.css');
  assert.match(html, /class=["'][^"']*mobile-nav[^"']*["']/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
});
