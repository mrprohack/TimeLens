import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = async (path) => readFile(new URL(path, root), 'utf8').catch(() => '');

// Every stylesheet that ships with the extension. The generated one is
// included: it is tracked and it is what the browser loads.
const SHIPPED_STYLESHEETS = [
  'src/shared/theme.css',
  'src/styles/timelens.css',
  'src/styles/tailwind.css',
  'src/styles/precision-polish.css',
  'src/styles/appearance.css',
  'src/styles/appearance-contrast.css',
  'src/styles/master-plan.css',
  'src/styles/review-loop.css',
  'src/styles/ux-polish-v16.css',
  'src/styles/ux-polish-v17.css',
  'src/dashboard/dashboard.css',
  'src/popup/popup.css',
  'src/sidepanel/sidepanel.css',
  'src/blocked/blocked.css',
  'src/onboarding/onboarding.css',
];

// Strip comments so braces inside them cannot confuse the parser.
const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

// The body of every `@media (prefers-color-scheme: dark)` block in a file.
function darkBlocks(css) {
  const source = withoutComments(css);
  const blocks = [];
  const pattern = /@media\s*\(prefers-color-scheme\s*:\s*dark\)/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    let index = match.index + match[0].length;
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (source[index] !== '{') continue;
    let depth = 0;
    for (let i = index; i < source.length; i += 1) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          blocks.push(source.slice(index + 1, i));
          break;
        }
      }
    }
  }
  return blocks;
}

