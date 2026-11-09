import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Group} from 'three';
import {
  TrickPoseTransition,
  captureTrickPose,
  updateTrickTransition,
  joinAuthoredPose,
  finishAuthoredPose,
  clearTrickTransition,
} from '../src/trick-transition.js';

function makeStubDirector({ tempoFactor = 1 } = {}) {
  const coneWorldPos = new Vector3(0, 1.24, 0.22);
  const coneTargetPos = coneWorldPos.clone();
  const paddleGroup=new Group(),conePivot=new Group(),heldSocket=new Group(),handGroup=new Group();paddleGroup.add(conePivot);
  return {
    active: true,
    roundEnded: false,
    _updateSerial: 1,
    routineIndex: 0,
    currentMechanic: 'SHAFT_SPIN_360',
    subStep: 0,
    choreography: null,
    config: { tempoFactor },
    coneWorldPos,
    coneTargetPos,
    shaftRoll: 0,
    conePitchX: 0,
    coneFlipZ: 0,
    leftHandCustomTarget: null,
    presentationExact: false,
    presentationStrikeTip: new Vector3(1, 2, 3),
    presentationSurface: { kind: 'counter' },
    presentationBell: { index: 1 },
    score: 420,
    hearts: 3,
    stageTimer: 0.75,
    idleSeconds: 1.4,
    gestureValidation: {
      calls: [],
      update(input, dt, key) {
        this.calls.push({ input, dt, key });
      },
    },
    sound: {
      beatSynced: 0,
      syncMusicBeat() {
        this.beatSynced += 1;
      },
    },
    world: {
      paddleGroup,conePivot,heldSocket,lArmRig:{handGroup,handRig:{}},
      paddleAngularMotion: {
        shaft: { value: 0 },
        pitch: { value: 0 },
        flip: { value: 0 },
      },
      leftPropSpring: { pos: new Vector3(0.24, 1.22, -0.25) },
      servingNapkin: { visible: false },
    },
  };
}

function makeStubInput(overrides = {}) {
  return {
    isPointerDown: false,
    isReaching: false,
    isMoving: false,
    normX: 0,
    normY: -1,
    vx: 0,
    vy: 0,
    speed: 0,
    handWorldPos: new Vector3(0.22, 1.04, 0.64),
    intentWorldPos: new Vector3(0.22, 1.04, 0.64),
    pointerEpoch: 1,
    cancelEpoch: 0,
    ...overrides,
  };
}

function assertVecClose(actual, expected, eps = 1e-9, label = 'vector') {
  assert.ok(
    actual.distanceTo(expected) <= eps,
    `${label} mismatch: got (${actual.x}, ${actual.y}, ${actual.z}), expected (${expected.x}, ${expected.y}, ${expected.z})`
  );
}

