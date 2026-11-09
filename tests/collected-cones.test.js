import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  COLLECTED_CONE_LIMIT,
  CONE_DEPOSIT_HAND,
  CollectedCones,
} from '../src/collected-cones.js';
import { buildConeRack } from '../src/cone-rack.js';
import { GameWorld } from '../src/world.js';

function createCanonicalWafer() {
  const outerConeGroup = new THREE.Group();
  outerConeGroup.name = 'canonical-outer-wafer';

  const coneGeo = new THREE.ConeGeometry(0.068, 0.24, 18, 1, true);
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xc98c45, roughness: 0.72 });
  const outerShell = new THREE.Mesh(coneGeo, coneMat);
  outerShell.name = 'wafer-shell';
  outerShell.rotation.x = Math.PI;
  outerConeGroup.add(outerShell);

  const rimGeo = new THREE.TorusGeometry(0.066, 0.005, 8, 18);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd79b52, roughness: 0.68 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.name = 'wafer-rim';
  rim.rotation.x = Math.PI / 2;
  outerConeGroup.add(rim);

  const cavityGeo = new THREE.CircleGeometry(0.062, 16);
  const cavityMat = new THREE.MeshStandardMaterial({ color: 0x2b170a, roughness: 0.95 });
  const cavity = new THREE.Mesh(cavityGeo, cavityMat);
  cavity.name = 'wafer-hollow-cavity';
  cavity.rotation.x = -Math.PI / 2;
  outerConeGroup.add(cavity);

  return {
    outerConeGroup,
    geometries: [coneGeo, rimGeo, cavityGeo],
    materials: [coneMat, rimMat, cavityMat],
  };
}

function createFixture({ withRack = true } = {}) {
  const scene = new THREE.Scene();
  const { outerConeGroup, geometries, materials } = createCanonicalWafer();
  const pivot = new THREE.Group();
  pivot.position.set(-0.18, 1.24, 0.14);
  pivot.rotation.set(0.32, -0.45, 0.21);
  pivot.add(outerConeGroup);
  scene.add(pivot);

  const cartGroup = new THREE.Group();
  cartGroup.name = 'ice-cream-cart';
  cartGroup.position.set(0, 0, -0.38);
  scene.add(cartGroup);

  let coneRack = null;
  if (withRack) {
    coneRack = buildConeRack(new THREE.Texture());
    coneRack.position.set(-0.55, 0.90, -0.55);
    cartGroup.add(coneRack);
  }

  const vendorGroup = new THREE.Group();
  vendorGroup.position.set(0, 0, -0.86);
  scene.add(vendorGroup);

  const handGroup = new THREE.Group();
  handGroup.position.set(0.28, 1.12, 0.16);
  handGroup.rotation.set(0.08, -0.14, 0.12);
  const pinky = new THREE.Group();
  pinky.position.set(0.03, -0.02, 0.01);
  pinky.rotation.set(-0.06, 0.11, -0.09);
  handGroup.add(pinky);
  vendorGroup.add(handGroup);

  outerConeGroup.position.set(0.04, -0.06, 0.09);
  outerConeGroup.rotation.set(-0.15, 0.28, -0.11);
  outerConeGroup.scale.set(0.92, 0.92, 0.92);
  scene.updateMatrixWorld(true);

  const world = {
    scene,
    cartGroup,
    ...(coneRack ? { coneRack } : {}),
    vendorGroup,
    outerConeGroup,
    lArmRig: { handGroup, handRig: { fingers: [{}, {}, {}, { tip: pinky }] } },
  };
  const collected = new CollectedCones(world);
  scene.updateMatrixWorld(true);
  return {
    scene,
    world,
    cartGroup,
    coneRack: world.coneRack,
    vendorGroup,
    pivot,
    handGroup,
    pinky,
    outerConeGroup,
    geometries,
    materials,
    collected,
  };
}

