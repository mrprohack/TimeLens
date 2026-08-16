# TimeLens Privacy

TimeLens is designed to work locally without an account or backend service.

## Data TimeLens stores

TimeLens may store the following in Chrome extension local storage:

- normalized website domains (for example, `youtube.com`),
- active-session start/end times and durations,
- per-day website usage totals,
- website limits, their daily/weekly/monthly period, and strict-mode choices,
- small per-domain alert state used to avoid repeating the 5-minute, 1-minute, or timeout warning within the same limit period,
- temporary extra-time allowances,
- Focus Mode duration and blocked-domain list,
- idle threshold and retention preferences.

## Data TimeLens does not intentionally store

TimeLens does not intentionally persist:

- page content,
- page titles,
- search/query strings,
- cookies,
- passwords,
- form entries,
- keystrokes,
- advertising identifiers.

A full return URL may be carried temporarily in the local TimeLens blocked-page URL so a non-strict allowance can return the same tab to the page the user was visiting. It is not added to TimeLens usage-history storage.

## Network use

TimeLens does not send browsing-usage data to an external service and does not include runtime analytics, advertising SDKs, remote scripts, or remote application code.

## Notifications

TimeLens uses Chrome's native notification API only for website limits created by the user. It may show:

- one warning when 5 minutes remain,
- one warning when 1 minute remains,
- one timeout notification when the configured limit is reached.

Warning-deduplication state is stored locally and resets when that website enters a new configured limit period. Notification content is generated locally; TimeLens does not send it to a TimeLens server.

## Permissions

- `tabs`: identify the active website and redirect a tab to the local blocked page when a user-created rule requires it.
- `storage`: persist TimeLens data locally.
- `idle`: stop active-time counting when the machine is idle or locked.
- `alarms`: reconcile active time while respecting Manifest V3 service-worker lifecycle behavior.
- `notifications`: display the user-requested 5-minute, 1-minute, and timeout warnings for website limits.

TimeLens does not request Chrome browsing history, cookies, `webRequest`, content-script host access, or `<all_urls>` host permissions.

## Retention and deletion

Detailed sessions default to 30 days and can be configured from 7 to 180 days. Aggregated daily totals are retained longer for range history. Users can clear usage history from the dashboard at any time while keeping their limits and preferences, or remove the extension to remove its local extension storage according to Chrome's extension-storage behavior.

## Export

Users can export their locally stored TimeLens data as JSON from the dashboard.

## Changes

If TimeLens later adds an optional server-backed feature, this policy should be updated before that feature is released and the feature should require clear user choice.
