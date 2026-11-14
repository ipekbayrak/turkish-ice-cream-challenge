import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { EXTRA_TRICK_CATALOG } from '../src/trick-extensions.js';
import { CAMPAIGN_LEVELS, TRICK_CATALOG } from '../src/protocol.js';
import { makeEncounterFixture } from './encounter-fixture.js';
import { EncounterDriver } from './encounter-driver.js';
import { clearTrickTransition } from '../src/trick-transition.js';

const NEW_TRICK_IDS = [
  'PENDULUM_BELL_SWING',
  'SHOULDER_FAKEOUT_PIVOT',
  'ZIGZAG_LIGHTNING_TEASE',
  'CROWN_TAP_KISS_TEASE',
  'SPIRAL_CROWN_ASCENT',
];

const SUPPORTED_LANGS = ['tr', 'en', 'ar', 'ru', 'de', 'ja'];

test('Phase 7.1: 5 new authentic Maraş tricks are registered in EXTRA_TRICK_CATALOG and TRICK_CATALOG with 6-language i18n', () => {
  for (const id of NEW_TRICK_IDS) {
    const extraEntry = EXTRA_TRICK_CATALOG.find((t) => t.id === id);
    const catalogEntry = TRICK_CATALOG.find((t) => t.id === id);
    assert.ok(extraEntry, `${id} must exist in EXTRA_TRICK_CATALOG`);
    assert.ok(catalogEntry, `${id} must exist in TRICK_CATALOG`);
    for (const lang of SUPPORTED_LANGS) {
      assert.ok(
        catalogEntry.names?.[lang] && catalogEntry.names[lang].length > 2,
        `${id} missing name for language ${lang}`
      );
      assert.ok(
        catalogEntry.descs?.[lang] && catalogEntry.descs[lang].length > 10,
        `${id} missing description for language ${lang}`
      );
    }
  }
});

test('Phase 7.2: Every stage from Stage 1 to Stage 9 unlocks at least one new trick in CAMPAIGN_LEVELS', () => {
  const seen = new Set();
  for (let stage = 1; stage <= 9; stage++) {
    const level = CAMPAIGN_LEVELS[stage - 1];
    const newlyUnlocked = level.trickPool.filter((id) => !seen.has(id));
    assert.ok(
      newlyUnlocked.length >= 1,
      `Stage ${stage} should unlock at least 1 new trick, got 0`
    );
    for (const id of level.trickPool) seen.add(id);
  }
  assert.ok(CAMPAIGN_LEVELS[0].trickPool.includes('PENDULUM_BELL_SWING'));
  assert.ok(CAMPAIGN_LEVELS[1].trickPool.includes('SHOULDER_FAKEOUT_PIVOT'));
  assert.ok(CAMPAIGN_LEVELS[2].trickPool.includes('ZIGZAG_LIGHTNING_TEASE'));
  assert.ok(CAMPAIGN_LEVELS[2].trickPool.includes('HAND_INVERTED_OFFER'));
  assert.ok(CAMPAIGN_LEVELS[3].trickPool.includes('CROWN_TAP_KISS_TEASE'));
  assert.ok(CAMPAIGN_LEVELS[3].trickPool.includes('HAND_NAPKIN_OFFER'));
  assert.ok(CAMPAIGN_LEVELS[4].trickPool.includes('SPIRAL_CROWN_ASCENT'));
});

