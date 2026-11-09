import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GameWorld } from '../src/world.js';
import { TrickDirector } from '../src/tricks.js';
import { StallEffects } from '../src/stall-effects.js';
import { GestureValidation } from '../src/gesture-validation.js';
import { SpringVec3 } from '../src/physics.js';
import { enterCustomerService, customerServiceCue, customerOpeningRoutine, CUSTOMER_MOLD, CUSTOMER_SCOOP, HAND_INVERT, HAND_PAPER } from '../src/customer-service.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),noop=()=>{};
function fixture(id,count=2){
 const w=Object.create(GameWorld.prototype);w.scene=new THREE.Scene();
 for(const key of ['paddleGroup','paddleRollGroup','conePivot','scoopStackGroup','heldSocket','giantBlockGroup','vendorGroup','touristHand','mainConeMesh','sliceCueGroup','outerConeGroup','napkinProp','napkinConeProp','leftHandConeProp','heldEmptyCone','heldNapkin','heldNapkinCone','carryScoop','vendorHead','fezTassel'])w[key]=new THREE.Group();
 w.scene.add(w.paddleGroup,w.heldSocket,w.giantBlockGroup,w.vendorGroup,w.touristHand,w.carryScoop);
 w.paddleGroup.add(w.paddleRollGroup,w.conePivot);w.conePivot.add(w.scoopStackGroup,w.outerConeGroup);
 w.lArmRig={handGroup:new THREE.Group()};w.scene.add(w.lArmRig.handGroup);w.heldSocket.position.set(0,1.22,.26);w.touristHand.position.copy(w.heldSocket.position);
 w.paddleStrikeAnchor=new THREE.Object3D();w.paddleStrikeAnchor.position.z=.035;w.paddleGroup.add(w.paddleStrikeAnchor);
 w.giantBlockGroup.visible=false;w.carryScoop.visible=false;w.giantBlockHeight=.34;w.giantBlockMat={color:{setHex:noop}};w.servingScale=1;
 w.scoopMeshes=Array.from({length:8},(_,i)=>{const m=new THREE.Group();m.position.y=.045+i*.055;return m;});w.scoopStackGroup.add(...w.scoopMeshes);
 w.tubIceGroups=Array.from({length:6},()=>({fill:1}));w.tubPositions=Array.from({length:6},(_,i)=>({worldPos:V(-.5+i*.2,1,-.3)}));
 w.stretchyStrand={active:false,attach(){this.active=true;},detach(){this.active=false;},update:noop};w.stallEffects=new StallEffects(w);w.coneSpring=new SpringVec3(0,1.24,.22,180,18);
 w.carryScoop.material={color:{setHex:noop}};
 w.getCounterStrikeTarget=x=>V(x,1.08,.32);w.orientPaddleAndHands=(roll,left)=>{if(left)w.lArmRig.handGroup.position.copy(left);w.scene.updateMatrixWorld(true);};
 w.updateIceCreamScoops=n=>{w.visibleCount=n;w.scoopMeshes.forEach((m,i)=>m.visible=i<n);};
 for(const key of ['setVendorMood','triggerScoopJiggle','triggerSpectatorReaction','ringBells','spawnBurst','setVendorCharacter','applySelectedFlavorColors','churnTubIceCream'])w[key]=noop;
 w.projectToScreen=p=>({x:195+p.x*150,y:500-p.y*150});
 const taps=[],d=Object.create(TrickDirector.prototype);w.triggerCounterImpact=(p)=>taps.push({target:p.clone(),tip:w.getPaddleStrikePoint(V()),count:d.scoopCount,carry:w.carryScoop.visible});
 const calls={advance:0,sounds:0};const sound=new Proxy({playCounterRap:()=>calls.sounds++},{get:(target,key)=>target[key]||noop});
 Object.assign(d,{world:w,sound,save:{data:{},lang:'tr',discoverTrick:noop},ui:{},active:true,roundEnded:false,config:{speedMult:1},currentStage:6,levelIndex:1,currentMechanic:id,currentShowId:id,routineIndex:0,routine:[id,'FINAL_PISTACHIO_CATCH'],score:0,scoopCount:[CUSTOMER_MOLD,CUSTOMER_SCOOP].includes(id)?0:count,targetScoopCount:count,hearts:3,penaltiesTaken:0,subStep:0,stageTimer:0,stepCooldown:0,heldItem:null,tugTimer:0,bellBeatsDone:0,rhythmBeatsCompleted:0,rhythmTargetPos:V(0,1.22,.27),coneWorldPos:V(0,1.22,.27),coneTargetPos:V(0,1.22,.27),shaftRoll:0,conePitchX:0,coneFlipZ:0,vendorBubbleTimer:0,vignetteFlash:{alpha:0},floatingPopups:[],midpointHoverTimer:0,idleSeconds:0,passiveLimitSec:22,isAfkShowActive:false,gestureValidation:new GestureValidation(),_getTubWorldPosForScoop:index=>w.tubPositions[index%6].worldPos.clone(),_getFlavorForScoop:index=>({index:index%6,colorHex:0xfff8e7}),_triggerVendorSpeech:noop,_vibrate:noop,_spawnScorePopup:noop,_advanceRoutineStep(){calls.advance++;d.active=false;}});
 if([CUSTOMER_MOLD,CUSTOMER_SCOOP].includes(id)){w.handoffCone('player');w.stallEffects.update(1);}
 enterCustomerService(d);const input={isPointerDown:false,isReaching:false,isMoving:false,pointerEpoch:0,cancelEpoch:0,normX:0,normY:0,vx:0,handWorldPos:V(0,1.22,.26),intentWorldPos:V(0,1.22,.26)};let time=0,lastPhase='',phaseStart=0;
 return {d,w,calls,taps,input,tick(auto=true){
  if(auto){const cue=customerServiceCue(d),key=`${d.subStep}:${cue.kind}`;if(cue.kind==='wait'){input.isPointerDown=input.isReaching=false;lastPhase='';}
   else {if(lastPhase!==key){input.pointerEpoch++;lastPhase=key;phaseStart=time;}input.isPointerDown=input.isReaching=true;const target=cue.kind==='pull'?V(cue.target.x,time-phaseStart>.05?1.18:1.35,.26):cue.target;input.intentWorldPos.copy(target);input.handWorldPos.copy(target);input.normX=target.x/.54;input.normY=(target.y-1.22)/.36;w.heldSocket.position.copy(target);w.touristHand.position.copy(target);}}
  time+=1/60;d.update(1/60,time,input);w.stallEffects.update(1/60);
 },run(){for(let i=0;i<2000&&d.active;i++)this.tick();assert.equal(calls.advance,1,`${id} stuck at${d.subStep}`);}};
}