test('true capture preserves source world pose and leaves source visible and unmoved', () => {
  const { scene, coneRack, pinky, handGroup, outerConeGroup, collected } = createFixture();
  assert.equal(collected.root.parent, coneRack);
  assert.notEqual(collected.root.parent, pinky);
  assert.notEqual(collected.root.parent, handGroup);
  assert.equal(pinky.children.length, 0);

  const localPosBefore = outerConeGroup.position.clone();
  const localQuatBefore = outerConeGroup.quaternion.clone();
  const localScaleBefore = outerConeGroup.scale.clone();
  const worldPosBefore = outerConeGroup.getWorldPosition(new THREE.Vector3());
  const worldQuatBefore = outerConeGroup.getWorldQuaternion(new THREE.Quaternion());
  const worldScaleBefore = outerConeGroup.getWorldScale(new THREE.Vector3());

  const captured = collected.collect(outerConeGroup, 'round-1:trick-0');
  assert.equal(captured, true);
  assert.equal(collected.count, 1);
  assert.equal(collected.root.visible, true);

  // Source must NOT be hidden or moved by CollectedCones
  assert.equal(outerConeGroup.visible, true);
  assert.ok(outerConeGroup.position.equals(localPosBefore));
  assert.ok(outerConeGroup.quaternion.equals(localQuatBefore));
  assert.ok(outerConeGroup.scale.equals(localScaleBefore));

  scene.updateMatrixWorld(true);
  assert.ok(outerConeGroup.getWorldPosition(new THREE.Vector3()).distanceTo(worldPosBefore) < 1e-6);
  assert.ok(outerConeGroup.getWorldQuaternion(new THREE.Quaternion()).equals(worldQuatBefore));
  assert.ok(outerConeGroup.getWorldScale(new THREE.Vector3()).distanceTo(worldScaleBefore) < 1e-6);

  // Captured slot starts at exact source world pose
  const slot = collected.pool[0];
  assert.ok(slot);
  assert.equal(slot.mesh.visible, true);
  const cloneWorldPos = slot.mesh.getWorldPosition(new THREE.Vector3());
  const cloneWorldQuat = slot.mesh.getWorldQuaternion(new THREE.Quaternion());
  const cloneWorldScale = slot.mesh.getWorldScale(new THREE.Vector3());

  assert.ok(cloneWorldPos.distanceTo(worldPosBefore) < 1e-6);
  assert.ok(Math.abs(cloneWorldQuat.dot(worldQuatBefore)) > 1 - 1e-6);
  assert.ok(cloneWorldScale.distanceTo(worldScaleBefore) < 1e-6);
});

test('scene visual clone is the hollow canonical outer wafer sharing geometry and material references', () => {
  const { scene, outerConeGroup, geometries, materials, collected } = createFixture();

  // Create a full cone source with ice cream scoop children to verify clone uses canonical hollow outerConeGroup
  const fullConeWithScoops = new THREE.Group();
  fullConeWithScoops.position.set(0.12, 1.18, 0.22);
  const scoopMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xfff8e7 })
  );
  scoopMesh.name = 'ice-cream-scoop';
  fullConeWithScoops.add(scoopMesh);
  scene.add(fullConeWithScoops);
  scene.updateMatrixWorld(true);

  assert.equal(collected.collect(fullConeWithScoops, 'round-1:hollow-check'), true);
  const clone = collected.pool[0].mesh;

  const cloneMeshes = [];
  clone.traverse((node) => {
    if (node.isMesh) cloneMeshes.push(node);
  });
  const canonicalMeshes = [];
  outerConeGroup.traverse((node) => {
    if (node.isMesh) canonicalMeshes.push(node);
  });

  assert.equal(cloneMeshes.length, canonicalMeshes.length);
  assert.equal(cloneMeshes.some((m) => m.name === 'ice-cream-scoop'), false);

  for (let i = 0; i < canonicalMeshes.length; i++) {
    assert.notEqual(cloneMeshes[i], canonicalMeshes[i]);
    assert.equal(cloneMeshes[i].name, canonicalMeshes[i].name);
    assert.equal(cloneMeshes[i].geometry, geometries[i]);
    assert.equal(cloneMeshes[i].material, materials[i]);
  }
});

