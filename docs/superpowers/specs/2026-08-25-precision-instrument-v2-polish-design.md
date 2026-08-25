# TimeLens 1.5 — Precision Time Instrument v2 Polish

**Status:** Approved direction — Option A
**Date:** 2026-08-25
**Target:** PR #6 (`feat/premium-dashboard-v1.5`)

## Goal

Make the existing TimeLens 1.5 redesign feel more deliberate, readable, and cohesive across every user-facing surface without changing tracking, storage, permissions, schema, enforcement, or privacy behavior.

The v2 pass refines the already-approved Precision Time Instrument direction rather than replacing it. The product should feel calm, premium, local-first, and focused on helping a user understand time and take the next useful action quickly.

## Non-negotiable constraints

- Preserve dashboard destinations: Home, Limits, Focus, Settings.
- Keep Usage History secondary.
- Preserve schema v4 and all existing background/core behavior.
- Keep permissions unchanged.
- Add no backend, telemetry, accounts, remote runtime code, content scripts, history permission, cookies permission, host permissions, or webRequest permission.
- Do not invent unsupported analytics or production metrics.
- Preserve dark mode and reduced-motion support.
- Preserve progressive disclosure for advanced limit and Focus controls.
- Maintain touch targets of at least 44px for primary mobile actions.
- No horizontal scrolling at 390px dashboard width, popup width, or Side Panel width.

## Design principles

### 1. One dominant visual anchor per screen

Each surface gets one primary visual anchor instead of many equally weighted cards. Home anchors on Today usage, Limits on the active boundary list, Focus on the timer/action, Settings on grouped preferences, popup on current status, Side Panel on current site, and blocked state on the boundary message.

### 2. Fewer visual layers

Use three elevation levels only:
- hero/instrument surface for the screen’s main state,
- standard panel for grouped controls or analytics,
- quiet row/strip for supporting information.

Avoid nested card-on-card styling where a divider or lightweight row communicates structure better.

### 3. Instrument-like data presentation

Time values should use tabular numerals, strong contrast, compact labels, and restrained guide lines. Progress indicators should be precise and readable rather than decorative. Blue remains the main action/data accent; violet is secondary and amber/red remain semantic.

### 4. Clear action hierarchy

Every screen should have one unmistakable primary action. Secondary actions use neutral buttons or quiet text actions. Destructive actions remain visually distinct but do not dominate until relevant.

### 5. Consistent responsive grammar

Desktop uses a stable left rail and centered content. Mobile uses a compact top identity and fixed bottom navigation with content-safe spacing. Cards simplify instead of merely shrinking. Dialogs become bottom-sheet/full-width layouts where appropriate.

## Shared visual system

Refine `src/shared/theme.css` and `src/styles/precision-polish.css` rather than introducing another competing stylesheet layer.

Add or normalize tokens for:
- canvas, hero, panel, inset and selected surfaces,
- subtle/strong borders,
- compact/standard/hero shadows,
- 8/12/16/20/24/32 spacing rhythm,
- 10/14/18/24 radii,
- display, section, body and metadata type scales,
- focus-ring treatment,
- icon container sizes,
- tabular time numerals.

Buttons, chips, fields, disclosure rows, panel headings, badges, progress tracks, drawers and dialogs must share the same radius, border, hover, active and focus-visible rules.

## Dashboard shell and navigation

### Desktop

Keep the left rail but make it visually quieter and more useful:
- compact brand area,
- consistent icon-sized navigation affordances,
- stronger active indicator using the existing blue accent,
- less emphasis on inactive items,
- Usage History separated as a secondary action,
- privacy/local tracking state simplified at the bottom.

The main content should retain a readable max width and tighter vertical rhythm so the first viewport shows more useful information without feeling dense.

### Mobile

Keep bottom navigation. Improve it by:
- making all four destinations equally legible,
- using consistent active-state geometry,
- keeping safe-area spacing,
- ensuring current-site actions and primary calls to action stay above the nav,
- avoiding desktop-style multi-column remnants.

