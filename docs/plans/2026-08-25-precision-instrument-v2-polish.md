# TimeLens Precision Instrument v2 Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade PR #6 with the approved Precision Time Instrument v2 UX/UI polish across every user-facing surface while preserving all TimeLens runtime behavior.

**Architecture:** Keep the existing HTML/CSS/vanilla-JS extension architecture. Use `src/styles/precision-polish.css` as the centralized visual override layer, change markup only for hierarchy/accessibility while preserving runtime IDs, and extend development-only `preview/` pages for deterministic visual QA. Runtime, storage, permissions, schema, background logic and enforcement remain untouched.

**Tech Stack:** Chrome Extension Manifest V3, HTML, CSS, vanilla JavaScript, Tailwind CSS 4.3.3 compiled locally, Node.js 22 test runner, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-25-precision-instrument-v2-polish-design.md`

## Global Constraints

- Preserve dashboard destinations: Home, Limits, Focus, Settings.
- Usage History remains secondary.
- Preserve schema v4, permissions and all background/core behavior.
- Add no backend, telemetry, accounts, remote runtime code, content scripts, history/cookies/host/webRequest permissions.
- Do not invent unsupported production metrics.
- Preserve dark mode and reduced-motion support.
- Preserve progressive disclosure for advanced controls.
- Maintain >=44px primary mobile touch targets.
- No horizontal scrolling at 390px dashboard width, popup width, or Side Panel width.
- Do not weaken release/security tests.

---

### Task 1: Lock v2 visual contracts with RED tests

**Files:**
- Modify: `tests/polish-ui-v15.test.js`

**Interfaces:**
- Consumes: existing HTML/CSS source files.
- Produces: source-contract tests that require v2 hero hierarchy, tabular time numerals, accessible focus-visible styling, per-page polish hooks, mobile safe area and unchanged runtime action IDs.

- [ ] **Step 1: Add failing source-contract tests**

Add tests that read `src/dashboard/dashboard.html`, `src/popup/popup.html`, `src/sidepanel/sidepanel.html`, `src/blocked/blocked.html` and `src/styles/precision-polish.css`, then assert:

```js
test('v2 gives home one dominant time instrument and quieter supporting KPI surfaces', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const css = await polish();
  assert.match(html, /kpi-card panel kpi-primary/);
  assert.match(css, /\.kpi-primary[\s\S]{0,1200}grid-column:\s*span\s*2/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
});

test('v2 exposes a shared visible keyboard focus treatment', async () => {
  const css = await polish();
  assert.match(css, /:focus-visible/);
  assert.match(css, /--focus-ring:/);
});

test('v2 preserves production action hooks on popup side panel and blocked state', async () => {
  const popup = await read('src/popup/popup.html');
  const side = await read('src/sidepanel/sidepanel.html');
  const blocked = await read('src/blocked/blocked.html');
  for (const id of ['focus-toggle', 'limit-current-site', 'open-dashboard']) assert.match(popup, new RegExp(`id="${id}"`));
  for (const id of ['side-limit-site', 'side-focus-action', 'side-open-dashboard']) assert.match(side, new RegExp(`id="${id}"`));
  for (const id of ['close-tab', 'open-dashboard', 'allowance-actions']) assert.match(blocked, new RegExp(`id="${id}"`));
});

