import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSchedule, isScheduleActive } from '../src/core/schedule.js';

function at(year, month, day, hour, minute = 0) {
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

test('disabled or missing schedules stay active for backward compatibility', () => {
  assert.equal(isScheduleActive(null, at(2026, 8, 17, 10)), true);
  assert.equal(isScheduleActive({ enabled: false }, at(2026, 8, 17, 10)), true);
});

test('weekday schedule activates only inside its local window', () => {
  const schedule = normalizeSchedule({ enabled: true, days: [1, 2, 3, 4, 5], startMinute: 9 * 60, endMinute: 17 * 60 });
  assert.equal(isScheduleActive(schedule, at(2026, 8, 17, 10)), true); // Monday
  assert.equal(isScheduleActive(schedule, at(2026, 8, 17, 18)), false);
  assert.equal(isScheduleActive(schedule, at(2026, 8, 16, 10)), false); // Sunday
});

test('overnight schedule carries into the next local day', () => {
  const schedule = normalizeSchedule({ enabled: true, days: [5], startMinute: 22 * 60, endMinute: 2 * 60 });
  assert.equal(isScheduleActive(schedule, at(2026, 8, 14, 23)), true); // Friday
  assert.equal(isScheduleActive(schedule, at(2026, 8, 15, 1)), true);  // Saturday carry-over
  assert.equal(isScheduleActive(schedule, at(2026, 8, 15, 3)), false);
});

test('schedule normalization rejects impossible values and deduplicates weekdays', () => {
  const schedule = normalizeSchedule({ enabled: true, days: [1, 1, 9, -1, 5], startMinute: -20, endMinute: 2000 });
  assert.deepEqual(schedule.days, [1, 5]);
  assert.equal(schedule.startMinute, 0);
  assert.equal(schedule.endMinute, 1439);
});
