import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_DATA_VERSION, migrateData, validateImport } from '../src/background/migrations.js';

test('migrates version 2 data to schema v3 without losing usage history', () => {
  const migrated = migrateData({
    version: 2,
    settings: {
      idleSeconds: 120,
      retentionDays: 90,
      aggregateRetentionDays: 365,
      limits: [{ domain: 'youtube.com', minutes: 120, period: 'weekly', enabled: true, strict: false }]
    },
    dailyUsage: { '2026-08-15': { 'youtube.com': 123456 } },
    sessions: [{ id: '1', domain: 'youtube.com', start: 1, end: 2, durationMs: 1 }],
    allowances: { '2026-08-15': { 'youtube.com': 300000 } },
    limitAlerts: {}
  });

  assert.equal(migrated.version, CURRENT_DATA_VERSION);
  assert.equal(migrated.dailyUsage['2026-08-15']['youtube.com'], 123456);
  assert.equal(migrated.sessions.length, 1);
  assert.deepEqual(migrated.settings.alerts, { fiveMinutes: true, oneMinute: true, timeout: true });
  assert.equal(migrated.allowances['weekly:2026-08-10']['youtube.com'], 300000);
});

test('normalizes malformed settings and unsafe numeric values', () => {
  const migrated = migrateData({
    version: 3,
    settings: {
      idleSeconds: -100,
      retentionDays: 99999,
      aggregateRetentionDays: 0,
      alerts: { fiveMinutes: false, oneMinute: 'yes', timeout: false },
      limits: [
        { domain: 'HTTPS://WWW.YouTube.com/watch?v=x', minutes: -5, period: 'weekly', enabled: true },
        { domain: 'reddit.com', minutes: 30, period: 'nonsense', enabled: true, strict: true }
      ]
    },
    dailyUsage: { bad: { 'youtube.com': -100 }, '2026-08-15': { 'youtube.com': 5000 } },
    sessions: 'not-an-array',
    diagnostics: new Array(100).fill({ at: 1, code: 'OLD', message: 'old' })
  });

  assert.equal(migrated.settings.idleSeconds, 15);
  assert.equal(migrated.settings.retentionDays, 180);
  assert.equal(migrated.settings.aggregateRetentionDays, 180);
  assert.deepEqual(migrated.settings.alerts, { fiveMinutes: false, oneMinute: true, timeout: false });
  assert.equal(migrated.settings.limits.length, 1);
  assert.equal(migrated.settings.limits[0].domain, 'reddit.com');
  assert.equal(migrated.settings.limits[0].period, 'daily');
  assert.equal(migrated.dailyUsage['2026-08-15']['youtube.com'], 5000);
  assert.equal(migrated.dailyUsage.bad, undefined);
  assert.equal(migrated.sessions.length, 0);
  assert.equal(migrated.diagnostics.length, 50);
});

test('validateImport rejects non-object payloads and accepts migratable exports', () => {
  assert.throws(() => validateImport(null), /valid TimeLens export/i);
  assert.throws(() => validateImport([]), /valid TimeLens export/i);
  const restored = validateImport({ version: 2, settings: { limits: [] }, dailyUsage: {}, sessions: [] });
  assert.equal(restored.version, 3);
});
