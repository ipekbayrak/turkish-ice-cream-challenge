import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { narrativeReveals, buildStallDecor } from '../src/stall-decor.js';
import { StallEffects } from '../src/stall-effects.js';
import { GameWorld } from '../src/world.js';
import { RigidBodyManager } from '../src/physics.js';
import { ICE_CREAM_FLAVORS } from '../src/protocol.js';
import { VENUES, MAX_SCOOPS } from '../src/venues.js';

function fixture() {
  const w = { scene: new THREE.Scene(), giantBlockHeight: .32, setGiantBlockColor() {} };
  w.paddleGroup = new THREE.Group(); w.paddleGroup.position.set(.1, 1.2, .2); w.scene.add(w.paddleGroup);
  w.paddleRollGroup = new THREE.Group(); w.paddleGroup.add(w.paddleRollGroup);
  w.conePivot = new THREE.Group(); w.paddleGroup.add(w.conePivot);
  w.scoopStackGroup = new THREE.Group(); w.conePivot.add(w.scoopStackGroup);
  w.scoopStackGroup.add(new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), new THREE.MeshBasicMaterial()));
  w.giantBlockGroup = new THREE.Group(); w.scene.add(w.giantBlockGroup);
  w.heldSocket = new THREE.Group(); w.heldSocket.position.set(.2, 1.0, .5); w.scene.add(w.heldSocket);
  w.stretchyStrand = { active: true, nodes: [new THREE.Vector3(-.2, 1.2, .2), new THREE.Vector3(.2, 1.2, .2)] };
  return { w, effects: new StallEffects(w) };
}

test('physical story props reveal only from actual completed chapter IDs', () => {
  const initial = narrativeReveals({ visits: 999, chapter: 10, completedStages: [0, 99, '9', null] });
  assert.equal(initial.nora, false); assert.equal(initial.ledger, false); assert.equal(initial.ending, false);
  const known = narrativeReveals({ vendorIndex: 2, completedStages: [1, 2, 6, 9] });
  assert.equal(known.photograph, true); assert.equal(known.notes, true); assert.equal(known.ledger, true); assert.equal(known.nora, true);
  assert.equal(known.ending, false); assert.deepEqual(known.masters, [true, false, false, false]);
});

test('back-counter lore stays behind the actor and swaps pages/signature without recreating objects', () => {
  const scene = new THREE.Scene();
  const decor = buildStallDecor(scene, { textureFactory: () => new THREE.Texture() });
  decor.setState({ completedStages: [] });
  const card = decor.props.card;
  const ledger = decor.props.ledger;
  const originalCard = card.picture;
  assert.equal(card.picture.material.map, card.hiddenMap);
  assert.equal(ledger.picture.material.map, ledger.closedMap);
  assert.equal(decor.props.notes.group.visible, false);
  for (const prop of Object.values(decor.props)) assert.ok(prop.group.position.z < -1.8);
  for (let i = 0; i < 4; i++) assert.equal(decor.props[`master${i}`].group.visible, true);
  decor.setState({ vendorIndex: 3, completedStages: [1, 2, 6, 9] }); decor.update(2);
  assert.equal(card.picture, originalCard); assert.equal(card.picture.material.map, card.revealedMap);
  assert.equal(ledger.picture.material.map, ledger.openMap); assert.equal(decor.props.notes.group.visible, true);
});

test('cut has visible recoiling ends and falling scrap for 600ms using the same pooled geometry', () => {
  const { w, effects } = fixture();
  const cut = new THREE.Vector3(0, 1.2, .2);
  const geometry = effects.strands[0][0].geometry;
  effects.triggerSlice(cut, 0xfff4dd, 1);
  const originalEnd = effects.strands[0][5].position.clone();
  w.stretchyStrand.active = false;
  effects.update(.2); assert.equal(effects.sliceGroup.visible, true);
  assert.ok(effects.strands[0][5].position.distanceTo(effects.anchors[0]) < originalEnd.distanceTo(effects.anchors[0]));
  effects.update(.25); assert.equal(effects.sliceGroup.visible, true);
  assert.ok(effects.scraps[0].position.y < cut.y);
  assert.equal(effects.strands[0][0].geometry, geometry);
  effects.update(.16); assert.equal(effects.sliceGroup.visible, false);
  effects.triggerSlice(cut, 0x77bb55, -1); effects.update(.1);
  assert.equal(effects.strands[0][0].geometry, geometry);
  assert.ok(effects.scraps[0].position.x < cut.x);
});

