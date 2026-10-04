# TimeLens 1.5 Premium Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved blue/indigo premium TimeLens redesign across dashboard, popup, Side Panel, blocked page, dialogs, and responsive states without changing tracking/enforcement behavior.

**Architecture:** Keep the existing vanilla HTML/CSS/JS extension and schema v4. Build the redesign primarily through shared theme tokens plus focused surface CSS/markup changes, preserve existing element IDs/message contracts, and add a development-only deterministic preview harness for screenshot QA. No framework or runtime dependency is added.

**Tech Stack:** Manifest V3 Chrome extension, vanilla HTML/CSS/ES modules, Node test runner, existing validator/package scripts, Playwright/Chromium only for local preview screenshots when available.

**Spec:** `docs/superpowers/specs/2026-08-18-premium-dashboard-v1.5-design.md`

## Global Constraints

- Keep primary dashboard destinations exactly Home / Limits / Focus / Settings.
- History stays secondary.
- Preserve schema v4 and all background/core enforcement semantics.
- Preserve current permissions; no host permissions/content scripts/history/cookies/webRequest.
- Do not add cloud sync, accounts, telemetry, backend, remote runtime code, charting dependency, or new frontend framework.
- Production UI must not invent productivity score, streak, or unsupported analytics metrics.
- Advanced controls remain collapsed by default.
- Reduced-motion support remains.
- Primary mobile touch targets remain at least 44px.
- No horizontal overflow at 390px dashboard width, popup width, or Side Panel width.
- Preview/screenshot files must not ship in the extension package.

---

### Task 1: Premium shared design tokens and responsive shell

**Files:**
- Modify: `src/shared/theme.css`
- Modify: `src/dashboard/dashboard.html`
- Modify: `src/dashboard/dashboard.css`
- Create: `tests/premium-ui-v15.test.js`

**Interfaces:**
- Consumes: existing `.brand`, `.btn`, `.panel`, `.progress`, `.input`, `.dashboard-view`, `[data-dashboard-view]`, `.mobile-nav` hooks.
- Produces: shared brand/surface/semantic tokens and desktop rail/mobile-nav layout contracts used by all later tasks.

- [ ] **Step 1: Write failing structural tests**

Add tests that read `theme.css`, `dashboard.html`, and `dashboard.css` and assert:
- `--brand`, `--brand-soft`, `--surface-raised`, `--warning-soft`, `--danger-soft` exist.
- dashboard still has exactly four primary nav buttons.
- desktop CSS creates a left rail with a desktop breakpoint.
- mobile CSS exposes `.mobile-nav` and gives primary mobile buttons `min-height: 44px`.
- unsupported strings `Productivity Score`, `Current Streak`, and `Sync Everywhere` do not appear in production dashboard HTML.

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test -- --test-name-pattern="premium|dashboard"`
Expected: FAIL because new design tokens/rail contracts are absent.

- [ ] **Step 3: Implement shared token system**

Replace the green-led theme with indigo/blue brand variables while preserving semantic class names and dark-mode overrides. Standardize buttons, panels, badges, inputs, progress, focus rings, icon buttons, and reduced-motion behavior.

- [ ] **Step 4: Implement dashboard shell**

Keep existing DOM IDs and view buttons, but make `.app-header` the desktop left rail and return it to compact top navigation at tablet/mobile breakpoints. Keep `.mobile-nav` for <=600px.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --test-name-pattern="premium|dashboard"`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: add TimeLens premium design system`

---

### Task 2: Home, Limits, Focus, Settings, history, and dialogs visual redesign

**Files:**
- Modify: `src/dashboard/dashboard.html`
- Modify: `src/dashboard/dashboard.css`
- Modify: `src/dashboard/home-view.js`
- Modify only if needed for presentational classes: `src/dashboard/limits-view.js`, `src/dashboard/focus-view.js`, `src/dashboard/settings-view.js`
- Test: `tests/premium-ui-v15.test.js`
- Preserve: `src/dashboard/dashboard.js`, `src/dashboard/forms.js`, `src/dashboard/dialogs.js` behavior unless a visual hook requires a class-only change.

**Interfaces:**
- Consumes: existing dashboard snapshot/message APIs and all current IDs.
- Produces: polished real-data Home cards, top-site rows, attention rows, workspace cards, Focus state, settings cards, history drawer, and dialogs.

- [ ] **Step 1: Extend failing tests**

Assert:
- Home contains supported summary/quick-action regions and no fake metrics.
- top-sites region remains capped by the existing renderer contract.
- category section and advanced options remain hidden/collapsed in HTML.
- history remains a drawer/dialog rather than primary nav.
- desktop content max-width and mobile single-column contracts exist.

- [ ] **Step 2: Confirm RED**

Run focused tests and confirm expected source-contract failures.

- [ ] **Step 3: Implement premium Home composition**

Style the hero as an open summary band with a prominent Today total, current-site card, and quick actions. Restyle top sites with site tiles, clear progress, time/limit copy, and compact actions. Style Needs Attention and Recent Activity with restrained semantic states.

- [ ] **Step 4: Implement secondary views**

Apply the same hierarchy to Limits, Focus, Settings, history drawer, and all dialogs without exposing advanced controls by default.

- [ ] **Step 5: Verify keyboard/reduced-motion contracts**

Keep existing focus-visible and reduced-motion rules and ensure mobile primary actions are >=44px.

- [ ] **Step 6: Run focused and full tests**

Run: `npm test`
Expected: all existing and new tests PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: redesign TimeLens dashboard surfaces`

---

### Task 3: Popup and Side Panel premium compact redesign

