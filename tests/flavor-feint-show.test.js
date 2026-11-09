import test from 'node:test';import assert from 'node:assert/strict';import{Vector3}from'three';
import{makeVendorFlourishFixture}from'./vendor-flourish-fixture.js';
import{ICE_CREAM_FLAVORS}from'../src/flavors.js';
import{FLAVOR_FEINT_ID,createFlavorFeintPlan}from'../src/flavor-feint-plan.js';
import{clearFlavorFeint}from'../src/flavor-feint-show.js';
const input={isPointerDown:false,isMoving:false,normX:0,normY:0,handWorldPos:new Vector3(.2,1.2,.3),intentWorldPos:new Vector3(.2,1.2,.3),pointerEpoch:0,cancelEpoch:0};
function setup(count=2,vendor=1,stage=31){
 const{w,d}=makeVendorFlourishFixture(vendor,count);w._buildIceCreamCart();
 d.setOrderConfig(count,Array(count).fill(0),stage);d.resetRound(stage,false);w.setVendorCharacter(vendor);
 const plan=createFlavorFeintPlan(Array(count).fill('SCRAPE_FLAVOR_SCOOP').concat('FINAL_PISTACHIO_CATCH'),d.selectedFlavors,count,{random:()=>.02,chance:1});
 plan.status='active';d.flavorFeint=plan;d.routine=[FLAVOR_FEINT_ID,'FINAL_PISTACHIO_CATCH'];d.scoopCount=count;w.updateIceCreamScoops(count,false);
 const displayed=d.selectedFlavors.slice();displayed[plan.index]=plan.offered;w.applySelectedFlavorColors(displayed);w.updateServingLayout(1);
 d.active=true;d._enterRoutineStep(0);return{w,d,plan};
}
test('one, two, clustered five and eight-scoop servings visibly return the wrong ball and finish with the ordered colors',()=>{
 for(const count of[1,2,5,8])for(const vendor of[0,2]){
  const{w,d,plan}=setup(count,vendor),cone=w.conePivot,order=d.selectedFlavors.slice(),score=d.score,phases=new Set();let wrongCarry=0,rightCarry=0,closestWrongTub=Infinity;
  const layout=w.scoopLayoutTargets.map(v=>v.clone());
  for(let frame=0;frame<1500&&d.currentMechanic===FLAVOR_FEINT_ID;frame++){
   phases.add(d.flavorFeintShow.phase);d.update(1/60,frame/60,input);w.updateEnvironmentAnimations(frame/60,1/60,0,0,null,0);
   assert.equal(w.conePivot,cone);assert.equal(d.scoopCount,count);assert.deepEqual(d.selectedFlavors,order);assert.equal(d.hearts,3);
   for(let i=0;i<count-1;i++)assert.ok(w.scoopLayoutTargets[i].distanceTo(layout[i])<1e-10,'lower scoops must not reflow while the top is off the cone');
   if(w.carryScoop.visible){const color=w.carryScoop.material.color.getHex();if(color===ICE_CREAM_FLAVORS[plan.offered].colorHex){wrongCarry++;closestWrongTub=Math.min(closestWrongTub,w.carryScoop.position.distanceTo(w.tubPositions[plan.offered].worldPos));}if(color===ICE_CREAM_FLAVORS[plan.requested].colorHex)rightCarry++;}
  }
  assert.equal(d.currentMechanic,'FINAL_PISTACHIO_CATCH',`count${count}/vendor${vendor} stuck in phase${d.flavorFeintShow?.phase}`);
  assert.equal(plan.status,'done');assert.equal(phases.size,10);assert.ok(wrongCarry>5);assert.ok(rightCarry>5);assert.ok(closestWrongTub<.09);
  assert.equal(d.score,score,'color teasing does not award free points');
  for(let i=0;i<count;i++)assert.equal(w.scoopMeshes[i].material.color.getHex(),ICE_CREAM_FLAVORS[order[i]].colorHex);
 }
});
test('canceling during extraction restores visibility, order colors and the shared carry proxy',()=>{
 const{w,d,plan}=setup(5);for(let f=0;f<700&&d.flavorFeintShow?.phase!==3;f++){d.update(1/60,f/60,input);w.updateEnvironmentAnimations(f/60,1/60,0,0,null,0);}
 assert.equal(d.flavorFeintShow?.phase,3);clearFlavorFeint(d);assert.equal(d.flavorFeint,null);assert.equal(w.carryScoop.visible,false);assert.equal(w.scoopMeshes[plan.index].visible,true);
 assert.equal(w.scoopMeshes[plan.index].material.color.getHex(),ICE_CREAM_FLAVORS[plan.requested].colorHex);
});

