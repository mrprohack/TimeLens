# TimeLens Master Plan UI Redesign

**Date:** 2026-08-25  
**Target:** PR #6 (`feat/premium-dashboard-v1.5`)  
**Status:** Approved design direction — close match to the supplied TimeLens UX/UI Master Plan image

## Objective

Apply the approved TimeLens UX/UI Master Plan across all major product surfaces while preserving existing runtime behavior. The redesign should closely match the supplied planning image in structure, hierarchy, spacing, card composition, action emphasis, and cross-surface visual language.

The result should feel like one coherent privacy-first productivity product rather than a collection of independently styled extension pages.

## Non-negotiable runtime boundaries

The redesign is presentation-layer work. It must not change TimeLens core tracking, storage, privacy, or enforcement semantics.

- Keep schema v4.
- Keep permissions exactly: `tabs`, `storage`, `idle`, `alarms`, `notifications`, `sidePanel`.
- Add no host permissions, content scripts, cookies access, browsing-history access, remote runtime code, backend, accounts, telemetry, or cloud sync.
- Preserve existing action hooks, IDs, message types, storage keys, Focus Mode semantics, limit semantics, blocked-page enforcement, and tracking calculations.
- Prefer existing JavaScript unchanged. JavaScript may change only when a safe markup restructuring requires a render adjustment.
- PR #6 remains open and unmerged until separately approved.

## Global information architecture

The product keeps four primary dashboard destinations:

1. Home
2. Limits
3. Focus
4. Settings

Usage History remains secondary navigation rather than a fifth primary destination. Popup and Side Panel remain compact companion surfaces. The blocked page remains an enforcement surface.

### Desktop navigation

Use a stable left rail with:

- TimeLens brand at top.
- Home, Limits, Focus, and Settings as the primary navigation group.
- Usage History as a visually separated secondary action.
- Local/tracking/privacy status kept quiet and secondary.

The active destination must be obvious without using excessive fill or glow. Icon, label, text weight, and a restrained blue selected treatment should work together.

### Tablet and mobile navigation

- Tablet may collapse the left rail into a compact top navigation.
- Mobile uses a compact header and bottom navigation for the four primary destinations.
- Usage History remains accessible as a secondary action.
- Fixed mobile navigation must respect `env(safe-area-inset-bottom)`.
- No horizontal scrolling at 390 px width.

## Design system

### Visual tone

The approved master-plan image is the target: clean, modern, calm productivity SaaS styling with strong blue hierarchy, pale blue support surfaces, restrained status colors, and generous but efficient spacing.

### Color

- Royal/indigo blue is the main action and navigation color.
- Pale blue is used for selected and informational support states.
- Green indicates healthy/on-track/live state.
- Amber indicates approaching a boundary.
- Red is reserved for destructive or reached-boundary states.
- Light mode uses an off-white/very-light-blue canvas and white cards.
- Dark mode keeps the same hierarchy with navy/charcoal surfaces rather than redesigning the page structure.

### Typography

- Use clear display hierarchy for page titles and major time values.
- Major time metrics use strong weight and tabular numerals.
- Supporting labels are quieter and smaller, but must remain readable.
- Avoid excessive all-caps except short eyelines/status labels.

### Spacing and surfaces

Use a consistent spacing rhythm based on 4/8/12/16/24/32 px increments.

Three primary surface levels:

1. **Primary instrument** — dominant page element, strongest visual emphasis.
2. **Workspace card** — standard management/analytics panel.
3. **Compact/supporting card** — small stat, row, quick action, or secondary context.

Cards should share consistent radii, border treatment, and restrained shadows. Avoid unnecessary glass effects, excessive gradients, or floating decoration.

### Controls

- Primary action: solid blue.
- Secondary action: neutral/white surface with border.
- Quiet action: text or low-emphasis control.
- Destructive action: reserved red treatment and visually separated from normal actions.
- Touch targets should be at least 44 px where practical, with 48 px preferred for major compact-surface actions.
- All interactive elements require visible `:focus-visible` treatment.

## Page designs

## 1. Home Dashboard

Home should function as the central review and action hub.

### First viewport

- Dominant Today/Total Usage instrument.
- Supporting Sites Visited and Daily Budget cards.
- Current-site operational row with current domain, current usage, boundary state, and quick actions.
- Start Focus, Add Limit, and Side Panel actions must remain easy to reach.

