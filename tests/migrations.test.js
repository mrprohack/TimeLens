import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_DATA_VERSION, migrateData, validateImport } from '../src/background/migrations.js';

test('migrates version 3 data to schema v4 without losing existing usage or limits', () => {
  const migrated = migrateData({
    version: 3,
    settings: {
      idleSeconds: 120,
      retentionDays: 90,
      aggregateRetentionDays: 365,
      alerts: { fiveMinutes: true, oneMinute: true, timeout: true },
      limits: [{ domain: 'youtube.com', minutes: 120, period: 'weekly', enabled: true, strict: false }]
    },
    dailyUsage: { '2026-08-15': { 'youtube.com': 123456 } },
    sessions: [{ id: '1', domain: 'youtube.com', start: 1, end: 2, durationMs: 1 }],
    allowances: { 'weekly:2026-08-10': { 'youtube.com': 300000 } },
    limitAlerts: {},
    diagnostics: []
  });

  assert.equal(migrated.version, 4);
  assert.equal(CURRENT_DATA_VERSION, 4);
  assert.equal(migrated.dailyUsage['2026-08-15']['youtube.com'], 123456);
  assert.equal(migrated.sessions.length, 1);
  assert.equal(migrated.settings.limits[0].domain, 'youtube.com');
  assert.deepEqual(migrated.settings.totalBudget, { enabled: false, minutes: 300, mode: 'warn' });
  assert.deepEqual(migrated.settings.categories, []);
  assert.equal(migrated.settings.focusPresets.length, 3);
});

test('normalizes schedules categories budget and focus presets safely', () => {
  const migrated = migrateData({
    version: 4,
    settings: {
      totalBudget: { enabled: true, minutes: 99999, mode: 'nonsense' },
      limits: [{
        domain: 'youtube.com', minutes: 30, period: 'daily', enabled: true, strict: false,
        schedule: { enabled: true, days: [1, 1, 9], startMinute: -5, endMinute: 2000 }
      }],
      categories: [
        {
          id: 'social!!!', name: '<b>Social</b>', domains: ['HTTPS://WWW.Reddit.com/r/x', 'instagram.com'],
          minutes: 90, period: 'weekly', enabled: true, strict: true,
          schedule: { enabled: true, days: [1, 2, 3, 4, 5], startMinute: 540, endMinute: 1020 }
        },
        { id: '', name: '', domains: [], minutes: -1 }
      ],
      focusPresets: [
        { id: 'study', name: 'Study', minutes: 45, mode: 'allow', domains: ['docs.google.com', 'github.com'] },
        { id: '', name: '', minutes: 0, mode: 'wat' }
      ]
    },
    dailyUsage: {},
    sessions: []
  });

  assert.equal(migrated.settings.totalBudget.enabled, true);
  assert.equal(migrated.settings.totalBudget.minutes, 1440);
  assert.equal(migrated.settings.totalBudget.mode, 'warn');
  assert.deepEqual(migrated.settings.limits[0].schedule.days, [1]);
  assert.equal(migrated.settings.limits[0].schedule.startMinute, 0);
  assert.equal(migrated.settings.limits[0].schedule.endMinute, 1439);
  assert.equal(migrated.settings.categories.length, 1);
  assert.equal(migrated.settings.categories[0].id, 'social');
  assert.equal(migrated.settings.categories[0].name, '<b>Social</b>');
  assert.deepEqual(migrated.settings.categories[0].domains, ['reddit.com', 'instagram.com']);
  assert.equal(migrated.settings.focusPresets.length, 1);
  assert.equal(migrated.settings.focusPresets[0].mode, 'allow');
});

test('validateImport rejects non-object payloads and accepts older migratable exports', () => {
  assert.throws(() => validateImport(null), /valid TimeLens export/i);
  assert.throws(() => validateImport([]), /valid TimeLens export/i);
  const restored = validateImport({ version: 2, settings: { limits: [] }, dailyUsage: {}, sessions: [] });
  assert.equal(restored.version, 4);
});
