import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('mobile Home renders Today as quiet context instead of a full-width control', async () => {
  const css = await read('src/styles/review-loop.css');
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*body \.period-context\s*\{[\s\S]{0,220}width:\s*auto/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*body \.period-context\s*\{[\s\S]{0,260}border:\s*0/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*body \.period-context\s*\{[\s\S]{0,320}background:\s*transparent/);
});

test('Limits preview uses the same row-menu action affordance as production', async () => {
  const preview = await read('preview/limits.html');
  const menus = preview.match(/class="row-menu"/g) || [];
  assert.equal(menus.length, 3);
  assert.doesNotMatch(preview, /class="icon-button">•••<\/button>/);
});