function wrapDiff(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

test('TrickPoseTransition: exact start at dt=0, exact end, shortest root-angle turn near +/-pi, and immutability', () => {
  const d = makeStubDirector();
  const from = {
    position: new Vector3(-0.24, 1.56, 0.08),
    roll: Math.PI - 0.12,
    pitch: -Math.PI + 0.09,
    flip: Math.PI - 0.07,
    left: new Vector3(0.22, 1.18, -0.24),
  };
  const to = {
    position: new Vector3(0.18, 1.22, 0.27),
    roll: -Math.PI + 0.11,
    pitch: Math.PI - 0.08,
    flip: -Math.PI + 0.06,
    left: new Vector3(-0.28, 1.25, 0.2),
  };

  const fromSnapshot = {
    position: from.position.clone(),
    roll: from.roll,
    pitch: from.pitch,
    flip: from.flip,
    left: from.left.clone(),
  };
  const toSnapshot = {
    position: to.position.clone(),
    roll: to.roll,
    pitch: to.pitch,
    flip: to.flip,
    left: to.left.clone(),
  };

  const tr = new TrickPoseTransition(from, to, { tempo: 1 });

  // Shortest root-angle turn across +/-pi branch cut
  assert.ok(Math.abs(tr.to.roll - from.roll) < 0.25, 'roll should take shortest turn across pi');
  assert.ok(Math.abs(tr.to.pitch - from.pitch) < 0.25, 'pitch should take shortest turn across -pi');
  assert.ok(Math.abs(tr.to.flip - from.flip) < 0.25, 'flip should take shortest turn across pi');

  // Exact start at dt = 0
  tr.apply(d, 0);
  assert.equal(tr.age, 0);
  assert.equal(tr.done, false);
  assertVecClose(d.coneTargetPos, from.position, 1e-12, 'start coneTargetPos');
  assert.equal(d.shaftRoll, from.roll);
  assert.equal(d.conePitchX, from.pitch);
  assert.equal(d.coneFlipZ, from.flip);
  assertVecClose(d.leftHandCustomTarget, from.left, 1e-12, 'start leftHandCustomTarget');
  assert.equal(d.presentationExact, true);
  assert.equal(d.presentationStrikeTip, null);
  assert.equal(d.presentationSurface, null);
  assert.equal(d.presentationBell, null);

  // Midpoint stays near +/-pi rather than interpolating through 0
  tr.apply(d, tr.duration * 0.5);
  assert.ok(Math.abs(d.shaftRoll) > Math.PI - 0.15, 'midpoint roll stays near pi');
  assert.ok(Math.abs(d.conePitchX) > Math.PI - 0.15, 'midpoint pitch stays near -pi');
  assert.ok(Math.abs(d.coneFlipZ) > Math.PI - 0.15, 'midpoint flip stays near pi');

  // Exact end
  tr.apply(d, tr.duration);
  assert.equal(tr.done, true);
  assertVecClose(d.coneTargetPos, to.position, 1e-12, 'end coneTargetPos');
  assert.ok(Math.abs(wrapDiff(d.shaftRoll, to.roll)) < 1e-12, 'end roll matches destination angle');
  assert.ok(Math.abs(wrapDiff(d.conePitchX, to.pitch)) < 1e-12, 'end pitch matches destination angle');
  assert.ok(Math.abs(wrapDiff(d.coneFlipZ, to.flip)) < 1e-12, 'end flip matches destination angle');
  assertVecClose(d.leftHandCustomTarget, to.left, 1e-12, 'end leftHandCustomTarget');

  // Source, destination, score, hearts, and stageTimer are never mutated
  assertVecClose(from.position, fromSnapshot.position, 0, 'from.position immutable');
  assertVecClose(from.left, fromSnapshot.left, 0, 'from.left immutable');
  assert.equal(from.roll, fromSnapshot.roll);
  assert.equal(from.pitch, fromSnapshot.pitch);
  assert.equal(from.flip, fromSnapshot.flip);
  assertVecClose(to.position, toSnapshot.position, 0, 'to.position immutable');
  assertVecClose(to.left, toSnapshot.left, 0, 'to.left immutable');
  assert.equal(to.roll, toSnapshot.roll);
  assert.equal(to.pitch, toSnapshot.pitch);
  assert.equal(to.flip, toSnapshot.flip);
  assert.equal(d.score, 420);
  assert.equal(d.hearts, 3);
  assert.equal(d.stageTimer, 0.75);
});

test('TrickPoseTransition: duration stays within [.22, .58] at tempos 1, 2, 5 and scales with tempo', () => {
  const cases = [
    {
      from: { position: new Vector3(0, 1.24, 0.22), roll: 0, pitch: 0, flip: 0, left: null },
      to: { position: new Vector3(0.01, 1.24, 0.22), roll: 0.02, pitch: 0, flip: 0, left: null },
    },
    {
      from: { position: new Vector3(0, 1.24, 0.22), roll: 0, pitch: 0, flip: 0, left: null },
      to: { position: new Vector3(0.28, 1.48, 0.18), roll: 1.2, pitch: 0.4, flip: Math.PI, left: null },
    },
    {
      from: { position: new Vector3(-0.6, 0.95, -0.35), roll: -Math.PI, pitch: -1.2, flip: 0, left: null },
      to: { position: new Vector3(0.6, 1.75, 0.42), roll: Math.PI, pitch: 1.2, flip: Math.PI, left: null },
    },
  ];

  for (const { from, to } of cases) {
    const durations = [1, 2, 5].map((tempo) => {
      const tr = new TrickPoseTransition(from, to, { tempo });
      assert.ok(
        tr.duration >= 0.22 && tr.duration <= 0.58,
        `duration ${tr.duration} out of [.22, .58] at tempo ${tempo}`
      );
      return tr.duration;
    });
    assert.ok(durations[1] <= durations[0] + 1e-12, 'tempo 2 should not be slower than tempo 1');
    assert.ok(durations[2] <= durations[1] + 1e-12, 'tempo 5 should not be slower than tempo 2');
  }
});

test('TrickPoseTransition: small per-frame translation over duration at 30Hz, 60Hz, and 120Hz', () => {
  const from = {
    position: new Vector3(-0.22, 1.18, 0.14),
    roll: -0.4,
    pitch: 0.15,
    flip: 0,
    left: new Vector3(0.2, 1.2, -0.22),
  };
  const to = {
    position: new Vector3(0.24, 1.52, 0.28),
    roll: 0.9,
    pitch: -0.25,
    flip: Math.PI,
    left: null,
  };
  const totalDist = from.position.distanceTo(to.position);

  for (const hz of [30, 60, 120]) {
    const dt = 1 / hz;
    const d = makeStubDirector();
    const tr = new TrickPoseTransition(from, to, { tempo: 1 });
    tr.apply(d, 0);
    assert.equal(d.leftHandCustomTarget, null, 'clears leftHandCustomTarget when destination left is null');

    const prevPos = d.coneTargetPos.clone();
    let prevDistFromStart = 0;
    let steps = 0;
    // Peak derivative of smoothstep 3t^2 - 2t^3 is 1.5 at t = 0.5
    const maxStepAllowed = (1.55 * totalDist * dt) / tr.duration;

    while (!tr.done && steps < 500) {
      tr.apply(d, dt);
      const stepMove = prevPos.distanceTo(d.coneTargetPos);
      assert.ok(
        stepMove <= maxStepAllowed,
        `per-frame translation ${stepMove.toFixed(5)}m exceeded ${maxStepAllowed.toFixed(5)}m at ${hz}Hz`
      );
      const distFromStart = from.position.distanceTo(d.coneTargetPos);
      assert.ok(
        distFromStart + 1e-9 >= prevDistFromStart,
        `progress should be monotonic at ${hz}Hz`
      );
      prevDistFromStart = distFromStart;
      prevPos.copy(d.coneTargetPos);
      steps += 1;
    }

    assert.equal(tr.done, true);
    assertVecClose(d.coneTargetPos, to.position, 1e-12, `final position at ${hz}Hz`);
  }
});

test('updateTrickTransition pauses mechanics, updates gestureValidation, preserves score/hearts/stageTimer, and clearTrickTransition resets state', () => {
  const d = makeStubDirector({ tempoFactor: 1 });
  const input = makeStubInput({
    isPointerDown: true,
    isReaching: true,
    isMoving: true,
    vx: 1.4,
    vy: -0.3,
    speed: 1.43,
    pointerEpoch: 3,
  });

  // Seed initial pose and arm a transition via joinAuthoredPose
  finishAuthoredPose(d);
  d._updateSerial = 2;
  d._motionStepKey = '0:SHAFT_SPIN_360:0:0';
  d._lastMotionStepKey = '0:SHAFT_SPIN_360:0:0';
  d._lastAuthoredPosition = d.coneWorldPos.clone();

  // Move to a new routine step with a distinct authored pose
  d.routineIndex = 1;
  d.currentMechanic = 'OVERHEAD_CROWN_DANGLE';
  d._motionStepKey = '1:OVERHEAD_CROWN_DANGLE:0:0';
  d.coneTargetPos.set(0, 1.66, 0.22);
  d.coneFlipZ = Math.PI;
  d.conePitchX = 0.42;

  joinAuthoredPose(d, 1 / 60);
  assert.ok(d.trickTransition instanceof TrickPoseTransition, 'joinAuthoredPose should arm TrickPoseTransition');
  assert.ok(d.trickTransition.duration >= 0.22 && d.trickTransition.duration <= 0.58);
  assertVecClose(d.coneTargetPos, d.coneWorldPos, 1e-12, 'joinAuthoredPose starts at previous pose at dt=0');

  let frames = 0;
  while (d.trickTransition && frames < 120) {
    input.handWorldPos = new Vector3(0.1 + frames * 0.005, 1.15, 0.45);
    input.intentWorldPos = input.handWorldPos.clone();
    const handled = updateTrickTransition(d, 1 / 60, input);
    assert.equal(handled, true, 'updateTrickTransition returns true while active');
    assert.equal(d.idleSeconds, 0, 'idleSeconds is zeroed during pose transition');
    assert.equal(d.score, 420, 'score preserved');
    assert.equal(d.hearts, 3, 'hearts preserved');
    assert.equal(d.stageTimer, 0.75, 'stageTimer preserved');
    const lastCall = d.gestureValidation.calls.at(-1);
    assert.ok(
      lastCall && String(lastCall.key).startsWith('pose-join:'),
      'gestureValidation updated with pose-join key during transition'
    );
    assert.equal(lastCall.input, input, 'raw input passed to gestureValidation');
    frames += 1;
  }

  assert.equal(d.trickTransition, null, 'transition cleared on completion');
  assert.equal(d._poseTransitionFinishing, true, '_poseTransitionFinishing flag set');
  assert.equal(d.sound.beatSynced, 1, 'syncMusicBeat called when transition finishes');
  assertVecClose(d.coneTargetPos, new Vector3(0, 1.66, 0.22), 1e-12, 'arrived at authored target');

  // Verify clearTrickTransition clears all pending join/paper states
  d.trickTransition = new TrickPoseTransition(captureTrickPose(d), captureTrickPose(d));
  d.pendingTrickEntry = { serial: 9, from: captureTrickPose(d), objects: [] };
  d.pendingEntryPaper = { owner: 'vendor' };
  d.entryPaperPreparation = { done: false };
  d.paperReturnPose = { offerWeight: 0.5 };
  clearTrickTransition(d);

  assert.equal(d.trickTransition, null);
  assert.equal(d.pendingTrickEntry, null);
  assert.equal(d._lastTrickPose, null);
  assert.equal(d.pendingEntryPaper, null);
  assert.equal(d.entryPaperPreparation, null);
  assert.equal(d.paperReturnPose, null);
  assert.equal(d._lastMotionStepKey, null);
  assert.equal(d._lastAuthoredPosition, null);
  assert.equal(d._poseTransitionFinishing, false);
});
