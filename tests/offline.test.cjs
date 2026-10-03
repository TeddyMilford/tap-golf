const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../sw.js'), 'utf8');

function worker(scope = 'https://example.github.io/golf_score/') {
  const handlers = new Map();
  const entries = new Map();
  const deleted = [];
  const precached = [];
  const cache = {
    async addAll(urls) { precached.push(...urls); },
    async put(url, response) { entries.set(url, response); },
    async match(url) { return entries.get(url); },
  };
  let online = true;
  vm.runInNewContext(source, {
    self: { registration: { scope }, addEventListener: (type, fn) => handlers.set(type, fn), skipWaiting: async () => {}, clients: { claim: async () => {} } },
    caches: {
      open: async () => cache,
      keys: async () => [`tap-golf:${scope}:v5`, `tap-golf:${scope}:v6`, 'unrelated-cache', 'tap-golf:https://example.github.io/other/:v0'],
      delete: async key => { deleted.push(key); },
    },
    fetch: async () => { if (!online) throw new Error('Offline'); return new Response('app content'); },
    URL, Response,
  });
  return {
    entries, deleted, precached,
    setOffline: () => { online = false; },
    async lifecycle(type) {
      let promise;
      handlers.get(type)({ waitUntil: value => { promise = value; } });
      await promise;
    },
    async request(url, method = 'GET') {
      let promise;
      handlers.get('fetch')({ request: new Request(url, { method }), respondWith: value => { promise = value; } });
      return promise;
    },
  };
}

test('offline installation resolves all public assets under the GitHub Pages project', async () => {
  const w = worker();
  await w.lifecycle('install');
  assert.equal(w.precached.length, 7);
  assert.ok(w.precached.every(url => url.startsWith('https://example.github.io/golf_score/')));
  assert.ok(w.precached.includes('https://example.github.io/golf_score/index.html'));
});

test('offline reload serves cached app content, including query-string visits', async () => {
  const w = worker();
  const url = 'https://example.github.io/golf_score/';
  assert.equal(await (await w.request(url)).text(), 'app content');
  w.setOffline();
  assert.equal(await (await w.request(url + '?from=home')).text(), 'app content');
  const missing = await w.request('https://example.github.io/golf_score/app.js');
  assert.equal(missing.type, 'error');
});

test('worker does not intercept other projects, external requests, or score submissions', async () => {
  const w = worker();
  assert.equal(await w.request('https://example.github.io/other/'), undefined);
  assert.equal(await w.request('https://external.example/'), undefined);
  assert.equal(await w.request('https://example.github.io/golf_score/private.json'), undefined);
  assert.equal(await w.request('https://example.github.io/golf_score/', 'POST'), undefined);
});

test('worker updates remove only old caches belonging to this project', async () => {
  const w = worker();
  await w.lifecycle('activate');
  assert.deepEqual(w.deleted, ['tap-golf:https://example.github.io/golf_score/:v5']);
});
