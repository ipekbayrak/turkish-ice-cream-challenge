import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { makeVendorFlourishFixture } from './vendor-flourish-fixture.js';
import { TRICK_CATALOG, ICE_CREAM_FLAVORS } from '../src/protocol.js';
import { RhythmClock } from '../src/rhythm-clock.js';
import { MusicTransport } from '../src/music-transport.js';
import { VendorPoleRejoin } from '../src/vendor-flourish.js';
import { FLAVOR_FEINT_ID, createFlavorFeintPlan } from '../src/flavor-feint-plan.js';
import { announceFlavorPrank, flavorPrankTitle, flavorFeintCue } from '../src/flavor-feint-show.js';

const baseInput = {
  isPointerDown: false,
  isMoving: false,
  isReaching: false,
  normX: 0,
  normY: 0,
  aimNormX: 0,
  aimNormY: 0,
  pointerX: 195,
  pointerY: 700,
  handWorldPos: new Vector3(0.2, 1.2, 0.3),
  intentWorldPos: new Vector3(0.2, 1.2, 0.3),
  pointerEpoch: 0,
  cancelEpoch: 0,
};

test('SHELL_SWAP_DUEL, SHOW_ELDEN_ELE_TERS and all catalog tricks survive AFK Scenario 4 interrupt + VendorPoleRejoin without throwing', () => {
  const { w, d } = makeVendorFlourishFixture(1, 1);
  w._buildIceCreamCart();
  w.spawnBurst = () => {};
  w.stretchyStrand.attach = () => {};
  w.stretchyStrand.update = () => {};
  w.stretchyStrand.detach = () => {};

  for (const trick of TRICK_CATALOG) {
    d.setOrderConfig(1, [1], 31);
    d.resetRound(31, false);
    d.routine = [trick.id, 'FINAL_PISTACHIO_CATCH'];
    d.scoopCount = 1;
    w.updateIceCreamScoops(1, false);
    w.applySelectedFlavorColors([1]);
    d.active = true;
    d._enterRoutineStep(0);

    // Advance into trick, force AFK Scenario 4 flourish, then interrupt with touch and let rejoin complete
    for (let f = 0; f < 10; f++) {
      d.update(1 / 30, f / 30, baseInput);
      w.updateEnvironmentAnimations(f / 30, 1 / 30, 0, 0, null, 0);
    }

    // Explicitly trigger AFK Scenario 4 when eligible (same path Master Pala took in player report)
    d.idleSeconds = 2.4;
    d.afkScenario = 3;
    d.afkTimer = 3.25;
    for (let f = 10; f < 55; f++) {
      d.update(1 / 30, f / 30, baseInput);
      w.updateEnvironmentAnimations(f / 30, 1 / 30, 0, 0, null, 0);
    }

    const touchInput = {
      ...baseInput,
      isPointerDown: true,
      isMoving: true,
      isReaching: true,
      pointerEpoch: 1,
    };
    for (let f = 55; f < 120; f++) {
      assert.doesNotThrow(
        () => {
          d.update(1 / 30, f / 30, touchInput);
          w.updateEnvironmentAnimations(f / 30, 1 / 30, 0, 0, null, 0);
        },
        `Trick ${trick.id} threw at frame ${f} after AFK Scenario 4 touch interrupt`
      );
    }
  }
});

test('SHELL_SWAP_DUEL handles null leftHandCustomTarget in both spin (<1.2s) and stationary (>=1.2s) branches', () => {
  const { w, d } = makeVendorFlourishFixture(1, 1);
  w._buildIceCreamCart();
  d.setOrderConfig(1, [0], 5);
  d.resetRound(5, false);
  d.routine = ['SHELL_SWAP_DUEL', 'FINAL_PISTACHIO_CATCH'];
  d.scoopCount = 1;
  w.updateIceCreamScoops(1, false);
  d.active = true;
  d._enterRoutineStep(0);

  // Branch 1: stageTimer < 1.2 right after finishVendorRejoin cleared leftHandCustomTarget
  d.stageTimer = 0.25;
  d.leftHandCustomTarget = null;
  d.update(1 / 60, 0.25, baseInput);
  assert.ok(d.leftHandCustomTarget instanceof Vector3);

  // Branch 2: stageTimer >= 1.2 right after finishVendorRejoin cleared leftHandCustomTarget
  d.stageTimer = 1.45;
  d.leftHandCustomTarget = null;
  d.update(1 / 60, 1.45, baseInput);
  assert.ok(d.leftHandCustomTarget instanceof Vector3);
  assert.equal(w.napkinConeProp.visible, true);
});

