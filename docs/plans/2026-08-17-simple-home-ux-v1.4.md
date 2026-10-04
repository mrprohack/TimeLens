# TimeLens 1.4 Simple Home UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign TimeLens 1.3 into a simpler 1.4 experience where Home, Limits, Focus, and Settings are the only primary destinations and advanced controls stay hidden until explicitly requested.

**Architecture:** Keep the existing Manifest V3 service worker, schema v4, snapshot/message API, local storage model, enforcement order, and vanilla ES-module stack. Replace the monolithic dashboard interaction layer with focused dashboard view modules plus shared dialog/sheet helpers, while keeping business rules in `src/core` and `src/background`. Popup and Side Panel stay thin clients of the same snapshot/message API.

**Tech Stack:** Chrome Manifest V3, vanilla HTML/CSS/ES modules, Chrome tabs/storage/idle/alarms/notifications/sidePanel APIs, Node.js built-in test runner, GitHub Actions.

## Global Constraints

- Target release is `1.4.0`.
- Keep schema version `4`; this redesign must not add a data migration unless an implementation bug proves one is required.
- Primary dashboard destinations are exactly `Home`, `Limits`, `Focus`, `Settings`.
- History is secondary and opens from Home as a drawer on desktop and a full-screen sheet on mobile.
- A new site limit must be creatable with only `Website` + `Daily time`; default period is Daily, Strict is off, Schedule is off.
- Period, Strict, and Schedule controls are hidden under `Advanced options` by default.
- Category configuration and budget configuration are never permanent forms on Home.
- Focus must start from a simple duration or saved preset without exposing a website textarea by default.
- Popup must expose Today, current site, Start/End Focus, and Limit this site without normal-state scrolling.
- Side Panel must remain a compact live companion and must not duplicate full dashboard settings.
- Preserve all TimeLens 1.3 tracking, site/category/budget enforcement, schedule behavior, Focus block/allow behavior, import/restore, diagnostics, privacy, and notification semantics.
- No new host permissions, content scripts, backend, account system, analytics, telemetry, remote runtime code, or frontend framework.
- Keep exact approved permissions: `alarms`, `idle`, `notifications`, `sidePanel`, `storage`, `tabs`.
- Desktop and 390px mobile dashboard layouts must have no horizontal overflow.
- Touch targets for primary mobile actions must be at least 44px.
- Respect `prefers-reduced-motion`.

---

## File Structure

### Dashboard shell and navigation
- Modify `src/dashboard/dashboard.html` — four-destination shell, Home summary, secondary History container, dialogs/sheets.
- Modify `src/dashboard/dashboard.css` — simplified layout, tabs/navigation, dialog/sheet system, mobile bottom navigation, compact rows.
- Modify `src/dashboard/dashboard.js` — shell state, snapshot refresh, route/view switching only.

### New focused dashboard modules
- Create `src/dashboard/home-view.js` — Today/current-site summary, top five sites, attention limits, recent five sessions, Home quick actions.
- Create `src/dashboard/limits-view.js` — site-limit rows, budget summary, collapsed categories, edit/pause/delete actions.
- Create `src/dashboard/focus-view.js` — duration chips, preset selection, active Focus state, advanced Focus settings entry.
- Create `src/dashboard/settings-view.js` — alerts, tracking, backup/restore, privacy, collapsed health details.
- Create `src/dashboard/dialogs.js` — accessible dialog/sheet open/close/focus-return helpers and progressive-disclosure helpers.
- Create `src/dashboard/forms.js` — shared schedule/domain/time form serializers used by Limits/Focus dialogs.

### Popup and Side Panel
- Modify `src/popup/popup.html`, `src/popup/popup.css`, `src/popup/popup.js` — compact action-first popup.
- Modify `src/sidepanel/sidepanel.html`, `src/sidepanel/sidepanel.css`, `src/sidepanel/sidepanel.js` — simplified live companion.

