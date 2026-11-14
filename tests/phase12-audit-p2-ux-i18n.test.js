import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { I18N, SUPPORTED_LANGS, SaveManager } from '../src/storage.js';
import { TRICK_CATALOG } from '../src/protocol.js';
import { VENUES, formatTurkishVenueLocative } from '../src/venues.js';
import { CHOREOGRAPHED_ROUTINES, ROUTINE_CATALOG, BASE_SERVICE_ACTIONS } from '../src/trick-routines.js';
import { ORDER_COPY } from '../src/order-view.js';
import { VENDOR_VOICE_LIMITS } from '../src/audio.js';
import { TrickDirector } from '../src/tricks.js';
import { GameWorld } from '../src/world.js';
import { StallEffects } from '../src/stall-effects.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const noop = () => {};

function makeDirectorFixture() {
  const world = Object.create(GameWorld.prototype);
  world.scene = new THREE.Scene();
  world.canvas = { clientWidth: 400, clientHeight: 800 };
  for (const name of [
    'paddleGroup', 'paddleRollGroup', 'conePivot', 'scoopStackGroup',
    'heldSocket', 'giantBlockGroup', 'vendorGroup', 'touristHand',
    'mainConeMesh', 'sliceCueGroup', 'outerConeGroup', 'napkinProp',
    'napkinConeProp', 'leftHandConeProp', 'heldEmptyCone', 'heldNapkin',
    'heldNapkinCone', 'carryScoop', 'vendorHead', 'fezTassel',
  ]) {
    world[name] = new THREE.Group();
  }
  world.scene.add(world.paddleGroup, world.heldSocket, world.giantBlockGroup, world.vendorGroup, world.touristHand, world.carryScoop);
  world.paddleGroup.add(world.paddleRollGroup, world.conePivot);
  world.conePivot.add(world.scoopStackGroup, world.outerConeGroup);
  world.lArmRig = { handGroup: new THREE.Group() };
  world.scene.add(world.lArmRig.handGroup);
  world.scoopMeshes = Array.from({ length: 12 }, (_, i) => {
    const m = new THREE.Group();
    m.position.y = 0.045 + i * 0.035;
    return m;
  });
  world.scoopStackGroup.add(...world.scoopMeshes);
  world.giantBlockHeight = 0.34;
  world.giantBlockMat = { color: { setHex: noop } };
  world.carryScoop.material = { color: { setHex: noop } };
  world.tubIceGroups = Array.from({ length: 4 }, () => ({ fill: 1 }));
  world.tubPositions = Array.from({ length: 4 }, (_, i) => ({ worldPos: V(-0.3 + i * 0.2, 0.99, -0.3), color: 0xffffff }));
  world.stretchyStrand = { active: false, nodes: [V(), V()], attach: noop, detach() { this.active = false; }, update: noop };
  world.stallEffects = new StallEffects(world);
  world.coneSpring = { pos: V(), target: V(), vel: V(), step() { return this.pos.copy(this.target); } };
  for (const key of [
    'setVendorMood', 'triggerScoopJiggle', 'triggerSpectatorReaction',
    'ringBells', 'spawnBurst', 'setVendorCharacter', 'applySelectedFlavorColors',
    'churnTubIceCream', 'strikeBell', 'throwHeldProp', 'triggerCounterImpact',
    'setServingScale', 'clearTrickPresentations', 'clearServingNapkin', 'setConeInVendorHand',
  ]) {
    world[key] = noop;
  }
  world.updateIceCreamScoops = (count) => {
    world.scoopMeshes.forEach((m, i) => { m.visible = i < count; });
  };

  const save = new SaveManager();
  const spokenTypes = [];
  const sound = new Proxy(
    {
      speakVendor: (type) => {
        spokenTypes.push(type);
        return true;
      },
    },
    { get: (target, prop) => (prop in target ? target[prop] : noop) }
  );
  const director = new TrickDirector(world, sound, save, {
    onTrickStart: noop,
    onReaction: noop,
    onRoundEnd: noop,
  });
  return { director, world, save, spokenTypes };
}

