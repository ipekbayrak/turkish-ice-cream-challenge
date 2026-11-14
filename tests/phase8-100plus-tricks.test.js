import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {
  TRICK_CATALOG,
  CAMPAIGN_LEVELS,
  TrickDirector,
} from '../src/tricks.js';
import {
  MARAS_FLOURISH_CATALOG,
  MARAS_FLOURISH_IDS,
} from '../src/maras-flourish-tricks.js';
import {
  BASE_SERVICE_ACTIONS,
  CHOREOGRAPHED_ROUTINES,
  isChoreographedRoutine,
  routineSignature,
} from '../src/trick-routines.js';
import {
  SUPPORTED_LANGS,
  ACHIEVEMENTS,
  SaveManager,
  getTrickCategory,
} from '../src/storage.js';
import { clearTrickTransition } from '../src/trick-transition.js';
import { makeEncounterFixture } from './encounter-fixture.js';
import { EncounterDriver } from './encounter-driver.js';

test('8.1: Repertoire reaches 111 TRICK_CATALOG entries (50 base + 60 shows + 1 final) and 112 total playable tricks', () => {
  assert.equal(MARAS_FLOURISH_CATALOG.length, 18);
  assert.equal(MARAS_FLOURISH_IDS.size, 18);
  assert.equal(CHOREOGRAPHED_ROUTINES.length, 60);
  assert.ok(CHOREOGRAPHED_ROUTINES.every((r) => isChoreographedRoutine(r.id)));
  assert.equal(TRICK_CATALOG.length, 111);

  const catalogIds = new Set(TRICK_CATALOG.map((t) => t.id));
  assert.equal(catalogIds.size, 111, 'all 111 TRICK_CATALOG IDs must be unique');

  for (const id of MARAS_FLOURISH_IDS) {
    assert.ok(catalogIds.has(id), `${id} should be in TRICK_CATALOG`);
    assert.ok(BASE_SERVICE_ACTIONS[id], `${id} should be in BASE_SERVICE_ACTIONS`);
    const usedInCampaign = CAMPAIGN_LEVELS.some((lvl) => lvl.trickPool.includes(id));
    assert.ok(usedInCampaign, `${id} should be scheduled in CAMPAIGN_LEVELS`);
  }

  const signatures = new Set(CHOREOGRAPHED_ROUTINES.map((r) => routineSignature(r)));
  assert.equal(signatures.size, 60, 'all 60 choreographed routines must have unique signatures');

  const categoryCounts = { acrobatics: 0, sleight: 0, elastic: 0, rhythm: 0, shows: 0 };
  for (const entry of TRICK_CATALOG) {
    const cat = getTrickCategory(entry.id);
    assert.ok(cat in categoryCounts, `unexpected category ${cat} for ${entry.id}`);
    categoryCounts[cat]++;
  }
  assert.equal(categoryCounts.shows, 60);
  assert.ok(categoryCounts.acrobatics >= 10);
  assert.ok(categoryCounts.sleight >= 15);
  assert.ok(categoryCounts.elastic >= 8);
  assert.ok(categoryCounts.rhythm >= 8);
});

test('8.2: All 111 TRICK_CATALOG entries have complete 6-language localization (tr, en, ar, ru, de, ja)', () => {
  const save = new SaveManager();
  for (const entry of TRICK_CATALOG) {
    for (const { code } of SUPPORTED_LANGS) {
      assert.equal(
        typeof entry.names?.[code],
        'string',
        `missing names.${code} on trick ${entry.id}`
      );
      assert.ok(
        entry.names[code].trim().length >= 2,
        `empty names.${code} on trick ${entry.id}`
      );
      assert.equal(
        typeof entry.descs?.[code],
        'string',
        `missing descs.${code} on trick ${entry.id}`
      );
      assert.ok(
        entry.descs[code].trim().length >= 8,
        `too short descs.${code} on trick ${entry.id}`
      );

      save.lang = code;
      const info = save.getTrickInfo(entry.id);
      assert.equal(info.name, entry.names[code]);
      assert.equal(info.desc, entry.descs[code]);
    }
  }
});

