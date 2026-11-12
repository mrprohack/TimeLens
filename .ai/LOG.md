# Log

What the agents did and decided, newest first. Short entries; the diff has the detail.

## Decisions

- 2026-11-12 **The docs were wrong about CI, so the docs were fixed; whether to add a Windows runner is
  still the user's call.** — `CONTRIBUTING.md` promised a Windows job that does not exist. Making the guide
  honest is the safe default and does not pre-empt the open question: adding a Windows runner is still
  recorded under Needs you, with the rehearsal and the cost (roughly double the CI minutes). To undo:
  revert PR #21 and put the question back as it was.
- 2026-11-11 **Autonomy set to level 3 (commit and open PRs), no merge.** — The user chose level 3 over
  level 4. The agent delivers a PR and waits for green CI; merging stays with the user. To undo: change the
  level in `.ai/PLAYBOOK.md` and in the "Project brief" section of `AGENTS.md`.
- 2026-11-11 **The permission allowlist in `manifest.json` is the only hard off-limits item.** — The user
  named it explicitly. `scripts/validate-extension.mjs` enforces the exact list, so nothing else needs a
  standing prohibition. To undo: add to the "Off limits" row of `.ai/PLAYBOOK.md`.
- 2026-11-11 **The 13 video/mobile skills are denied in this project via `opencode.jsonc` policies, not
  deleted.** — `skill.use` denials are project-scoped and reversible; the skills stay installed globally
  and remain available in other projects. To undo: remove the matching lines from `opencode.jsonc`.
- 2026-11-11 **The `agent-desktop` MCP server is denied in this project.** — Verification of a Chrome
  extension falls back to the `preview/` fixtures plus the headless Chrome and axe gates that CI already
  runs. To undo: remove the `mcp.use` line from `opencode.jsonc`.
- 2026-11-11 **The `chrome-extensions` skill is installed into the project at
  `.opencode/skills/chrome-extensions/`, not globally.** — Per the project-start rule that nothing is
  installed without the user's yes and new skills go into the project only. It is vendored from
  `googlechrome/modern-web-guidance` (Apache-2.0, licence text kept under
  `.opencode/skills/chrome-extensions/LICENSES/`). To undo: delete the directory.
- 2026-11-11 **`graphify-out/` added to `.gitignore`, and `src/styles/tailwind.css` switched to
  `@import "tailwindcss" source(none)`.** — Two related fixes to one real bug. Tailwind v4 auto-scans the
  whole working tree unless told otherwise, so *any* file in the repo containing a class-like token changed
  the committed `src/styles/timelens.css`. `graphify-out/graph.html` injected `.flex`, `.flex-shrink`, and
  `.transform`; the `chrome-extensions` skill's reference docs injected `.absolute` and `.invisible`; and
  `docs/plans/2026-08-19-tailwind-ui-migration.md` was the original source of 27 more utilities that the
  extension never used. `source(none)` restricts the build to the explicit `@source` globs
  (`src/dashboard`, `src/popup`, `src/sidepanel`, `src/blocked`, `src/onboarding`, `src/options`), so the
  generated CSS now depends only on shipped source files. To undo: revert `src/styles/tailwind.css` and
  re-run `npm run build:css`.

## Runs

### 2026-11-12 - /project-lead (a11y: the root cause behind the manual Light theme)

- Done: PR #19 (`fix/a11y/light-theme-time-pill`) now fixes the bug at its source instead of patching the
  symptom. Every rule inside a `prefers-color-scheme: dark` block in `tailwind.css`,
  `precision-polish.css` and `dashboard.css` is scoped with `html:not([data-theme="light"])`, so a
  manually chosen Light theme can never be overridden by the operating system's colour scheme. The
  light theme's own foregrounds for `.current-time-pill` and `.usage-rank` stay as defence in depth.
- Done: a contract test in `tests/ui/appearance-theme.test.js` fails if any rule in any shipped
  stylesheet's dark media block is left unscoped. It was verified by reverting each of the three files
  in turn and watching the test fail.