test('scoop lift moves the original stack independently of the following paddle transform', () => {
  const { w, effects } = fixture();
  const original = w.scoopStackGroup;
  const desired = new THREE.Vector3(.24, 1.46, .08);
  effects.setScoop('paddle', desired);
  w.paddleGroup.position.set(-.4, 1.1, .3); w.scene.updateMatrixWorld(true);
  assert.equal(w.scoopStackGroup, original); assert.equal(original.parent, w.scene);
  assert.ok(original.getWorldPosition(new THREE.Vector3()).distanceTo(desired) < 1e-10);
  effects.setScoop('cone'); effects.update(.6);
  assert.equal(original.parent, w.conePivot); assert.ok(original.position.length() < .001);
});

test('sleeve transfers as one object without a handoff jump or stealing the caught cone', () => {
  const { w, effects } = fixture();
  effects.showSleeve({ visible: true, owner: 'vendor' }); w.scene.updateMatrixWorld(true);
  const original = effects.sleeve;
  const before = original.getWorldPosition(new THREE.Vector3());
  effects.showSleeve({ visible: true, owner: 'player' }); w.scene.updateMatrixWorld(true);
  assert.equal(original.parent, w.heldSocket);
  assert.ok(original.getWorldPosition(new THREE.Vector3()).distanceTo(before) < 1e-9);
  effects.update(.6); assert.ok(original.position.distanceTo(effects.sleeveRest) < .001);
  w.heldSocket.attach(w.conePivot);
  effects.clear();
  assert.equal(w.conePivot.parent, w.heldSocket); assert.equal(original.visible, false);
  assert.equal(w.scoopStackGroup.parent, w.conePivot);
});

test('whole mold rests on the existing cone and can return inside its steel canister', () => {
  const { w, effects } = fixture();
  const coneParent = w.conePivot.parent;
  const block = w.giantBlockGroup;
  effects.setMold({ mode: 'cone-cap', tubIndex: 1 });
  assert.equal(block.parent, w.conePivot);
  assert.ok(Math.abs(block.position.y - w.giantBlockHeight / 2 - .035) < 1e-10);
  effects.setMold({ mode: 'bucket', position: new THREE.Vector3(.3, 1.4, 0) });
  assert.equal(block.parent, effects.bucket); assert.equal(effects.bucket.visible, true);
  effects.clearMold(); assert.equal(block.parent, w.scene); assert.equal(block.visible, false);
  assert.equal(w.conePivot.parent, coneParent);
});

test('serving napkin wraps below the actual cone, then the same sheet peels into the player hand', () => {
  const { w, effects } = fixture();
  effects.setServingNapkin({ visible: true, owner: 'vendor', peel: 0 });
  const original = w.servingNapkin, originalGeometry = effects.napkinGeometry;
  const coneOwner = w.conePivot.parent, scoopOwner = w.scoopStackGroup.parent;
  originalGeometry.computeBoundingBox();
  assert.ok(original.position.y + originalGeometry.boundingBox.max.y < .035, 'paper ends below the real cone rim');
  const before = original.getWorldPosition(new THREE.Vector3());
  const folded = Array.from(originalGeometry.attributes.position.array);
  effects.setServingNapkin({ visible: true, owner: 'player', peel: 0 });
  assert.equal(original.parent, w.heldSocket);
  assert.ok(original.getWorldPosition(new THREE.Vector3()).distanceTo(before) < 1e-9);
  assert.deepEqual(Array.from(originalGeometry.attributes.position.array), folded, 'handoff does not replace or pop the cloth');
  effects.setServingNapkin({ visible: true, owner: 'player', peel: 1 });
  effects.update(1 / 60);
  let largestStep = 0;
  const positions = originalGeometry.attributes.position.array;
  for (let i = 0; i < positions.length; i++) largestStep = Math.max(largestStep, Math.abs(positions[i] - folded[i]));
  assert.ok(largestStep < .04, 'unfold begins with a small visible intermediate deformation');
  for (let i = 0; i < 30; i++) effects.update(1 / 60);
  originalGeometry.computeBoundingBox();
  assert.ok(originalGeometry.boundingBox.max.x - originalGeometry.boundingBox.min.x > .18);
  assert.equal(w.conePivot.parent, coneOwner); assert.equal(w.scoopStackGroup.parent, scoopOwner);
  assert.equal(effects.napkinGeometry, originalGeometry);
});