// The selector of every rule in a block.
function ruleSelectors(block) {
  const selectors = [];
  let index = 0;
  while (index < block.length) {
    const brace = block.indexOf('{', index);
    if (brace === -1) break;
    const selector = block.slice(index, brace).trim();
    let depth = 0;
    let end = brace;
    for (; end < block.length; end += 1) {
      if (block[end] === '{') depth += 1;
      else if (block[end] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (selector && !selector.startsWith('@')) selectors.push(selector);
    index = end + 1;
  }
  return selectors;
}

// Split a selector list on the commas that separate rules, not the ones
// inside :is() or :not().
function splitSelectorList(selector) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const character of selector) {
    if (character === '(') depth += 1;
    else if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += character;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

// A rule that must not run when the user has chosen the Light theme.
const LIGHT_GUARD = /:not\(\s*\[data-theme\s*=\s*["']?light["']?\s*\]\s*\)/;
// A rule that must not run at all once a theme has been resolved.
const ANY_THEME_GUARD = /:not\(\s*\[data-theme\]\s*\)/;

const isScopedFromLight = (selector) => LIGHT_GUARD.test(selector) || ANY_THEME_GUARD.test(selector);

test('appearance controller supports persisted light dark and system preferences', async () => {
  const source = await read('src/shared/appearance.js');
  assert.match(source, /timelensAppearance/);
  for (const value of ['light', 'dark', 'system']) assert.match(source, new RegExp(`['"]${value}['"]`));
  assert.match(source, /localStorage/);
  assert.match(source, /matchMedia\(['"]\(prefers-color-scheme: dark\)['"]\)/);
  assert.match(source, /dataset\.theme/);
  assert.match(source, /addEventListener(?:\?\.)?\(['"]change['"]/);
});

test('shared UI initializes appearance on dashboard popup side panel blocked and onboarding surfaces', async () => {
  const ui = await read('src/shared/ui.js');
  assert.match(ui, /appearance\.js/);
  assert.match(ui, /initializeAppearance/);

  for (const path of [
    'src/dashboard/dashboard.js',
    'src/popup/popup.js',
    'src/sidepanel/sidepanel.js',
    'src/blocked/blocked.js',
    'src/onboarding/onboarding.js'
  ]) {
    const source = await read(path);
    assert.match(source, /shared\/ui\.js/, `${path} must keep using shared UI so appearance initializes there`);
  }
});

test('settings exposes an immediate Light Dark System appearance chooser', async () => {
  const source = await read('src/dashboard/settings-view.js');
  assert.match(source, /Appearance/);
  for (const value of ['light', 'dark', 'system']) {
    assert.match(source, new RegExp(`value=[\\"']${value}[\\"']`));
  }
  assert.match(source, /getAppearancePreference/);
  assert.match(source, /setAppearancePreference/);
  assert.match(source, /name=[\\"']appearance[\\"']/);
});

test('final appearance layers explicitly fix v2 dark surfaces after legacy page CSS', async () => {
  const bridge = await read('src/shared/theme.css');
  const css = await read('src/styles/appearance.css');
  const review = await read('src/styles/review-loop.css');
  assert.match(bridge, /appearance\.css/);
  assert.match(bridge, /review-loop\.css/);
  assert.doesNotMatch(bridge, /appearance-contrast\.css/);
  assert.match(css, /html\[data-theme=["']dark["']\]/);
  for (const selector of ['.app-header', '.kpi-primary', '.analytics-card', '.focus-simple', '.settings-card', '.history-drawer', '.dialog-panel', '.today-summary', '.side-shell']) {
    assert.match(css, new RegExp(selector.replace('.', '\\.')));
  }
  assert.match(review, /\[data-theme=["']dark["']\] body/);
  assert.match(css, /--surface-raised:/);
  assert.match(css, /--text:/);
  assert.match(css, /--line:/);
});

test('manual light mode wins over OS-dark media styles and blocked page has a light treatment', async () => {
  const css = await read('src/styles/appearance.css');
  assert.match(css, /html\[data-theme=["']light["']\]/);
  assert.match(css, /html\[data-theme=["']light["']\] body:has\(\.blocked-shell\)/);
  assert.match(css, /html\[data-theme=["']light["']\] body \.blocked-shell/);
  assert.match(css, /color-scheme:\s*light/);
  assert.match(css, /color-scheme:\s*dark/);
});

test('no operating-system dark rule can override a manually chosen Light theme', async () => {
  // A user whose OS prefers dark but who picks Light in the settings still
  // gets the light theme. The prefers-color-scheme: dark blocks used to apply
  // anyway, which put a dark foreground on a light background and failed WCAG
  // AA. Every rule inside such a block has to be scoped so it cannot run when
  // the theme is Light.
  const unguarded = [];
  let blocksSeen = 0;

  for (const path of SHIPPED_STYLESHEETS) {
    const css = await read(path);
    for (const block of darkBlocks(css)) {
      blocksSeen += 1;
      for (const rule of ruleSelectors(block)) {
        for (const selector of splitSelectorList(rule)) {
          if (!isScopedFromLight(selector)) unguarded.push(`${path}: ${selector}`);
        }
      }
    }
  }

  assert.ok(blocksSeen > 0, 'expected dark media blocks in the shipped stylesheets');
  assert.deepEqual(
    unguarded,
    [],
    'these operating-system dark rules can still apply under a manual Light theme: '
      + unguarded.join(', '),
  );
});

test('the manual light theme sets a foreground for every element a dark media query also styles', async () => {
  // A dark OS plus a manually chosen Light theme must not leave a dark-theme
  // foreground on a light background: that failed WCAG AA on .current-time-pill
  // (1.88:1) until the light rule was given an explicit colour.
  //
  // For every selector the dark media query styles, the light override has to
  // set colour as well as background.
  const polish = await read('src/styles/precision-polish.css');
  const appearance = await read('src/styles/appearance.css');

  const darkBlocks = [...polish.matchAll(/@media \(prefers-color-scheme: dark\) \{([\s\S]*?)\n\}/g)]
    .map((match) => match[1])
    .join('\n');
  assert.ok(darkBlocks.length > 0, 'expected dark media blocks in precision-polish.css');

  // Selectors the dark media query gives a colour to.
  const darkColourSelectors = new Set();
  for (const rule of darkBlocks.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, selectorList, body] = rule;
    if (!/(^|;|\s)color\s*:/.test(body)) continue;
    for (const selector of selectorList.split(',')) {
      const trimmed = selector.trim();
      if (!trimmed || trimmed.startsWith(':root') || trimmed.startsWith('@')) continue;
      const className = trimmed.match(/\.([a-zA-Z][\w-]*)/)?.[1];
      if (className) darkColourSelectors.add(className);
    }
  }
  assert.ok(darkColourSelectors.size > 0, 'expected the dark media blocks to style element colours');

  const lightBlock = appearance;

  const missing = [];
  for (const className of darkColourSelectors) {
    const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Every light-theme rule that styles this class must set a colour when the
    // dark media query sets one for the same class.
    const lightRules = [...lightBlock.matchAll(
      new RegExp(
        `html\\[data-theme=["']light["']\\][^{}]*\\.${escaped}\\b[^{}]*\\{([^}]*)\\}`,
        'g',
      ),
    )];
    if (!lightRules.length) continue; // the light theme never styles it, so nothing to fix
    // The class needs a foreground somewhere in the light theme. It may be set by
    // the same rule that sets the background or by a separate one, so collect the
    // declarations across every rule that matches the class.
    const declarations = lightRules.map((rule) => rule[1]).join(';');
    if (!/(^|;|\s)color\s*:/.test(declarations)) {
      missing.push(className);
    }
  }

  assert.deepEqual(
    missing,
    [],
    `light theme sets a background but no foreground for: ${missing.join(', ')}`,
  );
});

test('dark mode forces page chrome and analytics headings onto readable dark colors', async () => {
  const css = `${await read('src/styles/appearance.css')}\n${await read('src/styles/review-loop.css')}`;
  assert.match(css, /\[data-theme=["']dark["']\] body\s*\{[\s\S]{0,240}background:\s*var\(--bg\)[\s\S]{0,160}color:\s*var\(--text\)/);
  assert.match(css, /\[data-theme=["']dark["']\] \.section-heading-row h2\s*,|\[data-theme=["']dark["']\] \.section-heading-row h2\s*\{/);
});

test('dark popup and side panel force a dark page canvas without important overrides', async () => {
  const css = await read('src/styles/review-loop.css');
  assert.match(css, /\[data-theme=["']dark["']\] body:has\(\.popup-shell\)/);
  assert.match(css, /\[data-theme=["']dark["']\] body:has\(\.side-shell\)/);
  assert.match(css, /background:\s*#0b1020/);
  assert.doesNotMatch(css, /!important/);
});

test('settings preview includes the three appearance choices for screenshot review', async () => {
  const preview = await read('preview/settings.html');
  assert.match(preview, /appearance-options/);
  for (const value of ['light', 'dark', 'system']) {
    assert.match(preview, new RegExp(`value=[\\"']${value}[\\"']`));
  }
});

test('CI captures explicit light dark and system appearance screenshots', async () => {
  const workflow = await read('.github/workflows/ci.yml');
  assert.match(workflow, /preview-light/);
  assert.match(workflow, /preview-dark/);
  for (const shot of [
    'home-light-desktop', 'home-dark-desktop', 'home-dark-mobile',
    'settings-light-desktop', 'settings-dark-desktop', 'settings-dark-mobile',
    'settings-system-desktop', 'popup-dark', 'sidepanel-dark', 'blocked-dark'
  ]) {
    assert.match(workflow, new RegExp(shot));
  }
});