### Release/docs/tests
- Modify `tests/ui.test.js` — information architecture, simple limit flow, focus flow, popup/side-panel contracts.
- Create `tests/dashboard-simple-home.test.js` — structural and progressive-disclosure contracts for Home/History/dialogs.
- Modify `tests/release.test.js` — 1.4 version/package contract.
- Modify `manifest.json`, `package.json`, `.github/workflows/ci.yml`, `CHANGELOG.md`, `README.md` — release/version copy only where needed; permission set unchanged.

---

### Task 1: Dashboard information architecture and shared dialog primitives

**Files:**
- Modify: `src/dashboard/dashboard.html`
- Modify: `src/dashboard/dashboard.css`
- Modify: `src/dashboard/dashboard.js`
- Create: `src/dashboard/dialogs.js`
- Create: `tests/dashboard-simple-home.test.js`
- Modify: `tests/ui.test.js`

**Interfaces:**
- Produces `setDashboardView(viewName)` where `viewName` is one of `home|limits|focus|settings`.
- Produces `openDialog(dialog, trigger)` and `closeDialog(dialog)` in `dialogs.js`.
- Produces `setDisclosure(button, panel, expanded)` in `dialogs.js`.
- Dashboard root exposes `[data-view="home"]`, `[data-view="limits"]`, `[data-view="focus"]`, `[data-view="settings"]` and exactly four primary nav controls.

- [ ] **Step 1: Write failing structural tests**

Add tests asserting:

```js
assert.equal(primaryNavLabels, 'Home,Limits,Focus,Settings');
assert.match(html, /data-view="home"/);
assert.match(html, /id="history-drawer"/);
assert.match(html, /id="limit-dialog"/);
assert.match(html, /id="budget-dialog"/);
assert.match(html, /id="category-dialog"/);
assert.match(html, /id="focus-settings-dialog"/);
assert.doesNotMatch(homeSectionHtml, /category-form|total-budget-form|limit-schedule-days/);
```

Also assert advanced panels have `hidden` or collapsed semantics by default and that mobile nav contains only Home/Limits/Focus with Settings reachable separately.

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test -- tests/dashboard-simple-home.test.js tests/ui.test.js`

Expected: FAIL because the current dashboard still exposes six primary nav links and permanent advanced forms.

- [ ] **Step 3: Replace dashboard shell markup**

Implement four primary views. Home contains only:

```text
Today total
Yesterday comparison or “Active browsing today”
Current site + today usage
Start Focus
Add Limit
Open Side Panel
Top 5 sites
Needs attention
Recent 5 sessions
View full history
Private · stored on this device
```

Move site/category/budget/focus/settings forms into their destination views or dialogs. Add a secondary `history-drawer` container outside primary navigation.

- [ ] **Step 4: Implement accessible dialog/disclosure helpers**

`openDialog(dialog, trigger)` must:
- remember the trigger,
- unhide the dialog,
- set `aria-hidden="false"`,
- focus the first focusable field/control.

`closeDialog(dialog)` must:
- hide the dialog,
- set `aria-hidden="true"`,
- return focus to the remembered trigger.

Escape closes non-destructive dialogs. Backdrop click may close only when the click target is the backdrop itself. `setDisclosure` updates `aria-expanded` and panel hidden state.

- [ ] **Step 5: Implement route/view switching**

Use click-driven in-page routing, not a framework. `setDashboardView('home')` is the default on every fresh dashboard load. Primary view changes must not modify business data.

- [ ] **Step 6: Run UI tests and confirm GREEN**

Run: `npm test -- tests/dashboard-simple-home.test.js tests/ui.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: simplify dashboard information architecture`

---

### Task 2: Home view and secondary History drawer

**Files:**
- Create: `src/dashboard/home-view.js`
- Modify: `src/dashboard/dashboard.js`
- Modify: `src/dashboard/dashboard.html`
- Modify: `src/dashboard/dashboard.css`
- Modify: `tests/dashboard-simple-home.test.js`

**Interfaces:**
- `renderHome(snapshot, actions)` where `actions` exposes `openLimit(domain?)`, `startQuickFocus()`, `openSidePanel()`, `openHistory()`.
- `renderHistoryDrawer(snapshot)` renders at most the full snapshot session list but remains hidden until opened.
- Home reads existing `snapshot.todayTotalMs`, `snapshot.todayTop`, `snapshot.currentDomain`, `snapshot.currentDomainMs`, `snapshot.limits`, `snapshot.currentCategoryLimits`, `snapshot.totalBudget`, `snapshot.sessions`, and `snapshot.daySeries`.

- [ ] **Step 1: Add failing Home contract tests**

Assert Home contains:

```js
assert.match(homeHtml, /id="home-today-total"/);
assert.match(homeHtml, /id="home-current-site"/);
assert.match(homeHtml, /id="home-top-sites"/);
assert.match(homeHtml, /id="home-attention"/);
assert.match(homeHtml, /id="home-recent"/);
assert.match(homeHtml, /id="home-add-limit"/);
assert.match(homeHtml, /id="home-start-focus"/);
assert.match(homeHtml, /id="home-open-side-panel"/);
```

Assert top-sites rendering slices to five and recent sessions slices to five.

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/dashboard-simple-home.test.js`

