import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GameWorld } from '../src/world.js';
import { TrickDirector } from '../src/tricks.js';
import { StallEffects } from '../src/stall-effects.js';
import { GestureValidation } from '../src/gesture-validation.js';
import { SpringVec3 } from '../src/physics.js';
import { enterResearchedService, researchedServiceCue, WRIST_NEAR_MISS, SCOOP_CONE_RELAY, EMPTY_WAFER_TOSS, SCOOP_AIR_CATCH, RESEARCHED_SERVICE_CATALOG, researchedIdsForStage, isResearchedService } from '../src/researched-service.js';
import { CAMPAIGN_LEVELS } from '../src/protocol.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),noop=()=>{};
function fixture(id,count=2,realRig=false){
 const w=Object.create(GameWorld.prototype);w.scene=new THREE.Scene();
 for(const key of ['paddleGroup','paddleRollGroup','conePivot','scoopStackGroup','heldSocket','giantBlockGroup','vendorGroup','touristHand','mainConeMesh','sliceCueGroup','outerConeGroup','napkinProp','napkinConeProp','leftHandConeProp','heldEmptyCone','heldNapkin','heldNapkinCone','carryScoop','vendorHead','fezTassel'])w[key]=new THREE.Group();
 w.scene.add(w.paddleGroup,w.heldSocket,w.giantBlockGroup,w.vendorGroup,w.touristHand,w.carryScoop);
 w.paddleGroup.add(w.paddleRollGroup,w.conePivot);w.conePivot.add(w.scoopStackGroup,w.outerConeGroup);
 w.lArmRig={handGroup:new THREE.Group()};w.scene.add(w.lArmRig.handGroup);w.heldSocket.position.set(0,1.22,.26);w.touristHand.position.copy(w.heldSocket.position);
 w.paddleStrikeAnchor=new THREE.Object3D();w.paddleStrikeAnchor.position.z=.035;w.paddleGroup.add(w.paddleStrikeAnchor);
 w.giantBlockHeight=.34;w.giantBlockMat={color:{setHex:noop}};w.servingScale=1;
 w.scoopMeshes=Array.from({length:8},(_,i)=>{const m=new THREE.Group();m.position.y=.045+i*.055;return m;});w.scoopStackGroup.add(...w.scoopMeshes);
 w.tubIceGroups=Array.from({length:6},()=>({fill:1}));w.tubPositions=Array.from({length:6},(_,i)=>({worldPos:V(-.5+i*.2,1,-.3)}));
 if(realRig){
  w.scene.clear();w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();
  w.handSpring=new SpringVec3(.22,1.08,.62,135,18);w.leftPropSpring=new SpringVec3(.24,1.22,-.25,88,16);
  w._buildPaddleAndCones();w._buildVendor();w._buildTouristPOVHand();w.setServingScale(count>4?1.18:1);
  w.camera=new THREE.PerspectiveCamera(67.3,390/844,.05,100);w.camera.position.set(0,1.5,1.12);w.camera.lookAt(0,1.28,-.55);w.camera.updateMatrixWorld(true);
  w.canvas={clientWidth:390,clientHeight:844,getBoundingClientRect:()=>({width:390,height:844})};
 }
 w.stretchyStrand={active:false,attach(){this.active=true;},detach(){this.active=false;},update:noop};w.stallEffects=new StallEffects(w);w.coneSpring=new SpringVec3(0,1.24,.22,180,18);
 if(!realRig)w.carryScoop.material={color:{setHex:noop}};
 w.getCounterStrikeTarget=x=>V(x,1.08,.32);if(!realRig)w.orientPaddleAndHands=(roll,left)=>{if(left)w.lArmRig.handGroup.position.copy(left);w.scene.updateMatrixWorld(true);};
 if(!realRig)w.updateIceCreamScoops=n=>{w.visibleCount=n;w.scoopMeshes.forEach((m,i)=>m.visible=i<n);};
 for(const key of ['setVendorMood','triggerScoopJiggle','triggerSpectatorReaction','ringBells','spawnBurst','setVendorCharacter','applySelectedFlavorColors','churnTubIceCream'])w[key]=noop;
 w.projectToScreen=realRig?p=>{const q=p.clone().project(w.camera);return{x:(q.x+1)*195,y:(1-q.y)*422};}:p=>({x:195+p.x*150,y:500-p.y*150});
 const taps=[],d=Object.create(TrickDirector.prototype);w.triggerCounterImpact=(p)=>taps.push({target:p.clone(),tip:w.getPaddleStrikePoint(V()),count:d.scoopCount,carry:w.carryScoop.visible});
 const calls={advance:0,sounds:0};const sound=new Proxy({playCounterRap:()=>calls.sounds++},{get:(target,key)=>target[key]||noop});
 Object.assign(d,{world:w,sound,save:{data:{},lang:'tr',discoverTrick:noop},ui:{},active:true,roundEnded:false,config:{speedMult:1},currentStage:6,levelIndex:1,currentMechanic:id,currentShowId:id,routineIndex:0,routine:[id,'FINAL_PISTACHIO_CATCH'],score:0,scoopCount:count,targetScoopCount:count,hearts:3,penaltiesTaken:0,subStep:0,stageTimer:0,stepCooldown:0,heldItem:null,tugTimer:0,bellBeatsDone:0,rhythmBeatsCompleted:0,rhythmTargetPos:V(0,1.22,.27),coneWorldPos:V(0,1.22,.27),coneTargetPos:V(0,1.22,.27),shaftRoll:0,conePitchX:0,coneFlipZ:0,vendorBubbleTimer:0,vignetteFlash:{alpha:0},floatingPopups:[],midpointHoverTimer:0,idleSeconds:0,passiveLimitSec:22,isAfkShowActive:false,gestureValidation:new GestureValidation(),_getTubWorldPosForScoop:index=>w.tubPositions[index%6].worldPos.clone(),_getFlavorForScoop:index=>({index:index%6,colorHex:0xfff8e7}),_triggerVendorSpeech:noop,_vibrate:noop,_spawnScorePopup:noop,_advanceRoutineStep(){calls.advance++;d.active=false;}});
 w.coneStackWorldPos=V(-.65,1.20,-.60);w.updateIceCreamScoops(count,false);
 enterResearchedService(d);const input={isPointerDown:false,isReaching:false,isMoving:false,pointerEpoch:0,cancelEpoch:0,normX:0,normY:0,vx:0,handWorldPos:V(0,1.22,.26),intentWorldPos:V(0,1.22,.26)};let time=0,lastPhase='';
 return {d,w,calls,taps,input,tick(auto=true){
  if(auto){const cue=researchedServiceCue(d);if(cue.kind!=='reach'){input.isPointerDown=input.isReaching=false;lastPhase='';}
   else {if(lastPhase!==`${d.subStep}:${d.researchedService.feints}`){input.pointerEpoch++;lastPhase=`${d.subStep}:${d.researchedService.feints}`;}input.isPointerDown=input.isReaching=true;input.intentWorldPos.copy(cue.target);input.handWorldPos.copy(cue.target);input.normX=cue.target.x/.54;input.normY=(cue.target.y-1.22)/.36;
    if(realRig&&cue.screen){input.normX=cue.screen.x/390*2-1;input.normY=1-cue.screen.y/844*2;input.intentWorldPos.set(input.normX*.54,1.22+input.normY*.36,.26);input.handWorldPos.copy(input.intentWorldPos);}
    if(!realRig){w.heldSocket.position.copy(cue.target);w.touristHand.position.copy(cue.target);}}}
  if(realRig)w.updateTouristHand(input.handWorldPos,.92,0,1/60,true);
  time+=1/60;d.update(1/60,time,input);w.stallEffects.update(1/60);
 },run(){for(let i=0;i<2000&&d.active;i++)this.tick();assert.equal(calls.advance,1,`${id} stuck at${d.subStep}`);}};
}


