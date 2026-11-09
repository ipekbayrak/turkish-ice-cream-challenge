import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeVendorFlourishFixture } from './vendor-flourish-fixture.js';
import { TRICK_CATALOG } from '../src/protocol.js';
import { isChoreographedRoutine } from '../src/trick-routines.js';
import { clearTrickTransition } from '../src/trick-transition.js';
import { NapkinReturn } from '../src/napkin-return.js';

function snapshotWorldTransform(object) {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  object.matrixWorld.decompose(position, quaternion, scale);
  return {
    visible: object.visible,
    parent: object.parent,
    position,
    quaternion,
    scale,
  };
}

function quatAngleDiff(a, b) {
  const dot = Math.min(1, Math.abs(a.dot(b)));
  return 2 * Math.acos(dot);
}

function assertSameWorldPose(before, after, label, eps = 1e-6) {
  if (!before.visible || !after.visible) return;
  const posDiff = before.position.distanceTo(after.position);
  const rotDiff = quatAngleDiff(before.quaternion, after.quaternion);
  const scaleDiff = before.scale.distanceTo(after.scale);
  assert.ok(
    posDiff <= eps,
    `${label} world position jumped by ${posDiff}m on entry (expected <= ${eps})`
  );
  assert.ok(
    rotDiff <= eps,
    `${label} world rotation jumped by ${rotDiff} rad on entry (expected <= ${eps})`
  );
  assert.ok(
    scaleDiff <= eps,
    `${label} world scale jumped by ${scaleDiff} on entry (expected <= ${eps})`
  );
}

function resetNeutralInput(input) {
  input.isPointerDown = false;
  input.isReaching = false;
  input.isMoving = false;
  input.isMouseHover = false;
  input.normX = 0;
  input.normY = -1;
  input.vx = 0;
  input.vy = 0;
  input.speed = 0;
  input.handWorldPos.set(0.22, 1.04, 0.64);
  input.intentWorldPos.set(0.22, 1.04, 0.64);
}

function prepareActiveBaseline(fixture, scoopCount, nextTrickId) {
  const { w, d, input } = fixture;
  if (!w.tubIceGroups.length) {
    w.tubIceGroups = w.tubPositions.map((_, i) => ({
      group: new THREE.Group(),
      baseY: 0.018,
      churnEnergy: 0,
      phase: i * 1.1,
      fill: 1,
    }));
  }
  w.projectToScreen = (worldVec) => {
    const v = worldVec.clone().project(w.camera);
    return { x: (v.x * 0.5 + 0.5) * 390, y: (-v.y * 0.5 + 0.5) * 844 };
  };
  w.setStretchCutPresentation = () => {};
  w.stretchyStrand = {
    active: false,
    attach() {
      this.active = true;
    },
    update() {},
    detach() {
      this.active = false;
    },
    setHandPressure() {},
  };
  d._spawnScorePopup = () => {};
  resetNeutralInput(input);

  d.active = true;
  d.roundEnded = false;
  d.isAfkShowActive = false;
  d.vendorFlourish = null;
  d.flourishPreparation = null;
  d.afkRejoin = null;
  d.idleSeconds = 0;
  d.passiveLimitSec = 99;

  d.targetScoopCount = scoopCount;
  d.scoopCount = scoopCount;
  d._hideAllProps();
  d._reattachConeToPaddle();
  w.conePivot.position.set(0, 0.02, 0);
  w.conePivot.quaternion.identity();
  w.conePivot.scale.setScalar(w.servingScale || 1);
  w.scoopStackGroup.position.set(0, 0, 0);
  w.scoopStackGroup.quaternion.identity();
  w.scoopStackGroup.scale.set(1, 1, 1);
  w.updateIceCreamScoops(scoopCount, false);
  w.updateServingLayout(1);

  d.routine = ['SHAFT_SPIN_360', nextTrickId, 'FINAL_PISTACHIO_CATCH'];
  d.routineIndex = 0;
  d.currentMechanic = 'SHAFT_SPIN_360';
  d.currentShowId = 'SHAFT_SPIN_360';
  d.subStep = 0;
  d.stageTimer = 0.2;
  d.stepCooldown = 0;
  d.score = 500;
  d.hearts = 3;

  d.coneWorldPos.set(0, 1.24, 0.25);
  d.coneTargetPos.copy(d.coneWorldPos);
  w.coneSpring.pos.copy(d.coneWorldPos);
  w.coneSpring.target.copy(d.coneWorldPos);
  w.coneSpring.vel.set(0, 0, 0);
  w.paddleGroup.position.copy(d.coneWorldPos);
  w.prevConePos.copy(d.coneWorldPos);
  w.scoopJiggleSpring.pos.set(0, 0, 0);
  w.scoopJiggleSpring.vel.set(0, 0, 0);
  w.scoopJiggleSpring.target.set(0, 0, 0);
  d.shaftRoll = 0;
  d.conePitchX = 0;
  d.coneFlipZ = 0;
  d.leftHandCustomTarget = null;
  clearTrickTransition(d);

  // Settle two active frames with real IK and kinematics before entering the trick under test
  const dt = 1 / 60;
  for (let i = 0; i < 2; i++) {
    thisTime += dt;
    d.update(dt, thisTime, input);
    w.updateEnvironmentAnimations(thisTime, dt);
  }
}

