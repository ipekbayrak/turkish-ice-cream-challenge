import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { perfSceneFixture, sceneStats } from './perf-scene-stats.mjs';
import { VENUES } from '../src/venues.js';
import { VendorArmSolver } from '../src/vendor-arm-solver.js';

test('CulturalScene attaches only the active venue group to root while preserving venue switching and disposal', () => {
  const w = perfSceneFixture();
  const cs = w.culturalScene;

  // Only furniture + 1 active venue group should be attached to cs.root
  const attachedVenueGroups = cs.root.children.filter((c) => c.name.startsWith('culture-'));
  assert.equal(attachedVenueGroups.length, 1, 'only active venue group should be in scene graph');
  assert.equal(attachedVenueGroups[0].name, `culture-${VENUES[0].id}`);

  // Matrix world traversal count should be < 1050 instead of 1698
  let traversed = 0;
  const origUpdate = THREE.Object3D.prototype.updateMatrixWorld;
  THREE.Object3D.prototype.updateMatrixWorld = function (...args) {
    traversed++;
    return origUpdate.apply(this, args);
  };
  try {
    w.scene.updateMatrixWorld(true);
  } finally {
    THREE.Object3D.prototype.updateMatrixWorld = origUpdate;
  }
  assert.ok(traversed < 1050, `expected < 1050 matrix updates, got ${traversed}`);

  // Switching venues swaps the attached group cleanly
  for (const venue of VENUES) {
    cs.setVenue(venue);
    const current = cs.root.children.filter((c) => c.name.startsWith('culture-'));
    assert.equal(current.length, 1);
    assert.equal(current[0].name, `culture-${venue.id}`);
    assert.equal(current[0].visible, true);
  }

  // Disposing releases geometries across all 6 venues (not just the currently attached one)
  const sampleFromVenue0 = [...cs.records.values()].find((r) => r.item.venueId === VENUES[0].id);
  const mesh0 = sampleFromVenue0.root.children[0].children.find((n) => n.isMesh);
  let disposed0 = 0;
  mesh0.geometry.addEventListener('dispose', () => disposed0++);
  cs.dispose();
  assert.equal(disposed0, 1, 'detached venue geometries must still dispose once');
});

test('StallEffects skips redundant napkin vertex normal recomputation when wrapped and stationary', () => {
  const w = perfSceneFixture();
  const fx = w.stallEffects;
  w.setServingNapkin({ owner: 'cone', peel: 0, visible: true });

  // First update settles the surface
  fx.update(1 / 60);
  let normalCalls = 0;
  const origNormals = fx.napkinGeometry.computeVertexNormals;
  fx.napkinGeometry.computeVertexNormals = function (...args) {
    normalCalls++;
    return origNormals.apply(this, args);
  };
  try {
    for (let i = 0; i < 30; i++) fx.update(1 / 60);
    assert.equal(normalCalls, 0, 'stationary wrapped napkin (peel=0) should not recompute normals every frame');

    // Peeling the napkin must recompute normals
    w.setServingNapkin({ owner: 'cone', peel: 0.6, visible: true });
    fx.update(1 / 60);
    assert.ok(normalCalls > 0, 'peeling napkin must update surface normals');
  } finally {
    fx.napkinGeometry.computeVertexNormals = origNormals;
  }
});

test('buildShopInterior batches static wall and trim meshes while keeping instanced floor and walkSpace', () => {
  const w = perfSceneFixture();
  const stats = sceneStats(w.shopInterior, w.camera);
  assert.ok(stats.meshes <= 5, `expected batched shop interior meshes <= 5, got ${stats.meshes}`);
  assert.ok(w.shopInterior.getObjectByName('shop-tiled-floor')?.isInstancedMesh);
  assert.ok(w.shopInterior.userData.walkSpace);
});

test('orientPaddleAndHands avoids redundant duplicate grip solves when cone is on pole and above counter clearance', () => {
  const w = perfSceneFixture();
  w.updateIceCreamScoops(2);
  w.updateServingLayout(1);
  w.paddleGroup.position.set(0, 1.32, 0.24);

  // Warm up one frame so initial conePivot position is settled at (0, 0.02, 0)
  for (let i = 0; i < 20; i++) {
    w.orientPaddleAndHands(0.1, null, 1 / 60, 0, 0);
  }

  let gripCalls = 0;
  const origResolve = w._resolveVendorGrips;
  w._resolveVendorGrips = function (...args) {
    gripCalls++;
    return origResolve.apply(this, args);
  };
  try {
    w.orientPaddleAndHands(0.12, null, 1 / 60, 0, 0);
    assert.equal(gripCalls, 1, `expected 1 _resolveVendorGrips call in orientPaddleAndHands, got ${gripCalls}`);
  } finally {
    w._resolveVendorGrips = origResolve;
  }

  assert.ok(VendorArmSolver);
});
