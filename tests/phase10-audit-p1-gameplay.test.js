import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeEncounterFixture } from './encounter-fixture.js';
import { clearTrickTransition } from '../src/trick-transition.js';
import { GestureValidation } from '../src/gesture-validation.js';
import { TrickDirector } from '../src/tricks.js';
import { ICE_CREAM_FLAVORS } from '../src/protocol.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sharedFixture = makeEncounterFixture();

function makeCase(trickId, { count = 2, flavors = null } = {}) {
  const f = sharedFixture;
  let recordedStars = null;
  f.d.save.recordStageResult = (_stage, _score, stars, _won) => {
    recordedStars = stars;
  };
  f.reset({ id: trickId, count });
  f.d.config.speedMult = 1.0;
  f.d.config.tempoFactor = 1.0;
  if (flavors) {
    f.d.setOrderConfig(count, flavors, 46);
    f.d.scoopCount = count;
    f.w.updateIceCreamScoops(count, false);
    f.d._enterRoutineStep(0);
  }
  clearTrickTransition(f.d);
  f.d.servingHandoff = null;
  let clock = 0;
  let epoch = 1;
  const idleInput = {
    isPointerDown: false,
    isMouseHover: false,
    isReaching: false,
    isMoving: false,
    pointerEpoch: 0,
    cancelEpoch: 0,
    normX: 0,
    normY: -1,
    vx: 0,
    vy: 0,
    intentWorldPos: V(0.22, 1.04, 0.62),
    handWorldPos: V(0.22, 1.04, 0.62),
  };
  const stepIdle = (seconds) => {
    const n = Math.max(1, Math.round(seconds * 60));
    for (let i = 0; i < n; i++) {
      clock += 1 / 60;
      f.d.update(1 / 60, clock, { ...idleInput });
    }
  };
  const stepReach = (worldPos, seconds = 0.2, newPress = true) => {
    if (newPress) epoch++;
    const n = Math.max(1, Math.round(seconds * 60));
    const screen = f.w.projectToScreen(worldPos);
    const normX = (screen.x / f.w.canvas.clientWidth) * 2 - 1;
    const normY = 1 - (screen.y / f.w.canvas.clientHeight) * 2;
    for (let i = 0; i < n; i++) {
      clock += 1 / 60;
      f.d.update(1 / 60, clock, {
        ...idleInput,
        isPointerDown: true,
        isReaching: true,
        isMoving: i === 0,
        pointerEpoch: epoch,
        normX,
        normY,
        aimNormX: normX,
        aimNormY: normY,
        intentWorldPos: worldPos.clone(),
        handWorldPos: worldPos.clone(),
      });
    }
  };
  return { ...f, stepIdle, stepReach, get recordedStars() { return recordedStars; }, nextEpoch: () => ++epoch, stepClock: (dt) => { clock += dt; return clock; }, idleInput };
}

test('P1.1 EYE_LOCK_RHYTHM_CHASE: 8-scoop lowered green ring matches follow hitbox, midpoint ring stays fixed, and Endless beat timer stays bounded', () => {
  const f = makeCase('EYE_LOCK_RHYTHM_CHASE', { count: 8, flavors: [0, 1, 2, 3, 4, 5, 0, 1] });
  const { d, w } = f;

  // 1) SubStep 0 midpoint ring must NOT flee as player's hand moves toward it
  f.stepIdle(0.1);
  w.touristHand.position.set(0.32, 0.96, 0.58);
  w.scene.updateMatrixWorld(true);
  const ringFar = d.getGestureGuide().rings[0];

  w.touristHand.position.set(0.02, 1.14, 0.42);
  w.scene.updateMatrixWorld(true);
  const ringNear = d.getGestureGuide().rings[0];

  assert.ok(Math.hypot(ringNear.x - ringFar.x, ringNear.y - ringFar.y) < 1.5, 'Midpoint target ring must stay anchored in 3D space instead of running away from the hand');

  // 2) SubStep 1 with 8 scoops: coneWorldPos.y drops (~1.04) below rhythmTargetPos.y (1.22).
  // Following onto the rendered coneWorldPos (where the green ring is drawn!) must succeed.
  d.subStep = 1;
  d.stageTimer = 0;
  d.rhythmBeatTimer = 0;
  d.stepCooldown = 0;
  d.rhythmSide = 1;
  d.rhythmTargetPos.set(0.27, 1.22, 0.27);
  d.coneTargetPos.copy(d.rhythmTargetPos);
  clearTrickTransition(d);
  f.stepIdle(0.02);
  clearTrickTransition(d);
  f.stepReach(V(-0.20, 1.04, 0.27), 0.48, true);
  assert.ok(d.coneWorldPos.y < 1.10, `Expected 8-scoop coneWorldPos.y < 1.10, got ${d.coneWorldPos.y}`);

  const ep = f.nextEpoch();
  for (let i = 0; i <= 14; i++) {
    const p = Math.min(1, i / 6);
    const pos = V(THREE.MathUtils.lerp(-0.20, d.coneWorldPos.x, p), d.coneWorldPos.y, d.coneWorldPos.z);
    const sc = w.projectToScreen(pos);
    d.update(1 / 60, f.stepClock(1 / 60), {
      ...f.idleInput,
      isPointerDown: true,
      isReaching: true,
      isMoving: i < 7,
      pointerEpoch: ep,
      normX: (sc.x / w.canvas.clientWidth) * 2 - 1,
      normY: 1 - (sc.y / w.canvas.clientHeight) * 2,
      intentWorldPos: pos,
      handWorldPos: pos,
    });
  }
  assert.equal(d.rhythmBeatsCompleted, 1, 'Following the lowered 8-scoop green ring must register the rhythm beat');

  // 3) Endless speedMult cap: even at speedMult = 3.5, rhythmBeatTimer never advances faster than 1.45x real time
  d.config.speedMult = 3.5;
  d.rhythmBeatTimer = 0;
  f.stepIdle(0.1);
  assert.ok(d.rhythmBeatTimer <= 0.16, `Expected bounded rhythmBeatTimer <= 0.16s after 0.1s, got ${d.rhythmBeatTimer}`);
});

