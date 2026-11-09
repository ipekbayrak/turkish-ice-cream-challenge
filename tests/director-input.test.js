import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TrickDirector } from '../src/tricks.js';
import { GestureValidation } from '../src/gesture-validation.js';

const noop = () => {};
const point = (x = 0, y = 1.22, z = 0.27) => new THREE.Vector3(x, y, z);

// Exercise original director judgment without WebGL, browser events or a renderer.
function fixture(mechanic, subStep = 0) {
  const director = Object.create(TrickDirector.prototype);
  const calls = { advanced: 0, outcome: null, tutorial: false, thrown: 0 };
  const state = {
    isPointerDown: true, isReaching: true, isMoving: false,
    pointerEpoch: 1, cancelEpoch: 0, normX: 0, normY: 0,
    vx: 0, vy: 0, speed: 0,
    intentWorldPos: point(),
    // Deliberately snapped: old code wrongly treated this visual pose as input.
    handWorldPos: point(),
  };
  Object.assign(director, {
    active: true, roundEnded: false, config: { speedMult: 1, finalWindowSec: 2.8 },
    vendorBubbleTimer: 0, vignetteFlash: { alpha: 0 }, floatingPopups: [],
    stageTimer: 0, stepCooldown: 0, routineIndex: 0, currentMechanic: mechanic,
    subStep, heldItem: null, bellBeatsDone: 0, rhythmBeatsCompleted: 0,
    rhythmBeatTimer: 0, rhythmTargetPos: point(-0.27), rhythmSide: -1,
    coneWorldPos: point(), coneTargetPos: point(),
    nestedService: mechanic === 'DOUBLE_CONE_SLIDE' ? { from: point(), returnFrom: point(), variant: 'pole' } : null,
    midpointHoverTimer: 0, eyeLockHoldTimer: 0, tugTimer: 0,
    idleSeconds: 0, passiveLimitSec: 22, isAfkShowActive: false,
    shaftRoll: 0, conePitchX: 0, coneFlipZ: 0, score: 0,
    gestureValidation: new GestureValidation(),
    sound: new Proxy({}, { get: () => noop }),
    world: {
      setVendorMood: noop, strikeBell: noop, ringBells: noop,
      setConeInVendorHand: noop, handoffOuterCone: noop,
      scene: new THREE.Scene(), outerConeGroup: new THREE.Group(),
      triggerScoopJiggle: noop, triggerSpectatorReaction: noop,
      stretchyStrand: { update: noop, attach: noop, detach: noop },
      sliceCueGroup: { visible: true },
      touristHand: { position: point(), getWorldPosition: (out) => out.copy(director.coneWorldPos) },
      heldSocket: { add: noop }, conePivot: { position: point(), rotation: { set: noop } },
      heldEmptyCone: { visible: false }, heldNapkinCone: { visible: false }, mainConeMesh: { visible: true },
      throwHeldProp: () => calls.thrown++,
    },
    save: { markTutorialCompleted: () => { calls.tutorial = true; }, discoverTrick: noop },
    _getTubWorldPosForScoop: () => point(0, 1, -0.3),
    _getFlavorForScoop: () => ({ colorHex: 0xffffff }),
    _applyKinematics: noop, _vibrate: noop, _spawnScorePopup: noop, _triggerVendorSpeech: noop,
    _advanceRoutineStep: () => { calls.advanced++; director.active = false; },
    _endRound: (outcome) => { calls.outcome = outcome; director.roundEnded = true; },
  });
  let elapsed = 0;
  return {
    director, state, calls,
    tick(frames = 1) { for (let i = 0; i < frames; i++) { elapsed += 1 / 60; director.update(1 / 60, elapsed, state); } },
    move(x, y = 1.22, z = 0.27) {
      state.intentWorldPos.set(x, y, z);
      state.normX = x / 0.54; state.normY = (y - 1.22) / 0.36;
    },
  };
}

