# TimeLens Master Plan UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved TimeLens UX/UI Master Plan image closely across Home, Limits, Focus, Settings, Usage History, Popup, Side Panel, Blocked Page, and dialogs without changing TimeLens runtime/privacy behavior.

**Architecture:** Keep the existing HTML/JavaScript application structure and action hooks. Implement the redesign through shared design tokens plus focused page-level markup/CSS changes, preserving runtime IDs and data flow. Use one UI contract test file to lock cross-surface structure and one deterministic preview/CI pipeline for visual acceptance.

**Tech Stack:** Chrome Extension Manifest V3, HTML, CSS, vanilla ES modules, Tailwind CSS 4.3.3 local CLI build, Node 22 `node:test`, GitHub Actions headless Chromium screenshots.

**Spec:** `docs/superpowers/specs/2026-08-25-master-plan-ui-redesign-design.md`

## Global Constraints

- Keep schema v4.
- Keep permissions exactly: `tabs`, `storage`, `idle`, `alarms`, `notifications`, `sidePanel`.
- Add no host permissions, content scripts, cookies access, browsing-history access, remote runtime code, backend, accounts, telemetry, or cloud sync.
- Preserve existing action hooks, IDs, message types, storage keys, Focus Mode semantics, limit semantics, blocked-page enforcement, and tracking calculations.
- Prefer existing JavaScript unchanged. JavaScript may change only when safe markup restructuring requires a render adjustment.
- Keep Light, Dark, and System appearance behavior through the existing shared appearance controller.
- No horizontal scrolling at 390 px width.
- Preserve reduced-motion and visible keyboard focus behavior.
- PR #6 stays open and unmerged.

---

## File Structure

- `src/styles/master-plan.css` — new final shared presentation layer for the master-plan redesign; loaded after existing precision/appearance layers so the approved design is explicit and centralized.
- `src/shared/theme.css` — import `master-plan.css` last.
- `src/dashboard/dashboard.html` — retain runtime IDs while refining semantic grouping/classes for the five dashboard surfaces.
- `src/dashboard/dashboard.css` — keep layout/runtime compatibility rules; page-specific legacy values remain but master-plan overrides become authoritative.
- `src/popup/popup.html`, `src/popup/popup.css` — retain already-polished compact structure and align details to the shared system.
- `src/sidepanel/sidepanel.html`, `src/sidepanel/sidepanel.css` — strengthen current-site priority and quick-action hierarchy.
- `src/blocked/blocked.html`, `src/blocked/blocked.css` — match the master-plan dark boundary card while preserving safe existing actions.
- `preview/*.html` — deterministic visual states mirroring production classes.
- `tests/master-plan-ui-v15.test.js` — new cross-surface source contracts added before each implementation group.
- `.github/workflows/ci.yml` — expand screenshot matrix to all required Light/Dark mobile/desktop states.

---

### Task 1: Shared master-plan design system and dashboard shell

**Files:**
- Create: `tests/master-plan-ui-v15.test.js`
- Create: `src/styles/master-plan.css`
- Modify: `src/shared/theme.css`
- Modify: `src/dashboard/dashboard.html`

**Interfaces:**
- Consumes: existing variables from `tailwind.css`, `precision-polish.css`, and `appearance.css` (`--bg`, `--surface-raised`, `--text`, `--muted`, `--line`, `--brand`).
- Produces: shared master-plan selectors/tokens used by every later task, including `--mp-page-max`, `--mp-rail-width`, `--mp-card-radius`, `--mp-card-shadow`, `.mp-page-heading`, `.mp-primary-instrument`, `.mp-workspace-card`, `.mp-compact-card`.

- [ ] **Step 1: Write the failing shared-system test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('master plan layer is loaded last and defines the shared product shell', async () => {
  const bridge = await read('src/shared/theme.css');
  const css = await read('src/styles/master-plan.css');
  assert.ok(bridge.indexOf('master-plan.css') > bridge.indexOf('appearance-contrast.css'));
  for (const token of ['--mp-page-max:', '--mp-rail-width:', '--mp-card-radius:', '--mp-card-shadow:']) {
    assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const selector of ['.mp-page-heading', '.mp-primary-instrument', '.mp-workspace-card', '.mp-compact-card']) {
    assert.match(css, new RegExp(selector.replace('.', '\\.')));
  }
});

