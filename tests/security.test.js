import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const text = (path) => readFile(new URL(path, root), 'utf8');

const ACTION_PINS = Object.freeze({
  checkout: '3d3c42e5aac5ba805825da76410c181273ba90b1',
  setupNode: '820762786026740c76f36085b0efc47a31fe5020',
  uploadArtifact: '043fb46d1a93c77aae656e7c1c64a875d1fc6a0a'
});

test('CI third-party actions are pinned to immutable commit SHAs', async () => {
  const workflow = await text('.github/workflows/ci.yml');
  assert.match(workflow, new RegExp(`actions/checkout@${ACTION_PINS.checkout}`));
  assert.match(workflow, new RegExp(`actions/setup-node@${ACTION_PINS.setupNode}`));
  assert.match(workflow, new RegExp(`actions/upload-artifact@${ACTION_PINS.uploadArtifact}`));
  assert.doesNotMatch(workflow, /uses:\s*actions\/(?:checkout|setup-node|upload-artifact)@v\d/);
});

test('blocked-page redirect never embeds the original browsing URL in its query string', async () => {
  const worker = await text('src/background/service-worker.js');
  assert.doesNotMatch(worker, /searchParams\.set\(['"]returnUrl['"]/);
  assert.match(worker, /chrome\.storage\.session\.set/);
  assert.match(worker, /timelensReturnUrl:/);
});

test('blocked page retrieves temporary return URL from session storage and removes it after use', async () => {
  const blocked = await text('src/blocked/blocked.js');
  assert.doesNotMatch(blocked, /params\.get\(['"]returnUrl['"]/);
  assert.match(blocked, /chrome\.storage\.session\.get/);
  assert.match(blocked, /chrome\.storage\.session\.remove/);
  assert.match(blocked, /https?:/);
});
