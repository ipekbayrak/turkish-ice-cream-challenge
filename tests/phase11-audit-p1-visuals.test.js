import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GameWorld } from '../src/world.js';
import { SpringVec3 } from '../src/physics.js';
import { StallEffects } from '../src/stall-effects.js';
import { TrickDirector } from '../src/tricks.js';
import { buildConeRack } from '../src/cone-rack.js';
import { ICE_CREAM_FLAVORS } from '../src/flavors.js';
import { makeVendorFlourishFixture } from './vendor-flourish-fixture.js';
import { makeEncounterFixture } from './encounter-fixture.js';
import { EncounterDriver } from './encounter-driver.js';

function makeVisualWorld() {
  const w = Object.create(GameWorld.prototype);
  w.scene = new THREE.Scene();
  w.camera = new THREE.PerspectiveCamera(64, 390 / 844, 0.05, 100);
  w.baseCamPos = new THREE.Vector3(0, 1.5, 1.55);
  w.camera.position.copy(w.baseCamPos);
  w.camera.lookAt(0, 1.42, -0.45);
  w.camera.updateMatrixWorld(true);
  w.waffleTexture = w.outerWaffleTexture = new THREE.Texture();
  w.handSpring = new SpringVec3(0.22, 1.08, 0.62, 135, 18);
  w.leftPropSpring = new SpringVec3(0.24, 1.22, -0.25, 88, 16);
  w.coneSpring = new SpringVec3(0, 1.24, 0.22, 72, 15);
  w.spectators = [];
  w.rigidBodies = { update() {} };
  w.cartGroup = new THREE.Group();
  w.cartGroup.position.set(0, 0, -0.38);
  w.scene.add(w.cartGroup);
  w.basinDeckGroup = new THREE.Group();
  w.basinDeckGroup.position.set(0, 0.94, 0.04);
  w.basinDeckGroup.rotation.x = 0.22;
  w.cartGroup.add(w.basinDeckGroup);
  w.tubPositions = ICE_CREAM_FLAVORS.map((f) => ({
    index: f.index,
    id: f.id,
    x: f.xOffset,
    color: f.colorHex,
    worldPos: new THREE.Vector3(f.xOffset, 0.97, -0.33),
  }));
  w.tubMeshes = [];
  w.tubIceGroups = ICE_CREAM_FLAVORS.map((_, idx) => {
    const bucket = new THREE.Group();
    bucket.position.set(ICE_CREAM_FLAVORS[idx].xOffset, 0, 0.01);
    w.basinDeckGroup.add(bucket);
    const group = new THREE.Group();
    group.position.y = 0.018;
    bucket.add(group);
    return { group, baseY: 0.018, surfaceY: 0.07408, fill: 1, churnEnergy: 0, phase: idx };
  });
  w.sliceCueGroup = new THREE.Group();
  w.sliceCueGroup.visible = false;
  w.scoopJiggleSpring = new SpringVec3(0, 0, 0, 220, 14);
  w.prevConePos = new THREE.Vector3(0, 1.24, 0.22);
  w.blinkTimer = 2.5;
  w.isBlinking = false;
  w.vendorMood = 'smile';
  w.spectatorReactionTimer = 0;
  w.spectatorReactionType = 'idle';
  w.frostMotes = [];
  w.lanterns = [];
  w.particles = [];
  w.bells = [];
  w._buildPaddleAndCones();
  w._buildVendor();
  w._buildBazaarSpectators();
  w._buildTouristPOVHand();
  w.stallEffects = new StallEffects(w);
  w.stretchyStrand = { active: false, detach() { this.active = false; } };
  w.scene.updateMatrixWorld(true);
  return w;
}

test('3.1 Player POV sleeve has rolled cuff fold and rounded inner end-cap instead of raw cut cylinder', () => {
  const w = makeVisualWorld();
  assert.equal(Boolean(w.touristSleeve), true);
  const cuff = w.touristSleeve.getObjectByName('player-sleeve-cuff');
  const cap = w.touristSleeve.getObjectByName('player-sleeve-cap');
  assert.equal(Boolean(cuff?.isMesh), true, 'sleeve should include a rolled cuff torus trim');
  assert.equal(Boolean(cap?.isMesh), true, 'sleeve should include a rounded inner shadow end-cap');
  assert.equal(w.touristSleeve.geometry.parameters.radiusBottom <= 0.06, true);
});

