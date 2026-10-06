const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'migrate-account.js'), 'utf8');

function run(records, env) {
  let writes = 0;
  const match = (record, filter) => Object.entries(filter).every(([key, value]) =>
    value === null ? record[key] == null : record[key] === value);
  const collection = {
    countDocuments: filter => records.filter(record => match(record, filter)).length,
    updateMany: (filter, update) => {
      writes++;
      records.filter(record => match(record, filter)).forEach(record => Object.assign(record, update.$set));
    },
  };
  vm.runInNewContext(source, { process: { env }, db: { getCollection: () => collection },
    NumberLong: value => value, printjson: () => {} });
  return writes;
}

test('dry run performs no updates', () => {
  const records = [{ _id: 'legacy' }];
  assert.equal(run(records, { CABINATE_MIGRATION_OWNER_ID: 'user-a' }), 0);
  assert.deepEqual(records, [{ _id: 'legacy' }]);
});
test('migration preserves existing owners and versions and is idempotent', () => {
  const records = [{ _id: 'legacy' }, { _id: 'versioned', version: 7 },
    { _id: 'owned', ownerId: 'user-b', version: 3 }, { _id: 'owned-needs-version', ownerId: 'user-a' }];
  const env = { CABINATE_MIGRATION_OWNER_ID: 'user-a', CABINATE_MIGRATION_APPLY: 'true' };
  run(records, env);
  assert.deepEqual(records, [{ _id: 'legacy', ownerId: 'user-a', version: 0 },
    { _id: 'versioned', ownerId: 'user-a', version: 7 }, { _id: 'owned', ownerId: 'user-b', version: 3 },
    { _id: 'owned-needs-version', ownerId: 'user-a', version: 0 }]);
  const snapshot = structuredClone(records);
  run(records, env);
  assert.deepEqual(records, snapshot);
});
test('an explicit destination account is required', () => {
  assert.throws(() => run([], {}));
  assert.throws(() => run([], { CABINATE_MIGRATION_OWNER_ID: ' ' }));
});
