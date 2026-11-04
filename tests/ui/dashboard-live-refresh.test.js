import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('dashboard stays live on Home without clobbering edits or looping on its own writes', async () => {
  const js = await read('src/dashboard/dashboard.js');

  // Triggers: visible-only timer, tab visibility, window focus, and opening a view.
  assert.match(js, /setInterval\(refreshHomeQuietly,\s*LIVE_REFRESH_MS\)/);
  assert.match(js, /addEventListener\('visibilitychange',\s*refreshIfStale\)/);
  assert.match(js, /addEventListener\('focus',\s*refreshIfStale\)/);

  // Only Home is re-rendered in the background, and never behind an open dialog.
  assert.match(js, /function homeIsSafeToRefresh\(\)[\s\S]{0,200}activeViewName\(\) === 'home'[\s\S]{0,80}!anyDialogOpen\(\)/);
  assert.match(js, /function anyDialogOpen\(\)[\s\S]{0,120}dialogs\.some\(/);

  // Slow, older responses must never overwrite newer data.
  assert.match(js, /const seq = \+\+refreshSeq/);
  assert.match(js, /if \(seq !== refreshSeq\) return;/);

  // GET_SNAPSHOT writes storage, so a storage.onChanged listener would refresh forever.
  assert.doesNotMatch(js, /onChanged\.addListener/);
});
