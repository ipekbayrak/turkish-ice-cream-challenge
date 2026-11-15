import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SaveManager } from '../src/storage.js';
import { CAMPAIGN_LEVELS, TrickDirector } from '../src/tricks.js';
import { compoundLimitForStage, isChoreographedRoutine } from '../src/trick-routines.js';
import { ConeBiteFinale } from '../src/cone-bite-finale.js';
import { JuiceDirector, classifyVendorTell } from '../src/juice-director.js';
import { makeEncounterFixture } from './encounter-fixture.js';

test('Phase 15.1: Heartless main mode never aborts mid-show on 3+ mistakes and grades stars by bamboozled count', () => {
  const f = makeEncounterFixture({ stage: 1, count: 2, vendor: 0 });
  const { d } = f;
  d.save.masterExamMode = false;
  d.active = true;

  // Take 5 mistakes in a row — player stays in the show!
  for (let i = 0; i < 5; i++) {
    const aborted = d._loseHeart(d.coneWorldPos, '🎣');
    assert.equal(aborted, false, `mistake #${i + 1} must not abort in Heartless mode`);
    assert.equal(d.roundEnded, false);
  }
  assert.equal(d.penaltiesTaken, 5);
  assert.equal(d.hearts, 0);

  let capturedResult = null;
  d.ui.onVictoryBite = (res) => {
    capturedResult = res;
  };
  d._endRound('MASTER_CATCH');
  assert.ok(capturedResult, 'MASTER_CATCH should invoke onVictoryBite when provided');
  assert.equal(capturedResult.bamboozled, 5);
  assert.equal(capturedResult.starNum, 1, '4+ mistakes in Heartless mode awards 1 star');
  assert.equal(capturedResult.stars, '⭐☆☆');

  // Verify <=1 mistake => 3 stars, 2-3 mistakes => 2 stars
  const f3 = makeEncounterFixture({ stage: 1, count: 2, vendor: 0 });
  f3.d.save.masterExamMode = false;
  f3.d._loseHeart(f3.d.coneWorldPos);
  let res3 = null;
  f3.d.ui.onVictoryBite = (r) => { res3 = r; };
  f3.d._endRound('MASTER_CATCH');
  assert.equal(res3.starNum, 3, '1 mistake in Heartless mode still earns 3 stars');

  const f2 = makeEncounterFixture({ stage: 1, count: 2, vendor: 0 });
  f2.d.save.masterExamMode = false;
  f2.d._loseHeart(f2.d.coneWorldPos);
  f2.d._loseHeart(f2.d.coneWorldPos);
  let res2 = null;
  f2.d.ui.onVictoryBite = (r) => { res2 = r; };
  f2.d._endRound('MASTER_CATCH');
  assert.equal(res2.starNum, 2, '2 mistakes in Heartless mode earns 2 stars');
});

test('Phase 15.2: Master Exam Mode (3 Hearts) enforces classic OUT_OF_HEARTS on 3rd mistake', () => {
  const save = new SaveManager();
  assert.equal(save.masterExamMode, false);
  assert.equal(save.toggleMasterExam(), true);

  const f = makeEncounterFixture({ stage: 2, count: 2, vendor: 0 });
  f.d.save.masterExamMode = true;
  f.d.active = true;

  assert.equal(f.d._loseHeart(f.d.coneWorldPos), false);
  assert.equal(f.d._loseHeart(f.d.coneWorldPos), false);
  assert.equal(f.d._loseHeart(f.d.coneWorldPos), true, '3rd mistake ends round in Master Exam mode');
  assert.equal(f.d.roundEnded, true);
});

