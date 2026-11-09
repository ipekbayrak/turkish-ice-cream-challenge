import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GameWorld } from '../src/world.js';
import { TrickDirector } from '../src/tricks.js';
import { StallEffects } from '../src/stall-effects.js';
import { GestureValidation } from '../src/gesture-validation.js';
import { EXTRA_TRICK_CATALOG, enterExtraTrick, enterServingNapkin } from '../src/trick-extensions.js';
import { enterNestedService, separateNestedCone, layeredServiceCue, LAYERED_SERVICE_ID } from '../src/serving-sequence.js';
const noop=()=>{};const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
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
  world.stretchyStrand = { active: false, nodes: [V(-.2, 1.22, .18), V(.2, 1.22, .18)], attachCount: 0, attach() { this.active = true; this.attachCount++; }, detach() { this.active = false; }, update: noop };
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
  if (mechanic === 'DOUBLE_CONE_SLIDE') enterNestedService(d);
  if (mechanic === 'FINAL_PISTACHIO_CATCH') {
    d.protocol = { emitCommand: noop };
    d._enterRoutineStep(0);
  }
  let time = 0;
  return {
    d, world, state, calls,
    tick(frames = 1) { for(let i=0;i<frames;i++) { time += 1/60; d.update(1/60,time,state); } },
    touch(p) { state.isPointerDown = state.isReaching = true; state.pointerEpoch++; world.heldSocket.position.copy(p); this.move(p); },
    move(p) { state.intentWorldPos.copy(p); world.heldSocket.position.copy(p); state.normX=p.x/.54; state.normY=(p.y-1.22)/.36; },
    atCone() { world.scene.updateMatrixWorld(true); return world.conePivot.getWorldPosition(V()); },
  };
}

test('the actual nested outer wafer changes owner without moving its world pose or replacing it',()=>{
 const f=fixture('DOUBLE_CONE_SLIDE'),w=f.world;f.tick(36);
 const outer=w.outerConeGroup,inner=w.conePivot,scoops=w.scoopStackGroup;
 w.scene.updateMatrixWorld(true);const before=outer.getWorldPosition(V());
 separateNestedCone(f.d);w.scene.updateMatrixWorld(true);
 assert.equal(outer.parent,w.heldSocket);assert.ok(outer.getWorldPosition(V()).distanceTo(before)<1e-10);
 assert.equal(inner.parent,w.paddleGroup);assert.equal(scoops.parent,inner);assert.equal(w.heldEmptyCone.visible,false);
 assert.equal(outer.visible,true);assert.equal(f.d.heldItem,'EMPTY_CONE');
});

test('vendor retrieves the same empty outer cone over a visible interval, then completes once',()=>{
 const f=fixture('DOUBLE_CONE_SLIDE'),w=f.world;f.tick(36);f.touch(f.d.coneWorldPos.clone());f.tick(8);
 assert.equal(f.d.heldItem,'EMPTY_CONE');const outer=w.outerConeGroup;
 assert.equal(Boolean(f.d.nestedService.pulled),false);
 f.move(V(0,1.35,.26));f.tick(3);f.move(V(0,1.18,.26));f.tick(2);
 assert.equal(f.d.nestedService.pulled,true);
 f.state.isPointerDown=f.state.isReaching=false;f.tick(60);
 f.touch(f.d.coneWorldPos.clone());f.tick(8);
 assert.equal(f.d.subStep,2);assert.equal(outer.parent,w.lArmRig.handGroup);assert.equal(outer.visible,true);assert.equal(f.calls.advance,0);
 w.scene.updateMatrixWorld(true);const before=outer.getWorldPosition(V());f.tick(18);
 assert.ok(outer.getWorldPosition(V()).distanceTo(before)>.015,'the retrieved wafer visibly travels with the vendor hand');
 assert.equal(f.calls.advance,0);f.tick(30);assert.equal(f.calls.advance,1);
 assert.equal(outer.parent,w.conePivot);assert.equal(outer.visible,false);assert.equal(f.d.heldItem,null);
});

