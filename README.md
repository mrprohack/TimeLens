# TimeLens

**TimeLens** is a privacy-first Chrome extension that measures active browsing time and helps protect attention with budgets, category/site limits, schedules, and Focus Mode.

> **See your time. Control your web.**

## Why TimeLens

Most browser-time counters overcount tabs that are merely open. TimeLens counts a website only when all three are true:

1. the tab is active,
2. the Chrome window is focused, and
3. Chrome reports the user as active rather than idle or locked.

That makes the history closer to real attention time instead of tab-open time.

## TimeLens 1.4 Simple Home

TimeLens 1.4 keeps the full 1.3 focus-assistant feature set but makes everyday use much simpler.

- **Simple Home** shows today's total, current website, Top 5 sites, limits needing attention, and recent activity without advanced configuration forms.
- **Four primary destinations only:** Home, Limits, Focus, and Settings.
- **Fast Add Limit flow:** website + time is enough for a normal daily limit. Weekly/monthly reset, Strict mode, and schedules live under Advanced options.
- **Clean Limits screen** with compact site rows, overflow actions, a summarized daily browsing budget, and category limits collapsed by default.
- **Action-first Focus** with 25/45/60/90-minute choices and saved presets. Raw website lists and Block/Allow-only settings stay behind Change/Focus settings.
- **Quiet Settings** groups notifications, tracking, data, privacy, and extension health; diagnostics stay collapsed when not needed.
- **Compact popup** for Today, current website, Start/End Focus, and one-click 30-minute daily limit creation for the current site.
- **Compact Side Panel** for current-site usage, the most relevant active boundary, a quick limit, Focus, and dashboard access.
- **Secondary History drawer** keeps detailed sessions available without competing with daily-use navigation.
- **Accurate active-time tracking** across tab switches, focus changes, idle/locked states, sleep/wake gaps, and local midnight.
- **Total daily browsing budget** with either a warning-only boundary or a block-until-reset boundary.
- **Category limits** that share one daily, weekly, or monthly allowance across multiple websites such as Social or Entertainment.
- **Smart schedules** for site and category limits using selected local weekdays and start/end times, including overnight windows.
- **Focus Mode presets** with named local sessions and both **Block these sites** and **Allow only these sites** modes.
- **Configurable native alerts** at 5 minutes remaining, 1 minute remaining, and timeout for enabled boundaries.
- **Automatic blocking** remains authoritative even when native notifications are disabled or fail.
- **JSON export and restore** with schema validation and an automatic local backup before valid imported data replaces current data.
- **Local extension health** with bounded diagnostics and approximate storage usage.
- **Automatic light/dark appearance**, reduced-motion support, keyboard focus states, and responsive layouts.
- **No account, backend, cloud analytics, ads, content scripts, or remote runtime code.**

## Boundary rules

### Total browsing budget

The total budget counts all active browsing for the local day. It is disabled by default. When enabled it can either:

- **Warn only** — notify at the configured boundary but keep browsing available.
- **Block browsing** — redirect active web tabs to the TimeLens boundary page once the daily budget is reached.

### Site limits

Each website can have one active limit period:

- **Daily** — resets at local midnight.
- **Weekly** — resets Monday at 00:00 local time.
- **Monthly** — resets on the first day of the month at 00:00 local time.

Site limits can optionally run only during a local smart schedule. Existing limits without a schedule continue to apply all day. In the 1.4 UI these advanced choices stay collapsed by default so a normal daily limit needs only a website and time.

### Category limits

A category groups normalized domains under one shared boundary. A rule for `youtube.com` also matches subdomains such as `music.youtube.com`, but not lookalikes such as `notyoutube.com`. Category limits support daily/weekly/monthly periods and optional schedules.

### Smart schedules

Schedules use local weekdays and minute-of-day start/end values. Overnight windows belong to the day on which they start, so a Friday 22:00–02:00 schedule remains active until 02:00 Saturday.

## Focus Mode

Focus sessions support two modes:

- **Block list** — configured websites are unavailable until Focus ends.
- **Allow only** — configured websites remain available and other normal web domains are blocked until Focus ends.

Allow-only sessions require at least one allowed domain, preventing an accidental empty allow list. Saved presets remain local and can be launched from the dashboard or Side Panel. The main 1.4 Focus screen keeps these advanced choices out of the way until the user chooses **Change**.

## Reliability model

TimeLens treats enforcement as more important than optional UI feedback. A failure to create a native notification does **not** cancel a timeout block. Transient background failures are isolated from the serialized service-worker queue and recorded locally in a bounded diagnostic journal instead of being sent to a server.

Stored data uses schema v4. TimeLens 1.4 is a presentation/interaction redesign and does not require a new schema migration; supported older data continues to migrate through the existing versioned migration layer while preserving valid usage, limits, alert preferences, diagnostics, and backup state.

## Privacy model

