import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GameWorld } from '../src/world.js';
import { SoundEngine } from '../src/audio.js';
import { VENUES, getVenueStageEntries } from '../src/venues.js';
import { MARAS_FLOURISH_CATALOG } from '../src/maras-flourish-tricks.js';
import { EXTRA_TRICK_CATALOG } from '../src/trick-extensions.js';
import { clearTrickTransition } from '../src/trick-transition.js';
import { makeEncounterFixture } from './encounter-fixture.js';
import { EncounterDriver } from './encounter-driver.js';

test('P0.1: SCOOP_LIFT_BACK rewards observant wait with Phase 2 (+380, 3 hearts) and never kills a 1-heart player', () => {
  // Path A: Observant player waits out the two-handed pinch bait -> enters Phase 2, catches for +380 with 3/3 hearts
  const smart = makeEncounterFixture({ stage: 5, count: 2, vendor: 1 });
  smart.d.scoopCount = 2;
  smart.w.updateIceCreamScoops(2);
  smart.d.routine = ['SCOOP_LIFT_BACK', 'FINAL_PISTACHIO_CATCH'];
  smart.d.active = true;
  smart.d._enterRoutineStep(0);
  clearTrickTransition(smart.d);

  const idleInput = {
    isPointerDown: false,
    isReaching: false,
    isMoving: false,
    pointerEpoch: 0,
    cancelEpoch: 0,
    normX: 0,
    normY: -1,
    vx: 0,
    vy: 0,
    intentWorldPos: new THREE.Vector3(0.22, 1.04, 0.64),
    handWorldPos: new THREE.Vector3(0.22, 1.04, 0.64),
  };

  let time = 0;
  for (let i = 0; i < 60 * 7 && smart.d.subStep === 0; i++) {
    time += 1 / 60;
    smart.d.update(1 / 60, time, idleInput);
  }
  assert.equal(smart.d.subStep, 2, 'waiting out pinned cone should advance to Phase 2 offer');
  assert.equal(smart.d.hearts, 3, 'observant player must keep all 3 hearts');

  for (let i = 0; i < 90 && (smart.d.servingHandoff || smart.d.trickTransition || smart.d.stageTimer < 0.55); i++) {
    time += 1 / 60;
    smart.d.update(1 / 60, time, idleInput);
  }
  for (let i = 0; i < 45 && smart.d.routineIndex === 0; i++) {
    time += 1 / 60;
    const conePos = smart.d.coneWorldPos.clone();
    smart.d.update(1 / 60, time, {
      ...idleInput,
      isPointerDown: true,
      isReaching: true,
      pointerEpoch: 1,
      normX: conePos.x / 0.54,
      normY: (conePos.y - 1.22) / 0.36,
      intentWorldPos: conePos,
      handWorldPos: conePos,
    });
  }
  assert.equal(smart.d.routineIndex, 1, 'catching Phase 2 offer should complete SCOOP_LIFT_BACK');
  assert.equal(smart.d.score, 380, 'Phase 2 clean catch should award +380 points');
  assert.equal(smart.d.hearts, 3, '3-star heart count preserved');

  // Path B: Fooled player entering with 1 heart obeys pull prompt without unavoidable Game Over
  const lastHeart = makeEncounterFixture({ stage: 5, count: 2, vendor: 1 });
  lastHeart.d.scoopCount = 2;
  lastHeart.w.updateIceCreamScoops(2);
  lastHeart.d.routine = ['SCOOP_LIFT_BACK', 'FINAL_PISTACHIO_CATCH'];
  lastHeart.d.hearts = 1;
  lastHeart.d.active = true;
  lastHeart.d._enterRoutineStep(0);
  clearTrickTransition(lastHeart.d);

  const driver = new EncounterDriver(lastHeart.d, lastHeart.w);
  driver.setTouchMode(true);
  let t2 = 0;
  for (let i = 0; i < 60 * 6 && lastHeart.d.routineIndex === 0 && !lastHeart.d.roundEnded; i++) {
    t2 += 1 / 60;
    const inp = driver.update(1 / 60);
    lastHeart.d.update(1 / 60, t2, inp);
  }
  assert.equal(lastHeart.d.roundEnded, false, '1-heart player must not suffer unavoidable Game Over');
  assert.equal(lastHeart.d.hearts, 1);
  assert.equal(lastHeart.d.routineIndex, 1);
});

test('P0.2: TrickDirector.startPracticeRound launches selected trick directly without resetRound wiping it', () => {
  const f = makeEncounterFixture({ stage: 3, count: 2, vendor: 0 });
  // Simulate prepareCounter() reset followed by startPracticeRound:
  f.d.resetRound(3, false);
  f.d.startPracticeRound('SYNCOPATED_BELL_FAKE', 3);
  assert.equal(f.d.active, true);
  assert.equal(f.d.isPracticeRound, true);
  const firstTrick = f.d.routine.find((id) => id !== 'SCRAPE_FLAVOR_SCOOP');
  assert.equal(firstTrick, 'SYNCOPATED_BELL_FAKE');
});

