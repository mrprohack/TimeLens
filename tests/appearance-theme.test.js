import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = async (path) => readFile(new URL(path, root), 'utf8').catch(() => '');

test('appearance controller supports persisted light dark and system preferences', async () => {
  const source = await read('src/shared/appearance.js');
  assert.match(source, /timelensAppearance/);
  for (const value of ['light', 'dark', 'system']) assert.match(source, new RegExp(`['"]${value}['"]`));
  assert.match(source, /localStorage/);
  assert.match(source, /matchMedia\(['"]\(prefers-color-scheme: dark\)['"]\)/);
  assert.match(source, /dataset\.theme/);
  assert.match(source, /addEventListener(?:\?\.)?\(['"]change['"]/);
});

test('shared UI initializes appearance on dashboard popup side panel blocked and onboarding surfaces', async () => {
  const ui = await read('src/shared/ui.js');
  assert.match(ui, /appearance\.js/);
  assert.match(ui, /initializeAppearance/);

  for (const path of [
    'src/dashboard/dashboard.js',
    'src/popup/popup.js',
    'src/sidepanel/sidepanel.js',
    'src/blocked/blocked.js',
    'src/onboarding/onboarding.js'
  ]) {
    const source = await read(path);
    assert.match(source, /shared\/ui\.js/, `${path} must keep using shared UI so appearance initializes there`);
  }
});

test('settings exposes an immediate Light Dark System appearance chooser', async () => {
  const source = await read('src/dashboard/settings-view.js');
  assert.match(source, /Appearance/);
  for (const value of ['light', 'dark', 'system']) {
    assert.match(source, new RegExp(`value=[\\"']${value}[\\"']`));
  }
  assert.match(source, /getAppearancePreference/);
  assert.match(source, /setAppearancePreference/);
  assert.match(source, /name=[\\"']appearance[\\"']/);
});

test('final appearance layer explicitly fixes v2 dark surfaces after legacy page CSS', async () => {
  const bridge = await read('src/shared/theme.css');
  const css = await read('src/styles/appearance.css');
  assert.match(bridge, /appearance\.css/);
  assert.match(css, /html\[data-theme=["']dark["']\]/);
  for (const selector of ['.app-header', '.kpi-primary', '.analytics-card', '.focus-simple', '.settings-card', '.history-drawer', '.dialog-panel', '.today-summary', '.side-shell']) {
    assert.match(css, new RegExp(selector.replace('.', '\\.')));
  }
  assert.match(css, /--surface-raised:/);
  assert.match(css, /--text:/);
  assert.match(css, /--line:/);
});

test('manual light mode wins over OS-dark media styles and blocked page has a light treatment', async () => {
  const css = await read('src/styles/appearance.css');
  assert.match(css, /html\[data-theme=["']light["']\]/);
  assert.match(css, /html\[data-theme=["']light["']\] body:has\(\.blocked-shell\)/);
  assert.match(css, /html\[data-theme=["']light["']\] body \.blocked-shell/);
  assert.match(css, /color-scheme:\s*light/);
  assert.match(css, /color-scheme:\s*dark/);
});