test('Phase 15.3: Progressive verb onboarding keeps Stage 1 pure Reach/Pull and introduces Slice in Stage 2 & Rhythm in Stage 3', () => {
  assert.equal(compoundLimitForStage(1), 0);
  assert.equal(compoundLimitForStage(2), 1);

  const stage1 = CAMPAIGN_LEVELS[0];
  for (let i = 0; i < 25; i++) {
    const seq = TrickDirector.prototype._buildDynamicRoutineForStage.call(
      { targetScoopCount: 2, currentStage: 1 },
      stage1
    );
    assert.equal(seq.includes('TUTORIAL_WARMUP'), false);
    assert.equal(seq.includes('MEGA_TAFFY_SLICE'), false, 'Stage 1 has no horizontal slice');
    assert.equal(seq.includes('EYE_LOCK_RHYTHM_CHASE'), false, 'Stage 1 has no rhythm chase');
    assert.equal(seq.some(isChoreographedRoutine), false, 'Stage 1 has 0 compound shows');
  }

  const stage2 = CAMPAIGN_LEVELS[1];
  assert.ok(stage2.trickPool.includes('MEGA_TAFFY_SLICE'), 'Stage 2 introduces MEGA_TAFFY_SLICE');
  for (let i = 0; i < 25; i++) {
    const seq = TrickDirector.prototype._buildDynamicRoutineForStage.call(
      { targetScoopCount: 2, currentStage: 2 },
      stage2
    );
    assert.equal(seq.includes('EYE_LOCK_RHYTHM_CHASE'), false, 'Stage 2 does not force rhythm chase');
  }

  const stage3 = CAMPAIGN_LEVELS[2];
  const seq3 = TrickDirector.prototype._buildDynamicRoutineForStage.call(
    { targetScoopCount: 3, currentStage: 3 },
    stage3
  );
  assert.equal(seq3.includes('EYE_LOCK_RHYTHM_CHASE'), true, 'Stage 3 introduces guaranteed rhythm chase');
});

test('Phase 15.4: ConeBiteFinale indents top scoop, plays crunch audio, spawns crumbs, and restores mesh on finish', () => {
  const scoop1 = new THREE.Mesh();
  scoop1.visible = true;
  const scoop2 = new THREE.Mesh();
  scoop2.visible = true;
  const bursts = [];
  let crunchPlayed = 0;
  let completedPayload = null;

  const worldStub = {
    touristHand: new THREE.Group(),
    conePivot: new THREE.Group(),
    camera: new THREE.PerspectiveCamera(54, 1, 0.1, 20),
    scoopMeshes: [scoop1, scoop2],
    spawnBurst(pos, color, count) {
      bursts.push({ color, count });
    },
    setVendorMood() {},
  };
  worldStub.touristHand.position.set(0.2, 1.05, 0.52);

  const finale = new ConeBiteFinale({
    world: worldStub,
    sound: { playConeBite: () => { crunchPlayed++; } },
    onComplete: (res) => { completedPayload = res; },
  });

  finale.start({ outcomeType: 'MASTER_CATCH', score: 1500 }, { scoopCount: 2 });
  assert.equal(finale.active, true);

  for (let i = 0; i < 4; i++) finale.update(0.08);
  assert.ok(worldStub.touristHand.position.y > 1.15, 'hand approaches POV mouth');

  finale.triggerBite();
  assert.equal(crunchPlayed, 1);
  assert.ok(scoop2.scale.x < 0.7, 'top scoop mesh indented after 1st bite');
  assert.equal(bursts.length, 2, 'pistachio + waffle crumb bursts spawned');

  finale.triggerBite();
  assert.equal(crunchPlayed, 2);
  assert.equal(finale.finishing, true);

  for (let i = 0; i < 12 && finale.active; i++) {
    finale.update(0.06);
  }
  assert.equal(finale.active, false);
  assert.equal(scoop2.scale.x, 1, 'scoop mesh scale restored cleanly after finale');
  assert.equal(completedPayload?.score, 1500);
});

test('Phase 15.5: JuiceDirector classifies vendor tells and applies micro slow-mo + catch FOV punch', () => {
  assert.equal(classifyVendorTell('UPSIDE_DOWN_GRAVITY', 0), 'feint');
  assert.equal(classifyVendorTell('UPSIDE_DOWN_GRAVITY', 1), 'true_offer');
  assert.equal(classifyVendorTell('FINAL_PISTACHIO_CATCH', 0), 'true_offer');
  assert.equal(classifyVendorTell('SCRAPE_FLAVOR_SCOOP', 0), 'neutral');

  const juice = new JuiceDirector();
  assert.equal(juice.triggerNearMiss(), true);
  assert.equal(juice.triggerNearMiss(), false, 'cooldown prevents back-to-back slow-mo spam');

  const snap1 = juice.step(0.02, { mechanic: 'COMBO_DOUBLE_PUMP', subStep: 0 });
  assert.equal(snap1.slowMoActive, true);
  assert.ok(snap1.visualDt < 0.02, 'visualDt is dilated during near-miss slow-mo');
  assert.equal(snap1.tell, 'feint');

  juice.triggerCatchZoom();
  const snap2 = juice.step(0.08, { mechanic: 'COMBO_DOUBLE_PUMP', subStep: 1 });
  assert.ok(snap2.fovOffset < -0.5, 'catch triggers negative FOV zoom punch');
  assert.equal(snap2.tell, 'true_offer');
});
