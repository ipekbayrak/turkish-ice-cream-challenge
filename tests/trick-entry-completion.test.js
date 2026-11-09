import {paperReturnHandTarget} from '../src/napkin-return.js';
import {Vector3,Quaternion} from 'three';
import test from 'node:test';import assert from 'node:assert/strict';
import {makeVendorFlourishFixture} from './vendor-flourish-fixture.js';

test('fresh serving ownership and paper preparation finish naturally before the action window, at two and eight scoops',()=>{
 for(const count of[2,8])for(const id of['GIANT_BLOCK_TEASE','MIDAIR_BLOCK_SOMERSAULT','HAND_NAPKIN_OFFER','NAPKIN_CONE_FAKEOUT','LAYERED_SERVICE_TEASE','FINAL_PISTACHIO_CATCH']){
  const{w,d,input}=makeVendorFlourishFixture(1,count);w._buildIceCreamCart();d._spawnScorePopup=()=>{};d.isAfkShowActive=false;d.idleSeconds=0;d.flourishPreparation=null;
  d.routine=[id,'FINAL_PISTACHIO_CATCH'];d._enterRoutineStep(0);let entered=false,frames=0,paperCarried=false;
  for(;frames<420;frames++){
   const presenting=d.trickTransition||d.pendingTrickEntry||d.servingHandoff||d.entryPaperPreparation||d.pendingEntryPaper;
   const score=d.score,hearts=d.hearts,timer=d.stageTimer;
   w.scene.updateMatrixWorld(true);const before=w.conePivot.getWorldPosition(new Vector3()),rotation=w.conePivot.getWorldQuaternion(new Quaternion());
   d.update(1/60,frames/60,input);w.updateEnvironmentAnimations(frames/60,1/60);w.scene.updateMatrixWorld(true);
   assert.ok(w.conePivot.getWorldPosition(new Vector3()).distanceTo(before)<.16,`${id}/${count}: visible serving position jumped`);
   assert.ok(w.conePivot.getWorldQuaternion(new Quaternion()).angleTo(rotation)<.6,`${id}/${count}: visible serving orientation jumped`);
   if(w.servingNapkin.visible&&w.servingNapkin.parent===w.lArmRig.handGroup)paperCarried=true;
   if(presenting&&frames>0){assert.equal(d.score,score);assert.equal(d.hearts,hearts);assert.ok(d.stageTimer<=timer+.08,'the pose does not spend the action window');}
   if(!d.trickTransition&&!d.pendingTrickEntry&&!d.servingHandoff&&!d.entryPaperPreparation&&!d.pendingEntryPaper&&d.stageTimer>.1){entered=true;break;}
  }
  assert.ok(entered,`${id}/${count}: stuck ${d.servingHandoff?.owner||d.entryPaperPreparation?.phase||'pose'} at ${d.stageTimer}`);
  if(id.includes('NAPKIN')||id==='LAYERED_SERVICE_TEASE'||id==='FINAL_PISTACHIO_CATCH'){
   assert.ok(paperCarried,`${id}: the vendor must physically bring the sheet`);
   assert.equal(w.servingNapkin.visible,true);assert.equal(w.servingNapkin.parent,id==='LAYERED_SERVICE_TEASE'?w.outerConeGroup:w.conePivot);assert.ok(w.stallEffects.napkinPeel<.05);assert.ok(Math.abs(w.servingNapkin.scale.x-1)<1e-8,'fast folding restores full paper size');
  }
 }
});


test('automatic take-back and delivery extend a low customer hand naturally, preserve raw intent, and return control',()=>{
 for(const id of ['GIANT_BLOCK_TEASE','CUSTOMER_MOLD_MOUNT']){
  const{w,d,input}=makeVendorFlourishFixture(1,2);w._buildIceCreamCart();d._spawnScorePopup=()=>{};d.isAfkShowActive=false;d.idleSeconds=0;d.flourishPreparation=null;
  const base=new Vector3(.30,.80,.26);w.updateTouristHand(base,.98,0,.5,true);
  if(id==='GIANT_BLOCK_TEASE'){w.handoffCone('player');w.stallEffects.update(1);}
  input.handWorldPos.copy(base);input.intentWorldPos.copy(base);const raw=input.intentWorldPos.clone();
  d.routine=[id,'FINAL_PISTACHIO_CATCH'];d._enterRoutineStep(0);let entered=false,offered=0;
  for(let i=0;i<600;i++){
   const target=paperReturnHandTarget(d,base);w.updateTouristHand(target,.98,0,1/60,true);
   d.update(1/60,i/60,input);w.updateEnvironmentAnimations(i/60,1/60);offered=Math.max(offered,d.paperReturnPose?.offerWeight||0);
   assert.ok(input.intentWorldPos.equals(raw),'scripted presentation never fabricates gesture intent');
   if(!d.servingHandoff&&!d.trickTransition&&!d.pendingTrickEntry&&d.stageTimer>.15){entered=true;break;}
  }
  assert.ok(entered,`${id}: low hand must not deadlock the show`);assert.ok(offered>.7);assert.equal(d.hearts,3);assert.equal(d.score,0);
 }
});