test('P0.3: getVenueStageEntries exposes all 30 campaign stages and Endless mode for star-upgrade replay', () => {
  const saveData = {
    unlockedStage: 34,
    completedStages: Array.from({ length: 30 }, (_, i) => i + 1),
    stageStars: Array.from({ length: 30 }, (_, i) => (i % 3) + 1),
  };

  for (const venue of VENUES) {
    const entries = getVenueStageEntries(venue, saveData);
    assert.ok(entries.length >= 5, `${venue.id} must expose all 5 stages`);
    for (let i = 0; i < 5; i++) {
      const stageNum = venue.firstStage + i;
      assert.equal(entries[i].stage, stageNum);
      assert.equal(entries[i].unlocked, true);
      assert.equal(entries[i].stars, saveData.stageStars[stageNum - 1]);
    }
  }

  const courtyardEntries = getVenueStageEntries(VENUES[5], saveData);
  const endlessEntry = courtyardEntries.find((e) => e.endless);
  assert.ok(endlessEntry, 'cleared Courtyard must expose Endless stage chip');
  assert.equal(endlessEntry.stage, 34);
});

test('P0.4: world.ringBells handles array indices without NaN rotation and SoundEngine defines all trick SFX', () => {
  const w = Object.create(GameWorld.prototype);
  w.bells = Array.from({ length: 7 }, () => ({
    pivot: new THREE.Group(),
    clapperPivot: new THREE.Group(),
    shimmer: { material: { opacity: 0 }, scale: new THREE.Vector3(1, 1, 1) },
    velZ: 0,
    velX: 0,
    clapperVelZ: 0,
    clapperVelX: 0,
    shimmerTimer: 0,
    strikeCooldown: 0,
    worldPos: new THREE.Vector3(),
  }));
  w.getBellBodyCenter = (_idx, out) => out.set(0, 1.8, -0.1);
  w.spawnBurst = () => {};

  w.ringBells([0, 2]);
  for (const b of w.bells) {
    assert.ok(Number.isFinite(b.velZ), 'bell velZ must never become NaN');
    assert.ok(Number.isFinite(b.velX), 'bell velX must never become NaN');
    assert.ok(Number.isFinite(b.clapperVelZ), 'clapperVelZ must never become NaN');
  }
  assert.ok(Math.abs(w.bells[0].velZ) > 0, 'bell 0 must ring when [0, 2] is passed');
  assert.ok(Math.abs(w.bells[2].velZ) > 0, 'bell 2 must ring when [0, 2] is passed');
  assert.equal(w.bells[1].velZ, 0, 'untargeted bell 1 stays quiet when [0, 2] is passed');

  const sound = new SoundEngine();
  for (const fn of ['playBellStrike', 'playPaperRustle', 'playStretchPull', 'playIcePop', 'playPaddleClank']) {
    assert.equal(typeof sound[fn], 'function', `SoundEngine.${fn} must be defined`);
  }
});

test('P0.5: Stationary hover/held pointer from prior step never triggers false feint heart loss and shows red trap theme', () => {
  const flourishIds = [
    ...MARAS_FLOURISH_CATALOG.map((t) => t.id),
    ...EXTRA_TRICK_CATALOG.filter((t) =>
      ['PENDULUM_BELL_SWING', 'SHOULDER_FAKEOUT_PIVOT', 'ZIGZAG_LIGHTNING_TEASE', 'CROWN_TAP_KISS_TEASE', 'SPIRAL_CROWN_ASCENT'].includes(t.id)
    ).map((t) => t.id),
  ];

  for (const id of flourishIds) {
    const f = makeEncounterFixture({ stage: 5, count: 2, vendor: 1 });
    const { d } = f;
    d.routine = ['SCRAPE_FLAVOR_SCOOP', id, 'FINAL_PISTACHIO_CATCH'];
    d.active = true;
    d._enterRoutineStep(0);
    clearTrickTransition(d);

    const stationaryHover = {
      isPointerDown: false,
      isMouseHover: true,
      isReaching: true,
      isMoving: false,
      pointerEpoch: 1,
      cancelEpoch: 0,
      normX: 0,
      normY: 0,
      vx: 0,
      vy: 0,
      intentWorldPos: new THREE.Vector3(0, 1.22, 0.27),
      handWorldPos: new THREE.Vector3(0, 1.22, 0.27),
    };

    // Establish pointer state before entering the feint trick
    let time = 0.016;
    d.update(1 / 60, time, stationaryHover);
    d._enterRoutineStep(1);
    clearTrickTransition(d);

    const guidance = d.getGestureGuide();
    assert.equal(guidance.theme, 'red', `${id} subStep 0 should display red trap guidance`);

    for (let frame = 0; frame < 85 && d.subStep === 0; frame++) {
      time += 1 / 60;
      d.update(1 / 60, time, stationaryHover);
    }
    assert.equal(d.hearts, 3, `Stationary cursor must not lose hearts during ${id}`);
  }
});

test('P0.6: main.js isolates counterInteractions and DiscoveryUI while director round is active', () => {
  const mainSrc = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(mainSrc, /canOpen:\s*\(\)\s*=>\s*!director\.active\b/);
  assert.match(mainSrc, /melodyEnabled:\s*!director\.active\b/);
});
