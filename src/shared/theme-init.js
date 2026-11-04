// Classic (non-module) script loaded synchronously in <head> so an explicit light
// or dark choice is applied before the first paint. Module scripts run after the
// page has already been painted, which made every page flash in the OS theme
// first. MV3 forbids inline scripts, hence a tiny separate file.
//
// "System" and unset need nothing here: the CSS media query already matches the OS.
// appearance.js stays the source of truth and re-applies the same state afterwards.
(function applySavedAppearance() {
  try {
    var preference = localStorage.getItem('timelensAppearance');
    if (preference !== 'light' && preference !== 'dark') return;
    var root = document.documentElement;
    root.dataset.appearance = preference;
    root.dataset.theme = preference;
    root.style.colorScheme = preference;
  } catch (error) {
    // Storage can be blocked; fall back to the CSS media query.
  }
})();
