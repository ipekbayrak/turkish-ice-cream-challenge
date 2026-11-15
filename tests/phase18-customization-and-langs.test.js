import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {
  SKIN_TONES,
  SLEEVE_STYLES,
  BRACELET_STYLES,
  NAIL_STYLES,
  normalizeHandStyle,
  applyHandCustomization,
} from '../src/hand-customization.js';
import { HandRig } from '../src/hand-rig.js';
import { SUPPORTED_LANGS, UI_LANGS, SaveManager, I18N } from '../src/storage.js';
import { EXTENDED_LANG_METAS, EXTENDED_DICTIONARIES, initExtendedI18n } from '../src/i18n-extended.js';
import { ORDER_COPY } from '../src/order-view.js';
import { VENUES } from '../src/venues.js';
import { BELL_MELODIES, SECRET_BELL_MELODIES } from '../src/bell-melodies.js';
import { CounterInteractions } from '../src/counter-interactions.js';

function createMockWorldHand() {
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf2c29b, roughness: 0.62 });
  const playerHandRig = new HandRig({ material: skinMat });
  const touristForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.2, 8), skinMat);

  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x1d3557 });
  const cuffMat = new THREE.MeshStandardMaterial({ color: 0x2b4c7e });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x122238 });
  const touristSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.16, 8), sleeveMat);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 6, 12), cuffMat);
  cuff.name = 'player-sleeve-cuff';
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), capMat);
  cap.name = 'player-sleeve-cap';
  touristSleeve.add(cuff, cap);

  const braceletMat = new THREE.MeshStandardMaterial({ color: 0x00b4d8 });
  const touristBracelet = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.004, 8, 16), braceletMat);

  return {
    playerHandRig,
    touristForearm,
    touristPalm: playerHandRig.palm,
    touristSleeve,
    touristBracelet,
  };
}

test('HandCustomization applies all 6 skin tones, sleeves, bracelets/charms, and nail polishes procedurally', () => {
  assert.equal(SKIN_TONES.length, 6);
  assert.equal(SLEEVE_STYLES.length, 6);
  assert.equal(BRACELET_STYLES.length, 6);
  assert.equal(NAIL_STYLES.length, 6);

  // Clamp out-of-range inputs cleanly
  const clamped = normalizeHandStyle({ skin: 99, sleeve: -4, bracelet: 'invalid', nails: 'unknown' });
  assert.deepEqual(clamped, { skin: 5, sleeve: 0, bracelet: 'turquoise', nails: 'natural' });

  const world = createMockWorldHand();

  for (const tone of SKIN_TONES) {
    applyHandCustomization(world, { skin: tone.id, nails: 'natural' });
    assert.equal(world.touristForearm.material.color.getHex(), tone.hex);
  }

  // Watch charm visibility
  applyHandCustomization(world, { skin: 4, sleeve: 2, bracelet: 'watch', nails: 'crimson' });
  assert.equal(world.touristBracelet.visible, true);
  assert.equal(world.touristBracelet.getObjectByName('player-watch-dial').visible, true);
  assert.equal(world.touristBracelet.getObjectByName('player-nazar-bead').visible, false);
  assert.equal(world.playerHandRig.nailMat.color.getHex(), 0xbe123c);
  assert.equal(world.touristSleeve.material.color.getHex(), SLEEVE_STYLES[2].main);
  assert.equal(world.touristSleeve.getObjectByName('player-sleeve-cuff').material.color.getHex(), SLEEVE_STYLES[2].cuff);

  // Nazar (Evil Eye) bead visibility + gold nail polish metalness
  applyHandCustomization(world, { skin: 2, sleeve: 4, bracelet: 'evil_eye', nails: 'gold' });
  assert.equal(world.touristBracelet.getObjectByName('player-watch-dial').visible, false);
  assert.equal(world.touristBracelet.getObjectByName('player-nazar-bead').visible, true);
  assert.equal(world.playerHandRig.nailMat.color.getHex(), 0xf59e0b);
  assert.ok(world.playerHandRig.nailMat.metalness > 0.5);

  // Bracelet 'none' hides the wrist accessory completely
  applyHandCustomization(world, { bracelet: 'none' });
  assert.equal(world.touristBracelet.visible, false);

  // SaveManager persistence roundtrip
  const store = new Map();
  const prevStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  };
  try {
    const save1 = new SaveManager();
    save1.setHandStyle({ skin: 5, bracelet: 'gold', sleeve: 3, nails: 'pistachio' });
    const save2 = new SaveManager();
    assert.deepEqual(save2.data.handStyle, {
      skin: 5,
      bracelet: 'gold',
      sleeve: 3,
      nails: 'pistachio',
    });
  } finally {
    globalThis.localStorage = prevStorage;
  }
});

