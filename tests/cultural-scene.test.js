import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CulturalScene, CULTURAL_MODEL_KINDS } from '../src/cultural-scene.js';
import { CULTURAL_DETAILS } from '../src/cultural-details.js';
import { VENUES } from '../src/venues.js';

function fixture(width = 390, height = 844) {
  const camera = new THREE.PerspectiveCamera(width / height < .75 ? 67.26 : 54, width / height, .05, 40);
  camera.position.set(0, 1.52, 1.05); camera.lookAt(0, 1.28, -.55);
  if (width / height < .75) camera.position.set(0, 1.5, 1.12);
  camera.updateMatrixWorld(true);
  const lanterns = [new THREE.Group(), new THREE.Group()]; lanterns[1].visible = false;
  const world = { scene: new THREE.Scene(), camera, baseCamPos: camera.position.clone(), touristHand: { visible: true }, lanterns: lanterns.map((group) => ({ group })) };
  const scene = new CulturalScene(world, CULTURAL_DETAILS, { textureFactory: (item, kind) => new THREE.Texture({ id: item.id, kind }), viewport: () => ({ width, height }) });
  return { world, scene, width, height };
}
const advance = (scene, seconds = .9, fps = 60) => { for (let i = 0; i < Math.ceil(seconds * fps); i++) scene.update(1 / fps); };
const snapshot = (object) => ({ parent: object.parent, position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone() });
function assertRestored(object, original) {
  assert.equal(object.parent, original.parent);
  assert.ok(object.position.distanceTo(original.position) < 1e-9);
  assert.ok(object.quaternion.angleTo(original.quaternion) < 1e-7);
  assert.ok(object.scale.distanceTo(original.scale) < 1e-9);
}
function mechanismState(record) {
  const state = [...record.art.position.toArray(), ...record.art.quaternion.toArray(), ...record.art.scale.toArray()];
  for (const part of Object.values(record.motion)) if (part?.isObject3D) part.traverse((node) => state.push(...node.position.toArray(), ...node.quaternion.toArray()));
  return JSON.stringify(state);
}

test('all 108 catalog IDs have real finite geometry, while exactly eighteen belong to each visible venue', () => {
  const { scene } = fixture();
  assert.equal(scene.records.size, 108);
  assert.equal(new Set([...scene.records.values()].map((record) => record.root)).size, 108);
  for (const item of CULTURAL_DETAILS) {
    assert.ok(CULTURAL_MODEL_KINDS.includes(item.modelKind));
    const record = scene.records.get(item.id); assert.equal(record.root.userData.culturalId, item.id);
    const bounds = new THREE.Box3().setFromObject(record.root), size = bounds.getSize(new THREE.Vector3());
    assert.ok(Number.isFinite(size.x + size.y + size.z)); assert.ok(Math.max(size.x, size.y, size.z) > .1);
    let meshes = 0; record.root.traverse((node) => { if (node.isMesh) meshes++; }); assert.ok(meshes >= 1);
  }
  for (const venue of VENUES) {
    scene.setVenue(venue);
    assert.deepEqual([...scene.venueGroups].filter(([, group]) => group.visible).map(([id]) => id), [venue.id]);
    const stats = scene.getStats(); assert.equal(stats.activeCount, 18); assert.ok(stats.activeMeshes <= 200); assert.ok(stats.activeTriangles < 90000);
  }
  scene.dispose();
});

test('every venue has six visible, selectable objects in each phone inspection section', () => {
  const { scene, width, height } = fixture(); scene.setExplorationMode(true);
  for (const venue of VENUES) for (let section = 0; section < 3; section++) {
    scene.setVenue(venue); scene.setSection(section); advance(scene);
    const targets = scene.getDiscoveryTargets(); assert.equal(targets.length, 6);
    for (const target of targets) {
      assert.equal(target.visible, true, `${venue.id}/${section}/${target.id}`);
      assert.ok(target.x >= 0 && target.x <= width); assert.ok(target.y >= 0 && target.y <= height);
      assert.equal(scene.pick(target.x / width, target.y / height)?.id, target.id);
    }
    assert.ok([...scene.records.values()].every((record) => !record.marker.visible), 'DOM hotspots do not get duplicate 3D markers');
  }
  scene.dispose();
});