- Done: `scripts/check-theme-contrast.py` renders the five real extension surfaces under a dark and a
  light operating system, with the manual Light theme applied, and reports the contrast of every piece of
  text against the background it actually sits on. It separates the failures the OS scheme caused from the
  27 the theme already had, and those 27 are now a backlog item.
- Done: PR #21 (`docs/ci-runner-claim`) corrects the CI runner claim in `CONTRIBUTING.md`. The guide
  promised a Windows job that the workflow does not have; both the prose and the flow diagram now say
  what the workflow does. Whether to add a Windows runner stays parked as a cost question.
- Parked: unchanged — the Windows-CI decision and the `service-worker.js` split still need the user.
- Failed: the first version of the browser check reported a green result while comparing a light render
  against a light render. The `--blink-settings=preferredColorScheme=0` launch flag that works for the
  CI axe step does not change what the page reports under Playwright; only the context's own
  `color_scheme` does. The check now uses that, and it fails loudly rather than silently sampling a page
  that did not load.
- Learned: the check was flaky for a reason that had nothing to do with the theme. The local server was
  single-threaded, so the browser's parallel connections were refused, the page lost its stylesheet, and
  the theme was never applied. A threaded server removed every false result.
- Learned: the source fix alone is enough. Reverting the `tailwind.css` and `dashboard.css` changes while
  keeping the others still passes, so those two are defence in depth rather than load-bearing. The
  `precision-polish.css` change is the one the check catches.
- Learned: `git show HEAD:file | Set-Content -NoNewline` strips every newline from the file, which
  silently corrupted four stylesheets mid-session. `git restore --source=HEAD --worktree -- <file>` is
  the safe way to test a revert.
- Learned: the browser check was blind to dialogs. A closed dialog renders nothing, so the text inside
  it was never measured. The dashboard's shortcut hint was dark text on a dark chip at 1.02:1 for a
  dark-OS user who picks Light — unreadable, and invisible to the check and to the axe fixtures. The
  check now opens the dialogs before reading the styles, and it also reports a side-panel failure on the
  pre-fix CSS.
- Learned: measuring the real pages under a dark operating system turned the symptom fix into a root
  cause fix. Three stylesheets had unscoped `prefers-color-scheme: dark` blocks; scoping them with
  `html:not([data-theme="light"])` means an operating-system dark rule can never reach a manually chosen
  Light theme again, and a contract test enforces that across every shipped stylesheet.
- Learned: that guard was one attribute too heavy. `html:not([data-theme="light"])` raises the
  specificity of every rule it guards, so the operating-system dark rules started to beat the explicit
  appearance layer, and the manual Dark theme changed with them: on a dark-preferring system the popup
  shell lost its transparent background. `:where()` adds no specificity, so the guard does its job and
  the cascade is untouched. Rendering all five real surfaces in all four combinations of operating system
  and manual theme now shows that only the broken combination changed: 0, 0, 0 and 25 elements. A second
  contract test fails if a guard ever raises the specificity of the rule it guards.

### 2026-11-11 - /project-start (full setup)

- Done: built the knowledge graph (932 nodes, 1543 edges, 61 communities) and left it git-ignored; wrote
  `AGENTS.md`, `CLAUDE.md` (one-line `@AGENTS.md` import), `.opencode/agents/timelens-expert.md`,
  `.ai/PLAYBOOK.md`, `.ai/BACKLOG.md`, and this file; installed the `chrome-extensions` skill; added
  `opencode.jsonc` with the skill and MCP policies; added `graphify-out/` to `.gitignore`. Fixed the
  Tailwind source-scanning bug. Delivered as PR #16 (`chore/agent-project-setup`), two commits:
  `fix(build): scope Tailwind source scanning to shipped source files` and
  `chore: add agent project files, playbook, and skill set`.
- Verified: `npm run check` passes — 192 tests, 0 fail, and the validator reports 17 required files,
  28 JS files syntax-checked, 6 pages checked, approved permissions only, no remote or dynamic runtime
  code. `npm run package` produces `dist/timelens-1.8.0.zip` (56 files). The Tailwind change was verified
  by rendering all 9 preview fixtures in headless Chromium with the committed CSS and with the regenerated
  CSS and comparing 48 computed style properties on every element: 0 differences across 714 elements
  (with `reduced_motion: reduce` to remove animation-frame noise). The same axe rules CI runs
  (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa) found 0 violations across 9 pages x 3 themes.