test('opening replaces only ordered prep scoops and preserves the customer-owned serving contract',()=>{
 for(const count of [1,2,8]){
  const old=Array.from({length:count},()=> 'SCRAPE_FLAVOR_SCOOP').concat(['SHAFT_SPIN_360','FINAL_PISTACHIO_CATCH']);
  const next=customerOpeningRoutine(old,count);assert.deepEqual(next.slice(0,2),[CUSTOMER_MOLD,CUSTOMER_SCOOP]);
  assert.equal(next.filter(id=>id==='SCRAPE_FLAVOR_SCOOP').length,Math.max(0,count-2));assert.equal(next.at(-1),'FINAL_PISTACHIO_CATCH');
 }
});
test('the whole mold mounts the same customer cone then returns to the same tub without taking their cone',()=>{
 const f=fixture(CUSTOMER_MOLD),cone=f.w.conePivot;let mounted=0,empty=0;
 for(let i=0;i<600&&f.d.active;i++){f.tick();assert.equal(cone.parent,f.w.heldSocket);if(f.w.giantBlockGroup.parent===cone)mounted++;if(f.w.tubIceGroups[0].fill<.3)empty++;}
 assert.ok(mounted>=30);assert.ok(empty>=30);assert.equal(f.calls.advance,1);assert.equal(f.w.tubIceGroups[0].fill,1);assert.equal(f.w.giantBlockGroup.visible,false);assert.equal(f.d.scoopCount,0);
});
test('scoop show performs four real contacts and all same-cone handoffs without inventing a second ordered scoop',()=>{
 for(const count of [1,2,8]){
  const f=fixture(CUSTOMER_SCOOP,count),cone=f.w.conePivot,owners=new Map();
  for(let i=0;i<1500&&f.d.active;i++){f.tick();const tag=cone.parent===f.w.heldSocket?'player':cone.parent===f.w.lArmRig.handGroup?'vendor':'pole';const set=owners.get(f.d.subStep)||new Set();set.add(tag);owners.set(f.d.subStep,set);assert.equal(f.w.conePivot,cone);assert.ok(f.d.scoopCount<=count);}
  assert.equal(f.calls.advance,1,`count${count} phase${f.d.subStep}`);assert.equal(f.d.scoopCount,Math.min(2,count));
  assert.equal(f.taps.length,4);assert.equal(f.calls.sounds,4);assert.equal(f.taps.filter(t=>t.carry).length,0);assert.equal(f.taps.filter(t=>!t.carry).length,4);
  for(const hit of f.taps)assert.ok(hit.tip.distanceTo(hit.target)<=.02);
  assert.ok(owners.get(3).has('player'));assert.ok(owners.get(4).has('pole'));assert.ok(owners.get(8).has('player'));assert.ok(owners.get(11).has('vendor'));assert.ok(owners.get(13).has('player'));
 }
});
test('vendor hand inverts through visible angles before accepting the real catch',()=>{
 const f=fixture(HAND_INVERT);let maxTilt=0,unoffered=true;
 for(let i=0;i<1000&&f.d.active;i++){f.tick();maxTilt=Math.max(maxTilt,Math.abs(f.w.coneHandTiltZ));if(f.d.subStep<2&&f.w.conePivot.parent===f.w.heldSocket)unoffered=false;}
 assert.ok(maxTilt>2.7);assert.ok(unoffered);assert.equal(f.calls.advance,1);assert.equal(f.w.coneHandTiltZ,0);
});
test('hand-wrapped cone pulls away leaving the same paper in the player hand',()=>{
 const f=fixture(HAND_PAPER),paper=f.w.servingNapkin,cone=f.w.conePivot;let separation=0,sawPullCue=false;
 for(let i=0;i<1200&&f.d.active;i++){if(f.d.subStep===2&&!f.d.customerService.paperPulled&&customerServiceCue(f.d)?.kind==='pull')sawPullCue=true;f.tick();if(f.d.subStep===2){separation++;assert.equal(paper.parent,f.w.heldSocket);assert.equal(cone.parent,f.w.lArmRig.handGroup);}assert.equal(paper,f.w.servingNapkin);}
 assert.equal(sawPullCue,true);assert.ok(separation>=30);assert.equal(f.calls.advance,1);assert.equal(f.w.conePivot,cone);
});

