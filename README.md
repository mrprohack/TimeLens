# TimeLens

**TimeLens** is a privacy-first Chrome extension that shows where your active browsing time goes and helps you set healthy boundaries with website limits and Focus Mode.

> **See your time. Control your web.**

## Why TimeLens

Most browser-time counters overcount tabs that are merely open. TimeLens counts a website only when all three are true:

1. the tab is active,
2. the Chrome window is focused, and
3. Chrome reports the user as active rather than idle or locked.

That makes the history closer to real attention time instead of tab-open time.

## Features

- **Accurate active-time tracking** across tab switches, focus changes, idle/locked states, sleep/wake gaps, and local midnight.
- **Fast popup** with today's total, current website, top three sites, limit progress, and one-click Focus Mode.
- **Dashboard** with Today / 7 days / 30 days views, daily activity bars, top sites, and recent sessions.
- **Daily website limits** with optional strict mode.
- **Temporary extra time** (+5 or +15 minutes) for non-strict limits.
- **Focus Mode** for 25, 45, 60, or 90 minutes with a user-editable block list.
- **Clear blocked screen** instead of a confusing blank/redirect loop.
- **Local privacy controls** for idle threshold, detailed-session retention, JSON export, and clearing usage history.
- **Automatic light/dark appearance** with keyboard focus states and responsive mobile-width dashboard layout.
- **No account, cloud service, ads, or analytics.**

## Privacy model

TimeLens stores data locally with `chrome.storage.local`. It persists normalized website domains such as `youtube.com`, timing data, user limits, Focus Mode state, and local preferences. It does **not** persist page titles, query strings, browsing content, cookies, passwords, or form data, and it does not send usage data to a server.

See [PRIVACY.md](PRIVACY.md) for the full data/permission explanation.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `tabs` | Read the active tab URL so TimeLens can reduce it to a domain and measure which website is active. |
| `storage` | Keep usage totals, recent sessions, limits, focus state, and preferences locally. |
| `idle` | Stop counting when the machine is idle or locked. |
| `alarms` | Periodically reconcile active time and recover cleanly across MV3 service-worker sleep. |

TimeLens intentionally does **not** request `history`, cookies, `webRequest`, content-script host access, or `<all_urls>` host permissions.

## Install for development

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the repository root (the folder containing `manifest.json`).
6. Pin TimeLens from the Extensions menu if you want quick popup access.

There is no frontend build step and no runtime dependency install.

## Development

Node.js is used only for automated tests and package validation.

```bash
npm test
npm run validate
npm run check
```

`npm run check` runs the complete test suite and the package validator.

## Test coverage

The suite covers:

- URL/domain normalization and non-web schemes
- tab switching and active-session boundaries
- browser focus loss/resume
- idle/active transitions
- local-midnight splitting
- sleep-like delayed alarm reconciliation
- usage aggregation and ordering
- daily limit decisions and temporary allowances
- strict-mode allowance rejection
- Focus Mode blocking/start/stop
- retention pruning and per-day allowances
- clearing usage while preserving limits/preferences
- Manifest V3 permissions and referenced assets
- popup/dashboard/blocked-page contracts
- hidden-state regression protection
- syntax validation for every runtime JavaScript file
- duplicate HTML ID checks
- remote runtime fetch/import/script checks

## Architecture

```text
manifest.json
src/
├── background/
│   ├── service-worker.js   # Chrome event/message adapter
│   └── store.js            # local persistence and retention
├── core/
│   ├── activity.js         # pure tracking state machine
│   ├── analytics.js        # usage aggregation
│   ├── domain.js           # URL -> domain normalization
│   ├── focus.js            # focus-session rules
│   ├── limits.js           # limit calculations
│   └── time.js             # local dates/duration helpers
├── popup/                  # compact daily view
├── dashboard/              # history, limits, focus, privacy
├── blocked/                # limit/focus boundary page
├── options/                # redirects to dashboard settings
└── shared/                 # design tokens + UI helpers
```

The core modules are deliberately independent of Chrome APIs so timing and limit behavior can be tested without launching a browser. Chrome-specific behavior is isolated in the MV3 service worker.

## Design goals

- **Fast:** vanilla ES modules; no framework or production dependencies.
- **Simple:** popup for quick decisions, dashboard for deeper control.
- **Accurate:** event/timestamp accounting rather than a continuously running background timer.
- **Private:** domain-level local data only; no remote telemetry.
- **Recoverable:** persistent state survives MV3 worker termination without treating laptop sleep as active browsing.

## Project docs

- [V1 design](docs/superpowers/specs/2026-08-15-timelens-v1-design.md)
- [Implementation plan](docs/superpowers/plans/2026-08-15-timelens-v1.md)
- [Privacy](PRIVACY.md)
