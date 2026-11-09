import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GameWorld } from '../src/world.js';
import { StallEffects } from '../src/stall-effects.js';
import { ICE_CREAM_FLAVORS } from '../src/flavors.js';

function makeTubMoldFixture() {
  const world = Object.create(GameWorld.prototype);
  world.scene = new THREE.Scene();
  world.waffleTexture = new THREE.Texture();
  world.outerWaffleTexture = new THREE.Texture();

  world.cartGroup = new THREE.Group();
  world.cartGroup.position.set(0, 0, -0.38);
  world.scene.add(world.cartGroup);

  world.basinDeckGroup = new THREE.Group();
  world.basinDeckGroup.position.set(0, 0.94, 0.04);
  world.basinDeckGroup.rotation.x = 0.22;
  world.cartGroup.add(world.basinDeckGroup);

  world.tubPositions = ICE_CREAM_FLAVORS.map((flav) => ({
    index: flav.index,
    id: flav.id,
    x: flav.xOffset,
    color: flav.colorHex,
    worldPos: new THREE.Vector3(flav.xOffset, 0.97, -0.33),
  }));
  world.tubMeshes = [];
  world.tubIceGroups = [];

  world.tubPositions.forEach((tub, idx) => {
    const bucketGroup = new THREE.Group();
    bucketGroup.position.set(tub.x, 0, 0.01);
    world.basinDeckGroup.add(bucketGroup);

    const iceGroup = new THREE.Group();
    iceGroup.position.y = 0.018;
    bucketGroup.add(iceGroup);

    const iceMat = new THREE.MeshStandardMaterial({ color: tub.color });
    const iceBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.082, 0.052, 22),
      iceMat
    );
    iceBase.position.y = -0.006;
    const iceDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.089, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
      iceMat
    );
    iceDome.position.y = 0.01;
    iceDome.scale.set(1, 0.72, 1);
    iceGroup.add(iceBase, iceDome);

    world.tubMeshes.push(iceDome, iceBase);
    world.tubIceGroups.push({
      group: iceGroup,
      baseY: 0.018,
      surfaceY: 0.01 + 0.089 * 0.72,
      fill: 1,
      churnEnergy: 0,
      phase: idx * 1.1,
    });
  });

  world._buildPaddleAndCones();
  world.lArmRig = { handGroup: new THREE.Group() };
  world.heldSocket = new THREE.Group();
  world.scene.add(world.lArmRig.handGroup, world.heldSocket);
  world.stallEffects = new StallEffects(world);
  world.scene.updateMatrixWorld(true);
  return world;
}

function collectMeshes(root) {
  const meshes = [];
  root.traverse((node) => {
    if (node.isMesh) meshes.push(node);
  });
  return meshes;
}

test('extracting and returning a tub mold transfers the same food model between carrier and exact tub seat', () => {
  const world = makeTubMoldFixture();
  const tub = world.tubIceGroups[0];
  const originalSurfaces = [...tub.group.children];
  assert.ok(originalSurfaces.length >= 2);
  assert.ok(originalSurfaces.every((m) => m.visible));

  world.beginTubMold(0);
  const transfer = world.tubMoldTransfer;
  assert.ok(transfer);
  const entry = transfer.active;
  assert.ok(entry);
  assert.equal(entry.index, 0);

  const foodModel = entry.model;
  assert.equal(foodModel.parent, world.giantBlockGroup);
  assert.equal(world.giantBlockGroup.visible, true);
  assert.equal(foodModel.visible, true);
  assert.equal(tub.fill, 0);
  assert.equal(tub.moldOut, true);
  assert.equal(tub.group.visible, false);
  assert.ok(!tub.group.children.includes(foodModel));
  assert.ok(originalSurfaces.every((m) => m.visible === false));

  const seat = world.getTubMoldSeat(0);
  world.returnTubMold(0);
  world.scene.updateMatrixWorld(true);

  assert.equal(transfer.active, null);
  assert.equal(world.giantBlockGroup.visible, false);
  assert.ok(!world.giantBlockGroup.children.includes(foodModel));
  assert.equal(foodModel.parent, tub.group);
  assert.equal(foodModel.visible, true);
  assert.equal(tub.fill, 1);
  assert.equal(tub.moldOut, false);
  assert.equal(tub.group.visible, true);
  assert.ok(originalSurfaces.every((m) => m.visible === false));

  const seatedWorldPos = foodModel.getWorldPosition(new THREE.Vector3());
  assert.ok(
    seatedWorldPos.distanceTo(seat) < 1e-6,
    `expected returned model at seat ${seat.toArray()}, got ${seatedWorldPos.toArray()}`
  );
});

