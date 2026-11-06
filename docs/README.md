# TimeLens docs

Design specs and implementation plans for each TimeLens release.

```text
docs/
├── design/   # What and why: approved design specs (one per feature or release)
└── plans/    # How: step-by-step implementation plans that follow a design
```

## Index

| Release | Design | Plan |
| --- | --- | --- |
| 1.0 TimeLens v1 | [design](design/2026-08-15-timelens-v1-design.md) | [plan](plans/2026-08-15-timelens-v1.md) |
| 1.1 Period limits & alerts | [design](design/2026-08-16-period-limits-alerts-design.md) | [plan](plans/2026-08-16-period-limits-alerts.md) |
| 1.2 Production hardening | [design](design/2026-08-16-production-hardening-v1.2-design.md) | [plan](plans/2026-08-16-production-hardening-v1.2.md) |
| 1.3 Focus Assistant | — | [plan](plans/2026-08-16-focus-assistant-v1.3.md) |
| 1.4 Simple Home UX | [design](design/2026-08-17-simple-home-ux-v1.4-design.md) | [plan](plans/2026-08-17-simple-home-ux-v1.4.md) |
| 1.7+ Master Plan | [architecture](ARCHITECTURE.md) | [10-hour roadmap](plans/2026-08-25-master-plan-ui-redesign.md) / [master plan](plans/2026-11-06-10-hour-master-roadmap.md) |

## Core Guides

- [System Architecture](ARCHITECTURE.md) — MV3 attention detection, message protocol, boundary enforcement engine.
- [Developer Guide](DEVELOPMENT.md) — Local installation, preview server, Tailwind compilation, testing workflow.

## Adding a new doc

1. Write the design first: `design/YYYY-MM-DD-<topic>-design.md`.
2. Once it's approved, write the plan: `plans/YYYY-MM-DD-<topic>.md`.
3. Add a row to the index above.

> [!NOTE]
> Plans are historical records. File paths inside older plans (for example `docs/superpowers/...` or flat `tests/*.test.js`) describe the repository as it was when the plan was written. See the [repository layout](../README.md#repository-layout) for the current structure.
