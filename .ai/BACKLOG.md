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
- [ ] **test: give `src/core/track-state.js` its own test file** (S) — it is the only core module whose
  coverage lives in a UI suite (`tests/ui/ux-polish-v16.test.js`). Moving it to
  `tests/core/track-state.test.js` puts it in the row of the "Checks by path" table that matches its
  directory. Done when: the module has its own test file and the suite still reports 193 passing tests.
  Source: scan

## Proposed

Work the agent found that nobody asked for. Not worked on until you approve it (move it to Next, or reply
with the numbers) or a proactive rule in the playbook covers it. Delete what you do not want.

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

