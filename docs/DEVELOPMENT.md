# TimeLens Developer Guide

Welcome to the TimeLens development guide. This document outlines setup instructions, local development commands, preview tooling, testing routines, and release procedures.

---

## 1. Prerequisites

- **Node.js:** `>= 22`
- **npm:** `>= 10`
- **Google Chrome / Chromium:** Version 116+

---

## 2. Quick Start

Clone repository and install dependencies:

```bash
git clone https://github.com/mrprohack/TimeLens.git
cd TimeLens
npm ci
```

### Build Styles

TimeLens uses Tailwind CSS v4 compiled locally without runtime dependencies:

```bash
# Build production CSS
npm run build:css

# Watch for CSS changes during development
npm run watch:css
```

---

## 3. Loading the Extension in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select the repository root folder (`TimeLens/`).
5. Pin TimeLens to your Chrome toolbar.

---

## 4. Local Previews (No Extension Reloading Needed)

For rapid UI and styling iteration without reloading the extension, use the deterministic preview server:

```bash
# Serve preview fixtures
python3 -m http.server 4173 --bind 127.0.0.1
```

Open fixtures in your browser:
- Home View: `http://localhost:4173/preview/home.html`
- Limits View: `http://localhost:4173/preview/limits.html`
- Focus View: `http://localhost:4173/preview/focus.html`
- Settings View: `http://localhost:4173/preview/settings.html`
- Extension Popup: `http://localhost:4173/preview/popup.html`
- Side Panel: `http://localhost:4173/preview/sidepanel.html`
- Blocked Page: `http://localhost:4173/preview/blocked.html`

---

## 5. Testing & Verification

Run the test suite using Node's native test runner:

```bash
# Run unit and integration tests
npm test

# Run full pre-flight validation (Tailwind build + tests + manifest/security validator)
npm run check
```

### Packaging for Release

Generate the Chrome Web Store production distribution zip:

```bash
npm run package
```
This produces `dist/timelens-<version>.zip` ready for Chrome Web Store upload.

---

## 6. Continuous Integration (CI) Checks

On every pull request and push to `main`, GitHub Actions runs:
1. `npm ci`
2. `npm run check` (CSS build, test runner, validator)
3. `npm run package` (Release zip builder)
4. `@axe-core/cli` automated accessibility audits across all pages in Light and Dark themes (WCAG 2.2 Level AA)
5. Headless Chrome screenshot visual regression matrix across desktop and mobile viewports