**Files:**
- Modify: `src/popup/popup.html`
- Modify: `src/popup/popup.css`
- Modify only for presentational state/classes if needed: `src/popup/popup.js`
- Modify: `src/sidepanel/sidepanel.html`
- Modify: `src/sidepanel/sidepanel.css`
- Modify only for presentational state/classes if needed: `src/sidepanel/sidepanel.js`
- Test: `tests/premium-ui-v15.test.js`

**Interfaces:**
- Consumes: existing popup/Side Panel snapshot and message actions.
- Produces: visually unified compact Today/current-site/boundary/Focus/limit/dashboard surfaces.

- [ ] **Step 1: Write RED tests**

Assert popup retains Today total, current site, Focus, Limit this site, Open Dashboard hooks and has an overflow-safe compact width. Assert Side Panel retains current-site, boundary, quick limit, Focus, and dashboard hooks. Assert both import `../shared/theme.css`.

- [ ] **Step 2: Confirm RED**

Run focused test and confirm new styling contracts fail.

- [ ] **Step 3: Redesign popup**

Use compact header, tracking status, strong Today number, current-site boundary card, Focus action block, optional top-site rows, and clear dashboard footer. Avoid normal-state scrolling at representative dimensions.

- [ ] **Step 4: Redesign Side Panel**

Use the same tokens/components but with flexible panel width and vertical hierarchy. Do not duplicate dashboard settings.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: polish popup and side panel`

---

### Task 4: Blocked page and visual safety hardening

**Files:**
- Modify: `src/blocked/blocked.html`
- Modify: `src/blocked/blocked.css`
- Preserve behavior in: `src/blocked/blocked.js`
- Test: `tests/premium-ui-v15.test.js`
- Regression: `tests/blocked-v13.test.js`, `tests/security.test.js`

**Interfaces:**
- Consumes: current blocked payload/session-only return handling.
- Produces: premium distraction-blocked page without security behavior changes.

- [ ] **Step 1: Add RED assertions**

Assert blocked page imports shared theme, contains the existing functional action IDs, and CSS contains a dark indigo/slate full-screen layout with responsive mobile rules.

- [ ] **Step 2: Confirm RED**

Run blocked/security focused tests.

- [ ] **Step 3: Implement blocked-page visual redesign**

Keep all existing IDs and JS message/session behavior. Improve hierarchy, lock/timer treatment, reason/domain copy framing, primary return action, and secondary manage/edit action.

- [ ] **Step 4: Run focused + full tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: redesign blocked experience`

---

### Task 5: Development-only screenshot preview harness and visual QA loop

**Files:**
- Create: `preview/index.html`
- Create: `preview/preview.css`
- Create: `preview/dashboard.html`
- Create: `preview/popup.html`
- Create: `preview/blocked.html`
- Create: `scripts/capture-ui.mjs` only if Playwright/Chromium is available without adding runtime dependencies; otherwise use a local one-off capture script outside the repository and keep preview pages only.
- Modify: `tests/premium-ui-v15.test.js`
- Verify: `scripts/package-extension.mjs`, `scripts/validate-extension.mjs`

**Interfaces:**
- Consumes: production CSS files and deterministic mock values.
- Produces: stable visual QA pages excluded from packaged extension.

- [ ] **Step 1: Add RED tests**

Assert preview pages exist and reference production styles. Assert package script does not include `preview/`. Assert preview contains no remote runtime dependencies.

- [ ] **Step 2: Confirm RED**

Run focused tests.

- [ ] **Step 3: Build deterministic preview pages**

Create representative desktop/mobile dashboard, popup, and blocked states using production class names/styles and mock content only in preview files.

- [ ] **Step 4: Capture screenshots**

Serve repository locally and capture:
- dashboard 1440×1000
- dashboard 390×844
- popup 360×600
- blocked 1440×900

Use Browser/IAB if available; otherwise use Playwright Chromium and record that fallback.

- [ ] **Step 5: Visual inspection loop**

Compare screenshots against `/mnt/data/timelens_productivity_dashboard_showcase.png` and fix visible issues: spacing, hierarchy, palette, card geometry, type scale, clipping, overflow, mobile collapse, and CTA prominence. Repeat screenshots after fixes.

- [ ] **Step 6: Run tests/validator/package**

Run:
- `npm test`
- `npm run validate`
- `npm run package`

Expected: all tests and validation pass and preview is absent from extension ZIP.

- [ ] **Step 7: Commit**

Commit message: `test: add deterministic UI preview harness`

---

### Task 6: Version 1.5 release contract and final PR verification

**Files:**
- Modify: `manifest.json`
- Modify: `package.json`
- Modify: `tests/release.test.js`
- Modify documentation only as needed: `README.md`

**Interfaces:**
- Consumes: completed premium redesign.
- Produces: TimeLens 1.5.0 package/PR with unchanged permissions and schema.

- [ ] **Step 1: Add RED version assertions**

Update release tests to require `1.5.0` while preserving the exact approved permission list and package file/security rules.

- [ ] **Step 2: Confirm RED**

Run release test and confirm current 1.4 metadata fails.

- [ ] **Step 3: Bump version only**

Set package and manifest version to `1.5.0`. Do not change schema or permissions.

- [ ] **Step 4: Fresh full verification**

Run:
- `npm test`
- `npm run validate`
- `npm run package`

Inspect exact test counts, validator output, package contents, and artifact checksum if CI exposes it.

- [ ] **Step 5: Final diff review**

Confirm no `src/background`, `src/core`, migration, permission, or schema changes are in the feature diff.

- [ ] **Step 6: Open PR against `main`**

PR body must include:
- visual redesign scope
- exact test/validator/package evidence
- screenshot QA method and viewport sizes
- concept-vs-render fidelity notes
- unchanged security/privacy/permission statement
- any environment limitation honestly documented

- [ ] **Step 7: Do not merge**

Leave PR open for review unless the user explicitly authorizes merge in a later message.
