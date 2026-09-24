# Changelog

All notable changes to TimeLens are documented here.

## 1.6.0 — 2026-09-24

### Added
- Resilient shared messaging: every UI request now has a 10-second timeout, one automatic retry for transient service-worker wake-up failures, and human-readable error copy (including reload hints when the extension context is invalidated).
- Smooth motion polish: the popup summary ring and dashboard budget ring animate via registered angle custom properties; progress bars, trend bars, toasts, and buttons transition smoothly. All motion is disabled under `prefers-reduced-motion: reduce`.
- Busy affordances on every action (focus, limits, presets, budgets, exports): buttons disable, expose `aria-busy`, and show an inline spinner while work runs.
- Dashboard initial-load recovery panel (`Try again`) so a sleeping or restarted worker never leaves a silent page of placeholder zeros; later refresh failures keep the last good data and report via toast.
- Live popup: the Focus countdown and summary ring update every second while the popup is open and refresh automatically when a Focus session ends.
- Honest popup status pill: the header pill now reflects the strongest active boundary — “On Track”, “Almost up” (≤20% remaining), or “Limit reached” — instead of a static label (`src/core/track-state.js`).
- Onboarding uses the shared busy-state and tone-driven status patterns.
- Side Panel polling now backs off exponentially on failure (15 s → 60 s cap) and resets when the panel becomes visible again.
- Blocked page degradation: when live block status cannot be fetched, the page still explains the boundary from the request context (extra-time actions stay safely hidden) and offers a `Try again` retry.

### Changed
- Saving a limit from the popup confirms with “30 min/day saved ✓”; an existing limit reads “Limit active ✓” instead of the colder “Limit already set”.
- Error surfaces use `role="alert"` where they announce failures; dashboard error toasts stay visible longer than informational ones.
- Snapshot health now estimates storage size with a single serialization pass instead of stringify + UTF-8 encode, reducing per-poll CPU on slow devices.

### Compatibility and privacy
- Schema remains version 4; all usage, limits, categories, budgets, schedules, Focus presets, diagnostics, and backups remain compatible.
- Chrome permissions are unchanged: `tabs`, `storage`, `idle`, `alarms`, `notifications`, and `sidePanel`.
- No host permissions, content scripts, backend, accounts, cloud sync, analytics, or remote runtime code were added.

## 1.5.0 — 2026-08-19

### Changed
- Reworked the premium dashboard to closely follow the approved TimeLens reference: white/blue SaaS shell, fixed desktop sidebar, compact KPI cards, donut breakdown, ranked distracting sites, alert cards, seven-day usage bars, and recent sessions.
- Added real-data KPI presentation for total usage, Focus state, sites visited, and the existing optional daily browsing budget. No synthetic productivity score, streak, cloud-sync, or telemetry data is introduced.
- Added a secondary Usage History entry in the sidebar that opens the existing local History drawer with total-time and session-count summaries.
- Rebuilt the extension popup around the approved reference composition: circular Today summary, sites-visited and Focus status, current website boundary, Focus/Limit actions, and a visible dashboard entry in one compact screen.
- Kept the optional Top Sites detail out of the popup normal view so the primary actions remain visible without scrolling at the representative 360×600 viewport.
- Refreshed deterministic dashboard and popup preview fixtures for visual QA.
- Kept the dark high-contrast blocked/time-out presentation and responsive dashboard behavior consistent with the same blue/indigo visual system.

### Compatibility and privacy
- Schema remains version 4 and all existing tracking, limits, categories, schedules, total budget, Focus presets, diagnostics, and local backups remain compatible.
- Chrome permissions are unchanged: `tabs`, `storage`, `idle`, `alarms`, `notifications`, and `sidePanel`.
- No host permissions, content scripts, browsing-history access, cookies, backend, accounts, cloud sync, analytics, or remote runtime code were added.

## 1.4.0 — 2026-08-17

