# TimeLens Period Limits & Alerts Design

## Goal
Extend TimeLens site limits from daily-only boundaries to user-selectable daily, weekly, or monthly limits, with proactive 5-minute and 1-minute warnings and a final timeout notification before the existing block flow.

## User experience

### Limit setup
The dashboard limit form contains:
- Website
- Limit value
- Unit: minutes or hours
- Period: Daily, Weekly, Monthly
- Strict mode

TimeLens stores the canonical limit in minutes plus `period`. Existing saved limits without `period` are treated as `daily`.

### Reset semantics
All period calculations use the browser/device local timezone:
- Daily: resets at local 00:00 each day.
- Weekly: resets Monday at local 00:00.
- Monthly: resets on day 1 at local 00:00.

Usage is calculated from the existing `dailyUsage` aggregates, so no new browsing-history collection is required.

### Alerts
For the active limited website, TimeLens evaluates remaining time on normal activity reconciliation (currently every 30 seconds) and on tab/focus/idle transitions.

Only one alert is shown for each threshold per website and limit period:
1. Five-minute warning when remaining time first becomes <= 5 minutes and > 1 minute.
2. One-minute warning when remaining time first becomes <= 1 minute and > 0.
3. Final timeout when remaining time reaches 0: **“Time’s up — don’t waste your time.”**

If Chrome was asleep or closed long enough to skip a threshold, TimeLens shows only the most urgent applicable alert rather than stacking old warnings.

The final timeout notification is created before navigating the active tab to the existing blocked page. Strict/non-strict temporary allowance behavior remains unchanged.

## Architecture

### Pure limit logic
`src/core/limits.js` owns:
- period normalization
- period key generation
- period day-key selection
- usage aggregation for one domain and period
- limit status
- alert decision selection

### Persisted alert state
`data.limitAlerts` stores only the latest alert state per domain:
```js
{
  "youtube.com": {
    periodKey: "weekly:2026-08-10",
    sent: ["5m", "1m", "timeout"]
  }
}
```
When the period key changes, alert state resets automatically. This keeps storage bounded.

### Service worker
The service worker:
- computes usage for each limit's configured period
- evaluates and records one-time threshold alerts
- displays native Chrome notifications
- enforces blocking at timeout
- exposes period-aware limit data in snapshots

### Permissions
Add the `notifications` permission. Chrome requires this permission for `chrome.notifications.create()` and exposes it as a permission warning, so the README/privacy documentation must mention it.

## Compatibility
- Existing `{ domain, minutes, enabled, strict }` limits behave as daily limits.
- Existing allowances remain day-scoped. Temporary extra time is only offered for a reached non-strict limit; it applies to the current configured period status but expires at the next local day, preserving current V1 behavior and preventing long-lived bypasses.
- No host permissions, history permission, content scripts, account, or backend are added.

## Testing
Add tests for:
- daily/weekly/monthly period keys and included days
- usage aggregation for each period
- backward compatibility for missing `period`
- 5-minute, 1-minute, and timeout alert priority/deduplication
- weekly/monthly service-worker enforcement
- notification creation and final timeout ordering
- manifest notification permission
- dashboard period/unit controls and period labels

Run `npm run check` in GitHub Actions after each TDD phase and fix all failures before opening the PR.