test('the actual preparation pipeline takes a different tub only for the chosen last slot and corrects it before the final',()=>{
 for(const count of[1,5]){
  const{w,d}=makeVendorFlourishFixture(1,count);w._buildIceCreamCart();w.stretchyStrand.attach=()=>{};w.stretchyStrand.update=()=>{};
  const colors=[0,2,1,3,0];d.setOrderConfig(count,colors,31);d.resetRound(31,false);d.routine=Array(count).fill('SCRAPE_FLAVOR_SCOOP').concat('FINAL_PISTACHIO_CATCH');d.flavorFeintRandom=()=>.01;
  d.startRound();const plan=d.flavorFeint,order=d.selectedFlavors.slice();assert.ok(plan);let sawWrongPrep=false;
  for(let frame=0;frame<2500&&d.currentMechanic!=='FINAL_PISTACHIO_CATCH';frame++){
   if(d.currentMechanic==='SCRAPE_FLAVOR_SCOOP'&&d.routineIndex===plan.prepareAt){assert.equal(d._getFlavorForScoop(plan.index).index,plan.offered);assert.ok(d._getTubWorldPosForScoop(plan.index).distanceTo(w.tubPositions[plan.offered].worldPos)<1e-9);sawWrongPrep=true;}
   d.update(1/60,frame/60,input);w.updateEnvironmentAnimations(frame/60,1/60,0,0,null,0);
  }
  assert.ok(sawWrongPrep);assert.equal(d.currentMechanic,'FINAL_PISTACHIO_CATCH');assert.equal(plan.status,'done');assert.deepEqual(d.selectedFlavors,order);
  for(let i=0;i<count;i++)assert.equal(w.scoopMeshes[i].material.color.getHex(),ICE_CREAM_FLAVORS[order[i]].colorHex);
 }
});

test('reset during a color prank removes temporary state without changing saved flavor intent',()=>{
 const{w,d}=setup(2),order=d.selectedFlavors.slice();d.update(.016,0,input);d.resetRound(31,false);
 assert.equal(d.flavorFeint,null);assert.equal(d.flavorFeintShow,null);assert.equal(w.carryScoop.visible,false);assert.deepEqual(d.selectedFlavors,order);
});