test('real reset/start API keeps the intro cone in player ownership and enables the opening only when requested',()=>{
 const f=fixture(CUSTOMER_MOLD,2),d=f.d,w=f.w,cone=w.conePivot;
 d.selectedFlavors=[0,2];d.protocol={emitCommand:noop};
 w.paddleGroup.position.set(.32,1.12,-.2);const previousPole=w.paddleGroup.position.clone();
 d.resetRound(6,false,{preserveCustomerCone:true});
 assert.ok(cone.parent===w.heldSocket);assert.equal(d.active,false);assert.equal(d.scoopCount,0);assert.ok(d.coneWorldPos.equals(previousPole));
 d.startRound({customerCone:true});
 assert.equal(d.currentMechanic,CUSTOMER_MOLD);assert.ok(cone.parent===w.heldSocket);assert.equal(d.heldItem,'CUSTOMER_CONE');
 assert.deepEqual(d.routine.slice(0,2),[CUSTOMER_MOLD,CUSTOMER_SCOOP]);
 d.resetRound(6,false);assert.ok(cone.parent===w.paddleGroup);assert.equal(d.customerConeStart,false);
 d.startRound();assert.equal(d.currentMechanic,'SCRAPE_FLAVOR_SCOOP');
});

test('reset during each new service clears mold, carried scoop and tilt without losing the original cone',()=>{
 for(const id of [CUSTOMER_MOLD,CUSTOMER_SCOOP,HAND_INVERT,HAND_PAPER]){
  const f=fixture(id,2),cone=f.w.conePivot;f.d.selectedFlavors=[0,2];
  for(let i=0;i<110&&f.d.active;i++)f.tick();
  f.d.resetRound(6,false);
  assert.ok(f.w.conePivot===cone);assert.ok(cone.parent===f.w.paddleGroup);
  assert.equal(f.w.giantBlockGroup.visible,false);assert.equal(f.w.carryScoop.visible,false);
  assert.equal(f.w.servingNapkin.visible,false);assert.equal(f.w.coneHandTiltZ,0);
  assert.equal(f.d.customerService,null);assert.equal(f.d.carryScoopOffsetY,null);
 }
});
