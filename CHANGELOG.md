# Changelog

All notable changes to TimeLens are documented here.

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