test('dashboard keeps four primary destinations and secondary history in the master plan shell', async () => {
  const html = await read('src/dashboard/dashboard.html');
  for (const view of ['home', 'limits', 'focus', 'settings']) assert.match(html, new RegExp(`data-dashboard-view="${view}"`));
  assert.match(html, /id="sidebar-history"/);
  assert.match(html, /class="[^"]*mp-dashboard-shell/);
});
```

- [ ] **Step 2: Run RED**

Run: `npm run check`

Expected: FAIL because `src/styles/master-plan.css`, master-plan tokens, and `.mp-dashboard-shell` do not exist yet.

- [ ] **Step 3: Implement the shared layer and shell classes**

Create `src/styles/master-plan.css` beginning with:

```css
:root {
  --mp-page-max: 1220px;
  --mp-rail-width: 236px;
  --mp-card-radius: 18px;
  --mp-card-shadow: 0 10px 30px rgba(35, 52, 96, .055);
  --mp-card-border: color-mix(in srgb, var(--line) 88%, transparent);
  --mp-section-gap: 16px;
}

html body .mp-dashboard-shell {
  width: min(var(--mp-page-max), calc(100% - 48px));
}

html body .mp-page-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

html body .mp-primary-instrument,
html body .mp-workspace-card,
html body .mp-compact-card {
  border: 1px solid var(--mp-card-border);
  border-radius: var(--mp-card-radius);
  background: var(--surface-raised);
  box-shadow: var(--mp-card-shadow);
}

html body .mp-primary-instrument { box-shadow: 0 18px 48px rgba(49, 87, 255, .11); }
html body .mp-compact-card { border-radius: 14px; box-shadow: 0 6px 18px rgba(35, 52, 96, .045); }
```

Append to `src/shared/theme.css`:

```css
@import "../styles/master-plan.css";
```

Add `mp-dashboard-shell` to `<main class="dashboard-shell">` and `mp-page-heading` to dashboard page-heading containers without changing IDs or `data-dashboard-view` attributes.

- [ ] **Step 4: Run GREEN**

Run: `npm run check`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/master-plan-ui-v15.test.js src/styles/master-plan.css src/shared/theme.css src/dashboard/dashboard.html
git commit -m "feat: establish TimeLens master-plan design system"
```

---

### Task 2: Home Dashboard master-plan hierarchy

**Files:**
- Modify: `tests/master-plan-ui-v15.test.js`
- Modify: `src/dashboard/dashboard.html`
- Modify: `src/styles/master-plan.css`
- Modify if structurally necessary only: `src/dashboard/home-view.js`

**Interfaces:**
- Consumes: existing Home IDs (`home-today-total`, `home-site-count`, `home-budget-kpi`, `home-current-site`, `home-current-time`, `home-add-limit`, `home-open-side-panel`, `home-breakdown`, `home-top-sites`, `home-attention`, `home-usage-trend`, `home-recent`).
- Produces: master-plan Home layout classes `.mp-home-overview`, `.mp-home-primary`, `.mp-home-support`, `.mp-current-site`, `.mp-analytics-grid`.

- [ ] **Step 1: Add failing Home contracts**

```js
test('home matches the master plan hierarchy without inventing metrics', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const css = await read('src/styles/master-plan.css');
  assert.match(html, /class="[^"]*mp-home-overview/);
  assert.match(html, /class="[^"]*mp-home-primary/);
  assert.match(html, /class="[^"]*mp-current-site/);
  assert.match(css, /\.mp-home-overview\s*\{[\s\S]{0,300}grid-template-columns:\s*minmax\(0,\s*1\.7fr\)\s+repeat\(2,\s*minmax\(0,\s*\.65fr\)\)/);
  for (const id of ['home-today-total','home-site-count','home-budget-kpi','home-breakdown','home-top-sites','home-attention','home-usage-trend','home-recent']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});
```

- [ ] **Step 2: Run RED**

Run: `npm run check`

Expected: FAIL on missing master-plan Home classes/layout.

- [ ] **Step 3: Implement Home grouping and final CSS**

Change the Home KPI wrapper to `class="kpi-grid mp-home-overview"`; add `mp-home-primary mp-primary-instrument` to Total Usage; add `mp-home-support mp-compact-card` to Sites and Budget; keep Focus Mode as a compact operational support card if retained. Add `mp-current-site` to the current-site row and `mp-analytics-grid` to analytics.