test('reactive wrist uses exactly two non-penalizing feints then a stable real handoff',()=>{
 for(const count of [1,2,8]){
  const f=fixture(WRIST_NEAR_MISS,count),cone=f.w.conePivot;let caughtFrames=0;const feintPaths=[];
  for(let i=0;i<1600&&f.d.active;i++){
   f.tick();if(f.d.subStep===2)feintPaths.push(f.d.coneWorldPos.clone());
   if(cone.parent===f.w.heldSocket)caughtFrames++;
   assert.equal(f.w.conePivot,cone);assert.equal(f.d.scoopCount,count);assert.equal(f.d.hearts,3);
  }
  assert.equal(f.calls.advance,1);assert.equal(f.d.researchedService.feints,2);assert.ok(caughtFrames>=20);
  assert.ok(feintPaths.length>=40);assert.equal(f.w.conePivot.parent,f.w.paddleGroup);assert.equal(f.d.score,320);
 }
});

test('quicker preparation preserves the full real-time player response phase',()=>{
 const f=fixture(WRIST_NEAR_MISS);let frames=0;
 while(f.d.subStep===0&&frames<60){f.tick(false);frames++;}
 assert.ok(frames>=25&&frames<=29,'0.55s preparation now takes about0.45s');
 const before=f.d.stageTimer;for(let i=0;i<30;i++)f.tick(false);
 assert.ok(Math.abs(f.d.stageTimer-before-.5)<.001,'interactive phase stays at the original speed');
 assert.equal(f.d.subStep,1);assert.equal(f.calls.advance,0);
});

