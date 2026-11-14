import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GameWorld } from '../src/world.js';
import { TrickDirector } from '../src/tricks.js';
import { StallEffects } from '../src/stall-effects.js';
import { GestureValidation } from '../src/gesture-validation.js';
import { SpringVec3 } from '../src/physics.js';
import { enterCustomerService, customerServiceCue, CUSTOMER_MOLD, HAND_INVERT } from '../src/customer-service.js';
import { enterResearchedService, researchedServiceCue, EMPTY_WAFER_TOSS, SCOOP_AIR_CATCH } from '../src/researched-service.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const noop = () => {};

function createJuiceFixture(id, count = 2) {
  const w = Object.create(GameWorld.prototype);
  w.scene = new THREE.Scene();
  for (const key of ['paddleGroup', 'paddleRollGroup', 'conePivot', 'scoopStackGroup', 'heldSocket', 'giantBlockGroup', 'vendorGroup', 'touristHand', 'mainConeMesh', 'sliceCueGroup', 'outerConeGroup', 'napkinProp', 'napkinConeProp', 'leftHandConeProp', 'heldEmptyCone', 'heldNapkin', 'heldNapkinCone', 'carryScoop', 'vendorHead', 'fezTassel']) {
    w[key] = new THREE.Group();
  }
  w.scene.add(w.paddleGroup, w.heldSocket, w.giantBlockGroup, w.vendorGroup, w.touristHand, w.carryScoop);
  w.paddleGroup.add(w.paddleRollGroup, w.conePivot);
  w.conePivot.add(w.scoopStackGroup, w.outerConeGroup);
  w.lArmRig = { handGroup: new THREE.Group() };
  w.scene.add(w.lArmRig.handGroup);
  w.heldSocket.position.set(0, 1.22, 0.26);
  w.touristHand.position.copy(w.heldSocket.position);
  w.paddleStrikeAnchor = new THREE.Object3D();
  w.paddleStrikeAnchor.position.z = 0.035;
  w.paddleGroup.add(w.paddleStrikeAnchor);
  w.giantBlockGroup.visible = false;
  w.carryScoop.visible = false;
  w.giantBlockHeight = 0.34;
  w.giantBlockMat = { color: { setHex: noop } };
  w.servingScale = 1;
  w.scoopMeshes = Array.from({ length: 8 }, (_, i) => {
    const m = new THREE.Group();
    m.position.y = 0.045 + i * 0.055;
    return m;
  });
  w.scoopStackGroup.add(...w.scoopMeshes);
  w.tubIceGroups = Array.from({ length: 6 }, () => ({ fill: 1 }));
  w.tubPositions = Array.from({ length: 6 }, (_, i) => ({ worldPos: V(-0.5 + i * 0.2, 1, -0.3) }));
  w.stretchyStrand = { active: false, attach() { this.active = true; }, detach() { this.active = false; }, update: noop };
  w.stallEffects = new StallEffects(w);
  w.coneSpring = new SpringVec3(0, 1.24, 0.22, 180, 18);
  w.carryScoop.material = { color: { setHex: noop } };
  w.getCounterStrikeTarget = x => V(x, 1.08, 0.32);
  w.orientPaddleAndHands = (roll, left) => {
    if (left) w.lArmRig.handGroup.position.copy(left);
    w.scene.updateMatrixWorld(true);
  };
  w.updateIceCreamScoops = n => {
    w.visibleCount = n;
    w.scoopMeshes.forEach((m, i) => (m.visible = i < n));
  };

  const bursts = [];
  let jiggles = 0;
  for (const key of ['setVendorMood', 'triggerSpectatorReaction', 'ringBells', 'setVendorCharacter', 'applySelectedFlavorColors', 'churnTubIceCream', 'triggerCounterImpact']) {
    w[key] = noop;
  }
  w.triggerScoopJiggle = () => { jiggles++; };
  w.spawnBurst = (pos, color, cnt) => { bursts.push({ pos: pos.clone(), color, cnt }); };
  w.projectToScreen = p => ({ x: 195 + p.x * 150, y: 500 - p.y * 150 });
  w.coneStackWorldPos = V(-0.65, 1.20, -0.60);

  const soundCalls = {};
  const sound = new Proxy({}, {
    get: (_t, key) => (...args) => {
      soundCalls[key] = (soundCalls[key] || 0) + 1;
    }
  });
  const vibrations = [];

  const d = Object.create(TrickDirector.prototype);
  Object.assign(d, {
    world: w,
    sound,
    protocol: { emitCommand: noop },
    save: { data: {}, lang: 'tr', discoverTrick: noop },
    ui: {},
    active: true,
    roundEnded: false,
    config: { speedMult: 1 },
    currentStage: 6,
    levelIndex: 1,
    currentMechanic: id,
    currentShowId: id,
    routineIndex: 0,
    routine: [id, 'FINAL_PISTACHIO_CATCH'],
    score: 0,
    scoopCount: id === CUSTOMER_MOLD ? 0 : count,
    targetScoopCount: count,
    hearts: 3,
    penaltiesTaken: 0,
    subStep: 0,
    stageTimer: 0,
    stepCooldown: 0,
    heldItem: null,
    tugTimer: 0,
    bellBeatsDone: 0,
    rhythmBeatsCompleted: 0,
    rhythmTargetPos: V(0, 1.22, 0.27),
    coneWorldPos: V(0, 1.22, 0.27),
    coneTargetPos: V(0, 1.22, 0.27),
    shaftRoll: 0,
    conePitchX: 0,
    coneFlipZ: 0,
    vendorBubbleTimer: 0,
    vignetteFlash: { alpha: 0 },
    floatingPopups: [],
    midpointHoverTimer: 0,
    idleSeconds: 0,
    passiveLimitSec: 22,
    isAfkShowActive: false,
    gestureValidation: new GestureValidation(),
    _getTubWorldPosForScoop: index => w.tubPositions[index % 6].worldPos.clone(),
    _getFlavorForScoop: index => ({ index: index % 6, colorHex: 0xfff8e7 }),
    _triggerVendorSpeech: noop,
    _vibrate: ms => vibrations.push(ms),
    _spawnScorePopup: noop,
    _advanceRoutineStep() { d.active = false; }
  });

  const input = {
    isPointerDown: false,
    isReaching: false,
    isMoving: false,
    pointerEpoch: 0,
    cancelEpoch: 0,
    normX: 0,
    normY: 0,
    vx: 0,
    handWorldPos: V(0, 1.22, 0.26),
    intentWorldPos: V(0, 1.22, 0.26)
  };

  return { d, w, input, soundCalls, vibrations, bursts, getJiggles: () => jiggles };
}

