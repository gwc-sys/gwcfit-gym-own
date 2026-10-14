import assert from 'node:assert/strict';
import test from 'node:test';
import { request } from '../src/api.js';
import { filterGyms, hasCoordinates } from '../src/directoryUtils.js';

test('API reads JSON and attaches a request ID', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/v1/platform-plans/public');
    assert.ok(options.headers['X-Request-ID']);
    return new Response(JSON.stringify([{ id: 'plan' }]), { status: 200 });
  });
  assert.deepEqual(await request('/platform-plans/public'), [{ id: 'plan' }]);
});

test('validation failures retain the useful field message', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    detail: [{ loc: ['body', 'email'], msg: 'Enter a valid email' }],
  }), { status: 422 }));
  await assert.rejects(request('/gym-inquiries'), (error) => error.status === 422 && error.message === 'email: Enter a valid email');
});

test('non-JSON server errors are safe and preserve HTTP status', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>proxy error</html>', { status: 502 }));
  await assert.rejects(request('/developer/gyms'), (error) => error.status === 502 && !error.message.includes('<html>'));
});

test('a successful HTML fallback is rejected instead of becoming empty application data', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>app</html>', { status: 200 }));
  await assert.rejects(request('/developer/gyms'), /unexpected response/);
});

test('network errors give a useful retry message', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(request('/developer/gyms'), /Check your connection/);
});

test('a hung request times out instead of leaving save controls busy forever', async (t) => {
  t.mock.method(globalThis, 'setTimeout', (callback) => { queueMicrotask(callback); return 1; });
  t.mock.method(globalThis, 'clearTimeout', () => {});
  t.mock.method(globalThis, 'fetch', (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  await assert.rejects(request('/developer/gyms'), (error) => error.code === 'REQUEST_TIMEOUT');
});

test('caller cancellation remains distinguishable from a timeout', async (t) => {
  const controller = new AbortController();
  controller.abort();
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    assert.equal(signal.aborted, true);
    throw new DOMException('Aborted', 'AbortError');
  });
  await assert.rejects(request('/developer/gyms', { signal: controller.signal }), (error) => error.name === 'AbortError');
});

test('session expiry identifies the failed session, and wrong login credentials do not expire it', async (t) => {
  const events = [];
  const previousWindow = globalThis.window;
  globalThis.window = { dispatchEvent: (event) => events.push(event) };
  t.after(() => { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; });
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ detail: 'Expired' }), { status: 401 }));
  await assert.rejects(request('/developer/gyms', { headers: { Authorization: 'Bearer old-test-session' } }));
  await assert.rejects(request('/auth/login', { method: 'POST' }));
  assert.equal(events.length, 1);
  assert.equal(events[0].detail.authorization, 'Bearer old-test-session');
});

test('map coordinates accept the equator and reject incomplete, invalid or out-of-range values', () => {
  assert.equal(hasCoordinates({ latitude: 0, longitude: 0 }), true);
  for (const gym of [{ latitude: null, longitude: 0 }, { latitude: '', longitude: '' },
    { latitude: 'bad', longitude: 73 }, { latitude: 91, longitude: 73 }, { latitude: 18, longitude: -181 }]) {
    assert.equal(hasCoordinates(gym), false);
  }
});

test('distance filters do not hide the directory before location is available', () => {
  const gyms = [{ name: 'Alpha', distance_km: null }, { name: 'Beta', distance_km: 3 }];
  assert.deepEqual(filterGyms(gyms, { distance: '2' }), gyms);
});

test('directory search, verification and distance filters work together', () => {
  const gyms = [
    { name: 'Alpha', verified: true, facilities: ['Weights'], distance_km: 1 },
    { name: 'Beta', verified: false, facilities: ['Weights'], distance_km: 1 },
    { name: 'Gamma', verified: true, facilities: ['Weights'], distance_km: 5 },
  ];
  assert.deepEqual(filterGyms(gyms, { query: ' WEIGHTS ', verifiedOnly: true, distance: '2', location: { latitude: 0, longitude: 0 } }), [gyms[0]]);
});