test('stationary contact and tiny jitter cannot trigger a chain of reactive feints or earn a catch',()=>{
 for(const jitter of [0,.003]){
  const f=fixture(WRIST_NEAR_MISS);
  for(let i=0;i<400;i++){
   const p=V(.025+Math.sin(i)*jitter,1.24,.26);
   Object.assign(f.input,{isPointerDown:true,isReaching:true,pointerEpoch:1,normX:p.x/.54,normY:(p.y-1.22)/.36});f.input.intentWorldPos.copy(p);f.input.handWorldPos.copy(p);
   f.tick(false);
  }
  assert.ok(f.d.researchedService.feints<=1);assert.equal(f.calls.advance,0);assert.equal(f.d.score,0);assert.equal(f.d.hearts,3);
 }
});

test('relay transfers the same scoop stack onto the real outer wafer and back before the real handoff',()=>{
 for(const count of [1,2,8]){
  const f=fixture(SCOOP_CONE_RELAY,count),stack=f.w.scoopStackGroup,cone=f.w.conePivot,outer=f.w.outerConeGroup;
  const seen={outer:0,main:0,customer:0};
  for(let i=0;i<1800&&f.d.active;i++){
   f.tick();if(stack.parent===outer)seen.outer++;if(stack.parent===cone)seen.main++;if(cone.parent===f.w.heldSocket)seen.customer++;
   assert.equal(stack,f.w.scoopStackGroup);assert.equal(cone,f.w.conePivot);assert.equal(outer,f.w.outerConeGroup);
   assert.equal(f.w.scoopMeshes.filter(m=>m.visible).length,count);assert.equal(f.d.hearts,3);
  }
  assert.equal(f.calls.advance,1);assert.ok(seen.outer>=60);assert.ok(seen.main>=80);assert.ok(seen.customer>=25);
  assert.equal(stack.parent,cone);assert.equal(cone.parent,f.w.paddleGroup);assert.equal(outer.visible,false);assert.equal(f.d.score,420);
 }
});

test('reset at every meaningful relay ownership and wrist phase leaves no duplicate or orphaned props',()=>{
 for(const id of [WRIST_NEAR_MISS,SCOOP_CONE_RELAY])for(const phase of [1,2,3,5,6]){
  const f=fixture(id);let found=false;for(let i=0;i<1000&&f.d.active;i++){f.tick();if(f.d.subStep===phase){found=true;break;}}
  assert.ok(found,`${id}/${phase}`);const cone=f.w.conePivot,stack=f.w.scoopStackGroup;
  f.d.selectedFlavors=[0,1];f.d.resetRound(8,false);
  assert.equal(f.d.researchedService,null);assert.equal(cone.parent,f.w.paddleGroup);assert.equal(stack.parent,cone);assert.equal(f.w.outerConeGroup.parent,cone);assert.equal(f.w.outerConeGroup.visible,false);
 }
});