test('re-extracting the same flavor reuses the identical model, meshes, and material without duplication', () => {
  const world = makeTubMoldFixture();
  world.beginTubMold(2);
  const firstEntry = world.tubMoldTransfer.entries.get(2);
  const firstModel = firstEntry.model;
  const firstMaterial = firstEntry.material;
  const firstMeshes = collectMeshes(firstModel);
  assert.ok(firstMeshes.length >= 4);

  world.returnTubMold(2);
  assert.equal(firstModel.parent, world.tubIceGroups[2].group);

  world.beginTubMold(2);
  const secondEntry = world.tubMoldTransfer.entries.get(2);
  const secondMeshes = collectMeshes(secondEntry.model);

  assert.equal(secondEntry, firstEntry);
  assert.equal(secondEntry.model, firstModel);
  assert.equal(secondEntry.material, firstMaterial);
  assert.equal(firstModel.parent, world.giantBlockGroup);
  assert.ok(!world.tubIceGroups[2].group.children.includes(firstModel));
  assert.deepEqual(secondMeshes, firstMeshes);
  assert.equal(world.tubMoldTransfer.entries.size, 1);
});

test('extracting another flavor preserves the returned first flavor model, seat, and color', () => {
  const world = makeTubMoldFixture();
  world.beginTubMold(0);
  const vanillaEntry = world.tubMoldTransfer.entries.get(0);
  const vanillaColor = ICE_CREAM_FLAVORS[0].colorHex;
  assert.equal(vanillaEntry.material.color.getHex(), vanillaColor);
  world.returnTubMold(0);

  world.stallEffects.setMold({
    mode: 'free',
    tubIndex: 3,
    position: new THREE.Vector3(0.2, 1.35, -0.1),
  });
  const berryEntry = world.tubMoldTransfer.entries.get(3);
  const berryColor = ICE_CREAM_FLAVORS[3].colorHex;

  assert.notEqual(berryEntry.model, vanillaEntry.model);
  assert.notEqual(berryEntry.material, vanillaEntry.material);
  assert.equal(berryEntry.material.color.getHex(), berryColor);
  assert.equal(berryEntry.model.parent, world.giantBlockGroup);

  assert.equal(vanillaEntry.model.parent, world.tubIceGroups[0].group);
  assert.equal(vanillaEntry.model.visible, true);
  assert.equal(world.tubIceGroups[0].group.visible, true);
  assert.equal(world.tubIceGroups[0].fill, 1);
  assert.equal(vanillaEntry.material.color.getHex(), vanillaColor);
  assert.ok(
    collectMeshes(vanillaEntry.model).every(
      (m) => m.material === vanillaEntry.material && m.material.color.getHex() === vanillaColor
    )
  );
});

test('caching across all tubs stays bounded to four flavor models and materials sharing geometry', () => {
  const world = makeTubMoldFixture();
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 4; i++) {
      world.beginTubMold(i);
      world.returnTubMold(i);
    }
  }

  const entries = world.tubMoldTransfer.entries;
  assert.equal(entries.size, 4);

  const models = new Set();
  const materials = new Set();
  const referenceGeometries = collectMeshes(entries.get(0).model).map((m) => m.geometry);
  assert.ok(referenceGeometries.length >= 4);

  for (let i = 0; i < 4; i++) {
    const entry = entries.get(i);
    assert.ok(entry);
    models.add(entry.model);
    materials.add(entry.material);
    assert.equal(entry.material.color.getHex(), ICE_CREAM_FLAVORS[i].colorHex);
    assert.equal(entry.model.parent, world.tubIceGroups[i].group);

    const meshes = collectMeshes(entry.model);
    assert.equal(meshes.length, referenceGeometries.length);
    meshes.forEach((mesh, idx) => {
      assert.equal(mesh.geometry, referenceGeometries[idx]);
      assert.equal(mesh.material, entry.material);
    });
  }

  assert.equal(models.size, 4);
  assert.equal(materials.size, 4);
});