### Analytics region

Use a clean grid similar to the master-plan image:

- Time Breakdown.
- Top Distracting Sites.
- Usage Trend.
- Alerts/attention items.
- Recent Sessions.

The analytics should be scan-friendly and visually quieter than the primary usage instrument. Do not invent unsupported metrics.

## 2. Limits

Limits becomes a focused management workspace rather than a dense settings form.

### Site limits

Each limit row should clearly show:

- Domain.
- Status badge such as On Track, Warning, Strict, or Reached when supported by existing state.
- Used/allowed time.
- Progress bar.
- Row action/menu.

The Add Limit action is the page-primary action.

### Daily browsing budget

Use a separate card with:

- Used vs budget time.
- Remaining time.
- Progress indication.
- Edit action.

### Category limits

Keep category limits optional and progressively disclosed/collapsed when not needed.

## 3. Focus Mode

Focus should be action-first and visually calm.

### Idle state

Center the experience around:

- Eyeline: Focus.
- Main prompt: Ready to focus?
- Duration choices: 25, 45, 60, 90 minutes.
- Existing supported presets/modes represented as compact chips.
- One dominant Start Focus action.
- Brief summary of what will be blocked/protected.

### Active state

- Remaining time becomes the dominant metric.
- Current session/preset is clearly identified.
- Blocked-site count/status is secondary.
- End Focus is clear but visually less inviting than starting a session.

## 4. Settings

Settings is organized into clean groups, following the master-plan image while retaining the existing product controls.

Groups:

- Notifications.
- Tracking.
- Appearance.
- Data.
- Privacy.
- Extension Health.

### Appearance

Keep the already approved and implemented choices:

- Light.
- Dark.
- System.

The choice applies immediately and persists locally.

### Destructive controls

Clear data/destructive actions must be visually separated from normal settings controls and remain quieter until intentionally selected.

### Extension health

Keep health/details secondary and collapsible.

## 5. Usage History

History becomes a clear inspection workspace.

- Summary metrics at the top.
- Sticky table/header treatment where useful.
- Strong alignment between website, started time, and active time.
- Tabular numerals for time values.
- Clear row rhythm and hover/focus feedback.
- Good empty-state behavior.
- History remains secondary navigation.

## 6. Popup

Keep the current approved compact popup polish and align it with the master-plan image.

- TimeLens brand + tracking status header.
- Today summary with compact time ring.
- Two balanced stat tiles.
- Current website row with avatar, domain, usage, and a compact boundary badge.
- Two equal-height main actions.
- Balanced Dashboard and Side Panel footer actions.
- Full Light and Dark treatment.

The popup remains fast and action-first rather than becoming a miniature dashboard.

## 7. Side Panel

The Side Panel is a persistent browsing companion.

Priority order:

1. Current website.
2. Current active time.
3. Current boundary/remaining time.
4. Quick limit action.
5. Focus action.
6. Dashboard navigation.

It should be readable at approximately 420 px width and avoid dense dashboard-style analytics.

## 8. Blocked Page

Follow the dark master-plan target closely while retaining safe existing behavior.

- Clear eyeline indicating a boundary was reached.
- Large domain/context message.
- Explain the reset/limit context using existing supported data.
- Primary recovery action: return/close/get back to productivity according to existing safe behavior.
- Dashboard is secondary.
- Optional allowance/extension actions remain conditional and subordinate.
- Do not encourage bypassing limits by default.

## Dialogs

Dialogs should share consistent geometry across limit, budget, import, and other existing flows.

Desktop:

- Centered dialog.
- Clear title and explanatory copy.
- Consistent fields and footer alignment.

Mobile:

- Bottom-sheet/full-width behavior.
- Safe-area spacing.
- Primary action remains visible without horizontal overflow.

## Responsive behavior

### Desktop

Primary review size: 1440 px wide.

- Left rail remains stable.
- Main content uses a centered max width around 1180–1240 px where appropriate.
- Home uses multi-column analytics.
- Limits and Settings can use broad workspace cards rather than overly narrow forms.

### Mobile

Primary review size: 390×844.

- One-column content.
- Compact header.
- Bottom navigation.
- Primary actions remain reachable above navigation.
- Cards reduce padding without becoming cramped.
- Dialogs become bottom sheets.
- No clipped text or horizontal scrolling.

