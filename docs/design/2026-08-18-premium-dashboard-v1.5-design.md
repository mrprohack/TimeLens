# TimeLens 1.5 — Premium Dashboard Visual Redesign

**Status:** Approved direction — Option B: premium visual system on the real TimeLens 1.4 product
**Date:** 2026-08-18
**Target:** TimeLens 1.5

## Goal

Upgrade TimeLens 1.4 into a polished, consistent productivity product while preserving its simple daily-use architecture and all existing tracking, limit, schedule, Focus, privacy, and security behavior.

The redesign is based on the approved TimeLens product showcase image, but production UI must display only metrics supported by the existing local dataset. Mock preview data may be richer for screenshot/visual QA only.

## Non-negotiable product constraints

- Keep the four primary dashboard destinations: **Home, Limits, Focus, Settings**.
- History remains secondary; it does not become a permanent top-level destination.
- Advanced site-limit, category, budget, and Focus controls stay progressively disclosed.
- Do not add cloud sync, accounts, telemetry, analytics, backend services, or remote runtime code.
- Do not add host permissions, content scripts, history permission, cookies permission, or webRequest permission.
- Preserve schema v4 and all existing background/core enforcement semantics.
- Do not invent production metrics such as productivity score, streaks, or category insights unless they can be derived from current stored data without schema/API changes.
- Keep reduced-motion support.
- Keep primary mobile touch targets at least 44px.
- No horizontal scrolling at 390px dashboard width, popup width, or Side Panel width.

## Visual direction

Use a modern productivity SaaS aesthetic:

- primary accent: indigo/royal blue
- secondary accents: lavender and cyan for informational emphasis
- semantic amber for warning and red for danger/limit exhaustion
- white/slate surfaces in light mode and deep slate surfaces in dark mode
- 12/16/24px spacing rhythm
- 14–20px card radii depending on density
- restrained soft shadows
- clear three-level type hierarchy
- consistent icon treatment across dashboard, popup, dialogs, blocked page, and Side Panel
- charts/progress visuals should use CSS/SVG only; no charting dependency

The redesign should feel premium and calm, not dense or gamified.

## Shared design system

`src/shared/theme.css` remains the design-token source of truth and will be expanded with:

- brand colors (`--brand`, `--brand-strong`, `--brand-soft`)
- semantic colors (`--success`, `--warning`, `--danger`, plus soft backgrounds)
- surface tiers (`--surface`, `--surface-raised`, `--surface-muted`)
- border and shadow levels
- spacing tokens
- larger radii
- typography tokens
- standardized button, panel, progress, badge, input, disclosure, and icon-button patterns

Dark mode uses the same token names with alternate values.

## Dashboard shell

### Desktop

Use a left navigation rail inspired by the approved mockup.

The rail contains:
- TimeLens brand
- Home
- Limits
- Focus
- Settings
- a quiet privacy/local-storage status at the bottom

The main content area uses a centered max width of approximately 1180–1240px.

### Tablet

Collapse the rail into a compact top navigation/header.

### Mobile

Use:
- compact top brand/header
- bottom navigation for Home / Limits / Focus / Settings
- single-column cards
- dialogs become bottom sheets or full-width panels

## Home view

The first viewport should communicate current usage and next action in seconds.

### Hero summary

Show:
- Today total active browsing
- current website and today’s time
- one supporting comparison/status line when existing snapshot data supports it
- quick actions: Start Focus, Add Limit, Open Side Panel

### Summary cards

Use real supported metrics only. Cards may include:
- Today total
- Focus state/session remaining when active
- Active limits needing attention
- Sites visited or another count derivable from the current snapshot/session data

If a metric is not available, do not show a fake card.

### Top websites

Keep the existing Top 5 behavior, but present it with:
- favicon/initial tile
- domain
- active time
- proportional progress bar
- limit state where relevant
- compact “Limit” action when no limit exists

### Needs attention

Show only relevant boundaries:
- reached limit
- <=20% remaining
- currently scheduled boundaries
- active Focus block state

Empty state: calm positive copy such as “All limits look good today.”

### Recent activity

Keep last 5 sessions on Home. “View full history” opens the existing secondary drawer/sheet.

## Limits view

Use a clean workspace card layout.

### Site limits

Rows contain:
- domain
- used / limit
- progress bar
- reset period
- optional badges for Strict/schedule
- overflow menu for Edit / Pause / Delete

### Daily browsing budget

Keep it secondary and summarized. Editing occurs in the existing dialog.

### Category limits

Remain collapsed by default. Advanced schedule controls remain hidden until requested.

## Focus view

Keep the simple action-first 1.4 flow.

Idle state:
- large focus illustration/icon treatment
- 25 / 45 / 60 / 90 minute duration chips
- saved preset chips
- current mode summary
- primary Start Focus action
- Change opens detailed settings

