import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GameWorld} from '../src/world.js';
import {SpringVec3} from '../src/physics.js';
import {StallEffects} from '../src/stall-effects.js';
import {VendorArmSolver,segmentBoxDistanceSquared} from '../src/vendor-arm-solver.js';
import {inspectVendorArmSurfaces} from './vendor-arm-geometry.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function fixture(){
 const w=Object.create(GameWorld.prototype);w.scene=new THREE.Scene();w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();
 w.handSpring=new SpringVec3(.22,1.08,.62,135,18);w.leftPropSpring=new SpringVec3(.24,1.22,-.25,88,16);
 w._buildPaddleAndCones();w._buildVendor();w._buildTouristPOVHand();w.stallEffects=new StallEffects(w);return w;
}
function assertRenderedArm(w,rig){
 const p=rig.armPose;
 assert.ok(p.upperLength<=.375&&p.lowerLength<=.375,'arm bones do not stretch to force a grip');
 const wrist=rig.handRig.wristAnchor.getWorldPosition(V());
 assert.ok(p.wrist.distanceTo(wrist)<1e-8,'forearm ends at the articulated wrist, not the contact root');
 const surfaces=inspectVendorArmSurfaces(w,rig);
 assert.equal(surfaces.hits,0,`rendered arm enters clothing: ${JSON.stringify(surfaces.first)}`);
 const cap=rig.shoulderCap,endpoint=cap.worldToLocal(p.shoulder.clone());
 assert.ok(endpoint.length()<.0781,'shoulder travel stays connected inside its shirt cap');
}

test('actual articulated arms remain outside the clothed torso across vendors, scoops, tubs, offers and inversions',()=>{
 const w=fixture(),poses=[[0,1.22,.27],[-.62,.98,-.33],[.62,1.5,.2],[0,1.84,-.1],[-.66,1.84,-.13]];
 for(const count of[0,1,2,8])for(let vendor=0;vendor<4;vendor++){
  w.setVendorCharacter(vendor);w.updateIceCreamScoops(count);w.updateServingLayout(2);
  for(const pose of poses)for(let frame=0;frame<70;frame++){
   w.paddleGroup.position.lerp(V(...pose),.16);
   w.orientPaddleAndHands(frame*.02,null,1/60,frame*.07,Math.sin(frame*.03)*.2);
   if(frame%5)continue;
   w.scene.updateMatrixWorld(true);
   assertRenderedArm(w,w.rArmRig);assertRenderedArm(w,w.lArmRig);
   assert.ok(w.rArmRig.handGroup.position.distanceTo(w.paddleRearGripAnchor.getWorldPosition(V()))<1e-8);
   if(w._leftHandOnShaft){
    assert.ok(w.lArmRig.handGroup.position.distanceTo(w.paddleFrontGripAnchor.getWorldPosition(V()))<1e-8);
    assert.ok(w.paddleRearGripAnchor.position.distanceTo(w.paddleFrontGripAnchor.position)>=.099,'support hands have separate grip space');
   }
   else assert.equal(w.lArmRig.handRig.pose,w._leftSupportRecovery?'support-reach':'open','support stays visibly unlocked until safe contact');
  }
 }
});

test('analytic collision test rejects forearm crossings but allows a free outside segment',()=>{
 const torso=new THREE.Group(),solver=new VendorArmSolver(torso).prepare();
 assert.ok(solver.penetration(V(-.5,.3,0),V(.5,.3,0))>.1);
 assert.equal(solver.penetration(V(-.5,.3,.4),V(.5,.3,.4)),0);
 const bare=new VendorArmSolver(null).prepare();
 const pose=bare.solve(V(0,1.4,0),V(.2,1.2,.4));
 assert.equal(pose.penetration,0);assert.ok(Number.isFinite(pose.elbow.x));
});

test('clothing-box corners use capsule distance, not an oversized rectangular inflation',()=>{
 const box=new THREE.Box3(V(0,0,0),V(1,1,1));
 assert.ok(Math.abs(segmentBoxDistanceSquared(V(1.04,.2,1.04),V(0,.6,0),box)-.0032)<1e-12);
 const torso=new THREE.Group(),solver=new VendorArmSolver(torso).prepare();
 assert.equal(solver.pointBlocked(V(-.25,.3,.26)),false);
 assert.equal(solver.penetration(V(-.25,.2,.26),V(-.25,.4,.26)),0);
});

test('reset discards old tangent/grip and elbow preferences without moving gameplay food',()=>{
 const w=fixture(),cone=w.conePivot;
 w.paddleTangentOffset=1.2;w._rearGripDistance=.6;w._frontGripDistance=.3;w.rArmRig.armPose={elbow:V()};
 const position=w.paddleGroup.position.clone();w.resetPaddleOrientation();
 assert.equal(w.paddleTangentOffset,0);assert.equal(w._rearGripDistance,null);assert.equal(w.rArmRig.armPose,null);
 assert.equal(w.conePivot,cone);assert.ok(w.paddleGroup.position.equals(position));
});

test('shaft safety predicts the actual articulated wrist on both steel and wooden grips',()=>{
 const w=fixture();w.paddleGroup.position.set(.05,1.25,.2);w._displayedPaddleRoll=.7;
 w.paddleRollGroup.rotation.set(.25,.4,-.1);w.scene.updateMatrixWorld(true);
 const tip=w.paddleRollGroup.getWorldPosition(V());
 const backward=V(0,0,-1).applyQuaternion(w.paddleRollGroup.getWorldQuaternion(new THREE.Quaternion()));
 for(const [side,rig,anchor]of[[-1,w.rArmRig,w.rightShoulderAnchor],[1,w.lArmRig,w.leftShoulderAnchor]])for(const distance of[.6,.9]){
  const predicted=w._safeShaftGrip(tip,backward,anchor.getWorldPosition(V()),distance,distance,distance,side);
  rig.handGroup.position.copy(tip).addScaledVector(backward,distance);
  w._fitHandToShaft(rig,distance,Math.sin(.7)*(side<0?.18:.14),predicted.handFrame);
  const actual=rig.handRig.wristAnchor.getWorldPosition(V());
  assert.ok(actual.distanceTo(predicted.wrist)<1e-9,`side${side}, distance${distance}: prediction must follow current HandRig geometry`);
 }
});
