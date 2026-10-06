import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p) => readFile(new URL(`../../${p}`, import.meta.url), 'utf8');

test('1.7 polish layer is loaded and respects motion, touch, and contrast needs', async () => {
  assert.match(await read('src/shared/theme.css'), /ux-polish-v17\.css/);
  const css = await read('src/styles/ux-polish-v17.css');
  assert.match(css, /timelens-pulse/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
