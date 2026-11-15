import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Scene, Vector3 } from 'three';
import { QualityGovernor, QUALITY_SPECS, normalizeQualityMode } from '../src/quality-tier.js';
import { GameWorld } from '../src/world.js';
import { GameAnalytics } from '../src/game-analytics.js';
import { resizeRenderer } from '../src/render-size.js';

test('14.1 QualityGovernor starts high in auto mode, ignores pause spikes, and steps down once on sustained >24ms frames', () => {
  const changes = [];
  const gov = new QualityGovernor({
    mode: 'auto',
    onChange: (spec) => changes.push(spec),
  });

  assert.equal(gov.activeTier, 'high');
  assert.deepEqual(gov.getSpec(), QUALITY_SPECS.high);

  // Background/tab-switch gaps (>= 0.25s) and inactive frames must be ignored
  assert.equal(gov.sampleFrame(0.85, { visible: true, active: true }), false);
  assert.equal(gov.sampleFrame(0.04, { visible: false, active: true }), false);
  assert.equal(gov.sampleFrame(0.04, { visible: true, active: false }), false);
  assert.equal(gov.activeTier, 'high');

  // Smooth 60 FPS (16.6ms) never downgrades
  for (let i = 0; i < 120; i++) {
    assert.equal(gov.sampleFrame(1 / 60, { visible: true, active: true }), false);
  }
  assert.equal(gov.activeTier, 'high');
  assert.equal(changes.length, 0);

  // Sustained slow frames (~33ms = 30 FPS) trigger single step-down to 'low'
  let steppedDown = false;
  for (let i = 0; i < 90; i++) {
    if (gov.sampleFrame(0.033, { visible: true, active: true })) {
      steppedDown = true;
    }
  }
  assert.equal(steppedDown, true);
  assert.equal(gov.activeTier, 'low');
  assert.deepEqual(gov.getSpec(), QUALITY_SPECS.low);
  assert.equal(changes.length, 1);

  // Further slow frames do not emit duplicate changes
  for (let i = 0; i < 90; i++) {
    assert.equal(gov.sampleFrame(0.035, { visible: true, active: true }), false);
  }
  assert.equal(changes.length, 1);

  // Manual mode switches update cleanly
  gov.setMode('high');
  assert.equal(gov.activeTier, 'high');
  assert.equal(changes.length, 2);
  assert.equal(normalizeQualityMode('invalid'), 'auto');
});

test('14.2 GameWorld.setQualitySpec adjusts maxDpr, shadowMap, and burst particle scaling while preserving default DPR=2', () => {
  const prevWindow = globalThis.window;
  try {
    globalThis.window = { innerWidth: 390, innerHeight: 844, devicePixelRatio: 2.75 };
    const bufferCalls = [];
    const w = Object.create(GameWorld.prototype);
    w.scene = new Scene();
    w.particles = [];
    w.camera = new PerspectiveCamera(55, 390 / 844, 0.05, 40);
    w.baseCamPos = new Vector3();
    w.baseCamTarget = new Vector3();
    w.renderer = {
      domElement: { style: {} },
      shadowMap: { enabled: true, needsUpdate: false },
      setDrawingBufferSize(...args) {
        bufferCalls.push(args);
      },
    };
    w._renderSize = resizeRenderer(w.renderer, 390, 844, 2);

    // Default behavior caps DPR at 2
    w.onResize();
    assert.deepEqual(bufferCalls.at(-1), [390, 844, 2]);

    // Switching to 'low' spec drops DPR to 1.25, disables shadows, and halves burst particles
    w.setQualitySpec(QUALITY_SPECS.low);
    assert.equal(w.renderer.shadowMap.enabled, false);
    assert.equal(w.renderer.shadowMap.needsUpdate, true);
    assert.deepEqual(bufferCalls.at(-1), [390, 844, 1.25]);

    w.spawnBurst(new Vector3(0, 1, 0), 0xffcc00, 16);
    assert.equal(w.particles.length, 8);
  } finally {
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
  }
});

test('14.3 GameAnalytics records step-level web funnel events while keeping Capacitor Android localhost strictly silent', () => {
  const webEvents = [];
  const webAnalytics = new GameAnalytics({
    getTracker: () => ({ track: (name, props) => webEvents.push({ name, props }) }),
    location: { hostname: 'dondurma.ipekbayrak.com.tr', pathname: '/' },
    navigator: {},
  });

  webAnalytics.begin(1);
  webAnalytics.recordConeTaken(1);
  webAnalytics.recordOrderConfirmed(1, { scoops: 2, mode: 'standard' });
  webAnalytics.startRound(1);
  webAnalytics.tick(4.5, { visible: true, playing: true });
  webAnalytics.recordAbandoned(1, {
    trick: 'DOUBLE_CONE_SLIDE',
    step: 2,
    bamboozled: 1,
    mode: 'standard',
  });
  webAnalytics.recordConeBitten(1, { bamboozled: 1, mode: 'daily' });
  webAnalytics.recordShare({ kind: 'challenge_url', stage: 1, mode: 'challenge' });

  assert.equal(webEvents.length, 7);
  assert.deepEqual(webEvents[1], {
    name: 'cone_taken',
    props: { release: 'web-v43', stage: '1' },
  });
  assert.deepEqual(webEvents[2], {
    name: 'order_confirmed',
    props: { release: 'web-v43', stage: '1', scoops: 2, mode: 'standard' },
  });
  assert.deepEqual(webEvents[4], {
    name: 'round_abandoned',
    props: {
      release: 'web-v43',
      stage: '1',
      durationMs: 4500,
      trick: 'DOUBLE_CONE_SLIDE',
      step: 2,
      bamboozled: 1,
      mode: 'standard',
    },
  });
  assert.deepEqual(webEvents[6], {
    name: 'share_triggered',
    props: {
      release: 'web-v43',
      stage: '1',
      operation: 'challenge_url',
      mode: 'challenge',
    },
  });

  // Capacitor Android WebView runs on localhost / https://localhost -> must emit 0 network events
  const androidEvents = [];
  const androidAnalytics = new GameAnalytics({
    getTracker: () => ({ track: (name, props) => androidEvents.push({ name, props }) }),
    location: { hostname: 'localhost', pathname: '/' },
    navigator: {},
  });
  androidAnalytics.begin(1);
  androidAnalytics.recordConeTaken(1);
  androidAnalytics.startRound(1);
  androidAnalytics.recordAbandoned(1, { trick: 'SHAFT_SPIN_360', step: 1 });
  assert.equal(androidEvents.length, 0);
});
