# TimeLens Privacy

TimeLens is designed to work locally without an account or backend service.

## Data TimeLens stores

TimeLens may store the following in Chrome extension local storage:

- normalized website domains (for example, `youtube.com`),
- active-session start/end times and durations,
- per-day website usage totals,
- website limits, their daily/weekly/monthly period, enabled/paused state, and strict-mode choices,
- small per-domain alert state used to avoid repeating the 5-minute, 1-minute, or timeout warning within the same limit period,
- temporary extra-time allowances scoped to the applicable daily, weekly, or monthly limit period,
- Focus Mode duration and blocked-domain list,
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

A full return URL may be carried temporarily in the local TimeLens blocked-page URL so a non-strict allowance can return the same tab to the page the user was visiting. It is not added to TimeLens usage-history storage.

## Network use

TimeLens does not send browsing-usage data, diagnostics, limits, Focus Mode choices, imports, or exported data to a TimeLens server. The extension does not include runtime analytics, advertising SDKs, remote scripts, remotely hosted executable code, or a TimeLens backend.

## Notifications

TimeLens uses Chrome's native notification API only for website limits created by the user. The user can independently enable or disable:

- the 5-minute remaining warning,
- the 1-minute remaining warning,
- the timeout notification.

Disabling a notification does not disable the website limit itself. TimeLens continues enforcing an enabled limit when its time is exhausted.

Warning-deduplication state is stored locally and resets when that website enters a new configured limit period. Notification content is generated locally.

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
- `storage`: persist TimeLens usage, preferences, diagnostics, and restore backup data locally.
- `idle`: stop active-time counting when the machine is idle or locked.
- `alarms`: reconcile active time while respecting Manifest V3 service-worker lifecycle behavior.
- `notifications`: display user-configured website-limit warnings.

TimeLens does not request Chrome browsing history, cookies, `webRequest`, content-script host access, or `<all_urls>` host permissions.

## Retention and deletion

Detailed sessions default to 30 days and can be configured from 7 to 180 days. Aggregated daily totals are retained longer for range history. Runtime diagnostics are capped at 50 entries. Users can clear usage history and diagnostics from the dashboard.

Removing the extension removes its extension-local storage according to Chrome's extension-storage behavior.

## Schema migrations

TimeLens uses versioned local data. Version 1.2 uses schema version 3. Older supported TimeLens data is normalized and migrated locally when read. Migration is designed to preserve valid usage history and limits while replacing malformed settings with safe defaults.

## Changes

If TimeLens later adds an optional server-backed feature, this policy should be updated before that feature is released and the feature should require clear user choice.
