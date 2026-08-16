# Security Policy

## Supported versions

Security fixes are applied to the latest released version of TimeLens.

## Reporting a vulnerability

Please report security issues privately through GitHub's security reporting / private vulnerability reporting flow for this repository when available. Do not include sensitive exploit details in a public issue.

A useful report includes:

- affected TimeLens version,
- Chrome version and operating system,
- clear reproduction steps,
- expected versus observed behavior,
- security impact,
- any minimal proof of concept needed to reproduce the issue.

TimeLens is intentionally local-first and does not include a backend, analytics service, remote runtime code, content scripts, cookies access, browsing-history permission, or broad host permissions. Reports involving unexpected data exposure, permission use, bypass of user-created limits, unsafe restore/import behavior, or extension-page injection are especially important.

## Security expectations

Production changes should preserve these properties:

- no remotely hosted executable code,
- no collection or transmission of browsing-usage data,
- least-privilege Chrome permissions,
- validated local data migration/import,
- safe HTML escaping for user-controlled website strings,
- limit enforcement remains functional when optional notification UI fails.
