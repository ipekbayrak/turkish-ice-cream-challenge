import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3}from'three';
import{makeVendorFlourishFixture}from'./vendor-flourish-fixture.js';
import{inspectVendorHandSurfaces,inspectVendorArmSurfaces}from'./vendor-arm-geometry.js';

test('an extended offer keeps the optional support safely released when it cannot reach',()=>{
 for(let vendor=0;vendor<4;vendor++)for(const count of[1,8]){
  const f=makeVendorFlourishFixture(vendor,count),w=f.w;w.handoffCone('vendor');w.stallEffects.update(1);
  for(let i=0;i<60;i++)w.orientPaddleAndHands(0,new Vector3(.25,1.2,-.23),1/60,0,0);
  const cone=w.conePivot;let previous=w.lArmRig.handRig.wristAnchor.getWorldPosition(new Vector3()),maxStep=0,recovering=0,locked=0;
  w.handoffCone('paddle');
  for(let i=0;i<180;i++){
   w.stallEffects.update(1/60);w.paddleGroup.position.set(.22,1.30,.22);w.orientPaddleAndHands(0,null,1/60,0,0);
   const wrist=w.lArmRig.handRig.wristAnchor.getWorldPosition(new Vector3());maxStep=Math.max(maxStep,wrist.distanceTo(previous));previous.copy(wrist);
   if(w._leftHandOnShaft){locked++;assert.equal(w._leftSupportRecovery,null);}
   if(w._leftSupportRecovery){recovering++;assert.equal(w.lArmRig.handRig.pose,'support-reach');}
   assert.equal(w.conePivot,cone);assert.equal(cone.parent,w.paddleGroup,'support recovery never steals the food');
   if(i%10===0){
    assert.equal(inspectVendorHandSurfaces(w,w.lArmRig).hits,0,'hand skin enters torso while approaching');
    assert.equal(inspectVendorArmSurfaces(w,w.lArmRig).hits,0,'forearm enters torso while approaching');
   }
  }
  if(!locked)assert.equal(w.lArmRig.handRig.pose,'open','an unreachable support stays visibly released');
  assert.ok(maxStep<.055,`vendor${vendor}/${count}: ${maxStep*1000}mm wrist jump`);

 }
});


test('a reachable steady shaft is approached continuously before support contact locks',()=>{
 for(let vendor=0;vendor<4;vendor++){
  const {w}=makeVendorFlourishFixture(vendor,1);w.handoffCone('vendor');w.stallEffects.update(1);
  for(let i=0;i<60;i++)w.orientPaddleAndHands(0,new Vector3(.25,1.2,-.23),1/60,0,0);
  let previous=w.lArmRig.handRig.wristAnchor.getWorldPosition(new Vector3()),maxStep=0,recovering=0,locked=0;
  w.handoffCone('paddle');
  for(let i=0;i<180;i++){
   w.stallEffects.update(1/60);w.paddleGroup.position.set(0,1.5,-.05);w.orientPaddleAndHands(0,null,1/60,0,0);
   const wrist=w.lArmRig.handRig.wristAnchor.getWorldPosition(new Vector3());maxStep=Math.max(maxStep,wrist.distanceTo(previous));previous.copy(wrist);
   recovering+=Number(Boolean(w._leftSupportRecovery));
   if(w._leftHandOnShaft){
    locked++;assert.ok(w.lArmRig.gripAnchor.getWorldPosition(new Vector3()).distanceTo(w.paddleFrontGripAnchor.getWorldPosition(new Vector3()))<1e-7);
   }
   if(i%10===0){assert.equal(inspectVendorHandSurfaces(w,w.lArmRig).hits,0);assert.equal(inspectVendorArmSurfaces(w,w.lArmRig).hits,0);}
  }
  assert.ok(recovering>10,`vendor${vendor}: visible approach precedes contact`);
  assert.ok(locked>30,`vendor${vendor}: safe reachable support is actually grasped`);
  assert.ok(maxStep<.055,`vendor${vendor}: ${maxStep*1000}mm wrist jump`);
 }
});
