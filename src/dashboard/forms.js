export const DEFAULT_SCHEDULE = Object.freeze({
  enabled: false,
  days: [1, 2, 3, 4, 5],
  startMinute: 540,
  endMinute: 1020
});

export function splitDomains(value = '') {
  return String(value).split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

export function timeToMinute(value, fallback) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return fallback;
  return hour * 60 + minute;
}

export function minuteToTime(value, fallback = '09:00') {
  const minute = Number(value);
  if (!Number.isFinite(minute) || minute < 0 || minute > 1439) return fallback;
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

export function buildLimitPayload({
  domain,
  value,
  unit = 'minutes',
  period = 'daily',
  strict = false,
  enabled = true,
  schedule = DEFAULT_SCHEDULE
}) {
  const number = Number(value);
  const minutes = unit === 'hours' ? number * 60 : number;
  return {
    domain: String(domain || '').trim(),
    minutes,
    period: ['daily', 'weekly', 'monthly'].includes(period) ? period : 'daily',
    strict: Boolean(strict),
    enabled: enabled !== false,
    schedule: {
      enabled: Boolean(schedule?.enabled),
      days: Array.isArray(schedule?.days) ? [...schedule.days] : [...DEFAULT_SCHEDULE.days],
      startMinute: Number.isFinite(Number(schedule?.startMinute)) ? Number(schedule.startMinute) : DEFAULT_SCHEDULE.startMinute,
      endMinute: Number.isFinite(Number(schedule?.endMinute)) ? Number(schedule.endMinute) : DEFAULT_SCHEDULE.endMinute
    }
  };
}

export function selectedDays(containerId) {
  return [...document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)].map((input) => Number(input.value));
}

export function readSchedule(prefix) {
  return {
    enabled: document.getElementById(`${prefix}-schedule-enabled`)?.checked === true,
    days: selectedDays(`${prefix}-schedule-days`),
    startMinute: timeToMinute(document.getElementById(`${prefix}-schedule-start`)?.value, DEFAULT_SCHEDULE.startMinute),
    endMinute: timeToMinute(document.getElementById(`${prefix}-schedule-end`)?.value, DEFAULT_SCHEDULE.endMinute)
  };
}

export function setSchedule(prefix, value = DEFAULT_SCHEDULE) {
  const schedule = value || DEFAULT_SCHEDULE;
  const enabled = document.getElementById(`${prefix}-schedule-enabled`);
  if (enabled) enabled.checked = Boolean(schedule.enabled);
  const selected = new Set(Array.isArray(schedule.days) ? schedule.days.map(Number) : DEFAULT_SCHEDULE.days);
  document.querySelectorAll(`#${prefix}-schedule-days input[type="checkbox"]`).forEach((input) => {
    input.checked = selected.has(Number(input.value));
  });
  const start = document.getElementById(`${prefix}-schedule-start`);
  const end = document.getElementById(`${prefix}-schedule-end`);
  if (start) start.value = minuteToTime(schedule.startMinute, '09:00');
  if (end) end.value = minuteToTime(schedule.endMinute, '17:00');
}

export function serializeLimitForm({ enabled = true } = {}) {
  return buildLimitPayload({
    domain: document.getElementById('limit-domain')?.value,
    value: document.getElementById('limit-value')?.value,
    unit: document.getElementById('limit-unit')?.value || 'minutes',
    period: document.getElementById('limit-period')?.value || 'daily',
    strict: document.getElementById('limit-strict')?.checked === true,
    enabled,
    schedule: readSchedule('limit')
  });
}

export function scheduleCopy(schedule) {
  if (!schedule?.enabled) return 'All day';
  const days = Array.isArray(schedule.days) ? schedule.days : [];
  let dayCopy = `${days.length} days/week`;
  if (days.length === 7) dayCopy = 'Every day';
  else if (days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))) dayCopy = 'Weekdays';
  else if (days.length === 2 && days.includes(0) && days.includes(6)) dayCopy = 'Weekends';
  return `${dayCopy} · ${minuteToTime(schedule.startMinute, '00:00')}–${minuteToTime(schedule.endMinute, '23:59')}`;
}