test('discard animates the same napkin through cleanup and eventually returns it hidden without a second cone', () => {
  const { w, effects } = fixture();
  effects.setServingNapkin({ visible: true, owner: 'player', peel: 1 }); effects.update(.4);
  const paper = w.servingNapkin, before = paper.getWorldPosition(new THREE.Vector3());
  effects.clearServingNapkin({ discardDirection: -1 });
  assert.equal(paper.parent, w.scene); assert.ok(paper.position.distanceTo(before) < 1e-9);
  effects.update(.15); effects.clear();
  assert.equal(paper.visible, true); assert.ok(paper.position.x < before.x);
  effects.update(.8); assert.equal(paper.visible, false); assert.equal(paper.parent, w.conePivot);
  assert.equal(w.conePivot.parent, w.paddleGroup);
});

function scoopFixture() {
  const w = Object.create(GameWorld.prototype);
  w.scene = new THREE.Scene(); w.waffleTexture = w.outerWaffleTexture = new THREE.Texture();
  w._buildPaddleAndCones();
  return w;
}

test('all twelve distinct scoops use stable world anchors and remain a wide compact serving', () => {
  const w = scoopFixture();
  assert.equal(w.scoopMeshes.length, MAX_SCOOPS);
  for (let i = 0; i < MAX_SCOOPS; i++) assert.equal(w[`scoop${i + 1}`], w.scoopMeshes[i]);
  for (let count = 1; count <= MAX_SCOOPS; count++) {
    w.updateIceCreamScoops(count, true); w.updateServingLayout(2); w.scene.updateMatrixWorld(true);
    assert.equal(w.scoopMeshes.filter((mesh) => mesh.visible).length, count);
    for (let i = 0; i < count; i++) assert.ok(w.getScoopAnchor(i).distanceTo(w.scoopMeshes[i].getWorldPosition(new THREE.Vector3())) < 1e-9);
    assert.ok(w.getScoopTopHeight(count) < (count<=8?.30:.36));
  }
  const width = Math.max(...w.scoopMeshes.map((m) => m.position.x + m.geometry.parameters.radius * m.scale.x)) - Math.min(...w.scoopMeshes.map((m) => m.position.x - m.geometry.parameters.radius * m.scale.x));
  assert.ok(width > .20, 'later servings add visible width instead of a tall tower');
  const before = w.getScoopAnchor(7).sub(w.conePivot.getWorldPosition(new THREE.Vector3())).length();
  w.setServingScale(1.18);
  const after = w.getScoopAnchor(7).sub(w.conePivot.getWorldPosition(new THREE.Vector3())).length();
  assert.ok(Math.abs(after / before - 1.18) < 1e-8);
  assert.equal(w.setServingScale(9), 1.18);
  const flavors = [3, 2, 3, 2, 1, 0, 1, 0]; w.applySelectedFlavorColors(flavors);
  flavors.forEach((flavor, index) => assert.equal(w.scoopMeshes[index].material.color.getHex(), ICE_CREAM_FLAVORS[flavor].colorHex));
});

test('mounted full mold retains its physical size across a larger cone and the return to scene', () => {
  const { w, effects } = fixture(); w.conePivot.scale.setScalar(1.18);
  effects.setMold({ mode: 'block', position: new THREE.Vector3(0, 1.4, 0) });
  const scale = w.giantBlockGroup.getWorldScale(new THREE.Vector3());
  effects.setMold({ mode: 'cone-cap' });
  assert.ok(w.giantBlockGroup.getWorldScale(new THREE.Vector3()).distanceTo(scale) < 1e-9);
  const moldBottom = w.giantBlockGroup.localToWorld(new THREE.Vector3(0, -w.giantBlockHeight / 2, 0));
  const coneRim = w.conePivot.localToWorld(new THREE.Vector3(0, .035, 0));
  assert.ok(moldBottom.distanceTo(coneRim) < 1e-9, 'inverse scale also preserves physical seating on the larger cone');
  const position = w.giantBlockGroup.getWorldPosition(new THREE.Vector3());
  effects.setMold({ mode: 'block', position });
  assert.ok(w.giantBlockGroup.getWorldScale(new THREE.Vector3()).distanceTo(scale) < 1e-9);
});