test('P1.2 WHOLE_MOLD_ON_CONE: stationary hover stays safe while deliberate reach onto visible mold/cone triggers trap despite Z depth', () => {
  const safe = makeCase('WHOLE_MOLD_ON_CONE', { count: 2 });
  safe.stepReach(V(0.32, 1.25, 0.26), 2.4, true);
  assert.equal(safe.d.hearts, 3, 'Stationary held pointer from start must not lose a heart');

  const trap = makeCase('WHOLE_MOLD_ON_CONE', { count: 2 });
  trap.stepIdle(1.68);
  trap.w.scene.updateMatrixWorld(true);
  const visibleCone = trap.w.conePivot.getWorldPosition(V());
  assert.ok(visibleCone.z < 0.05, 'Cone in vendor left hand lies behind player z=0.26 plane');
  trap.stepReach(V(visibleCone.x, visibleCone.y, 0.26), 0.22, true);
  assert.equal(trap.d.hearts, 2, 'Deliberate reach onto the visible red mold trap must deduct 1 heart');
});

test('P1.3 Controls: bottom-clamped rawNormY pull, NAPKIN_CONE_FAKEOUT horizontal flick, and attemptSnatch real catch', () => {
  // 1) GestureValidation.pull succeeds via rawNormY even when virtual normY is clamped at bottom edge
  const gv = new GestureValidation();
  const state = {
    isPointerDown: true,
    pointerEpoch: 1,
    cancelEpoch: 0,
    normX: 0.1,
    normY: -0.92,
    rawNormX: 0.1,
    rawNormY: -0.42,
    intentWorldPos: V(0.05, 0.95, 0.26),
  };
  gv.update(state, 0.02, 'clamp-pull');
  for (let i = 1; i <= 6; i++) {
    state.normY = Math.max(-0.97, -0.92 - i * 0.02); // Clamped to only -0.05 virtual delta!
    state.rawNormY = -0.42 - i * 0.04; // Real physical downward drag of -0.24!
    gv.update(state, 0.02, 'clamp-pull');
  }
  assert.equal(gv.pull('pull'), true, 'Physical downward finger drag must register pull even when virtual cursor hits bottom margin');

  // 2) NAPKIN_CONE_FAKEOUT subStep === 1 accepts horizontal flick (matching "FLICK AWAY" cue!)
  const nap = makeCase('NAPKIN_CONE_FAKEOUT', { count: 2 });
  nap.stepIdle(0.45);
  nap.w.scene.updateMatrixWorld(true);
  const paperPos = nap.w.servingNapkin.getWorldPosition(V());
  nap.stepReach(paperPos, 0.20, true);
  assert.equal(nap.d.heldItem, 'NAPKIN');
  assert.equal(nap.d.subStep, 1);

  const ep = nap.nextEpoch();
  for (let i = 0; i <= 6; i++) {
    nap.d.update(1 / 60, nap.stepClock(1 / 60), {
      ...nap.idleInput,
      isPointerDown: true,
      isReaching: true,
      isMoving: true,
      pointerEpoch: ep,
      normX: -0.15 + i * 0.06,
      normY: -0.10,
      intentWorldPos: V(-0.08 + i * 0.03, 1.18, 0.28),
      handWorldPos: V(-0.08 + i * 0.03, 1.18, 0.28),
    });
  }
  assert.equal(nap.d.servingNapkinState.pulled, true, 'Horizontal flick must peel/flick the serving napkin');

  // 3) Double-tap attemptSnatch catches an offered cone
  const sn = makeCase('FAKE_DROP_PANIC', { count: 2 });
  sn.stepIdle(1.85); // FAKE_DROP_PANIC subStep === 1 real offer settled
  assert.equal(sn.d.subStep, 1);
  const beforeIdx = sn.d.routineIndex;
  sn.d.attemptSnatch(sn.d.coneWorldPos.clone());
  sn.stepIdle(0.05);
  assert.ok(sn.d.routineIndex > beforeIdx || sn.d.currentMechanic !== 'FAKE_DROP_PANIC', 'attemptSnatch on offered cone must complete the catch');
});

