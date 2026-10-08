import assert from 'node:assert/strict';
import { test } from 'node:test';
import { daysUntilExpiration, getExpiringItems } from '../src/utils/pantry.ts';
import type { PantryItem } from '../src/types/pantry.ts';

function item(id: string, expirationDate?: string): PantryItem {
  return { id, expirationDate, name: id, quantity: 1, unit: 'pcs', version: 0, createdAt: '', updatedAt: '' };
}

test('expiration labels count calendar days across both daylight saving transitions', () => {
  const originalTimezone = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    assert.equal(daysUntilExpiration('2026-03-09', new Date(2026, 2, 8)), 1);
    assert.equal(daysUntilExpiration('2026-11-02', new Date(2026, 10, 1)), 1);
    assert.equal(daysUntilExpiration('2026-10-06', new Date(2026, 9, 7, 23)), -1);
    assert.equal(daysUntilExpiration('2026-10-07', new Date(2026, 9, 7, 23)), 0);
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test('expiry warnings include past dates and the seventh day, sort without mutating inventory', () => {
  const inventory = [item('later', '2026-10-15'), item('soon', '2026-10-14'), item('no-date'),
    item('expired', '2026-10-06'), item('invalid', '2026-02-30'), item('today', '2026-10-07')];
  const before = inventory.slice();
  assert.deepEqual(getExpiringItems(inventory, new Date(2026, 9, 7)).map((value) => value.id), ['expired', 'today', 'soon']);
  assert.deepEqual(inventory, before);
});

test('invalid dates cannot become warning badges', () => {
  for (const value of ['not-a-date', '', '2026-02-30', '2026-10-07T00:00:00Z', '2026-1-7']) {
    assert.equal(daysUntilExpiration(value), null);
  }
});
