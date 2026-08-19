import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const polish = () => read('src/styles/precision-polish.css');

test('runtime bridge loads Tailwind first and the centralized polish layer second', async () => {
  const theme = await read('src/shared/theme.css');
  const tailwindIndex = theme.indexOf('../styles/timelens.css');
  const polishIndex = theme.indexOf('../styles/precision-polish.css');
  assert.ok(tailwindIndex >= 0, 'compiled Tailwind import missing');
  assert.ok(polishIndex > tailwindIndex, 'polish layer must load after Tailwind');
});

test('polish introduces three deliberate surface levels and restrained elevation', async () => {
  const css = await polish();
  for (const token of ['--surface-canvas:', '--surface-card:', '--surface-subtle:', '--shadow-card:', '--shadow-hero:']) {
    assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(css, /html body \.kpi-primary\s*\{[\s\S]{0,700}box-shadow:\s*var\(--shadow-hero\)/);
  assert.match(css, /html body \.analytics-card\s*\{[\s\S]{0,700}box-shadow:\s*var\(--shadow-card\)/);
});

test('analytics rows get quiet hover affordances without bouncing the whole dashboard', async () => {
  const css = await polish();
  assert.match(css, /@media\s*\(hover:\s*hover\)/);
  assert.match(css, /\.usage-item:hover/);
  assert.match(css, /\.attention-item:hover/);
  assert.match(css, /\.recent-item:hover/);
  assert.match(css, /background:\s*var\(--surface-subtle\)/);
});

test('usage trend gains instrument-style guide lines rather than floating bars', async () => {
  const css = await polish();
  assert.match(css, /\.trend-bars::before\s*\{/);
  assert.match(css, /repeating-linear-gradient/);
  assert.match(css, /pointer-events:\s*none/);
});

test('mobile hero is compact and content clears the fixed navigation safe area', async () => {
  const css = await polish();
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.kpi-primary\s*\{[\s\S]{0,420}min-height:\s*14[0-9]px/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.dashboard-shell\s*\{[\s\S]{0,420}env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.mobile-nav\s*\{[\s\S]{0,520}env\(safe-area-inset-bottom\)/);
});

test('popup history and blocked surfaces share the polished elevation language', async () => {
  const css = await polish();
  assert.match(css, /html body \.today-summary\s*\{[\s\S]{0,500}box-shadow:\s*var\(--shadow-hero\)/);
  assert.match(css, /html body \.history-drawer\s*\{[\s\S]{0,500}box-shadow:/);
  assert.match(css, /html body \.blocked-shell\s*\{[\s\S]{0,500}border:/);
});
