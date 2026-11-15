import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { SaveManager } from '../src/storage.js';
import { ConeBiteFinale } from '../src/cone-bite-finale.js';
import { makeEncounterFixture } from './encounter-fixture.js';

test('Phase 20.1: Classic 3-Hearts mode is default even if legacy v2.1.0 localStorage had masterExamMode=false', () => {
  const prevStorage = globalThis.localStorage;
  const store = new Map([
    [
      'maras_dondurma_3d_v4',
      JSON.stringify({
        unlockedStage: 2,
        masterExamMode: false,
      }),
    ],
  ]);
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };

  try {
    const save = new SaveManager();
    assert.equal(
      save.masterExamMode,
      true,
      'stale v2.1.0 masterExamMode=false must not hide the 3 hearts by default'
    );
    assert.equal(save.toggleMasterExam(), false);
    const reloaded = new SaveManager();
    assert.equal(
      reloaded.masterExamMode,
      false,
      'explicitly toggling strictHeartsMode off persists cleanly'
    );
  } finally {
    globalThis.localStorage = prevStorage;
  }
});

test('Phase 20.2: Camera stays 100% steady during mistakes, routine steps, and ConeBiteFinale (zero FOV zoom, zero camera nod)', () => {
  const f = makeEncounterFixture({ stage: 1, count: 2, vendor: 0 });
  const { d } = f;
  d.active = true;

  d._loseHeart(d.coneWorldPos, '🧊');
  assert.equal(d.juice.slowMoRemaining, 0, 'mistakes must not trigger slow-mo lurch');
  assert.equal(d.juice.zoomTimer, 0, 'mistakes must not trigger FOV zoom');

  d.currentMechanic = 'UPSIDE_DOWN_GRAVITY';
  d._stepHadMistake = false;
  d._advanceRoutineStep();
  assert.equal(d.juice.zoomTimer, 0, 'advancing routine steps must not trigger FOV zoom');

  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 20);
  camera.position.set(0, 1.42, 1.35);
  const startY = camera.position.y;
  const startZ = camera.position.z;

  const scoop = new THREE.Mesh();
  scoop.visible = true;
  const finale = new ConeBiteFinale({
    world: {
      camera,
      touristHand: new THREE.Group(),
      conePivot: new THREE.Group(),
      scoopMeshes: [scoop],
      spawnBurst() {},
      setVendorMood() {},
    },
    sound: { playConeBite() {} },
  });

  finale.start({ outcomeType: 'MASTER_CATCH', score: 1200 }, { scoopCount: 1 });
  finale.triggerBite();
  for (let i = 0; i < 10; i++) {
    finale.update(0.03);
    assert.equal(camera.position.y, startY, 'ConeBiteFinale must never bounce camera Y');
    assert.equal(camera.position.z, startZ, 'ConeBiteFinale must never move camera Z');
  }

  const interfaceJs = fs.readFileSync(new URL('../src/interface.js', import.meta.url), 'utf8');
  assert.equal(
    interfaceJs.includes('translateY(5px)'),
    false,
    'interface.js must not bounce #hud-card vertically on badge text updates'
  );
});

test('Phase 20.3: Clear mistake explanations, no false cheers on failed/scrape steps, and explicit win/loss reasons', () => {
  const f = makeEncounterFixture({ stage: 1, count: 2, vendor: 0 });
  const { d } = f;
  d.save.lang = 'tr';
  d.save.masterExamMode = true;
  d.active = true;

  let cheers = 0;
  const origCrowd = d.sound.playCrowdReaction?.bind(d.sound);
  d.sound.playCrowdReaction = (kind) => {
    if (kind === 'cheer') cheers++;
    origCrowd?.(kind);
  };

  // 1. Scraping a scoop must NOT trigger crowd cheer
  d.currentMechanic = 'SCRAPE_FLAVOR_SCOOP';
  d._stepHadMistake = false;
  d._advanceRoutineStep();
  assert.equal(cheers, 0, 'SCRAPE_FLAVOR_SCOOP must not trigger fake crowd cheer');

  // 2. A failed trick step must NOT trigger crowd cheer
  d.currentMechanic = 'UPSIDE_DOWN_GRAVITY';
  d._loseHeart(d.coneWorldPos, '🙃');
  assert.match(d.lastMistakeReason, /Ters külah/);
  assert.equal(d.floatingPopups.at(-1)?.pill, true);
  assert.match(d.floatingPopups.at(-1)?.text || '', /Ters külah/);
  d._advanceRoutineStep();
  assert.equal(cheers, 0, 'failed trick step must not trigger crowd cheer');

  // 3. A clean trick step DOES trigger crowd cheer
  d.choreography = null;
  d.currentMechanic = 'FAKE_DROP_PANIC';
  d._stepHadMistake = false;
  d._advanceRoutineStep();
  assert.equal(cheers, 1, 'clean trick step triggers genuine crowd cheer');

  // 4. Losing all 3 hearts gives explicit last-mistake reason in result modal
  let roundEndPayload = null;
  d.ui.onRoundEnd = (res) => {
    roundEndPayload = res;
  };
  d._loseHeart(d.coneWorldPos, '🧊');
  const ended = d._loseHeart(d.coneWorldPos, '🔔');
  assert.equal(ended, true);
  assert.equal(d.roundEnded, true);

  // Wait or inspect winning payload in a fresh fixture
  const fw = makeEncounterFixture({ stage: 1, count: 2, vendor: 0 });
  fw.d.save.lang = 'tr';
  fw.d.save.masterExamMode = true;
  let winPayload = null;
  fw.d.ui.onVictoryBite = (res) => {
    winPayload = res;
  };
  fw.d._loseHeart(fw.d.coneWorldPos, '🧊');
  fw.d._endRound('MASTER_CATCH');
  assert.ok(winPayload);
  assert.match(winPayload.desc, /❤️❤️🖤/, 'win description clearly shows remaining hearts');
});
