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

test('mobile current-site controls collapse into a single compact row above navigation', async () => {
  const css = await polish();
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.current-strip\s*\{[\s\S]{0,360}grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.current-time-pill\s*\{[\s\S]{0,160}display:\s*none/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.quick-actions\s*\{[\s\S]{0,240}display:\s*flex/);
});

test('popup history and blocked surfaces share the polished elevation language', async () => {
  const css = await polish();
  assert.match(css, /html body \.today-summary\s*\{[\s\S]{0,500}box-shadow:\s*var\(--shadow-hero\)/);
  assert.match(css, /html body \.history-drawer\s*\{[\s\S]{0,500}box-shadow:/);
  assert.match(css, /html body \.blocked-shell\s*\{[\s\S]{0,500}border:/);
});

test('v2 gives home one dominant time instrument and quieter supporting KPI surfaces', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const css = await polish();
  assert.match(html, /kpi-card panel kpi-primary/);
  assert.match(css, /\.kpi-primary[\s\S]{0,1200}grid-column:\s*span\s*2/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
});

test('v2 exposes a shared visible keyboard focus treatment', async () => {
  const css = await polish();
  assert.match(css, /:focus-visible/);
  assert.match(css, /--focus-ring:/);
});

test('v2 preserves production action hooks on popup side panel and blocked state', async () => {
  const popup = await read('src/popup/popup.html');
  const side = await read('src/sidepanel/sidepanel.html');
  const blocked = await read('src/blocked/blocked.html');
  for (const id of ['focus-toggle', 'limit-current-site', 'open-dashboard']) assert.match(popup, new RegExp(`id="${id}"`));
  for (const id of ['side-limit-site', 'side-focus-action', 'side-open-dashboard']) assert.match(side, new RegExp(`id="${id}"`));
  for (const id of ['close-tab', 'open-dashboard', 'allowance-actions']) assert.match(blocked, new RegExp(`id="${id}"`));
});

test('v2 has explicit page polish for limits focus settings popup side panel and blocked state', async () => {
  const css = await polish();
  for (const selector of ['.workspace-card', '.focus-simple', '.settings-card', '.popup-shell', '.side-shell', '.blocked-shell']) {
    assert.match(css, new RegExp(selector.replace('.', '\\.')));
  }
});

test('v2 secondary dashboard surfaces emphasize state and keep destructive actions quiet', async () => {
  const css = await polish();
  assert.match(css, /\.focus-simple::before\s*\{[\s\S]{0,500}border-radius:\s*50%/);
  assert.match(css, /\.settings-card \.data-actions \.btn-danger\s*\{[\s\S]{0,280}margin-left:\s*auto/);
  assert.match(css, /\.history-head\s*\{[\s\S]{0,420}position:\s*sticky/);
  assert.match(css, /\.dialog-panel \.dialog-actions\s*\{[\s\S]{0,320}justify-content:\s*flex-end/);
});

test('v2 compact surfaces keep one dominant action and readable live time', async () => {
  const popup = await read('src/popup/popup.css');
  const side = await read('src/sidepanel/sidepanel.css');
  const blocked = await read('src/blocked/blocked.css');
  assert.match(popup, /\.summary-ring strong\s*\{[\s\S]{0,220}font-size:\s*27px/);
  assert.match(popup, /\.footer-link:first-child\s*\{[\s\S]{0,180}font-weight:\s*800/);
  assert.match(side, /\.current-time\s*\{[\s\S]{0,220}font-size:\s*34px/);
  assert.match(blocked, /\.primary-actions\s*\{[\s\S]{0,240}grid-template-columns:\s*minmax\(0,\s*1\.35fr\)\s+minmax\(0,\s*1fr\)/);
});

test('preview harness covers the full v2 screenshot matrix', async () => {
  for (const path of [
    'preview/dashboard.html',
    'preview/limits.html',
    'preview/focus.html',
    'preview/settings.html',
    'preview/history.html',
    'preview/popup.html',
    'preview/sidepanel.html',
    'preview/blocked.html',
    'preview/dialog.html'
  ]) {
    const html = await read(path);
    assert.match(html, /\.\.\/src\/shared\/theme\.css/);
  }
});
