# Log

What the agents did and decided, newest first. Short entries; the diff has the detail.

## Decisions

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

### 2026-11-11 — /project-start (full setup)

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