- Parked: two items under "Needs you" in the backlog — whether to add a Windows CI job or correct the
  docs that promise one, and whether to split `src/background/service-worker.js`.
- Failed: nothing.
- Learned: `docs/ARCHITECTURE.md` documents 7 of the 19 message types the service worker implements, and
  `CONTRIBUTING.md` promises a Windows CI environment that the workflow does not have. Both are recorded in
  the backlog. Also learned: OpenCode in this setup reads agents from `.opencode/agents/` and skills from
  `.opencode/skills/`, and project-scoped narrowing is done with `policies` in `opencode.jsonc` — the
  `.claude/settings.local.json` route used by the `project-start` toolset script has no effect here. The
  agent file was therefore written to `.opencode/agents/timelens-expert.md`, and `CLAUDE.md` was added as
  the Claude Code import.
- Not checked: nothing outstanding. The extension was loaded unpacked in real Chrome via CDP — all 6
  extension pages render, the service worker is live, and there were 0 console errors.

### 2026-11-11 — /project-lead auto 3 (CI hardening)

- Done: three backlog items in one PR (#17, `ci/hardening-workflow`, based on `origin/main`): added
  `timeout-minutes: 10` to the check job, added a CI step that rebuilds `src/styles/timelens.css` and fails
  on any difference, and added `.github/dependabot.yml` for npm and GitHub Actions. Three contract tests
  added to `tests/release/release.test.js`.
- Parked: unchanged — the Windows-CI decision and the `service-worker.js` split still need the user.
- Failed: nothing.
- Learned: the three items all touch `.github/`, so per the `git-ci` rule that two writers must not share a
  file they went into one branch rather than three parallel ones. The bundle check was verified in both
  directions: exit 0 on a current bundle, exit 1 on a deliberately stale one, and exit 0 again from a clean
  clone of the branch after `npm ci` — exactly what CI will run. The `ci_workflows` scanner now reports no
  findings on that branch.
- Learned: branching from `origin/main` rather than from PR #16's branch reproduced the original bug
  exactly — `graphify-out/` is not git-ignored on `main`, so `npm run build:css` there rewrites the
  committed CSS. That is the bug PR #16 fixes, and it is why the two PRs are independent.
- Verified: the two PRs share no files, so they merge in either order. Cross-platform safety was also
  confirmed: rebuilding the CSS on Windows reproduces the file the Linux CI bot committed, byte for
  byte, so PR #17's new Linux bundle check cannot false-fail against PR #16's Windows-generated CSS.
  The check itself ran and passed in real CI on PR #17.

### 2026-11-11 — /project-lead auto 3 (message-protocol documentation)

- Done: PR #18 (`docs/message-protocol-table`). `docs/ARCHITECTURE.md` documented 7 of the 19 message
  types the worker handles; it now documents all 19 with the payload each reads, plus the behaviours that
  are easy to misread. Added a contract test that reads every `case` label from the worker's message
  switch and fails if the document omits one.
- Parked: unchanged — the Windows-CI decision and the `service-worker.js` split still need the user.
- Failed: nothing.
- Learned: the new contract test caught a real defect on its first run — `ADD_ALLOWANCE` had a missing
  space before its pipe in the table, so the row was not being parsed as a table row at all. The test was
  then verified in both directions: removing a documented row fails it, and adding a case to the worker
  without documenting it fails it too.
- Learned: PR #18 and PR #17 both touch `tests/release/release.test.js`. The merge was tested rather than
  assumed: git auto-merges the two appends with no conflict, and the merged tree passes all 11 release
  tests. Either merge order works.
- Learned: working on a branch based on `origin/main` rather than on PR #16's branch means the
  `graphify-out/` ignore rule is absent, so `npm run build:css` rewrites the committed CSS locally. This
  is the bug PR #16 fixes; it is a local annoyance on `main`-based branches, not a defect in the branches.

### 2026-11-11 — /project-lead auto 3 (track-state test file)

- Done: moved the four `trackState` behaviour tests from `tests/ui/ux-polish-v16.test.js` into
  `tests/core/track-state.test.js`, and updated the "Checks by path" row in `AGENTS.md`. The suite still
  reports 192 tests, so nothing was lost or duplicated. The one remaining `trackState` reference in the
  UI suite is intentional: it asserts the popup calls `trackState`, which is a UI contract.
- Parked: unchanged — the Windows-CI decision and the `service-worker.js` split still need the user.
- Failed: nothing.
- Learned: this change belongs on PR #16 rather than on a branch of its own. `AGENTS.md` does not exist
  on `origin/main` — PR #16 introduces it — so the "Checks by path" row can only be corrected there.
  Splitting the two would leave `AGENTS.md` pointing at a test file that does not exist yet on `main`.
  A separate branch was prepared, verified to pass standalone, and then withdrawn in favour of one
  coherent change.

### 2026-11-11 — /project-lead (a11y: manual light theme on a dark system)

- Done: PR #19 (`fix/a11y/light-theme-time-pill`, branch off `origin/main`). A user whose OS prefers dark
  but who picks Light in TimeLens settings got the dark-theme foreground on the light-theme background on
  `.current-time-pill` (the "current time" pill on the dashboard, popup and side panel) — a contrast ratio
  of 1.88:1 where WCAG AA needs 4.5:1. The light rule set only `background`, so the dark media query's
  `color` survived. The fix sets the colour explicitly, and a new contract test fails when the light theme
  sets a background but no foreground for an element a dark media query also styles.
- Parked: unchanged — the Windows-CI decision and the `service-worker.js` split still need the user. The
  Windows-CI question is now answerable: the technical side was rehearsed and works.
- Failed: nothing.
- Learned: the CI axe step only ever runs on Linux with a light colour scheme, so the interaction between
  a manual theme and an OS-dark background was never checked. That gap is what let this bug through
  three release cycles. A second matrix pass under a dark colour scheme is now a backlog item.
- Learned: rehearsing the CI matrix on a dark-preferring host also surfaced 16 pre-existing violations
  the preview fixtures never show, because the fixtures are static HTML that never sets `data-theme` and
  never renders the error states. Those are recorded in the backlog as two separate items.
- Learned: the fix was verified by removing it and confirming the new test fails, and by confirming the
  dashboard's violation count drops from two to one for a dark-OS user who picks Light.
- Learned: the fix went to its own branch off `origin/main` rather than onto the setup branch, so it can be
  reviewed and merged on its own. The setup branch was updated to point at it.
- Correction: the first version of that fix added a colour to a rule covering both `.current-time-pill`
  and `.usage-rank`, which turned `.usage-rank` from slate to brand blue in the light theme, and left the
  same 1.63:1 failure in place for it. It was corrected to set a foreground per element, and a scan of
  every text element in all nine preview surfaces under both colour schemes now reports no remaining
  element whose foreground changes with the operating system.

### 2026-11-11 — /project-lead (ci: audit the matrix under a dark-preferring system)

- Done: PR #20 (`ci/axe-dark-scheme-matrix`, based on PR #19's branch). Adds two more axe passes over the
  same nine pages and both themed fixtures with the browser forced to prefer dark, and a contract test
  asserting the pass exists.
- Parked: unchanged — the Windows-CI decision and the `service-worker.js` split still need the user.
- Failed: nothing.
- Learned: the setting that actually changes `prefers-color-scheme` is
  `blink-settings=preferredColorScheme=0` — `force-dark-mode` does not, it leaves the reported scheme
  unchanged, so it is not usable here. Verified by running all five passes in both schemes.
- Learned: the new pass fails on the pre-fix CSS and passes once PR #19's fix is in place, so it is a real
  regression guard rather than a no-op. The contract test was verified in both directions as well.
- Learned: the `preview/` fixtures are static HTML that never sets `data-theme`, so under a dark scheme
  they render half-themed and fail even though the real pages are fine. The dark pass therefore audits the
  two themed fixtures, which are the ones that model a manual theme choice.