- [ ] **Step 3: Implement Today + yesterday comparison**

Derive yesterday from `snapshot.daySeries`; show `<duration> less/more than yesterday` when both today and yesterday totals are available. Otherwise show `Active browsing today`.

- [ ] **Step 4: Implement Top 5 sites**

Each row shows domain + duration + progress + either `Limit` or remaining state. Clicking `Limit` opens the shared limit dialog prefilled with that domain.

- [ ] **Step 5: Implement Needs attention**

Include only:
- reached site/category/budget boundaries,
- site/category rules with `remainingMs / effectiveMs <= 0.20`,
- currently active scheduled limits,
- active Focus state.

If empty, render `All limits look good today.`

- [ ] **Step 6: Implement Recent 5 + full History drawer**

Home shows five sessions. `View full history` opens the secondary drawer. Desktop uses a right-side drawer; <=600px uses a full-screen sheet. No History primary navigation item is introduced.

- [ ] **Step 7: Run tests and confirm GREEN**

Run: `npm test -- tests/dashboard-simple-home.test.js tests/ui.test.js`

- [ ] **Step 8: Commit**

Commit message: `feat: add simple TimeLens home view`

---

### Task 3: Simple Add/Edit Limit dialog with progressive disclosure

**Files:**
- Create: `src/dashboard/forms.js`
- Create: `src/dashboard/limits-view.js`
- Modify: `src/dashboard/dashboard.html`
- Modify: `src/dashboard/dashboard.js`
- Modify: `src/dashboard/dashboard.css`
- Modify: `tests/ui.test.js`
- Modify: `tests/dashboard-simple-home.test.js`

**Interfaces:**
- `openLimitDialog({ domain = '', limit = null, trigger })`.
- `serializeLimitForm(form)` returns `{ domain, minutes, period, strict, enabled, schedule }`.
- Default new-limit values are exactly: `period:'daily'`, `strict:false`, `schedule.enabled:false`, `enabled:true`.
- Advanced panel id: `limit-advanced-options`; trigger id: `limit-advanced-toggle`.

- [ ] **Step 1: Write failing simple-limit tests**

Assert the visible default dialog contains only Website, Daily time, Save limit, and Advanced options. Assert period/strict/schedule controls are inside a hidden advanced panel.

Add a serializer unit test showing:

```js
serializeLimitForm(simpleForm) === {
  domain: 'youtube.com',
  minutes: 45,
  period: 'daily',
  strict: false,
  enabled: true,
  schedule: { enabled: false, days: [1,2,3,4,5], startMinute: 540, endMinute: 1020 }
};
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/dashboard-simple-home.test.js tests/ui.test.js`

- [ ] **Step 3: Implement simple dialog**

