import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { OrderFlow, ORDER_DWELL_SECONDS, ORDER_MOVE_PIXELS } from '../src/order-flow.js';
import { makeEncounterFixture } from './encounter-fixture.js';
import { EncounterDriver } from './encounter-driver.js';

const advanceOrder = (flow, seconds, input = { active: false, flavor: null }) => {
  for (let i = 0; i < Math.round(seconds * 100); i++) flow.update(0.01, input);
};
const holdFlavor = (flavor, epoch = 1, pointerX = 40 + (flavor ?? 0) * 45, pointerY = 300) => ({
  active: true,
  flavor,
  epoch,
  pointerX,
  pointerY,
});

test('Phase 6.1: OrderFlow confirms automatically at capacity even when desktop mouse continues moving', () => {
  let completedOrder = null;
  const flow = new OrderFlow({
    onComplete: (order) => {
      completedOrder = order;
    },
  });
  flow.start({ greetingSeconds: 0, maxScoops: 3 });
  advanceOrder(flow, 0.01);

  for (let i = 0; i < 3; i++) {
    advanceOrder(flow, ORDER_DWELL_SECONDS, holdFlavor(i, i + 1));
  }
  assert.equal(flow.count, 3);
  assert.equal(flow.snapshot.capacityReached, true);

  // Simulate desktop user continuing to move the mouse across the screen after reaching capacity
  let pointerX = 120;
  for (let step = 0; step < 65; step++) {
    pointerX += ORDER_MOVE_PIXELS + 3;
    flow.update(0.01, {
      active: true,
      flavor: step % 2 === 0 ? 1 : null,
      epoch: 3,
      pointerX,
      pointerY: 300 + (step % 5) * 4,
    });
  }

  assert.equal(flow.phase, 'confirm', 'order should enter confirm phase at capacity despite mouse movement');
  advanceOrder(flow, 0.56);
  assert.deepEqual(completedOrder, { count: 3, flavors: [0, 1, 2] });
});

test('Phase 6.2: updateOrderPresentation smoothly slerps vendor left hand and keeps wrist attached to arm IK', () => {
  const { w } = makeEncounterFixture();
  w.updateOrderPresentation({ phase: 'flavor', flavorIndex: 0, count: 1 }, 1 / 60, 0.1);
  const prevQuat = w.lArmRig.handGroup.quaternion.clone();

  // Switch hovered tub from far-left (0) to far-right (3) in one 60 FPS frame
  w.updateOrderPresentation({ phase: 'flavor', flavorIndex: 3, count: 1 }, 1 / 60, 0.116);
  const nextQuat = w.lArmRig.handGroup.quaternion.clone();
  const angleStep = prevQuat.angleTo(nextQuat);

  assert.ok(angleStep < 0.35, `left hand quaternion jumped ${angleStep.toFixed(3)} rad in 1 frame during order presentation`);

  const wristAnchorWorld = w.lArmRig.handRig.wristAnchor.getWorldPosition(new THREE.Vector3());
  const armWristDist = w.lArmRig.armPose.wrist.distanceTo(wristAnchorWorld);
  assert.ok(armWristDist < 0.01, `left arm wrist detached from hand wristAnchor by ${armWristDist.toFixed(4)}m`);
});

test('Phase 6.3: scoopJiggleSpring is well-damped and does not induce high-frequency pitch oscillation on paddle', () => {
  const { w } = makeEncounterFixture();
  w.updateIceCreamScoops(6, true);
  w.paddleGroup.position.set(0, 1.24, 0.12);
  w.prevConePos.copy(w.paddleGroup.position);

  let signChanges = 0;
  let prevPitch = 0;
  let maxPitch = 0;
  for (let frame = 0; frame < 60; frame++) {
    if (frame < 4) w.paddleGroup.position.z += 0.08;
    w.updateEnvironmentAnimations(frame / 60, 1 / 60, 0, 0, null, 0);
    const pitch = w.scoopStackGroup.rotation.x;
    maxPitch = Math.max(maxPitch, Math.abs(pitch));
    if (frame > 1 && Math.abs(pitch) > 0.005 && Math.sign(pitch) !== Math.sign(prevPitch) && prevPitch !== 0) {
      signChanges++;
    }
    if (Math.abs(pitch) > 0.005) prevPitch = pitch;
  }

  assert.ok(maxPitch > 0.01 && maxPitch <= 0.08, `expected bounded scoop pitch in [0.01, 0.08], got ${maxPitch.toFixed(4)}`);
  assert.ok(signChanges <= 1, `expected overdamped scoop jiggle with at most 1 sign change, got ${signChanges}`);
});

test('Phase 6.4: 60 FPS kinematic continuity across trick catalog has no large 1-frame wrist or torso jumps', () => {
  const f = makeEncounterFixture({ Driver: EncounterDriver });
  const V = () => new THREE.Vector3();
  const testIds = [
    'CUSTOMER_SCOOP_SHOW',
    'VERTICAL_WINDMILL',
    'HAND_INVERTED_OFFER',
    'GIANT_BLOCK_TEASE',
    'SCOOP_CONE_RELAY',
    'FINAL_PISTACHIO_CATCH',
  ];

  for (const id of testIds) {
    f.reset({ id, vendor: 0, count: 6, pace: 1, seed: 71931 });
    let prevRW = null;
    let prevTorsoY = null;
    let maxDRW = 0;
    let maxDTY = 0;

    for (let frame = 0; frame < 900; frame++) {
      f.tick(1 / 60);
      const w = f.w;
      const rw = w.rArmRig.handRig.wristAnchor.getWorldPosition(V());
      const ty = w.vendorTorso.rotation.y;

      if (frame > 2 && prevRW) {
        const dRW = rw.distanceTo(prevRW);
        const dTY = Math.abs(ty - prevTorsoY);
        if (dRW > maxDRW) maxDRW = dRW;
        if (dTY > maxDTY) maxDTY = dTY;
      }
      prevRW = rw;
      prevTorsoY = ty;

      if (f.outcome === 'MASTER_CATCH' || (id !== 'FINAL_PISTACHIO_CATCH' && f.d.routineIndex >= 1)) {
        break;
      }
    }

    assert.ok(maxDRW < 0.16, `${id}: 1-frame right wrist jump ${maxDRW.toFixed(3)}m exceeds 0.16m limit`);
    assert.ok(maxDTY < 0.12, `${id}: 1-frame torso yaw jump ${maxDTY.toFixed(3)} rad exceeds 0.12 rad limit`);
  }
});