test('wafers travel with clearance arc into supported counter coneRack well and stay stationary when vendor moves', () => {
  const { scene, cartGroup, coneRack, vendorGroup, handGroup, pinky, outerConeGroup, collected } = createFixture();

  // Attached to coneRack on counter (-0.55, 0.90, -0.55 under cartGroup), at local well (-0.075, -0.21)
  assert.equal(collected.root.parent, coneRack);
  assert.equal(coneRack.parent, cartGroup);
  assert.ok(coneRack.position.equals(new THREE.Vector3(-0.55, 0.90, -0.55)));
  assert.ok(Math.abs(collected.root.position.x - (-0.075)) < 1e-6);
  assert.ok(Math.abs(collected.root.position.z - (-0.21)) < 1e-6);
  const existingWellTop = coneRack.userData.wellCenters[0];
  assert.ok(Math.abs(collected.root.position.x - existingWellTop.x) < 1e-6);
  assert.ok(Math.abs(collected.root.position.z - existingWellTop.z) < 1e-6);
  assert.ok(collected.root.position.y >= existingWellTop.y - 1e-6);
  assert.ok(CONE_DEPOSIT_HAND.z < 0, 'deposit hand target stays behind counter front');

  // If fixture lacks rack, CollectedCones creates an explicit rack anchored on the counter
  const fallbackScene = new THREE.Scene();
  const fallbackWorld = { scene: fallbackScene, outerConeGroup };
  const fallbackCollected = new CollectedCones(fallbackWorld);
  assert.ok(fallbackWorld.coneRack);
  assert.equal(fallbackCollected.root.parent, fallbackWorld.coneRack);
  assert.ok(fallbackWorld.coneRack.position.equals(new THREE.Vector3(-0.55, 0.90, -0.55)));
  assert.ok(Math.abs(fallbackCollected.root.position.x - (-0.075)) < 1e-6);
  assert.ok(Math.abs(fallbackCollected.root.position.z - (-0.21)) < 1e-6);

  collected.collect(outerConeGroup, 'round-1:deposit-0');
  collected.collect(outerConeGroup, 'round-1:deposit-1');
  const first = collected.pool[0];
  const second = collected.pool[1];
  assert.ok(first.target.y > 0);
  assert.ok(second.target.y > first.target.y, 'nested stack increments vertically in the well');
  assert.equal(first.target.x, 0);
  assert.equal(first.target.z, 0);

  // Mid-flight check (0.25s) has clearance arc above linear path
  collected.update(0.25);
  assert.equal(first.age, 0.25);
  const midY = first.mesh.position.y;
  const linearMidY = (first.from.y + first.target.y) * 0.5;
  assert.ok(midY > linearMidY + 0.05, 'collection trajectory has clearance arc');

  // Settle at 0.5s into counter-side coneRack well above existing nested stock
  collected.update(0.25);
  scene.updateMatrixWorld(true);
  assert.equal(first.age, 0.5);
  assert.ok(first.mesh.position.distanceTo(first.target) < 1e-6);
  assert.ok(second.mesh.position.distanceTo(second.target) < 1e-6);

  const firstInRack = coneRack.worldToLocal(first.mesh.getWorldPosition(new THREE.Vector3()));
  const secondInRack = coneRack.worldToLocal(second.mesh.getWorldPosition(new THREE.Vector3()));
  assert.ok(Math.abs(firstInRack.x - (-0.075)) < 1e-6);
  assert.ok(Math.abs(firstInRack.z - (-0.21)) < 1e-6);
  assert.ok(firstInRack.y > existingWellTop.y, 'first collected wafer rests above existing nested stock');
  assert.ok(secondInRack.y > firstInRack.y, 'second collected wafer nests above first');

  const settledWorldPos = first.mesh.getWorldPosition(new THREE.Vector3());
  const settledWorldQuat = first.mesh.getWorldQuaternion(new THREE.Quaternion());
  assert.ok(settledWorldPos.z < -0.5, 'stack is on the counter rack, never floating in front of counter');

  // outerConeGroup already points downward via child wafer-shell rotation.x = Math.PI; group itself stays upright
  const groupUp = new THREE.Vector3(0, 1, 0).applyQuaternion(settledWorldQuat);
  assert.ok(groupUp.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-6, 'outerConeGroup clone is upright, not inverted');
  const shell = first.mesh.getObjectByName('wafer-shell');
  const shellApexDir = new THREE.Vector3(0, 1, 0).applyQuaternion(shell.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(shellApexDir.distanceTo(new THREE.Vector3(0, -1, 0)) < 1e-6, 'cone tip points downward into the well');

  // Moving and rotating vendor body/hand/pinky leaves rack stack completely stationary
  vendorGroup.position.set(0.45, 0.15, -0.60);
  vendorGroup.rotation.set(0.25, -0.60, 0.18);
  handGroup.position.set(-0.30, 1.45, 0.35);
  handGroup.rotation.set(0.7, -0.5, 0.4);
  pinky.position.set(0.12, 0.08, -0.09);
  pinky.rotation.set(1.1, -0.8, 0.6);
  scene.updateMatrixWorld(true);

  assert.ok(first.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(settledWorldPos) < 1e-10);
  assert.ok(first.mesh.getWorldQuaternion(new THREE.Quaternion()).equals(settledWorldQuat));
});

test('accepts every unique key once only and ignores invisible or missing sources', () => {
  const { outerConeGroup, collected } = createFixture();

  assert.equal(collected.collect(null, 'null-source'), false);
  assert.equal(collected.count, 0);

  outerConeGroup.visible = false;
  assert.equal(collected.collect(outerConeGroup, 'trick-invisible'), false);
  assert.equal(collected.count, 0);
  assert.equal(collected.seen.has('trick-invisible'), false);
  assert.equal(collected.root.visible, false);

  // Once visible, the same key that was previously ignored on an invisible source is accepted
  outerConeGroup.visible = true;
  assert.equal(collected.collect(outerConeGroup, 'trick-invisible'), true);
  assert.equal(collected.count, 1);

  // Duplicate key is rejected
  assert.equal(collected.collect(outerConeGroup, 'trick-invisible'), false);
  assert.equal(collected.count, 1);
  assert.equal(collected.pool.length, 1);

  // Distinct key is accepted
  assert.equal(collected.collect(outerConeGroup, 'trick-second'), true);
  assert.equal(collected.count, 2);
  assert.equal(collected.pool.length, 2);
});

test('caps pooled meshes at COLLECTED_CONE_LIMIT and reset keeps shared resources undisposed for next round', () => {
  const { outerConeGroup, geometries, materials, collected } = createFixture();

  let disposedCount = 0;
  for (const res of [...geometries, ...materials]) {
    const origDispose = res.dispose.bind(res);
    res.dispose = () => {
      disposedCount++;
      return origDispose();
    };
  }

  const totalCaptures = COLLECTED_CONE_LIMIT + 7;
  for (let i = 0; i < totalCaptures; i++) {
    assert.equal(collected.collect(outerConeGroup, `key-${i}`), true);
    collected.update(0.5);
  }

  assert.equal(collected.count, totalCaptures);
  assert.equal(collected.pool.length, COLLECTED_CONE_LIMIT);
  assert.equal(collected.root.children.length, COLLECTED_CONE_LIMIT);

  collected.reset();
  assert.equal(disposedCount, 0, 'reset must never dispose shared canonical wafer geometries or materials');
  assert.equal(outerConeGroup.visible, true);
  assert.equal(collected.count, 0);
  assert.equal(collected.seen.size, 0);
  assert.equal(collected.root.visible, false);
  for (const slot of collected.pool) {
    assert.equal(slot.mesh.visible, false);
  }

  // Next round accepts previously used key and reuses existing pool slot
  assert.equal(collected.collect(outerConeGroup, 'key-0'), true);
  assert.equal(collected.count, 1);
  assert.equal(collected.pool.length, COLLECTED_CONE_LIMIT);
  assert.equal(collected.root.visible, true);
  assert.equal(collected.pool[0].mesh.visible, true);
});

test('GameWorld.prototype.collectEmptyCone delegates to CollectedCones and take(target) travels without duplicate visuals', () => {
  assert.equal(typeof GameWorld.prototype.collectEmptyCone, 'function');
  const { scene, outerConeGroup, collected } = createFixture();
  const worldStub = Object.assign(Object.create(GameWorld.prototype), {
    scene,
    outerConeGroup,
    decoyCone: outerConeGroup,
    coneGroup: outerConeGroup,
    collectedCones: collected,
  });

  const first = worldStub.collectEmptyCone(outerConeGroup, 'world-trick-1');
  assert.equal(first, true);
  assert.equal(collected.count, 1);
  assert.equal(outerConeGroup.visible, true);

  const duplicate = worldStub.collectEmptyCone(outerConeGroup, 'world-trick-1');
  assert.equal(duplicate, false);
  assert.equal(collected.count, 1);

  // take(target) decrements stock, animates over 0.30s into target without duplicate visible item, and restores target on arrival
  worldStub.collectEmptyCone(outerConeGroup, 'world-trick-2');
  collected.update(0.5);
  assert.equal(collected.count, 2);

  const target = new THREE.Group();
  target.position.set(0.05, 1.22, 0.27);
  target.rotation.set(0.1, -0.2, 0.05);
  target.visible = true;
  scene.add(target);
  scene.updateMatrixWorld(true);

  const slot = collected.pool[1];
  const startWorldPos = slot.mesh.getWorldPosition(new THREE.Vector3());
  assert.equal(collected.take(target), true);
  assert.equal(collected.count, 1);
  assert.equal(target.visible, false, 'target is hidden while rack wafer is in flight so no duplicate is visible');
  assert.equal(slot.mesh.visible, true, 'traveling rack wafer remains visible during transit');
  assert.equal(slot.mesh.parent, scene);
  assert.equal(collected.take(target), false, 'cannot take a second wafer while reuse animation is active');

  collected.update(0.15);
  assert.equal(target.visible, false);
  assert.equal(slot.mesh.visible, true);
  assert.ok(slot.mesh.position.distanceTo(startWorldPos) > 0.05);
  assert.ok(slot.mesh.position.distanceTo(target.position) > 0.05);

  // Move target before arrival to verify take tracks the actual target pose
  target.position.set(0.08, 1.25, 0.24);
  scene.updateMatrixWorld(true);

  collected.update(0.15);
  assert.equal(collected.reusing, null);
  assert.equal(target.visible, true, 'original target is restored at physical arrival');
  assert.equal(slot.mesh.visible, false, 'transit clone hides at physical arrival');
  assert.equal(slot.mesh.parent, collected.root);

  // Mid-reuse reset restores slot to root and clears reusing state safely
  assert.equal(collected.take(target), true);
  assert.equal(collected.count, 0);
  collected.update(0.10);
  collected.reset();
  assert.equal(collected.reusing, null);
  assert.equal(collected.count, 0);
  assert.equal(collected.root.visible, false);
  assert.equal(collected.pool[0].mesh.visible, false);
  assert.equal(collected.pool[0].mesh.parent, collected.root);
});

test('the receiving hand stays in cone pose while the stock wafer travels to its hidden destination',async()=>{
 const {makeVendorFlourishFixture}=await import('./vendor-flourish-fixture.js');const {w}=makeVendorFlourishFixture(1,2);
 w.heldEmptyCone.visible=true;w.collectEmptyCone(w.heldEmptyCone,'arrival');w.collectedCones.update(1);w.heldEmptyCone.visible=false;
 w.handoffOuterCone('vendor',true);w.stallEffects.update(1);assert.equal(w.reuseEmptyCone(w.outerConeGroup),true);
 for(let i=0;i<12;i++){w.orientPaddleAndHands(0,null,1/60);assert.equal(w.outerConeGroup.visible,false);assert.equal(w.lArmRig.handRig.pose,'cone');assert.equal(w._leftHandOnShaft,false);w.collectedCones.update(1/60);}
});
