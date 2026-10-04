# TimeLens Tailwind UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert TimeLens 1.5 to a locally compiled Tailwind CSS v4 presentation layer that preserves extension behavior and more closely matches the approved dashboard reference across desktop, mobile, popup, Usage History, and blocked states.

**Architecture:** Tailwind CSS v4 plus `@tailwindcss/cli` will compile `src/styles/tailwind.css` into the runtime stylesheet `src/styles/timelens.css`. Static/dynamic TimeLens class hooks remain stable, while semantic component classes and small custom geometry rules live in the Tailwind source. Build/check/package and GitHub Actions will compile CSS deterministically before validation and packaging.

**Tech Stack:** Chrome Extension Manifest V3, vanilla HTML/CSS/JavaScript, Node.js 22, Tailwind CSS v4, `@tailwindcss/cli`, Node test runner, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-19-tailwind-ui-migration-design.md`

## Global Constraints

- Preserve schema v4.
- Preserve permissions exactly: `tabs`, `storage`, `idle`, `alarms`, `notifications`, `sidePanel`.
- No Tailwind CDN, remote CSS, remote fonts, runtime CSS generation, backend, telemetry, or new host permissions.
- Do not change background/core tracking, limits, Focus enforcement, migrations, storage, or privacy behavior.
- Keep existing IDs and `data-*` JavaScript hooks.
- Runtime surfaces may display only metrics derived from existing TimeLens local data.
- Keep 44 px minimum primary touch targets, visible keyboard focus, safe-area mobile navigation, and reduced-motion support.

---

### Task 1: Lock the Tailwind build contract with RED tests

**Files:**
- Modify: `tests/premium-ui-v15.test.js`
- Modify: `tests/release.test.js`

**Interfaces:**
- Consumes: existing package/CI/runtime file structure.
- Produces: test contract for Tailwind dependencies, build scripts, runtime CSS links, compiled package output, and CDN prohibition.

- [ ] **Step 1: Add failing Tailwind package/build assertions**

Add assertions equivalent to:

```js
assert.equal(pkg.devDependencies?.tailwindcss !== undefined, true);
assert.equal(pkg.devDependencies?.['@tailwindcss/cli'] !== undefined, true);
assert.match(pkg.scripts['build:css'], /@tailwindcss\/cli/);
assert.match(pkg.scripts.check, /build:css/);
assert.match(pkg.scripts.package, /build:css/);
```

- [ ] **Step 2: Add failing runtime stylesheet assertions**

For dashboard, popup, sidepanel, and blocked HTML, assert each references `../styles/timelens.css`, does not contain `cdn.tailwindcss.com`, and does not reference the removed page-level stylesheet as its primary visual system.

- [ ] **Step 3: Add failing CI/package assertions**

Assert `.github/workflows/ci.yml` contains `npm ci` before `npm run check`; assert package script/package contents include `src/styles/timelens.css` and no `node_modules` or Tailwind CDN asset.

- [ ] **Step 4: Push test-only commit and verify RED in GitHub Actions**

Expected: existing runtime tests stay green; new Tailwind contract assertions fail because dependencies/source/compiled CSS and `npm ci` do not exist yet.

- [ ] **Step 5: Commit**

Commit message: `test: define Tailwind UI migration contract`

---

### Task 2: Add deterministic Tailwind v4 build pipeline

**Files:**
- Modify: `package.json`
- Create: `package-lock.json`
- Modify: `.github/workflows/ci.yml`
- Create: `src/styles/tailwind.css`
- Create: `src/styles/timelens.css` (generated/committed runtime output)

**Interfaces:**
- Produces: `npm run build:css` and compiled `src/styles/timelens.css` consumed by runtime HTML and packaging.

- [ ] **Step 1: Add Tailwind dev dependencies and scripts**

Package scripts must follow this contract:

```json
{
  "build:css": "npx @tailwindcss/cli -i ./src/styles/tailwind.css -o ./src/styles/timelens.css --minify",
  "watch:css": "npx @tailwindcss/cli -i ./src/styles/tailwind.css -o ./src/styles/timelens.css --watch",
  "check": "npm run build:css && npm test && npm run validate",
  "package": "npm run build:css && node scripts/package-extension.mjs"
}
```

Use current stable compatible v4 versions for `tailwindcss` and `@tailwindcss/cli` and commit the generated lockfile.

- [ ] **Step 2: Add `npm ci` to GitHub Actions**

Place after Node setup and before `npm run check`.

- [ ] **Step 3: Create Tailwind source skeleton**

Start with:

```css
@import "tailwindcss";

