# TimeLens 10-Hour Continuous Development Master Plan

**Target Application:** TimeLens Chrome Extension (Manifest V3)  
**Lead Engineer / Autonomous Tech Lead:** Antigravity  
**Repository:** [TimeLens](https://github.com/mrprohack/TimeLens)  
**Date:** 2026-11-06  

---

## 1. High-Level Vision & Objectives

TimeLens is an uncompromising, privacy-first browser companion built on Chrome Manifest V3. Its core mission is to show users where their attention really goes and empower intentional digital habits through local site limits, category budgets, smart schedules, and Focus Mode.

Over this 10-hour sprint roadmap, we elevate TimeLens from an already polished instrument into an ultra-responsive, highly accessible, keyboard-driven productivity powerhouse, while continuously verifying and deploying features through GitHub Actions CI with zero downtime or regressions.

---

## 2. Five 2-Hour Sprints

### Sprint 1 (Hours 0–2): Workflow Acceleration, Keyboard Navigation & Limits Filter [MERGED — PR #11]
- **Version Alignment:** Updated `package.json`, `manifest.json`, `CHANGELOG.md`, and test suites to `v1.7.0`.
- **Keyboard Shortcuts Engine:**
  - `1-4` for immediate primary view switching (Home, Limits, Focus, Settings).
  - `/` to focus the search/filter box in Limits view.
  - `f` to toggle / initiate Focus Mode.
  - `l` to open the Add Limit modal.
  - `?` to open the Keyboard Shortcuts modal.
  - `Escape` to close any open modal or drawer.
- **Real-Time Limits Filter:** Instant domain filtering in the Limits dashboard view, enabling effortless management of large domain sets.
- **CI & Continuous Merge:** Successfully merged PR #11 into `main` after full CI pass (189 tests, Tailwind compile, axe accessibility).

### Sprint 2 (Hours 2–4): UI/UX Refinement & Focus Mode Enhancements [MERGED — PR #12]
- **Focus Mode Quick Extension:** Added 1-click `+15 min` extension affordance with dedicated `EXTEND_FOCUS` service-worker support, allowing users to extend their focus flow seamlessly.
- **Accessibility & Focus Trapping:** Guaranteed strict WCAG 2.2 AA accessibility, proper ARIA modal boundaries, and trapped keyboard focus in dialogs.
- **Micro-Interactions & Transitions:** Polished active focus status transitions and error alert toasts.
- **CI & Continuous Merge:** Successfully merged PR #12 into `main` after full CI pass (191 tests, Tailwind compile, axe accessibility).

### Sprint 3 (Hours 4–6): Engine Performance & Storage Compaction [IN PROGRESS]
- **Optimized Domain Matching:** Implemented `createDomainMatcher` in `src/core/categories.js` using Set lookup and suffix trees, eliminating $O(N)$ linear rule sweeps.
- **Historical Classification Memoization:** Reusable Map caching during category usage computations across 7-day windows.
- **Popup & Sidepanel Ticker Hygiene:** Explicit interval clearance on visibility changes and page unload to prevent timer drift and memory retention.

### Sprint 4 (Hours 6–8): CI Automation & Regression Hardening
- **Automated Syntax and Formatting CI Checks:** Pre-flight validation for JSON, JS, and HTML templates.
- **Visual Regression Validation:** Deterministic headless screenshot checks across desktop and mobile form factors in both Light and Dark modes.
- **Packaging Integrity:** Automated validation of release zip artifacts and permissions isolation.

### Sprint 5 (Hours 8–10): Documentation Mastery & Community Readiness
- **Complete README Overhaul:** Mermaid architecture diagrams, user journey flows, and keyboard navigation reference.
- **Developer & Contributor Handbook:** Clear guides for preview fixtures, testing routines, and local debugging.
- **Release Tag & Distribution Package:** Final production build readiness.
