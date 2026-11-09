import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TrickDirector } from '../src/tricks.js';
import { EXTRA_TRICK_CATALOG, enterExtraTrick, enterServingNapkin } from '../src/trick-extensions.js';
import { CAMPAIGN_LEVELS, TRICK_CATALOG } from '../src/protocol.js';
import { GestureValidation } from '../src/gesture-validation.js';
import { StallEffects } from '../src/stall-effects.js';
import {paperReturnHandTarget} from '../src/napkin-return.js';
import { GameWorld } from '../src/world.js';
import { stretchCutGuide } from '../src/stretch-cut.js';

const noop = () => {};
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
function fixture(mechanic) {
  const world = Object.create(GameWorld.prototype);
  world.scene = new THREE.Scene();
  for (const key of ['paddleGroup', 'paddleRollGroup', 'conePivot', 'scoopStackGroup', 'heldSocket', 'giantBlockGroup', 'vendorGroup', 'touristHand', 'mainConeMesh', 'sliceCueGroup', 'outerConeGroup', 'napkinProp', 'napkinConeProp', 'leftHandConeProp', 'heldEmptyCone', 'heldNapkin', 'heldNapkinCone', 'carryScoop']) world[key] = new THREE.Group();
  world.scene.add(world.paddleGroup, world.heldSocket, world.giantBlockGroup, world.vendorGroup, world.touristHand);
  world.paddleGroup.add(world.paddleRollGroup, world.conePivot);
  world.conePivot.add(world.scoopStackGroup);
  world.lArmRig = { handGroup: new THREE.Group() }; world.scene.add(world.lArmRig.handGroup);
  world.giantBlockHeight = 0.34;
  world.scoopMeshes = Array.from({length: 8}, (_, index) => { const scoop = new THREE.Group(); scoop.position.y = .045 + index * .035; return scoop; }); world.scoopStackGroup.add(...world.scoopMeshes);
  world.giantBlockMat = { color: { setHex: noop } };
  world.tubIceGroups = Array.from({length: 6}, () => ({ fill: 1 }));
  world.tubPositions = Array.from({length: 6}, (_, index) => ({ worldPos: V(-.5 + index * .2, .99, -.3), color: 0xffffff }));
  world.stretchyStrand = { active: false, nodes: [V(-.2, 1.22, .18), V(.2, 1.22, .18)], attach() { this.active = true; }, detach() { this.active = false; }, update: noop };
  world.stallEffects = new StallEffects(world);
  world.updateIceCreamScoops = (count) => { world.visibleScoops = count; world.scoopMeshes.forEach((m, i) => { m.visible = i < count; }); };
  for (const key of ['setVendorMood', 'triggerScoopJiggle', 'triggerSpectatorReaction', 'ringBells', 'spawnBurst', 'setVendorCharacter', 'applySelectedFlavorColors', 'churnTubIceCream']) world[key] = noop;
  world.projectToScreen = (p) => ({ x: 200 + p.x * 100, y: 300 - p.y * 100 });
  world.coneSpring = { pos: V(), target: V(), vel: V() };
  world.carryScoop.material = { color: { setHex: noop } };
  const d = Object.create(TrickDirector.prototype);
  const calls = { advance: 0, end: null, reactions: [] };
  Object.assign(d, {
    world, sound: new Proxy({}, { get: () => noop }), save: { data: { tutorialCompleted: false }, setOrderPreferences: noop, discoverTrick: noop },
    ui: { onReaction: (event) => calls.reactions.push(event) },
    active: true, roundEnded: false, config: { speedMult: 1 }, currentStage: 1, levelIndex: 0,
    currentMechanic: mechanic, routineIndex: 0, routine: [mechanic, 'FINAL_PISTACHIO_CATCH'],
    score: 0, scoopCount: 1, targetScoopCount: 1, selectedFlavors: [0], hearts: 3, penaltiesTaken: 0,
    subStep: 0, stageTimer: 0, stepCooldown: 0, heldItem: null, tugTimer: 0,
    bellBeatsDone: 0, rhythmBeatsCompleted: 0, rhythmTargetPos: V(0, 1.22, .27),
    coneWorldPos: V(0, 1.22, .27), coneTargetPos: V(0, 1.22, .27),
    shaftRoll: 0, conePitchX: 0, coneFlipZ: 0, vendorBubbleTimer: 0, vignetteFlash: {alpha: 0}, floatingPopups: [],
    midpointHoverTimer: 0, idleSeconds: 0, passiveLimitSec: 22, isAfkShowActive: false,
    gestureValidation: new GestureValidation(),
    _getTubWorldPosForScoop: () => V(-.42, .99, -.3), _getFlavorForScoop: () => ({ index: 0, colorHex: 0xfff8e7 }),
    _triggerVendorSpeech: noop, _vibrate: noop, _spawnScorePopup: noop,
    _advanceRoutineStep() { calls.advance++; d.active = false; },
    _endRound(outcome) { calls.end = outcome; d.roundEnded = true; d.active = false; },
    _applyKinematics(dt) {
      world.paddleGroup.position.copy(d.coneTargetPos); d.coneWorldPos.copy(d.coneTargetPos);
      if (d.leftHandCustomTarget) world.lArmRig.handGroup.position.copy(d.leftHandCustomTarget);
      if (world.conePivot.parent === world.lArmRig.handGroup) world.conePivot.position.set(0, .11, .035);
      if (world.conePivot.parent === world.paddleGroup) world.conePivot.position.set(0, .02, 0);
      world.scene.updateMatrixWorld(true); world.stallEffects.update(dt);
    },
  });
  const state = { isPointerDown: false, isReaching: false, isMoving: false, pointerEpoch: 0, cancelEpoch: 0, normX: .4, normY: -.5, vx: 0, intentWorldPos: V(.22, 1.04, .64), handWorldPos: V(.22, 1.04, .64) };
  if (EXTRA_TRICK_CATALOG.some((t) => t.id === mechanic)) enterExtraTrick(d);
  if (mechanic === 'NAPKIN_CONE_FAKEOUT') enterServingNapkin(d);
  let time = 0;
  return {
    d, world, state, calls,
    tick(frames = 1) { for(let i=0;i<frames;i++) { time += 1/60; d.update(1/60,time,state); } },
    touch(p) { state.isPointerDown = state.isReaching = true; state.pointerEpoch++; world.heldSocket.position.copy(p); this.move(p); },
    move(p) { state.intentWorldPos.copy(p); state.normX=p.x/.54; state.normY=(p.y-1.22)/.36; },
    atCone() { world.scene.updateMatrixWorld(true); return world.conePivot.getWorldPosition(V()); },
  };
}

