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

test('premium theme exposes shared brand and semantic tokens', async () => {
  const css = await read('src/shared/theme.css');
  for (const token of ['--brand:', '--brand-strong:', '--brand-soft:', '--surface-raised:', '--surface-muted:', '--warning-soft:', '--danger-soft:']) {
    assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(css, /--radius-xl:/);
  assert.match(css, /prefers-reduced-motion/);
});

test('dashboard preserves four daily destinations and adds a desktop rail shell', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const css = await read('src/dashboard/dashboard.css');
  assert.deepEqual(primaryNavLabels(html), ['Home', 'Limits', 'Focus', 'Settings']);
  assert.match(html, /class=["'][^"']*app-header[^"']*["']/);
  assert.match(css, /--sidebar-width:\s*236px/);
  assert.match(css, /body\s*\{[\s\S]{0,180}padding:\s*0\s+0\s+0\s+var\(--sidebar-width\)/);
  assert.match(css, /\.app-header\s*\{[\s\S]{0,180}position:\s*fixed/);
  assert.match(css, /@media\s*\(max-width:\s*960px\)/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
  assert.match(css, /\.mobile-nav\s*\{[\s\S]{0,520}display:\s*grid/);
});

test('production dashboard never invents showcase-only metrics', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const unsupported of ['Productivity Score', 'Current Streak', 'Sync Everywhere', 'Cloud sync']) {
    assert.doesNotMatch(html, new RegExp(unsupported, 'i'));
  }
});

test('advanced surfaces remain progressively disclosed', async () => {
  const html = await read('src/dashboard/dashboard.html');
  assert.match(html, /id=["']limit-advanced-toggle["'][^>]*aria-expanded=["']false["']/);
  assert.match(html, /id=["']limit-advanced-options["'][^>]*hidden/);
  assert.match(html, /id=["']category-section["'][^>]*hidden/);
  assert.match(html, /id=["']health-details["'][^>]*hidden/);
  assert.match(html, /id=["']history-drawer["']/);
});

test('mobile primary actions keep touch-friendly sizing and overflow safety', async () => {
  const theme = await read('src/shared/theme.css');
  const dashboard = await read('src/dashboard/dashboard.css');
  assert.match(theme, /--touch-target:\s*44px/);
  assert.match(theme, /min-height:\s*var\(--touch-target\)/);
  assert.match(dashboard, /max-width:\s*100%/);
  assert.match(dashboard, /min-width:\s*0/);
  assert.match(dashboard, /overflow-x:\s*hidden/);
});

test('popup remains compact and uses the premium hierarchy', async () => {
  const html = await read('src/popup/popup.html');
  const css = await read('src/popup/popup.css');
  for (const id of ['today-total', 'current-domain', 'current-boundary', 'focus-toggle', 'limit-current-site', 'open-dashboard']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /\.\.\/shared\/theme\.css/);
  assert.match(css, /width:\s*360px/);
  assert.match(css, /overflow:\s*hidden/);
  assert.match(css, /var\(--brand-soft\)/);
  assert.match(css, /border-radius:\s*(?:16|18|20)px/);
});

test('side panel stays a focused premium companion', async () => {
  const html = await read('src/sidepanel/sidepanel.html');
  const css = await read('src/sidepanel/sidepanel.css');
  for (const id of ['side-current-domain', 'side-current-time', 'side-boundary', 'side-limit-site', 'side-focus-action', 'side-open-dashboard']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /var\(--brand-soft\)/);
  assert.match(css, /min-height:\s*var\(--touch-target\)/);
});

test('blocked page keeps safe actions inside a premium full-screen boundary state', async () => {
  const html = await read('src/blocked/blocked.html');
  const css = await read('src/blocked/blocked.css');
  for (const id of ['blocked-title', 'blocked-copy', 'close-tab', 'open-dashboard', 'allowance-actions']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /\.\.\/shared\/theme\.css/);
  assert.match(css, /linear-gradient|radial-gradient/);
  assert.match(css, /#(?:0b1020|111827|10162)/i);
  assert.match(css, /min-height:\s*100vh/);
  assert.match(css, /@media\s*\(max-width:\s*480px\)/);
});

test('home matches the reference-style analytics composition using real TimeLens data', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const css = await read('src/dashboard/dashboard.css');
  const js = await read('src/dashboard/home-view.js');

  for (const id of [
    'home-today-total', 'home-focus-kpi', 'home-site-count', 'home-budget-kpi',
    'home-breakdown', 'home-usage-trend', 'home-top-sites', 'home-attention', 'home-recent'
  ]) assert.match(html, new RegExp(`id=["']${id}["']`));

  assert.match(html, /class=["'][^"']*dashboard-topbar[^"']*["']/);
  assert.match(html, /class=["'][^"']*kpi-grid[^"']*["']/);
  assert.match(html, /class=["'][^"']*analytics-grid[^"']*["']/);
  assert.match(css, /\.kpi-grid\s*\{[\s\S]{0,180}repeat\(4/);
  assert.match(css, /\.analytics-grid\s*\{/);
  assert.match(css, /\.trend-bars\s*\{/);
  assert.match(css, /\.breakdown-donut\s*\{/);
  assert.match(js, /home-focus-kpi/);
  assert.match(js, /home-site-count/);
  assert.match(js, /home-budget-kpi/);
  assert.match(js, /home-usage-trend/);
  assert.match(js, /home-breakdown/);
});

test('usage history drawer presents reference-style summary stats without a new backend', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const js = await read('src/dashboard/home-view.js');
  for (const id of ['history-total-time', 'history-session-count', 'history-list']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(js, /history-total-time/);
  assert.match(js, /history-session-count/);
});

test('popup includes a real-data summary ring like the design reference', async () => {
  const html = await read('src/popup/popup.html');
  const css = await read('src/popup/popup.css');
  const js = await read('src/popup/popup.js');
  assert.match(html, /class=["'][^"']*summary-ring[^"']*["']/);
  assert.match(html, /id=["']popup-site-count["']/);
  assert.match(html, /id=["']popup-focus-status["']/);
  assert.match(css, /conic-gradient/);
  assert.match(js, /--summary-progress/);
  assert.match(js, /popup-site-count/);
  assert.match(js, /popup-focus-status/);
});

test('sidebar usage history opens the existing history drawer', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const home = await read('src/dashboard/home-view.js');
  const js = await read('src/dashboard/sidebar-history.js');
  assert.match(html, /id=["']sidebar-history["']/);
  assert.match(home, /import\s+["']\.\/sidebar-history\.js["']/);
  assert.match(js, /sidebar-history/);
  assert.match(js, /open-history/);
  assert.match(js, /\.click\(\)/);
});

test('popup keeps the reference one-screen composition by hiding optional top-sites detail', async () => {
  const css = await read('src/popup/popup.css');
  assert.match(css, /\.sites-section\s*\{[^}]*display:\s*none/);
  assert.match(css, /\.popup-footer\s*\{/);
});