## Light, Dark, and System appearance

All major surfaces must support explicit Light, explicit Dark, and System behavior through the shared appearance controller.

Dark mode must not rely only on `prefers-color-scheme`. Explicit `data-theme="light"` and `data-theme="dark"` must win over legacy page CSS.

Review dark mode for:

- Page canvas.
- Sidebar/header.
- Primary instruments.
- Analytics cards.
- Inputs/selects.
- Status chips.
- Popup.
- Side Panel.
- Blocked page.
- Dialogs.

## Accessibility

- Visible keyboard focus treatment.
- Sufficient text/background contrast in both appearance modes.
- Touch-friendly controls.
- No information conveyed by color alone.
- Reduced-motion support remains intact.
- Screen-reader labels and existing ARIA relationships are preserved when markup moves.
- Disabled actions remain legible and intentional.

## Implementation boundaries

The redesign should primarily touch:

- `src/shared/theme.css`
- `src/styles/tailwind.css`
- `src/styles/precision-polish.css`
- `src/styles/appearance.css`
- `src/styles/appearance-contrast.css`
- dashboard HTML/CSS/view files as needed
- popup HTML/CSS
- side panel HTML/CSS
- blocked HTML/CSS
- preview fixtures
- UI contract tests
- CI screenshot matrix

Production JavaScript behavior should remain unchanged wherever possible.

## Testing strategy

Use RED → GREEN TDD for each implementation group.

### Contract coverage

Add or extend tests for:

- Global layout/navigation structure.
- Home master-plan hierarchy.
- Limits workspace rows and progress hierarchy.
- Focus idle/active stage structure.
- Settings grouping and Appearance control.
- History inspection/table structure.
- Popup compact alignment.
- Side Panel priority order.
- Blocked-page action hierarchy.
- Responsive/mobile rules.
- Explicit Light/Dark selectors.
- Runtime action hooks/IDs preserved.

### Full verification

Every green cycle must include the repository’s full check flow:

- CSS build.
- Node test suite.
- Extension validator.
- Web Store package build.

No existing regression test may be weakened simply to make the redesign pass.

## Deterministic visual QA

Preview fixtures must use the same production theme/page CSS and deterministic mock states.

Minimum screenshot review matrix:

- Home: desktop light, desktop dark, mobile light, mobile dark.
- Limits: desktop light, desktop dark, mobile light, mobile dark.
- Focus: desktop light, desktop dark, mobile light, mobile dark.
- Settings: desktop Light/Dark/System and mobile Light/Dark/System where practical.
- History: desktop light and dark.
- Popup: light and dark at 360×600.
- Side Panel: light and dark at approximately 420×900.
- Blocked: light and dark where supported, with dark as the primary design target.
- Dialog: desktop light/dark and mobile light/dark.

Visual review checks:

- Alignment.
- Clipping.
- Card hierarchy.
- Primary-action visibility.
- Mobile navigation overlap.
- Safe-area spacing.
- Dark-mode consistency.
- Text contrast.
- Disabled-state clarity.
- No unsupported/fake product data in production code.

## Acceptance criteria

The redesign is complete only when all of the following are true:

1. All eight major surfaces clearly reflect the approved master-plan image.
2. Navigation and card hierarchy feel consistent across the product.
3. Home, Limits, Focus, Settings, and History have distinct task-oriented layouts rather than generic repeated cards.
4. Popup and Side Panel remain compact and action-first.
5. Blocked page presents a clear, calm boundary and recovery path.
6. Light, Dark, and System are visually coherent across all supported surfaces.
7. Mobile at 390×844 has no horizontal overflow or fixed-navigation overlap.
8. Existing action hooks and runtime behavior remain intact.
9. Permissions, privacy boundaries, schema, tracking, limits, and enforcement semantics remain unchanged.
10. Full tests, validator, package build, and screenshot CI are green.
11. Fresh screenshots are visually reviewed and supplied with the PR update.
12. PR #6 is left open and unmerged for review.

## Out of scope

- New analytics metrics not supported by current data.
- Accounts or authentication.
- Cloud sync.
- Backend services.
- Telemetry.
- New extension permissions.
- New tracking or blocking semantics.
- Replacing the existing architecture with a new framework.
- Merging PR #6.
