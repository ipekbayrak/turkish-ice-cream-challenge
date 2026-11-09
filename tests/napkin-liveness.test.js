import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {makeVendorFlourishFixture} from './vendor-flourish-fixture.js';
import {NapkinReturn,paperReturnHandTarget} from '../src/napkin-return.js';
import {clearTrickTransition} from '../src/trick-transition.js';
import {customerServiceCue} from '../src/customer-service.js';
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);

function setup(vendor,count,{scale=1,x=-.25,owner='paddle'}={}){
 const {w,d,input}=makeVendorFlourishFixture(vendor,count);
 d.isAfkShowActive=false;d.idleSeconds=0;d.routine=['HAND_NAPKIN_OFFER','FINAL_PISTACHIO_CATCH'];
 d._enterRoutineStep(0);clearTrickTransition(d);d.subStep=3;d.stageTimer=.3;
 w.setServingScale(scale);w.handoffCone(owner);w.stallEffects.update(1);
 d.coneWorldPos.set(x,1.28,-.12);d.coneTargetPos.copy(d.coneWorldPos);w.paddleGroup.position.copy(d.coneWorldPos);
 w.coneSpring.pos.copy(d.coneWorldPos);w.coneSpring.target.copy(d.coneWorldPos);w.coneSpring.vel.set(0,0,0);
 w.setServingNapkin({owner:'vendor-hand',peel:1});w.stallEffects.update(1);
 const returning=d.customerService.paperReturn=new NapkinReturn(d,{fromVendor:true,retreat:false});
 return{w,d,input,returning};
}

test('paper carry on every master and 1–8 scoop orders reaches real contact and advances, including the left-side Haydar stall',()=>{
 for(let vendor=0;vendor<4;vendor++)for(let count=1;count<=8;count++){
  const {w,d,input,returning}=setup(vendor,count,{scale:count>4?1.18:1});
  const paper=w.servingNapkin,cone=w.conePivot,raw=input.intentWorldPos.clone();let gap=null,jump=null,frame=0;
  const set=w.setServingNapkin.bind(w);
  w.setServingNapkin=options=>{
   const from=paper.getWorldPosition(V());
   if(options.owner==='vendor'&&paper.parent===w.lArmRig.handGroup){
    gap=from.distanceTo(cone.localToWorld(V(0,-.065,0)));set(options);jump=from.distanceTo(paper.getWorldPosition(V()));
   }else set(options);
  };
  for(;frame<180;frame++){
   w.updateTouristHand(paperReturnHandTarget(d,V(.26,1.0,.42)),.15,0,1/60,false,frame/60);
   d.update(1/60,frame/60,input);w.updateEnvironmentAnimations(frame/60,1/60);
   assert.equal(w.servingNapkin,paper);assert.equal(w.conePivot,cone);assert.ok(paper.visible);assert.equal(w.stallEffects.napkinFlight,false);
   assert.ok(input.intentWorldPos.equals(raw));
   if(returning.done&&d.subStep===4&&!d.servingHandoff&&!d.trickTransition)break;
  }
  assert.ok(frame<180,`vendor${vendor}/scoops${count} stuck at ${returning.phase}, substep ${d.subStep}`);
  assert.ok(gap!==null&&gap<.035,`real wrap gap ${gap}`);assert.ok(jump<1e-8,'parent change preserves the same sheet position');
  assert.equal(paper.parent,cone);assert.ok(w.stallEffects.napkinPeel<.04);assert.equal(customerServiceCue(d).kind,'reach');
  assert.equal(d.score,0,'automatic repair does not award or bypass a player catch');
 }
});

test('wrapping moves a pole-owned serving continuously, while a cone held in the same hand is not moved by the pole correction',()=>{
 const f=setup(3,2);let last=f.d.coneWorldPos.clone(),maxStep=0;
 for(let i=0;i<90&&!f.returning.done;i++){
  f.d.update(1/60,i/60,f.input);f.w.updateEnvironmentAnimations(i/60,1/60);
  maxStep=Math.max(maxStep,last.distanceTo(f.d.coneWorldPos));last.copy(f.d.coneWorldPos);
 }
 assert.ok(f.returning.done);assert.ok(maxStep<.06,`pole jumped ${maxStep}m`);
 const one=setup(3,2,{owner:'vendor'}),goal=one.d.coneTargetPos.clone();
 one.returning.update(one.d,1/60);assert.equal(one.returning.workPose,null);assert.ok(one.d.coneTargetPos.equals(goal));
});

test('same-hand paper folds finish for all masters at small and large serving scales',()=>{
 for(let vendor=0;vendor<4;vendor++)for(const count of [2,8]){
  const {w,d,input,returning}=setup(vendor,count,{owner:'vendor',scale:count>4?1.18:1});
  for(let frame=0;frame<120&&!returning.done;frame++){
   returning.update(d,1/60);d._applyKinematics(1/60,frame/60,input);w.updateEnvironmentAnimations(frame/60,1/60);
  }
  assert.ok(returning.done,`same hand vendor${vendor}/count${count} stuck ${returning.phase}`);
  assert.equal(returning.workPose,null);assert.equal(w.servingNapkin.parent,w.conePivot);
 }
});

test('retrieving only the paper does not move an unrelated pole-owned cone to a wrapping pose',()=>{
 const {d,returning}=setup(3,2);returning.retrieveOnly=true;const goal=d.coneTargetPos.clone();
 returning.prepareWorkPose(d,.05);assert.equal(returning.workPose,null);assert.ok(d.coneTargetPos.equals(goal));
});
