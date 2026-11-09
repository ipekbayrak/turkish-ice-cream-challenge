import test from 'node:test';
import assert from 'node:assert/strict';
import { GameAnalytics } from '../src/game-analytics.js';

function createHarness({
  hostname = 'dondurma.ipekbayrak.com.tr',
  pathname = '/',
  navigator = {},
  tracker = { Ready: true },
} = {}) {
  const sent = [];
  const timers = new Map();
  let nextTimerId = 1;
  let scheduleCalls = 0;
  let cancelCalls = 0;

  let currentTracker =
    tracker && tracker.Ready
      ? {
          track(name, props) {
            sent.push({ name, props });
          },
        }
      : tracker;

  const analytics = new GameAnalytics({
    getTracker: () => currentTracker,
    location: { hostname, pathname },
    navigator,
    schedule(fn, ms) {
      scheduleCalls += 1;
      const id = nextTimerId++;
      timers.set(id, { fn, ms });
      return id;
    },
    cancel(id) {
      cancelCalls += 1;
      timers.delete(id);
    },
  });

  function runNextTimer() {
    const first = timers.entries().next();
    if (first.done) {
      return false;
    }
    const [id, entry] = first.value;
    timers.delete(id);
    entry.fn();
    return true;
  }

  return {
    analytics,
    sent,
    timers,
    get scheduleCalls() {
      return scheduleCalls;
    },
    get cancelCalls() {
      return cancelCalls;
    },
    setTracker(newTracker) {
      currentTracker = newTracker;
    },
    runNextTimer,
  };
}

test('gates transmission strictly to production hosts and allowed alias paths, silencing localhost', () => {
  const allowedCases = [
    { hostname: 'dondurma.ipekbayrak.com.tr', pathname: '/' },
    { hostname: 'dondurma.ipekbayrak.com.tr', pathname: '/index.html' },
    { hostname: 'ipekbayrak.com.tr', pathname: '/dondurma' },
    { hostname: 'ipekbayrak.com.tr', pathname: '/dondurma/' },
    { hostname: 'ipekbayrak.com.tr', pathname: '/maras' },
    { hostname: 'ipekbayrak.com.tr', pathname: '/maras/game' },
    { hostname: 'ipekbayrak.com.tr', pathname: '/turkish-ice-cream' },
    { hostname: 'ipekbayrak.com.tr', pathname: '/turkish-ice-cream/' },
  ];

  for (const loc of allowedCases) {
    const h = createHarness(loc);
    assert.equal(h.analytics.track('game_started', { stage: 1 }), true);
    assert.equal(h.sent.length, 1);
  }

  const blockedCases = [
    { hostname: 'localhost', pathname: '/' },
    { hostname: '127.0.0.1', pathname: '/dondurma/' },
    { hostname: 'ipekbayrak.com.tr', pathname: '/' },
    { hostname: 'ipekbayrak.com.tr', pathname: '/dondurmaci' },
    { hostname: 'ipekbayrak.com.tr', pathname: '/other' },
    { hostname: 'example.com', pathname: '/dondurma/' },
  ];

  for (const loc of blockedCases) {
    const h = createHarness(loc);
    assert.equal(h.analytics.track('game_started', { stage: 1 }), false);
    assert.equal(h.sent.length, 0);
    assert.equal(h.scheduleCalls, 0);
  }
});

test('respects DNT and Global Privacy Control signals', () => {
  for (const nav of [
    { doNotTrack: '1' },
    { doNotTrack: 'yes' },
    { DNT: '1' },
    { globalPrivacyControl: true },
  ]) {
    const h = createHarness({ navigator: nav });
    assert.equal(h.analytics.track('game_started', { stage: 1 }), false);
    assert.equal(h.sent.length, 0);
  }
});

test('whitelists metadata fields, formats positive stage as string, and drops all PII', () => {
  const h = createHarness();
  const ok = h.analytics.track('round_completed', {
    stage: 7,
    operation: 'grab_cone',
    durationMs: 4200,
    name: 'Mustafa',
    email: 'secret@example.com',
    ip: '192.0.2.1',
    userId: 'usr_123',
    url: 'https://dondurma.ipekbayrak.com.tr/?token=abc',
    query: '?token=abc',
  });

  assert.equal(ok, true);
  assert.equal(h.sent.length, 1);
  assert.deepEqual(h.sent[0], {
    name: 'round_completed',
    props: {
      release: 'web-v43',
      stage: '7',
      operation: 'grab_cone',
      durationMs: 4200,
    },
  });

  // Invalid event name is rejected
  assert.equal(h.analytics.track('invalid event name!', { stage: 1 }), false);
  assert.equal(h.sent.length, 1);

  // Out-of-range durationMs and invalid operation are stripped
  h.analytics.track('custom_event', {
    stage: -3,
    operation: 'invalid spaces!',
    durationMs: 9_999_999,
  });
  assert.deepEqual(h.sent[1], {
    name: 'custom_event',
    props: {
      release: 'web-v43',
    },
  });
});

test('queues events when tracker is unavailable and flushes once when async tracker arrives', () => {
  const h = createHarness({ tracker: null });

  assert.equal(h.analytics.track('game_started', { stage: 1 }), false);
  assert.equal(h.analytics.track('round_started', { stage: 1 }), false);
  assert.equal(h.timers.size, 1);
  assert.equal(h.scheduleCalls, 1);

  // First retry: tracker still missing
  h.runNextTimer();
  assert.equal(h.sent.length, 0);
  assert.equal(h.scheduleCalls, 2);

  // Async tracker arrives before second retry fires
  const received = [];
  h.setTracker({
    track(name, props) {
      received.push({ name, props });
    },
  });

  h.runNextTimer();
  assert.equal(received.length, 2);
  assert.equal(received[0].name, 'game_started');
  assert.equal(received[1].name, 'round_started');
  assert.equal(h.timers.size, 0);

  // Subsequent flush does not re-send already flushed events
  h.analytics.flush();
  assert.equal(received.length, 2);
});

