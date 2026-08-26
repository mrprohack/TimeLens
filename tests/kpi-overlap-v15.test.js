import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('Home primary KPI reserves the TIME halo area for long comparison copy', async () => {
  const css = await read('src/styles/review-loop.css');

  assert.match(
    css,
    /body \.kpi-primary\s*\{[\s\S]{0,360}padding-right:\s*clamp\(154px,\s*16vw,\s*196px\)/,
    'the final review layer must restore a dedicated right-side safe area for the TIME halo'
  );

  assert.match(
    css,
    /@media\s*\(max-width:\s*600px\)[\s\S]*body \.kpi-primary\s*\{[\s\S]{0,260}padding-right:\s*132px/,
    'mobile hero must preserve the smaller halo safe area instead of letting copy flow beneath it'
  );

  assert.match(
    css,
    /body \.kpi-primary \.kpi-meta\s*\{[\s\S]{0,180}line-height:\s*1\.35/,
    'comparison copy must have a stable multi-line rhythm when it needs to wrap'
  );
});