TimeLens stores data locally with `chrome.storage.local`. It persists normalized website domains, timing totals, limits, budgets, categories, schedules, Focus presets/sessions, alert-deduplication state, preferences, local diagnostics, and restore backup data when applicable. It does **not** intentionally persist page content, page titles, query strings in usage history, cookies, passwords, form data, or keystrokes, and it does not send browsing usage to a TimeLens server.

See [PRIVACY.md](PRIVACY.md) for the full data and permission explanation.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `tabs` | Identify the active website and redirect a tab to the local blocked page when an enabled rule requires it. |
| `storage` | Keep local usage, limits, budgets, categories, schedules, Focus presets, diagnostics, and restore backup data. |
| `idle` | Stop counting when the machine is idle or locked. |
| `alarms` | Reconcile active time and recover cleanly across Manifest V3 service-worker sleep. |
| `notifications` | Show locally generated boundary warnings selected by the user. |
| `sidePanel` | Open the local TimeLens focus-assistant Side Panel. |

TimeLens intentionally does **not** request `history`, cookies, `webRequest`, content-script host access, `<all_urls>`, or other host permissions.

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

- `npm run check` runs the complete test suite and extension validator.
- `npm run package` creates `dist/timelens-<version>.zip` for Chrome Web Store upload/review.

## Test coverage

The automated suite covers:

- URL/domain normalization and non-web schemes
- tab switching, focus changes, idle transitions, and local-midnight splitting
- sleep-like delayed alarm reconciliation
- daily/weekly/monthly usage windows and warnings
- total-budget warn/block behavior
- category aggregation and secure root/subdomain matching
- weekday and overnight smart schedules
- block-list and allow-only Focus sessions
- notification-failure isolation from enforcement
- schema-v4 migration and malformed-data normalization
- import validation plus backup-before-restore
- local diagnostic bounds and retention pruning
- four-destination dashboard information architecture
- progressive-disclosure Add/Edit Limit flow
- action-first Focus and quiet Settings contracts
- compact popup and Side Panel contracts
- onboarding and blocked-page contracts
- exact Manifest V3 permission allowlist
- runtime JavaScript syntax and duplicate HTML ID checks
- remote runtime code and dynamic-code (`eval` / `new Function`) rejection
- version parity and Chrome Web Store package contracts

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
│   ├── categories.js       # category domain matching + aggregate limits
│   ├── domain.js           # URL -> domain normalization
│   ├── focus.js            # block-list / allow-only focus rules
│   ├── limits.js           # period windows, limits, warning decisions
│   ├── schedule.js         # local weekday and overnight schedules
│   └── time.js             # local dates/duration helpers
├── popup/                  # compact daily actions
├── sidepanel/              # compact live current-site companion
├── dashboard/
│   ├── dashboard.js        # shell/orchestration
│   ├── home-view.js        # daily overview
│   ├── limits-view.js      # site/budget/category summaries
│   ├── focus-view.js       # simple Focus flow
│   ├── settings-view.js    # low-frequency settings
│   ├── dialogs.js          # accessible dialog/disclosure helpers
│   └── forms.js            # shared UI form serialization
├── onboarding/             # first-run setup
├── blocked/                # focus/limit/category/budget boundary page
├── options/                # redirects to dashboard settings
└── shared/                 # design tokens + UI helpers
```

Core policy logic is kept independent of Chrome APIs where practical so timing and enforcement behavior can be unit tested. Chrome-specific lifecycle and navigation behavior stays in the Manifest V3 service worker.

## Release pipeline

GitHub Actions runs the full checks, creates `dist/timelens-1.4.0.zip`, and uploads it as a workflow artifact. The validator requires the exact approved permissions, checks required runtime pages/assets and JavaScript syntax, verifies unique HTML IDs, and rejects remote or dynamically evaluated runtime code.

## Project docs

- [V1 design](docs/superpowers/specs/2026-08-15-timelens-v1-design.md)
- [V1 implementation plan](docs/superpowers/plans/2026-08-15-timelens-v1.md)
- [Period limits & alerts design](docs/superpowers/specs/2026-08-16-period-limits-alerts-design.md)
- [Period limits & alerts plan](docs/superpowers/plans/2026-08-16-period-limits-alerts.md)
- [1.2 production-hardening design](docs/superpowers/specs/2026-08-16-production-hardening-v1.2-design.md)
- [1.2 production-hardening plan](docs/superpowers/plans/2026-08-16-production-hardening-v1.2.md)
- [1.3 Focus Assistant plan](docs/superpowers/plans/2026-08-16-focus-assistant-v1.3.md)
- [1.4 Simple Home UX design](docs/superpowers/specs/2026-08-17-simple-home-ux-v1.4-design.md)
- [1.4 Simple Home UX plan](docs/superpowers/plans/2026-08-17-simple-home-ux-v1.4.md)
- [Privacy](PRIVACY.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [License](LICENSE)