test('TrickDirector.update keeps advancing stageTimer when iOS WebAudio context is suspended or interrupted', () => {
  const { w, d } = makeVendorFlourishFixture(1, 1);
  w._buildIceCreamCart();
  d.setOrderConfig(1, [1], 5);
  d.resetRound(5, false);
  d.routine = ['SHAFT_SPIN_360', 'FINAL_PISTACHIO_CATCH'];
  d.scoopCount = 1;
  w.updateIceCreamScoops(1, false);

  // Simulate iOS Safari/Chrome AudioContext stuck in 'interrupted' state with frozen currentTime
  const frozenCtx = { state: 'interrupted', currentTime: 4.0 };
  const clock = new RhythmClock(1);
  const transport = new MusicTransport(clock, () => frozenCtx);
  assert.ok(transport);
  d.rhythmClock = clock;
  d.active = true;
  d._enterRoutineStep(0);

  const before = d.stageTimer;
  for (let i = 0; i < 30; i++) {
    d.update(1 / 60, i / 60, baseInput);
  }
  assert.ok(d.stageTimer > before + 0.25, `Expected stageTimer to advance despite interrupted AudioContext, got ${d.stageTimer}`);
});

test('VendorPoleRejoin and _prepareIdleServing abort complete via max-age fallback without deadlocking', () => {
  const { w, d } = makeVendorFlourishFixture(1, 0);
  w._buildIceCreamCart();
  const rejoin = new VendorPoleRejoin(w, 0.5);
  // Perturb cone position far away so physical distance stays > 0.025
  w.conePivot.position.set(5, 5, 5);
  for (let i = 0; i < 80; i++) rejoin.step(1 / 60);
  assert.equal(rejoin.inContact, true, 'VendorPoleRejoin must release via max-age fallback instead of deadlocking');

  // Verify _prepareIdleServing abort clears flourishPreparation cleanly
  d.flourishPreparation = { age: 1.2, from: new Vector3(), stageTimer: 0.4, abort: true };
  assert.equal(d._prepareIdleServing(1 / 60), true);
});

test('Wrong-flavor prank (Pistachio -> Mulberry) clearly announces prank in all 6 languages and restores ordered flavor', () => {
  const { w, d } = makeVendorFlourishFixture(2, 1);
  w._buildIceCreamCart();
  d.setOrderConfig(1, [1], 31); // Ordered: Pistachio (index 1)
  d.resetRound(31, false);

  const plan = createFlavorFeintPlan(['CUSTOMER_SCOOP_SHOW', 'FINAL_PISTACHIO_CATCH'], [1], 1, {
    random: () => 0.99,
    chance: 1,
  });
  plan.offered = 3; // Offered: Black Mulberry (red, index 3)
  plan.status = 'active';
  d.flavorFeint = plan;
  d.routine = [FLAVOR_FEINT_ID, 'FINAL_PISTACHIO_CATCH'];
  d.scoopCount = 1;
  w.updateIceCreamScoops(1, false);
  w.applySelectedFlavorColors([3]);
  d.active = true;

  for (const lang of ['tr', 'en', 'ar', 'ru', 'de', 'ja']) {
    d.save.lang = lang;
    plan.prepAnnounced = false;
    plan.offerAnnounced = false;
    const spoken = [];
    d.sayLine = (line, mood, dur) => spoken.push({ line, mood, dur });

    announceFlavorPrank(d, 'prep');
    assert.equal(spoken.length, 1, `Expected prep prank bubble for ${lang}`);
    assert.equal(spoken[0].mood, 'taunt');
    assert.ok(spoken[0].line.includes(ICE_CREAM_FLAVORS[1].names[lang]), `${lang} prep line should mention requested flavor`);
    assert.ok(spoken[0].line.includes(ICE_CREAM_FLAVORS[3].names[lang]), `${lang} prep line should mention offered prank flavor`);

    d._enterRoutineStep(0);
    assert.equal(spoken.length, 2, `Expected offer prank bubble for ${lang}`);
    assert.equal(spoken[1].mood, 'taunt');

    const title = flavorPrankTitle(d);
    assert.ok(title.includes(ICE_CREAM_FLAVORS[1].names[lang]) && title.includes(ICE_CREAM_FLAVORS[3].names[lang]), `${lang} banner title must explain prank`);

    const cue = flavorFeintCue(d);
    assert.equal(cue.quiet, false);
    if (lang === 'tr') assert.match(cue.text, /SALLA/);
  }
});
