# TimeLens 1.2 Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden TimeLens for production release with schema migrations, resilient enforcement, period-scoped allowances, alert preferences, onboarding, restore/backup, stronger limit management, and a release artifact pipeline.

**Architecture:** Keep the current dependency-free MV3 architecture. Add a pure migration module and expand the store/service-worker message boundary; keep all UI vanilla and local-only so behavior remains testable without a browser backend.

**Tech Stack:** Chrome Manifest V3, vanilla ES modules, `chrome.storage.local`, tabs/idle/alarms/notifications APIs, Node.js built-in test runner, GitHub Actions.

## Global Constraints
- Version: `1.2.0`.
- No accounts, backend, analytics, remote runtime code, content scripts, `history`, cookies, `webRequest`, `<all_urls>`, or new host permissions.
- Existing version-2 TimeLens data and limits must migrate without losing usage history.
- Timeout enforcement must work even if native notification creation fails or timeout alerts are disabled.
- Runtime production dependencies remain zero.
- Diagnostics remain local and are capped at 50 entries.

---

### Task 1: Schema v3 migration and period allowances
**Files:** create `src/background/migrations.js`; modify `src/background/store.js`, `tests/store.test.js`.

**Interfaces:** `migrateData(raw)`, `validateImport(raw)`, `allowancePeriodKey(limit, now)`, `getAllowanceMs(data, domain, limit, now)`, `addAllowance(data, domain, limit, minutes, now)`, `recordDiagnostic(data, code, error, now)`.

- [ ] Add failing tests for v2 migration, malformed settings, default alert preferences, daily/weekly/monthly allowance period keys, and bounded diagnostics.
- [ ] Run CI and confirm RED.
- [ ] Implement migration/normalization and store helpers.
- [ ] Run CI and confirm GREEN.

### Task 2: Resilient service-worker enforcement
**Files:** modify `src/background/service-worker.js`, `tests/service-worker.test.js`.

**Interfaces:** existing message API plus `TOGGLE_LIMIT`, `IMPORT_DATA`; alert preferences from `settings.alerts`.

- [ ] Add failing tests proving notification rejection does not prevent blocking, disabled warnings do not emit, timeout still blocks, period allowances are one-per-period, and install opens onboarding only for fresh installs.
- [ ] Run CI and confirm RED.
- [ ] Add best-effort Chrome API error isolation, local diagnostics, onboarding install behavior, import backup/restore, toggle-limit support, and period-aware allowance calls.
- [ ] Run CI and confirm GREEN.

### Task 3: Production dashboard and onboarding UX
**Files:** create `src/onboarding/onboarding.html`, `src/onboarding/onboarding.css`, `src/onboarding/onboarding.js`; modify dashboard HTML/CSS/JS, popup JS, UI tests, manifest tests.

**Interfaces:** dashboard uses `TOGGLE_LIMIT`, `IMPORT_DATA`, `SAVE_SETTINGS`; onboarding uses `SAVE_LIMIT` and `SAVE_SETTINGS`.

- [ ] Add failing UI/package tests for onboarding, import controls, edit/pause limit controls, alert preferences, health status, and accessibility labels.
- [ ] Run CI and confirm RED.
- [ ] Implement onboarding and production dashboard controls while preserving responsive/dark behavior.
- [ ] Run CI and confirm GREEN.

### Task 4: Release engineering and documentation
**Files:** modify `manifest.json`, `package.json`, `.github/workflows/ci.yml`, `scripts/validate-extension.mjs`, README/PRIVACY; create `CHANGELOG.md`, `SECURITY.md`, `LICENSE`.

- [ ] Update version and validator contracts.
- [ ] Add a CI release ZIP step using only production files and upload it as an artifact.
- [ ] Update user/developer docs for migration, restore, diagnostics, alerts, and production install/release steps.
- [ ] Run final `npm run check` on the exact branch head and inspect the PR diff for unrelated changes and permission creep.
- [ ] Open a production PR stacked on the 1.1 feature branch (or retarget to `main` if 1.1 is merged before completion).