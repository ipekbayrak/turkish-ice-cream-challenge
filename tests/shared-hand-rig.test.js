import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HandRig, HAND_GRIP_CENTER } from '../src/hand-rig.js';
import { GameWorld } from '../src/world.js';
import { SpringVec3 } from '../src/physics.js';
import { applyVendorConeGrip, captureVendorHandPose, applyVendorReceivingGrip } from '../src/cone-grip.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),position=o=>o.getWorldPosition(V());
function fixture(){
 const w=Object.create(GameWorld.prototype);w.scene=new THREE.Scene();w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();
 w.handSpring=new SpringVec3(.22,1.08,.62,135,18);w._buildPaddleAndCones();w._buildVendor();w._buildTouristPOVHand();return w;
}

test('player and both mirrored vendor hands share the same articulated geometry implementation',()=>{
 const w=fixture();
 for(const rig of[w.playerHandRig,w.rArmRig.handRig,w.lArmRig.handRig]){
  assert.ok(rig instanceof HandRig);assert.equal(rig.fingers.length,4);
  let torus=0;rig.traverse(mesh=>{if(mesh.geometry?.type==='TorusGeometry')torus++;});assert.equal(torus,0,'no replacement finger rings');
 }
 assert.equal(w.rArmRig.handRig.side,-w.lArmRig.handRig.side);
 assert.equal(w.playerAimAnchor,w.playerHandRig.fingers[0].tipAnchor);
});

test('cone finger and thumb tips sit on the tapered wafer surface rather than inside it',()=>{
 for(const side of[-1,1]){
  const hand=new HandRig({side});hand.setPose('cone');hand.updateMatrixWorld(true);
  for(const tip of[...hand.fingers.map(f=>f.tipAnchor),hand.thumbTip]){
   const p=position(tip),waferRadius=.028+p.x*side*.056/.19;
   const clearance=Math.hypot(p.y-HAND_GRIP_CENTER.y,p.z-HAND_GRIP_CENTER.z)-waferRadius;
   assert.ok(clearance>.006&&clearance<.014,`tip skin should touch wafer: ${clearance}`);
  }
 }
});

test('vendor pole and cone poses preserve their contact roots and expose a real anatomical wrist',()=>{
 const w=fixture();
 for(const rig of[w.rArmRig,w.lArmRig]){
  rig.handGroup.position.set(.2,1.2,-.4);const root=rig.handGroup.position.clone();
  rig.handRig.placeGrip(V(),'pole','pole',.014);rig.handGroup.updateWorldMatrix(true,true);
  assert.ok(position(rig.gripAnchor).distanceTo(root)<1e-9);
  assert.ok(position(rig.wristAnchor).distanceTo(root)>.07);
  applyVendorConeGrip(rig);rig.handGroup.updateWorldMatrix(true,true);
  const wafer=rig.handGroup.localToWorld(V(0,.05,.035));
  assert.ok(position(rig.gripAnchor).distanceTo(wafer)<1e-9);
  assert.ok(rig.handGroup.position.equals(root));
 }
});

test('player side grip stays connected to its forearm and keeps the same cone upright',()=>{
 const w=fixture(),cone=w.conePivot;w.heldSocket.add(cone);cone.position.set(0,.05,0);cone.quaternion.identity();w.setPlayerConeGrip(true);
 for(const target of[V(-.3,1.2,.26),V(.3,1.4,.30)]){
  for(let i=0;i<90;i++)w.updateTouristHand(target,.98,0,1/60,true);
  w.scene.updateMatrixWorld(true);
  assert.ok(position(w.mainConeMesh).distanceTo(position(w.playerHandRig.gripAnchor))<1e-7,'wafer center is in the physical grip');
  const up=V(0,1,0).applyQuaternion(cone.getWorldQuaternion(new THREE.Quaternion()));assert.ok(up.y>.999999);
  const wrist=position(w.touristWrist),armTop=w.touristForearm.localToWorld(V(0,w.touristForearm.geometry.parameters.height*.5,0));
  assert.ok(wrist.distanceTo(armTop)<.028,'forearm end overlaps wrist');
  const forearmAxis=V(0,1,0).transformDirection(w.touristForearm.matrixWorld),handAxis=V(0,1,0).transformDirection(w.playerHandRig.matrixWorld);
  assert.ok(forearmAxis.dot(handAxis)>Math.cos(Math.PI/6),'no right-angle wrist kink');
  assert.equal(w.conePivot,cone);assert.equal(cone.parent,w.heldSocket);
 }
});

test('free pointed and held-cone fingertips align with visible aim without moving logical input',()=>{
 const w=fixture(),target=V(.18,1.31,.26),raw=target.clone();
 for(const holding of[false,true]){
  if(holding){w.heldSocket.add(w.conePivot);w.conePivot.position.set(0,.05,0);}
  for(let i=0;i<30;i++)w.updateTouristHand(target,holding?.98:.15,0,1/60,true);
  assert.ok(position(w.playerAimAnchor).distanceTo(target)<1e-8);
  assert.ok(target.equals(raw));assert.ok(w.handSpring.pos.equals(raw));
 }
 w.setPlayerConeGrip(true);w.updateTouristHand(target,.98,0,1/60,true);
 assert.ok(w.touristHand.position.equals(target),'authored physical grip root is not re-aimed');
});

