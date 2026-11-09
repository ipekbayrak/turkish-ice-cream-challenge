import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Quaternion,Vector3,Euler} from 'three';
import {ServingOrientation} from '../src/serving-orientation.js';
import {makeEncounterFixture} from './encounter-fixture.js';
import {EncounterDriver} from './encounter-driver.js';

test('changing axial-spin convention preserves orientation and settles without removing authored turns',()=>{
 const cone=new Group(),view=new ServingOrientation();
 cone.rotation.set(.1,2.4,.08);view.apply(cone,true,1/60);const before=cone.quaternion.clone();
 const goal=new Quaternion().setFromEuler(new Euler(.1,.08,2.4));
 cone.quaternion.copy(goal);view.apply(cone,false,0);assert.ok(cone.quaternion.angleTo(before)<1e-7);
 for(let i=0;i<25;i++){cone.quaternion.copy(goal);view.apply(cone,false,1/60);}
 assert.ok(cone.quaternion.angleTo(goal)<1e-7);
 view.reset();for(let i=0;i<100;i++){
  cone.rotation.set(.2,i*.2,.1);const authored=cone.quaternion.clone();view.apply(cone,false,1/60);
  assert.ok(cone.quaternion.angleTo(authored)<1e-7,'ordinary full turns are not smoothed away');
 }
});

test('a held serving does not attach/detach repeatedly on the same contact boundary',()=>{
 const {w}=makeEncounterFixture();w.updateIceCreamScoops(2);w.updateServingLayout(2);w.handoffCone('vendor');w.stallEffects.update(1);
 const crown=w.scoop2.localToWorld(new Vector3(0,w.scoop2.geometry.parameters.radius,0));
 const move=distance=>{w.paddleGroup.position.copy(crown).add(new Vector3(distance,0,0));w.paddleContact.beginPoseFrame(w,1/60);w.paddleContact.update(w);};
 move(.13);assert.ok(w.paddleContact.active);
 for(const distance of[.145,.137,.16,.14,.18]){move(distance);assert.ok(w.paddleContact.active);}
 move(.24);assert.equal(w.paddleContact.active,false,'deliberate withdrawal still releases');
 move(.16);assert.equal(w.paddleContact.active,false,'release does not immediately reattach in the dead band');
 move(.13);assert.ok(w.paddleContact.active);
});

test('real giant/cut/spin sequence keeps elbows stable and joins the next show without flipping the serving',()=>{
 const f=makeEncounterFixture({Driver:EncounterDriver}),V=()=>new Vector3();
 for(const id of['GIANT_BLOCK_TEASE','MEGA_TAFFY_SLICE','SHAFT_SPIN_360']){
  f.reset({id,vendor:3,count:12,pace:46});let previous=null,velocities={},worstElbowReverse=0,exitJump=0;
  for(let frame=0;frame<1500&&f.d.routineIndex===0;frame++){
   f.tick(1/60);const w=f.w,key=`${f.d.currentMechanic}:${f.d.subStep}:${f.state().transition}`;
   const points={R:w.rArmRig.handRig.wristAnchor.getWorldPosition(V()),RE:w.rArmRig.armPose.elbow.clone(),LE:w.lArmRig.armPose.elbow.clone()};
   if(previous&&frame>20){
    if(id==='SHAFT_SPIN_360'&&f.d.routineIndex>0)exitJump=points.R.distanceTo(previous.points.R);
    for(const part of['RE','LE']){
     const velocity=points[part].clone().sub(previous.points[part]),old=velocities[part];
     if(previous.key===key&&old?.length()>.008&&velocity.length()>.008&&velocity.dot(old)/(velocity.length()*old.length())<-.65)worstElbowReverse=Math.max(worstElbowReverse,velocity.length());
     velocities[part]=velocity;
    }
   }
   previous={points,key};
  }
  assert.ok(f.d.routineIndex>0,`${id} completes through actual gestures`);
  assert.ok(worstElbowReverse<.04,`${id}: ${worstElbowReverse}m reversing elbow step`);
  if(id==='SHAFT_SPIN_360')assert.ok(exitJump<.06,`spin exit moved the hand ${exitJump}m in one frame`);
 }
});
