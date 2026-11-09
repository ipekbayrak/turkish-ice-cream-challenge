import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {HandRig} from '../src/hand-rig.js';
import {GameWorld} from '../src/world.js';
import {SpringVec3} from '../src/physics.js';
import {StallEffects} from '../src/stall-effects.js';
import {canonicalPoleHandRotation,poleContactRotation} from '../src/hand-orientation.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),point=o=>o.getWorldPosition(V());
function fixture(){
 const w=Object.create(GameWorld.prototype);w.scene=new THREE.Scene();w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();
 w.handSpring=new SpringVec3(.22,1.08,.62,135,18);w.leftPropSpring=new SpringVec3(.24,1.22,-.25,88,16);
 w._buildPaddleAndCones();w._buildVendor();w._buildTouristPOVHand();w.stallEffects=new StallEffects(w);w.updateIceCreamScoops(2);return w;
}
function bend(rig){
 const wrist=point(rig.handRig.wristAnchor),forearm=wrist.sub(rig.armPose.elbow).normalize();
 const hand=V(0,1,0).transformDirection(rig.handRig.matrixWorld);
 return Math.acos(THREE.MathUtils.clamp(forearm.dot(hand),-1,1))*180/Math.PI;
}

test('handedness follows anatomy, not screen placement or negative scales',()=>{
 for(const handedness of['right','left']){
  const h=new HandRig({handedness});h.setPose('open');h.updateMatrixWorld(true);
  assert.ok((h.thumbPivot.position.x<0)===(handedness==='right'),'right dorsal view has thumb on viewer-left');
  assert.ok((h.fingers[0].base.position.x<h.fingers[3].base.position.x)===(handedness==='right'));
  h.traverse(o=>assert.ok(o.scale.x>0&&o.scale.y>0&&o.scale.z>0,'anatomy is not mirrored by negative scale'));
  const nails=[];h.traverse(o=>{if(o.name==='dorsal-nail')nails.push(o);});
  assert.equal(nails.length,5);for(const nail of nails)assert.ok(nail.position.z>0,'nails identify the dorsal face opposite the curl/palm');
 }
});

test('player right hand points with thumb-left and takes a cone from the right with thumb above it',()=>{
 const w=fixture();assert.equal(w.playerHandRig.handedness,'right');
 w.updateTouristHand(V(.1,1.25,.26),.15,0,1/60,true);
 assert.ok(point(w.thumbPivot).x<point(w.touristWrist).x);
 w.handoffCone('player');w.stallEffects.update(1);
 for(let i=0;i<60;i++)w.updateTouristHand(V(.1,1.25,.26),.98,0,1/60,true);
 assert.ok(point(w.touristSleeve).x>point(w.touristWrist).x,'right forearm still enters from screen-right');
 assert.ok(point(w.thumbPivot).y>point(w.playerHandRig.gripAnchor).y,'thumb rests above the wafer, not underneath');
 assert.ok(point(w.mainConeMesh).distanceTo(point(w.playerHandRig.gripAnchor))<.0011);
});

test('vendor hands use their own right/left anatomy and neutral forearm-facing pole grips',()=>{
 const w=fixture();assert.equal(w.rArmRig.handRig.handedness,'right');assert.equal(w.lArmRig.handRig.handedness,'left');
 for(const target of[V(0,1.24,.22),V(-.35,1.2,-.12),V(.35,1.4,.1),V(0,1.7,-.12)]){
  for(let i=0;i<90;i++){w.paddleGroup.position.copy(target);w.orientPaddleAndHands(0,null,1/60,0,0);}
  for(const rig of[w.rArmRig,w.lArmRig]){
   if(rig.handRig.pose!=='pole')continue;
   assert.ok(bend(rig)<35,`${rig.handRig.handedness}: wrist bent ${bend(rig)} degrees`);
   const shaft=w.paddleRollGroup.getWorldDirection(V());
   const thumbSide=V(rig.handRig.side,0,0).transformDirection(rig.handRig.matrixWorld);
   assert.ok((rig===w.rArmRig?-1:1)*thumbSide.dot(shaft)>.99,'rear right hand uses an overhand grip, front support retains its orientation');
  }
 }
});

