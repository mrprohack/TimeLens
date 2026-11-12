#!/usr/bin/env python3
"""Check that a manually chosen theme meets WCAG AA on any operating system.

A user whose OS prefers dark but who picks Light in TimeLens settings still
gets the light theme. The prefers-color-scheme: dark blocks in the stylesheets
used to apply anyway, so if a light-theme rule set only a background, the dark
foreground landed on the light background and failed.

The check renders every surface twice: once with the operating system emulated
as dark and once as light, both with the manual theme applied. A contrast
failure that only happens under the dark operating system is the bug this
guards against; a failure that happens under both is a pre-existing problem
with the theme itself and is reported separately.

Usage: python scripts/check-theme-contrast.py [--port 4176] [--theme light]

Needs Playwright and a local Chrome. The repo has no runtime npm dependencies,
so this is Python rather than a Node script.
"""
import argparse
import http.server
import socketserver
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path.cwd()
# The real extension surfaces, not the preview fixtures. The fixtures are
# simplified stand-ins, so they can diverge from what a user actually sees.
PAGES = [
    "src/dashboard/dashboard.html",
    "src/popup/popup.html",
    "src/sidepanel/sidepanel.html",
    "src/blocked/blocked.html",
    "src/onboarding/onboarding.html",
]
# The manual themes the extension offers.
THEMES = ("light", "dark")

SNAPSHOT = r"""
() => {
  const parse = (value) => {
    const m = value.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
  };
  const composite = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });

  // The colour a piece of text actually sits on: the nearest opaque
  // background at or above the element, with every translucent layer in
  // between composited on top of it. An element's own opaque background hides
  // everything above it, so the walk stops there.
  //
  // A gradient background leaves backgroundColor transparent, so fall back to
  // the first colour stop of the gradient: that is the colour the text most
  // likely sits against.
  const gradientStop = (image) => {
    const m = image && image.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: 1 } : null;
  };
  const effectiveBackground = (el) => {
    const rootBg = parse(getComputedStyle(document.documentElement).backgroundColor);
    const floor = rootBg && rootBg.a >= 0.95 ? { ...rootBg } : { r: 255, g: 255, b: 255, a: 1 };
    const layers = [];
    let base = null;
    for (let node = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      const bg = parse(style.backgroundColor);
      if (bg && bg.a >= 0.95) {
        base = { ...bg };
        break;
      }
      if (bg && bg.a > 0) {
        layers.push(bg);
      } else if (style.backgroundImage && style.backgroundImage.includes('gradient')) {
        const stop = gradientStop(style.backgroundImage);
        if (stop) {
          base = stop;
          break;
        }
      }
      if (node === document.documentElement) break;
    }
    if (!base) base = floor;
    let result = base;
    for (const layer of layers.reverse()) result = composite(layer, result);
    return result;
  };

  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (!el.textContent || !el.textContent.trim()) continue;
    if (el.children.length) continue;
    const fg = parse(cs.color);
    if (!fg) continue;
    const rect = el.getBoundingClientRect();
    out.push({
      cls: typeof el.className === 'string' ? el.className : '',
      tag: el.tagName.toLowerCase(),
      color: cs.color,
      fg: [fg.r, fg.g, fg.b],
      bg: effectiveBackground(el),
      size: parseFloat(cs.fontSize),
      weight: parseInt(cs.fontWeight, 10) || 400,
      hidden: rect.width === 0 || rect.height === 0,
    });
  }
  return out;
}
"""

# Reveal every part of a surface before reading the styles, so the check covers
# the views that are hidden until the user navigates to them.
PREPARE = """
() => {
  document.querySelectorAll('[data-view]').forEach((view) => { view.hidden = false; });
}
"""


def luminance(rgb):
    def channel(value):
        v = value / 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = rgb
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def contrast(fg, bg):
    a, b = luminance(fg), luminance(bg)
    return (max(a, b) + 0.05) / (min(a, b) + 0.05)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass


class Server(socketserver.ThreadingTCPServer):
    # The browser opens several connections at once for a page and its assets.
    # A single-threaded server refuses the extras, which silently leaves the
    # page without its stylesheet and makes the check report nonsense.
    daemon_threads = True
    allow_reuse_address = False
    request_queue_size = 64


