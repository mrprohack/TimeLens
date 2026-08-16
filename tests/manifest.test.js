import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('manifest is MV3 and requests only the approved permissions', async () => {
  const manifest = JSON.parse(await text('manifest.json'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual([...manifest.permissions].sort(), ['alarms', 'idle', 'notifications', 'storage', 'tabs']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.background.type, 'module');
  assert.equal(manifest.action.default_popup, 'src/popup/popup.html');
});

test('manifest references pages and icon assets that exist', async () => {
  const manifest = JSON.parse(await text('manifest.json'));
  const paths = [
    manifest.background.service_worker,
    manifest.action.default_popup,
    manifest.options_page,
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon)
  ];
  for (const path of paths) {
    const content = await readFile(new URL(path, root));
    assert.ok(content.length > 0, `${path} should exist and not be empty`);
  }
});
