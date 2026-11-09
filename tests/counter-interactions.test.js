import test from 'node:test';
import assert from 'node:assert/strict';
import{Vector3,Quaternion}from'three';
import{playerFreeHandRotation}from'../src/hand-orientation.js';
import{HandRig}from'../src/hand-rig.js';
import{OrderPatience}from'../src/order-patience.js';
import{makeVendorFlourishFixture}from'./vendor-flourish-fixture.js';

test('free customer hand offers a vertical palm with thumb up, not a pronated pointer',()=>{
 const hand=new HandRig({handedness:'right'});hand.setPose('relaxed');
 for(const x of[-.5,0,.5])for(const y of[1,1.4,1.8]){
  const q=playerFreeHandRotation(x,y,0,new Quaternion()),palm=new Vector3(0,0,-1).applyQuaternion(q),thumb=new Vector3(-1,0,0).applyQuaternion(q);
  assert.ok(Math.abs(palm.y)<.12);assert.ok(palm.x<-.8);assert.ok(thumb.y>.9);
 }
 assert.ok(hand.fingers[0].base.rotation.x<-.1);assert.ok(hand.fingers[1].base.rotation.x<hand.fingers[0].base.rotation.x);
});

test('undecided order triggers real bare-pole counter and bell contacts without taking the customer cone',()=>{
 const{w}=makeVendorFlourishFixture(1,1);w._buildIceCreamCart();w.handoffCone('player');w.updateIceCreamScoops(0,false);w.carryScoop.visible=false;
 const cone=w.conePivot,owner=cone.parent,events=[];
 const nudge=new OrderPatience(w,{playCounterRap:()=>events.push('table'),playBellNote:()=>events.push('bell')},()=>events.push('prompt'));
 const order={active:true,phase:'order',count:0,hover:-1};
 for(let f=0;f<900;f++){
  if(!nudge.update(1/60,f/60,order))w.updateOrderPresentation({phase:'flavor',count:0},1/60,f/60);
  w.updateEnvironmentAnimations(f/60,1/60,0,0,()=>events.push('bell'),0);
  assert.equal(cone.parent,owner);assert.equal(w.scoopMeshes.filter(x=>x.visible).length,0);
  if(f<238)assert.equal(events.length,0,'no impatient cue before four seconds');
 }
 assert.ok(events.filter(x=>x==='table').length>=3,JSON.stringify(events));
 assert.ok(events.includes('bell'),JSON.stringify(events));
 const before=events.length;nudge.update(.016,16,{...order,hover:0});assert.equal(nudge.active,false);
 nudge.update(.016,16,{...order,count:1});assert.equal(events.length,before,'choosing immediately stops prompting');
});
