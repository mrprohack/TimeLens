# TimeLens Architecture & Technical Specifications

**Version:** 1.8.0+  
**Platform:** Chrome Extension (Manifest V3)  
**Execution Environment:** Zero-remote execution, 100% private local storage (`chrome.storage.local`).

---

## 1. High-Level Architecture Overview

TimeLens operates strictly on local browser events without any remote analytics, external APIs, tracking pixels, or cloud sync servers.

```mermaid
flowchart TD
    User["User Web Activity"] --> ChromeEvents["Chrome Events (tabs, idle, windows)"]
    ChromeEvents --> SW["Background Service Worker (src/background/service-worker.js)"]
    SW --> Store["Local Store (chrome.storage.local)"]
    SW --> Enforcer["Enforcement Engine (Budgets / Limits / Focus)"]
    Enforcer --> BlockedPage["Blocked Page (src/blocked/blocked.html)"]
    Enforcer --> Alarms["Chrome Alarms (Reconciliation)"]
    Enforcer --> Notifications["Chrome Notifications (5m / 1m / Timeout)"]

    Store <--> SW
    SW <--> MessagingBridge["Async Message Protocol (src/shared/ui.js)"]
    MessagingBridge <--> Dashboard["Dashboard (src/dashboard/dashboard.html)"]
    MessagingBridge <--> Popup["Popup (src/popup/popup.html)"]
    MessagingBridge <--> SidePanel["Side Panel (src/sidepanel/sidepanel.html)"]
```

---

## 2. Attention Tracking Model

Unlike conventional browser extensions that measure how long a tab is merely open in the background, TimeLens measures **Active Attention Time**.

A website domain accumulates active time if and only if **all three** of the following conditions hold simultaneously:
1. **Active Tab:** The tab is the currently active tab in its window (`chrome.tabs.onActivated`).
2. **Focused Window:** The Chrome browser window is focused and in the foreground (`chrome.windows.onFocusChanged`).
3. **Active User:** Chrome reports the user state as `active` (not `idle` or `locked` via `chrome.idle.onStateChanged`).

### Active Domain Resolution

URLs are normalized strictly into lower-case clean hostnames with collapsible prefixes removed (`www.`, `m.`, `mobile.`, `old.`, `new.`):
- `https://www.youtube.com/watch?v=123` $\rightarrow$ `youtube.com`
- `https://music.youtube.com/` $\rightarrow$ `music.youtube.com`
- Internal pages (`chrome://`, `about:`, `file://`) are ignored.

---

## 3. Boundary Enforcement Engine

```mermaid
flowchart TD
    CurrentDomain["Current Active Domain"] --> CheckFocus{"Focus Mode Active?"}
    CheckFocus -- Yes --> BlockFocus{"Blocked by Focus Rules?"}
    BlockFocus -- Yes --> RedirectBlock["Redirect to Blocked Page"]
    BlockFocus -- No --> CheckDailyBudget{"Daily Budget Reached?"}
    CheckFocus -- No --> CheckDailyBudget

    CheckDailyBudget -- Block Mode --> RedirectBlock
    CheckDailyBudget -- Warn Mode / None --> CheckSiteLimit{"Site Limit Reached?"}

    CheckSiteLimit -- Yes --> RedirectBlock
    CheckSiteLimit -- No --> CheckCategoryLimit{"Category Limit Reached?"}

    CheckCategoryLimit -- Yes --> RedirectBlock
    CheckCategoryLimit -- No --> AllowBrowsing["Browsing Allowed (Track Time)"]
```

### 1. Daily Browsing Budget
- Single overarching daily threshold across all web usage.
- Supports `warn` (non-blocking notification) or `block` mode.

### 2. Site Limits
- Configured per normalized domain.
- Periods: `daily` (resets midnight), `weekly` (resets Monday 00:00), `monthly` (resets 1st of month).
- Optional Smart Schedules: Restricts limits to designated weekdays and time windows.
- Strict Mode: Disallows temporary 5-minute extensions.

### 3. Category Limits
- Groups multiple domains under a single shared quota (e.g. `Social`, `Entertainment`).
- Evaluated via `createDomainMatcher` hash Set and suffix tree resolution.

### 4. Focus Mode
- Pomodoro/time-boxed sprint engine (25/45/60/90m or custom).
- Modes: `block` (block designated distracting sites) or `allow` (block all sites except designated tools).
- Quick extension support (`EXTEND_FOCUS`) for on-the-fly flow state preservation.

---

## 4. Message Protocol & Resilience

Every message passed between UI surfaces and the service worker follows an asynchronous request/response pattern wrapped with timeout and retry capabilities (`src/shared/ui.js`):

