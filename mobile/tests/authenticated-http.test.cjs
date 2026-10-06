const { test } = require('node:test');
const assert = require('node:assert/strict');
const { authenticatedJson } = require('../../shared/authenticated-http.ts');
const { configureCredentials } = require('../../shared/credentials.ts');
const { withDeadline } = require('../../shared/deadline.ts');

test('authenticated mutations retain version headers and use the current access token', async t => {
  const reset = configureCredentials(async () => 'access-token', () => {});
  t.after(reset);
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.headers.get('Authorization'), 'Bearer access-token');
    assert.equal(options.headers.get('If-Match'), '"3"');
    assert.equal(options.method, 'DELETE');
    return new Response(null, { status: 204 });
  });
  await authenticatedJson('https://api.example/pantry/item', { method: 'DELETE', headers: { 'If-Match': '"3"' } });
});
test('an expired token invalidates its session and never retries a mutation', async t => {
  const rejected = [];
  const reset = configureCredentials(async () => 'expired-token', token => rejected.push(token));
  t.after(reset);
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests++;
    return new Response(JSON.stringify({ message: 'Sign in again' }), { status: 401 });
  });
  await assert.rejects(authenticatedJson('https://api.example/pantry', { method: 'POST' }), error => error.status === 401);
  assert.deepEqual(rejected, ['expired-token']);
  assert.equal(requests, 1);
});
test('a failed credential refresh cannot send an unauthenticated mutation', async t => {
  const reset = configureCredentials(async () => { throw new Error('Session expired'); }, () => {});
  t.after(reset);
  t.mock.method(globalThis, 'fetch', () => assert.fail('fetch should not be called'));
  await assert.rejects(authenticatedJson('https://api.example/pantry', { method: 'POST' }), /Session expired/);
});
test('provider deadlines stop stalled refreshes and preserve successful results', async () => {
  assert.equal(await withDeadline(Promise.resolve('token'), 10), 'token');
  await assert.rejects(withDeadline(new Promise(() => {}), 10), /too long/);
});