test('4.1 Explicit tutorial warmup option & startTutorialRound prepend TUTORIAL_WARMUP without altering normal resetRound', () => {
  const { director } = makeDirectorFixture();

  // Normal resetRound (even with legacy second arg true) never inserts TUTORIAL_WARMUP
  director.resetRound(1, true);
  assert.equal(director.routine.includes('TUTORIAL_WARMUP'), false);

  // Explicit includeTutorialWarmup prepends TUTORIAL_WARMUP for first-launch warmup
  director.resetRound(1, false, { includeTutorialWarmup: true });
  assert.equal(director.routine[0], 'TUTORIAL_WARMUP');

  // Dedicated startTutorialRound activates TUTORIAL_WARMUP immediately
  assert.equal(director.startTutorialRound(1), true);
  assert.equal(director.active, true);
  assert.equal(director.currentMechanic, 'TUTORIAL_WARMUP');

  // First-launch cone take cue exists in all 6 languages
  for (const { code } of SUPPORTED_LANGS) {
    assert.ok(typeof I18N[code].cue_take_cone === 'string' && I18N[code].cue_take_cone.length > 2, `missing cue_take_cone in ${code}`);
  }
});

test('4.2 Active round HUD cues remain visible during vendor speech and landscape/narrow scoop dots stay readable', () => {
  const css = fs.readFileSync(new URL('../src/interface.css', import.meta.url), 'utf8');
  assert.equal(
    /^\.vendor-speaking\s+\.hud-bottom\s*\{/m.test(css),
    false,
    'interface.css must not unconditionally hide .hud-bottom whenever .vendor-speaking is set'
  );
  assert.ok(
    css.includes('body.vendor-speaking:not(.round-active) .hud-bottom'),
    'interface.css should scope .hud-bottom hiding to non-round-active speech only'
  );
  assert.ok(
    css.includes('body.round-active .hud-top .scoop-dots'),
    'interface.css should keep compact .scoop-dots visible during round-active on landscape/narrow screens'
  );
  assert.ok(
    css.includes('[dir="rtl"] #btn-lang'),
    'interface.css should flip #btn-lang to left side in RTL mode'
  );
});

test('4.3 SaveManager caps discoveredTricks strictly to TRICK_CATALOG (111 max), and vendor voice supports yakala/afiyet & >=10 lines per round', () => {
  const save = new SaveManager();
  save.discoverTrick('FLAVOR_FEINT_RETURN');
  save.discoverTrick('NON_EXISTENT_DEBUG_ID');
  assert.equal(save.isTrickDiscovered('FLAVOR_FEINT_RETURN'), false);
  assert.equal(save.isTrickDiscovered('NON_EXISTENT_DEBUG_ID'), false);

  for (const entry of TRICK_CATALOG) {
    save.discoverTrick(entry.id);
  }
  assert.equal(save.data.discoveredTricks.length, TRICK_CATALOG.length);
  assert.equal(TRICK_CATALOG.length, 111);

  assert.ok(VENDOR_VOICE_LIMITS.maxPerRound >= 10, `expected maxPerRound >= 10, got ${VENDOR_VOICE_LIMITS.maxPerRound}`);

  const { director, save: dSave, spokenTypes } = makeDirectorFixture();
  for (const { code } of SUPPORTED_LANGS) {
    dSave.lang = code;
    director.speechClock = (director.speechClock || 0) + 10;
    director.captionLockUntil = 0;
    director._triggerVendorSpeech('yakala');
    assert.equal(director.vendorBubbleText, I18N[code].speech_yakala);

    director.speechClock += 10;
    director._triggerVendorSpeech('afiyet');
    assert.equal(director.vendorBubbleText, I18N[code].speech_afiyet);
  }
  assert.ok(spokenTypes.includes('hoppa') && spokenTypes.includes('cheer'));

  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('id="achievements-strip"'), 'index.html should render #achievements-strip inside #dialog-tricks');
  assert.ok(html.includes('id="btn-tutorial-warmup"'), 'index.html should provide #btn-tutorial-warmup button');
});