Add rules:

```css
html body .mp-home-overview {
  grid-template-columns: minmax(0, 1.7fr) repeat(2, minmax(0, .65fr));
  gap: 14px;
}
html body .mp-home-primary { grid-column: span 1; min-height: 176px; }
html body .mp-home-support { min-height: 176px; }
html body .mp-current-site {
  grid-template-columns: minmax(0, 1fr) auto auto;
  padding: 14px 16px;
}
html body .mp-analytics-grid {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--mp-section-gap);
}
html body .mp-analytics-grid .trend-card,
html body .mp-analytics-grid .recent-card { grid-column: auto; }
```

At widths under 900 px collapse the overview to two columns; under 600 px use one column and preserve quick actions above fixed mobile nav.

- [ ] **Step 4: Run GREEN**

Run: `npm run check`

Expected: PASS with all existing Home runtime tests unchanged.

- [ ] **Step 5: Commit**

```bash
git add tests/master-plan-ui-v15.test.js src/dashboard/dashboard.html src/styles/master-plan.css src/dashboard/home-view.js
git commit -m "feat: align Home dashboard with master plan"
```

---

### Task 3: Limits and Focus task-oriented workspaces

**Files:**
- Modify: `tests/master-plan-ui-v15.test.js`
- Modify: `src/dashboard/dashboard.html`
- Modify: `src/styles/master-plan.css`
- Modify only if required for existing render classes: `src/dashboard/limits-view.js`, `src/dashboard/focus-view.js`

**Interfaces:**
- Consumes: existing limit/focus IDs and message behavior.
- Produces: `.mp-limits-stack`, `.mp-limit-row`, `.mp-budget-card`, `.mp-focus-stage`, `.mp-focus-duration-grid`.

- [ ] **Step 1: Add RED contracts**

```js
test('limits and focus use distinct master-plan task layouts', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const css = await read('src/styles/master-plan.css');
  for (const cls of ['mp-limits-stack','mp-budget-card','mp-focus-stage','mp-focus-duration-grid']) {
    assert.match(html, new RegExp(cls));
  }
  assert.match(css, /\.mp-limit-row/);
  assert.match(css, /\.mp-focus-stage\s*\{[\s\S]{0,420}text-align:\s*center/);
  for (const id of ['limit-list','budget-summary','category-section','simple-start-focus','focus-active','stop-focus']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});
```

- [ ] **Step 2: Run RED**

Run: `npm run check`

Expected: FAIL on missing master-plan Limits/Focus classes.

- [ ] **Step 3: Implement Limits and Focus layout classes**

Use `mp-limits-stack` around Limits cards, `mp-workspace-card` on each workspace card, `mp-budget-card` on Daily browsing budget, and add `mp-focus-stage mp-primary-instrument` to `.focus-simple` plus `mp-focus-duration-grid` to duration controls.

Add:

```css
html body .mp-limits-stack { display: grid; gap: 16px; }
html body .mp-limit-row { border-radius: 13px; padding: 13px 14px; background: var(--surface-muted); }
html body .mp-budget-card { background: color-mix(in srgb, var(--brand-soft) 32%, var(--surface-raised)); }
html body .mp-focus-stage {
  width: min(720px, 100%);
  margin: 28px auto 0;
  padding: clamp(28px, 5vw, 56px);
  text-align: center;
  position: relative;
  overflow: hidden;
}
html body .mp-focus-duration-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
```

If limit rows are emitted by `limits-view.js`, add `mp-limit-row` to the existing row class string only; do not alter data/message behavior.

- [ ] **Step 4: Run GREEN**