test('selected candidate frame is reused after solving rather than recomputed from its new elbow',()=>{
 const w=fixture();w.paddleGroup.position.set(.2,1.3,.2);w.scene.updateMatrixWorld(true);
 const tip=w.paddleRollGroup.getWorldPosition(V()),back=w.paddleRollGroup.getWorldDirection(V()).negate();
 const rig=w.rArmRig,shoulder=point(w.rightShoulderAnchor),candidate=w._safeShaftGrip(tip,back,shoulder,.3,.9,.7,-1);
 assert.ok(candidate.handFrame instanceof THREE.Quaternion);
 w._solveArmIK(rig,shoulder,tip.clone().addScaledVector(back,candidate.distance),V(-.35,-.5,-.2),true);
 w._fitHandToShaft(rig,candidate.distance,0,candidate.handFrame);
 assert.ok(point(rig.wristAnchor).distanceTo(candidate.wrist)<1e-8);
});

test('near-parallel forearm changes turn the palm continuously while keeping the rod axis exact',()=>{
 const shaft=V(1,0,0),contact=V(),side=-1,local=canonicalPoleHandRotation(side);
 const initial=poleContactRotation(side,shaft,contact,V(-1,-.001,0)).multiply(local);
 const next=poleContactRotation(side,shaft,contact,V(-1,.001,0),0,new THREE.Quaternion(),initial,.05).multiply(local);
 assert.ok(initial.angleTo(next)<=.050001,'singular approach may not flip the palm');
 assert.ok(Math.abs(V(side,0,0).applyQuaternion(next).dot(shaft))>.999999,'fingers keep wrapping the rod axis');
});

test('a low resting pole relaxes the elbow after an overhead reach',()=>{
 const w=fixture();w.prepareEmptyConeOffer();
 for(const [target,frames]of[[V(-.66,1.84,-.13),70],[V(-.22,1.15,-.16),120]]){
  for(let i=0;i<frames;i++){
   w.paddleGroup.position.lerp(target,.16);
   w.orientPaddleAndHands(0,V(.22,1.2,-.2),1/60);
  }
 }
 const rig=w.rArmRig,{shoulder,elbow,wrist}=rig.armPose;
 assert.ok(elbow.y<Math.max(shoulder.y,wrist.y)+.06,'elbow may not remain folded beside the head for a low grip');
 assert.ok(bend(rig)<35,'relaxing the elbow preserves a neutral wrist');
 assert.ok(rig.armPose.penetration<1e-6,'natural preference stays outside clothing');
});

test('empty hands rest along either forearm while authored open gestures keep their frame',()=>{
 const w=fixture();w.prepareEmptyConeOffer();w.handoffCone('player');
 for(let i=0;i<90;i++){
  w.paddleGroup.position.set(-.22,1.15,-.16);
  w.orientPaddleAndHands(0,V(.22,1.2,-.2),1/60);
 }
 assert.ok(bend(w.lArmRig)<1,'production empty custom target keeps a straight wrist');
 for(const [rig,anchor,side]of[[w.rArmRig,w.rightShoulderAnchor,-1],[w.lArmRig,w.leftShoulderAnchor,1]]){
  for(const x of[-.25,.25]){
   w._solveArmIK(rig,point(anchor),V(x,1.2,-.2),V(side*.35,-.5,-.2));
   w._setVendorOpenHand(rig,4,true);
   assert.ok(bend(rig)<1,`${rig.handRig.handedness} rest at ${x} follows its forearm`);
  }
  const authored=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.18,-.15,-.12));
  rig.handGroup.quaternion.copy(authored);w._setVendorOpenHand(rig,1);
  assert.ok(rig.handGroup.quaternion.angleTo(authored)<1e-6,'count/point/wave frame is unchanged');
  assert.ok(Math.abs(rig.handRig.fingers[0].base.rotation.x)<.04);
  assert.ok(rig.handRig.fingers[1].base.rotation.x<-.4,'only the authored counting finger opens');
 }
});
