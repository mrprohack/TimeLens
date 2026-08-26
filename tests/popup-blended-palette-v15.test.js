import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('popup uses the approved simple blended status palette in light and dark themes', async () => {
  const css = await read('src/popup/popup.css');

  assert.match(css, /--popup-tracking-bg:\s*#eef4fb/i);
  assert.match(css, /--popup-tracking-fg:\s*#4f6f91/i);
  assert.match(css, /--popup-tracking-dot:\s*#7fa4c8/i);
  assert.match(css, /--popup-ontrack-bg:\s*#d9efee/i);
  assert.match(css, /--popup-ontrack-fg:\s*#356f73/i);
  assert.match(css, /--popup-boundary-bg:\s*#f3e8d5/i);
  assert.match(css, /--popup-boundary-fg:\s*#83551f/i);
  assert.match(css, /--popup-action:\s*#4867d6/i);

  assert.match(css, /\.tracking-status\s*\{[\s\S]{0,360}background:\s*var\(--popup-tracking-bg\)[\s\S]{0,180}color:\s*var\(--popup-tracking-fg\)/i);
  assert.match(css, /\.status-dot\s*\{[\s\S]{0,220}background:\s*var\(--popup-tracking-dot\)/i);
  assert.match(css, /\.on-track-pill\s*\{[\s\S]{0,300}background:\s*var\(--popup-ontrack-bg\)[\s\S]{0,150}color:\s*var\(--popup-ontrack-fg\)/i);
  assert.match(css, /\.boundary-copy\s*\{[\s\S]{0,360}background:\s*var\(--popup-boundary-bg\)[\s\S]{0,150}color:\s*var\(--popup-boundary-fg\)/i);
  assert.match(css, /\.primary-actions \.btn-primary\s*\{[\s\S]{0,260}background:\s*var\(--popup-action\)/i);

  assert.match(css, /html\[data-theme="dark"\][\s\S]{0,1000}--popup-tracking-bg:\s*#1d2b3a/i);
  assert.match(css, /html\[data-theme="dark"\][\s\S]{0,1000}--popup-ontrack-bg:\s*#193634/i);
  assert.match(css, /html\[data-theme="dark"\][\s\S]{0,1000}--popup-boundary-bg:\s*#382f25/i);
  assert.match(css, /html\[data-theme="dark"\][\s\S]{0,1000}--popup-action:\s*#5268c9/i);
});