## Home

The Home screen should answer three questions immediately: How much time have I used? What am I doing now? What should I do next?

### Hero summary

Promote Total Usage into a wider instrument-style hero rather than one of four equal KPI cards. It should contain:
- Today total,
- concise status/comparison copy supported by existing data,
- restrained visual time halo/ring,
- optional current-site context when space allows.

Supporting KPI cards become smaller and quieter. Focus readiness, sites visited and daily budget remain secondary.

### Current website strip

Make the current-site strip read as one horizontal operational row on desktop and one compact action row on mobile. Domain, current time and boundary state should be scannable before the buttons.

Primary contextual action: Add Limit when no limit exists. Open Side Panel remains secondary.

### Analytics area

Refine Time Breakdown, Top Distracting Sites, Alerts, Usage Trend and Recent Sessions into a consistent analytics grid:
- shared heading rhythm,
- aligned numeric columns,
- quieter separators,
- stronger empty states,
- fewer ornamental shadows,
- hover/focus states only on interactive rows.

Top sites should emphasize domain + time first and progress second. Usage Trend should retain guide lines but reduce visual noise. Recent Sessions should feel table-like rather than card-like.

## Limits

Make Limits feel like a boundary workspace rather than a generic settings page.

- Keep Add limit as the single primary page action.
- Site limit rows should show domain, used/limit, progress, reset period and relevant badges in one readable hierarchy.
- Edit/Pause/Delete remain secondary actions and should not compete with usage data.
- Daily browsing budget becomes a compact summary panel.
- Category limits remain collapsed by default.
- Advanced schedule and Strict controls remain progressively disclosed.
- Empty state should explain the benefit and point to Add limit without adding new features.

## Focus

The idle Focus view becomes a deliberate single-purpose instrument:
- large but restrained focus glyph/halo,
- duration choices directly under the title,
- saved preset chips as secondary shortcuts,
- one concise current-mode summary,
- one dominant Start Focus button.

The active state prioritizes remaining time with tabular numerals, session name, blocked count and one clear End Focus action. Detailed domain configuration stays out of the main state.

## Settings

Settings should feel calmer and more compact than Home or Limits.

- Use grouped cards with consistent section headers.
- Notifications become lightweight rows with stronger checked/unchecked affordances.
- Tracking fields align consistently and use clearer labels.
- Data actions separate normal export/restore actions from destructive clear-data action.
- Privacy stays informational and visually quiet.
- Extension health remains collapsed and low emphasis.

## Usage History drawer

Treat history as an inspection workspace:
- clearer drawer header and close affordance,
- compact summary metrics,
- tabs with a stronger active indicator,
- aligned Website / Started / Active time columns,
- row hover only where useful,
- sticky or visually persistent header behavior only if it can be achieved without changing runtime logic.

On mobile the drawer becomes a full-height sheet with safe-area padding and comfortable close/action targets.

## Dialogs

Limit, budget, category and Focus dialogs share one component grammar:
- consistent heading/eyeline/close control,
- predictable field spacing,
- one primary footer action,
- neutral cancel/close action,
- inline validation without layout jumps,
- clear focus-visible states,
- bottom-sheet presentation on narrow screens.

No dialog should introduce new behavior or validation semantics beyond the existing logic.

## Popup

The popup should remain fast and compact instead of becoming a miniature dashboard.

- Header: brand + local tracking state.
- Primary instrument: Today total plus current site and relevant boundary.
- Focus and Limit this site remain the two primary actions, with Focus visually dominant.
- Supporting facts such as sites visited and Focus state should be quieter.
- Top sites stay compact and should not force unnecessary scrolling at the target viewport.
- Open Dashboard is the main footer navigation action; Side Panel remains secondary.

## Side Panel

