# TimeLens

**TimeLens** is a privacy-first Chrome extension that shows where your active browsing time goes and helps you protect attention with website limits and Focus Mode.

> **See your time. Control your web.**

## Why TimeLens

Most browser-time counters overcount tabs that are merely open. TimeLens counts a website only when all three are true:

1. the tab is active,
2. the Chrome window is focused, and
3. Chrome reports the user as active rather than idle or locked.

That makes the history closer to real attention time instead of tab-open time.

## TimeLens 1.2 production features

- **Accurate active-time tracking** across tab switches, focus changes, idle/locked states, sleep/wake gaps, and local midnight.
- **First-run onboarding** that explains tracking/privacy and can create the first website limit in one screen.
- **Fast popup** with today's total, current website, top sites, period-aware limit progress, and one-click Focus Mode.
- **Dashboard** with Today / 7 days / 30 days views, activity bars, top sites, recent sessions, limits, and health status.
- **Daily, weekly, or monthly website limits** with edit, pause/resume, delete, and optional strict mode.
- **Configurable native alerts** at 5 minutes remaining, 1 minute remaining, and timeout.
- **Automatic timeout enforcement** even if notifications are disabled or Chrome cannot display one.
- **Period-scoped temporary extra time** for non-strict limits, so a weekly allowance stays tied to that week instead of resetting every day.
- **Focus Mode** for 25, 45, 60, or 90 minutes with a user-editable block list.
- **JSON export and restore** with schema validation and an automatic local backup before valid imported data replaces current data.
- **Schema migrations** that upgrade older TimeLens local data without deleting usage history.
- **Local extension health** with bounded diagnostic history and approximate storage usage.
- **Automatic light/dark appearance**, reduced-motion support, keyboard focus states, and responsive layouts.
- **No account, backend, cloud analytics, ads, or remote runtime code.**

## Limit periods and reset rules

Each website can have one limit period:

- **Daily** — resets at local midnight.
- **Weekly** — resets Monday at 00:00 in the device's local timezone.
- **Monthly** — resets on the first day of the month at 00:00 local time.

Older TimeLens limits that do not contain a period are treated as **daily** automatically.

TimeLens evaluates the active limited website during normal activity reconciliation and when tab/focus/idle state changes. It sends at most one warning per threshold for the current website and period. If Chrome or the computer skips a threshold, TimeLens uses only the most urgent applicable warning rather than stacking stale alerts.

## Reliability model

TimeLens treats limit enforcement as more important than optional UI feedback. A failure to create a native notification does **not** cancel a timeout block. Transient background failures are isolated from the serialized service-worker queue and recorded locally in a bounded diagnostic journal instead of being sent to a server.

Stored data uses a versioned schema. Version 1.2 uses schema v3, normalizes malformed local values, migrates older data, and validates imported JSON before replacing live data.

## Privacy model

TimeLens stores data locally with `chrome.storage.local`. It persists normalized website domains such as `youtube.com`, timing data, limits, alert-deduplication state, Focus Mode state, preferences, local diagnostics, and restore backup data when applicable. It does **not** intentionally persist page titles, query strings, browsing content, cookies, passwords, form data, or keystrokes, and it does not send usage data to a TimeLens server.

See [PRIVACY.md](PRIVACY.md) for the full data/permission explanation.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `tabs` | Read the active tab URL so TimeLens can reduce it to a domain and measure which website is active. |
| `storage` | Keep usage totals, sessions, limits, warning state, preferences, diagnostics, and local restore backup data. |
| `idle` | Stop counting when the machine is idle or locked. |
| `alarms` | Reconcile active time and recover cleanly across Manifest V3 service-worker sleep. |
| `notifications` | Show user-configured 5-minute, 1-minute, and timeout alerts. |

TimeLens intentionally does **not** request `history`, cookies, `webRequest`, content-script host access, or `<all_urls>` host permissions.

## Install for development

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the repository root containing `manifest.json`.
6. Pin TimeLens if you want quick popup access.

There is no frontend build step and there are no production npm dependencies.

## Development

Node.js is used only for automated tests, validation, and release packaging.

```bash
npm test
npm run validate
npm run check
npm run package
```

- `npm run check` runs the complete test suite and package validator.
- `npm run package` creates `dist/timelens-<version>.zip`, ready for Chrome Web Store upload/review.

## Test coverage

The suite covers:

- URL/domain normalization and non-web schemes
- tab switching and active-session boundaries
- browser focus loss/resume and idle/active transitions
- local-midnight splitting and sleep-like delayed alarm reconciliation
- daily/weekly/monthly limit windows and usage aggregation
- 5-minute, 1-minute, and timeout warning priority/deduplication
- notification-failure isolation from timeout enforcement
- configurable alert preferences
- period-scoped temporary allowances and strict-mode rejection
- Focus Mode blocking/start/stop
- schema-v3 migration and malformed-data normalization
- import validation plus automatic backup-before-restore
- pause/resume and edit-oriented limit flows
- first-install onboarding behavior
- retention pruning and local diagnostic bounds
- Manifest V3 permissions and referenced assets
- popup/dashboard/onboarding/blocked-page contracts
- reduced-motion and hidden-state regression protection
- runtime JavaScript syntax checks
- duplicate HTML ID checks
- remote runtime fetch/import/script checks
- dynamic-code (`eval` / `new Function`) rejection
- version parity and release-package contracts

## Architecture

```text
manifest.json
src/
├── background/
│   ├── migrations.js       # schema migration + import validation
│   ├── service-worker.js   # Chrome event/message/notification adapter
│   └── store.js            # local persistence, backup, diagnostics, retention
├── core/
│   ├── activity.js         # pure tracking state machine
│   ├── analytics.js        # usage aggregation
│   ├── domain.js           # URL -> domain normalization
│   ├── focus.js            # focus-session rules
│   ├── limits.js           # period windows, limits, warning decisions
│   └── time.js             # local dates/duration helpers
├── popup/                  # compact daily view
├── dashboard/              # history, limits, focus, restore, health, privacy
├── onboarding/             # first-run setup
├── blocked/                # limit/focus boundary page
├── options/                # redirects to dashboard settings
└── shared/                 # design tokens + UI helpers
```

The core and migration logic stay independent of Chrome APIs where practical, so behavior can be tested without a live browser backend. Chrome-specific behavior is isolated in the Manifest V3 service worker.

## Release pipeline

GitHub Actions runs the full checks, creates the Chrome Web Store ZIP, and uploads it as a workflow artifact. The validator requires approved permissions only, checks runtime JavaScript syntax, verifies required pages/assets, and rejects remote or dynamically evaluated runtime code.

## Project docs

- [V1 design](docs/superpowers/specs/2026-08-15-timelens-v1-design.md)
- [V1 implementation plan](docs/superpowers/plans/2026-08-15-timelens-v1.md)
- [Period limits & alerts design](docs/superpowers/specs/2026-08-16-period-limits-alerts-design.md)
- [Period limits & alerts plan](docs/superpowers/plans/2026-08-16-period-limits-alerts.md)
- [1.2 production-hardening design](docs/superpowers/specs/2026-08-16-production-hardening-v1.2-design.md)
- [1.2 production-hardening plan](docs/superpowers/plans/2026-08-16-production-hardening-v1.2.md)
- [Privacy](PRIVACY.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [License](LICENSE)
