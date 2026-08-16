import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const text = (path) => readFile(new URL(path, root), 'utf8');

test('manifest and package versions match the 1.2 production release', async () => {
  const manifest = JSON.parse(await text('manifest.json'));
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(manifest.version, '1.2.0');
  assert.equal(pkg.version, '1.2.0');
  assert.equal(pkg.scripts.package, 'node scripts/package-extension.mjs');
});

test('production release includes onboarding and release documentation', async () => {
  for (const path of [
    'src/onboarding/onboarding.html',
    'src/onboarding/onboarding.css',
    'src/onboarding/onboarding.js',
    'CHANGELOG.md',
    'SECURITY.md',
    'LICENSE',
    'scripts/package-extension.mjs'
  ]) {
    await access(new URL(path, root), constants.R_OK);
  }
});

test('CI uses current Node-native GitHub actions and uploads the Web Store zip', async () => {
  const workflow = await text('.github/workflows/ci.yml');
  assert.match(workflow, /actions\/checkout@v7/);
  assert.match(workflow, /actions\/setup-node@v7/);
  assert.match(workflow, /npm run package/);
  assert.match(workflow, /actions\/upload-artifact@v7/);
  assert.match(workflow, /timelens-1\.2\.0\.zip/);
});

test('validator requires onboarding and checks manifest-package version parity', async () => {
  const validator = await text('scripts/validate-extension.mjs');
  assert.match(validator, /src\/onboarding\/onboarding\.html/);
  assert.match(validator, /package\.json/);
  assert.match(validator, /version/i);
});
