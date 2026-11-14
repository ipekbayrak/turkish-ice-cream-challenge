import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { GameWorld } from '../src/world.js';

test('Service Worker precaches icons + privacy policy, ignores cross-origin requests, and returns Response.error() for failed subresources', async () => {
  const swSource = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.match(swSource, /maras-dondurma-v(4[4-9]|[5-9]\d)/, 'CACHE_NAME should be v44+');
  assert.ok(swSource.includes('./icon-192.png'), 'PRECACHE_URLS should include ./icon-192.png');
  assert.ok(swSource.includes('./icon-512.png'), 'PRECACHE_URLS should include ./icon-512.png');
  assert.ok(swSource.includes('./privacy-policy.html'), 'PRECACHE_URLS should include ./privacy-policy.html');

  const listeners = {};
  const cacheStore = new Map([['./index.html', { status: 200, body: '<html></html>' }]]);
  const sandbox = {
    self: {
      location: { origin: 'https://maras.example' },
      addEventListener(type, fn) {
        listeners[type] = fn;
      },
      skipWaiting() {},
      clients: { claim() {} },
    },
    caches: {
      open: async () => ({
        addAll: async () => {},
        put: async () => {},
      }),
      keys: async () => [],
      delete: async () => {},
      match: async (req) => cacheStore.get(typeof req === 'string' ? req : req.url) || undefined,
    },
    fetch: async () => {
      throw new Error('offline');
    },
    Response: {
      error: () => ({ status: 0, type: 'error' }),
    },
  };
  vm.runInNewContext(swSource, sandbox);

  // 1. Cross-origin request should be ignored (respondWith not called)
  let crossOriginIntercepted = false;
  listeners.fetch({
    request: { method: 'GET', mode: 'cors', url: 'https://other.example/script.js' },
    respondWith() {
      crossOriginIntercepted = true;
    },
  });
  assert.equal(crossOriginIntercepted, false, 'cross-origin GET should not be intercepted by SW');

  // 2. Same-origin non-navigation subresource failure when offline should return Response.error(), NOT index.html
  let subresourcePromise = null;
  listeners.fetch({
    request: { method: 'GET', mode: 'cors', url: 'https://maras.example/assets/chunk.js' },
    respondWith(p) {
      subresourcePromise = p;
    },
  });
  assert.ok(subresourcePromise, 'same-origin subresource should be handled');
  const subresourceResp = await subresourcePromise;
  assert.equal(subresourceResp.type, 'error', 'failed non-navigation subresource should return Response.error() instead of HTML');
});

test('GameWorld handles webglcontextlost and webglcontextrestored cleanly', () => {
  const w = Object.create(GameWorld.prototype);
  const events = {};
  w.canvas = {
    addEventListener(type, fn) {
      events[type] = fn;
    },
  };
  let renderCalls = 0;
  let resetStateCalls = 0;
  let resizeCalls = 0;
  w.renderer = {
    render() { renderCalls++; },
    resetState() { resetStateCalls++; },
  };
  w.scene = {};
  w.camera = {};
  w.onResize = () => { resizeCalls++; };

  assert.equal(typeof w.attachContextLifecycle, 'function', 'GameWorld should define attachContextLifecycle');
  w.attachContextLifecycle();

  let prevented = false;
  events.webglcontextlost({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true, 'webglcontextlost should call event.preventDefault()');
  assert.equal(w.contextLost, true);

  w.render();
  assert.equal(renderCalls, 0, 'render() should be skipped while WebGL context is lost');

  events.webglcontextrestored({});
  assert.equal(w.contextLost, false);
  assert.equal(resetStateCalls, 1, 'webglcontextrestored should reset renderer state');
  assert.equal(resizeCalls, 1, 'webglcontextrestored should trigger onResize()');

  w.render();
  assert.equal(renderCalls, 1, 'render() should resume after context restoration');
});

test('main.js visibilitychange handler suspends audio on hidden and resumes on visible', () => {
  const mainSource = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(
    mainSource.includes("document.visibilityState === 'hidden'") &&
      mainSource.includes('sound.ctx.suspend'),
    'main.js should suspend audio context when document becomes hidden'
  );
});

test('Play Store listings and RELEASE_NOTES.md reflect 4 Masters, 6 Venues / 30 Stages, and 4 Flavors', () => {
  const playScript = fs.readFileSync(new URL('../scripts/generate-play-assets.mjs', import.meta.url), 'utf8');
  const releaseNotes = fs.readFileSync(new URL('../RELEASE_NOTES.md', import.meta.url), 'utf8');

  assert.ok(playScript.includes('Başusta Haydar'), 'generate-play-assets.mjs should include 4th master Başusta Haydar');
  assert.ok(playScript.includes('Grandmaster Haydar'), 'generate-play-assets.mjs should include Grandmaster Haydar in English');
  assert.ok(releaseNotes.includes('4 farklı Maraş ustası') || releaseNotes.includes('4 Maraş ustası'), 'RELEASE_NOTES.md TR should mention 4 masters');
  assert.ok(releaseNotes.includes('4 masters'), 'RELEASE_NOTES.md EN should mention 4 masters');
});
