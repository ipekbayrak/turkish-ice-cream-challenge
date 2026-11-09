import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import{GameWorld}from'../src/world.js';import{SpringVec3}from'../src/physics.js';import{TouchReach}from'../src/touch-reach.js';import{PointerTipView}from'../src/touch-arm-view.js';import{PLAYER_UPPER_ARM_LENGTH,PLAYER_FOREARM_LENGTH}from'../src/player-arm.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function fixture(width,height){const w=Object.create(GameWorld.prototype);w.scene=new THREE.Scene();w.camera=new THREE.PerspectiveCamera(64,width/height,.05,100);w.camera.position.set(0,1.5,1.55);w.camera.lookAt(0,1.42,-.45);w.camera.updateMatrixWorld(true);w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();w.conePivot=new THREE.Group();w.handSpring=new SpringVec3(.22,1.08,.62,135,18);w._buildTouristPOVHand();const reach=new TouchReach(w);reach.begin(w.camera,width,height);return{w,reach,view:new PointerTipView(w)};}
test('POV has only a short fixed forearm/cuff aligned to wrist, without a shoulder crossing the view',()=>{
 for(const [width,height]of[[394,853],[320,568],[1280,720],[620,704]]){
  const{w,reach,view}=fixture(width,height);
  for(let i=0;i<300;i++){
   const x=width*(.5+.44*Math.sin(i*.06)),y=height*(.5+.44*Math.cos(i*.04));reach.updateAim(x,y);const raw=reach.target.clone();w.updateTouristHand(raw,.2,0,1/60,true);view.update(true,x,y,width,height,'touch',true,{x,y});
   const a=w.playerArmState,axis=V(0,1,0).transformDirection(w.playerHandRig.matrixWorld),forearm=a.wrist.clone().sub(a.elbow).normalize();
   assert.ok(axis.dot(forearm)>.999999,'no inward elbow/wrist fold');
   assert.ok(Math.abs(a.elbow.distanceTo(a.wrist)-PLAYER_FOREARM_LENGTH)<1e-6);assert.ok(Math.abs(a.elbow.distanceTo(a.shoulder)-PLAYER_UPPER_ARM_LENGTH)<1e-6);
   assert.ok(a.wrist.distanceTo(a.shoulder)<.331);assert.equal(w.touristForearm.scale.y,1);assert.equal(w.touristSleeve.scale.y,1);
   assert.ok(!a.collar?.visible&&!a.joint?.visible);assert.ok(Math.abs(view.x-x)<1e-6&&Math.abs(view.y-y)<1e-6);assert.ok(reach.target.equals(raw));
   assert.ok(w.playerAimAnchor.getWorldPosition(V()).distanceTo(raw)<1e-6,'rendering no longer pulls the hand toward camera');
  }
 }
});
test('cone grip keeps the same straight short forearm and no enlarged sleeve',()=>{const{w}=fixture(394,853);w.setPlayerConeGrip(true);for(let i=0;i<80;i++){w.updateTouristHand(V(.1,1.2,.3),.98,0,.016,false);const a=w.playerArmState,axis=V(0,1,0).transformDirection(w.playerHandRig.matrixWorld);assert.ok(axis.dot(a.wrist.clone().sub(a.elbow).normalize())>.999999);assert.ok(w.touristSleeve.geometry.parameters.radiusBottom<=.06);}});
