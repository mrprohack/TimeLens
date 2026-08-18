import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const text = (path) => readFile(new URL(path, root), 'utf8');

test('manifest and package versions match the 1.5 premium dashboard release', async () => {
  const manifest = JSON.parse(await text('manifest.json'));
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(manifest.version, '1.5.0');
  assert.equal(pkg.version, '1.5.0');
  assert.equal(pkg.scripts.package, 'node scripts/package-extension.mjs');
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

test('CI uses pinned GitHub actions and uploads the 1.5 Web Store zip', async () => {
  const workflow = await text('.github/workflows/ci.yml');
  assert.match(workflow, /actions\/checkout@[a-f0-9]{40}/);
  assert.match(workflow, /actions\/setup-node@[a-f0-9]{40}/);
  assert.match(workflow, /npm run package/);
  assert.match(workflow, /actions\/upload-artifact@[a-f0-9]{40}/);
  assert.match(workflow, /timelens-1\.5\.0\.zip/);
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