test('P1.4 Dynamic routine scoop scheduling & MEGA_TAFFY_SLICE flavor matching', () => {
  const fakeLevel = {
    minTricks: 3,
    maxTricks: 3,
    trickPool: ['GIANT_BLOCK_TEASE', 'MEGA_TAFFY_SLICE', 'SHAFT_SPIN_360'],
  };
  const routine = TrickDirector.prototype._buildDynamicRoutineForStage.call(
    { targetScoopCount: 4, _recentTricks: new Set() },
    fakeLevel,
    false
  );
  const scoopAdders = routine.filter(
    (id) => id === 'SCRAPE_FLAVOR_SCOOP' || id === 'GIANT_BLOCK_TEASE' || id === 'MEGA_TAFFY_SLICE'
  );
  assert.equal(scoopAdders.length, 4, `Expected exactly 4 scoop-adding steps for 4-scoop order, got ${scoopAdders.length}: ${routine.join(', ')}`);

  const taffy = makeCase('MEGA_TAFFY_SLICE', { count: 2, flavors: [0, 3] });
  assert.equal(
    taffy.w.stretchyStrand.mesh.material.color.getHex(),
    ICE_CREAM_FLAVORS[3].colorHex,
    'MEGA_TAFFY_SLICE strand must match top ordered flavor (index 3) when all scoops are already on cone'
  );
});

test('P1.5 Choreography & outcome consistency: COUNTER_DRUM_CADENCE, MOLD_PENDULUM_HEIST, NAPKIN_FAN_CURTAIN, ELASTIC_BUNGEE_YO_YO, PASSIVE_BORING & BAMBOOZLED_OVERTIME', () => {
  const drum = makeCase('COUNTER_DRUM_CADENCE', { count: 2 });
  drum.stepIdle(0.5);
  assert.ok(drum.d.coneWorldPos.y >= 1.20, 'Cone stays safely upright above counter while vendor left hand drums rail');
  assert.equal(drum.d.leftHandCustomTarget instanceof THREE.Vector3 && drum.d.leftHandCustomTarget.y < 1.16, true, 'Vendor left hand drums counter rail');
  drum.stepIdle(1.15);
  assert.equal(drum.d.subStep, 1);

  const pendulum = makeCase('MOLD_PENDULUM_HEIST', { count: 2 });
  pendulum.stepIdle(0.6);
  pendulum.w.scene.updateMatrixWorld(true);
  const blockWorld = pendulum.w.giantBlockGroup.getWorldPosition(V());
  assert.ok(blockWorld.distanceTo(pendulum.d.coneWorldPos) > 0.25, 'Swinging 5kg mold and cone stay physically separated (>0.25m) without clipping');
  pendulum.stepIdle(1.1);
  assert.equal(pendulum.d.subStep, 1);

  const fan = makeCase('NAPKIN_FAN_CURTAIN', { count: 2 });
  fan.stepIdle(0.5);
  assert.equal(fan.w.napkinProp.visible, true, 'Fanning napkin curtain must actually stay visible');

  const yoyo = makeCase('ELASTIC_BUNGEE_YO_YO', { count: 2 });
  yoyo.stepIdle(0.5);
  assert.equal(yoyo.d.leftHandCustomTarget instanceof THREE.Vector3, true, 'Vendor left hand must hold upper bungee anchor');

  const passive = makeCase('SHAFT_SPIN_360', { count: 2 });
  passive.d._endRound('PASSIVE_BORING');
  assert.equal(passive.w.conePivot.parent !== passive.w.heldSocket, true, 'PASSIVE_BORING loss must not reward player with filled cone');

  const overtime = makeCase('FINAL_PISTACHIO_CATCH', { count: 2 });
  overtime.d._endRound('BAMBOOZLED_OVERTIME');
  assert.equal(overtime.recordedStars, 0, 'BAMBOOZLED_OVERTIME defeat must award 0 stars');
});