@source "../dashboard/**/*.{html,js}";
@source "../popup/**/*.{html,js}";
@source "../sidepanel/**/*.{html,js}";
@source "../blocked/**/*.{html,js}";
@source "../onboarding/**/*.{html,js}";
@source "../options/**/*.{html,js}";

@theme {
  --color-time-blue: #3157ff;
  --color-focus-violet: #7455ff;
  --color-live-mint: #12b886;
  --color-alert-amber: #f59e0b;
  --color-ink: #101525;
  --color-mist: #f4f7ff;
}
```

- [ ] **Step 4: Generate committed runtime CSS**

Run `npm run build:css`; commit `src/styles/timelens.css` so the unpacked extension is runnable without a build step while CI still proves reproducibility.

- [ ] **Step 5: Verify Tailwind contract tests progress toward GREEN**

Expected: dependency/build/CI assertions pass; runtime link assertions remain RED until page migration.

- [ ] **Step 6: Commit**

Commit message: `build: add local Tailwind CSS pipeline`

---

### Task 3: Migrate shared visual primitives into Tailwind source

**Files:**
- Modify: `src/styles/tailwind.css`
- Regenerate: `src/styles/timelens.css`
- Read/replace behavior from: `src/shared/theme.css`

**Interfaces:**
- Produces semantic primitives used by all runtime pages: `.brand`, `.brand-mark`, `.btn`, `.btn-primary`, `.btn-danger`, `.btn-quiet`, `.panel`, `.progress`, `.input`, `.eyeline`, `.muted`, `.row`, `.stack`.

- [ ] **Step 1: Port TimeLens tokens and base typography**

Use platform-native variable font stacks and tabular numerals; map brand, success, warning, danger, surfaces, borders, shadows, radii, and spacing to CSS variables/Tailwind theme values.

- [ ] **Step 2: Port shared interactive components using `@layer components` and `@apply` where appropriate**

Example shape:

```css
@layer components {
  .panel { @apply rounded-2xl border border-slate-200 bg-white; box-shadow: var(--shadow-sm); }
  .btn { @apply inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 font-semibold transition; }
  .btn-primary { @apply border-time-blue bg-time-blue text-white; }
}
```

- [ ] **Step 3: Preserve dark mode, focus-visible and reduced motion**

Use media queries where they better match existing browser-extension behavior than class-driven theme toggles.

- [ ] **Step 4: Regenerate CSS and run tests**

Expected: shared-theme behavior tests stay GREEN.

- [ ] **Step 5: Commit**

Commit message: `style: move shared UI primitives to Tailwind`

---

### Task 4: Migrate dashboard and Usage History to Tailwind component classes

**Files:**
- Modify: `src/styles/tailwind.css`
- Modify: `src/dashboard/dashboard.html`
- Modify: `src/dashboard/home-view.js` only if stable semantic class names are needed for dynamic rows
- Regenerate: `src/styles/timelens.css`
- Remove runtime dependency on: `src/dashboard/dashboard.css`, `src/shared/theme.css`

**Interfaces:**
- Preserve all IDs/data attributes used by `dashboard.js`, `home-view.js`, `limits-view.js`, `focus-view.js`, `settings-view.js`, dialogs, and sidebar history wiring.

- [ ] **Step 1: Point dashboard HTML to `../styles/timelens.css`**

- [ ] **Step 2: Port desktop shell/sidebar/topbar rules**

Match the reference: fixed white rail, compact nav, quiet local-tracking card, centered 1180 px content area.

- [ ] **Step 3: Port Today hero + supporting KPI composition**

Keep one dominant Time Halo/Total Usage hero and supporting Focus/Sites/Budget cards.

- [ ] **Step 4: Port current-site strip and analytics grid**

Time Breakdown, Top Distracting Sites, Alerts, 7-day Usage Trend, Recent Sessions.

- [ ] **Step 5: Port Limits/Focus/Settings/dialog/history drawer styles**

Keep existing information architecture; do not introduce new destinations.

- [ ] **Step 6: Port responsive breakpoints**

At <=960 px remove fixed sidebar; at <=600 px use single-column cards and fixed safe-area bottom navigation.

- [ ] **Step 7: Run tests and regenerate CSS**

Expected: dashboard composition, History wiring, mobile nav, no-fake-metrics tests GREEN.

- [ ] **Step 8: Commit**

Commit message: `style: migrate dashboard to Tailwind`

---

### Task 5: Migrate popup, Side Panel, and blocked page

**Files:**
- Modify: `src/styles/tailwind.css`
- Modify: `src/popup/popup.html`
- Modify: `src/sidepanel/sidepanel.html`
- Modify: `src/blocked/blocked.html`
- Regenerate: `src/styles/timelens.css`
- Remove runtime dependency on: `popup.css`, `sidepanel.css`, `blocked.css`, `theme.css` for these pages

**Interfaces:**
- Preserve existing JS IDs/actions and blocked-page safe-exit/allowance behavior.

- [ ] **Step 1: Migrate popup to the single compiled stylesheet**

Keep header, Today Halo, current site limit, Focus/Limit actions, and Open Dashboard visible in 360×600 without scrolling.

- [ ] **Step 2: Migrate Side Panel**

Reuse the same cards, button hierarchy, timer typography, and semantic colors.

- [ ] **Step 3: Migrate blocked page**

Create a full dark TimeLens boundary atmosphere and ensure light dashboard background rules cannot leak into it.

- [ ] **Step 4: Run focused UI tests**

Expected: popup compactness, Side Panel companion, blocked safe actions, and reduced-motion tests GREEN.

- [ ] **Step 5: Commit**

Commit message: `style: migrate companion surfaces to Tailwind`

---

### Task 6: Remove legacy runtime CSS dependencies and harden packaging

**Files:**
- Modify: `tests/release.test.js`
- Modify: `scripts/validate-extension.mjs` if necessary to validate compiled CSS/runtime links
- Delete when unreferenced: `src/shared/theme.css`, `src/dashboard/dashboard.css`, `src/popup/popup.css`, `src/sidepanel/sidepanel.css`, `src/blocked/blocked.css`
- Regenerate: `src/styles/timelens.css`

**Interfaces:**
- `src/styles/timelens.css` becomes the single production visual bundle for migrated surfaces.

- [ ] **Step 1: Add/adjust test asserting no migrated runtime page references legacy CSS**

- [ ] **Step 2: Delete only stylesheets proven unreferenced**

Do not delete onboarding CSS if onboarding still intentionally owns page-specific rules; either migrate it in the same task or leave it explicitly page-local.

- [ ] **Step 3: Run `npm run check` and `npm run package`**

Expected: all tests and validator GREEN; packaged zip includes `src/styles/timelens.css`; no `node_modules`.

- [ ] **Step 4: Inspect package artifact file list**

Confirm no CDN/runtime dependencies and no missing CSS.

- [ ] **Step 5: Commit**

Commit message: `build: finalize Tailwind runtime bundle`

---

### Task 7: Screenshot QA and visual fix loop

**Files:**
- Modify as required: `preview/*.html`, `src/styles/tailwind.css`, runtime HTML
- Regenerate: `src/styles/timelens.css`

**Interfaces:**
- Deterministic preview harness must render the same compiled runtime stylesheet used by production pages.

- [ ] **Step 1: Render stable Chromium screenshots**

Capture:
- 1440×1000 Dashboard
- 390×844 Dashboard mobile
- 360×600 Popup
- 1440×900 Usage History
- 1440×900 Blocked page

- [ ] **Step 2: Critique against the approved reference**

Check: sidebar width, card density, Halo prominence, KPI hierarchy, whitespace, chart balance, popup fit, mobile bottom-nav overlap, dark blocked atmosphere, focus/hover consistency.

- [ ] **Step 3: Fix visual defects**

For every concrete defect, add/adjust a regression assertion when practical before modifying CSS.

- [ ] **Step 4: Re-render screenshots**

Repeat until no clipping, overflow, hidden CTA, overlapping mobile nav, or major hierarchy mismatch remains.

- [ ] **Step 5: Commit**

Commit message: `style: polish Tailwind UI from screenshot QA`

---

### Task 8: Exact-head verification and PR #6 update

**Files:**
- Modify: `CHANGELOG.md` only if a concise Tailwind migration note is missing
- PR metadata: #6

**Interfaces:**
- Final feature branch remains `feat/premium-dashboard-v1.5`; PR remains based on `main` and unmerged.

- [ ] **Step 1: Run exact-head CI**

Require successful `npm ci`, `npm run check`, package build, and artifact upload.

- [ ] **Step 2: Read CI logs for exact counts**

Record tests passed/failed/skipped, validator file/JS/page counts, artifact ID/size/SHA-256.

- [ ] **Step 3: Compare `main...feat/premium-dashboard-v1.5`**

Confirm no background/core/migration/enforcement/permission changes caused by Tailwind migration.

- [ ] **Step 4: Update PR #6**

Describe Tailwind architecture, visual QA fixes, exact verification evidence, screenshot dimensions, and runtime/privacy boundaries.

- [ ] **Step 5: Leave PR ready for review and unmerged**

No merge without explicit user instruction.