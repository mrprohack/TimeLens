# TimeLens

Privacy-first Chrome extension (Manifest V3) that measures **active** browsing time and enforces limits,
a daily budget, category limits, smart schedules, and Focus Mode. Everything is local: no account, no
backend, no cloud analytics, no content scripts, no remote runtime code.

## Project brief

- **Purpose and state**: shipped product, public repo, live on the Chrome Web Store at v1.8.0. Users are the
  audience; work is polish, features, and maintenance.
- **Work coming**: extension logic/engine, UI surfaces, accessibility & a11y, release & CI, tests & coverage,
  docs & marketing.
- **Autonomy**: level 3 — the agent works unattended, commits on a branch, and opens a PR. It does not merge.
- **Off limits**: the permission allowlist in `manifest.json` (`tabs`, `storage`, `idle`, `alarms`,
  `notifications`, `sidePanel`). The validator enforces this exact list; do not add, remove, or reorder it.

## Skills for this project

Use these for the job named. If a job is not listed, check the installed catalog first, then ask.

| Job | Skill |
|---|---|
| Chrome MV3 development, side panel, service worker, permissions, Web Store publish | `chrome-extensions` (in `.opencode/skills/`) |
| Git, PRs, CI, release | `git-ci` |
| Dependency updates | `dependabot` |
| Finding code, architecture questions | `graphify` |
| Library and API references | `context7-mcp` |
| Cleanup of an older repo | `project-adopt` |
| Running tasks end to end | `project-lead` |

- Not covered: WCAG/axe audit guidance beyond the CI gate (no skill installed; the `chrome-extensions`
  skill's references and the repo's own axe CI are the current source of truth).

## Commands

| Do | Command |
|---|---|
| Install | `npm ci` |
| Test all | `npm test` |
| Test one file | `node --test tests/core/limits.test.js` |
| Validate extension | `npm run validate` |
| Full gate (CSS + tests + validator) | `npm run check` |
| Build Chrome Web Store zip | `npm run package` |
| Rebuild CSS only | `npm run build:css` |

Node 22+ required (`package.json` `engines`). There are no runtime npm dependencies; the only dev
dependencies are `tailwindcss` and `@tailwindcss/cli`, both pinned to 4.3.3.

## Checks by path

Run only the rows the change touches, locally and when deciding what CI must pass. All rows only for the last one.

| Changed | Run |
|---|---|
| `src/core/**` | `node --test tests/core/<module>.test.js` |
| `src/background/**` | `node --test tests/background/<module>.test.js` |
| `src/dashboard/**`, `src/popup/**`, `src/sidepanel/**`, `src/blocked/**`, `src/onboarding/**`, `src/options/**` | `node --test tests/ui/<area>.test.js` |
| `src/styles/tailwind.css` | `npm run build:css` then `npm run check` |
| `manifest.json`, `scripts/**`, `.github/**`, `package.json` | `npm run check` and `npm run package` |
| `src/core/track-state.js` | `node --test tests/ui/ux-polish-v16.test.js` |
| `docs/**`, `**/*.md` | nothing |

## Map

- `src/core/` — pure policy, no `chrome.*` calls: `activity.js` (tracking state machine), `limits.js`
  (period windows and blocking), `categories.js` (domain matching, `createDomainMatcher`), `schedule.js`
  (weekday/overnight windows), `focus.js` (block-list and allow-only), `domain.js` (URL → domain),
  `time.js` (local dates, `formatDuration`), `analytics.js`, `track-state.js` (which boundary is tightest).
- `src/background/` — `service-worker.js` (Chrome event/message adapter, 19 message types),
  `store.js` (persistence, backup, diagnostics, retention), `migrations.js` (schema v4, import validation).
- `src/dashboard/` — shell plus one view per destination: `home-view.js`, `limits-view.js`, `focus-view.js`,
  `settings-view.js`, `sidebar-history.js`, `dialogs.js`, `forms.js`, `form-accessibility.js`.
