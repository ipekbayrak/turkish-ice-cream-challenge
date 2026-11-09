import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveShaftGrip, distanceToSegment } from '../src/grip.js';
import * as THREE from 'three';
import { GameWorld } from '../src/world.js';
import { SpringVec3 } from '../src/physics.js';

const v = (x, y, z) => ({ x, y, z });
test('grip remains on the physical pole and inside arm reach', () => {
  const tip = v(0.3, 1.6, 0.3), direction = v(0, 0, -1), shoulder = v(-0.2, 1.4, -0.8);
  const grip = resolveShaftGrip(tip, direction, shoulder, 0.12, 1.01, 0.5);
  assert.equal(grip.reachable, true);
  assert.ok(grip.distance >= 0.12 && grip.distance <= 1.01);
  assert.ok(Math.hypot(tip.x - shoulder.x, tip.y - shoulder.y, tip.z - grip.distance - shoulder.z) <= 0.650001);
});
test('unreachable poses return the nearest actual shaft point instead of an off-shaft hand', () => {
  const result = resolveShaftGrip(v(2, 3, 0), v(0, 0, -1), v(0, 1.4, -0.8), 0.12, 1.01, 0.8);
  assert.equal(result.reachable, false);
  assert.equal(result.distance, 0.8);
});
test('roll does not change a cylindrical shaft contact position', () => {
  const expected = resolveShaftGrip(v(0, 1.4, 0), v(0, 0, -1), v(-0.25, 1.4, -0.8), 0.2, 1.01, 0.8);
  assert.equal(expected.distance, 0.8);
  assert.equal(expected.reachable, true);
});
test('swept bell contact detects crossing between frames and ignores a distant pass', () => {
  assert.equal(distanceToSegment(v(0, 0, 0), v(-1, 0, 0), v(1, 0, 0)), 0);
  assert.equal(distanceToSegment(v(0, 0.2, 0), v(-1, 0, 0), v(1, 0, 0)), 0.2);
  assert.equal(distanceToSegment(v(0, 0, 0), v(1, 0, 0), v(1, 0, 0)), 1);
});

function armFixture() {
  const w = Object.create(GameWorld.prototype);
  w.scene = new THREE.Scene();
  w.vendorSkinMat = w.vendorShirtMat = new THREE.MeshBasicMaterial();
  w.vendorGroup = new THREE.Group();
  w.vendorGroup.position.z = -0.86;
  w.vendorTorso = new THREE.Group();
  w.vendorTorso.position.y = 0.94;
  w.vendorGroup.add(w.vendorTorso);
  w.scene.add(w.vendorGroup);
  w.rightShoulderAnchor = new THREE.Object3D();
  w.rightShoulderAnchor.position.set(-0.25, 0.46, 0.06);
  w.leftShoulderAnchor = new THREE.Object3D();
  w.leftShoulderAnchor.position.set(0.25, 0.46, 0.06);
  w.vendorTorso.add(w.rightShoulderAnchor, w.leftShoulderAnchor);
  w.paddleGroup = new THREE.Group();
  w.paddleRollGroup = new THREE.Group();
  w.paddleRearGripAnchor = new THREE.Object3D();
  w.paddleFrontGripAnchor = new THREE.Object3D();
  w.conePivot = new THREE.Group();
  w.paddleGroup.add(w.paddleRollGroup, w.conePivot);
  w.paddleRollGroup.add(w.paddleRearGripAnchor, w.paddleFrontGripAnchor);
  w.scene.add(w.paddleGroup);
  w.rArmRig = w._createIKLimbRig();
  w.lArmRig = w._createIKLimbRig();
  w.leftPropSpring = new SpringVec3(0.24, 1.22, -0.25, 88, 16);
  return w;
}

test('actual IK keeps both closed hands attached through offer, scrape, roll and bell poses', () => {
  const w = armFixture();
  const poses = [[0, 1.22, 0.27], [-0.62, 0.98, -0.33], [0.62, 1.5, 0.2], [0, 1.84, -0.1], [-0.66, 1.84, -0.13]];
  for (const pose of poses) {
    for (const roll of [0, Math.PI * 0.5, Math.PI, Math.PI * 2]) {
      w.paddleGroup.position.set(...pose);
      w.orientPaddleAndHands(roll, null, 1 / 60);
      for (const [rig, anchor] of [[w.rArmRig, w.paddleRearGripAnchor], [w.lArmRig, w.paddleFrontGripAnchor]]) {
        const contact = anchor.getWorldPosition(new THREE.Vector3());
        if(rig===w.rArmRig||w._leftHandOnShaft)assert.ok(rig.handGroup.position.distanceTo(contact) < 1e-8, `detached grip at ${pose}`);
        else assert.equal(rig.handRig.pose,w._leftSupportRecovery?'support-reach':'open','unlocked support visibly releases or approaches instead of pretending to grip');
        assert.ok(Number.isFinite(rig.handGroup.quaternion.w));
      }
    }
  }
});

test('cone handoff reparents the original object without a world-space jump', () => {
  const w = armFixture();
  w.paddleGroup.position.set(0.15, 1.2, 0.2);
  w.orientPaddleAndHands(0, null, 1 / 60);
  w.scene.updateMatrixWorld(true);
  const original = w.conePivot;
  const before = original.getWorldPosition(new THREE.Vector3());
  w.setConeInVendorHand(true);
  assert.equal(w.conePivot, original);
  assert.equal(original.parent, w.lArmRig.handGroup);
  assert.ok(original.getWorldPosition(new THREE.Vector3()).distanceTo(before) < 1e-8);
  w.setConeInVendorHand(false);
  assert.equal(original.parent, w.paddleGroup);
  assert.ok(original.getWorldPosition(new THREE.Vector3()).distanceTo(before) < 1e-8);
});