test('4.4 Turkish locative suffixes, 6-language venues, 60 choreographed routines, order plurals, and toggle labels have zero English/grammar leaks', () => {
  // Turkish vowel harmony & possessive buffer 'n'
  assert.equal(formatTurkishVenueLocative('İstiklal', false), 'İstiklal’de');
  assert.equal(formatTurkishVenueLocative('İstiklal', true), 'İstiklal’deki');
  assert.equal(formatTurkishVenueLocative('Galata', false), 'Galata’da');
  assert.equal(formatTurkishVenueLocative('Galata', true), 'Galata’daki');
  assert.equal(formatTurkishVenueLocative('Karaköy', true), 'Karaköy’deki');
  assert.equal(formatTurkishVenueLocative('Kadıköy', true), 'Kadıköy’deki');
  assert.equal(formatTurkishVenueLocative('Üsküdar', false), 'Üsküdar’da');
  assert.equal(formatTurkishVenueLocative('Üsküdar', true), 'Üsküdar’daki');
  assert.equal(formatTurkishVenueLocative('Ustalar Avlusu', false), 'Ustalar Avlusu’nda');
  assert.equal(formatTurkishVenueLocative('Ustalar Avlusu', true), 'Ustalar Avlusu’ndaki');

  // All 6 venues localized in all 6 languages
  for (const place of VENUES) {
    for (const { code } of SUPPORTED_LANGS) {
      assert.ok(typeof place.name[code] === 'string' && place.name[code].trim().length > 0, `venue ${place.id} missing name.${code}`);
      assert.ok(typeof place.subtitle[code] === 'string' && place.subtitle[code].trim().length > 0, `venue ${place.id} missing subtitle.${code}`);
    }
  }

  // All 60 SHOW_* routines localized in ar, ru, de, ja without leaking English step names
  const englishStepLabels = Object.values(BASE_SERVICE_ACTIONS).map((a) => a.label[1]);
  assert.equal(ROUTINE_CATALOG.length, 60);
  assert.equal(CHOREOGRAPHED_ROUTINES.length, 60);
  for (const routine of ROUTINE_CATALOG) {
    for (const lang of ['ar', 'ru', 'de', 'ja']) {
      assert.ok(routine.names[lang] && !routine.names[lang].includes(routine.names.en), `${routine.id} names.${lang} leaked English title "${routine.names.en}"`);
      for (const enLabel of englishStepLabels) {
        assert.equal(
          routine.descs[lang].includes(enLabel),
          false,
          `${routine.id} descs.${lang} leaked English step "${enLabel}"`
        );
      }
    }
  }

  // Russian & Arabic scoop pluralization in ORDER_COPY
  assert.ok(ORDER_COPY.ru.confirm(1).includes('1 шарик') && !ORDER_COPY.ru.confirm(1).includes('шариков'));
  assert.ok(ORDER_COPY.ru.confirm(2).includes('2 шарика'));
  assert.ok(ORDER_COPY.ru.confirm(5).includes('5 шариков'));

  assert.ok(ORDER_COPY.ar.confirm(1).includes('كرة واحدة'));
  assert.ok(ORDER_COPY.ar.confirm(2).includes('كرتان'));
  assert.ok(ORDER_COPY.ar.confirm(3).includes('3 كرات'));
  assert.ok(ORDER_COPY.ar.confirm(11).includes('11 كرة'));

  // Localized ON/OFF toggles across all 6 languages
  for (const { code } of SUPPORTED_LANGS) {
    assert.ok(typeof I18N[code].toggleOn === 'string' && I18N[code].toggleOn.length > 0, `missing toggleOn in ${code}`);
    assert.ok(typeof I18N[code].toggleOff === 'string' && I18N[code].toggleOff.length > 0, `missing toggleOff in ${code}`);
    assert.ok(typeof I18N[code].achievementsLabel === 'string' && I18N[code].achievementsLabel.length > 0, `missing achievementsLabel in ${code}`);
  }
});
