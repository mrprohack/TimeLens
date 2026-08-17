import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLimitPayload } from '../src/dashboard/forms.js';

test('simple limit defaults to a daily normal all-day rule', () => {
  assert.deepEqual(buildLimitPayload({ domain: 'youtube.com', value: 45, unit: 'minutes' }), {
    domain: 'youtube.com',
    minutes: 45,
    period: 'daily',
    strict: false,
    enabled: true,
    schedule: {
      enabled: false,
      days: [1, 2, 3, 4, 5],
      startMinute: 540,
      endMinute: 1020
    }
  });
});

test('advanced limit values are preserved when provided', () => {
  assert.deepEqual(buildLimitPayload({
    domain: 'example.com',
    value: 2,
    unit: 'hours',
    period: 'weekly',
    strict: true,
    enabled: false,
    schedule: { enabled: true, days: [1, 3, 5], startMinute: 600, endMinute: 900 }
  }), {
    domain: 'example.com',
    minutes: 120,
    period: 'weekly',
    strict: true,
    enabled: false,
    schedule: { enabled: true, days: [1, 3, 5], startMinute: 600, endMinute: 900 }
  });
});