- **Timeout:** 10,000ms deadline to avoid hung promises when service worker sleeps.
- **Retry:** Automatically retries transient connection errors once upon worker wake-up.
- **Envelope:** Standardized `{ ok: boolean, data?: any, error?: string }` payload.

| Message Type | Direction | Payload | Description |
| --- | --- | --- | --- |
| `GET_SNAPSHOT` | UI $\rightarrow$ SW | `{ rangeDays: number }` | Fetches active limits, usage stats, and diagnostics. |
| `SAVE_LIMIT` | UI $\rightarrow$ SW | `{ limit: LimitObject }` | Upserts site limit. |
| `TOGGLE_LIMIT` | UI $\rightarrow$ SW | `{ domain, enabled }` | Enables or disables a site limit without deleting it. |
| `DELETE_LIMIT` | UI $\rightarrow$ SW | `{ domain: string }` | Deletes site limit. |
| `SAVE_TOTAL_BUDGET` | UI $\rightarrow$ SW | `{ budget: { minutes, enabled, mode } }` | Upserts the daily browsing budget; `mode` is `warn` or `block`. |
| `SAVE_CATEGORY` | UI $\rightarrow$ SW | `{ category: CategoryObject }` | Upserts a category limit shared by several domains. |
| `DELETE_CATEGORY` | UI $\rightarrow$ SW | `{ id: string }` | Deletes a category and its limit. |
| `SAVE_FOCUS_PRESET` | UI $\rightarrow$ SW | `{ preset: PresetObject }` | Upserts a saved Focus preset. |
| `DELETE_FOCUS_PRESET` | UI $\rightarrow$ SW | `{ id: string }` | Deletes a saved Focus preset. |
| `START_FOCUS` | UI $\rightarrow$ SW | `{ minutes, domains, mode, name }` | Initiates Focus session. |
| `EXTEND_FOCUS` | UI $\rightarrow$ SW | `{ minutes: number }` | Adds minutes to ongoing Focus session. |
| `STOP_FOCUS` | UI $\rightarrow$ SW | none | Terminates Focus session. |
| `ADD_ALLOWANCE` | UI $\rightarrow$ SW | `{ domain, minutes }` | Grants temporary 5m extension for non-strict limits. |
| `GET_BLOCK_STATUS` | UI $\rightarrow$ SW | `{ domain: string }` | Returns why a domain is blocked: Focus, budget, categories, or its site limit. |
| `SAVE_SETTINGS` | UI $\rightarrow$ SW | `{ settings: { idleSeconds?, retentionDays?, alerts? } }` | Updates idle detection, data retention, and boundary-alert preferences. |
| `EXPORT_DATA` | UI $\rightarrow$ SW | none | Returns the full stored dataset for export. |
| `IMPORT_DATA` | UI $\rightarrow$ SW | `{ data: object }` | Backs up the current data, then replaces it with a validated import. |
| `CLEAR_DIAGNOSTICS` | UI $\rightarrow$ SW | none | Empties the local diagnostic journal. |
| `CLEAR_DATA` | UI $\rightarrow$ SW | none | Clears usage, sessions, allowances, alerts, and the active Focus session. |

The service worker is the source of truth for this contract. Every message type is a `case` label in
`handleMessage` in `src/background/service-worker.js`; an unrecognised type is rejected with
`Unknown TimeLens request.` The table above lists all of them.

Notes on the messages that are easy to misread:

- `SAVE_LIMIT`, `SAVE_CATEGORY`, `SAVE_TOTAL_BUDGET`, `SAVE_FOCUS_PRESET`, and `TOGGLE_LIMIT` re-run
  enforcement immediately after saving, so a change takes effect on the open tab without a restart.
- `GET_SNAPSHOT` and `GET_BLOCK_STATUS` flush pending activity first, so they report the current
  second rather than the last recorded one.
- `IMPORT_DATA` backs up the current dataset before replacing it, so a bad import is recoverable.
- `ADD_ALLOWANCE` is rejected for a limit marked strict; there is no extension for those.
- `START_FOCUS` and `SAVE_FOCUS_PRESET` reject an `allow` session with no domains, so an allow-only
  Focus can never end up empty.


---

## 5. Security & Privacy Guarantees

1. **No External Network Calls:** Validated in CI (`scripts/validate-extension.mjs`); no `fetch()`, `XMLHttpRequest`, or remote script tags.
2. **Minimal Permissions:** Uses only `tabs`, `storage`, `idle`, `alarms`, `notifications`, and `sidePanel`. No broad host permissions (`<all_urls>`).
3. **Safe Redirections:** Blocked URLs are stored in `chrome.storage.session` and never leaked into browser query strings.
4. **Deterministic Audits:** Previews pass automated WCAG 2.2 AA axe accessibility tests and headless Chrome visual regression suites.
