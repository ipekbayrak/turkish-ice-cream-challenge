import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CounterTroll } from '../src/counter-troll.js';
import { ElasticSnatchBack, ScreenSmudge } from '../src/screen-smudge.js';
import { VoiceSampleBank, extractRmsSyllables } from '../src/voice-samples.js';
import { SoundEngine } from '../src/audio.js';
import {
  HighlightRingBuffer,
  exportHighlightClip,
  renderReplayFrame,
} from '../src/highlight-recorder.js';

test('Phase 17.1: CounterTroll detects fez tap-tilt (+300), early bell steal (+200), and empty-cone flick (+250) once per round', () => {
  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 20);
  camera.position.set(0, 1.35, 1.3);
  camera.lookAt(0, 1.35, 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const vendorHead = new THREE.Group();
  vendorHead.position.set(0, 1.5, 0);
  vendorHead.updateMatrixWorld(true);

  const fezGroup = new THREE.Group();
  const apprenticeCapGroup = new THREE.Group();
  let lastMood = 'smile';
  let struckBell = -1;

  const worldStub = {
    camera,
    vendorHead,
    fezGroup,
    apprenticeCapGroup,
    conePivot: new THREE.Group(),
    heldSocket: new THREE.Group(),
    playerConeGripRequested: false,
    bells: [{}, {}, {}, { index: 3 }],
    getBellBodyCenter(_idx, out = new THREE.Vector3()) {
      return out.set(0.25, 1.65, 0);
    },
    strikeBell(idx) {
      struckBell = idx;
    },
    setVendorMood(m) {
      lastMood = m;
    },
    ringBells() {},
  };

  const popups = [];
  const speeches = [];
  const directorStub = {
    active: true,
    roundEnded: false,
    isAfkShowActive: false,
    heldItem: null,
    isGraspingPaddleCone: false,
    currentStage: 4,
    currentMechanic: 'BELL_RHYTHM_FEINT',
    score: 100,
    coneWorldPos: new THREE.Vector3(0, 1.2, 0.2),
    _spawnScorePopup(pts, _pos, icon) {
      popups.push({ pts, icon });
    },
    _triggerVendorSpeech(t) {
      speeches.push(t);
    },
  };

  const saveStub = { data: { trollCount: 0 }, save() {} };
  const trollEvents = [];
  const troll = new CounterTroll({
    world: worldStub,
    director: directorStub,
    sound: { playBell() {}, playBellNote() {}, playCrowdReaction() {} },
    save: saveStub,
    onTroll(ev) {
      trollEvents.push(ev);
    },
  });

  // Project hat center to get exact screen coordinates
  const hatProj = new THREE.Vector3(0, 0.22, 0.04)
    .applyMatrix4(vendorHead.matrixWorld)
    .project(camera);
  const hatX = (hatProj.x + 1) * 200;
  const hatY = (1 - hatProj.y) * 300;

  troll.update(0.016, {
    active: true,
    pointerDown: true,
    x: hatX,
    y: hatY,
    epoch: 1,
    width: 400,
    height: 600,
  });

  assert.equal(directorStub.score, 400, '+300 awarded for fez tap');
  assert.equal(lastMood, 'shock');
  assert.equal(speeches.includes('trolled'), true);
  assert.equal(saveStub.data.trollCount, 1);
  assert.equal(trollEvents[0].kind, 'hat_tilt');
  assert.notEqual(fezGroup.rotation.z, 0);

  // Second tap in same round must not re-award hat_tilt
  troll.update(0.016, {
    active: true,
    pointerDown: true,
    x: hatX,
    y: hatY,
    epoch: 2,
    width: 400,
    height: 600,
  });
  assert.equal(directorStub.score, 400);

  // Swipe across bell #3 during BELL_RHYTHM_FEINT -> +200 bell_steal
  const bellProj = new THREE.Vector3(0.25, 1.65, 0).project(camera);
  const bx = (bellProj.x + 1) * 200;
  const by = (1 - bellProj.y) * 300;
  troll.update(0.016, {
    active: true,
    pointerDown: true,
    x: bx - 30,
    y: by,
    epoch: 3,
    width: 400,
    height: 600,
  });
  troll.update(0.016, {
    active: true,
    pointerDown: true,
    x: bx + 30,
    y: by,
    epoch: 3,
    width: 400,
    height: 600,
  });
  assert.equal(struckBell, 3);
  assert.equal(directorStub.score, 600);

  // Counter-flick empty cone upward within 0.55s -> +250 cone_flick_counter
  directorStub.heldItem = 'EMPTY_CONE';
  troll.update(0.05, {
    active: true,
    pointerDown: true,
    x: 200,
    y: 200,
    epoch: 4,
    width: 400,
    height: 600,
    gestureState: { vy: 2.8, normY: 0.25 },
  });
  assert.equal(directorStub.score, 850);
  assert.equal(trollEvents.length, 3);

  troll.resetRound();
  assert.equal(fezGroup.rotation.z, 0);
});

