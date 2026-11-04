# Speed and smoothness (Phase 1 of 3)

**Status:** implemented. **Goal:** make TimeLens feel instant and stay current, without touching the data format, permissions, or the visual design.

This is the first of three phases: **1 Speed** (this doc) → 2 Workflow → 3 Polish. Each phase is designed and approved separately.

## What was measured

`migrateData` re-validated every stored session and daily total on every `readData` **and** every `saveData`. A tab switch, window focus, idle change or 30-second alarm therefore paid for it twice, and each `GET_SNAPSHOT` (popup open, dashboard action) three times, all inside one serialized queue.

| History (sessions) | `migrateData` per call |
| --- | --- |
| Typical, 30 d (1.8k) | 36 ms |
| Heavy (4.5k) | 58 ms |
| Max retention, 180 d (27k) | 346 ms |

Normalizing sessions and daily usage was ~99% of that; settings, allowances, diagnostics and activity state cost ~0.1 ms. The stacked CSS cost a few milliseconds in comparison.

## Approaches considered

1. **Cheap reads, honest paints (chosen).** Targeted fixes, no storage-format change.
2. Split the single stored document into per-key storage. Biggest long-term win at max retention, but needs a schema v5 migration and touches backup/import. Revisit only if measurements after approach 1 still hurt (see below).
3. Visual-only fixes. Safe, but leaves the real slowness untouched.

## Design (approach 1) and outcome

| # | Change | Safety rule | Measured result |
| --- | --- | --- | --- |
| 1 | `migrateData(raw, { trustHistory })`: reuse current-schema history that TimeLens itself saved. `readData`/`saveData` opt in; `flushAndRead` returns the data it just saved. | Older schemas, imports and backups are **always** fully validated. Settings etc. are always normalized. | Per event: 84 → 5.9 ms (14×) typical, 132 → 18.8 ms (7×) heavy, 777 → 94.8 ms (8×) max. `GET_SNAPSHOT`: 1 read + 1 write (was 2 + 1). |
| 2 | Popup paints the last state from `chrome.storage.session` (`src/shared/snapshot-cache.js`), then swaps in live data. Cold start shows `—`, not fake zeros. | Cache rejected when >30 min old, from a previous day, or malformed; ended Focus dropped; actions wait for live data so a click can never act on a stale site. No new permission. | Browser-verified: cached paint before a slow worker replies; early click limits the *live* site. |
| 3 | Dashboard Home refreshes every 30 s while visible and on focus/visibility if >3 s stale; other views refresh when opened; newest-response-wins guard. | Never refreshes behind an open dialog, never re-renders views with inputs in the background, fails silently. Not `storage.onChanged`: `GET_SNAPSHOT` writes storage and would loop. | Browser-verified with a controlled clock; removing either guard makes a scenario fail. |
| 4 | `src/shared/theme-init.js`: classic blocking `<head>` script applies an explicit light/dark choice before first paint. | "System"/unset left to the CSS media query; `appearance.js` stays the source of truth. | Wrong-theme first paints: 8 of 15 → 0. |
| 5 | One compiled stylesheet: `tailwind.css` inlines the six polish layers in cascade order; `source(none)` stops Tailwind auto-scanning docs. | Equivalence harness against the previous commit. | 0/40 screenshots differ, 0/864 interactive states differ, only 94 representation-only value differences. CSS requests 9 → 3; first paint ~12 ms faster. |

## What remains (honest limits)

- After change 1 the dominant remaining cost is serializing the whole stored document on each write (about 95 ms per event at max retention). That is approach 2's territory. Typical users are at ~6 ms and do not need it.
- The CSS gain is small for a local extension; the value is structural (one artifact, deterministic build, stale-build guard).

## Next

Phase 2 (workflow): popup Focus/limit actions currently hard-code 25 minutes, a fixed five-site list, and 30 minutes, ignoring saved presets.