test('three distinct service variations extend progressive pools without changing original progression', () => {
  assert.equal(new Set(TRICK_CATALOG.map((t) => t.id)).size, TRICK_CATALOG.length);
  assert.deepEqual(CAMPAIGN_LEVELS.slice(0, 10).map((l) => l.trickCount), [4,4,5,5,6,6,7,7,8,9]);
  assert.deepEqual(CAMPAIGN_LEVELS.slice(0, 10).map((l) => l.speedMult), [.78,.86,.94,1,1.06,1.12,1.18,1.24,1.3,1.38]);
  assert.ok(CAMPAIGN_LEVELS[0].trickPool.includes('WHOLE_MOLD_ON_CONE'));
  assert.ok(!CAMPAIGN_LEVELS[1].trickPool.includes('SCOOP_LIFT_BACK'));
  assert.ok(CAMPAIGN_LEVELS[2].trickPool.includes('SCOOP_LIFT_BACK'));
  assert.ok(!CAMPAIGN_LEVELS[3].trickPool.includes('BONUS_SCOOP_TAKEBACK'));
  assert.ok(CAMPAIGN_LEVELS[4].trickPool.includes('BONUS_SCOOP_TAKEBACK'));
});

test('normal routines never insert tutorial and one-scoop orders schedule one preparation', () => {
  for (const level of CAMPAIGN_LEVELS) {
    const routine = TrickDirector.prototype._buildDynamicRoutineForStage.call({ targetScoopCount: 1 }, level, true);
    assert.equal(routine.includes('TUTORIAL_WARMUP'), false);
    assert.equal(routine.filter((id) => id === 'SCRAPE_FLAVOR_SCOOP').length, 1);
    assert.equal(routine.at(-1), 'FINAL_PISTACHIO_CATCH');
  }
  const f = fixture('MEGA_TAFFY_SLICE');
  f.d._hideAllProps = noop; f.d._reattachConeToPaddle = noop; f.d._enterRoutineStep = noop;
  f.d.forceTutorialNext = true;
  f.d.resetRound(1, true);
  assert.equal(f.d.routine.includes('TUTORIAL_WARMUP'), false);
  f.d.setOrderConfig(1, [0]);
  assert.equal(f.d.targetScoopCount, 1);
});

