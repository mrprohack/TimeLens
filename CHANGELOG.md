# Changelog

All notable changes to TimeLens are documented here.

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
