import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../../', import.meta.url);
const text = (path) => readFile(new URL(path, root), 'utf8');

test('manifest and package versions match the 1.8 continuous delivery release', async () => {
  const manifest = JSON.parse(await text('manifest.json'));
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(manifest.version, '1.8.0');
  assert.equal(pkg.version, '1.8.0');
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
    'docs/ARCHITECTURE.md',
    'docs/DEVELOPMENT.md',
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
  assert.equal(pkg.devDependencies?.tailwindcss, '4.3.5');
  assert.equal(pkg.devDependencies?.['@tailwindcss/cli'], '4.3.5');
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

test('CI bounds the job and verifies the committed Tailwind bundle is current', async () => {
  const workflow = await text('.github/workflows/ci.yml');
  assert.match(workflow, /timeout-minutes:\s*\d+/, 'CI must bound the job so a hung step cannot burn runner hours');
  assert.match(
    workflow,
    /npm run build:css[\s\S]*git diff --exit-code -- src\/styles\/timelens\.css/,
    'CI must fail when the committed Tailwind bundle is stale',
  );
});

test('Dependabot watches the npm and GitHub Actions ecosystems', async () => {
  const config = await text('.github/dependabot.yml');
  assert.match(config, /package-ecosystem:\s*npm/);
  assert.match(config, /package-ecosystem:\s*github-actions/);
  assert.match(config, /tailwindcss/);
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

test('the documented message protocol lists every message type the worker handles', async () => {
  const worker = await text('src/background/service-worker.js');
  const architecture = await text('docs/ARCHITECTURE.md');

  // Every `case '...'` label in the worker's message switch is part of the contract.
  const handled = [...worker.matchAll(/case '([A-Z_]+)':/g)].map((match) => match[1]);
  const unique = [...new Set(handled)];
  assert.ok(unique.length >= 19, `expected the worker to handle at least 19 message types, found ${unique.length}`);

  const documented = new Set(
    [...architecture.matchAll(/^\| `([A-Z_]+)` \|/gm)].map((match) => match[1]),
  );
  const missing = unique.filter((type) => !documented.has(type));
  assert.deepEqual(
    missing,
    [],
    `docs/ARCHITECTURE.md does not document: ${missing.join(', ')}. The worker is the source of truth.`,
  );
});