Primary fields:
- Website text input.
- Time numeric input.
- Unit fixed visually to minutes for default creation; advanced mode may expose Minutes/Hours only if preserving the current unit selector is useful for editing.
- Save limit.
- Advanced options disclosure.

Do not show period, Strict, schedule, weekdays, or start/end time until advanced is expanded.

- [ ] **Step 4: Reuse dialog for editing**

Editing pre-fills the existing rule, preserves paused state, and expands Advanced only when the existing rule differs from defaults (`period !== daily`, Strict on, or schedule enabled).

- [ ] **Step 5: Replace row action buttons with overflow menu**

Each limit row has one `⋯` menu containing Edit, Pause/Resume, Delete. Delete keeps confirmation. Row always shows domain, used/limit, remaining state, reset period, and optional Strict/Scheduled badges.

- [ ] **Step 6: Add field-local validation**

Invalid website/time renders an error next to the affected field and preserves entered values. Global toast remains for unexpected runtime errors only.

- [ ] **Step 7: Run and confirm GREEN**

Run: `npm test -- tests/dashboard-simple-home.test.js tests/ui.test.js tests/service-worker.test.js`

- [ ] **Step 8: Commit**

Commit message: `feat: simplify website limit workflow`

---

### Task 4: Limits screen with summarized budget and collapsed categories

**Files:**
- Modify: `src/dashboard/limits-view.js`
- Modify: `src/dashboard/dashboard.html`
- Modify: `src/dashboard/dashboard.css`
- Modify: `src/dashboard/dashboard.js`
- Modify: `tests/dashboard-simple-home.test.js`
- Modify: `tests/ui.test.js`

**Interfaces:**
- `renderLimitsView(snapshot, actions)`.
- `openBudgetDialog({ budget, trigger })`.
- `openCategoryDialog({ category = null, trigger })`.
- Category section starts collapsed every fresh page visit.

- [ ] **Step 1: Write failing Limits-screen tests**

Assert ordering is Site limits → Daily browsing budget → Category limits. Assert neither budget nor category configuration forms are permanently visible.

- [ ] **Step 2: Run and confirm RED**

- [ ] **Step 3: Implement budget summary card**

Disabled state: short explanation + `Set budget` button. Enabled state: used/limit, progress, remaining, `Edit` button. `Set/Edit` opens `budget-dialog`.

- [ ] **Step 4: Implement collapsed categories**

Default row: `Category limits (N) ›`. Expanding shows rows and `Add category`. Schedules remain inside category dialog Advanced options.

- [ ] **Step 5: Keep category actions compact**

Use one overflow menu per row for Edit/Pause/Delete where supported. If service worker currently lacks category pause, do not invent a backend change: expose Edit/Delete only and keep enabled state editable inside the category dialog.

- [ ] **Step 6: Run and confirm GREEN**

Run: `npm test -- tests/dashboard-simple-home.test.js tests/ui.test.js tests/service-worker.test.js`

- [ ] **Step 7: Commit**

Commit message: `feat: simplify limits and guardrails screen`

---

### Task 5: Action-first Focus screen

**Files:**
- Create: `src/dashboard/focus-view.js`
- Modify: `src/dashboard/dashboard.html`
- Modify: `src/dashboard/dashboard.css`
- Modify: `src/dashboard/dashboard.js`
- Modify: `tests/ui.test.js`
- Modify: `tests/dashboard-simple-home.test.js`

**Interfaces:**
- `renderFocusView(snapshot, actions)`.
- `startFocusFromSelection()` sends existing `START_FOCUS` with `{ minutes, domains, mode, name }`.
- `focus-settings-dialog` contains domain list and block/allow mode.

- [ ] **Step 1: Write failing Focus UX tests**

Assert idle Focus view shows 25/45/60/90 minute choices, Start Focus, preset cards/chips, and `Change`/Focus settings. Assert no textarea is visible in the idle primary view.

Assert active Focus hides setup controls and shows timer/name/domain count plus End Focus.