function rejectWave(d,w){
 const state={...input,isPointerDown:true,isReaching:true,pointerEpoch:7,cancelEpoch:0,pointerY:700};
 for(const x of[160,150,135,120,130,145,160]){
  state.pointerX=x;state.normX=(x-160)*3/390;
  d.update(.04,0,state);w.updateEnvironmentAnimations(0,.04,0,0,null,0);
 }
 return state;
}
test('a real refusal wave gets one comic reply, then both feints and the same ordered final without scoring the wave',()=>{
 const{w,d,plan}=setup(2);const replies=[];d.sayLine=(...args)=>replies.push(args);
 const state=rejectWave(d,w);assert.equal(plan.rejected,true);assert.equal(w._vendorReaction.kind,'refusal');assert.equal(replies.filter(x=>x[1]==='laugh').length,1);
 rejectWave(d,w);assert.equal(replies.filter(x=>x[1]==='laugh').length,1,'the same rejection is acknowledged only once');
 const feints=new Set();
 for(let frame=0;frame<1200&&d.currentMechanic===FLAVOR_FEINT_ID;frame++){
  if(d.flavorFeintShow.phase===0&&d.flavorFeintShow.feintBeat!==undefined)feints.add(d.flavorFeintShow.feintBeat);
  d.update(1/60,frame/60,state);w.updateEnvironmentAnimations(frame/60,1/60,0,0,null,0);
 }
 assert.equal(d.currentMechanic,'FINAL_PISTACHIO_CATCH');assert.equal(plan.status,'done');assert.deepEqual([...feints].sort(),[0,1]);assert.equal(d.score,0);assert.equal(d.hearts,3);
 for(let i=0;i<2;i++)assert.equal(w.scoopMeshes[i].material.color.getHex(),ICE_CREAM_FLAVORS[d.selectedFlavors[i]].colorHex);
 d.gestureValidation.update(state,.016,'later-cut');assert.equal(d.gestureValidation.slice('later-cut'),false,'old rejection motion cannot complete a later cut');
});
test('refusal also works during the existing wrong-color preparation but is ignored in normal cut and rhythm modes',async()=>{
 const{updateFlavorRefusal}=await import('../src/flavor-refusal.js');
 for(const id of['MEGA_TAFFY_SLICE','EYE_LOCK_RHYTHM_CHASE','FIGURE_EIGHT_WEAVE']){
  const{w,d,plan}=setup(1);d.currentMechanic=id;d.routineIndex=plan.prepareAt;
  for(const x of[160,150,135,120,130,145,160])assert.equal(updateFlavorRefusal(d,.04,{...input,isPointerDown:true,pointerEpoch:1,pointerX:x,pointerY:700}),false);
  assert.notEqual(plan.rejected,true);
 }
 const{w,d,plan}=setup(1);d.currentMechanic='CUSTOMER_SCOOP_SHOW';d.routineIndex=plan.prepareAt;
 for(const x of[160,150,135,120,130,145,160])updateFlavorRefusal(d,.04,{...input,isPointerDown:true,pointerEpoch:1,pointerX:x,pointerY:700});
 assert.equal(plan.rejected,true);assert.equal(w._vendorReaction.kind,'refusal');
});
test('a straight swipe or tiny jitter never rejects and waiting keeps the previous automatic correction path',()=>{
 const{w,d,plan}=setup(1);const state={...input,isPointerDown:true,pointerEpoch:3,pointerX:160,pointerY:700};
 for(const x of[160,145,130,115,100]){state.pointerX=x;d.update(.04,0,state);w.updateEnvironmentAnimations(0,.04,0,0,null,0);}
 assert.notEqual(plan.rejected,true);
 state.isPointerDown=false;
 for(let frame=0;frame<1200&&d.currentMechanic===FLAVOR_FEINT_ID;frame++){d.update(1/60,frame/60,state);w.updateEnvironmentAnimations(frame/60,1/60,0,0,null,0);}
 assert.equal(d.currentMechanic,'FINAL_PISTACHIO_CATCH');assert.equal(plan.status,'done');assert.notEqual(plan.rejected,true);
});
test('a shake detected during an already-started offer restarts two readable feints from the current pose',()=>{
 const{w,d,plan}=setup(1);for(let frame=0;frame<300&&d.flavorFeintShow?.phase!==0;frame++){d.update(1/60,frame/60,input);w.updateEnvironmentAnimations(frame/60,1/60,0,0,null,0);}
 assert.equal(d.flavorFeintShow.phase,0);rejectWave(d,w);assert.equal(plan.rejected,true);assert.equal(d.flavorFeintShow.phase,-1);assert.ok(d.flavorFeintShow.rejectionPause<.35);
});

test('only the wrong-color offer shows a side-to-side hint; acknowledgement returns to a quiet show',()=>{
 const old=globalThis.window;globalThis.window={innerWidth:390,innerHeight:844};
 try{
  const{w,d}=setup(1);d.update(1/60,0,input);let guide=d.getGestureGuide();assert.equal(guide.quiet,false);assert.equal(guide.comets.length,2);assert.equal(guide.rings.length,0);assert.match(guide.badgeText,/SALLA/);
  rejectWave(d,w);guide=d.getGestureGuide();assert.equal(guide.quiet,true);assert.equal(guide.comets.length,0);assert.equal(guide.rings.length,0);
 }finally{if(old===undefined)delete globalThis.window;else globalThis.window=old;}
});
