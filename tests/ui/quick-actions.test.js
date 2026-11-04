import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMIT_MINUTE_CHOICES,
  getLastFocusPresetId,
  getLastLimitMinutes,
  rememberFocusPreset,
  rememberLimitMinutes
} from '../../src/shared/quick-actions.js';

function fakeStorage(initial = {}) {
  const store = { ...initial };
  return { store, getItem: (key) => (key in store ? store[key] : null), setItem: (key, value) => { store[key] = String(value); } };
}
const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };

test('the last-used Focus preset is remembered and shared through one storage key', () => {
  const storage = fakeStorage();
  assert.equal(getLastFocusPresetId(storage), null);
  rememberFocusPreset('study', storage);
  assert.equal(getLastFocusPresetId(storage), 'study');
  rememberFocusPreset('', storage);
  rememberFocusPreset(null, storage);
  assert.equal(getLastFocusPresetId(storage), 'study', 'empty ids never overwrite a real choice');
});

test('the last-used limit duration is restricted to the offered choices', () => {
  assert.deepEqual([...LIMIT_MINUTE_CHOICES], [15, 30, 60]);
  const storage = fakeStorage();
  assert.equal(getLastLimitMinutes(storage), 30, 'default');
  rememberLimitMinutes(60, storage);
  assert.equal(getLastLimitMinutes(storage), 60);
  rememberLimitMinutes(7, storage);
  assert.equal(getLastLimitMinutes(storage), 60, 'an unoffered value is ignored');
  assert.equal(getLastLimitMinutes(fakeStorage({ timelensLastLimitMinutes: '999' })), 30, 'a corrupt stored value falls back to the default');
});

test('blocked storage never throws and falls back to defaults', () => {
  assert.equal(getLastFocusPresetId(blocked), null);
  assert.equal(getLastLimitMinutes(blocked), 30);
  assert.doesNotThrow(() => rememberFocusPreset('x', blocked));
  assert.doesNotThrow(() => rememberLimitMinutes(15, blocked));
  assert.equal(getLastFocusPresetId(undefined), null);
});
