import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('Home primary KPI final review rule outranks master-plan halo layout', async () => {
  const css = await read('src/styles/review-loop.css');

  assert.match(
    css,
    /html body \.kpi-primary\s*\{[\s\S]{0,360}padding-right:\s*clamp\(154px,\s*16vw,\s*196px\)/,
    'the final review layer must match or exceed master-plan specificity while reserving the TIME halo safe area'
  );

  assert.match(
    css,
    /@media\s*\(max-width:\s*600px\)[\s\S]*html body \.kpi-primary\s*\{[\s\S]{0,260}padding-right:\s*132px/,
    'mobile hero must use the same winning selector specificity while preserving the smaller halo safe area'
  );

  assert.match(
    css,
    /html body \.kpi-primary \.kpi-meta\s*\{[\s\S]{0,180}line-height:\s*1\.35/,
    'comparison copy must stay in the protected content column with stable multi-line rhythm'
  );
});