let thisTime = 0;

test('Actual rig continuity across base TRICK_CATALOG mechanics at 2 and 8 scoops', () => {
  const baseTrickIds = TRICK_CATALOG.filter(
    (t) => !isChoreographedRoutine(t.id)
  ).map((t) => t.id);
  const uniqueBaseIds = [...new Set(baseTrickIds)];
  assert.ok(
    uniqueBaseIds.length > 20,
    `expected > 20 base trick IDs, found ${uniqueBaseIds.length}`
  );

  const reachedBaseIds = new Set();
  let armedTransitionCount = 0;
  let paperIntroCount = 0;
  const failures = [];

  for (const scoopCount of [2, 8]) {
    const fixture = makeVendorFlourishFixture(1, scoopCount);
    const { w, d, input } = fixture;

    for (const trickId of uniqueBaseIds) {
      prepareActiveBaseline(fixture, scoopCount, trickId);

      w.scene.updateMatrixWorld(true);
      const coneBefore = snapshotWorldTransform(w.conePivot);
      const scoopsBefore = snapshotWorldTransform(w.scoopStackGroup);
      const visibleScoopsBefore = w.scoopMeshes
        .slice(0, scoopCount)
        .map((m) => m.visible);

      d.score = 500;
      d.hearts = 3;
      d._enterRoutineStep(1);
      reachedBaseIds.add(d.currentMechanic);

      w.scene.updateMatrixWorld(true);
      const coneAfter = snapshotWorldTransform(w.conePivot);
      const scoopsAfter = snapshotWorldTransform(w.scoopStackGroup);

      assertSameWorldPose(
        coneBefore,
        coneAfter,
        `${trickId} (${scoopCount} scoops) conePivot`
      );
      assertSameWorldPose(
        scoopsBefore,
        scoopsAfter,
        `${trickId} (${scoopCount} scoops) scoopStackGroup`
      );

      if (d.currentMechanic.includes('WHOLE_MOLD')) {
        assert.equal(
          w.scoopStackGroup.visible,
          true,
          `${d.currentMechanic} (${scoopCount} scoops): scoopStackGroup must not blink on entry`
        );
        const visibleScoopsAfter = w.scoopMeshes
          .slice(0, scoopCount)
          .map((m) => m.visible);
        assert.deepEqual(
          visibleScoopsAfter,
          visibleScoopsBefore,
          `${d.currentMechanic} (${scoopCount} scoops): existing scoops must stay visible on entry until mold arrives`
        );
      }

      const dt = 1 / 60;
      let prevPaddleRoot = d.coneWorldPos.clone();
      let prevConeRoot = w.conePivot.getWorldPosition(new THREE.Vector3());

      for (let frame = 0; frame < 24; frame++) {
        thisTime += dt;
        const wasInJoinOrPaper = Boolean(
          d.trickTransition || d.entryPaperPreparation
        );
        const timerBefore = d.stageTimer;

        d.update(dt, thisTime, input);
        w.updateEnvironmentAnimations(thisTime, dt);
        w.scene.updateMatrixWorld(true);

        if (d.trickTransition) {
          armedTransitionCount += 1;
          assert.ok(
            d.trickTransition.duration > 0,
            `${trickId}: armed transition must have positive duration`
          );
          assert.equal(
            d.score,
            500,
            `${trickId}: score must be preserved during transition`
          );
          assert.equal(
            d.hearts,
            3,
            `${trickId}: hearts must be preserved during transition`
          );
        }

        if (wasInJoinOrPaper) {
          assert.equal(
            d.stageTimer,
            timerBefore,
            `${trickId} frame ${frame}: transition/paper prep must not consume stageTimer`
          );
          assert.equal(d.score, 500, `${trickId}: score preserved while stepping transition`);
          assert.equal(d.hearts, 3, `${trickId}: hearts preserved while stepping transition`);
        }

        if (d.entryPaperPreparation) {
          paperIntroCount += 1;
          assert.ok(
            d.entryPaperPreparation instanceof NapkinReturn,
            `${trickId}: entryPaperPreparation should be a NapkinReturn animation`
          );
          assert.ok(
            d.entryPaperPreparation.age > 0,
            `${trickId}: entryPaperPreparation animation advances age`
          );
        }

        const curPaddleRoot = d.coneWorldPos.clone();
        const curConeRoot = w.conePivot.getWorldPosition(new THREE.Vector3());
        const paddleStep = prevPaddleRoot.distanceTo(curPaddleRoot);
        const coneStep = prevConeRoot.distanceTo(curConeRoot);

        if (frame === 0) {
          if (paddleStep >= 0.06) {
            failures.push(`${trickId} (${scoopCount} scoops) first-frame paddle root move ${paddleStep.toFixed(4)}m >= 0.06m`);
          }
          if (w.conePivot.visible && coneStep >= 0.06) {
            failures.push(`${trickId} (${scoopCount} scoops) first-frame conePivot root move ${coneStep.toFixed(4)}m >= 0.06m`);
          }
        }

        if (paddleStep > 0.16) {
          failures.push(`${trickId} (${scoopCount} scoops) frame ${frame} paddle root move ${paddleStep.toFixed(4)}m > 0.16m`);
        }
        if (w.conePivot.visible && coneStep > 0.16) {
          failures.push(`${trickId} (${scoopCount} scoops) frame ${frame} conePivot root move ${coneStep.toFixed(4)}m > 0.16m`);
        }

        prevPaddleRoot.copy(curPaddleRoot);
        prevConeRoot.copy(curConeRoot);
      }
    }
  }

  assert.deepEqual(failures, []);

  assert.ok(
    reachedBaseIds.size > 20,
    `expected > 20 reached base IDs, got ${reachedBaseIds.size}`
  );
  assert.ok(
    armedTransitionCount > 0,
    'expected at least one trick entry to arm a TrickPoseTransition'
  );
  assert.ok(
    paperIntroCount > 0,
    'expected paper-wrapped trick entries to run entryPaperPreparation animation'
  );
});