- `src/popup/`, `src/sidepanel/` — compact surfaces. `src/blocked/` — boundary page. `src/onboarding/` —
  first run. `src/options/` — redirects to dashboard settings.
- `src/shared/` — `ui.js` (messaging bridge with timeout/retry, `escapeHtml`), `appearance.js`,
  `theme.css`. `src/styles/` — Tailwind source plus the polish CSS layers.
- `tests/` mirrors `src/`: `tests/core/`, `tests/background/`, `tests/ui/`, `tests/release/`.
- `scripts/` — `validate-extension.mjs` (permissions, syntax, remote-code, asset links),
  `package-extension.mjs`, `lib/zip.mjs` (dependency-free zip writer).
- `preview/` — static fixtures per surface, served locally for UI work.

## Conventions

- Keep `chrome.*` out of `src/core/` so the logic stays unit-testable.
- Every runtime file stays local: no `fetch`, `XMLHttpRequest`, remote scripts, `eval`, or `new Function`.
- Do not add permissions. `scripts/validate-extension.mjs` enforces the exact allowlist.
- Test files are named `<module>.test.js`; `npm test` picks up every `tests/**/*.test.js` automatically.
- Commits are Conventional Commits: `<type>: <short imperative summary>`. Types: `feat`, `fix`, `test`,
  `docs`, `style`, `refactor`, `security`, `ci`, `chore`, `release`.
- Branches from `main`: `feat/`, `fix/`, `design/`, `docs/`, `chore/`.
- The brand is a single blue system (`#244ff3` / `#315cf6`) with 44px minimum tap targets and
  `prefers-reduced-motion` / `forced-colors` support.

## Traps

- **`src/styles/timelens.css` is generated and tracked.** Never hand-edit it; it is the output of
  `npm run build:css`. `src/styles/tailwind.css` uses `@import "tailwindcss" source(none)` plus explicit
  `@source` globs, so only `src/dashboard`, `src/popup`, `src/sidepanel`, `src/blocked`, `src/onboarding`,
  and `src/options` feed the build. Keep it that way: without `source(none)`, Tailwind scans the whole
  working tree and any new file containing a class-like token (a plan document, a skill README, this
  file) silently changes the committed CSS.
- **`docs/ARCHITECTURE.md` lists 7 message types; the service worker implements 19.** The table is a
  summary, not the contract. The source of truth is `case '...'` in `src/background/service-worker.js`.
- **`CONTRIBUTING.md` claims CI runs on Ubuntu and Windows; the workflow only runs `ubuntu-latest`.**
  The docs are wrong, not the workflow. Fix the docs if you touch that area.
- **Version must be bumped in both `manifest.json` and `package.json`,** and the expected version is
  asserted in `tests/release/release.test.js` (currently `1.8.0`). The validator fails on a mismatch.
- **Enforcement outranks UI feedback.** A failed notification must never cancel a timeout block.
- **`src/background/service-worker.js` is the largest file (682 lines) and the lowest-cohesion module.**
  Split it only when the task is about splitting it.
- **`docs/brand/timelens-brandkit.html` is a standalone artifact,** not part of the extension. Do not
  add it to the packaged zip.

## Workflow

- To understand the code, read `graphify-out/GRAPH_REPORT.md` and query the graph
  (`graphify query "<question>" --budget 1500`) before opening files. The graph is git-ignored: build or
  refresh it with `graphify update .` (code only, no model calls), and again after adding, moving, or
  removing files.
- Rules for unattended work, the backlog, and the log: `.ai/PLAYBOOK.md`, `.ai/BACKLOG.md`, `.ai/LOG.md`.
- Branch from `main`, commit with Conventional Commits, open a PR, and wait for CI to be green.
  The agent does not merge.
- Parallel tasks each get their own worktree beside the repo (not inside it); run `npm ci` there.
- Do not edit: `src/styles/timelens.css` by hand, the permission list in `manifest.json`, or anything
  under `dist/`.
