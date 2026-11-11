# Backlog

Work for the agents, most important first. One line per item: what, why, and how to tell it is done.
Sizes: S (under an hour of agent work), M (one PR), L (split before starting).

## Needs you

Parked items waiting on a decision. Answer inline and move the item back to Next.

- [ ] **decide: docs claim CI runs on Windows, it does not** (S) — `CONTRIBUTING.md` says "CI must pass on
  both Ubuntu and Windows before merging" and the workflow diagram says "Linux + Windows checks", but
  `.github/workflows/ci.yml` only has `runs-on: ubuntu-latest`. Either add a Windows job (the packaging
  script and Tailwind build are the parts most likely to differ) or correct the docs. Which is right is a
  product call, not a technical one. Done when: the docs and the workflow agree. Source: scan
  - **Now answerable.** The technical side was rehearsed on a dark-preferring Windows host: `npm run check`
    and `npm run package` both pass on Windows, the axe step runs unchanged (the runner image ships Chrome,
    ChromeDriver and `CHROMEWEBDRIVER`), and the screenshot step works too. The only wrinkle is `python3`
    versus `python`, which the runner image resolves. So a Windows job is feasible; the cost is roughly
    double the CI minutes. The rehearsal also proved the more important point: the current Linux-only job
    never exercises a dark-preferring system, which is how the light-theme contrast bug behind PR #19 went
    unnoticed. See "test: exercise the accessibility matrix under a dark-preferring system" in Next.
- [ ] **decide: split `src/background/service-worker.js`** (L) — 682 lines, the largest file in the repo
  and the lowest-cohesion module in the knowledge graph. It holds the message switch, the Chrome event
  listeners, and the enforcement loop. Splitting it touches every UI surface. Worth doing only as its own
  piece of work. Done when: the switch, the listeners, and the enforcement loop live in separate modules
  and all 193 tests still pass. Source: scan

## Next

- [ ] **docs: correct the CI matrix claim in `CONTRIBUTING.md`** (S) — depends on the decision above. If
  the answer is to add a Windows job, this item is covered by it; if the answer is to correct the docs,
  update both the prose and the mermaid diagram. Done when: no line in `CONTRIBUTING.md` promises a CI
  environment that does not exist. Source: scan
- [ ] **test: exercise the accessibility matrix under a dark-preferring system** (M) — the CI axe step runs
  only on Linux with a light colour scheme, so a manual Light theme was never checked against an
  OS-dark background. That gap is how the light-theme contrast bug behind PR #19 survived. Add a second
  matrix pass that runs the same 9 pages x 3 themes with the browser forced to prefer dark. Done when: CI
  fails if any light-theme page fails an axe rule under a dark colour scheme. Source: scan
  - **Delivered by PR #20** (`ci/axe-dark-scheme-matrix`), which adds the dark-scheme passes using
    `blink-settings=preferredColorScheme=0`. Kept here only until that PR merges.

## Proposed

Work the agent found that nobody asked for. Not worked on until you approve it (move it to Next, or reply
with the numbers) or a proactive rule in the playbook covers it. Delete what you do not want.

- [ ] **a11y: fix the contrast failures on the error and onboarding states** (M) — auditing the real
  extension pages with the CI axe rules finds failures the preview fixtures do not show, because the
  fixtures never render these states: `#load-failed-reason` on the dashboard, `#error-message` on the
  popup, `#blocked-copy` on the blocked page, and 12 elements on the onboarding page (`.lead` and the
  feature `article` text). All `color-contrast`, all present in both OS schemes, all predating PR #19.
  Done when: every page passes the CI axe rules in its error state. Source: scan
- [ ] **a11y: fix the `aria-prohibited-attr` violation on `#side-focus-presets`** (S) — the side panel
  fails `aria-prohibited-attr` on `#side-focus-presets` in every theme and every OS scheme. It is present
  in the current release and unrelated to the theme work. Done when: the side panel passes the CI axe
  rules. Source: scan