test('authored root withdrawal and free fingertip control meet without a cone ownership jump',()=>{
 const w=fixture(),cone=w.conePivot,tipTarget=V(.16,1.30,.26);w.heldSocket.add(cone);cone.position.set(0,.05,0);cone.quaternion.identity();w.setPlayerConeGrip(true);
 for(let i=0;i<90;i++)w.updateTouristHand(V(.1,1.2,.3),.98,0,1/60,true);
 const beforeRoot=w.touristHand.position.clone(),converted=w.getPlayerTipRootTarget(tipTarget);
 assert.ok(w.touristHand.position.equals(beforeRoot),'converting target never moves geometry');
 w.updateTouristHand(converted,.98,0,1/60,true);const previousCone=position(cone);
 assert.ok(position(w.playerAimAnchor).distanceTo(tipTarget)<1e-7);
 w.setPlayerConeGrip(false);w.updateTouristHand(tipTarget,.98,0,1/60,true);
 assert.ok(position(cone).distanceTo(previousCone)<1e-7);assert.equal(cone.parent,w.heldSocket);
});

test('legacy vendor cone props use their real body center while paper is pinched at its fold',()=>{
 const w=fixture();w.leftPropSpring=new SpringVec3(.2,1.22,.03,88,16);w.paddleGroup.position.set(-.2,1.2,.1);
 for(const prop of[w.leftHandConeProp,w.napkinConeProp,w.napkinProp]){
  for(const old of[w.leftHandConeProp,w.napkinConeProp,w.napkinProp])old.visible=false;
  prop.visible=true;const parent=prop.parent,local=prop.position.clone();
  for(let i=0;i<30;i++)w.orientPaddleAndHands(0,V(.2,1.22,.03),1/60,0,0);
  w.scene.updateMatrixWorld(true);let contact;
  if(prop===w.napkinProp)contact=prop.children[0].localToWorld(V(.04,-.09,.04));
  else contact=position(prop);
  assert.ok(position(w.lArmRig.gripAnchor).distanceTo(contact)<1e-8,'actual prop contact is inside the shared grip');
  assert.equal(w.lArmRig.handRig.pose,prop===w.napkinProp?'pinch':'cone');
  assert.equal(w._leftHandOnShaft,false);assert.equal(prop.parent,parent);assert.ok(prop.position.equals(local));
 }
});

test('player paper-only uses the same thumb/index pinch and leaves cone grip priority intact',()=>{
 const w=fixture(),target=V(.1,1.2,.26),socket=w.heldSocket;
 w.servingNapkin=new THREE.Group();w.servingNapkin.position.set(0,.06,-.018);socket.add(w.servingNapkin);
 for(const serving of[false,true]){
  w.heldNapkin.visible=!serving;w.servingNapkin.visible=serving;
  for(let i=0;i<60;i++)w.updateTouristHand(target,.98,0,1/60,true);
  w.scene.updateMatrixWorld(true);const edge=serving?position(w.servingNapkin):w.heldNapkin.localToWorld(V(0,.08,0));
  assert.equal(w.playerHandRig.pose,'pinch');assert.ok(position(w.playerHandRig.gripAnchor).distanceTo(edge)<1e-8);
  const separation=position(w.playerAimAnchor).distanceTo(position(w.playerHandRig.thumbTip));
  assert.ok(separation>.018&&separation<.025,'thin fold fits between index and thumb');
  assert.equal(w.heldSocket,socket);assert.equal(w.servingNapkin.parent,socket);
 }
 socket.add(w.conePivot);w.conePivot.position.set(0,.05,0);
 for(let i=0;i<60;i++)w.updateTouristHand(target,.98,0,1/60,true);
 assert.equal(w.playerHandRig.pose,'cone','paper wrapped around a cone does not replace the cone grip');
});

test('receiving pose eases the real wrist from pole grip to cone grip before ownership changes',()=>{
 const w=fixture(),rig=w.lArmRig;rig.handGroup.position.set(.25,1.20,-.235);
 rig.handGroup.rotation.set(.18,-.25,.12);rig.handRig.placeGrip(V(),'pole','pole',.014);
 rig.handGroup.updateWorldMatrix(true,true);const initial=position(rig.wristAnchor),initialTip=position(rig.handRig.aimAnchor),root=rig.handGroup.position.clone();
 const from=captureVendorHandPose(rig);let previous=initial,maxStep=0;
 for(let i=0;i<=15;i++){
  applyVendorReceivingGrip(rig,i/15,from);rig.handGroup.updateWorldMatrix(true,true);
  const wrist=position(rig.wristAnchor);maxStep=Math.max(maxStep,wrist.distanceTo(previous));previous=wrist;
  assert.ok(rig.handGroup.position.equals(root),'pose blending never changes the authored target');
  if(i===0){assert.ok(wrist.distanceTo(initial)<1e-9);assert.ok(position(rig.handRig.aimAnchor).distanceTo(initialTip)<1e-9);}
 }
 assert.ok(maxStep<.025,'no old126–197mm wrist jump');
 const readyWrist=position(rig.wristAnchor);applyVendorConeGrip(rig);rig.handGroup.updateWorldMatrix(true,true);
 assert.ok(position(rig.wristAnchor).distanceTo(readyWrist)<1e-9,'physical attach can use the exact ready pose');
 assert.equal(w.conePivot.parent,w.paddleGroup,'preparing the hand never reparents food');
});