test('counter and tub contact targets lie on the actual tilted rail and rolled steel rim', () => {
  const w = Object.create(GameWorld.prototype);
  w.scene = new THREE.Scene(); w.bells = []; w.frostMotes = [];
  w.cartSignTexture = w.waffleTexture = new THREE.Texture(); w._buildIceCreamCart();
  w.scene.updateMatrixWorld(true);
  const normal=new THREE.Vector3(0,1,0).transformDirection(w.basinDeckGroup.matrixWorld);
  for(const x of[-.7,0,.34,.7]){
    const target=w.getCounterStrikeTarget(x),origin=target.clone().addScaledVector(normal,.1);
    const hit=new THREE.Raycaster(origin,normal.clone().negate(),0,.2).intersectObject(w.cartGroup,true)[0];
    assert.ok(hit&&hit.point.distanceTo(target)<2e-6,'authored strike point lies on the actual rendered rail surface');
  }
  for (let i = 0; i < w.tubPositions.length; i++) {
    const point = w.basinDeckGroup.worldToLocal(w.getTubRimStrikeTarget(i));
    assert.ok(Math.abs(point.x - w.tubPositions[i].x) < 1e-9);
    assert.ok(Math.abs(point.y - (.048 + .013)) < 1e-9);
    assert.ok(Math.abs(point.z - (.01 + .107)) < 1e-9);
  }
});

test('six venues have physical motif, palette, sign and lighting changes while retaining revealed lore', () => {
  const decor = buildStallDecor(new THREE.Scene(), { textureFactory: (kind, config) => new THREE.Texture({ kind, config }) });
  decor.setState({ completedStages: [1, 2, 6, 9] });
  const card = decor.props.card.picture, photo = decor.props.photo.group;
  for (const venue of VENUES) {
    decor.setVenue(venue);
    assert.equal(decor.materials.wall.color.getHex(), venue.palette.wall);
    assert.equal(decor.shelfLight.color.getHex(), venue.lightColor);
    assert.deepEqual(Object.entries(decor.themeProps).filter(([, group]) => group.visible).map(([key]) => key), [venue.propTheme]);
    assert.equal(decor.props.venueSign.picture.material.map.image.config.id, venue.id);
    assert.equal(decor.props.card.picture, card); assert.equal(card.material.map, decor.props.card.revealedMap);
    assert.equal(decor.props.photo.group, photo);
  }
});

test('full reset removes old debris and landing callbacks before the next round', () => {
  const w = Object.create(GameWorld.prototype); w.scene = new THREE.Scene(); w.particles = []; w.bells = [];
  let callbacks = 0, detached = false;
  w.rigidBodies = new RigidBodyManager(w.scene, () => callbacks++);
  w.stretchyStrand = { detach() { detached = true; } };
  const original = new THREE.Mesh(new THREE.SphereGeometry(.05), new THREE.MeshBasicMaterial());
  let originalDisposed = false; original.geometry.addEventListener('dispose', () => { originalDisposed = true; });
  w.rigidBodies.spawnThrownObject(original.clone(), new THREE.Vector3(0, 1, -.2), new THREE.Vector3(0, -5, 0), new THREE.Vector3());
  w.rigidBodies.spawnFlyingScoop(0xffffff, new THREE.Vector3(), () => new THREE.Vector3(), () => callbacks++);
  w.resetTransientPresentation(); w.rigidBodies.update(1);
  assert.equal(callbacks, 0); assert.equal(w.rigidBodies.bodies.length, 0); assert.equal(detached, true);
  assert.equal(originalDisposed, false, 'debris clones do not own the original prop geometry');
});