test('Legacy napkinConeProp and heldNapkinCone paper proxies have hollow openEnded wafers and white vertices below rim .09, and reset clears joins', () => {
  const { w, d } = makeVendorFlourishFixture(1, 2);

  for (const [name, propGroup] of [
    ['napkinConeProp', w.napkinConeProp],
    ['heldNapkinCone', w.heldNapkinCone],
  ]) {
    assert.ok(propGroup, `${name} should exist on world`);
    assert.ok(propGroup.children.length >= 2, `${name} should have wafer and paper children`);

    const wafer = propGroup.children[0];
    assert.equal(wafer.geometry.type, 'ConeGeometry', `${name} wafer must be ConeGeometry`);
    assert.equal(
      wafer.geometry.parameters.openEnded,
      true,
      `${name} wafer ConeGeometry must have openEnded: true`
    );

    const paperChildren = propGroup.children.slice(1);
    const v = new THREE.Vector3();
    for (let idx = 0; idx < paperChildren.length; idx++) {
      const child = paperChildren[idx];
      child.updateMatrix();
      assert.equal(
        child.material.color.getHex(),
        0xffffff,
        `${name} child ${idx + 1} should be white paper`
      );
      const posAttr = child.geometry.attributes.position;
      let maxLocalY = -Infinity;
      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrix);
        if (v.y > maxLocalY) maxLocalY = v.y;
      }
      assert.ok(
        maxLocalY < 0.09,
        `${name} white paper child ${idx + 1} max local Y (${maxLocalY.toFixed(4)}) must stay below cone rim 0.09`
      );
    }
  }

  // Verify resetRound clears pending joins and paper states
  d.active = true;
  d.routine = ['SHAFT_SPIN_360', 'OVERHEAD_CROWN_DANGLE', 'FINAL_PISTACHIO_CATCH'];
  d._enterRoutineStep(1);
  assert.ok(d.pendingTrickEntry, 'pendingTrickEntry set after active _enterRoutineStep');

  d.resetRound(1, false);
  assert.equal(d.trickTransition, null, 'resetRound clears trickTransition');
  assert.equal(d.pendingTrickEntry, null, 'resetRound clears pendingTrickEntry');
  assert.equal(d._lastTrickPose, null, 'resetRound clears _lastTrickPose');
  assert.equal(d.pendingEntryPaper, null, 'resetRound clears pendingEntryPaper');
  assert.equal(d.entryPaperPreparation, null, 'resetRound clears entryPaperPreparation');
  assert.equal(d.paperReturnPose, null, 'resetRound clears paperReturnPose');
});
