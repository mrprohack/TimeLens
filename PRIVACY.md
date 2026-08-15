# TimeLens Privacy

TimeLens is designed to work locally without an account or backend service.

## Data TimeLens stores

TimeLens may store the following in Chrome extension local storage:

- normalized website domains (for example, `youtube.com`),
- active-session start/end times and durations,
- per-day website usage totals,
- website limits and strict-mode choices,
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

## Permissions

- `tabs`: identify the active website and redirect a tab to the local blocked page when a user-created rule requires it.
- `storage`: persist TimeLens data locally.
- `idle`: stop active-time counting when the machine is idle or locked.
- `alarms`: reconcile active time while respecting Manifest V3 service-worker lifecycle behavior.

## Retention and deletion

Detailed sessions default to 30 days and can be configured from 7 to 180 days. Aggregated daily totals are retained longer for range history. Users can clear usage history from the dashboard at any time while keeping their limits and preferences, or remove the extension to remove its local extension storage according to Chrome's extension-storage behavior.

## Export

Users can export their locally stored TimeLens data as JSON from the dashboard.

## Changes

If TimeLens later adds an optional server-backed feature, this policy should be updated before that feature is released and the feature should require clear user choice.
