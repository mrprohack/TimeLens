import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const { send, setBusy, friendlyErrorMessage, isTransientMessagingError } = await import('../src/shared/ui.js');

function mockChrome(behavior) {
  const calls = [];
  globalThis.chrome = {
    runtime: {
      sendMessage: (message) => {
        calls.push(message);
        return behavior(calls.length, message);
      }
    }
  };
  return calls;
}

test('send resolves with the response data envelope', async () => {
  const calls = mockChrome(() => Promise.resolve({ ok: true, data: { hello: 'world' } }));
  const result = await send('GET_SNAPSHOT', { rangeDays: 1 });
  assert.deepEqual(result, { hello: 'world' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, 'GET_SNAPSHOT');
});

test('send retries transient channel failures exactly once and then succeeds', async () => {
  const calls = mockChrome((attempt) => (attempt === 1
    ? Promise.reject(new Error('Could not establish connection. Receiving end does not exist.'))
    : Promise.resolve({ ok: true, data: 42 })));
  const result = await send('GET_SNAPSHOT', {}, { retryDelayMs: 1 });
  assert.equal(result, 42);
  assert.equal(calls.length, 2);
});

test('send reports a friendly message when the retry also fails', async () => {
  const calls = mockChrome(() => Promise.reject(new Error('The message port closed before a response was received.')));
  await assert.rejects(() => send('START_FOCUS', {}, { retryDelayMs: 1 }), /waking up/);
  assert.equal(calls.length, 2);
});

test('send never retries application-level errors and keeps their message', async () => {
  const calls = mockChrome(() => Promise.resolve({ ok: false, error: 'Limit not found.' }));
  await assert.rejects(() => send('DELETE_LIMIT'), /Limit not found\./);
  assert.equal(calls.length, 1);
});

test('send times out instead of hanging forever', async () => {
  const calls = mockChrome(() => new Promise(() => {}));
  await assert.rejects(() => send('GET_SNAPSHOT', {}, { timeoutMs: 15 }), /took too long/);
  assert.equal(calls.length, 1, 'timeouts are not blindly retried');
});

test('send maps context invalidation to a reload hint without retrying', async () => {
  const calls = mockChrome(() => Promise.reject(new Error('Extension context invalidated.')));
  await assert.rejects(() => send('EXPORT_DATA'), /reloaded/);
  assert.equal(calls.length, 1);
});

test('friendlyErrorMessage and isTransientMessagingError classify known Chrome failures', () => {
  assert.equal(isTransientMessagingError(new Error('Could not establish connection. Receiving end does not exist.')), true);
  assert.equal(isTransientMessagingError(new Error('Limit not found.')), false);
  assert.match(friendlyErrorMessage(new Error('Extension context invalidated.')), /Close and reopen/);
  assert.match(friendlyErrorMessage(new Error('TimeLens messaging timeout')), /took too long/);
  assert.match(friendlyErrorMessage(new Error('Could not establish connection')), /waking up/);
  assert.equal(friendlyErrorMessage(new Error('Enter a valid website and time limit.')), 'Enter a valid website and time limit.');
});

test('setBusy toggles disabled, the spinner class, and aria-busy', () => {
  const attributes = {};
  const classes = new Set();
  const button = {
    disabled: false,
    classList: { toggle: (name, on) => { if (on) classes.add(name); else classes.delete(name); } },
    setAttribute: (name, value) => { attributes[name] = value; }
  };
  setBusy(button);
  assert.equal(button.disabled, true);
  assert.equal(attributes['aria-busy'], 'true');
  assert.ok(classes.has('is-busy'));
  setBusy(button, false);
  assert.equal(button.disabled, false);
  assert.equal(attributes['aria-busy'], 'false');
  assert.ok(!classes.has('is-busy'));
  setBusy(null, true); // must not throw
});

test('popup stays live with a ticker, busy actions, and an alert-level error surface', async () => {
  const js = await read('src/popup/popup.js');
  const html = await read('src/popup/popup.html');
  assert.match(js, /setInterval\([\s\S]*?1_000\)/);
  assert.match(js, /setBusy/);
  assert.match(js, /30 min\/day saved/);
  assert.match(js, /Limit active/);
  assert.match(html, /id=["']error-message["'][^>]*role=["']alert["']/);
});

test('side panel backs off exponentially and resets when visible again', async () => {
  const js = await read('src/sidepanel/sidepanel.js');
  assert.match(js, /BASE_POLL_MS\s*=\s*15_000/);
  assert.match(js, /MAX_POLL_MS\s*=\s*60_000/);
  assert.match(js, /2 \*\* consecutiveFailures/);
  assert.match(js, /visibilitychange/);
  assert.match(js, /setBusy/);
  assert.doesNotMatch(js, /setInterval/);
});

test('dashboard recovers empty first loads with a retry panel and busy submits', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const id of ['load-failed', 'load-failed-reason', 'load-retry']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  const js = await read('src/dashboard/dashboard.js');
  assert.match(js, /showLoadFailure/);
  assert.match(js, /setBusy\(submit\)/);
  assert.match(js, /dataset\.tone/);
  assert.doesNotMatch(js, /style\.background/);
  assert.match(js, /document\.hidden && snapshot\?\.focus/);
});

test('blocked page degrades safely and can retry live status', async () => {
  const html = await read('src/blocked/blocked.html');
  assert.match(html, /id=["']error-text["']/);
  assert.match(html, /id=["']error-retry["']/);
  assert.match(html, /role=["']alert["']/);
  const js = await read('src/blocked/blocked.js');
  assert.match(js, /renderFallback/);
  assert.match(js, /Your boundary is still active/);
});

test('shared theme loads the 1.6 polish layer with animatable rings and busy styles', async () => {
  const bridge = await read('src/shared/theme.css');
  assert.match(bridge, /ux-polish-v16\.css/);
  const css = await read('src/styles/ux-polish-v16.css');
  assert.match(css, /@property --summary-progress/);
  assert.match(css, /@property --budget-progress/);
  assert.match(css, /\.btn\.is-busy/);
  assert.match(css, /\.load-failed/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /toast\[data-tone=["']error["']\]/);
});

test('snapshot health uses a single-pass storage estimate and 1.6 plan is documented', async () => {
  const worker = await read('src/background/service-worker.js');
  assert.match(worker, /storageBytesApprox/);
  assert.doesNotMatch(worker, /TextEncoder/);
  await access(new URL('docs/superpowers/plans/2026-09-24-ux-polish-v1.6.md', root), constants.R_OK);
});