Active state:
- large remaining-time display
- session/preset name
- blocked-domain count summary
- one clear End Focus action

Raw domain textareas and allow-only/block list configuration must not be visible by default.

## Settings view

Use grouped, low-frequency cards:
- Notifications
- Tracking
- Data
- Privacy
- Extension health (collapsed)

Do not make diagnostics visually compete with everyday productivity controls.

## Popup redesign

Keep the popup compact and fast.

Normal state contains:
- TimeLens brand + tracking indicator
- Today total
- current website and time
- most relevant limit boundary / remaining time
- Start Focus
- Limit this site
- top sites only when they fit without creating a long scroll
- Open Dashboard

Active Focus state changes the primary action to “End Focus · Xm left”.

Target width remains suitable for a Chrome popup and normal state should not require scrolling at the representative popup viewport.

## Side Panel redesign

Use the same visual tokens and hierarchy as the popup.

Order:
1. current site
2. current-site usage
3. relevant limit/category/budget boundary
4. quick limit action
5. Focus status/action
6. Open Dashboard

Do not duplicate full dashboard configuration.

## Blocked page redesign

Create a premium distraction-blocked experience:

- deep indigo/slate background with restrained decorative depth
- prominent lock/timer icon
- clear “Time’s up” or Focus-blocked title
- domain and reason
- reset/remaining context when the existing blocked payload provides it
- primary “Return to productivity” action
- secondary edit/manage-limit action when appropriate

The page must remain functional with the existing blocked-page message/session logic and must not expose return URLs in persistent/local storage.

## Dialogs and overlays

Use one consistent visual system for:
- add/edit limit
- budget
- category
- Focus settings
- history drawer

Requirements:
- clear title and close action
- comfortable spacing
- inline validation
- 44px primary actions on mobile
- focus-visible treatment
- Escape closes non-destructive dialogs
- desktop centered dialog; mobile bottom-sheet/full-width behavior

## Preview and screenshot QA harness

Add a development-only static preview harness under `preview/` or `tools/preview/` that does **not** ship in the extension package.

It should render representative versions of:
- Dashboard Home at desktop width
- Dashboard Home at 390px
- Popup
- Blocked page

The harness may inject deterministic mock snapshot data and stub Chrome APIs so screenshots are stable and repeatable.

The release/package validator must confirm preview files are excluded from the extension ZIP.

## Testing strategy

Use TDD.

### Structural UI tests

Verify:
- four primary dashboard destinations remain unchanged
- desktop rail and mobile navigation exist
- production Home does not include unsupported fake metrics
- advanced controls remain collapsed by default
- popup still contains Today/current site/Focus/Limit/Dashboard actions
- blocked page retains functional action hooks

### Responsive contracts

Verify source/CSS contracts for:
- 390px no horizontal overflow
- desktop rail hidden/collapsed at tablet/mobile breakpoint
- mobile bottom nav visible at the mobile breakpoint
- touch targets >=44px for primary actions
- popup and Side Panel have overflow-safe layouts

### Regression/security

All existing TimeLens 1.4 tests must remain green, including:
- schema/migrations
- tracking
- site/category/budget enforcement
- schedules
- Focus
- import/restore
- diagnostics
- blocked-page return handling
- approved permissions
- no remote runtime code/eval/new Function
- package validation

### Visual QA

Render and inspect deterministic screenshots at minimum:
- Dashboard desktop 1440×1000
- Dashboard mobile 390×844
- Popup 360×600 or actual popup dimensions
- Blocked page 1440×900

Fix visible issues in a loop until:
- no clipping
- no horizontal overflow
- consistent spacing/radii/type
- hierarchy matches the approved premium direction
- important actions are visually obvious
- mobile remains readable and touch-friendly

## Acceptance criteria

1. TimeLens production dashboard visually matches the approved blue/indigo premium direction while preserving the 1.4 information architecture.
2. Home communicates Today usage, current site, quick actions, top sites, relevant limits, and recent sessions without fake analytics.
3. Limits, Focus, Settings, popup, Side Panel, blocked page, dialogs, and history share one consistent visual language.
4. Dashboard works at desktop, tablet, and 390px mobile without horizontal scrolling.
5. Popup and Side Panel remain compact and action-oriented.
6. Advanced configuration remains progressively disclosed.
7. Existing runtime behavior, schema v4, privacy model, enforcement order, and permissions remain unchanged.
8. Preview/screenshot harness is development-only and excluded from extension packaging.
9. Existing regression/security/package tests pass.
10. New UI/responsive/preview tests pass.
11. Final screenshots are reviewed and visual issues fixed before PR readiness.

## Explicit non-goals

No:
- cloud sync
- user accounts
- telemetry/analytics service
- productivity-score algorithm
- streak/gamification system
- new permissions
- backend
- React/framework migration
- charting library
- content scripts
- schema migration
- enforcement rewrite