- [ ] **Step 2: Run and confirm RED**

- [ ] **Step 3: Implement simple duration/preset selection**

Default selection: 25 minutes using block mode and current default distraction list. Clicking a saved preset selects it without immediately starting; Start Focus is the single primary action.

- [ ] **Step 4: Move advanced Focus configuration into dialog**

The dialog exposes:
- Block distractions / Allow only.
- Website list.
- Saved-preset management.

The primary Focus screen never shows the raw website textarea unless the user chooses Change/Manage.

- [ ] **Step 5: Implement calm active state**

While active, show only Focus in progress, remaining time, preset/session name, concise blocked/allowed count, End Focus.

- [ ] **Step 6: Run and confirm GREEN**

Run: `npm test -- tests/dashboard-simple-home.test.js tests/ui.test.js tests/focus.test.js tests/service-worker.test.js`

- [ ] **Step 7: Commit**

Commit message: `feat: simplify focus workflow`

---

### Task 6: Settings screen and quiet extension health

**Files:**
- Create: `src/dashboard/settings-view.js`
- Modify: `src/dashboard/dashboard.html`
- Modify: `src/dashboard/dashboard.css`
- Modify: `src/dashboard/dashboard.js`
- Modify: `tests/ui.test.js`

**Interfaces:**
- `renderSettingsView(snapshot)`.
- Health details disclosure id: `health-details`; default collapsed.
- Existing messages stay unchanged: `SAVE_SETTINGS`, `EXPORT_DATA`, `IMPORT_DATA`, `CLEAR_DATA`, `CLEAR_DIAGNOSTICS`.

- [ ] **Step 1: Write failing Settings tests**

Assert sections are Notifications, Tracking, Data, Privacy, Extension health. Assert health details are collapsed by default and diagnostics are not a prominent primary card when healthy.

- [ ] **Step 2: Run and confirm RED**

- [ ] **Step 3: Implement grouped settings**

Keep current alert toggles, idle threshold, retention, export, restore, clear usage, privacy copy, and clear diagnostics. Use short section descriptions and one Save preferences action for notification/tracking settings.

- [ ] **Step 4: Implement quiet health disclosure**

Collapsed row shows `Extension health — Healthy` or `Needs attention`. Expanded state shows local storage estimate, diagnostic count, last diagnostic, Clear diagnostics.

- [ ] **Step 5: Run and confirm GREEN**

Run: `npm test -- tests/ui.test.js tests/store.test.js tests/service-worker.test.js`

- [ ] **Step 6: Commit**

Commit message: `feat: simplify settings and extension health`

---

### Task 7: Compact popup and Side Panel

**Files:**
- Modify: `src/popup/popup.html`
- Modify: `src/popup/popup.css`
- Modify: `src/popup/popup.js`
- Modify: `src/sidepanel/sidepanel.html`
- Modify: `src/sidepanel/sidepanel.css`
- Modify: `src/sidepanel/sidepanel.js`
- Modify: `tests/ui.test.js`

**Interfaces:**
- Popup normal state contains Today, current site, current boundary state, Start Focus, Limit this site, Open dashboard, Open side panel.
- Side Panel order: current website → current-site usage → remaining boundary → quick limit → Focus → dashboard.

- [ ] **Step 1: Write failing compact-interface tests**

Assert popup contains the required controls and no large explanatory sections. Assert Side Panel does not expose category/budget/full settings forms.

- [ ] **Step 2: Run and confirm RED**

- [ ] **Step 3: Simplify popup markup and rendering**

Normal state target: no scroll at a representative 360×600 extension popup viewport. Show at most three top sites only if they fit after required actions.

If Focus active, replace Start Focus with `End Focus · <remaining>`.

- [ ] **Step 4: Simplify Side Panel**

Replace large preset cards with compact chips. Keep current site, current-site today time, most relevant remaining boundary, quick limit, Focus state, dashboard link.

- [ ] **Step 5: Run and confirm GREEN**

