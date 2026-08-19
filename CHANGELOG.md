# Changelog

All notable changes to TimeLens are documented here.

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