test('catches tracker exceptions, preserves unsent tail without duplicating sent prefix', () => {
  const h = createHarness({ tracker: null });
  h.analytics.track('ev_1', { stage: 1 });
  h.analytics.track('ev_2', { stage: 2 });
  h.analytics.track('ev_3', { stage: 3 });

  const delivered = [];
  let failOnSecond = true;
  h.setTracker({
    track(name, props) {
      if (name === 'ev_2' && failOnSecond) {
        throw new Error('simulated tracker failure');
      }
      delivered.push({ name, props });
    },
  });

  // Flush sends ev_1, throws on ev_2, and does not throw out to game
  assert.doesNotThrow(() => h.analytics.flush());
  assert.deepEqual(
    delivered.map((d) => d.name),
    ['ev_1']
  );

  // Next flush retries from ev_2 without duplicating ev_1
  failOnSecond = false;
  assert.equal(h.analytics.flush(), true);
  assert.deepEqual(
    delivered.map((d) => d.name),
    ['ev_1', 'ev_2', 'ev_3']
  );
});

test('bounds queue to latest 32 events, limits retries to 30, and cancels on dispose', () => {
  const h = createHarness({ tracker: null });

  for (let i = 1; i <= 40; i += 1) {
    h.analytics.track(`event_${i}`, { stage: i });
  }
  assert.equal(h.analytics.queue.length, 32);
  assert.equal(h.analytics.queue[0].name, 'event_9');
  assert.equal(h.analytics.queue[31].name, 'event_40');

  while (h.runNextTimer()) {
    // Drain all scheduled retries while tracker stays missing
  }
  assert.equal(h.scheduleCalls, 30);
  assert.equal(h.timers.size, 0);

  // Dispose cancels pending timers and clears queue
  const h2 = createHarness({ tracker: null });
  h2.analytics.track('event_a', { stage: 1 });
  assert.equal(h2.timers.size, 1);
  h2.analytics.dispose();
  assert.equal(h2.cancelCalls, 1);
  assert.equal(h2.analytics.queue.length, 0);
});

test('enforces begin/finish idempotency and 15-second visible active gameplay engagement', () => {
  const h = createHarness();

  // finish before startRound is a no-op
  assert.equal(h.analytics.finish(1, { won: false, outcome: 'timeout' }), false);
  assert.equal(h.sent.length, 0);

  // begin emits game_started only once across lifecycle
  assert.equal(h.analytics.begin(1), true);
  assert.equal(h.analytics.begin(1), false);
  assert.equal(h.analytics.begin(2), false);
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].name, 'game_started');

  // Round 1
  assert.equal(h.analytics.startRound(1), true);
  assert.equal(h.sent[1].name, 'round_started');

  // Hidden or paused ticks do not count toward activeMs or 15s engagement
  h.analytics.tick(10, { visible: false, playing: true });
  h.analytics.tick(10, { visible: true, playing: false });
  h.analytics.tick(10, { visible: true, playing: true }); // 10s active
  assert.equal(
    h.sent.some((e) => e.name === 'game_engaged'),
    false
  );

  // Finish Round 1 as failed; second finish call is a no-op
  assert.equal(h.analytics.finish(1, { won: false, outcome: 'dropped' }), true);
  assert.equal(h.analytics.finish(1, { won: false, outcome: 'dropped' }), false);
  assert.equal(h.sent[2].name, 'round_failed');
  assert.deepEqual(h.sent[2].props, {
    release: 'web-v43',
    stage: '1',
    operation: 'dropped',
    durationMs: 10000,
  });

  // Ticks when round is not active are ignored
  h.analytics.tick(10, { visible: true, playing: true });
  assert.equal(
    h.sent.some((e) => e.name === 'game_engaged'),
    false
  );

  // Retry Round 2: begin still once, 5s more visible gameplay crosses 15s threshold once
  assert.equal(h.analytics.begin(1), false);
  assert.equal(h.analytics.startRound(2), true);
  h.analytics.tick(5, { visible: true, playing: true }); // 10s + 5s = 15s total
  h.analytics.tick(5, { visible: true, playing: true }); // 20s total, engaged should not re-emit

  const engagedEvents = h.sent.filter((e) => e.name === 'game_engaged');
  assert.equal(engagedEvents.length, 1);
  assert.equal(engagedEvents[0].props.stage, '2');
  assert.equal(engagedEvents[0].props.durationMs, 15000);

  assert.equal(h.analytics.finish(2, { won: true, outcome: 'caught' }), true);
  const completed = h.sent.at(-1);
  assert.equal(completed.name, 'round_completed');
  assert.deepEqual(completed.props, {
    release: 'web-v43',
    stage: '2',
    operation: 'caught',
    durationMs: 10000,
  });
});

test('duplicate round start callbacks do not inflate play counts',()=>{
 const h=createHarness();h.analytics.begin(1);h.analytics.startRound(1);h.analytics.tick(2);h.analytics.startRound(1);
 assert.equal(h.sent.filter(event=>event.name==='round_started').length,1);
 h.analytics.finish(1,{won:false});assert.equal(h.sent.at(-1).props.durationMs,2000);
 h.analytics.startRound(1);assert.equal(h.sent.filter(event=>event.name==='round_started').length,2);
});
