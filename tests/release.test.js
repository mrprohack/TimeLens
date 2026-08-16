import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const text = (path) => readFile(new URL(path, root), 'utf8');

test('manifest and package versions match the 1.3 focus assistant release', async () => {
  const manifest = JSON.parse(await text('manifest.json'));
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(manifest.version, '1.3.0');
  assert.equal(pkg.version, '1.3.0');
  assert.equal(pkg.scripts.package, 'node scripts/package-extension.mjs');
});

test('production release includes onboarding side panel and release documentation', async () => {
  for (const path of [
    'src/onboarding/onboarding.html',
    'src/onboarding/onboarding.css',
    'src/onboarding/onboarding.js',
    'src/sidepanel/sidepanel.html',
    'src/sidepanel/sidepanel.css',
    'src/sidepanel/sidepanel.js',
    'CHANGELOG.md',
    'SECURITY.md',
    'LICENSE',
    'scripts/package-extension.mjs'
  ]) {
    await access(new URL(path, root), constants.R_OK);
  }
});

test('CI uses current Node-native GitHub actions and uploads the 1.3 Web Store zip', async () => {
  const workflow = await text('.github/workflows/ci.yml');
  assert.match(workflow, /actions\/checkout@v7/);
  assert.match(workflow, /actions\/setup-node@v7/);
  assert.match(workflow, /npm run package/);
  assert.match(workflow, /actions\/upload-artifact@v7/);
  assert.match(workflow, /timelens-1\.3\.0\.zip/);
});

test('validator requires side panel and exact approved 1.3 permission set', async () => {
  const validator = await text('scripts/validate-extension.mjs');
  assert.match(validator, /src\/sidepanel\/sidepanel\.html/);
  assert.match(validator, /sidePanel/);
  assert.match(validator, /package\.json/);
  assert.match(validator, /version/i);
});

test('package script builds from production runtime paths only', async () => {
  const script = await text('scripts/package-extension.mjs');
  assert.match(script, /manifest\.json/);
  assert.match(script, /icons/);
  assert.match(script, /src/);
  assert.doesNotMatch(script, /tests/);
  assert.doesNotMatch(script, /docs/);
});