test('entry and exit alignment matches the tilted bucket orientation and keeps seat position continuous', () => {
  const world = makeTubMoldFixture();
  const index = 1;
  const tub = world.tubIceGroups[index];
  const bucketParent = tub.group.parent;
  const seat = world.getTubMoldSeat(index);
  const bucketQuat = bucketParent.getWorldQuaternion(new THREE.Quaternion());
  const bucketUp = new THREE.Vector3(0, 1, 0).applyQuaternion(bucketQuat);

  world.beginTubMold(index);
  const model = world.tubMoldTransfer.active.model;

  // At the seat (entry/exit), carrier orientation aligns to the tilted bucket.
  world.giantBlockGroup.position.copy(seat);
  world.giantBlockGroup.quaternion.identity();
  world.scene.updateMatrixWorld(true);
  world.tubMoldTransfer.align();

  const carrierQuatAtSeat = world.giantBlockGroup.getWorldQuaternion(new THREE.Quaternion());
  assert.ok(
    1 - Math.abs(carrierQuatAtSeat.dot(bucketQuat)) < 1e-6,
    'carrier at seat must align with tilted bucket quaternion'
  );
  const modelPosAtCarrierSeat = model.getWorldPosition(new THREE.Vector3());
  const modelQuatAtCarrierSeat = model.getWorldQuaternion(new THREE.Quaternion());
  assert.ok(modelPosAtCarrierSeat.distanceTo(seat) < 1e-6);

  // Mid-extraction along the tilted bucket axis blends smoothly between tilted and free rotation.
  world.giantBlockGroup.position.copy(seat).addScaledVector(bucketUp, 0.34);
  world.giantBlockGroup.quaternion.identity();
  world.scene.updateMatrixWorld(true);
  world.tubMoldTransfer.align();
  const midQuat = world.giantBlockGroup.getWorldQuaternion(new THREE.Quaternion());
  assert.ok(midQuat.angleTo(bucketQuat) > 0.01 && midQuat.angleTo(bucketQuat) < 0.21);

  // Far above the bucket, align leaves the trick rotation untouched.
  const freeQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, -0.4, 0.3));
  world.giantBlockGroup.position.copy(seat).addScaledVector(bucketUp, 0.55);
  world.giantBlockGroup.quaternion.copy(freeQuat);
  world.scene.updateMatrixWorld(true);
  world.tubMoldTransfer.align();
  assert.ok(1 - Math.abs(world.giantBlockGroup.quaternion.dot(freeQuat)) < 1e-6);

  // Returning to the seat and docking preserves continuous world position and orientation.
  world.giantBlockGroup.position.copy(seat);
  world.giantBlockGroup.quaternion.identity();
  world.scene.updateMatrixWorld(true);
  world.tubMoldTransfer.align();
  world.returnTubMold(index);
  world.scene.updateMatrixWorld(true);

  const dockedPos = model.getWorldPosition(new THREE.Vector3());
  const dockedQuat = model.getWorldQuaternion(new THREE.Quaternion());
  assert.ok(dockedPos.distanceTo(modelPosAtCarrierSeat) < 1e-6);
  assert.ok(1 - Math.abs(dockedQuat.dot(modelQuatAtCarrierSeat)) < 1e-6);
});

test('interruption via StallEffects.clearMold or reset restores the active tub and hides the carrier', () => {
  const world = makeTubMoldFixture();
  world.stallEffects.setMold({
    mode: 'cone-cap',
    tubIndex: 1,
    scale: 0.9,
  });
  const entry = world.tubMoldTransfer.entries.get(1);
  assert.equal(world.tubMoldTransfer.active, entry);
  assert.equal(world.giantBlockGroup.parent, world.conePivot);
  assert.equal(world.tubIceGroups[1].fill, 0);
  assert.equal(world.tubIceGroups[1].moldOut, true);
  assert.equal(world.tubIceGroups[1].group.visible, false);

  world.stallEffects.clearMold();
  world.scene.updateMatrixWorld(true);

  assert.equal(world.tubMoldTransfer.active, null);
  assert.equal(world.giantBlockGroup.parent, world.scene);
  assert.equal(world.giantBlockGroup.visible, false);
  assert.equal(entry.model.parent, world.tubIceGroups[1].group);
  assert.equal(entry.model.visible, true);
  assert.equal(world.tubIceGroups[1].fill, 1);
  assert.equal(world.tubIceGroups[1].moldOut, false);
  assert.equal(world.tubIceGroups[1].group.visible, true);
  assert.ok(
    entry.model.getWorldPosition(new THREE.Vector3()).distanceTo(world.getTubMoldSeat(1)) < 1e-6
  );

  // Switching directly to another flavor mid-extraction also docks and restores the previous tub.
  world.beginTubMold(1);
  world.beginTubMold(3);
  assert.equal(world.tubMoldTransfer.active.index, 3);
  assert.equal(entry.model.parent, world.tubIceGroups[1].group);
  assert.equal(world.tubIceGroups[1].fill, 1);
  assert.equal(world.tubIceGroups[1].group.visible, true);

  world.stallEffects.clear();
  assert.equal(world.tubMoldTransfer.active, null);
  assert.equal(world.tubIceGroups[3].fill, 1);
  assert.equal(world.tubIceGroups[3].group.visible, true);
});
