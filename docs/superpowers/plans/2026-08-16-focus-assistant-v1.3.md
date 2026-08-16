# TimeLens 1.3 Focus Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade TimeLens from a per-site timer into a lightweight local-first focus assistant with a side panel, total daily browsing budget, category limits, reusable schedules, and richer Focus presets.

**Architecture:** Keep Manifest V3, vanilla ES modules, zero production dependencies, and the existing serialized service-worker/store boundary. Add pure `schedule.js` and `categories.js` modules, migrate storage to schema v4, expose the new state through the existing snapshot/message API, and add a side-panel UI that consumes the same messages as popup/dashboard.

**Tech Stack:** Chrome Manifest V3, `chrome.sidePanel`, `chrome.storage.local`, tabs/idle/alarms/notifications APIs, vanilla HTML/CSS/ES modules, Node.js built-in test runner, GitHub Actions.

## Global Constraints
- Release version is `1.3.0`.
- Data schema version is `4` and v1-v3 data migrates without losing usage history, limits, focus data, alerts, backups, or diagnostics.
- No account, backend, analytics, remote runtime code, content scripts, `history`, cookies, `webRequest`, `<all_urls>`, or host permissions.
- Only new Chrome permission is `sidePanel`.
- Total browsing budget defaults disabled; when enabled it supports `warn` or `block` mode.
- Category limits support daily/weekly/monthly periods and exact/root-domain matching.
- Optional schedules use local time, selected weekdays, start/end minute-of-day, and support overnight windows.
- Focus supports `block` and `allow` modes plus saved local presets.
- Every enforcement path must remain functional if native notifications fail.
- Security review must cover every changed source file before PR completion.

---

### Task 1: Pure schedule, category, and budget rules

**Files:**
- Create: `src/core/schedule.js`
- Create: `src/core/categories.js`
- Create: `tests/schedule.test.js`
- Create: `tests/categories.test.js`
- Modify: `src/core/focus.js`
- Modify: `tests/focus.test.js`

**Interfaces:**
- `normalizeSchedule(value) -> { enabled, days, startMinute, endMinute }`
- `isScheduleActive(schedule, now) -> boolean`
- `domainMatchesRule(domain, ruleDomain) -> boolean`
- `categoryUsage(dailyUsage, category, now) -> number`
- `categoryStatus(category, dailyUsage, now) -> { usedMs, limitMs, remainingMs, ratio, reached }`
- `createFocusSession(startedAt, minutes, domains, mode='block', name='Focus')`
- `isDomainFocusBlocked(focus, domain, now)` handles both block-list and allow-only modes.

- [ ] Write failing tests for weekday windows, overnight schedules, disabled schedules, subdomain/category matching, multi-domain category aggregation, period-aware category totals, block-mode focus, and allow-only focus.
- [ ] Run CI and confirm RED.
- [ ] Implement the pure modules and upgraded focus model without Chrome APIs.
- [ ] Run CI and confirm GREEN.

### Task 2: Schema v4 and normalized settings

**Files:**
- Modify: `src/background/migrations.js`
- Modify: `src/background/store.js`
- Modify: `tests/migrations.test.js`
- Modify: `tests/store.test.js`

**Interfaces:**
- `settings.totalBudget = { enabled, minutes, mode }`
- `settings.categories = [{ id, name, domains, minutes, period, enabled, strict, schedule }]`
- `settings.focusPresets = [{ id, name, minutes, mode, domains }]`
- Site limits gain optional `schedule`.
- Store alert state may use reserved keys `__total__` and `category:<id>` with existing period-key dedupe behavior.

- [ ] Add failing migration tests proving v3 data upgrades to v4 with safe defaults and malformed categories/schedules/presets are normalized or discarded.
- [ ] Add store tests proving schema-v4 settings survive save/import/export and alert state remains local/bounded.
- [ ] Run CI and confirm RED.
- [ ] Implement v4 migration/normalization while preserving every existing field.
- [ ] Run CI and confirm GREEN.

### Task 3: Service-worker enforcement and snapshot API

**Files:**
- Modify: `src/background/service-worker.js`
- Modify: `tests/service-worker.test.js`

**Interfaces:**
- Extend `GET_SNAPSHOT` with `totalBudget`, `categories`, `currentCategoryLimits`, and schedule-active state.
- Add messages: `SAVE_TOTAL_BUDGET`, `SAVE_CATEGORY`, `DELETE_CATEGORY`, `SAVE_FOCUS_PRESET`, `DELETE_FOCUS_PRESET`.
- Extend `SAVE_LIMIT` with optional `schedule`.
- Extend `START_FOCUS` with `{ minutes, domains, mode, name }` while accepting legacy `blockedDomains`.

**Enforcement order:**
1. active Focus rule,
2. total budget when enabled in `block` mode,
3. active category limits,
4. active per-site limit.

- [ ] Add failing integration tests for total-budget warning/block behavior, category aggregate blocking, inactive scheduled rules not blocking, overnight scheduled rules blocking, notification failure isolation, focus allow-only blocking, and backward-compatible `blockedDomains` messages.
- [ ] Run CI and confirm RED.
- [ ] Implement message handlers, snapshots, alert dedupe, and enforcement order with best-effort notification calls.
- [ ] Run CI and confirm GREEN.

### Task 4: Side Panel and production UX

**Files:**
- Create: `src/sidepanel/sidepanel.html`
- Create: `src/sidepanel/sidepanel.css`
- Create: `src/sidepanel/sidepanel.js`
- Modify: `manifest.json`
- Modify: `src/popup/popup.html`
- Modify: `src/popup/popup.js`
- Modify: `src/dashboard/dashboard.html`
- Modify: `src/dashboard/dashboard.css`
- Modify: `src/dashboard/dashboard.js`
- Modify: `tests/ui.test.js`
- Modify: `tests/manifest.test.js`

**Side panel contents:** current site/session, today total, total-budget progress, current site/category boundaries, Focus preset launcher, `Limit this site`, `Open dashboard`.

**Dashboard additions:** total-budget editor, category manager, schedule editor on site/category rules, Focus preset manager, allow-only Focus mode.

- [ ] Add failing UI/manifest tests for `side_panel.default_path`, `sidePanel` permission, side-panel controls, total-budget/category forms, schedule inputs, focus mode/presets, accessible labels, and responsive hooks.
- [ ] Run CI and confirm RED.
- [ ] Implement side panel and dashboard/popup controls using escaped domain/name output and the existing runtime message helper.
- [ ] Run CI and confirm GREEN.

### Task 5: Release, regression, and security gate

**Files:**
- Modify: `package.json`
- Modify: `scripts/validate-extension.mjs`
- Modify: `scripts/package-extension.mjs`
- Modify: `.github/workflows/ci.yml` only if packaging paths need adjustment.
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `PRIVACY.md`
- Modify: `docs/superpowers/plans/2026-08-16-focus-assistant-v1.3.md`

- [ ] Bump manifest/package to `1.3.0`, require the side-panel files in validation/package output, and keep the exact approved permission set `alarms,idle,notifications,sidePanel,storage,tabs`.
- [ ] Run the full `npm run check` and `npm run package` pipeline on the exact feature head.
- [ ] Review the branch diff for unrelated changes, new remote code, unsafe HTML interpolation, unvalidated imported settings, over-broad permissions, and enforcement bypasses.
- [ ] Invoke Codex Security diff-scan guidance against `main...feat/focus-assistant-v1.3`; fix every confirmed finding, rerun tests/security review until clean or explicitly document deferred risk.
- [ ] Open a PR to `main` with CI evidence, security coverage, permission review, and release-artifact details.