test('focus moves the original object continuously and restores parent, position and scale exactly', () => {
  const { scene, world } = fixture(); scene.setExplorationMode(true); advance(scene);
  const record = [...scene.records.values()].find((r) => r.item.venueId === scene.venueId && r.section === 0);
  const original = snapshot(record.root), originalWorld = record.root.getWorldPosition(new THREE.Vector3());
  const geometries = []; record.root.traverse((node) => { if (node.isMesh) geometries.push(node.geometry); });
  scene.focusDiscovery(record.item.id);
  assert.ok(record.root.getWorldPosition(new THREE.Vector3()).distanceTo(originalWorld) < 1e-8);
  advance(scene, .6); assert.equal(record.root.parent, scene.focusRoot);
  assert.ok(!original.parent.children.includes(record.root));
  const laterGeometry = []; record.root.traverse((node) => { if (node.isMesh) laterGeometry.push(node.geometry); }); assert.deepEqual(laterGeometry, geometries);
  scene.clearFocus(); advance(scene, .6); assertRestored(record.root, original);
  scene.setExplorationMode(false); advance(scene, .8); assert.equal(world.touristHand.visible, true);
  scene.dispose();
});

test('quick close, reopen and immediate game reset retain the original game camera and hand visibility', () => {
  const { scene, world } = fixture(); const original = snapshot(world.camera), originalFov = world.camera.fov;
  scene.setExplorationMode(true); scene.setSection(1); advance(scene);
  scene.setExplorationMode(false); advance(scene, .12);
  scene.setExplorationMode(true); advance(scene, .2); scene.reset();
  assert.ok(world.camera.position.distanceTo(original.position) < 1e-9);
  assert.ok(world.camera.quaternion.angleTo(original.quaternion) < 1e-7);
  assert.equal(world.camera.fov, originalFov); assert.equal(world.touristHand.visible, true);
  scene.dispose();
});

test('inspection exit after rotation restores current viewport FOV instead of a stale portrait lens', () => {
  const { scene, world } = fixture(); scene.setExplorationMode(true); advance(scene);
  world.camera.aspect = 1280 / 720; world.baseCamPos.set(0, 1.52, 1.05);
  scene.setExplorationMode(false); advance(scene, .8);
  assert.equal(world.camera.fov, 54); assert.equal(world.camera.aspect, 1280 / 720);
  assert.ok(world.camera.position.distanceTo(world.baseCamPos) < 1e-9);
  scene.dispose();
});

test('upper cabinet supports both rows and peripheral lantern visibility restores on exit and venue reset', () => {
  const { scene, world } = fixture(); scene.setExplorationMode(true); scene.setSection(2); advance(scene);
  assert.ok(world.lanterns.every(({ group }) => !group.visible));
  const upperRecords = [...scene.records.values()].filter((record) => record.item.venueId === scene.venueId && record.section === 2);
  for (const record of upperRecords) {
    // Check real support surfaces, independent of whether boards share a draw.
    for(const dx of[-.08,0,.08]){
      const origin=record.anchor.position.clone().add(new THREE.Vector3(dx,.02,0));
      const hit=new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0),0,.08).intersectObject(scene.furniture,true)[0];
      assert.ok(hit&&Math.abs(hit.point.y-(record.anchor.position.y-.014))<2e-6,record.item.id);
    }
  }
  const focused = upperRecords[0]; const original = snapshot(focused.root);
  scene.focusDiscovery(focused.item.id); advance(scene, .4); scene.setVenue(VENUES[1]);
  assertRestored(focused.root, original);
  scene.reset(); assert.equal(world.lanterns[0].group.visible, true); assert.equal(world.lanterns[1].group.visible, false);
  scene.dispose();
});

test('object-specific mechanisms animate without rebuilding meshes, then reset with their exhibit', () => {
  const { scene } = fixture(); scene.setExplorationMode(true);
  for (const variant of ['string-top', 'pouch', 'pinwheel', 'carved-chest', 'karagoz', 'telegraph', 'ferris-wheel', 'acrobat', 'zoetrope', 'funicular']) {
    const record = [...scene.records.values()].find((entry) => entry.item.variant === variant);
    scene.setVenue(record.item.venueId); scene.setSection(record.section); advance(scene);
    const ids = []; record.root.traverse((node) => { if (node.isMesh) ids.push(`${node.uuid}:${node.geometry.uuid}`); });
    const beforeMotion = mechanismState(record); let motionObserved = false;
    scene.focusDiscovery(record.item.id);
    for (let i = 0; i < 54; i++) { scene.update(1 / 60); if (mechanismState(record) !== beforeMotion) motionObserved = true; }
    const after = []; record.root.traverse((node) => { if (node.isMesh) after.push(`${node.uuid}:${node.geometry.uuid}`); }); assert.deepEqual(after, ids);
    const moving = Object.values(record.motion).some(Boolean); assert.ok(moving, variant);
    assert.ok(motionObserved, variant);
    scene.restoreFocusedImmediately();
    assert.ok(Math.abs(record.art.rotation.x - record.restArtRotation.x) + Math.abs(record.art.rotation.y - record.restArtRotation.y) + Math.abs(record.art.rotation.z - record.restArtRotation.z) < 1e-9);
    assert.ok(record.art.scale.distanceTo(record.restArtScale) < 1e-9);
  }
  scene.dispose();
});