Run: `npm run check`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/master-plan-ui-v15.test.js src/dashboard/dashboard.html src/styles/master-plan.css src/dashboard/limits-view.js src/dashboard/focus-view.js
git commit -m "feat: redesign Limits and Focus workspaces"
```

---

### Task 4: Settings and Usage History inspection hierarchy

**Files:**
- Modify: `tests/master-plan-ui-v15.test.js`
- Modify: `src/dashboard/dashboard.html`
- Modify: `src/dashboard/settings-view.js` only if Appearance markup is runtime-rendered there
- Modify: `src/styles/master-plan.css`
- Modify: `preview/settings.html`, `preview/history.html`

**Interfaces:**
- Consumes: existing Light/Dark/System appearance controller and Settings IDs; existing history drawer IDs.
- Produces: `.mp-settings-stack`, `.mp-settings-card`, `.mp-history-drawer`, `.mp-history-summary`, `.mp-history-table`.

- [ ] **Step 1: Add RED contracts**

```js
test('settings and history follow the master-plan grouped inspection layout', async () => {
  const html = await read('src/dashboard/dashboard.html');
  const css = await read('src/styles/master-plan.css');
  for (const cls of ['mp-settings-stack','mp-history-drawer','mp-history-summary','mp-history-table']) {
    assert.match(html, new RegExp(cls));
  }
  assert.match(css, /\.mp-settings-card/);
  for (const label of ['Notifications','Tracking','Data','Privacy','Extension health']) assert.match(html, new RegExp(label));
  assert.match(await read('src/dashboard/settings-view.js'), /Appearance/);
  for (const id of ['history-total-time','history-session-count','history-list']) assert.match(html, new RegExp(`id="${id}"`));
});
```

- [ ] **Step 2: Run RED**

Run: `npm run check`

Expected: FAIL on missing master-plan Settings/History classes.

- [ ] **Step 3: Implement grouped settings/history styling**

Add `mp-settings-stack` to Settings stack, `mp-settings-card mp-workspace-card` to each settings card, `mp-history-drawer` to history drawer, `mp-history-summary` to summary, and wrap history headings/list in a `mp-history-table` container if possible without moving runtime IDs out of the drawer.

Add:

```css
html body .mp-settings-stack { width: min(860px, 100%); display: grid; gap: 14px; }
html body .mp-settings-card { padding: 20px; }
html body .mp-history-drawer { width: min(820px, calc(100vw - 32px)); }
html body .mp-history-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
html body .mp-history-table { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
html body .mp-history-table .history-head { position: sticky; top: 0; z-index: 2; background: var(--surface-raised); }
```

Preserve the existing Appearance chooser and local persistence behavior exactly.

- [ ] **Step 4: Run GREEN**

Run: `npm run check`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/master-plan-ui-v15.test.js src/dashboard/dashboard.html src/dashboard/settings-view.js src/styles/master-plan.css preview/settings.html preview/history.html
git commit -m "feat: refine Settings and Usage History hierarchy"
```

---

### Task 5: Compact surfaces — Popup, Side Panel, Blocked Page, dialogs

**Files:**
- Modify: `tests/master-plan-ui-v15.test.js`
- Modify: `src/popup/popup.html`, `src/popup/popup.css`
- Modify: `src/sidepanel/sidepanel.html`, `src/sidepanel/sidepanel.css`
- Modify: `src/blocked/blocked.html`, `src/blocked/blocked.css`
- Modify: `src/styles/master-plan.css`
- Modify: `preview/popup.html`, `preview/sidepanel.html`, `preview/blocked.html`, `preview/dialog.html`

**Interfaces:**
- Consumes: all existing production IDs/action hooks.
- Produces: `.mp-side-current`, `.mp-side-action-card`, `.mp-blocked-card`, `.mp-dialog-panel` while retaining the approved Popup alignment classes already implemented.

- [ ] **Step 1: Add RED contracts**

```js
test('compact surfaces match the master plan while preserving action hooks', async () => {
  const side = await read('src/sidepanel/sidepanel.html');
  const blocked = await read('src/blocked/blocked.html');
  const popup = await read('src/popup/popup.html');
  for (const id of ['focus-toggle','limit-current-site','open-dashboard','open-side-panel']) assert.match(popup, new RegExp(`id="${id}"`));
  for (const id of ['side-current-domain','side-current-time','side-limit-site','side-focus-action','side-open-dashboard']) assert.match(side, new RegExp(`id="${id}"`));
  for (const id of ['close-tab','open-dashboard','allowance-actions']) assert.match(blocked, new RegExp(`id="${id}"`));
  assert.match(side, /mp-side-current/);
  assert.match(blocked, /mp-blocked-card/);
  const css = await read('src/styles/master-plan.css');
  for (const cls of ['.mp-side-current','.mp-side-action-card','.mp-blocked-card','.mp-dialog-panel']) assert.match(css, new RegExp(cls.replace('.', '\\.')));
});
```

- [ ] **Step 2: Run RED**

Run: `npm run check`

Expected: FAIL on missing compact-surface master-plan classes.

- [ ] **Step 3: Implement compact-surface presentation only**

Keep Popup behavior/IDs unchanged and only harmonize its tokens with the master plan. Add `mp-side-current mp-primary-instrument` to the Side Panel current card and `mp-side-action-card mp-workspace-card` to Quick Limit/Focus cards. Add `mp-blocked-card` to `blocked-shell`. Add `mp-dialog-panel` to dashboard dialog panels.

Add:

```css
html body .mp-side-current { padding: 22px; }
html body .mp-side-current .current-time { font-size: 38px; letter-spacing: -.045em; }
html body .mp-side-action-card { padding: 18px; }
html body .mp-blocked-card {
  width: min(680px, calc(100vw - 40px));
  margin: min(12vh, 110px) auto 40px;
  padding: clamp(28px, 5vw, 54px);
  border-radius: 26px;
}
html[data-theme="dark"] body .mp-blocked-card {
  background: linear-gradient(180deg, #111827 0%, #0e1626 100%);
  border-color: #2a3850;
}
html body .mp-dialog-panel { border-radius: 20px; }
```

Do not change `popup.js`, `sidepanel.js`, or `blocked.js` unless an existing render selector breaks because of markup movement; if required, change selectors only and keep messages/semantics intact.

- [ ] **Step 4: Run GREEN**

Run: `npm run check`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/master-plan-ui-v15.test.js src/popup src/sidepanel src/blocked src/styles/master-plan.css src/dashboard/dashboard.html preview/popup.html preview/sidepanel.html preview/blocked.html preview/dialog.html
git commit -m "feat: unify compact TimeLens surfaces"
```

---

### Task 6: Responsive and explicit Light/Dark/System master-plan states

**Files:**
- Modify: `tests/master-plan-ui-v15.test.js`
- Modify: `src/styles/master-plan.css`
- Modify only when conflict removal is necessary: `src/styles/appearance.css`, `src/styles/appearance-contrast.css`

**Interfaces:**
- Consumes: `data-theme="light|dark"`, existing `data-appearance`, mobile nav classes.
- Produces: authoritative master-plan responsive rules with no horizontal overflow and explicit theme-safe surfaces.

- [ ] **Step 1: Add RED contracts**

```js
test('master plan has explicit mobile and dark-mode acceptance rules', async () => {
  const css = await read('src/styles/master-plan.css');
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /html\[data-theme="dark"\]/);
  assert.match(css, /html\[data-theme="light"\]/);
  assert.match(css, /\.mp-home-overview[\s\S]{0,1200}grid-template-columns:\s*1fr/);
});
```

- [ ] **Step 2: Run RED**

Run: `npm run check`

Expected: FAIL until explicit final responsive/theme rules exist in the new layer.

- [ ] **Step 3: Implement authoritative mobile/theme rules**

```css
html[data-theme="light"] body { background: var(--bg); color: var(--text); }
html[data-theme="dark"] body { background: var(--bg); color: var(--text); }