test('whole mold visibly mounts on the real cone, returns to its tub, then requires a fresh catch', () => {
  const f = fixture('WHOLE_MOLD_ON_CONE');
  f.tick(80);
  assert.equal(f.world.giantBlockGroup.parent, f.world.conePivot);
  assert.equal(f.world.giantBlockGroup.visible, true);
  assert.equal(f.world.visibleScoops,1,'the temporary mold does not blink the ordered ice out of existence');
  f.tick(100);
  assert.equal(f.d.subStep, 1);
  assert.equal(f.world.giantBlockGroup.parent, f.world.scene);
  assert.equal(f.world.giantBlockGroup.visible, false);
  assert.equal(f.world.tubIceGroups[0].fill, 1);
  assert.equal(f.world.visibleScoops, 1);
  assert.equal(f.calls.advance, 0);
  f.touch(f.d.coneWorldPos.clone()); f.tick(8);
  assert.equal(f.calls.advance, 1);
  assert.equal(f.d.score, 360);
});

test('scoops really leave the cone after catch and pull, and the fooled player returns the same bare cone under them', () => {
  const f = fixture('SCOOP_LIFT_BACK'); const originalCone=f.world.conePivot, originalScoops=f.world.scoopStackGroup;
  f.tick(25);
  f.touch(f.atCone()); f.tick(8);
  assert.equal(f.d.extraTrick.fullCaught, true);
  assert.equal(f.d.heldItem, 'FULL_FOR_LIFT');
  assert.equal(originalCone.parent, f.world.heldSocket);
  assert.equal(originalScoops.parent, originalCone);
  assert.equal(f.d.hearts, 3);
  f.move(V(0, 1.35, .26)); f.tick(3); f.move(V(0, 1.18, .26)); f.tick(58);
  assert.equal(f.d.extraTrick.liftPulled, true);
  assert.equal(originalScoops.parent, f.world.scene);
  assert.equal(originalCone.children.includes(originalScoops), false);
  assert.equal(f.d.heldItem, 'BARE_CONE');
  assert.equal(originalCone.parent, f.world.heldSocket);
  assert.equal(f.d.subStep, 1);
  assert.equal(f.d.hearts, 2);
  f.touch(f.d.coneWorldPos.clone()); f.tick(9);
  assert.equal(f.d.heldItem, null);
  assert.equal(originalCone.parent, f.world.paddleGroup);
  assert.equal(originalScoops.parent, originalCone);
  assert.equal(f.d.score, 200);
  assert.equal(f.d.hearts, 2);
  assert.equal(f.calls.advance, 0);
  f.tick(20);
  assert.equal(f.calls.advance, 1);
  assert.equal(f.d.score, 200);
  assert.equal(f.d.hearts, 2);
  assert.equal(f.d.scoopCount, 1);
});

test('caught cone in scoop-lift stays filled while stationary until a real downward pull', () => {
  const f = fixture('SCOOP_LIFT_BACK'); const originalCone = f.world.conePivot, originalScoops = f.world.scoopStackGroup;
  f.tick(90);
  assert.equal(Boolean(f.d.extraTrick.fullCaught), false);
  assert.equal(originalScoops.parent, originalCone);
  f.touch(f.atCone()); f.tick(8);
  assert.equal(f.d.extraTrick.fullCaught, true);
  assert.equal(f.d.heldItem, 'FULL_FOR_LIFT');
  f.tick(90);
  assert.equal(Boolean(f.d.extraTrick.liftPulled), false);
  assert.equal(f.d.subStep, 0);
  assert.equal(f.d.heldItem, 'FULL_FOR_LIFT');
  assert.equal(originalScoops.parent, originalCone);
  assert.equal(f.d.hearts, 3);
  assert.equal(f.calls.advance, 0);
  f.move(V(0, 1.35, .26)); f.tick(3); f.move(V(0, 1.18, .26)); f.tick(58);
  assert.equal(f.d.subStep, 1);
  assert.equal(f.d.heldItem, 'BARE_CONE');
  assert.equal(f.d.hearts, 2);
  f.touch(f.d.coneWorldPos.clone()); f.tick(28);
  assert.equal(f.calls.advance, 1);
  assert.equal(f.d.score, 200);
  assert.equal(f.d.hearts, 2);
});