test('Extended short-video UI languages (es, pt, id, hi, ko) register into UI_LANGS without altering 6-language encyclopedia SUPPORTED_LANGS', () => {
  initExtendedI18n();
  assert.equal(SUPPORTED_LANGS.length, 6, 'SUPPORTED_LANGS stays at 6 full encyclopedia languages');
  assert.equal(UI_LANGS.length, 11, 'UI_LANGS exposes all 11 UI languages');

  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const save = new SaveManager();

  for (const meta of EXTENDED_LANG_METAS) {
    assert.ok(UI_LANGS.some((l) => l.code === meta.code), `${meta.code} registered in UI_LANGS`);
    assert.ok(html.includes(`data-lang="${meta.code}"`), `index.html has language button for ${meta.code}`);
    assert.ok(ORDER_COPY[meta.code], `ORDER_COPY defines ${meta.code}`);

    const setCode = save.setLang(meta.code);
    assert.equal(setCode, meta.code);
    assert.equal(save.getLangMeta().code, meta.code);

    // Core UI keys come from EXTENDED_DICTIONARIES, never raw key names or Turkish
    for (const key of ['gameTitle', 'playBtn', 'cue_reach', 'cue_bite_cone', 'dailyBtn', 'challengeBtn', 'handCustomBtn']) {
      const val = save.t(key);
      assert.equal(val, EXTENDED_DICTIONARIES[meta.code][key]);
      assert.notEqual(val, I18N.tr[key]);
    }

    // Flavor and venue names/subtitles are localized for each extended language
    const pistachioName = save.getFlavorName(1);
    assert.ok(pistachioName.length > 0);
    assert.notEqual(pistachioName, 'Antep Fıstıklı');
    for (const v of VENUES) {
      assert.ok(v.name[meta.code], `venue ${v.id} name in ${meta.code}`);
      assert.ok(v.subtitle[meta.code], `venue ${v.id} subtitle in ${meta.code}`);
    }

    // Non-translated 111-trick encyclopedia descriptions fall back cleanly to English, never Turkish
    const trickInfo = save.getTrickInfo('CUSTOMER_MOLD_MOUNT');
    assert.equal(trickInfo.name, 'The Mold on Your Cone');
  }
});

test('5 new Easter eggs: 4 SECRET_BELL_MELODIES + 3-poke mustache-twirl work via CounterInteractions without breaking BELL_MELODIES', () => {
  assert.equal(BELL_MELODIES.length, 3, 'base BELL_MELODIES remains 3');
  assert.equal(SECRET_BELL_MELODIES.length, 4, '4 secret bell melodies added');

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const bells = Array.from({ length: 7 }, (_, index) => ({
    index,
    strikeCooldown: 0,
    worldPos: new THREE.Vector3((index - 3) * 0.35, 0, 0),
  }));

  let ringCalls = 0;
  let facePokes = 0;
  const world = {
    camera,
    bells,
    getBellBodyCenter(index, target) {
      return target.copy(bells[index].worldPos);
    },
    strikeBell() {},
    ringBells() {
      ringCalls++;
    },
    playFaceTouch() {
      facePokes++;
    },
    vendorHead: {
      matrixWorld: new THREE.Matrix4().makeTranslation(0, 0.6, 0),
      updateWorldMatrix() {},
    },
    culturalScene: null,
  };

  const sound = {
    playBellNote() {},
    speakVendor() {},
  };

  const recognizedIds = [];
  const counter = new CounterInteractions(world, sound, {
    onRecognized: (id) => recognizedIds.push(id),
  });

  // 1. Full-rack sweeps and repeated single-bell spam must NOT false-trigger any of the 7 melodies
  for (let round = 0; round < 12; round++) {
    for (let i = 0; i < 7; i++) counter.melodies.note(i);
    for (let i = 6; i >= 0; i--) counter.melodies.note(i);
  }
  assert.equal(recognizedIds.length, 0, 'sweeps must never trigger any melody');

  // 2. Every secret bell melody is recognized and plays its continuation cleanly
  for (const secret of SECRET_BELL_MELODIES) {
    counter.melodies.reset();
    for (let idx = 0; idx < secret.intro.length; idx++) {
      const matched = counter.melodies.note(secret.intro[idx]);
      assert.equal(matched, idx === secret.intro.length - 1, `match on final note of ${secret.id}`);
    }
    assert.equal(recognizedIds.at(-1), secret.id);
    assert.equal(counter.melodies.isPlaying, true);
  }

  // 3. 5th Easter egg: 3 face pokes on the vendor trigger 'mustache-twirl' once
  counter.reset();
  const width = 800;
  const height = 600;
  const noseWorld = new THREE.Vector3(0, 0.002, 0.194).applyMatrix4(world.vendorHead.matrixWorld);
  const noseScreen = counter.project(noseWorld, width, height);

  for (let pokeIdx = 1; pokeIdx <= 3; pokeIdx++) {
    // Move finger into nose zone so moved=true and target.id !== previousContact
    counter.update(0.1, {
      active: true,
      empty: true,
      x: noseScreen.x,
      y: noseScreen.y - 40,
      epoch: pokeIdx,
      width,
      height,
      melodyEnabled: true,
    });
    counter.update(0.1, {
      active: true,
      empty: true,
      x: noseScreen.x,
      y: noseScreen.y,
      epoch: pokeIdx,
      width,
      height,
      melodyEnabled: true,
    });
    // Release and advance past FACE_COOLDOWN_SECONDS (2.0s; MAX_DT_SECONDS = 0.1)
    for (let step = 0; step < 22; step++) {
      counter.update(0.1, {
        active: false,
        empty: true,
        x: 0,
        y: 0,
        epoch: pokeIdx,
        width,
        height,
        melodyEnabled: true,
      });
    }
  }

  assert.equal(facePokes, 3);
  assert.ok(ringCalls >= 1);
  assert.equal(recognizedIds.filter((id) => id === 'mustache-twirl').length, 1);
});