test('3.2 Bazaar spectators have grounded legs, shoes, necks, and shoulder-to-hand clapping arms', () => {
  const w = makeVisualWorld();
  assert.equal(w.spectators.length, 3);
  w.triggerSpectatorReaction('cheer');
  w.updateEnvironmentAnimations(0.5, 1 / 60, 0, 0, null, 0);
  w.scene.updateMatrixWorld(true);

  for (const sp of w.spectators) {
    assert.equal(Boolean(sp.neck?.isMesh), true, 'spectator must have neck connecting torso and head');
    assert.equal(Boolean(sp.leftLeg?.isMesh && sp.rightLeg?.isMesh), true, 'spectator must have both legs');
    assert.equal(Boolean(sp.leftShoe?.isMesh && sp.rightShoe?.isMesh), true, 'spectator must have grounded shoes');
    assert.equal(Boolean(sp.leftArm?.isMesh && sp.rightArm?.isMesh), true, 'spectator must have arms connecting shoulders to hands');

    const shoeBox = new THREE.Box3().setFromObject(sp.leftShoe);
    assert.ok(shoeBox.min.y >= -0.01 && shoeBox.min.y <= 0.08, `spectator shoe should rest near floor, got min.y=${shoeBox.min.y}`);
    assert.ok(sp.leftArm.scale.y > 0.10, 'left arm should span positive shoulder-to-hand distance');
    assert.ok(sp.rightArm.scale.y > 0.10, 'right arm should span positive shoulder-to-hand distance');
  }
});

test('3.3 Vendor cuff sits at wrist (z >= 0.78), fez tassel pivots from top anchor, and waist sash follows torso pitch', () => {
  const w = makeVisualWorld();
  for (const rig of [w.rArmRig, w.lArmRig]) {
    const cuff = rig.lowerGroup.getObjectByName('vendor-wrist-cuff');
    assert.equal(Boolean(cuff?.isMesh), true, 'lowerGroup should expose named vendor-wrist-cuff');
    assert.ok(cuff.position.z >= 0.78, `cuff should sit near wrist (z >= 0.78), got ${cuff.position.z}`);
  }

  // Fez tassel geometry must hang downward (max.y <= 0.01) from top anchor so rotating z never seesaws above fez crown
  w.fezTassel.geometry.computeBoundingBox();
  const tasselBox = w.fezTassel.geometry.boundingBox;
  assert.ok(tasselBox.max.y <= 0.01, `fezTassel geometry top should be at pivot origin (<=0.01), got ${tasselBox.max.y}`);
  assert.ok(tasselBox.min.y <= -0.12, `fezTassel geometry should hang downward, got ${tasselBox.min.y}`);

  // Waist sash follows forward torso pitch
  w.vendorTorso.rotation.x = 0.24;
  w.vendorBody.update(0.2, 1 / 60);
  const waistForward = new THREE.Vector3(0, 0, 1).applyQuaternion(w.vendorBody.waist.quaternion);
  assert.ok(waistForward.y < -0.04, `waist sash should tilt forward when torso pitches forward, got z-axis.y=${waistForward.y}`);
});

test('3.4 Smooth kinematics ramp eliminates 18cm cliff, prevents upside-down counter clipping, spins flourish tricks axially, keeps pistachio hand below bells, and preserves mold crown swirls & rack mounts', () => {
  const makeDir = () => {
    const d = Object.create(TrickDirector.prototype);
    const paddle = new THREE.Group();
    const cone = new THREE.Group();
    paddle.add(cone);
    const spring = {
      target: new THREE.Vector3(),
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      step() { return this.pos.copy(this.target); },
    };
    Object.assign(d, {
      active: true,
      scoopCount: 8,
      targetScoopCount: 8,
      currentMechanic: 'FINAL_PISTACHIO_CATCH',
      coneTargetPos: new THREE.Vector3(0, 1.22, 0.26),
      coneWorldPos: new THREE.Vector3(),
      shaftRoll: 0,
      conePitchX: 0,
      coneFlipZ: 0,
      world: {
        conePivot: cone,
        paddleGroup: paddle,
        coneSpring: spring,
        vendorHead: new THREE.Group(),
        fezTassel: new THREE.Group(),
        carryScoop: { visible: false },
        orientPaddleAndHands() {},
      },
    });
    return d;
  };

  // 1. No 18cm jump across y = 1.11 -> 1.13 or y = 1.35 -> 1.37
  const d = makeDir();
  d.coneTargetPos.set(0, 1.11, 0.26);
  d._applyKinematics(1 / 60, 0, {});
  const y111 = d.coneWorldPos.y;
  d.coneTargetPos.set(0, 1.13, 0.26);
  d._applyKinematics(1 / 60, 0, {});
  const y113 = d.coneWorldPos.y;
  assert.ok(Math.abs(y113 - y111) < 0.05, `expected smooth ramp across y=1.12, got jump ${Math.abs(y113 - y111)}`);

  // 2. Upside-down cone (coneFlipZ = Math.PI) does NOT get pushed down into marble counter
  d.coneTargetPos.set(0, 1.22, 0.26);
  d.coneFlipZ = Math.PI;
  d._applyKinematics(1 / 60, 0, {});
  assert.ok(Math.abs(d.coneWorldPos.y - 1.22) < 1e-6, `upside-down cone should keep authored y=1.22, got ${d.coneWorldPos.y}`);

  // 3. All 7 axial-spin flourish tricks enable presentationAxialSpin so serving stays upright
  for (const id of [
    'UNDER_ARM_PIROUETTE',
    'HORIZONTAL_HELICOPTER',
    'TRIANGLE_RHYTHM_CHASE',
    'LOW_RAIL_SKIMMER',
    'GRAND_FINALE_BOW_TEASE',
    'SPIRAL_CROWN_ASCENT',
    'CROWN_TAP_KISS_TEASE',
  ]) {
    const dSpin = makeDir();
    dSpin.currentMechanic = id;
    dSpin._applyKinematics(1 / 60, 0, {});
    assert.equal(dSpin.world.presentationAxialSpin, true, `${id} should enable presentationAxialSpin`);
  }

  // 4. FINAL_PISTACHIO_CATCH leftHandCustomTarget stays safely below hanging brass bells (y <= 1.72)
  const f = makeVendorFlourishFixture(0, 4);
  f.d.routine = ['FINAL_PISTACHIO_CATCH'];
  f.d._enterRoutineStep(0);
  assert.ok(
    f.d.leftHandCustomTarget && f.d.leftHandCustomTarget.y <= 1.72,
    `leftHandCustomTarget.y should stay below 1.81m bells, got ${f.d.leftHandCustomTarget?.y}`
  );

  // 5. Giant mold block includes sculpted swirl crown ridges so docked tubs stay sculpted
  const w = makeVisualWorld();
  let torusSwirls = 0;
  w.giantBlockGroup.traverse((n) => {
    if (n.isMesh && n.geometry?.type === 'TorusGeometry') torusSwirls++;
  });
  assert.ok(torusSwirls >= 3, `giantBlockGroup should carry >=3 sculpted crown swirl ridges, got ${torusSwirls}`);

  // 6. ConeRack steel mount bridges forward toward cart rear wall (max.z >= 0.36 in rack space)
  const rack = buildConeRack(new THREE.Texture());
  const box = new THREE.Box3().setFromObject(rack);
  assert.ok(box.max.z >= 0.36, `coneRack mounting brackets should extend to cart wall (z >= 0.36), got ${box.max.z}`);
});