- [ ] **test: cover the 12 message types with no direct contract test** (L) — the UI contract tests assert
  on markup and source text rather than behaviour. `EXTEND_FOCUS`, `GET_BLOCK_STATUS`, `CLEAR_DATA`,
  `CLEAR_DIAGNOSTICS`, `EXPORT_DATA`, `IMPORT_DATA`, `SAVE_CATEGORY`, `DELETE_CATEGORY`, `SAVE_FOCUS_PRESET`,
  `DELETE_FOCUS_PRESET`, `SAVE_TOTAL_BUDGET`, and `TOGGLE_LIMIT` have no behavioural assertion. Worth a
  service-worker test per family. Done when: each message type has at least one behavioural assertion.
  Source: scan
- [ ] **perf: give `createDomainMatcher` a benchmark** (S) — the 1.8 release replaced a linear scan with a
  Set and suffix tree. Nothing measures it, so a later change can silently restore the old cost. A micro
  benchmark in `tests/core/categories.test.js` would catch that. Done when: a benchmark asserts the
  matcher stays sub-linear on a large rule set. Source: scan
- [ ] **docs: add a `CHROMEWEBSTORE.md` listing document** (M) — the store listing copy, permission
  justifications, and screenshot plan live only in `PRIVACY.md` and the release commit. A single
  version-controlled document would make the next submission mechanical instead of archaeological. The
  `chrome-extensions` skill has a template. Done when: the document covers description, per-permission
  justification, privacy disclosure, and the asset list. Source: scan
- [ ] **chore: prune the 22 merged remote branches** (S) — `origin` carries 12 merged branches from the
  1.5 to 1.8 cycles that no longer have a use. Housekeeping only. Done when: the merged branches are gone
  from the remote. Source: scan

## On hold

Stopped by you. Only you lift it; new clues, CI or bots do not.

- (none)

## In progress

- (none)

## Done

- 2026-11-11 **ci: audit the accessibility matrix under a dark-preferring system** — ready, PR #20
  (`ci/axe-dark-scheme-matrix`, based on PR #19's branch). Adds two more axe passes with the browser
  forced to prefer dark, so a manual Light theme is checked against a dark background. Verified to fail
  on the pre-fix CSS and pass after PR #19.
- 2026-11-11 **a11y: give the manual light theme an explicit foreground for the time pill** — ready,
  PR #19 (`fix/a11y/light-theme-time-pill`, based on `origin/main`). Fixes a 1.88:1 contrast ratio on
  `.current-time-pill` for a user on a dark-preferring OS who picks Light, and adds a contract test for
  the whole class of bug.
- 2026-11-11 **test: give `src/core/track-state.js` its own test file** — ready, PR #16
  (`chore/agent-project-setup`). Moves the four `trackState` behaviour tests out of the UI suite and into
  `tests/core/track-state.test.js`, so the module sits under the matching row of the "Checks by path"
  table. The suite still reports 192 tests.
- 2026-11-11 **docs: complete the message-protocol table and lock it with a test** — ready, PR #18
  (`docs/message-protocol-table`). Documents all 19 message types with the payload each reads, and adds a
  contract test that fails if the document and the worker disagree. Verified in both directions.
- 2026-11-11 **ci: bound the job, guard the generated bundle, and add Dependabot** — ready, PR #17
  (`ci/hardening-workflow`). Adds `timeout-minutes: 10` to the check job, a CI step that rebuilds
  `src/styles/timelens.css` and fails on any difference, and `.github/dependabot.yml` watching npm and
  GitHub Actions. Three contract tests added. Based on `origin/main`, so it merges independently of PR #16.
- 2026-11-11 **setup: agent project files, playbook, backlog, log, project agent, and the
  `chrome-extensions` skill** — ready, PR #16 (`chore/agent-project-setup`). Also fixes the Tailwind
  source-scanning bug that made `npm run build:css` rewrite the committed CSS.

