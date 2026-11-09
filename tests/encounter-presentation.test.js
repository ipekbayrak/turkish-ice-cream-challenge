import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3,Scene,Group,Quaternion} from 'three';
import {PoleContact} from '../src/pole-contact.js';
import {EncounterCamera} from '../src/encounter-camera.js';
import {ServingClearance} from '../src/serving-clearance.js';
import {poleHasFood} from '../src/pole-hygiene.js';
import {shopBodyFixture} from './shop-body-fixture.js';
import {makeVendorFlourishFixture} from './vendor-flourish-fixture.js';
import {TubOrderView} from '../src/order-view.js';
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);

test('taking then ordering moves closer smoothly and keeps the outside ice rims in portrait',()=>{
 for(const[width,height]of[[320,568],[394,853],[360,900],[430,932]]){
  const w=shopBodyFixture(width,height);w.canvas={clientWidth:width,clientHeight:height};let settled=0;
  const c=new EncounterCamera(w,()=>settled++);w.encounterCamera=c;const view=new TubOrderView(w);
  c.setPhase('offer',true);const offer=w.camera.position.z;
  c.setPhase('order');for(let i=0;i<60;i++)c.update(1/60);const order=w.camera.position.z;
  c.setPhase('play');let previous=order;
  for(let i=0;i<60;i++){c.update(1/60);assert.ok(Math.abs(w.camera.position.z-previous)<.02);previous=w.camera.position.z;}
  assert.ok(offer>order&&order>w.camera.position.z);assert.equal(settled,3);
  for(let index=0;index<4;index++){const p=view.projectedTub(index,width,height);assert.ok(p.x-p.radius*1.22>4&&p.x+p.radius*1.22<width-4,`${width} tub${index} framed`);}
  c.setPhase('offer',true);assert.equal(w.camera.position.z,offer);
 }
});

test('filled pole and vendor servings cannot pass through the actual worktop',()=>{
 for(const count of[1,2,8])for(const flip of[0,Math.PI]){
  const{w}=makeVendorFlourishFixture(1,count);w.vendorPoleFree=false;
  w.paddleGroup.position.set(0,1,-.18);w.conePivot.rotation.set(0,0,flip);w.updateServingLayout(1);w.scene.updateMatrixWorld(true);
  const owner=w.conePivot.parent,clearance=new ServingClearance();assert.equal(clearance.apply(w),true);
  for(const mesh of[w.mainConeMesh,...w.scoopMeshes.filter(m=>m.visible)]){const bounds=new Box3().setFromObject(mesh);assert.ok(bounds.min.y>=1.055-1e-7);}
  assert.equal(w.conePivot.parent,owner);assert.equal(w.scoopMeshes.filter(m=>m.visible).length,count);
 }
});

test('a deliberately free pole never magnetically reattaches to a nearby held serving',()=>{
 const{w}=makeVendorFlourishFixture(1,2);w.handoffCone('vendor');w.vendorPoleFree=true;
 w.paddleGroup.position.copy(w.getScoopAnchor(1));
 assert.equal(poleHasFood(w),false);assert.equal(w.paddleContact.update(w,0),false);
 w.carryScoop.visible=true;assert.equal(poleHasFood(w),true);w.carryScoop.visible=false;
 w.outerConeGroup.visible=true;w.paddleGroup.attach(w.outerConeGroup);assert.equal(poleHasFood(w),true,'even an empty wafer is not bare steel');
});

test('bare pole rotation progresses continuously, even when contact is fitted repeatedly in one frame',()=>{
 const scene=new Scene(),paddleGroup=new Group(),paddleRollGroup=new Group();scene.add(paddleGroup);paddleGroup.add(paddleRollGroup);
 const w={paddleGroup,paddleRollGroup,vendorPoleFree:true},p=new PoleContact();p.active=true;let previous=new Quaternion();
 for(let frame=0;frame<60;frame++){
  p.beginPoseFrame(w,1/60);paddleGroup.rotation.y=1.2;p.update(w,0);
  const current=paddleRollGroup.getWorldQuaternion(new Quaternion());assert.ok(current.angleTo(previous)<=5/60+1e-8);
  if(frame===0)assert.ok(current.angleTo(previous)>.04,'rotation must advance rather than freeze');
  for(let repeat=0;repeat<3;repeat++)p.update(w,0);
  assert.ok(current.angleTo(paddleRollGroup.getWorldQuaternion(new Quaternion()))<1e-7,'refits cannot spend the frame turn budget again');previous.copy(current);
 }
 assert.ok(previous.angleTo(new Quaternion().setFromAxisAngle(V(0,1,0),1.2))<1e-7);
});

test('receiving a serving before counter taps keeps both actual wrists continuous and clear',()=>{
 for(const vendor of[0,1,2,3])for(const count of[1,8]){
  const{w,d,step}=makeVendorFlourishFixture(vendor,count);d.afkScenario=0;
  const rigs=[w.rArmRig,w.lArmRig];let previous=rigs.map(r=>r.wristAnchor.getWorldPosition(V()));
  for(let frame=0;frame<300;frame++){
   step();rigs.forEach((rig,index)=>{
    const wrist=rig.wristAnchor.getWorldPosition(V());
    assert.ok(wrist.distanceTo(previous[index])<.065,`vendor${vendor}/${count} wrist${index} at${frame}`);
    assert.ok(rig.armPose.penetration<1e-6);previous[index]=wrist;
   });
  }
  assert.equal(w.conePivot.parent,w.lArmRig.handGroup);assert.equal(poleHasFood(w),false);
 }
});

test('portrait information stays above the actual bells, including the cart placement and phone cutout',async()=>{
 const{encounterHudLayout}=await import('../src/hud-layout.js');
 for(const[width,height,safeTop]of[[320,568,20],[394,853,48],[360,900,0],[430,932,48]]){
  const w=shopBodyFixture(width,height);w.canvas={clientWidth:width,clientHeight:height};const c=new EncounterCamera(w);
  for(const phase of['offer','order','play']){
   c.setPhase(phase,true);const pivot=w.bells[3].pivot;
   const top=pivot.parent.localToWorld(pivot.position.clone()).project(w.camera);const bellTop=(1-top.y)*height*.5;
   const layout=encounterHudLayout(width,height,safeTop,bellTop);
   assert.ok(layout.cueTop+39<bellTop,`${width}/${phase} text clears bell suspension`);
   assert.ok(layout.top>=safeTop);assert.ok(layout.cueTop>=layout.top+48);assert.ok(layout.cueTop+layout.captionMaxHeight+8<=bellTop);
  }
 }
});
