import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GameWorld} from '../src/world.js';
import {SpringVec3} from '../src/physics.js';
import {TouchReach,pointerLift} from '../src/touch-reach.js';
import {PointerTipView} from '../src/touch-arm-view.js';
import {shopCameraProfile} from '../src/shop-interior.js';

function fixture(width=390,height=844){
 const w=Object.create(GameWorld.prototype);w.scene=new THREE.Scene();w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();w.conePivot=new THREE.Group();w.handSpring=new SpringVec3(.22,1.08,.62,135,18);w._buildTouristPOVHand();
 w.camera=new THREE.PerspectiveCamera(64,width/height,.05,100);w.camera.position.set(0,1.5,1.12);w.camera.lookAt(0,1.28,-.55);w.camera.updateMatrixWorld(true);
 const reach=new TouchReach(w);reach.begin(w.camera,width,height);return{w,reach,view:new PointerTipView(w),width,height};
}
test('actual articulated index tip and marker coincide above contact in pointing and cone poses',()=>{
 for(const [width,height]of [[390,844],[320,568],[844,390],[1280,720]])for(const holding of [false,true])for(const type of ['touch','mouse']){
  const f=fixture(width,height);if(holding)f.w.heldSocket.add(f.w.conePivot);
  f.reach.update(width*.5,height*.72,.26,type);
  for(let i=0;i<60;i++)f.w.updateTouristHand(f.reach.target,holding?.98:.15,0,1/60,true);
  f.view.update(true,width*.5,height*.72,width,height,type);
  assert.ok(Math.abs(f.view.x-width*.5)<1e-6);assert.ok(Math.abs(f.view.y-(height*.72-pointerLift(type,height)))<1e-6);
  assert.ok(f.w.playerAimAnchor.getWorldPosition(new THREE.Vector3()).distanceTo(f.reach.target)<1e-9);
  if(holding)assert.equal(f.w.conePivot.parent,f.w.heldSocket);
  f.w.touristHand.traverse(node=>{if(node.material)for(const m of Array.isArray(node.material)?node.material:[node.material])assert.equal(m.clippingPlanes,null);});
 }
});
test('late wrist animation keeps the tip pinned without changing canonical spring or input',()=>{
 const f=fixture();f.reach.update(195,620);f.w.updateTouristHand(f.reach.target,.2,0,1/60,true);
 const intent=f.reach.target.clone(),spring=f.w.handSpring.pos.clone();
 f.w.palmGroup.rotation.y+=.8;f.view.update(true,195,620,390,844);
 assert.ok(f.w.playerAimAnchor.getWorldPosition(new THREE.Vector3()).distanceTo(intent)<1e-9);
 assert.ok(f.w.handSpring.pos.equals(spring));assert.ok(f.reach.target.equals(intent));
});
test('an authored physical grip is not moved to the raw pointer',()=>{
 const f=fixture();f.w.setPlayerConeGrip(true);f.w.updateTouristHand(new THREE.Vector3(.12,1.22,.3),.98,0,1/60,true);
 const root=f.w.touristHand.position.clone(),socket=f.w.heldSocket.getWorldPosition(new THREE.Vector3());
 f.view.update(true,20,300,390,844);assert.ok(f.w.touristHand.position.equals(root));assert.ok(f.w.heldSocket.getWorldPosition(new THREE.Vector3()).distanceTo(socket)<1e-9);
 const actual=f.w.playerAimAnchor.getWorldPosition(new THREE.Vector3()).project(f.w.camera);
 assert.ok(Math.abs(f.view.x-(actual.x+1)*195)<1e-8);assert.ok(Math.abs(f.view.y-(1-actual.y)*422)<1e-8);
 f.view.setActive(false);assert.equal(f.view.visible,false);
});

test('camera easing keeps the visible tip above contact without moving input or its spring',()=>{
 const f=fixture();f.reach.update(195,620);f.w.updateTouristHand(f.reach.target,.2,0,1/60,true);
 const raw=f.reach.target.clone(),spring=f.w.handSpring.target.clone();
 f.w.camera.position.z+=.12;f.w.camera.position.y+=.025;f.w.camera.updateMatrixWorld(true);
 f.view.update(true,195,620,390,844);
 assert.ok(Math.abs(f.view.x-195)<1e-6);assert.ok(Math.abs(f.view.y-(620-pointerLift('touch',844)))<1e-6);
 assert.ok(f.reach.target.equals(raw));assert.ok(f.w.handSpring.target.equals(spring));
});

test('the last authored handoff frame does not reinterpret a wrist target as a fingertip target',()=>{
 const f=fixture();f.w.setPlayerConeGrip(true);f.w.updateTouristHand(new THREE.Vector3(.1,1.2,.31),.98,0,1/60,true);
 const root=f.w.touristHand.position.clone();f.w.setPlayerConeGrip(false);
 f.view.update(true,195,620,390,844,'touch',false);
 assert.ok(f.w.touristHand.position.equals(root));assert.equal(f.view.visible,true);
});

test('touch follows a small fixed offset without stretching the arm or sleeve after repeated moves',()=>{
 for(const [width,height]of[[320,568],[394,853],[844,390]])for(const holding of[false,true]){
  const f=fixture(width,height),profile=shopCameraProfile(width,height);
  f.w.camera.fov=profile.fov;f.w.camera.position.fromArray(profile.position);f.w.camera.lookAt(new THREE.Vector3(...profile.target));f.w.camera.updateProjectionMatrix();f.w.camera.updateMatrixWorld(true);f.reach.begin(f.w.camera,width,height);
  if(holding)f.w.heldSocket.add(f.w.conePivot);
  let settledLength=null;
  for(let frame=0;frame<900;frame++){
   const x=width*(frame<450?.5:.5+Math.sin(frame*.03)*.28),y=height*(frame<450?.72:.68+Math.cos(frame*.03)*.15);
   f.reach.update(x,y,.26,'touch');f.w.updateTouristHand(f.reach.target,holding?.98:.15,0,1/60,true);
   const input=f.reach.target.clone(),wrist=f.w.touristWrist.getWorldPosition(new THREE.Vector3());
   f.view.update(true,x,y,width,height,'touch');
   assert.ok(Math.abs(f.view.x-x)<1e-6);assert.ok(Math.abs(f.view.y-(y-pointerLift('touch',height)))<1e-6);
   assert.equal(f.w.touristSleeve.scale.y,1);assert.ok(f.w.touristForearm.scale.y<1.2);
   if(frame===300)settledLength=f.w.touristForearm.scale.y;
   if(frame>300&&frame<450)assert.ok(Math.abs(f.w.touristForearm.scale.y-settledLength)<1e-7,'holding still cannot grow the arm');
   assert.ok(f.reach.target.equals(input));assert.ok(f.w.playerArmState.wrist.distanceTo(f.w.playerArmState.shoulder)<=.881,'visual depth fits the fixed arm instead of lengthening it');
   if(holding)assert.equal(f.w.conePivot.parent,f.w.heldSocket);
  }
 }
});
