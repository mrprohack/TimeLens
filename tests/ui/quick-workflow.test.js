import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('popup, side panel and dashboard share one one-tap Focus rule and one default site list', async () => {
  const literalList = /['"]youtube\.com['"]\s*,\s*['"]reddit\.com['"]/;
  for (const path of ['src/popup/popup.js', 'src/sidepanel/sidepanel.js', 'src/dashboard/focus-view.js', 'src/dashboard/home-view.js']) {
    const source = await read(path);
    assert.doesNotMatch(source, literalList, `${path} must not copy the default site list`);
    assert.match(source, /core\/focus\.js/, `${path} must use the shared Focus rule`);
  }
  assert.match(await read('src/background/migrations.js'), /DEFAULT_FOCUS_DOMAINS/);
  for (const path of ['src/popup/popup.js', 'src/sidepanel/sidepanel.js']) {
    assert.match(await read(path), /quickFocusPayload\(/);
  }
});

test('quick actions remember the last choice and never act on cached or missing data', async () => {
  const popup = await read('src/popup/popup.js');
  assert.match(popup, /async function requireLive\(\)[\s\S]{0,260}snapshotIsLive/);
  assert.match(popup, /START_FOCUS/);
  assert.equal((popup.match(/await requireLive\(\)/g) || []).length >= 3, true, 'focus, preset chip and limit all require live data');
  assert.match(popup, /rememberFocusPreset\(/);
  assert.match(popup, /rememberLimitMinutes\(/);

  const side = await read('src/sidepanel/sidepanel.js');
  assert.match(side, /if \(!state\) \{[\s\S]{0,120}still loading/);
  assert.match(side, /rememberFocusPreset\(/);
});

test('saved limits and deletions are undoable instead of asking for confirmation', async () => {
  const popup = await read('src/popup/popup.js');
  const side = await read('src/sidepanel/sidepanel.js');
  const limits = await read('src/dashboard/limits-view.js');
  assert.match(popup, /actionLabel: 'Undo'[\s\S]{0,200}DELETE_LIMIT/);
  assert.match(side, /actionLabel: 'Undo'[\s\S]{0,200}DELETE_LIMIT/);
  assert.match(limits, /label: 'Undo'[\s\S]{0,260}SAVE_LIMIT/);
  assert.doesNotMatch(limits, /confirm\(`Delete the limit/);
  // Undo restores only saved settings, never the computed usage fields.
  assert.match(limits, /function restorableLimit\(limit\)/);
});
