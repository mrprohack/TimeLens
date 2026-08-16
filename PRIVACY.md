# TimeLens Privacy

TimeLens is designed to work locally without an account or backend service.

## Data TimeLens stores

TimeLens may store the following in Chrome extension local storage:

- normalized website domains (for example, `youtube.com`),
- active-session start/end times and durations,
- per-day website usage totals,
- website limits, their daily/weekly/monthly period, enabled/paused state, strict-mode choice, and optional local schedule,
- an optional total daily active-browsing budget and whether it warns or blocks at the boundary,
- user-created category limits containing a local category name, normalized domain list, period, limit, and optional schedule,
- small local alert state used to avoid repeating the 5-minute, 1-minute, or timeout warning within the same configured period,
- temporary extra-time allowances scoped to the applicable site-limit period,
- Focus Mode duration, name, block/allow mode, and normalized domain list,
- saved local Focus presets,
- idle threshold, session-retention choices, and alert preferences,
- a bounded local diagnostic journal containing timestamp, internal error code, and short error message when a TimeLens runtime operation fails,
- one local pre-import backup when the user restores a valid TimeLens JSON export.

## Data TimeLens does not intentionally store

TimeLens does not intentionally persist:

- page content,
- page titles,
- search/query strings in usage history,
- cookies,
- passwords,
- form entries,
- keystrokes,
- advertising identifiers.

For a non-strict site limit, TimeLens may temporarily keep the tab's full return URL in `chrome.storage.session` so an approved +5/+15 minute allowance can return that same tab to the page the user was visiting. The return URL is not placed in the TimeLens blocked-page query string, is not added to usage history, is removed when consumed, and is cleared with Chrome's extension session storage. Strict site limits, category limits, total-budget blocks, and Focus blocks do not store or expose an allowance return URL.

## Network use

TimeLens does not send browsing-usage data, diagnostics, limits, categories, schedules, budgets, Focus Mode choices, imports, or exported data to a TimeLens server. The extension does not include runtime analytics, advertising SDKs, remote scripts, remotely hosted executable code, or a TimeLens backend.

## Side Panel

TimeLens uses Chrome's Side Panel API to display a local focus-assistant interface next to the current browser tab. The panel reads the same local TimeLens snapshot used by the popup and dashboard. Opening the Side Panel does not send browsing data to a server and does not grant TimeLens additional website-content access.

## Notifications

TimeLens uses Chrome's native notification API for enabled TimeLens boundaries. Depending on user settings, notifications may be shown for:

- website limits,
- category limits,
- the total daily browsing budget,
- 5 minutes remaining,
- 1 minute remaining,
- the final timeout boundary.

Disabling a notification does not disable a rule itself. A blocking website, category, or total-budget rule continues enforcing when its configured time is exhausted. Notification failures are treated as non-fatal and do not bypass blocking rules.

Warning-deduplication state is stored locally and resets with the applicable limit period. Notification content is generated locally.

## Smart schedules

A site or category boundary can optionally be limited to selected local weekdays and a local start/end time. Schedule evaluation happens locally on the device. Overnight schedules are associated with the day on which the scheduled window begins.

## Diagnostics and extension health

When a TimeLens background operation fails, the extension may record a short local diagnostic entry so the dashboard can show whether the extension needs attention. The journal is capped at 50 entries and can be cleared from the dashboard. These diagnostics are not transmitted by TimeLens.

The dashboard also displays an approximate size of TimeLens local data. This is calculated locally from the stored TimeLens data snapshot.

## Export and restore

Users can export their locally stored TimeLens data as JSON from the dashboard.

When a user chooses a JSON file to restore:

1. TimeLens parses and validates the file locally.
2. The data is migrated to the current local schema where supported.
3. Only after validation succeeds, the current TimeLens data is saved to the local `timelensBackup` storage key.
4. The imported data replaces the live TimeLens data.

TimeLens does not upload the chosen file to a TimeLens service.

## Permissions

- `tabs`: identify the active website and redirect a tab to the local blocked page when a user-created rule requires it.
- `storage`: persist TimeLens local data and use Chrome's session-scoped extension storage for a temporary non-strict allowance return URL.
- `idle`: stop active-time counting when the machine is idle or locked.
- `alarms`: reconcile active time while respecting Manifest V3 service-worker lifecycle behavior.
- `notifications`: display user-configured TimeLens boundary warnings.
- `sidePanel`: open the local TimeLens focus-assistant Side Panel.

TimeLens does not request Chrome browsing history, cookies, `webRequest`, content-script host access, or `<all_urls>` host permissions.

## Retention and deletion

Detailed sessions default to 30 days and can be configured from 7 to 180 days. Aggregated daily totals are retained longer for range history. Runtime diagnostics are capped at 50 entries. Users can clear usage history and diagnostics from the dashboard.

Removing the extension removes its extension-local storage according to Chrome's extension-storage behavior.

## Schema migrations

TimeLens uses versioned local data. Version 1.3 uses schema version 4. Supported older TimeLens data is normalized and migrated locally when read. Migration is designed to preserve valid usage history, limits, alert preferences, backup state, and diagnostics while adding safe defaults for newer features.

## Changes

If TimeLens later adds an optional server-backed feature, this policy should be updated before that feature is released and the feature should require clear user choice.