test('Phase 17.2: ScreenSmudge splatters on close-up teases, renders cream + pistachio crumbs, and wipes clean by finger drag', () => {
  let splats = 0;
  let wipedClean = 0;
  const smudge = new ScreenSmudge({
    sound: { playSmudgeSplat() { splats++; } },
    onWipedClean() { wipedClean++; },
  });

  assert.equal(smudge.shouldTriggerForMistake('CROWN_TAP_KISS_TEASE'), true);
  assert.equal(smudge.shouldTriggerForMistake('SHAFT_SPIN_360'), false);

  assert.equal(smudge.trigger({ colorCss: '#fde68a' }), true);
  assert.equal(splats, 1);
  assert.equal(smudge.isActive, true);
  assert.equal(smudge.needsWipeCue, true);
  assert.equal(smudge.trigger(), false, 'cooldown blocks immediate re-splat');

  let ellipsesDrawn = 0;
  const ctxStub = {
    save() {},
    restore() {},
    beginPath() {},
    ellipse() { ellipsesDrawn++; },
    arc() {},
    fill() {},
  };
  smudge.draw(ctxStub, 400, 800);
  assert.ok(ellipsesDrawn >= 10, 'renders shadow, cream blobs, and glossy highlight');

  // Wipe back and forth across smudge center (x=200, y=344)
  for (let i = 0; i < 6; i++) {
    smudge.wipe(170, 344, 230, 344, 400, 800);
  }
  assert.equal(smudge.isActive, false);
  assert.equal(wipedClean, 1);

  const elastic = new ElasticSnatchBack();
  elastic.update(0.25, { stretching: true, handSpeed: 0.1 });
  const snap = elastic.update(0.05, { stretching: true, handSpeed: 2.8 });
  assert.equal(snap.slicedFree, true);
});