test('extra-scoop offer takes the same cone back, returns only the bait, and requires a new final reach', () => {
  const f = fixture('BONUS_SCOOP_TAKEBACK');
  const originalCone = f.world.conePivot, originalScoops = f.world.scoopStackGroup;
  f.tick(30); f.touch(f.d.coneWorldPos.clone()); f.tick(8);
  assert.equal(f.d.heldItem, 'BONUS_CONE');
  assert.equal(originalCone.parent, f.world.heldSocket);
  assert.equal(originalScoops.parent, originalCone);
  f.tick(35);
  assert.equal(f.calls.advance, 0);
  assert.equal(f.d.subStep, 1); // stationary contact cannot accept the new offer
  assert.equal(f.world.carryScoop.visible,true);
  f.tick(40); // allow the real scoop pickup/offer to finish before accepting
  f.move(f.d.coneWorldPos.clone()); f.tick(9);
  assert.equal(f.d.heldItem, null);
  assert.equal(originalCone.parent, f.world.paddleGroup);
  assert.equal(f.d.subStep, 2);
  f.tick(22);
  assert.equal(originalCone.parent, f.world.lArmRig.handGroup);
  f.tick(45);
  assert.equal(f.d.subStep, 3);
  assert.equal(f.world.carryScoop.visible, false);
  assert.equal(originalCone.parent, f.world.paddleGroup);
  assert.equal(f.calls.advance, 0);
  assert.equal(f.d.scoopCount, 1);
  assert.equal(f.d.targetScoopCount, 1);
  f.move(f.d.coneWorldPos.clone()); f.tick(9);
  assert.equal(f.calls.advance, 1);
  assert.equal(f.d.score, 320);
  assert.equal(originalScoops.parent, originalCone);
});

test('successful cut triggers severing before detach and advances once after a visible aftermath', () => {
  const f = fixture('MEGA_TAFFY_SLICE');
  const order=[];
  f.world.triggerSlice=()=>order.push('cut');
  f.world.stretchyStrand.detach=()=>order.push('detach');
  f.touch(V(0,1.22,.27));
  const guide=stretchCutGuide(f.world);
  for(let i=0;i<30 && f.d.score===0;i++){
    const distance=i<10?0:Math.min(70,(i-10)*8);
    f.state.normX=(guide.center.x+guide.normal.x*distance)/guide.viewport.width*2-1;
    f.state.normY=1-(guide.center.y+guide.normal.y*distance)/guide.viewport.height*2;
    f.tick();
  }
  assert.deepEqual(order.slice(0,2), ['cut','detach']);
  assert.equal(f.d.score, 360);
  assert.equal(f.calls.advance, 0);
  f.tick(20);
  assert.equal(f.calls.advance, 0);
  assert.equal(f.d.score, 360);
  f.tick(22);
  assert.equal(f.calls.advance, 1);
  assert.equal(f.d.score, 360);
});

test('explicit reset clears pending cut completion and presentation ownership', () => {
  const f=fixture('MEGA_TAFFY_SLICE');
  f.d.pendingTrickAdvance=.45;
  let cutClears=0; f.world.clearSlicePresentation=()=>cutClears++;
  f.world.showSleevePresentation({visible:true,owner:'player'});
  f.world.setScoopPresentation('paddle',V(.2,1.4,.2));
  f.d._enterRoutineStep=noop;
  f.d.resetRound(1,false);
  assert.equal(f.d.pendingTrickAdvance,0);
  assert.equal(cutClears,1);
  assert.equal(f.world.scoopStackGroup.parent,f.world.conePivot);
  assert.equal(f.world.paperSleeve.parent,f.world.conePivot);
  assert.equal(f.world.paperSleeve.visible,false);
});

test('sayLine protects story captions while repeated reaction captions are throttled', () => {
  const f=fixture('BONUS_SCOOP_TAKEBACK');
  f.d._triggerVendorSpeech=TrickDirector.prototype._triggerVendorSpeech;
  f.d.save.t=(key)=>key;
  f.d.speechClock=0;
  f.d.sayLine('Kadir kartpostalı tanıdı.','hmm',2.4);
  f.d._triggerVendorSpeech('hoppa');
  assert.equal(f.d.vendorBubbleText,'Kadir kartpostalı tanıdı.');
  f.d.speechClock=3;
  f.d._triggerVendorSpeech('hoppa');
  assert.equal(f.d.vendorBubbleText,'speech_hoppa');
  f.d.vendorBubbleTimer=.2;
  f.d.speechClock=3.1;
  f.d._triggerVendorSpeech('hoppa');
  assert.equal(f.d.vendorBubbleTimer,.2);
});

