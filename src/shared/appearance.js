export const APPEARANCE_STORAGE_KEY = 'timelensAppearance';
export const APPEARANCE_VALUES = Object.freeze(['light', 'dark', 'system']);

const VALID_APPEARANCE = new Set(APPEARANCE_VALUES);
let initialized = false;
let mediaQuery = null;

export function normalizeAppearance(value) {
  return VALID_APPEARANCE.has(value) ? value : 'system';
}

export function getAppearancePreference(storage = globalThis.localStorage) {
  try {
    return normalizeAppearance(storage?.getItem(APPEARANCE_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

function getSystemAppearanceQuery() {
  if (typeof globalThis.matchMedia !== 'function') return null;
  return globalThis.matchMedia('(prefers-color-scheme: dark)');
}

function systemPrefersDark() {
  return getSystemAppearanceQuery()?.matches === true;
}

export function resolveAppearance(preference, prefersDark = systemPrefersDark()) {
  const normalized = normalizeAppearance(preference);
  if (normalized === 'system') return prefersDark ? 'dark' : 'light';
  return normalized;
}

export function applyAppearance(preference = getAppearancePreference()) {
  const normalized = normalizeAppearance(preference);
  const effective = resolveAppearance(normalized);
  const root = globalThis.document?.documentElement;
  if (root) {
    root.dataset.appearance = normalized;
    root.dataset.theme = effective;
    root.style.colorScheme = effective;
  }
  return { preference: normalized, theme: effective };
}

export function setAppearancePreference(preference, storage = globalThis.localStorage) {
  const normalized = normalizeAppearance(preference);
  try { storage?.setItem(APPEARANCE_STORAGE_KEY, normalized); } catch { /* UI still updates for this page. */ }
  return applyAppearance(normalized);
}

export function initializeAppearance() {
  const result = applyAppearance();
  if (initialized || typeof globalThis.addEventListener !== 'function') return result;
  initialized = true;

  mediaQuery = getSystemAppearanceQuery();
  mediaQuery?.addEventListener?.('change', () => {
    if (getAppearancePreference() === 'system') applyAppearance('system');
  });
  globalThis.addEventListener('storage', (event) => {
    if (event.key === APPEARANCE_STORAGE_KEY) applyAppearance(getAppearancePreference());
  });
  return result;
}
