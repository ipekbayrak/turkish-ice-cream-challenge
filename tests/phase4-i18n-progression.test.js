import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { I18N, SUPPORTED_LANGS, SaveManager } from '../src/storage.js';
import { CUSTOMER_SERVICE_CATALOG } from '../src/customer-service.js';
import { TrickDirector } from '../src/tricks.js';

const noop = () => {};

test('all 6 supported languages define every I18N key without falling back to Turkish', () => {
  const trKeys = Object.keys(I18N.tr);
  const newlyLocalizedKeys = [
    'cue_eyelock_hold',
    'cue_eyelock_rhythm',
    'cue_afk_stir',
    'cue_afk_table',
    'cue_afk_bells',
    'cue_afk_wave',
    'tag_eyelock',
    'tag_rhythm_go',
    'speech_hophop',
    'speech_afk_table',
    'speech_afk_bells',
    'speech_afk_wave',
  ];
  for (const { code } of SUPPORTED_LANGS) {
    assert.ok(I18N[code], `missing language dictionary for ${code}`);
    for (const key of trKeys) {
      assert.equal(
        typeof I18N[code][key],
        'string',
        `missing key "${key}" in language "${code}"`
      );
      assert.ok(
        I18N[code][key].trim().length > 0,
        `empty translation for "${key}" in language "${code}"`
      );
    }
    if (code !== 'tr') {
      for (const key of newlyLocalizedKeys) {
        assert.notEqual(
          I18N[code][key],
          I18N.tr[key],
          `key "${key}" in "${code}" should not fall back to Turkish`
        );
      }
    }
  }
});

test('SaveManager.t, getFlavorName, and getTrickInfo fall back to English before Turkish for non-TR locales', () => {
  const save = new SaveManager();
  save.lang = 'de';
  const deTrickInfo = save.getTrickInfo('CUSTOMER_MOLD_MOUNT');
  assert.notEqual(deTrickInfo.name, 'Kalıp Senin Külahında');
  assert.equal(deTrickInfo.name, 'Der Eisblock auf deiner Waffel');

  // Unmapped non-TR locale falls back to English before Turkish:
  save.lang = 'fr';
  const fallbackTrickInfo = save.getTrickInfo('CUSTOMER_MOLD_MOUNT');
  assert.notEqual(fallbackTrickInfo.name, 'Kalıp Senin Külahında');
  assert.equal(fallbackTrickInfo.name, 'The Mold on Your Cone');
});

test('CUSTOMER_SERVICE_CATALOG has distinct, descriptive English descriptions for all 4 hand-service routines', () => {
  const enDescs = CUSTOMER_SERVICE_CATALOG.map(entry => entry.descs.en);
  const uniqueEnDescs = new Set(enDescs);
  assert.equal(
    uniqueEnDescs.size,
    CUSTOMER_SERVICE_CATALOG.length,
    'expected every CUSTOMER_SERVICE_CATALOG entry to have a unique English description'
  );
  for (const desc of enDescs) {
    assert.ok(desc.length >= 45, `expected descriptive English text, got "${desc}"`);
  }
});

test('getPlayerRankTitle scales to the 30-stage (90-star) campaign and HTML/HUD show /90 denominator', () => {
  const save = new SaveManager();
  save.lang = 'en';

  const setTotalStars = (total) => {
    save.data.stageStars = Array.from({ length: 30 }, (_, i) => {
      const rem = Math.max(0, total - i * 3);
      return Math.min(3, rem);
    });
  };

  setTotalStars(0);
  assert.equal(save.getPlayerRankTitle(), I18N.en.rank_0);
  setTotalStars(11);
  assert.equal(save.getPlayerRankTitle(), I18N.en.rank_0);
  setTotalStars(12);
  assert.equal(save.getPlayerRankTitle(), I18N.en.rank_1);
  setTotalStars(35);
  assert.equal(save.getPlayerRankTitle(), I18N.en.rank_1);
  setTotalStars(36);
  assert.equal(save.getPlayerRankTitle(), I18N.en.rank_2);
  setTotalStars(65);
  assert.equal(save.getPlayerRankTitle(), I18N.en.rank_2);
  setTotalStars(66);
  assert.equal(save.getPlayerRankTitle(), I18N.en.rank_3);

  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('0/90'), 'index.html #player-rank-badge should show 0/90');
});

test('TrickDirector._endRound("MASTER_CATCH") sets isNewRecord and unlockedNewVenue flags on resultData', async () => {
  const save = new SaveManager();
  save.lang = 'en';
  // Stage 5 had a previous best score of 900, and was NOT yet in completedStages:
  save.data.stageHighScores[4] = 900;
  save.data.completedStages = [1, 2, 3, 4];
  save.data.unlockedStage = 5;

  let capturedResult = null;
  const d = Object.create(TrickDirector.prototype);
  const w = {
    vendorBeatPhase: null,
    clearTrickPresentations: noop,
    clearServingNapkin: noop,
    setServingNapkin: noop,
    napkinProp: { visible: false },
    napkinConeProp: { visible: false },
    leftHandConeProp: { visible: false },
    outerConeGroup: { visible: false },
    giantBlockGroup: { visible: false },
    sliceCueGroup: { visible: false },
    stretchyStrand: { detach: noop },
    heldSocket: new THREE.Group(),
    conePivot: new THREE.Group(),
    setVendorMood: noop,
    triggerSpectatorReaction: noop,
    ringBells: noop,
    spawnBurst: noop,
  };
  Object.assign(d, {
    world: w,
    sound: {
      stopMusic: noop,
      playWinFanfare: noop,
      playCrowdReaction: noop,
    },
    save,
    ui: {
      onRoundEnd(res) {
        capturedResult = res;
      },
    },
    roundEnded: false,
    active: true,
    levelIndex: 0,
    currentStage: 5,
    score: 500,
    hearts: 3,
    targetScoopCount: 3,
    coneWorldPos: new THREE.Vector3(),
    _vibrate: noop,
  });

  const origSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => { fn(); return 0; };
  try {
    d._endRound('MASTER_CATCH');
  } finally {
    globalThis.setTimeout = origSetTimeout;
  }

  assert.ok(capturedResult, 'onRoundEnd should be called with resultData');
  assert.equal(capturedResult.isNewRecord, true, 'should flag isNewRecord when beating previous non-zero stage best');
  assert.equal(capturedResult.unlockedNewVenue, true, 'should flag unlockedNewVenue when clearing stage 5 for the first time');
});