test('3.5 Vendor left hand and elbow stay inside viewport, clear custom targets after handoffs, and do not jitter after order selection', () => {
  const f = makeEncounterFixture({ Driver: EncounterDriver });
  f.reset({ seed: 101, count: 2, pace: 1, campaign: true });

  let maxNdcWristX = -Infinity;
  let maxNdcElbowX = -Infinity;
  let worstReverseStep = 0;
  let prevWrist = null;
  let prevDelta = null;
  let prevKey = null;

  for (let i = 0; i < 900 && !f.d.roundEnded; i++) {
    f.tick(1 / 60);
    f.w.scene.updateMatrixWorld(true);
    const wrist = f.w.lArmRig.handRig.wristAnchor.getWorldPosition(new THREE.Vector3());
    const elbow = f.w.lArmRig.armPose?.elbow || new THREE.Vector3();
    const ndcW = wrist.clone().project(f.w.camera);
    const ndcE = elbow.clone().project(f.w.camera);
    maxNdcWristX = Math.max(maxNdcWristX, Math.abs(ndcW.x));
    maxNdcElbowX = Math.max(maxNdcElbowX, Math.abs(ndcE.x));

    const st = f.state();
    const key = `${f.d.currentMechanic}:${f.d.subStep}:${st.transition}`;
    if (
      f.d.currentMechanic === 'CUSTOMER_SCOOP_SHOW' &&
      [0, 1, 2, 3, 4, 8, 9, 13, 14].includes(f.d.subStep) &&
      !f.d.trickTransition &&
      !f.d.servingHandoff
    ) {
      assert.equal(
        f.d.leftHandCustomTarget,
        null,
        `CUSTOMER_SCOOP_SHOW step ${f.d.subStep} must release leftHandCustomTarget`
      );
    }

    if (prevWrist) {
      const delta = wrist.clone().sub(prevWrist);
      const len = delta.length();
      if (
        prevKey === key &&
        prevDelta &&
        len > 0.008 &&
        prevDelta.length() > 0.008 &&
        delta.dot(prevDelta) / (len * prevDelta.length()) < -0.65
      ) {
        worstReverseStep = Math.max(worstReverseStep, len);
      }
      prevDelta = delta;
    }
    prevWrist = wrist.clone();
    prevKey = key;
  }

  assert.ok(maxNdcWristX < 0.72, `left wrist must stay well inside screen viewport, got ndc.x=${maxNdcWristX}`);
  assert.ok(maxNdcElbowX < 0.85, `left elbow must stay inside screen viewport, got ndc.x=${maxNdcElbowX}`);
  assert.ok(worstReverseStep < 0.015, `left wrist must not jitter/reverse on shaft, got ${worstReverseStep}m`);
});
