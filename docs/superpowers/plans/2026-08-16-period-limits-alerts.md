# Period Limits & Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add daily, weekly, and monthly website limits with native 5-minute, 1-minute, and timeout alerts while preserving TimeLens V1 behavior and privacy.

**Architecture:** Extend the pure limit core to calculate local period windows from existing daily aggregates, then make the MV3 service worker consume that API for snapshots, warnings, and enforcement. Store only per-domain alert dedupe state and update the existing dashboard/popup rather than adding new pages.

**Tech Stack:** Manifest V3, vanilla ES modules, Chrome tabs/storage/idle/alarms/notifications APIs, Node.js 22 built-in test runner, GitHub Actions.

## Global Constraints
- Existing limits without `period` must remain valid and behave as daily limits.
- Supported periods are exactly `daily`, `weekly`, and `monthly`.
- Weekly periods begin Monday 00:00 local time.
- Monthly periods begin on the first day at 00:00 local time.
- Alert thresholds are 5 minutes, 1 minute, and timeout; each fires at most once per domain and period.
- If multiple thresholds were skipped, send only the most urgent applicable alert.
- Final alert copy includes: `Time’s up — don’t waste your time.`
- No new host permissions, content scripts, accounts, analytics, or remote runtime requests.
- Add only the Chrome `notifications` permission required for native alerts.

---

### Task 1: Period-aware pure limit core

**Files:**
- Modify: `src/core/limits.js`
- Modify: `tests/limits.test.js`

**Interfaces:**
- Produces: `normalizeLimitPeriod(period)`, `limitPeriodKey(period, now)`, `limitDayKeys(period, now)`, `usageForLimit(dailyUsage, domain, limit, now)`, `nextLimitAlert(status, sent)`.
- Preserves: `getLimitStatus(limit, usedMs, allowanceMs)` and `shouldBlockDomain(limit, usedMs, allowanceMs)`.

- [ ] **Step 1: Write failing tests** for daily fallback, Monday-based weekly windows, calendar-month windows, usage summing, and alert priority.
- [ ] **Step 2: Run CI** and confirm the new tests fail because the new exports/behavior do not exist.
- [ ] **Step 3: Implement minimal period and alert functions** in `src/core/limits.js`.
- [ ] **Step 4: Run CI** and confirm the limit tests pass with the existing suite still green.

### Task 2: Persist alert dedupe state and period-aware service-worker enforcement

**Files:**
- Modify: `src/background/store.js`
- Modify: `src/background/service-worker.js`
- Modify: `tests/service-worker.test.js`

**Interfaces:**
- `data.limitAlerts[domain] = { periodKey, sent: string[] }`.
- Service worker uses `usageForLimit()` for snapshot progress and blocking.
- Service worker calls `chrome.notifications.create()` for `5m`, `1m`, and `timeout` alerts.

- [ ] **Step 1: Extend fake Chrome with `notifications.create()` and write failing integration tests** for weekly aggregation, 5m/1m alerts, dedupe, timeout copy, and final block.
- [ ] **Step 2: Run CI** and confirm the integration tests fail for missing behavior.
- [ ] **Step 3: Add `limitAlerts` normalization/default state and period-aware service-worker logic**.
- [ ] **Step 4: Run CI** and fix any event-order or persistence regressions until green.

### Task 3: Manifest and user-facing limit UX

**Files:**
- Modify: `manifest.json`
- Modify: `tests/manifest.test.js`
- Modify: `src/dashboard/dashboard.html`
- Modify: `src/dashboard/dashboard.js`
- Modify: `src/dashboard/dashboard.css` only if layout needs it
- Modify: `src/popup/popup.js`
- Modify: existing UI/package tests if needed

**Interfaces:**
- Dashboard sends `SAVE_LIMIT` with `{ domain, minutes, period, strict, enabled }`.
- Popup/dashboard consume snapshot limits containing `period`, period-aware `usedMs`, `remainingMs`, and `ratio`.

- [ ] **Step 1: Write failing manifest/UI contract tests** for notification permission and Daily/Weekly/Monthly controls.
- [ ] **Step 2: Run CI** to verify RED.
- [ ] **Step 3: Implement the simplified value/unit/period form and period-aware labels**.
- [ ] **Step 4: Run CI** and repair responsive/static-validation issues.

### Task 4: Documentation and final verification

**Files:**
- Modify: `README.md`
- Modify: `PRIVACY.md`
- Modify: this plan to mark completed steps

- [ ] **Step 1: Document daily/weekly/monthly resets and native notification permission**.
- [ ] **Step 2: Run fresh `npm run check` through GitHub Actions on the final branch head**.
- [ ] **Step 3: Review the branch diff for unrelated changes, placeholders, permission creep, and backward compatibility**.
- [ ] **Step 4: Open a PR to `main` with test evidence and exact behavior summary**.