test('8.3: All 18 new Maraş flourish tricks complete cleanly with smooth 60 FPS vendor right-wrist kinematics', () => {
  for (const { id } of MARAS_FLOURISH_CATALOG) {
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
      `${id} had excessive wrist jump between 60 FPS frames: ${maxWristStep.toFixed(4)}m`
    );
  }
});

test('8.4: Premature reach during subStep 0 of each of the 18 new Maraş flourish tricks deducts patience heart', () => {
  for (const { id } of MARAS_FLOURISH_CATALOG) {
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
      `Premature grab during subStep 0 of ${id} should deduct 1 heart`
    );
  }
});

test('8.5: Smart Deck prioritizes undiscovered tricks, avoids recent repeats, and supports setPracticeTrick', () => {
  const f = makeEncounterFixture({ stage: 1, count: 2, vendor: 0 });
  const { d } = f;
  const save = d.save;

  // Stage 1 pool has tricks in CAMPAIGN_LEVELS[0].trickPool.
  // Mark all except 'COUNTER_DRUM_CADENCE' and 'PENDULUM_BELL_SWING' as discovered:
  const stage1Cfg = CAMPAIGN_LEVELS[0];
  const stage1Pool = stage1Cfg.trickPool;
  save.data.discoveredTricks = stage1Pool.filter(
    (id) => id !== 'COUNTER_DRUM_CADENCE' && id !== 'PENDULUM_BELL_SWING'
  );
  d._recentTricks = new Set();

  const deck = d._buildDynamicRoutineForStage(stage1Cfg);
  const nonFinal = deck.slice(0, -1);
  assert.equal(deck.at(-1), 'FINAL_PISTACHIO_CATCH');
  assert.ok(
    nonFinal.includes('COUNTER_DRUM_CADENCE') && nonFinal.includes('PENDULUM_BELL_SWING'),
    'Smart Deck should prioritize undiscovered tricks from the stage pool'
  );

  // Test setPracticeTrick: places practice trick in first trick slot after initial scrape and clears practiceTrickId
  d.setPracticeTrick('GRAND_FINALE_BOW_TEASE');
  assert.equal(d.practiceTrickId, 'GRAND_FINALE_BOW_TEASE');
  const practiceDeck = d._buildDynamicRoutineForStage(stage1Cfg);
  const firstTrick = practiceDeck.find((id) => id !== 'SCRAPE_FLAVOR_SCOOP');
  assert.equal(firstTrick, 'GRAND_FINALE_BOW_TEASE');
  assert.equal(d.practiceTrickId, null, 'practiceTrickId should clear after building routine');
});

test('8.6: ACHIEVEMENTS include trick_25, trick_50, trick_100 in 6 languages and HTML includes #dialog-tricks', () => {
  const save = new SaveManager();
  const achIds = ACHIEVEMENTS.map((a) => a.id);
  assert.ok(achIds.includes('trick_25'));
  assert.ok(achIds.includes('trick_50'));
  assert.ok(achIds.includes('trick_100'));

  for (const ach of ACHIEVEMENTS) {
    for (const { code } of SUPPORTED_LANGS) {
      assert.ok(ach.names[code]?.trim().length > 0, `missing ${code} name on achievement ${ach.id}`);
      assert.ok(ach.descs[code]?.trim().length > 0, `missing ${code} desc on achievement ${ach.id}`);
    }
  }

  save.data.discoveredTricks = TRICK_CATALOG.slice(0, 50).map((t) => t.id);
  let unlocked = save.getUnlockedAchievements().map((a) => a.id);
  assert.ok(unlocked.includes('trick_25'));
  assert.ok(unlocked.includes('trick_50'));
  assert.ok(!unlocked.includes('trick_100'));

  save.data.discoveredTricks = TRICK_CATALOG.slice(0, 100).map((t) => t.id);
  unlocked = save.getUnlockedAchievements().map((a) => a.id);
  assert.ok(unlocked.includes('trick_100'));

  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('id="btn-tricks-panel"'));
  assert.ok(html.includes('id="dialog-tricks"'));
  assert.ok(html.includes('id="tricks-category-tabs"'));
  assert.ok(html.includes('id="tricks-catalog-list"'));
  for (const cat of ['all', 'acrobatics', 'sleight', 'elastic', 'rhythm', 'shows']) {
    assert.ok(html.includes(`data-category="${cat}"`), `missing tab data-category="${cat}"`);
  }
});
