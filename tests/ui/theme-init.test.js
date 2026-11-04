import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { APPEARANCE_STORAGE_KEY } from '../../src/shared/appearance.js';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const PAGES = [
  'src/popup/popup.html',
  'src/dashboard/dashboard.html',
  'src/sidepanel/sidepanel.html',
  'src/onboarding/onboarding.html',
  'src/blocked/blocked.html'
];

async function runThemeInit({ stored, throws = false } = {}) {
  const root = { dataset: {}, style: {} };
  const context = {
    document: { documentElement: root },
    localStorage: {
      getItem(key) {
        if (throws) throw new Error('storage blocked');
        return key === APPEARANCE_STORAGE_KEY ? stored ?? null : null;
      }
    }
  };
  vm.runInNewContext(await read('src/shared/theme-init.js'), context);
  return root;
}

test('theme-init applies an explicit saved appearance before first paint', async () => {
  for (const choice of ['dark', 'light']) {
    const root = await runThemeInit({ stored: choice });
    assert.equal(root.dataset.theme, choice);
    assert.equal(root.dataset.appearance, choice);
    assert.equal(root.style.colorScheme, choice);
  }
});

test('theme-init leaves system, unset, invalid, and blocked storage to the CSS media query', async () => {
  for (const stored of ['system', undefined, 'purple']) {
    const root = await runThemeInit({ stored });
    assert.deepEqual(root.dataset, {});
    assert.deepEqual(root.style, {});
  }
  const root = await runThemeInit({ throws: true });
  assert.deepEqual(root.dataset, {});
});

test('theme-init is a classic blocking head script that cannot drift from appearance.js', async () => {
  const source = await read('src/shared/theme-init.js');
  assert.doesNotMatch(source, /^\s*(import|export)\s/m, 'must be a classic script (no module syntax)');
  assert.ok(source.includes(`'${APPEARANCE_STORAGE_KEY}'`), 'must read the same storage key as appearance.js');

  for (const page of PAGES) {
    const html = await read(page);
    const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
    const tag = head.match(/<script\b[^>]*theme-init\.js[^>]*>/)?.[0];
    assert.ok(tag, `${page} must load theme-init.js in <head>`);
    assert.doesNotMatch(tag, /type=["']module["']|\bdefer\b|\basync\b/, `${page}: theme-init.js must block rendering`);
    assert.ok(head.indexOf('theme-init.js') < head.indexOf('rel="stylesheet"'), `${page}: theme-init.js must run before styles paint`);
  }
});
