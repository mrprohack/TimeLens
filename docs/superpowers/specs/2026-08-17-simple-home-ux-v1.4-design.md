# TimeLens 1.4 — Simple Home UX Design

**Status:** Approved direction: Simple Home + Advanced Settings
**Date:** 2026-08-17
**Target:** TimeLens 1.4

## 1. Goal

Make TimeLens understandable and useful within a few seconds while preserving the advanced 1.3 capabilities for users who need them.

The redesign must reduce visible decisions, reduce page length, reduce repeated configuration, and make the primary actions obvious:

1. See where time went.
2. Limit a distracting site.
3. Start Focus.
4. Check whether a limit is close or reached.
5. Open advanced controls only when needed.

Success means a first-time user can open TimeLens, understand today's usage, add a simple daily site limit, and start Focus without reading documentation.

## 2. Product Principles

### 2.1 Progressive disclosure
Everyday controls are visible. Advanced controls are hidden behind an explicit **Advanced options** action or a dedicated Settings screen.

### 2.2 One primary action per area
Each card has one visually dominant action. Secondary actions use quiet buttons or menus.

### 2.3 Defaults before configuration
TimeLens should choose sensible defaults instead of asking for every option:

- Site limit default reset: Daily.
- Site limit default mode: Normal, not Strict.
- Schedule: Off.
- Alerts: Existing defaults.
- Focus: 25 minutes, Block distractions.
- Total browsing budget: Off until enabled.

### 2.4 Plain language
Prefer `Daily limit` over `Guardrail`, `Websites` over `Domains`, `Extra options` over configuration terminology, and `Focus` over mode-heavy language.

### 2.5 Keep privacy visible but quiet
A small persistent statement such as **Private · stored on this device** is enough on Home. Detailed privacy, backup, diagnostics, and retention settings belong in Settings.

## 3. Information Architecture

The current long single-page dashboard becomes four primary destinations:

```text
Home
Limits
Focus
Settings
```

### Home
Daily overview and fastest actions only.

### Limits
All site, category, schedule, and total-budget controls.

### Focus
Start Focus, use presets, manage presets.

### Settings
Notifications, retention, backup/restore, diagnostics, privacy, data deletion.

History is not a top-level destination. Home shows the five most recent sessions; **View full history** opens a secondary history drawer on desktop and a full-screen sheet on narrow/mobile layouts. Closing it returns to Home without changing the primary navigation state.

## 4. Dashboard Home

The first viewport should answer three questions immediately:

- How much time have I used today?
- What is using the most time?
- Do I need to act now?

### 4.1 Header

Desktop:

```text
TimeLens                       Home  Limits  Focus  Settings
```

Mobile:

```text
TimeLens                               Settings icon
[ Home ] [ Limits ] [ Focus ]
```

No six-link navigation.

### 4.2 Hero summary

Large primary metric:

```text
2h 18m
Today
```

Secondary line:

```text
32m less than yesterday
```

If comparison is unavailable, show:

```text
Active browsing today
```

Alongside or immediately below:

```text
Current
youtube.com · 18m today
```

### 4.3 Quick actions

Exactly three prominent actions:

```text
[ Start Focus ]   [ Add Limit ]   [ Open Side Panel ]
```

No category/schedule/budget controls on Home.

### 4.4 Top websites

Show only the top five sites with simple horizontal progress bars.

Each row:

```text
YouTube                 48m
██████████████
                         Limit
```

If a site already has a limit, replace `Limit` with remaining state:

```text
12m left
```

Clicking a row opens a small detail drawer rather than navigating away.

### 4.5 Active limits

Show only limits that matter now:

- reached,
- <= 20% remaining,
- currently scheduled,
- Focus-related active blocks.

Example:

```text
Needs attention
YouTube      12m left       [Edit]
Social       Limit reached  [View]
```

If nothing requires attention:

```text
All limits look good today.
```

### 4.6 Recent activity

Show the last five sessions only.

A quiet `View full history` control opens the secondary history drawer/sheet defined in Section 3.

Do not display an always-visible full history table on Home.

## 5. Add Limit Flow

The current multi-field form becomes a compact dialog/sheet.

### 5.1 Default simple flow

```text
Add a limit

Website
[youtube.com]

Daily time
[ 45 ] minutes

[ Save limit ]

Advanced options ▾
```

Only two user decisions are required: website and time.

### 5.2 Advanced options

