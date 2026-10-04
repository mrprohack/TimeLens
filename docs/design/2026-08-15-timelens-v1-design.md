# TimeLens V1 Design

## Product goal
TimeLens is a privacy-first Chrome extension that measures active website usage and helps users control distracting sites with daily limits and focus sessions.

## UX principles
- Show the most important number first: active browsing time today.
- Keep the popup useful in under five seconds: current site, today's total, top sites, quick focus action.
- Put deeper history, limits, and settings in a full dashboard.
- Use calm, readable UI with strong hierarchy, generous spacing, keyboard focus states, automatic dark mode, and no decorative clutter.
- No account, cloud sync, ads, or external analytics in V1.

## Tracking rules
Count a website only while its tab is active, its Chrome window is focused, and Chrome reports the user as active. Close the active session on domain change, focus loss, idle/locked state, or extension shutdown/reconciliation. Track registrable-looking hostnames without paths or query strings.

## Surfaces
- Popup: today total, current site, top usage, limit progress, start/stop focus, dashboard link.
- Dashboard: today/7-day/30-day summaries, top sites, daily history, limits, focus configuration, data controls.
- Blocked page: reason, usage/limit, back action, optional temporary extension when strict mode is off.
- Options route: redirects into dashboard settings to keep navigation simple.

## Storage
Use `chrome.storage.local` for settings, daily domain totals, recent sessions, active tracking state, and focus state. Raw sessions are retained for 30 days by default; daily aggregates are retained for 365 days. No browsing data leaves the device.

## Permissions
Use only `tabs`, `storage`, `idle`, and `alarms`. V1 does not request history, cookies, webRequest, or broad host permissions.

## Architecture
Pure modules under `src/core` own domain normalization, tracking state transitions, aggregation, limits, and focus logic. The MV3 service worker adapts Chrome events to those pure modules and persists state. UI pages communicate with the service worker through runtime messages and share a common tokenized stylesheet.
