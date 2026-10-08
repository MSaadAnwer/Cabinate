import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSnapshot } from '../src/utils/loadSnapshot.ts';

test('a read begun before a confirmed mutation is refreshed before publishing', async () => {
  let revision = 0;
  let reads = 0;
  let published: string[] | undefined;
  await loadSnapshot(async () => {
    reads++;
    if (reads === 1) {
      await Promise.resolve();
      revision++; // The create/update/delete succeeded during this request.
      return ['old'];
    }
    return ['saved'];
  }, () => revision, new AbortController().signal, (result) => { published = result; });
  assert.deepEqual(published, ['saved']);
  assert.equal(reads, 2);
});

test('a cancelled load never publishes a late response or retries', async () => {
  const controller = new AbortController();
  let reads = 0;
  await loadSnapshot(async () => {
    reads++;
    controller.abort();
    return ['stale'];
  }, () => 0, controller.signal, () => { assert.fail('must not publish'); });
  assert.equal(reads, 1);
});

test('a pre-cancelled load does not request data', async () => {
  const controller = new AbortController();
  controller.abort();
  await loadSnapshot(async () => { assert.fail('must not read'); }, () => 0, controller.signal, () => { assert.fail('must not publish'); });
});
