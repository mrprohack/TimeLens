import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryStatus, categoryUsage, domainMatchesRule } from '../src/core/categories.js';

test('domain rules match the root domain and its subdomains only', () => {
  assert.equal(domainMatchesRule('youtube.com', 'youtube.com'), true);
  assert.equal(domainMatchesRule('music.youtube.com', 'youtube.com'), true);
  assert.equal(domainMatchesRule('notyoutube.com', 'youtube.com'), false);
  assert.equal(domainMatchesRule('youtube.com.evil.example', 'youtube.com'), false);
});

test('category usage aggregates every matching domain in the configured period', () => {
  const now = new Date(2026, 7, 15, 12).getTime();
  const category = {
    id: 'social', name: 'Social', domains: ['instagram.com', 'reddit.com'],
    minutes: 120, period: 'weekly', enabled: true
  };
  const dailyUsage = {
    '2026-08-10': { 'instagram.com': 20 * 60_000, 'reddit.com': 10 * 60_000, 'work.example': 99 * 60_000 },
    '2026-08-15': { 'www.instagram.com': 30 * 60_000, 'reddit.com': 25 * 60_000 },
    '2026-08-09': { 'reddit.com': 999 * 60_000 }
  };
  assert.equal(categoryUsage(dailyUsage, category, now), 85 * 60_000);
});

test('category status reports remaining time and reached state', () => {
  const now = new Date(2026, 7, 15, 12).getTime();
  const category = { id: 'video', name: 'Video', domains: ['youtube.com'], minutes: 60, period: 'daily', enabled: true };
  let status = categoryStatus(category, { '2026-08-15': { 'youtube.com': 45 * 60_000 } }, now);
  assert.equal(status.usedMs, 45 * 60_000);
  assert.equal(status.remainingMs, 15 * 60_000);
  assert.equal(status.reached, false);

  status = categoryStatus(category, { '2026-08-15': { 'youtube.com': 61 * 60_000 } }, now);
  assert.equal(status.reached, true);
});