Make the Side Panel a focused live-control surface:
- current site is the dominant card,
- today time and boundary are visually grouped,
- quick-limit control becomes compact and clear,
- Focus action remains strong but secondary to current-site context,
- Dashboard link stays available without competing with in-panel actions.

## Blocked page

Keep the dark premium direction but simplify the composition:
- stronger central boundary icon/site initial,
- shorter title line length,
- reason/domain/time context grouped together,
- Close tab remains the primary action,
- Open dashboard secondary,
- +5/+15 minute allowance actions remain clearly optional and only appear when existing logic allows them.

The state should feel deliberate and calm, not punitive or alarm-heavy.

## Accessibility and interaction

- Preserve semantic headings, labels and existing ARIA hooks.
- Keep keyboard focus visibly distinct on all actionable controls.
- Do not rely on color alone for active/warning states.
- Maintain minimum 44px primary touch targets on mobile.
- Respect `prefers-reduced-motion` and avoid bounce/scale-heavy interaction.
- Keep contrast appropriate in light and dark modes.

## Testing strategy

Use TDD for source-level UI contracts and regressions.

Add tests that verify:
- the v2 polish stylesheet remains loaded after the shared theme/Tailwind output,
- key hero/supporting-surface class contracts exist,
- mobile safe-area and bottom-nav spacing remain enforced,
- dashboard destinations and runtime IDs remain unchanged,
- popup, Side Panel and blocked-page action IDs remain unchanged,
- reduced-motion and dark-mode branches remain present,
- preview harness remains excluded from packaged extension output.

Run the full existing test suite and validator after each coherent UI slice.

## Visual QA and screenshot matrix

Capture deterministic screenshots after implementation for:
- Dashboard Home — desktop 1440×1000,
- Dashboard Home — mobile 390×844,
- Limits — desktop 1440×1000,
- Limits — mobile 390×844,
- Focus idle — desktop 1440×900,
- Focus idle — mobile 390×844,
- Settings — desktop 1440×1000,
- Settings — mobile 390×844,
- Usage History drawer — desktop 1440×900,
- extension popup — 360×600,
- Side Panel — representative narrow width,
- blocked page — 1440×900.

Also inspect at least one dialog on desktop and mobile if the preview harness exposes it deterministically.

Visual acceptance:
- no clipping or horizontal overflow,
- one clear primary action per screen,
- consistent spacing/radius/type hierarchy,
- readable numeric alignment,
- mobile actions never hidden behind bottom navigation,
- popup remains compact,
- dark and reduced-motion rules remain intact.

## Files expected to change

Primary styling:
- `src/shared/theme.css`
- `src/styles/precision-polish.css`

Markup only where hierarchy/accessibility requires it while preserving IDs and runtime hooks:
- `src/dashboard/dashboard.html`
- `src/popup/popup.html`
- `src/sidepanel/sidepanel.html`
- `src/blocked/blocked.html`

Page-specific CSS only where shared polish cannot safely express the change:
- `src/dashboard/dashboard.css`
- `src/popup/popup.css`
- `src/sidepanel/sidepanel.css`
- `src/blocked/blocked.css`

Preview/tests:
- `preview/*` as needed for deterministic all-page visual states
- `tests/polish-ui-v15.test.js`
- existing release/UI tests only when a contract must be extended, not weakened.

## Acceptance criteria

1. Every user-facing TimeLens surface follows one coherent Precision Time Instrument v2 visual language.
2. Home has a stronger Today-usage anchor and clearer current-site/action hierarchy.
3. Limits reads as a boundary workspace, Focus as a single-purpose timer, and Settings as low-frequency grouped preferences.
4. Popup and Side Panel remain compact and action-oriented.
5. Blocked state stays calm, legible and functional.
6. No runtime IDs, privacy boundaries, schema, permissions or enforcement behavior regress.
7. Desktop and 390px mobile layouts have no horizontal overflow or obscured primary actions.
8. Full tests and validation pass.
9. Final screenshots are captured and visually reviewed for every surface in the screenshot matrix before the PR is declared ready.
