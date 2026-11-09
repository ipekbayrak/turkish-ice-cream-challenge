import {clearTrickTransition} from '../src/trick-transition.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {makeVendorFlourishFixture} from './vendor-flourish-fixture.js';
import {NapkinReturn,paperReturnHandTarget} from '../src/napkin-return.js';
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);

function setup(vendor=1,count=2){
 const f=makeVendorFlourishFixture(vendor,count),{w,d,input}=f;
 d._spawnScorePopup=()=>{};
 d.isAfkShowActive=false;d.flourishPreparation=null;d.vendorFlourish=null;d.idleSeconds=0;
 d.routine=['NAPKIN_CONE_FAKEOUT','FINAL_PISTACHIO_CATCH'];d._enterRoutineStep(0);clearTrickTransition(d);
 d.subStep=2;d.stageTimer=0;d.heldItem='NAPKIN';d.servingNapkinState.caught=true;
 w.setServingNapkin({owner:'player',peel:1});w.stallEffects.napkinPeel=1;
 w.updateTouristHand(V(.08,1.21,.30),.98,0,.5,true);
 input.handWorldPos.copy(V(.08,1.21,.30));input.intentWorldPos.copy(input.handWorldPos);
 return{w,d,input};
}

test('real articulated vendors touch, pick up, carry and wrap the SAME held sheet without a toss',()=>{
 for(let vendor=0;vendor<4;vendor++)for(let count=1;count<=8;count++){
  const{w,d,input}=setup(vendor,count),paper=w.servingNapkin,cone=w.conePivot;
  let pickup=null,wrapped=0,heldFrames=0,carriedFrames=0,maxPickupJump=0;
  const set=w.setServingNapkin.bind(w);
  w.setServingNapkin=options=>{
   if(options.owner==='vendor-hand'&&paper.parent===w.heldSocket){
    w.scene.updateMatrixWorld(true);const from=paper.getWorldPosition(V());
    const grip=w.lArmRig.handGroup.localToWorld(V(0,.07,0));pickup=grip.distanceTo(from);
    set(options);maxPickupJump=Math.max(maxPickupJump,paper.getWorldPosition(V()).distanceTo(from));
   }else set(options);
  };
  for(let frame=0;frame<720&&d.subStep===2;frame++){
   w.updateTouristHand(paperReturnHandTarget(d,V(.08,1.21,.30)),.98,0,1/60,true);
   d.update(1/60,frame/60,input);w.updateEnvironmentAnimations(frame/60,1/60);
   assert.equal(w.servingNapkin,paper);assert.equal(w.conePivot,cone);assert.equal(paper.visible,true);assert.equal(w.stallEffects.napkinFlight,false);
   if(paper.parent===w.heldSocket)heldFrames++;
   if(paper.parent===w.lArmRig.handGroup)carriedFrames++;
   if(paper.parent===cone)wrapped++;
  }
  assert.equal(d.subStep,3,`vendor${vendor}/count${count} stuck ${d.servingNapkinState.returning?.phase}`);
  assert.ok(pickup<.035,`pickup gap ${pickup}`);assert.ok(maxPickupJump<1e-8);
  assert.ok(heldFrames+carriedFrames+wrapped<=75,`paper take/wrap took ${(heldFrames+carriedFrames+wrapped)/60}s`);
  assert.ok(heldFrames>=3);assert.ok(carriedFrames>=3);assert.ok(wrapped>=3);
  assert.equal(paper.parent,cone);assert.ok(w.stallEffects.napkinPeel<.04);assert.equal(d.score,140);assert.equal(d.hearts,3);
  w.clearTrickPresentations();assert.equal(paper.visible,true,'reused paper remains around the cone between tricks');
  w.resetTransientPresentation();assert.equal(paper.visible,false,'a new round clears the old paper');
 }
});

test('an unreachable customer hand keeps its sheet until the hand comes back into reach',()=>{
 const{w,d}=setup();w.touristHand.position.set(2,1.2,1);
 const sheet=w.servingNapkin,r=new NapkinReturn(d);
 for(let i=0;i<90;i++){r.update(d,1/60);d._applyKinematics(1/60,i/60);w.stallEffects.update(1/60);}
 assert.equal(sheet.parent,w.heldSocket);assert.equal(r.phase,'reach');assert.equal(r.waiting,true);assert.equal(d.score,0);
 w.resetTransientPresentation();assert.equal(sheet.visible,false);
});
