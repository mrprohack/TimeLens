# Workflow (Phase 2 of 3)

**Status:** implemented. **Goal:** fewer taps for the things people do every day, using the user's own presets, with a cheap way back from mistakes. No data-format, permission, or visual-identity changes.

Phase 1 (speed) is in [2026-11-04-speed-and-smoothness-design.md](2026-11-04-speed-and-smoothness-design.md). Phase 3 (polish) follows.

## Problems found

- The popup and side panel's one-tap **Start Focus** was hard-coded to 25 minutes and a fixed five-site list, ignoring the user's saved presets. The same list was copy-pasted in four places.
- **Limit this site** was hard-coded to 30 minutes, with no way back.
- The dashboard asked for a native `confirm()` before deleting a limit, and pausing was not reversible.

## Decisions

| Question | Decision | Why |
| --- | --- | --- |
| What does one-tap Start Focus start? | The last-used preset, else the first saved preset, else the built-in default (`quickFocusPayload`, `src/core/focus.js`). | Repeat use becomes one tap and matches what the user chose; one pure, tested rule keeps all surfaces consistent. |
| A block preset with no sites? | Use the default list. | Starting a Focus that blocks nothing "succeeds" and silently does nothing. Allow-only is left for the worker to reject rather than guessing. |
| Where is "last used" stored? | `localStorage` (`src/shared/quick-actions.js`). | Per-viewer convenience shared by all extension pages; no schema change; blocked storage falls back to defaults. |
| Confirm or undo? | Undo (`src/shared/notice.js`, dashboard toast action). | Faster in the common case, equally safe. Category deletion keeps its confirm: its payload is larger. |
| Keyboard shortcuts? | Not included. | Adds a manifest `commands` entry and a new background surface; deferred unless asked. |

## Safety rule: act only on live data

The popup paints from a cache (Phase 1). Actions therefore wait for the live snapshot and **refuse** if it never arrived, so a click can never start a Focus with default sites or limit a stale site. The side panel has no cache, so it refuses while `state` is still null.

## Changes

- `core/focus.js`: `DEFAULT_FOCUS_DOMAINS`, `quickFocusPayload`, `focusStartLabel`. `core/time.js`: `formatMinutesShort` ("1h", not "1h 0m").
- Popup: labelled main button, preset chips under Start, 15/30/60 chips under Limit, Undo notice. Side panel: same rule, remembered duration, Undo. Dashboard: Focus view opens on the quick preset, Home summary uses it, limit delete and pause are undoable.
- `styles/notice.css` joins the single compiled bundle (guarded by the stale-build test).

## Verification

- Pure rule, memory, cache slimming: unit tests. Cross-surface rules: contract tests, plus `module-references.test.js`, which fails when a module calls a shared helper it never imported (this caught a real missing import during the work).
- Browser-driven (Chromium, stateful fake worker): exact `START_FOCUS` payloads for block and allow-only presets; the last-used preset becomes the next default; limit minutes and Undo delete exactly that limit; Undo restores the saved settings (not computed fields); refusal without live data; popup content is 557 px tall (fits 600) in light and dark; dashboard loads with an active Focus session.

## Known limits

- Default new-install behavior changes from "25 min Focus" to the first default preset ("Work", 1 h). The button says so explicitly, and End Focus is one tap away.
- Not exercised in a real loaded extension (fake `chrome` APIs only).