test('Phase 17.3: VoiceSampleBank extracts lip-sync RMS syllables and SoundEngine plays human sample when registered or falls back cleanly', () => {
  const sampleData = new Float32Array(4410); // 0.2s @ 22050 Hz
  for (let i = 0; i < sampleData.length; i++) {
    sampleData[i] = Math.sin(i * 0.15) * 0.45;
  }
  const fakeBuffer = {
    sampleRate: 22050,
    duration: 0.2,
    getChannelData: () => sampleData,
  };

  const syllables = extractRmsSyllables(fakeBuffer, 0.05);
  assert.ok(syllables.length >= 3);
  assert.ok(syllables.every((s) => s.intensity > 0));

  const bank = new VoiceSampleBank();
  assert.equal(bank.hasSample('hoppa'), false);
  bank.registerSample('hoppa', fakeBuffer);
  assert.equal(bank.hasSample('hoppa'), true);
  assert.equal(bank.pickSample('hoppa', 0).buffer, fakeBuffer);

  // Verify SoundEngine plays registered sample buffer AND still synthesizes fallback cues
  const prevWin = globalThis.window;
  class Param {
    value = 1;
    setValueAtTime(v) { this.value = v; }
    linearRampToValueAtTime(v) { this.value = v; }
    exponentialRampToValueAtTime(v) { this.value = v; }
    cancelScheduledValues() {}
  }
  class FakeNode {
    constructor(ctx, kind) {
      this.kind = kind;
      this.gain = new Param();
      this.pan = new Param();
      ctx.nodes.push(this);
    }
    connect() {}
    disconnect() {}
    addEventListener() {}
    start() { this.started = true; }
    stop() {}
  }
  class FakeAudioCtx {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 22050;
      this.state = 'running';
      this.nodes = [];
      this.destination = {};
    }
    createGain() { return new FakeNode(this, 'gain'); }
    createBufferSource() { return new FakeNode(this, 'buffer'); }
    createStereoPanner() { return new FakeNode(this, 'panner'); }
    createBuffer(_ch, len) {
      const arr = new Float32Array(len);
      return { getChannelData: () => arr };
    }
    resume() { return Promise.resolve(); }
  }

  globalThis.window = { AudioContext: FakeAudioCtx };
  try {
    const s = new SoundEngine();
    s.init();
    s.voiceBank.registerSample('hoppa', fakeBuffer);
    assert.equal(s.speakVendor('hoppa', 1, 0), true);
    const playedBuffers = s.ctx.nodes.filter((n) => n.kind === 'buffer' && n.buffer === fakeBuffer);
    assert.equal(playedBuffers.length, 1, 'real sample buffer scheduled directly');
    s.ctx.currentTime = 0.08;
    assert.ok(s.getVoiceMouthOpen() > 0, 'vendor jaw lip-sync animates from real sample');

    // Fallback cue ('laugh' has no registered real sample) uses procedural vocal
    s.ctx.currentTime = 5.0;
    assert.equal(s.speakVendor('laugh', 1, 0), true);
  } finally {
    if (prevWin === undefined) delete globalThis.window;
    else globalThis.window = prevWin;
  }
});

test('Phase 17.4: HighlightRingBuffer bounds memory, selects peak excitement 6s window, and exports poster/clip cleanly', async () => {
  const ring = new HighlightRingBuffer();
  for (let i = 0; i < 200; i++) {
    ring.recordTick(0.07, {
      coneX: 0.45 + Math.sin(i * 0.2) * 0.1,
      coneY: 0.45,
      handX: 0.5,
      handY: 0.68,
      scoops: 3,
      score: i * 10,
      bamboozled: i > 60 ? 1 : 0,
      badgeText: 'UZAT & TUT!',
    });
    if (i === 55) {
      ring.markMoment('troll', 5.0, 'hat_tilt');
    }
  }

  assert.ok(ring.samples.length <= 165, 'ring buffer strictly bounded for low-RAM devices');
  const win = ring.selectBestWindow(6.0);
  assert.ok(win.length >= 40);
  const trollTime = ring.moments[0].t;
  assert.ok(
    win[0].t <= trollTime && win[win.length - 1].t >= trollTime,
    'selected 6s window centers around the high-weight troll highlight'
  );

  const texts = [];
  const res = await exportHighlightClip({
    ringBuffer: ring,
    meta: {
      gameTitle: 'Maraş Dondurmacısı 3D',
      emojiStrip: '✅❌👑🍦',
    },
    canvasFactory(w, h) {
      return {
        width: w,
        height: h,
        getContext() {
          return {
            createLinearGradient: () => ({ addColorStop() {} }),
            fillRect() {},
            strokeRect() {},
            beginPath() {},
            arc() {},
            moveTo() {},
            lineTo() {},
            closePath() {},
            fill() {},
            stroke() {},
            ellipse() {},
            save() {},
            restore() {},
            fillText(t) { texts.push(String(t)); },
          };
        },
        toBlob(cb) {
          cb(new Blob(['fake-png'], { type: 'image/png' }));
        },
      };
    },
  });

  assert.equal(res.ok, true);
  assert.equal(res.kind, 'poster-png');
  assert.ok(texts.some((t) => t.includes('Maraş Dondurmacısı 3D')));
  assert.ok(texts.some((t) => t.includes('✅❌👑🍦')));
  assert.ok(texts.some((t) => t.includes('dondurma.ipekbayrak.com.tr')));
});