@media (max-width: 900px) {
  html body .mp-home-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  html body .mp-analytics-grid { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  html body .mp-dashboard-shell { width: min(100% - 28px, var(--mp-page-max)); padding-bottom: calc(92px + env(safe-area-inset-bottom)); }
  html body .mp-home-overview { grid-template-columns: 1fr; }
  html body .mp-home-primary,
  html body .mp-home-support { min-height: auto; }
  html body .mp-page-heading { align-items: stretch; flex-direction: column; }
  html body .mp-focus-duration-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  html body .mp-dialog-panel { border-radius: 22px 22px 0 0; padding-bottom: calc(18px + env(safe-area-inset-bottom)); }
}
```

Only remove conflicting legacy rules when screenshots prove they override this final layer.

- [ ] **Step 4: Run GREEN**

Run: `npm run check`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/master-plan-ui-v15.test.js src/styles/master-plan.css src/styles/appearance.css src/styles/appearance-contrast.css
git commit -m "fix: finalize responsive and appearance master-plan states"
```

---

### Task 7: Deterministic all-surface screenshot matrix and PR verification

**Files:**
- Modify: `tests/master-plan-ui-v15.test.js`
- Modify: `preview/dashboard.html`, `preview/limits.html`, `preview/focus.html`, `preview/settings.html`, `preview/history.html`, `preview/popup.html`, `preview/sidepanel.html`, `preview/blocked.html`, `preview/dialog.html`
- Modify: `.github/workflows/ci.yml`
- Update PR #6 description/comment after verification.

**Interfaces:**
- Consumes: production CSS/classes from Tasks 1–6.
- Produces: final screenshot artifact covering the spec acceptance matrix.

- [ ] **Step 1: Add RED screenshot-matrix contract**

```js
test('CI renders the full master-plan acceptance screenshot matrix', async () => {
  const workflow = await read('.github/workflows/ci.yml');
  for (const shot of [
    'home-light-desktop','home-dark-desktop','home-light-mobile','home-dark-mobile',
    'limits-light-desktop','limits-dark-desktop','limits-light-mobile','limits-dark-mobile',
    'focus-light-desktop','focus-dark-desktop','focus-light-mobile','focus-dark-mobile',
    'settings-light-desktop','settings-dark-desktop','settings-system-desktop',
    'history-light-desktop','history-dark-desktop',
    'popup-light','popup-dark','sidepanel-light','sidepanel-dark',
    'blocked-light','blocked-dark','dialog-light-desktop','dialog-dark-desktop','dialog-light-mobile','dialog-dark-mobile'
  ]) assert.match(workflow, new RegExp(shot));
});
```

- [ ] **Step 2: Run RED**

Run: `npm run check`

Expected: FAIL because the workflow does not yet contain every required named render.

- [ ] **Step 3: Expand deterministic previews and screenshot commands**

Keep previews static/deterministic and linked to `../src/shared/theme.css` plus the real page CSS. In `.github/workflows/ci.yml`, generate explicit `preview-light`, `preview-dark`, and `preview-system` variants by adding `data-theme`/`data-appearance` to `<html>`, then add `shot` calls for every name in Step 1 at these review sizes:

```text
Desktop dashboard/history: 1440x1000 (History may use 1440x900)
Mobile dashboard: 390x844
Popup: 360x600
Side Panel: 420x900
Blocked: 1440x900
Dialog desktop: 1000x850
Dialog mobile: 390x844
```

- [ ] **Step 4: Run full GREEN verification**

Run: `npm run check`

Expected: PASS.

Then wait for GitHub Actions on the exact head commit and verify all of these steps succeed:

```text
Install dependencies
Test and validate extension
Build Chrome Web Store package
Capture Precision/master-plan UI screenshots
Upload UI screenshots
Upload release package
```

- [ ] **Step 5: Visually inspect fresh artifacts**

Download the screenshot artifact and inspect at minimum:

```text
Home light/dark desktop + mobile
Limits light/dark desktop + mobile
Focus light/dark desktop + mobile
Settings light/dark/System
History light/dark
Popup light/dark
Side Panel light/dark
Blocked dark primary + light fallback
Dialog desktop/mobile light/dark
```

Reject completion if there is clipping, horizontal overflow, fixed-nav overlap, unreadable dark text, incorrect page canvas, broken disabled states, or action-hook regressions.

- [ ] **Step 6: Update PR #6 with evidence**

Add/update the PR summary with exact final head SHA, GitHub Actions run ID, test/build results, screenshot artifact ID/digest, package artifact ID/digest, and note that runtime/privacy boundaries remained unchanged. Leave the PR open and unmerged.

- [ ] **Step 7: Commit any preview/workflow changes**

```bash
git add tests/master-plan-ui-v15.test.js preview .github/workflows/ci.yml
git commit -m "test: verify master-plan UI across all surfaces"
```

---

## Final acceptance checklist

- [ ] All eight major surfaces visibly match the approved master-plan image direction.
- [ ] Home, Limits, Focus, Settings, and History have distinct task-oriented layouts.
- [ ] Popup and Side Panel remain compact/action-first.
- [ ] Blocked Page remains safe and enforcement-first.
- [ ] Light/Dark/System are coherent across supported surfaces.
- [ ] 390×844 mobile views have no horizontal overflow or fixed-nav overlap.
- [ ] Existing runtime IDs/actions remain present and functional.
- [ ] Schema/permissions/privacy/tracking/enforcement semantics are unchanged.
- [ ] `npm run check` passes on the final head.
- [ ] Chrome Web Store package build succeeds.
- [ ] All required Chromium screenshots render and are visually reviewed.
- [ ] PR #6 remains open and unmerged.