test('original rhythm director cannot award stationary center or tiny jitter despite a snapped hand', () => {
  for (const jitter of [0, 0.006]) {
    const f = fixture('EYE_LOCK_RHYTHM_CHASE', 1);
    for (let i = 0; i < 900; i++) {
      f.move(i % 2 ? jitter : -jitter);
      f.state.handWorldPos.copy(f.director.rhythmTargetPos);
      f.director.coneWorldPos.copy(f.director.rhythmTargetPos);
      f.tick();
    }
    assert.equal(f.director.rhythmBeatsCompleted, 0);
    assert.equal(f.calls.advanced, 0);
    assert.equal(f.director.score, 0);
  }
});

test('original rhythm director accepts all three deliberate alternating target follows', () => {
  const f = fixture('EYE_LOCK_RHYTHM_CHASE', 1);
  f.tick();
  for (let beat = 0; beat < 3; beat++) {
    const target = f.director.rhythmTargetPos.clone();
    // First observe the request before delivering fresh pointer movement.
    f.tick();
    f.move(target.x, target.y, target.z);
    const prior = f.director.rhythmBeatsCompleted;
    for (let frame = 0; frame < 60 && f.director.rhythmBeatsCompleted === prior; frame++) f.tick();
    assert.equal(f.director.rhythmBeatsCompleted, beat + 1);
  }
  assert.equal(f.calls.advanced, 1);
  assert.equal(f.director.score, 620); // original 120 + 120 + 380 rewards
});

test('tutorial slice cannot complete on timeout and completes on a real horizontal cut', () => {
  const f = fixture('TUTORIAL_WARMUP', 2);
  f.director.stageTimer = 4;
  f.tick(120);
  assert.equal(f.calls.tutorial, false);
  assert.equal(f.calls.advanced, 0);
  f.move(-0.1); f.tick(4); f.move(0.1); f.tick();
  assert.equal(f.calls.tutorial, true);
  assert.equal(f.calls.advanced, 1);
  assert.equal(f.director.score, 220);
});

test('final snapped hand and elapsed tug timer cannot win without a deliberate downward pull', () => {
  const f = fixture('FINAL_PISTACHIO_CATCH', 1);
  f.director.heldItem = 'FULL_CONE_TUG'; f.director.tugTimer = 0.36;
  f.tick(180);
  assert.equal(f.calls.outcome, null);
  f.move(0, 1.22); f.tick(4); f.move(0, 1.10, 0.39); f.tick();
  assert.equal(f.calls.outcome, 'MASTER_CATCH');
});

test('a cancellation during the final tug cannot win even if the posed hand retracts', () => {
  const f = fixture('FINAL_PISTACHIO_CATCH', 1);
  f.director.heldItem = 'FULL_CONE_TUG'; f.director.tugTimer = 0.36;
  f.tick(3); f.move(0, 1.10, 0.39); f.tick();
  f.state.isPointerDown = false; f.state.isReaching = false; f.state.cancelEpoch++;
  f.tick(30);
  assert.equal(f.calls.outcome, null);
});

test('empty held cone does not clear itself through old proximity or stale velocity and requires downward pull before return', () => {
  const f = fixture('DOUBLE_CONE_SLIDE', 1);
  f.tick(); f.director.heldItem = 'EMPTY_CONE';
  f.state.vx = 99; f.state.speed = 99;
  f.tick(120);
  assert.equal(Boolean(f.director.nestedService.pulled), false);
  assert.equal(f.director.heldItem, 'EMPTY_CONE');
  assert.equal(f.director.score, 0);
  f.move(0, 1.22); f.tick(4); f.move(0, 0.90); f.tick();
  assert.equal(f.director.nestedService.pulled, true);
  f.tick(120);
  assert.equal(f.director.heldItem, 'EMPTY_CONE');
  assert.equal(f.director.score, 0);
  f.move(-0.12, 1.22); f.tick(4); f.move(0.14, 1.22); f.tick();
  assert.equal(f.director.heldItem, null);
  assert.equal(f.calls.advanced, 0, 'retrieval must remain visible before the next trick');
  f.tick(45);
  assert.equal(f.calls.advanced, 1);
  assert.equal(f.director.score, 240);
});