def capture(browser, port, scheme, theme):
    """Render every surface under one operating system colour scheme."""
    snapshots = {}
    for name in PAGES:
        context = browser.new_context(
            color_scheme=scheme,
            viewport={"width": 1440, "height": 1000},
        )
        # The pages read the stored appearance preference, so set it to the
        # manual theme under test. Otherwise the page's own script would set
        # the theme to match the operating system.
        context.add_init_script(
            f"try {{ localStorage.setItem('timelensAppearance', {theme!r}); }} catch (e) {{}}"
        )
        page = context.new_page()
        # A resource that fails to load leaves the page unstyled, which would
        # look like a theme bug. Record it and fail loudly instead.
        problems = []
        page.on("requestfailed", lambda request: problems.append(f"{request.url} failed to load"))
        page.on(
            "pageerror",
            lambda error: problems.append(f"page error: {error}"),
        )
        page.goto(f"http://127.0.0.1:{port}/{name}", wait_until="networkidle")
        # The theme has to be applied before the styles are read, otherwise the
        # check samples a half-applied page.
        try:
            page.wait_for_function(
                "(t) => document.documentElement.dataset.theme === t",
                arg=theme,
                timeout=10000,
            )
        except Exception:
            problems.append(f"the page never applied the '{theme}' theme")
        page.wait_for_timeout(200)
        page.evaluate(PREPARE)
        page.wait_for_timeout(100)
        snapshots[name] = page.evaluate(SNAPSHOT)
        context.close()
        if problems:
            raise SystemExit(
                f"{name} did not load cleanly under the {scheme} operating system:\n  "
                + "\n  ".join(problems)
                + "\nThe check cannot tell a theme bug from a broken page, so it stops here."
            )
    return snapshots


def contrast_failures(snapshots):
    found = []
    for name, items in snapshots.items():
        for item in items:
            if item["hidden"]:
                continue
            fg = tuple(item["fg"])
            bg = (item["bg"]["r"], item["bg"]["g"], item["bg"]["b"])
            large = item["size"] >= 24 or (item["size"] >= 18.66 and item["weight"] >= 700)
            need = 3.0 if large else 4.5
            ratio = contrast(fg, bg)
            if ratio < need:
                found.append((name, item["cls"], item["color"], item["bg"], ratio, need))
    return found


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4176)
    parser.add_argument("--theme", default="light", choices=list(THEMES))
    args = parser.parse_args()

    # Bind strictly: with SO_REUSEADDR a stale server from an earlier run could
    # still hold the port, and the new one would silently serve old files.
    try:
        server = Server(("127.0.0.1", args.port), Handler)
    except OSError as exc:
        raise SystemExit(f"port {args.port} is already in use: {exc}. Choose another with --port.")

    import threading

    threading.Thread(target=server.serve_forever, daemon=True).start()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, channel="chrome")
            try:
                dark = capture(browser, args.port, "dark", args.theme)
                light = capture(browser, args.port, "light", args.theme)
            finally:
                browser.close()
    finally:
        server.shutdown()

    light_failures = contrast_failures(light)
    dark_failures = contrast_failures(dark)

    def key(entry):
        return (entry[0], entry[1], entry[2])

    light_keys = {key(entry) for entry in light_failures}
    os_dependent = [entry for entry in dark_failures if key(entry) not in light_keys]

    if os_dependent:
        print(f"Contrast failures caused by the dark operating system:")
        for name, cls, fg, bg, ratio, need in os_dependent:
            b = f"rgb({bg['r']:.0f}, {bg['g']:.0f}, {bg['b']:.0f})"
            print(f"  {name}: .{cls} fg={fg} bg={b} ratio={ratio:.2f} need={need}")

    if light_failures:
        print(
            f"\nPre-existing contrast failures in the '{args.theme}' theme, present in a light "
            "operating system too (not caused by the OS scheme):"
        )
        for name, cls, fg, bg, ratio, need in light_failures:
            b = f"rgb({bg['r']:.0f}, {bg['g']:.0f}, {bg['b']:.0f})"
            print(f"  {name}: .{cls} fg={fg} bg={b} ratio={ratio:.2f} need={need}")

    if os_dependent:
        raise SystemExit(1)

    print(
        f"OK: the manual '{args.theme}' theme has no contrast failure caused by a dark operating "
        f"system across {len(PAGES)} surfaces."
        + (f" ({len(light_failures)} pre-existing failure(s) reported above.)" if light_failures else "")
    )


if __name__ == "__main__":
    main()