Collapsed by default. Expanding reveals:

- Reset: Daily / Weekly / Monthly
- Strict mode
- Schedule toggle
- Weekday controls
- Start/end time

The advanced section must never open automatically for a new limit.

### 5.3 Editing

Editing an existing limit uses the same dialog and pre-fills values.

List rows use an overflow menu:

```text
⋯
Edit
Pause
Delete
```

Do not place Edit, Pause, Resume, Delete as four always-visible buttons on every row.

## 6. Limits Screen

The Limits screen contains three cards in this order:

### 6.1 Site limits
Primary section.

Header:

```text
Site limits                      [+ Add limit]
```

Each row shows:

- site name,
- used / limit,
- progress,
- reset period,
- current status,
- overflow menu.

Schedule/Strict details appear as small badges only when enabled.

### 6.2 Daily browsing budget
Secondary card.

When disabled:

```text
Daily browsing budget
Set one overall limit for active browsing.
[ Set budget ]
```

When enabled:

```text
Daily browsing budget
3h 42m / 5h
████████████████░░░
1h 18m left
[ Edit ]
```

Configuration opens a small dialog rather than showing the full form permanently.

### 6.3 Categories
Collapsed secondary section by default:

```text
Category limits (2)                         ›
```

Expanding shows category rows. `Add category` opens a dedicated sheet/dialog.

Schedules remain inside each category's advanced options.

This keeps categories available without forcing every user to understand them.

## 7. Focus Screen

Focus becomes action-first rather than configuration-first.

### 7.1 Idle state

Hero:

```text
Ready to focus?

[ 25 min ] [ 45 min ] [ 60 min ] [ 90 min ]

[ Start Focus ]
```

Below:

```text
Using: Block distractions
YouTube, Reddit, Instagram +2
Change
```

No textarea is visible by default.

### 7.2 Presets

Show preset cards:

```text
Work      60m
Study     45m
Deep Work 90m
```

One click selects a preset; the primary `Start Focus` action starts the selected preset. This prevents accidental session starts while keeping the flow fast.

`Manage presets` is secondary.

### 7.3 Active Focus

When Focus is running, replace configuration with a single calm state:

```text
Focus in progress
42:18
Work
5 distracting sites blocked

[ End Focus ]
```

Do not leave creation forms visible during an active session.

### 7.4 Allow-only mode

`Allow only` remains available under **Focus settings** / `Change`, not as a primary first-time control.

## 8. Popup

The popup must be the fastest interface in the product.

Target height: compact enough to scan without scrolling in normal state.

Structure:

```text
TimeLens

Today
2h 18m

Current site
YouTube · 48m
12m left

[ Start Focus ]
[ Limit this site ]

Open dashboard            Open side panel
```

Show at most three top sites, and only if space remains clean.

Remove duplicate explanatory content.

If Focus is active, the primary button becomes:

```text
[ End Focus · 42m left ]
```

## 9. Side Panel

The Side Panel remains an always-available live companion but is simplified.

Top to bottom:

1. Current website
2. Today's usage for current website
3. Remaining site/category/budget boundary
4. One quick limit action
5. Focus state / Start Focus
6. Open dashboard

Saved Focus presets can appear as compact chips, not large cards.

Do not duplicate full dashboard configuration in the Side Panel.

## 10. Settings Screen

Settings contains advanced and low-frequency controls.

Sections:

### Notifications
- 5-minute warning
- 1-minute warning
- Time-up notification

### Tracking
- Idle threshold
- Detailed-session retention

### Data
- Export JSON
- Restore JSON
- Clear usage data

### Privacy
- Local-only explanation
- permissions explanation
- link to privacy policy/document

### Extension health
Collapsed by default:

```text
Extension health      Healthy ›
```

Expanding shows storage estimate, diagnostics, last error, clear diagnostics.

Diagnostics must not be a visually prominent everyday feature when everything is healthy.

## 11. Visual Design

### 11.1 Style

Use a calm, minimal productivity aesthetic:

- large whitespace,
- fewer borders,
- fewer simultaneous cards,
- one strong accent color,
- neutral surfaces,
- soft radius,
- no decorative gradients required,
- minimal iconography,
- no dense enterprise-dashboard feel.

### 11.2 Typography

Use three clear levels:

- Page title / primary metric
- Section title
- Supporting text

Avoid small text for critical status.

### 11.3 Color semantics

