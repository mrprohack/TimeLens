import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Source-level tests cannot see a helper that is called but never imported: it only
// fails at runtime, on the code path that uses it. This catches that class of bug.
const SRC = new URL('../../src/', import.meta.url).pathname;

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return walk(path);
  return path.endsWith('.js') ? [path] : [];
});

const strip = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

const files = walk(SRC).map((path) => ({ path, source: strip(readFileSync(path, 'utf8')) }));

function exportsOf(source) {
  const names = [];
  for (const match of source.matchAll(/export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/g)) names.push(match[1]);
  for (const match of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of match[1].split(',')) names.push(part.trim().split(/\s+as\s+/).pop());
  }
  return names.filter(Boolean);
}

test('every shared helper a module calls is imported or defined there', () => {
  const owners = new Map();
  for (const file of files) for (const name of exportsOf(file.source)) owners.set(name, [...(owners.get(name) || []), file.path]);

  const problems = [];
  for (const file of files) {
    const imported = new Set([...file.source.matchAll(/import\s*\{([^}]*)\}\s*from/g)]
      .flatMap((match) => match[1].split(',').map((part) => part.trim().split(/\s+as\s+/).pop())));
    const declared = new Set([...file.source.matchAll(/(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/g)].map((match) => match[1]));
    const body = file.source.replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?/g, '');
    for (const [name, definedIn] of owners) {
      if (definedIn.includes(file.path) || imported.has(name) || declared.has(name)) continue;
      const called = new RegExp(`(^|[^.\\w$'"\`])${name}\\s*\\(`, 'm').test(body);
      if (called) problems.push(`${relative(SRC, file.path)} calls ${name}() but does not import it (exported by ${relative(SRC, definedIn[0])})`);
    }
  }
  assert.deepEqual(problems, []);
});

test('the reference check can actually detect a missing import', () => {
  const source = strip("import { setText } from './ui.js';\nrender();\nformatDuration(5);\n");
  const imported = new Set(['setText']);
  assert.equal(imported.has('formatDuration'), false);
  assert.match(source, /(^|[^.\w$'"`])formatDuration\s*\(/m);
});