test('the twelve-step layered service preserves all three identities and all requested ownership changes',()=>{
 const f=fixture(LAYERED_SERVICE_ID),w=f.world;
 const refs={paper:w.servingNapkin,outer:w.outerConeGroup,full:w.conePivot,scoops:w.scoopStackGroup};
 const seen=new Map(),pullPhases=new Set();let key='',frames=0;
 for(let i=0;i<1600&&f.d.active;i++){
  const cue=layeredServiceCue(f.d),phase=f.d.subStep,nextKey=`${phase}:${cue.kind}`;
  if(cue.kind==='pull')pullPhases.add(phase);
  if(cue.kind==='wait'){f.state.isPointerDown=f.state.isReaching=false;key='';frames=0;}
  else if(cue.kind==='pull'){
   const target=V(cue.target.x,frames<3?1.35:1.18,.26);
   if(key!==nextKey){f.touch(target);key=nextKey;frames=1;}else{f.move(target);frames++;}
  }else if(key!==nextKey){f.touch(cue.target.clone());key=nextKey;frames=1;}
  else {f.move(cue.target.clone());frames++;}
  f.tick();
  if(!seen.has(f.d.subStep))seen.set(f.d.subStep,{outer:w.outerConeGroup.parent,paper:w.servingNapkin.parent,full:w.conePivot.parent});
  assert.equal(w.servingNapkin,refs.paper);assert.equal(w.outerConeGroup,refs.outer);assert.equal(w.conePivot,refs.full);assert.equal(w.scoopStackGroup,refs.scoops);
 }
 assert.equal(f.calls.advance,1,`stuck at ${f.d.subStep}`);assert.equal(f.d.hearts,3);assert.equal(f.d.score,520);
 assert.deepEqual([...pullPhases].sort((a,b)=>a-b),[1,6,8,10]);
 assert.equal(seen.size,12);
 assert.equal(seen.get(1).outer,w.heldSocket);assert.equal(seen.get(1).paper,refs.outer);assert.equal(seen.get(1).full,w.paddleGroup);
 assert.equal(seen.get(3).outer,w.lArmRig.handGroup);assert.equal(seen.get(3).paper,w.heldSocket);
 assert.equal(seen.get(5).paper,w.lArmRig.handGroup);
 assert.equal(seen.get(6).outer,w.heldSocket);assert.equal(seen.get(6).paper,w.lArmRig.handGroup,'reoffered empty cone is bare');
 assert.equal(seen.get(8).full,w.heldSocket);assert.equal(seen.get(8).paper,refs.full,'first full offer is wrapped');
 assert.equal(seen.get(10).full,w.heldSocket);assert.equal(seen.get(10).paper,w.lArmRig.handGroup,'second full offer is bare');
 assert.equal(w.conePivot.parent,w.paddleGroup);assert.equal(w.servingNapkin.parent,w.conePivot);assert.equal(w.servingNapkin.visible,true);
});

test('reset during separated layers reassembles and hides transient paper/outer ownership',()=>{
 const f=fixture(LAYERED_SERVICE_ID),w=f.world;
 w.handoffOuterCone('player');w.setServingNapkin({owner:'player',peel:1});w.handoffCone('player');
 f.d._hideAllProps();f.d._reattachConeToPaddle();
 assert.equal(w.outerConeGroup.parent,w.conePivot);assert.equal(w.outerConeGroup.visible,false);
 assert.equal(w.servingNapkin.parent,w.conePivot);assert.equal(w.servingNapkin.visible,false);
 assert.equal(w.conePivot.parent,w.paddleGroup);assert.equal(w.scoopStackGroup.parent,w.conePivot);
});

test('final real wrapped serving changes hands without an artificial brown strand and still requires pull',()=>{
 const f=fixture('FINAL_PISTACHIO_CATCH'),w=f.world;
 Object.assign(f.d.save,{getUstaName:()=> 'Usta',t:key=>key,getStageBestScore:()=>0,recordStageResult:noop});
 f.d.ui.onRoundEnd=noop;
 f.d._endRound=outcome=>{f.calls.end=outcome;TrickDirector.prototype._endRound.call(f.d,outcome);};
 f.d._getFlavorForScoop=()=>({index:0,colorHex:0x633b24});const cone=w.conePivot,paper=w.servingNapkin;
 f.touch(f.d.coneWorldPos.clone());f.tick(8);
 assert.equal(f.d.subStep,1);assert.equal(cone.parent,w.heldSocket);assert.equal(paper.parent,cone);assert.equal(paper.visible,true);
 assert.equal(w.stretchyStrand.attachCount,0);f.tick(60);assert.equal(f.calls.end,null);
 f.move(V(0,1.22,.26));f.tick(4);f.move(V(0,1.08,.39));f.tick(5);
 assert.equal(f.calls.end,'MASTER_CATCH');assert.equal(w.stretchyStrand.active,false);assert.equal(w.stretchyStrand.attachCount,0);
 assert.equal(w.conePivot,cone);assert.equal(w.servingNapkin,paper);
 assert.equal(paper.parent,cone);assert.equal(paper.visible,true,'winning result keeps the actual serving paper on the caught cone');
});
