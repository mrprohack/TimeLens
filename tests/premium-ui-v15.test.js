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
  assert.match(css, /grid-template-columns:\s*(?:2[0-9]{2}px|var\(--sidebar-width\))\s+minmax\(0,\s*1fr\)/);
  assert.match(css, /@media\s*\(max-width:\s*(?:900|960)px\)/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
  assert.match(css, /\.mobile-nav[\s\S]{0,260}display:\s*(?:flex|grid)/);
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