test('CUSTOMER_MOLD_MOUNT triggers extraction, mount, and return audio-haptic feedback cues', () => {
  const f = createJuiceFixture(CUSTOMER_MOLD, 2);
  f.w.handoffCone('player');
  f.w.stallEffects.update(1);
  enterCustomerService(f.d);

  let time = 0;
  for (let i = 0; i < 400 && f.d.active; i++) {
    time += 1 / 60;
    f.d.update(1 / 60, time, f.input);
    f.w.stallEffects.update(1 / 60);
  }

  assert.equal(f.soundCalls.playStretchPull, 1, 'should play stretch pull sound when extracting whole mold');
  assert.equal(f.soundCalls.playScoopAdded, 1, 'should play scoop added sound when mold mounts onto customer cone');
  assert.equal(f.soundCalls.playPaddleClank, 1, 'should play paddle clank when returning mold to tub');
  assert.ok(f.vibrations.includes(18), 'should vibrate 18ms when mold mounts onto customer cone');
});

test('HAND_INVERTED_OFFER triggers whoosh and scoop jiggle when entering the inverted tilt phase', () => {
  const f = createJuiceFixture(HAND_INVERT, 2);
  enterCustomerService(f.d);

  let time = 0;
  while (f.d.subStep < 2 && time < 3) {
    time += 1 / 60;
    f.d.update(1 / 60, time, f.input);
    f.w.stallEffects.update(1 / 60);
  }

  assert.equal(f.soundCalls.playWhoosh, 1, 'should play whoosh once during hand inversion');
  assert.equal(f.getJiggles(), 1, 'should trigger scoop jiggle once during hand inversion');
});

test('EMPTY_WAFER_TOSS and SCOOP_AIR_CATCH trigger 20ms haptic feedback on mid-air catches', () => {
  for (const id of [EMPTY_WAFER_TOSS, SCOOP_AIR_CATCH]) {
    const f = createJuiceFixture(id, 2);
    f.w.updateIceCreamScoops(2, false);
    enterResearchedService(f.d);
    let time = 0;
    let lastPhase = '';
    for (let i = 0; i < 600 && f.d.active; i++) {
      const cue = researchedServiceCue(f.d);
      if (cue.kind !== 'reach') {
        f.input.isPointerDown = f.input.isReaching = false;
        lastPhase = '';
      } else {
        const key = `${f.d.subStep}:${f.d.researchedService.feints}`;
        if (lastPhase !== key) {
          f.input.pointerEpoch++;
          lastPhase = key;
        }
        f.input.isPointerDown = f.input.isReaching = true;
        f.input.intentWorldPos.copy(cue.target);
        f.input.handWorldPos.copy(cue.target);
        f.input.normX = cue.target.x / 0.54;
        f.input.normY = (cue.target.y - 1.22) / 0.36;
        f.w.heldSocket.position.copy(cue.target);
        f.w.touristHand.position.copy(cue.target);
      }
      time += 1 / 60;
      f.d.update(1 / 60, time, f.input);
      f.w.stallEffects.update(1 / 60);
    }
    assert.ok(f.vibrations.includes(20), `${id} should vibrate 20ms on mid-air catch`);
  }
});

test('FAKE_DROP_PANIC plays initial drop whoosh on entry and FINAL_PISTACHIO_CATCH spawns pistachio particle shower', () => {
  const f = createJuiceFixture('FAKE_DROP_PANIC', 2);
  f.d.routine = ['FAKE_DROP_PANIC', 'FINAL_PISTACHIO_CATCH'];
  f.d._enterRoutineStep(0);
  assert.equal(f.soundCalls.playWhoosh, 1, 'FAKE_DROP_PANIC should play whoosh on entry');

  f.d._enterRoutineStep(1);
  assert.equal(f.d.currentMechanic, 'FINAL_PISTACHIO_CATCH');
  for (let i = 0; i < 25; i++) {
    f.d.update(1 / 60, i / 60, f.input);
  }
  const pistachioBursts = f.bursts.filter(b => b.color === 0x80ed99);
  assert.equal(pistachioBursts.length, 1, 'FINAL_PISTACHIO_CATCH should spawn one green pistachio particle burst');
});