Run: `npm test -- tests/ui.test.js tests/service-worker.test.js`

- [ ] **Step 6: Commit**

Commit message: `feat: simplify popup and side panel`

---

### Task 8: Responsive, accessibility, and visual QA hardening

**Files:**
- Modify: `src/dashboard/dashboard.css`
- Modify: `src/popup/popup.css`
- Modify: `src/sidepanel/sidepanel.css`
- Modify: `src/shared/theme.css` only if a shared accessibility rule is required.
- Modify: `tests/ui.test.js`
- Modify: `tests/dashboard-simple-home.test.js`

**Interfaces:**
- Mobile breakpoint <=600px converts drawers/dialogs into sheets/full-width surfaces.
- Interactive primary controls use >=44px min-height on touch layouts.

- [ ] **Step 1: Add failing accessibility/responsive tests**

Static tests assert dialog labels/aria attributes, `aria-expanded` on disclosures, mobile nav hooks, 44px touch-target CSS rules, reduced-motion rule, and no permanently visible seven-column weekday grid.

- [ ] **Step 2: Run and confirm RED**

- [ ] **Step 3: Implement responsive behavior**

Desktop: 1000–1100px max width, two-column Home after hero. Mobile: one column, compact sticky/bottom Home/Limits/Focus nav, Settings icon/action, dialogs become sheets/full-width, advanced weekday controls appear only after disclosure.

- [ ] **Step 4: Perform Chromium visual QA**

Render representative states at:
- desktop dashboard 1440×1000,
- tablet 768×1024,
- mobile 390×844,
- popup 360×600,
- Side Panel 360×900,
- light and dark color schemes.

Verify no horizontal overflow, clipped labels, inaccessible buttons, or accidental visible advanced forms.

- [ ] **Step 5: Fix visual regressions and rerun tests**

Run: `npm run check`

- [ ] **Step 6: Commit**

Commit message: `fix: harden simple home responsive ux`

---

### Task 9: Release 1.4, full regression, and PR gate

**Files:**
- Modify: `manifest.json`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `tests/release.test.js`
- Modify: `docs/superpowers/plans/2026-08-17-simple-home-ux-v1.4.md`

**Interfaces:**
- Manifest/package version: `1.4.0`.
- CI artifact: `timelens-1.4.0.zip`.
- Approved permission set remains unchanged.

- [ ] **Step 1: Write failing 1.4 release tests**

Assert manifest/package are 1.4.0, CI artifact is 1.4.0, and approved permissions are still exactly `alarms,idle,notifications,sidePanel,storage,tabs`.

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/release.test.js tests/manifest.test.js`

- [ ] **Step 3: Bump release metadata and docs**

Update version/package artifact references and document the Simple Home redesign without changing privacy claims or permissions.

- [ ] **Step 4: Run complete verification**

Run:

```bash
npm run check
npm run package
```

Require all existing tracking, schedule, category, migration, import, notification-failure, security, packaging, and new UX tests to pass.

- [ ] **Step 5: Review diff for scope/security regressions**

Confirm:
- no new permissions,
- no remote code,
- no host access/content scripts,
- no schema change,
- no business-rule rewrite hidden inside UI work,
- user-controlled names/domains are escaped or assigned through `textContent`,
- destructive actions still confirm,
- dialog focus returns correctly.

- [ ] **Step 6: Push exact head and require green GitHub Actions**

Do not claim completion until the push-triggered/PR-triggered CI on the exact feature head is green and the 1.4 artifact uploads successfully.

- [ ] **Step 7: Open PR to `main`**

PR body must include:
- UX simplification summary,
- exact test count/results,
- visual-QA viewports,
- unchanged permission set,
- artifact name/hash/id,
- any environment limitation for installed-extension E2E.

- [ ] **Step 8: Commit plan completion markers only if doing so does not invalidate final verification**

If the plan checkboxes are updated after the final verified head, rerun CI on that new exact head before declaring the PR ready.