test('v2 has explicit page polish for limits focus settings popup side panel and blocked state', async () => {
  const css = await polish();
  for (const selector of ['.workspace-card', '.focus-simple', '.settings-card', '.popup-shell', '.side-shell', '.blocked-shell']) {
    assert.match(css, new RegExp(selector.replace('.', '\\\.')));
  }
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/polish-ui-v15.test.js`
Expected: FAIL specifically because v2 grid span, focus ring and page-specific selectors are not all present yet.

- [ ] **Step 3: Commit RED tests**

```bash
git add tests/polish-ui-v15.test.js
git commit -m "test: define precision instrument v2 contracts"
```

---

### Task 2: Upgrade shared visual grammar and Dashboard Home

**Files:**
- Modify: `src/styles/precision-polish.css`
- Modify only if needed for semantic grouping: `src/dashboard/dashboard.html`
- Test: `tests/polish-ui-v15.test.js`

**Interfaces:**
- Consumes: existing dashboard classes and IDs.
- Produces: v2 tokens and Home hero/supporting-card hierarchy without JS changes.

- [ ] **Step 1: Implement the minimum shared tokens and Home rules to satisfy the RED contracts**

Add/normalize tokens in `:root`:

```css
--surface-hero: #fff;
--surface-panel: #fff;
--surface-inset: #f4f7fd;
--line-strong: rgba(34, 48, 79, .14);
--shadow-compact: 0 1px 3px rgba(32, 47, 88, .04);
--radius-sm: 10px;
--radius-md: 14px;
--radius-lg: 18px;
--radius-hero: 24px;
--focus-ring: 0 0 0 3px rgba(49, 87, 255, .22);
```

Add a shared keyboard-focus contract:

```css
html body :is(button, a, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--time-blue);
  outline-offset: 2px;
  box-shadow: var(--focus-ring);
}
```

Make `.kpi-primary` span two columns at desktop widths and use tabular numerals on time-bearing values. Keep the other KPI cards visually quieter with compact elevation. Preserve mobile rules so the hero returns to one full row without overflow.

- [ ] **Step 2: Run the focused test and verify GREEN**

Run: `node --test tests/polish-ui-v15.test.js`
Expected: PASS.

- [ ] **Step 3: Refine Home without changing runtime hooks**

Polish navigation, hero geometry, current-site row, analytics cards, ranked sites, trend bars and recent sessions using existing classes. Do not rename or remove any IDs used by `home-view.js`.

- [ ] **Step 4: Run UI and release regressions**

Run: `node --test tests/ui.test.js tests/premium-ui-v15.test.js tests/polish-ui-v15.test.js tests/release.test.js`
Expected: PASS.

- [ ] **Step 5: Commit Home/shared polish**

```bash
git add src/styles/precision-polish.css src/dashboard/dashboard.html tests/polish-ui-v15.test.js
git commit -m "feat: refine dashboard precision instrument hierarchy"
```

---

### Task 3: Polish Limits, Focus, Settings, History and dialogs

**Files:**
- Modify: `src/styles/precision-polish.css`
- Modify only if hierarchy/accessibility requires it: `src/dashboard/dashboard.html`
- Test: `tests/polish-ui-v15.test.js`

**Interfaces:**
- Consumes: existing `.workspace-card`, `.focus-simple`, `.settings-card`, `.history-drawer`, `.dialog-panel` and disclosure structures.
- Produces: consistent page-specific hierarchy while preserving all dialog, disclosure and action IDs.

- [ ] **Step 1: Add RED assertions for secondary dashboard surfaces**

Extend the polish test with source contracts for:

```js
assert.match(css, /\.workspace-card[\s\S]{0,700}border-radius:\s*var\(--radius-lg\)/);
assert.match(css, /\.focus-simple[\s\S]{0,900}text-align:\s*center/);
assert.match(css, /\.settings-card[\s\S]{0,700}box-shadow:\s*var\(--shadow-compact\)/);
assert.match(css, /\.history-drawer[\s\S]{0,900}position:/);
assert.match(css, /\.dialog-panel[\s\S]{0,900}border-radius:\s*var\(--radius-hero\)/);
```

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --test tests/polish-ui-v15.test.js`
Expected: FAIL on the new v2 selectors/properties.

- [ ] **Step 3: Implement page polish**

Add precise v2 rules:
- Limits: quiet workspace cards, stronger data rows, Add limit remains dominant.
- Focus: centered instrument, larger tabular timer, duration chips directly beneath state, strong primary action.
- Settings: compact low-elevation cards, aligned controls, separated destructive data action.
- History: inspection-style drawer, aligned columns, stronger active tab, full-height mobile sheet.
- Dialogs: one radius/spacing/footer grammar and narrow-screen bottom-sheet behavior.

Do not change JS behavior or advanced-control disclosure defaults.

- [ ] **Step 4: Run focused + full regressions**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit secondary dashboard polish**

```bash
git add src/styles/precision-polish.css src/dashboard/dashboard.html tests/polish-ui-v15.test.js
git commit -m "feat: polish limits focus settings and overlays"
```

---

### Task 4: Polish popup, Side Panel and blocked state

**Files:**
- Modify: `src/styles/precision-polish.css`
- Modify only if semantic grouping is needed: `src/popup/popup.html`
- Modify only if semantic grouping is needed: `src/sidepanel/sidepanel.html`
- Modify only if semantic grouping is needed: `src/blocked/blocked.html`
- Test: `tests/polish-ui-v15.test.js`

**Interfaces:**
- Consumes: existing action IDs and page-specific CSS classes.
- Produces: compact popup, current-site-led Side Panel and calm blocked page with the same visual grammar.

- [ ] **Step 1: Add RED assertions for compact surfaces**

Add contracts requiring v2 surface treatment and no hook removal, including `.popup-shell .today-summary`, `.side-shell .current-panel`, `.side-shell .quick-panel`, `.blocked-message` and mobile-safe button sizing.

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --test tests/polish-ui-v15.test.js`
Expected: FAIL on new compact-surface properties.

- [ ] **Step 3: Implement compact-surface polish**

Popup: Today/current-site instrument dominates; facts quiet; Focus primary; Limit secondary; compact top-sites; Dashboard footer primary.

Side Panel: current site dominates; quick-limit fields align; Focus stays strong but secondary; dashboard link quiet.

Blocked: central boundary message, shorter text line length, grouped usage context, Close tab primary, dashboard secondary, allowance optional.

Keep all production IDs unchanged.

- [ ] **Step 4: Run regressions and validator**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 5: Commit compact surfaces**

```bash
git add src/styles/precision-polish.css src/popup/popup.html src/sidepanel/sidepanel.html src/blocked/blocked.html tests/polish-ui-v15.test.js
git commit -m "feat: unify compact TimeLens surfaces"
```

---

### Task 5: Extend deterministic preview coverage and capture every requested page

**Files:**
- Modify: `preview/dashboard.html`
- Create: `preview/limits.html`
- Create: `preview/focus.html`
- Create: `preview/settings.html`
- Create: `preview/history.html`
- Create: `preview/sidepanel.html`
- Create: `preview/dialog.html`
- Modify if needed: `preview/popup.html`
- Modify if needed: `preview/blocked.html`
- Modify: `tests/polish-ui-v15.test.js`
- Modify: `.github/workflows/ci.yml` only if automated screenshot artifact capture is needed.

**Interfaces:**
- Consumes: production CSS only; no production JS/runtime.
- Produces: stable static fixtures representing all screenshot states.

- [ ] **Step 1: Add RED tests for preview matrix**

```js
test('preview harness covers the full v2 screenshot matrix', async () => {
  for (const path of [
    'preview/dashboard.html', 'preview/limits.html', 'preview/focus.html',
    'preview/settings.html', 'preview/history.html', 'preview/popup.html',
    'preview/sidepanel.html', 'preview/blocked.html', 'preview/dialog.html'
  ]) {
    const html = await read(path);
    assert.match(html, /src\/shared\/theme\.css|\.\.\/src\/shared\/theme\.css/);
  }
});
```

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --test tests/polish-ui-v15.test.js`
Expected: FAIL because the new preview files do not yet exist.

- [ ] **Step 3: Create static deterministic preview fixtures**

Mirror production class names and representative real-supported metrics. Do not load production JavaScript. Every preview must link `../src/shared/theme.css` plus the relevant page CSS so screenshots exercise the exact production styles.

- [ ] **Step 4: Run focused test and verify GREEN**

Run: `node --test tests/polish-ui-v15.test.js`
Expected: PASS.

- [ ] **Step 5: Run full verification**

Run: `npm run check && npm run package`
Expected: all tests and validator PASS; preview files remain excluded from `dist/timelens-1.5.0.zip`.

- [ ] **Step 6: Capture and visually inspect screenshots**

Capture at minimum:
- Home desktop 1440x1000
- Home mobile 390x844
- Limits desktop 1440x1000
- Limits mobile 390x844
- Focus desktop 1440x900
- Focus mobile 390x844
- Settings desktop 1440x1000
- Settings mobile 390x844
- History desktop 1440x900
- Popup 360x600
- Side Panel representative narrow width
- Blocked 1440x900
- Dialog desktop and mobile

Reject and fix any screenshot with clipping, horizontal overflow, hidden primary actions, weak hierarchy or inconsistent spacing.

- [ ] **Step 7: Commit preview/QA harness**

```bash
git add preview tests/polish-ui-v15.test.js .github/workflows/ci.yml
git commit -m "test: expand precision v2 visual qa matrix"
```

---

### Task 6: Final verification and PR readiness

**Files:**
- Modify: PR description only after verification evidence is available.

**Interfaces:**
- Consumes: final branch and screenshot artifacts.
- Produces: verified PR update; does not merge.

- [ ] **Step 1: Run final verification from a clean checkout/worktree**

Run: `npm ci && npm run check && npm run package`
Expected: PASS with zero test failures and validator success.

- [ ] **Step 2: Confirm CI on final head**

Verify the GitHub Actions run for the final head concludes `success`.

- [ ] **Step 3: Review screenshots one final time**

Confirm all required dimensions/states are present and no visual acceptance criterion is violated.

- [ ] **Step 4: Update PR #6 summary**

Document changed files, test count, final CI run, package artifact details and screenshot coverage. Preserve the instruction not to merge until explicitly approved.
