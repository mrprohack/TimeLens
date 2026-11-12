import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const text = (path) => readFile(new URL(path, root), 'utf8');

test('CI runs the accessibility matrix against a dark-preferring system too', async () => {
  const workflow = await text('.github/workflows/ci.yml');
  // The light theme has to hold up against a dark background: a user whose OS
  // prefers dark but who picks Light still gets the manual light theme. Without a
  // dark-scheme pass, a light rule that sets only a background left the dark
  // foreground in place and failed WCAG AA on the current-time pill.
  assert.match(
    workflow,
    /blink-settings=preferredColorScheme=0/,
    'CI must exercise the matrix with the browser forced to prefer dark',
  );
  // Both themed fixtures are audited under the dark scheme, not just the light one.
  const darkPass = workflow.match(/DARK_SCHEME="[^"]*"[\s\S]*?(?=\n\s*- name:)/)?.[0] || '';
  assert.match(darkPass, /axe-light-\$page/, 'the light fixture must be audited under a dark scheme');
  assert.match(darkPass, /axe-dark-\$page/, 'the dark fixture must be audited under a dark scheme');
});
