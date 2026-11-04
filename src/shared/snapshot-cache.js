import { dayKey } from '../core/time.js';

// Stale-while-revalidate for the popup. The popup is a brand-new page on every
// open and the MV3 worker may be asleep, so without a cache the first paint waits
// on a worker wake-up. We keep the last rendered state in chrome.storage.session
// (in memory, cleared when the browser restarts, never synced) and paint it
// immediately while the live snapshot is fetched.
export const POPUP_CACHE_KEY = 'timelensPopupSnapshot';
export const POPUP_CACHE_MAX_AGE_MS = 30 * 60_000;
const MAX_TOP_SITES = 50;
const MAX_LIMITS = 100;

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function defaultStorage() {
  return globalThis.chrome?.storage?.session;
}

// Only the fields the popup renders. Never sessions, settings, or other history.
export function slimSnapshot(snapshot) {
  if (!isObject(snapshot)) return null;
  const focusEndsAt = Number(snapshot.focus?.endsAt);
  const budget = snapshot.totalBudget;
  return {
    todayTotalMs: number(snapshot.todayTotalMs),
    todayTop: (Array.isArray(snapshot.todayTop) ? snapshot.todayTop : [])
      .slice(0, MAX_TOP_SITES)
      .map((site) => ({ domain: String(site?.domain || ''), durationMs: number(site?.durationMs) })),
    currentDomain: typeof snapshot.currentDomain === 'string' && snapshot.currentDomain ? snapshot.currentDomain : null,
    currentDomainMs: number(snapshot.currentDomainMs),
    focus: Number.isFinite(focusEndsAt) && snapshot.focus
      ? { name: String(snapshot.focus.name || 'Focus'), endsAt: focusEndsAt }
      : null,
    limits: (Array.isArray(snapshot.limits) ? snapshot.limits : []).slice(0, MAX_LIMITS).map((limit) => ({
      domain: String(limit?.domain || ''),
      enabled: limit?.enabled !== false,
      period: String(limit?.period || 'daily'),
      effectiveMs: number(limit?.effectiveMs),
      remainingMs: number(limit?.remainingMs),
      reached: Boolean(limit?.reached),
      scheduleActive: limit?.scheduleActive !== false
    })),
    totalBudget: isObject(budget)
      ? {
        enabled: Boolean(budget.enabled),
        effectiveMs: number(budget.effectiveMs),
        remainingMs: number(budget.remainingMs),
        reached: Boolean(budget.reached)
      }
      : null
  };
}

export async function writeCachedSnapshot(snapshot, { storage = defaultStorage(), now = Date.now() } = {}) {
  try {
    const slim = slimSnapshot(snapshot);
    if (!storage || !slim) return;
    await storage.set({ [POPUP_CACHE_KEY]: { savedAt: now, snapshot: slim } });
  } catch {
    // The cache is an optimization only; never surface its failures.
  }
}

// Returns a snapshot that is safe to paint right now, or null. Anything old, from a
// previous local day, malformed, or unreadable is rejected so the popup never
// presents misleading numbers as current.
export async function readCachedSnapshot({
  storage = defaultStorage(),
  now = Date.now(),
  maxAgeMs = POPUP_CACHE_MAX_AGE_MS
} = {}) {
  try {
    if (!storage) return null;
    const entry = (await storage.get(POPUP_CACHE_KEY))?.[POPUP_CACHE_KEY];
    const savedAt = Number(entry?.savedAt);
    if (!isObject(entry) || !Number.isFinite(savedAt) || !isObject(entry.snapshot)) return null;
    if (now - savedAt > maxAgeMs || now < savedAt) return null;
    if (dayKey(savedAt) !== dayKey(now)) return null;
    const slim = slimSnapshot(entry.snapshot);
    if (slim?.focus && slim.focus.endsAt <= now) slim.focus = null;
    return slim;
  } catch {
    return null;
  }
}