test('discovery state does not create items and disposal releases geometry once with an active closeup', () => {
  const { scene, world } = fixture(); const id = CULTURAL_DETAILS[0].id;
  scene.setDiscovered([id, 'invented-detail']); assert.equal(scene.discovered.size, 1); assert.equal(scene.records.size, 108);
  scene.setExplorationMode(true); advance(scene); scene.focusDiscovery(id); advance(scene, .2);
  const geometry = scene.records.get(id).root.children[0].children.find((node) => node.isMesh)?.geometry;
  let disposed = 0; geometry.addEventListener('dispose', () => disposed++);
  scene.dispose(); scene.dispose();
  assert.equal(disposed, 1); assert.equal(scene.records.size, 0); assert.equal(scene.venueGroups.size, 0);
  assert.ok(!world.scene.children.includes(scene.root)); assert.ok(!world.scene.children.includes(scene.focusRoot));
  assert.equal(scene.pick(.5, .5), null);
});

test('drag rotates the same inspected object around its center and does not snap back', () => {
  const {scene}=fixture();scene.setExplorationMode(true);advance(scene);
  const record=scene.records.get('simit-ring');const original=snapshot(record.root);
  scene.focusDiscovery(record.item.id);advance(scene,.6);
  const before=record.root.quaternion.clone(),center=scene.focusRoot.worldToLocal(record.root.localToWorld(record.center.clone()));
  assert.equal(scene.beginRotation(7),true);
  assert.equal(scene.rotateBy(95,42,.08,7),true);advance(scene,.1);
  assert.ok(record.root.quaternion.angleTo(before)>.8);
  assert.ok(scene.focusRoot.worldToLocal(record.root.localToWorld(record.center.clone())).distanceTo(center)<1e-8,'inspection center stays fixed');
  assert.equal(scene.rotateBy(20,0,.02,8),false,'another pointer cannot rotate it');
  scene.endRotation(7,true);const settled=record.root.quaternion.clone();advance(scene,1);
  assert.ok(record.root.quaternion.angleTo(settled)<1e-7,'idle pose does not overwrite manual rotation');
  scene.clearFocus();advance(scene,.7);assertRestored(record.root,original);scene.dispose();
});

test('rotation inertia is bounded and frame-independent, and cancellation stops it', () => {
  const poses=[30,60,120].map(fps=>{
    const {scene}=fixture();scene.setExplorationMode(true);advance(scene);scene.focusDiscovery('simit-ring');advance(scene,.6);
    scene.beginRotation(1);scene.rotateBy(44,-25,.06,1);scene.endRotation(1);advance(scene,.6,fps);
    const q=scene.focus.rotation.clone();assert.ok(scene.focus.velocity.length()<.08);
    scene.beginRotation(2);scene.rotateBy(10,0,.016,2);scene.endRotation(2,true);const frozen=scene.focus.rotation.clone();advance(scene,.5,fps);
    assert.ok(scene.focus.rotation.angleTo(frozen)<1e-7);scene.dispose();return q;
  });
  assert.ok(poses[0].angleTo(poses[1])<1e-6);assert.ok(poses[1].angleTo(poses[2])<1e-6);
});

test('rotating then changing venue or starting a round restores the exact original object', () => {
  const {scene}=fixture();scene.setExplorationMode(true);advance(scene);
  const record=scene.records.get('simit-ring'),original=snapshot(record.root);
  scene.focusDiscovery(record.item.id);advance(scene,.6);scene.beginRotation(1);scene.rotateBy(160,120,.05,1);
  scene.setVenue(VENUES[1]);assertRestored(record.root,original);assert.equal(scene.focus,null);
  scene.setVenue(VENUES[0]);scene.focusDiscovery(record.item.id);advance(scene,.6);scene.beginRotation(1);scene.rotateBy(-100,-70,.03,1);scene.reset();
  assertRestored(record.root,original);assert.equal(scene.focus,null);assert.equal(scene.beginRotation(9),false);scene.dispose();
});

test('material detail stays shared and all surface maps dispose exactly once', () => {
  const {scene}=fixture();const maps=new Set();
  for(const material of Object.values(scene.materials))for(const key of ['map','roughnessMap','bumpMap'])if(material[key])maps.add(material[key]);
  assert.ok(scene.materials.wood.map);assert.ok(scene.materials.copper.bumpMap);assert.ok(scene.materials.porcelain.clearcoat>.4);
  assert.equal(scene.materials.glass.transparent,true);assert.ok(scene.materials.glass.opacity<.5);
  assert.ok(maps.size<=4,'surfaces share a small texture set across all 108 models');
  const counts=new Map([...maps].map(texture=>[texture,0]));for(const texture of maps)texture.addEventListener('dispose',()=>counts.set(texture,counts.get(texture)+1));
  scene.dispose();scene.dispose();for(const count of counts.values())assert.equal(count,1);
});