### Changed
- Rebuilt the dashboard around four primary destinations: Home, Limits, Focus, and Settings.
- Added a simplified Home view with today's active browsing, current website, Top 5 sites, limits needing attention, recent sessions, and three fast actions.
- Replaced the permanent site-limit form with a compact Add/Edit Limit dialog. A normal daily limit now requires only a website and time; weekly/monthly reset, Strict mode, and schedules stay under Advanced options.
- Replaced always-visible limit action buttons with compact overflow menus.
- Moved total-budget configuration into a dialog and collapsed category limits by default.
- Reworked Focus into an action-first duration/preset flow. Raw website lists and block/allow settings stay in Focus settings.
- Grouped notifications, tracking, data, privacy, and extension health under Settings; health details stay collapsed until requested.
- Simplified the popup and Side Panel around current usage, the most relevant boundary, one quick limit action, and Focus.
- Added a secondary History drawer instead of keeping History in the primary dashboard navigation.
- Split dashboard presentation into focused Home, Limits, Focus, Settings, dialogs, and form modules.

### Compatibility and privacy
- Schema remains version 4; existing 1.3 usage, limits, categories, budgets, schedules, Focus presets, diagnostics, and backup data remain compatible.
- Chrome permissions are unchanged: `tabs`, `storage`, `idle`, `alarms`, `notifications`, and `sidePanel`.
- No host permissions, content scripts, remote analytics, backend, accounts, or remote runtime code were added.

## 1.3.0 — 2026-08-16

### Added
- Chrome Side Panel focus assistant with live current-site usage, daily-budget progress, active boundaries, quick site limits, and Focus preset launchers.
- Optional total daily active-browsing budget with warn-only or block-at-boundary behavior.
- Category limits that combine multiple websites into one daily, weekly, or monthly boundary.
- Smart local schedules for site and category limits, including selected weekdays and overnight windows.
- Focus Mode `Allow only` mode in addition to the existing block-list mode.
- Saved local Focus presets for repeatable work, study, and deep-work sessions.
- Schema-v4 migration for budgets, categories, schedules, and Focus presets.
- Dedicated blocked-page explanations for total-budget and category boundaries.

### Changed
- Focus sessions now carry a name, mode, and normalized domain list while retaining compatibility with older block-list data.
- Limit snapshots expose whether scheduled rules are currently active.
- Warning deduplication now also covers total-budget and category boundaries.
- Dashboard navigation now separates Guardrails, Site Limits, and Focus for clearer daily use.
- Chrome Web Store package and CI artifact are versioned as `timelens-1.3.0.zip`.

### Privacy and permissions
- Added only the Chrome `sidePanel` permission so TimeLens can open its local focus-assistant panel.
- No host permissions, content scripts, browsing-history access, cookies, remote analytics, backend, or remotely hosted runtime code were added.

### Compatibility
- Schema-v3 TimeLens data migrates automatically to schema v4 without deleting valid usage history, limits, diagnostics, backup state, or alert preferences.
- Existing unscheduled limits continue to apply all day.
- Existing `blockedDomains` Focus messages remain supported.

## 1.2.0 — 2026-08-16

### Added
- First-run onboarding with optional first website limit and alert preferences.
- Schema-v3 migration and normalization for existing local data.
- Period-scoped extra-time allowances for daily, weekly, and monthly limits.
- Local runtime diagnostic journal and extension-health summary.
- JSON restore with validation and automatic local backup of existing data before replacement.
- Edit, pause/resume, and delete controls for website limits.
- Configurable 5-minute, 1-minute, and timeout notification preferences.
- Production Web Store ZIP packaging and CI artifact upload.
- Security policy and MIT license.

### Changed
- Notification failures are isolated from timeout enforcement.
- Background event failures are captured locally instead of breaking subsequent serialized work.
- Dashboard Privacy & Data controls now include alerts, restore, storage estimate, and diagnostic status.
- GitHub Actions updated to current Node-native action generations.

### Compatibility
- Version-2 TimeLens data migrates automatically without deleting usage history.
- Existing limits without an explicit period continue to behave as daily limits.

## 1.1.0 — 2026-08-16

- Added daily, weekly, and monthly website limits.
- Added native 5-minute, 1-minute, and timeout alerts.
- Added period-aware dashboard, popup, and blocked-page copy.

## 1.0.0 — 2026-08-15

- Initial local-first active browsing tracker.
- Added website limits, Focus Mode, popup, dashboard, history, export, and retention controls.
