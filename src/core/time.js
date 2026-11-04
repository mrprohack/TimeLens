export function dayKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDuration(ms = 0, compact = false) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (compact) return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  if (hours > 0) return `${hours} hr ${minutes} min`;
  return `${minutes} min`;
}

// "1h" instead of "1h 0m": for presets and durations a person chose, where a
// trailing "0m" is noise. formatDuration stays as is for elapsed/remaining time.
export function formatMinutesShort(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function recentDayKeys(count, now = Date.now()) {
  const keys = [];
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  for (let i = 0; i < count; i += 1) {
    keys.push(dayKey(cursor.getTime()));
    cursor.setDate(cursor.getDate() - 1);
  }
  return keys;
}

export function splitSessionByDay(session) {
  if (!session?.domain || !Number.isFinite(session.start) || !Number.isFinite(session.end) || session.end <= session.start) return [];

  const parts = [];
  let cursor = session.start;
  while (cursor < session.end) {
    const date = new Date(cursor);
    const nextMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
    const end = Math.min(session.end, nextMidnight);
    parts.push({
      domain: session.domain,
      start: cursor,
      end,
      durationMs: end - cursor,
      day: dayKey(cursor)
    });
    cursor = end;
  }
  return parts;
}
