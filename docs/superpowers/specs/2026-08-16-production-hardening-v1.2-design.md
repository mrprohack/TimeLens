# TimeLens 1.2 Production Hardening Design

## Goal
Ship a production-ready local-first Chrome extension without adding accounts, cloud sync, analytics, remote runtime code, content scripts, or broad host permissions.

## Scope
TimeLens 1.2 hardens the existing 1.1 feature set and adds the minimum UX/release capabilities required for a trustworthy Chrome Web Store release.

### Reliability
- Native notification failures must never prevent time-limit enforcement.
- Closed/replaced tabs and transient Chrome API errors must not break the serialized service-worker queue.
- Runtime failures are recorded in a bounded local diagnostic journal (max 50 entries) and exposed as a health summary.
- Limit redirects are best-effort and idempotent.

### Data integrity and migrations
- Stored data moves to schema version 3.
- A dedicated migration/normalization module upgrades prior schemas and clamps malformed settings/limits.
- Import restores are validated and migrated before replacing live data.
- Existing data is saved to a local backup key before an import restore.
- Corrupt/unreadable data falls back safely to a clean schema instead of crashing the extension.

### Period-scoped extra time
- Temporary allowances are scoped to the active limit period: day, Monday-based week, or calendar month.
- Existing daily allowance behavior remains backward-compatible.

### Settings and alerts
- Alert preferences are stored locally and default to enabled for 5-minute, 1-minute, and timeout alerts.
- Timeout enforcement still occurs when the timeout notification is disabled or notification creation fails.

### Production UX
- Limits can be edited, paused/resumed, and deleted from the dashboard.
- Dashboard shows used, remaining, reset period, and status for each limit.
- First install opens a lightweight onboarding page explaining active-time tracking, local privacy, and permissions and lets the user create a first limit.
- Privacy/Data adds JSON restore with validation, local-backup-on-import, and a storage/diagnostic health summary.
- Existing popup, dashboard, blocked page, and dark/responsive behavior remain intact.

### Accessibility
- New controls use native labels/buttons, keyboard focus, status regions, and reduced-motion-safe styling.

### Release engineering
- Version becomes 1.2.0.
- CI runs tests, static validation, release package validation, and uploads a Chrome Web Store-ready ZIP artifact.
- Add CHANGELOG.md, SECURITY.md, and LICENSE.
- Keep runtime dependency-free.

## Architecture
- `src/background/migrations.js`: pure schema migration and import validation.
- `src/background/store.js`: persistence, backup/restore, period allowances, diagnostics.
- `src/background/service-worker.js`: Chrome API adapter, resilient enforcement, onboarding, message API.
- Existing core modules stay pure.
- Existing dashboard/popup remain vanilla ES modules.
- `src/onboarding/` is a small first-run page; no framework or remote assets.

## Data model v3
`timelensData` gains:
- `version: 3`
- `settings.alerts = { fiveMinutes: true, oneMinute: true, timeout: true }`
- `allowances[periodKey][domain] = milliseconds`
- `diagnostics = [{ at, code, message }]` capped at 50

A separate `timelensBackup` key stores the previous live object immediately before a successful import replacement.

## Testing
Use Node's built-in test runner and the existing fake Chrome integration harness. Add tests for v2→v3 migration, malformed data normalization, period allowances, import backup/restore, notification-failure enforcement, alert preferences, onboarding-on-install-only, pause/resume/edit message paths, and new UI/package contracts. Final GitHub Actions must run `npm run check` successfully on the exact PR head.