test('referenced movement provenance is explicit and at most one researched service is selected per round',()=>{
 assert.equal(RESEARCHED_SERVICE_CATALOG.length,4);assert.deepEqual(researchedIdsForStage(3),[]);assert.deepEqual(researchedIdsForStage(4),[WRIST_NEAR_MISS]);assert.equal(researchedIdsForStage(8).length,3);
 for(const entry of RESEARCHED_SERVICE_CATALOG){assert.ok(entry.sourceRefs.every(url=>url.startsWith('https://')));assert.match(entry.adaptation,/authored/);}
 for(const level of CAMPAIGN_LEVELS)for(let i=0;i<40;i++){
  const routine=TrickDirector.prototype._buildDynamicRoutineForStage.call({targetScoopCount:2,currentStage:level.stage},level);
  assert.ok(routine.filter(isResearchedService).length<=1);assert.ok(routine.includes('EYE_LOCK_RHYTHM_CHASE'));
 }
});


test('relay entry waits for actual vendor grip contact before separating the same nested pair',()=>{
 for(const count of [1,8]){
  const f=fixture(SCOOP_CONE_RELAY,count,true);
  assert.equal(f.w.conePivot.parent,f.w.paddleGroup);assert.equal(f.w.outerConeGroup.parent,f.w.conePivot);
  f.tick();assert.equal(f.w.conePivot.parent,f.w.paddleGroup);
  let frame=1;for(;frame<180&&f.d.subStep===0;frame++)f.tick();
  assert.equal(f.d.subStep,1,`entry must finish, not wait indefinitely (${count} tops): ${JSON.stringify({cone:f.w.conePivot.getWorldPosition(V()).toArray(),grip:f.w.lArmRig.handGroup.localToWorld(V(0,.11,.035)).toArray(),target:f.d.leftHandCustomTarget?.toArray()})}`);
  assert.ok(frame>=55,'nest separation and outward motion remain visible at the quicker preparation tempo');
  assert.ok(f.d.researchedService.entryContactDistance<.04);
  assert.equal(f.w.conePivot.parent,f.w.lArmRig.handGroup);assert.equal(f.w.outerConeGroup.parent,f.w.paddleGroup);
  for(let i=0;i<1200&&f.d.active;i++)f.tick();assert.equal(f.calls.advance,1);assert.equal(f.w.scoopStackGroup.parent,f.w.conePivot);
 }
});

test('airborne wafer and scoop catches preserve the same objects and exact selected quantity',()=>{
 for(const id of[EMPTY_WAFER_TOSS,SCOOP_AIR_CATCH])for(const count of[1,2,8]){
  const f=fixture(id,count),cone=f.w.conePivot,stack=f.w.scoopStackGroup,outer=f.w.outerConeGroup;
  const seen={flight:0,hand:0};
  for(let i=0;i<2000&&f.d.active;i++){
   f.tick();if(id===EMPTY_WAFER_TOSS?outer.parent===f.w.scene:stack.parent===f.w.scene&&f.w.scoopInFlight)seen.flight++;
   if(id===EMPTY_WAFER_TOSS?outer.parent===f.w.heldSocket:cone.parent===f.w.heldSocket)seen.hand++;
   assert.equal(f.w.conePivot,cone);assert.equal(f.w.scoopStackGroup,stack);assert.equal(f.w.outerConeGroup,outer);
   assert.equal(f.w.scoopMeshes.filter(m=>m.visible).length,count);
  }
  assert.equal(f.calls.advance,1,`${id}/${count} at${f.d.subStep}`);assert.ok(seen.flight>15);assert.ok(seen.hand>10);
  assert.equal(stack.parent,cone);assert.equal(f.d.hearts,3);assert.equal(Boolean(f.w.scoopInFlight),false);
 }
});
test('airborne shows reject stationary/jitter input and reset their loose props',()=>{
 for(const id of[EMPTY_WAFER_TOSS,SCOOP_AIR_CATCH])for(const jitter of[0,.003]){
  const f=fixture(id);
  for(let i=0;i<600;i++){
   Object.assign(f.input,{isPointerDown:true,isReaching:true,pointerEpoch:1,normX:Math.sin(i)*jitter,normY:0});f.input.intentWorldPos.set(f.input.normX*.54,1.22,.26);f.tick(false);
  }
  assert.equal(f.calls.advance,0);assert.equal(f.d.score,0);
  f.d.selectedFlavors=[0,1];f.d.resetRound(9,false);
  assert.equal(f.w.scoopStackGroup.parent,f.w.conePivot);assert.equal(f.w.outerConeGroup.parent,f.w.conePivot);assert.equal(f.w.outerConeGroup.visible,false);
 }
});