test('new physical cone handoffs preserve the current world position before settling into the hand',()=>{
 const f=fixture('BONUS_SCOOP_TAKEBACK');
 f.world.conePivot.position.set(.15,1.1,.2);f.world.heldSocket.position.set(-.2,.9,.4);f.world.scene.updateMatrixWorld(true);
 const before=f.world.conePivot.getWorldPosition(V());f.world.handoffCone('player');
 assert.ok(f.world.conePivot.getWorldPosition(V()).distanceTo(before)<1e-8);
 f.world.stallEffects.update(.016);assert.ok(f.world.conePivot.position.distanceTo(V(0,.05,0))>.01);
 for(let i=0;i<40;i++)f.world.stallEffects.update(1/60);assert.ok(f.world.conePivot.position.distanceTo(V(0,.05,0))<.002);
});


test('serving-paper pinch transfers the same sheet while the real cone and ice stay on the rod', () => {
  const f = fixture('NAPKIN_CONE_FAKEOUT');
  const paper = f.world.servingNapkin, cone = f.world.conePivot, scoops = f.world.scoopStackGroup;
  const transfers = [];
  const set = f.world.setServingNapkin.bind(f.world);
  f.world.setServingNapkin = (options) => {
    if (options.owner === 'player' && paper.parent !== f.world.heldSocket) {
      const before = paper.getWorldPosition(V()); set(options);
      transfers.push(paper.getWorldPosition(V()).distanceTo(before));
    } else set(options);
  };
  f.tick(30); f.touch(paper.getWorldPosition(V()));
  for (let i = 0; i < 15 && !f.d.heldItem; i++) f.tick();
  assert.equal(f.d.heldItem, 'NAPKIN');
  assert.equal(paper.parent, f.world.heldSocket);
  assert.equal(cone.parent, f.world.paddleGroup);
  assert.equal(scoops.parent, cone);
  assert.equal(f.world.napkinConeProp.visible, false);
  assert.equal(f.world.heldNapkinCone.visible, false);
  assert.ok(transfers.length === 1 && transfers[0] < 1e-8, 'paper must attach without a world-space jump');
  assert.equal(f.d.hearts, 2);
  const firstCone = f.d.coneWorldPos.clone();
  f.tick(30);
  assert.equal(Boolean(f.d.servingNapkinState.pulled), false);
  assert.ok(f.d.coneWorldPos.distanceTo(firstCone) < 1e-6, 'pole waits for downward pull before stripping paper');
  f.move(V(0, 1.35, .26)); f.tick(3); f.move(V(0, 1.18, .26)); f.tick(2);
  assert.equal(f.d.servingNapkinState.pulled, true);
  f.tick(12);
  assert.ok(f.d.coneWorldPos.distanceTo(firstCone) > .06, 'same pole/cone must visibly retract from the held paper');
  assert.equal(f.calls.advance, 0);
  f.tick(20);
  assert.equal(f.d.subStep, 2);
  // Recovery now keeps the sheet and animates a real vendor pickup/wrap.
  const owners=new Set();
  for(let i=0;i<300&&f.d.subStep===2;i++){
    f.world.heldSocket.position.copy(paperReturnHandTarget(f.d,V(.08,1.21,.30)));
    f.tick();owners.add(paper.parent);assert.equal(f.world.stallEffects.napkinFlight,false);
    assert.equal(f.world.servingNapkin,paper);
  }
  assert.equal(f.d.heldItem,null);assert.equal(f.d.subStep,3);
  assert.ok(owners.has(f.world.lArmRig.handGroup));assert.ok(owners.has(cone));
  assert.equal(paper.parent,cone);assert.equal(paper.visible,true);
  assert.equal(f.d.score,140);assert.equal(cone.parent,f.world.paddleGroup);
  f.tick(30);
  assert.equal(f.calls.advance, 0);
  f.touch(f.d.coneWorldPos.clone()); f.tick(8);
  assert.equal(f.calls.advance, 1);
  assert.equal(f.d.score, 140, 'real offer cannot duplicate the recovery reward');
});