test('Phase 7.3: All 5 new tricks complete cleanly via EncounterDriver with smooth vendor wrist kinematics', () => {
  for (const id of NEW_TRICK_IDS) {
    const f = makeEncounterFixture({ stage: 5, count: 2, vendor: 1 });
    const { d, w } = f;
    d.routine = [id, 'FINAL_PISTACHIO_CATCH'];
    d.active = true;
    d._enterRoutineStep(0);
    clearTrickTransition(d);

    const driver = new EncounterDriver(d, w, { touch: true });
    const dt = 1 / 60;
    let time = 0;
    let prevRWrist = null;
    let maxWristStep = 0;

    for (let frame = 0; frame < 60 * 8 && d.routineIndex === 0 && !d.roundEnded; frame++) {
      time += dt;
      const input = driver.update(dt);
      d.update(dt, time, input);
      w.updateEnvironmentAnimations(time, dt);
      w.scene.updateMatrixWorld(true);

      const curRWrist = w.rArmRig.handGroup.getWorldPosition(new THREE.Vector3());
      if (prevRWrist) {
        const step = curRWrist.distanceTo(prevRWrist);
        if (step > maxWristStep) maxWristStep = step;
      }
      prevRWrist = curRWrist;
    }

    assert.equal(
      d.routineIndex,
      1,
      `${id} should complete and advance to routineIndex 1`
    );
    assert.ok(d.score >= 340, `${id} should award points on catch (got ${d.score})`);
    assert.equal(d.hearts, 3, `${id} should not lose hearts when played properly`);
    assert.ok(
      maxWristStep < 0.16,
      `${id} max 1-frame right wrist step (${maxWristStep.toFixed(3)}m) must be < 0.16m`
    );
  }
});

test('Phase 7.4: Premature reach during subStep 0 of each new trick penalizes a heart', () => {
  for (const id of NEW_TRICK_IDS) {
    const f = makeEncounterFixture({ stage: 5, count: 2, vendor: 0 });
    const { d, w } = f;
    d.routine = [id, 'FINAL_PISTACHIO_CATCH'];
    d.active = true;
    d._enterRoutineStep(0);
    clearTrickTransition(d);

    const dt = 1 / 60;
    let time = 0;
    for (let frame = 0; frame < 30; frame++) {
      time += dt;
      const conePos = d.coneWorldPos.clone();
      const input = {
        isPointerDown: true,
        isReaching: true,
        isMoving: true,
        pointerEpoch: 1,
        cancelEpoch: 0,
        normX: 0,
        normY: 0,
        vx: 0,
        vy: 0,
        intentWorldPos: conePos,
        handWorldPos: conePos,
      };
      d.update(dt, time, input);
      w.updateEnvironmentAnimations(time, dt);
    }

    assert.equal(
      d.hearts,
      2,
      `${id} should deduct 1 heart when player reaches into the feint during subStep 0`
    );
  }
});

test('Phase 7.5: Opening CUSTOMER_SCOOP_SHOW subStep 4 performs full 360° cone whirl with customerScoopSpin', () => {
  const f = makeEncounterFixture({ stage: 1, count: 2, vendor: 0 });
  const { d, w } = f;
  d.routine = ['CUSTOMER_SCOOP_SHOW', 'FINAL_PISTACHIO_CATCH'];
  d.active = true;
  d.scoopCount = 0;
  d._enterRoutineStep(0);
  clearTrickTransition(d);

  const driver = new EncounterDriver(d, w, { touch: true });
  const dt = 1 / 60;
  let time = 0;
  let sawSubStep4Spin = false;
  let maxConeRotZ = 0;

  for (let frame = 0; frame < 60 * 14 && d.routineIndex === 0 && !d.roundEnded; frame++) {
    time += dt;
    const input = driver.update(dt);
    d.update(dt, time, input);
    w.updateEnvironmentAnimations(time, dt);
    w.scene.updateMatrixWorld(true);

    if (d.currentMechanic === 'CUSTOMER_SCOOP_SHOW' && d.subStep === 4) {
      sawSubStep4Spin = true;
      assert.equal(w.customerScoopSpin, true, 'customerScoopSpin must be true in subStep 4');
      assert.equal(w.presentationAxialSpin, false, 'presentationAxialSpin must be false in subStep 4 so cone whirls on Z');
      if (Math.abs(w.conePivot.rotation.z) > maxConeRotZ) {
        maxConeRotZ = Math.abs(w.conePivot.rotation.z);
      }
    }
  }

  assert.equal(sawSubStep4Spin, true, 'must pass through CUSTOMER_SCOOP_SHOW subStep 4');
  assert.ok(
    maxConeRotZ > Math.PI * 1.5,
    `conePivot.rotation.z should reach > 270 deg during 360 whirl, got ${maxConeRotZ.toFixed(2)} rad`
  );
});
