const MINUTES_PER_DAY = 24 * 60;

function clampMinute(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(MINUTES_PER_DAY - 1, Math.round(number)));
}

export function normalizeSchedule(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const days = Array.isArray(source.days)
    ? [...new Set(source.days.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b)
    : [0, 1, 2, 3, 4, 5, 6];

  return {
    enabled: source.enabled === true,
    days,
    startMinute: clampMinute(source.startMinute, 0),
    endMinute: clampMinute(source.endMinute, MINUTES_PER_DAY - 1)
  };
}

function minuteOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function isScheduleActive(value, now = Date.now()) {
  const schedule = normalizeSchedule(value);
  if (!schedule.enabled) return true;
  if (!schedule.days.length) return false;

  const date = new Date(now);
  const day = date.getDay();
  const minute = minuteOfDay(date);
  const { startMinute, endMinute } = schedule;

  if (startMinute <= endMinute) {
    return schedule.days.includes(day) && minute >= startMinute && minute <= endMinute;
  }

  // Overnight windows belong to the day on which they start. The after-midnight
  // portion is active only when the previous local day is selected.
  if (schedule.days.includes(day) && minute >= startMinute) return true;
  const previousDay = (day + 6) % 7;
  return schedule.days.includes(previousDay) && minute <= endMinute;
}