test('waiting out serving-paper bait preserves the old safe reward only after a fresh real offer', () => {
  const f = fixture('NAPKIN_CONE_FAKEOUT');
  f.tick(145);
  assert.equal(f.d.subStep, 3);
  assert.equal(f.d.hearts, 3);
  assert.equal(f.d.score, 0);
  assert.equal(f.calls.advance, 0);
  f.touch(f.d.coneWorldPos.clone()); f.tick(8);
  assert.equal(f.calls.advance, 1);
  assert.equal(f.d.score, 360);
});

test('berry-flavor reset stays inactive without a colored strand or serving-paper artifact; start enters preparation', () => {
  const f = fixture('NAPKIN_CONE_FAKEOUT');
  f.d.selectedFlavors = [3];
  f.d._getFlavorForScoop = TrickDirector.prototype._getFlavorForScoop;
  f.d.protocol = {emitCommand: noop};
  f.world.stretchyStrand.active = true;
  f.world.setServingNapkin({owner:'player',peel:1,visible:true});
  f.d.resetRound(1);
  assert.equal(f.d.active, false);
  assert.equal(f.world.stretchyStrand.active, false);
  assert.equal(f.world.servingNapkin.visible, false);
  assert.equal(f.world.napkinConeProp.visible, false);
  assert.equal(f.world.carryScoop.visible, false);
  f.tick(120);
  assert.equal(f.world.stretchyStrand.active, false);
  f.d.startRound();
  assert.equal(f.d.currentMechanic, 'SCRAPE_FLAVOR_SCOOP');
  assert.equal(f.world.stretchyStrand.active,false,'no instant tub-to-cone strand before the dip');
  f.tick(40);assert.equal(f.world.stretchyStrand.active,false,'real blade scraping never creates the old thin rope');assert.ok(f.d.presentationStrikeTip);
});

test('later-stage order bounds allow eight chosen flavors and preparation uses each dynamic scoop anchor without overfill', () => {
  const f = fixture('SCRAPE_FLAVOR_SCOOP');
  const flavors = [0,1,2,3,0,1,3,1];
  f.d.setOrderConfig(8, flavors, 30); f.d.resetRound(30);
  assert.equal(f.d.targetScoopCount, 8);
  assert.deepEqual(f.d.selectedFlavors.slice(0,8), flavors);
  f.d._getFlavorForScoop = TrickDirector.prototype._getFlavorForScoop;
  f.d._getTubWorldPosForScoop = TrickDirector.prototype._getTubWorldPosForScoop;
  const indices=[]; const actualAnchor=f.world.getScoopAnchor.bind(f.world);
  f.world.getScoopAnchor=(index)=>{indices.push(index);return actualAnchor(index);};
  for (let scoop=0;scoop<8;scoop++) {
    f.d.currentMechanic='SCRAPE_FLAVOR_SCOOP'; f.d.stageTimer=1.46; f.d.presentationStartPos=f.d.coneWorldPos.clone();
    f.d.active=true; f.d.update(1/60,scoop+1,f.state);
    assert.equal(f.d.scoopCount,scoop+1);
    assert.equal(f.d._getFlavorForScoop(scoop).index,flavors[scoop]);
  }
  assert.deepEqual(indices,[0,1,2,3,4,5,6,7]);
  f.d.active=true; f.d.stageTimer=1.46; f.d.update(1/60,9,f.state);
  assert.equal(f.d.scoopCount,8);
  f.d.setOrderConfig(1,flavors,30); assert.equal(f.d.targetScoopCount,1);
  f.d.setOrderConfig(8,flavors,1); assert.equal(f.d.targetScoopCount,4);
});


test('round end clears the serving paper without moving the real cone off its current owner', () => {
  const f = fixture('NAPKIN_CONE_FAKEOUT');
  f.world.setServingNapkin({owner:'player',peel:1,visible:true});
  const cone=f.world.conePivot;
  Object.assign(f.d.save,{getUstaName:()=>'',t:()=>'',recordStageResult:noop,getStageBestScore:()=>0});
  f.d.ui.onRoundEnd=noop;
  TrickDirector.prototype._endRound.call(f.d,'OUT_OF_HEARTS');
  assert.equal(f.world.servingNapkin.visible,false);
  assert.equal(cone.parent,f.world.paddleGroup);
  assert.equal(f.world.scoopStackGroup.parent,cone);
});
