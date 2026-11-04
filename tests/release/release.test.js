import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../../', import.meta.url);
const text = (path) => readFile(new URL(path, root), 'utf8');

test('manifest and package versions match the 1.6 UX polish release', async () => {
  const manifest = JSON.parse(await text('manifest.json'));
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(manifest.version, '1.6.0');
  assert.equal(pkg.version, '1.6.0');
  assert.match(pkg.scripts.package, /build:css/);
  assert.match(pkg.scripts.package, /package-extension\.mjs/);
  assert.equal(pkg.scripts.test, 'node --test "tests/**/*.test.js"');
});

test('production release includes premium UI modules, deterministic previews, and release documentation', async () => {
  for (const path of [
    'src/dashboard/home-view.js',
    'src/dashboard/limits-view.js',
    'src/dashboard/focus-view.js',
    'src/dashboard/settings-view.js',
    'src/dashboard/dialogs.js',
    'src/dashboard/forms.js',
    'src/sidepanel/sidepanel.html',
    'src/onboarding/onboarding.html',
    'preview/dashboard.html',
    'preview/popup.html',
    'preview/blocked.html',
    'CHANGELOG.md',
    'SECURITY.md',
    'LICENSE',
    'scripts/package-extension.mjs'
  ]) {
    await access(new URL(path, root), constants.R_OK);
  }
});

test('CI uses pinned GitHub actions and uploads the manifest-versioned Web Store zip', async () => {
  const workflow = await text('.github/workflows/ci.yml');
  assert.match(workflow, /actions\/checkout@[a-f0-9]{40}/);
  assert.match(workflow, /actions\/setup-node@[a-f0-9]{40}/);
  assert.match(workflow, /npm run package/);
  assert.match(workflow, /actions\/upload-artifact@[a-f0-9]{40}/);
  assert.match(workflow, /require\('\.\/manifest\.json'\)\.version/);
  assert.match(workflow, /dist\/timelens-\$\{\{ steps\.version\.outputs\.version \}\}\.zip/);
  assert.doesNotMatch(workflow, /timelens-\d+\.\d+\.\d+/, 'CI must not hardcode a release version');
});

test('validator keeps the exact approved permission model', async () => {
  const manifest = JSON.parse(await text('manifest.json'));
  assert.deepEqual([...manifest.permissions].sort(), ['alarms', 'idle', 'notifications', 'sidePanel', 'storage', 'tabs']);
  assert.equal(manifest.host_permissions, undefined);
  const validator = await text('scripts/validate-extension.mjs');
  assert.match(validator, /src\/sidepanel\/sidepanel\.html/);
  assert.match(validator, /sidePanel/);
  assert.match(validator, /package\.json/);
  assert.match(validator, /version/i);
});

test('package script builds from production runtime paths only and excludes preview fixtures', async () => {
  const script = await text('scripts/package-extension.mjs');
  assert.match(script, /manifest\.json/);
  assert.match(script, /icons/);
  assert.match(script, /src/);
  assert.doesNotMatch(script, /tests/);
  assert.doesNotMatch(script, /docs/);
  assert.doesNotMatch(script, /preview/);
});

test('Tailwind v4 is compiled locally before checks and packaging', async () => {
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(pkg.devDependencies?.tailwindcss, '4.3.3');
  assert.equal(pkg.devDependencies?.['@tailwindcss/cli'], '4.3.3');
  assert.match(pkg.scripts?.['build:css'] || '', /@tailwindcss\/cli/);
  assert.match(pkg.scripts?.['build:css'] || '', /src\/styles\/tailwind\.css/);
  assert.match(pkg.scripts?.['build:css'] || '', /src\/styles\/timelens\.css/);
  assert.match(pkg.scripts?.check || '', /build:css/);
  assert.match(pkg.scripts?.package || '', /build:css/);
  await access(new URL('src/styles/tailwind.css', root), constants.R_OK);
  await access(new URL('src/styles/timelens.css', root), constants.R_OK);
});

test('CI installs locked Tailwind dependencies before running checks', async () => {
  const workflow = await text('.github/workflows/ci.yml');
  assert.match(workflow, /npm ci[\s\S]*npm run check/);
  await access(new URL('package-lock.json', root), constants.R_OK);
});

test('runtime pages consume the local Tailwind bundle through the shared compatibility bridge', async () => {
  const bridge = await text('src/shared/theme.css');
  assert.match(bridge, /@import\s+["']\.\.\/styles\/timelens\.css["']/);
  assert.doesNotMatch(bridge, /https?:\/\//i);
  for (const path of [
    'src/dashboard/dashboard.html',
    'src/popup/popup.html',
    'src/sidepanel/sidepanel.html',
    'src/blocked/blocked.html'
  ]) {
    const html = await text(path);
    assert.match(html, /\.\.\/shared\/theme\.css/);
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com|https?:\/\/[^"']+\.css/i);
  }
});
const STYLE_LAYERS = [
  { file: 'precision-polish', marker: '--radius-hero' },
  { file: 'appearance', marker: '.appearance-preview' },
  { file: 'master-plan', marker: '--mp-card-radius' },
  { file: 'review-loop', marker: '.history-context' },
  { file: 'ux-polish-v16', marker: '.load-failed' },
  { file: 'ux-polish-v17', marker: 'timelens-pulse' },
  { file: 'notice', marker: '.undo-link' }
];

test('every page loads one compiled stylesheet instead of a chain of @imports', async () => {
  const bridge = await text('src/shared/theme.css');
  assert.deepEqual(bridge.match(/@import\s+[^;]+;/g), ['@import "../styles/timelens.css";']);
});

test('style layers are inlined in cascade order by the Tailwind build', async () => {
  const source = await text('src/styles/tailwind.css');
  const positions = STYLE_LAYERS.map(({ file }) => source.indexOf(`@import "./${file}.css";`));
  assert.ok(positions.every((position) => position > 0), 'every layer must be imported');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'layers must keep their cascade order');
  assert.ok(positions[0] > source.indexOf('@layer components'), 'layers must come after the Tailwind source rules');
});

test('compiled timelens.css is fresh: it contains every layer (run npm run build:css)', async () => {
  const compiled = await text('src/styles/timelens.css');
  for (const { file, marker } of STYLE_LAYERS) {
    assert.ok(compiled.includes(marker), `timelens.css is stale: missing ${file} (${marker}). Run npm run build:css.`);
  }
});

test('Tailwind scans only the declared page sources so unrelated docs cannot change the build', async () => {
  const source = await text('src/styles/tailwind.css');
  assert.match(source.split('\n')[0], /@import\s+"tailwindcss"\s+source\(none\);/);
  for (const dir of ['dashboard', 'popup', 'sidepanel', 'blocked', 'onboarding', 'options']) {
    assert.match(source, new RegExp(`@source "\\.\\./${dir}/\\*\\*/\\*\\.\\{html,js\\}";`));
  }
});