Use status color only when meaningful:

- neutral: normal,
- warning: approaching limit,
- danger: limit reached,
- accent: primary action / active Focus.

Do not make every card colorful.

### 11.4 Motion

Use short transitions only for drawers, dialogs, collapsible advanced options, and progress updates. Respect reduced-motion preferences.

## 12. Responsive Design

### Desktop
Maximum content width around 1000–1100 px. Home uses a clean two-column layout after the hero.

### Tablet
Single primary column with compact secondary cards.

### Mobile
- Sticky bottom or top navigation for Home / Limits / Focus.
- Settings remains accessible from the header icon.
- Dialogs become bottom sheets or full-width cards.
- History and site-detail drawers become full-screen sheets.
- Minimum 44px touch targets.
- No horizontal scrolling.
- No seven-column weekday control until Advanced options is expanded.

### Popup / Side Panel
Prioritize scanability over data density. No element should require horizontal scrolling.

## 13. Interaction Rules

- Every destructive action requires confirmation.
- Save actions show immediate success feedback.
- Forms preserve entered values after recoverable validation errors.
- Validation errors appear next to the affected field, not only as a global toast.
- Keyboard focus moves into an opened dialog/drawer and returns to the trigger when closed.
- Escape closes non-destructive dialogs and drawers.
- Advanced sections remember their state only within the current screen session; they default collapsed on a new visit.

## 14. Architecture Boundaries

This is primarily a presentation and interaction redesign.

### Keep unchanged where possible
- schema v4,
- service-worker enforcement order,
- existing local storage model,
- site/category/budget rules,
- schedule engine,
- notification behavior,
- privacy/security model,
- no runtime framework.

### Refactor UI where useful
Split oversized dashboard rendering responsibilities into small UI modules if needed, for example:

```text
src/dashboard/home-view.js
src/dashboard/limits-view.js
src/dashboard/focus-view.js
src/dashboard/settings-view.js
src/dashboard/dialogs.js
```

These modules consume the existing snapshot/message APIs. Business rules remain in core/background code.

Do not introduce React or another runtime framework for this redesign.

## 15. Testing Strategy

Use TDD for the redesign.

Required test groups:

### Information architecture
- only Home / Limits / Focus / Settings are primary dashboard navigation,
- History is secondary and opens from Home without changing primary navigation,
- advanced sections start collapsed.

### Simple limit flow
- website + time are sufficient to save a daily normal limit,
- advanced options expose period/strict/schedule,
- edit reuses the same dialog,
- row overflow menu contains Edit/Pause/Delete.

### Focus flow
- simple duration selection,
- preset selection,
- active state hides setup form,
- allow-only mode remains available through advanced/change controls.

### Popup
- Today, current site, Focus, Limit this site are visible,
- normal popup does not require scrolling at representative viewport.

### Responsive/accessibility
- 390px dashboard has no horizontal overflow,
- Side Panel has no horizontal overflow,
- dialogs/drawers have labels and focus handling,
- buttons meet touch-target requirements,
- reduced-motion behavior remains supported.

### Regression
All existing tracking, limit, category, schedule, migration, import, notification-failure, security, and packaging tests remain green.

## 16. Acceptance Criteria

The redesign is complete when all of the following are true:

1. Home first viewport contains today total, current site, quick actions, and top sites without advanced forms.
2. A new daily site limit can be created with only website + time.
3. Period, Strict, and Schedule are hidden under Advanced options by default.
4. Category configuration is not visible on Home.
5. Budget configuration is not visible as a permanent form.
6. Focus can start from a simple duration/preset flow without showing a domain textarea.
7. Settings and diagnostics no longer compete with daily-use controls.
8. Popup exposes Today, current site, Start/End Focus, and Limit this site without clutter.
9. Side Panel shows live status and quick actions but does not duplicate full settings.
10. Full history is secondary and opens as a drawer/sheet from Home.
11. Desktop and 390px mobile layouts have no horizontal overflow.
12. Existing TimeLens 1.3 functionality remains available.
13. Existing privacy/security constraints remain unchanged.
14. All automated tests and release validation pass.

## 17. Explicit Non-Goals

This redesign does **not** add:

- AI recommendations,
- cloud sync,
- accounts,
- social features,
- gamification,
- new website permissions,
- content scripts,
- a new frontend framework,
- new analytics/telemetry.

The release is about clarity, speed, and lower cognitive load.