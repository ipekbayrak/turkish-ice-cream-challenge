import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GameWorld } from '../src/world.js';
import { StallEffects } from '../src/stall-effects.js';
import { SpringVec3 } from '../src/physics.js';
import { BLADE_CONTACT } from '../src/pole-contact.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function fixture(count=2) {
  const w=Object.create(GameWorld.prototype);
  w.scene=new THREE.Scene(); w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();
  w.handSpring=new SpringVec3(.22,1.08,.62,135,18);
  w.leftPropSpring=new SpringVec3(.24,1.22,-.25,88,16);
  w._buildPaddleAndCones(); w._buildVendor(); w._buildTouristPOVHand();
  w.stallEffects=new StallEffects(w);
  w.paddleGroup.position.set(.08,1.24,.2);
  w.updateIceCreamScoops(count,true); w.updateServingLayout(2);
  w.setServingScale(count>4?1.18:1);
  return w;
}
function assertContact(w) {
  assert.equal(w.paddleContact.active,true);
  const top=w.paddleContact.scoop;
  const surface=top.localToWorld(V(0,top.geometry.parameters.radius,0));
  assert.ok(w.paddleContact.bladePoint(w).distanceTo(surface)<1e-8,'blade underside stays on the actual ice surface');
  const bladeNormal=V(0,1,0).transformDirection(w.paddleRollGroup.matrixWorld);
  const iceNormal=V(0,1,0).transformDirection(top.matrixWorld);
  assert.ok(bladeNormal.dot(iceNormal)>.999999,'blade lies tangent, rather than cutting through ice');
  return surface;
}

test('steel blade stays on the highest real scoop through 1/2/8-scoop spins and inversions',()=>{
  for(const count of [1,2,8]) {
    const w=fixture(count), root=w.paddleGroup.position.clone(), cone=w.conePivot;
    for(let frame=0;frame<150;frame++) {
      w.orientPaddleAndHands(frame*.025,null,1/60,frame*.028,Math.sin(frame*.04)*.25);
      assertContact(w);
      assert.equal(w.paddleContact.scoop,w.scoopMeshes[count-1]);
      assert.equal(w.conePivot,cone); assert.equal(cone.parent,w.paddleGroup);
      assert.ok(w.paddleGroup.position.distanceTo(root)<1e-12,'render correction never moves the logical gesture target');
    }
  }
});

test('jiggle, scale and layout changes refit the shaft without leaving a frame of visible separation',()=>{
  const w=fixture(1); w.orientPaddleAndHands(0,null,1/60,0,0);
  for(const count of [2,3,8,1]) {
    w.updateIceCreamScoops(count,true); w.updateServingLayout(2);
    w.scoopStackGroup.scale.set(.92,1.2,.92); w.scoopStackGroup.rotation.z=.22;
    w.refreshPaddleAttachment(); assertContact(w);
    const crown=w.paddleContact.point.clone(),normal=w.paddleContact.normal.clone();
    // Every vertex of the wafer stays below the blade's tangent plane.
    const vertices=w.mainConeMesh.geometry.attributes.position;
    for(let n=0;n<vertices.count;n++) {
      const vertex=w.mainConeMesh.localToWorld(V().fromBufferAttribute(vertices,n));
      assert.ok(vertex.sub(crown).dot(normal)<-.02,'shaft is separated from the wafer');
    }
  }
});

test('outer-cone and detached-stack transfers use the same visible food and preserve their owners',()=>{
  const w=fixture(2), stack=w.scoopStackGroup;
  w.stallEffects.handoffCone('vendor'); w.stallEffects.handoffOuterCone('paddle',true);
  w.stallEffects.setScoop('outer'); w.stallEffects.update(1);
  w.orientPaddleAndHands(0,V(.15,1.3,-.2),1/60); assertContact(w);
  assert.equal(stack.parent,w.outerConeGroup); assert.equal(w.conePivot.parent,w.lArmRig.handGroup);
  const position=V(.18,1.32,.2); w.stallEffects.setScoop('paddle',position);
  w.refreshPaddleAttachment(); assertContact(w);
  assert.equal(stack.parent,w.scene); assert.ok(stack.position.distanceTo(position)<1e-12);
  w.scoopInFlight=true;w.refreshPaddleAttachment();assert.equal(w.paddleContact.active,false,'airborne ice is not magnetically followed by the pole');
  w.scoopInFlight=false;w.refreshPaddleAttachment();assertContact(w);
  w.stallEffects.setScoop('paddle'); w.stallEffects.update(1); w.refreshPaddleAttachment(); assertContact(w);
  assert.equal(stack.parent,w.paddleGroup,'food does not become a child of its own corrected shaft');
});

test('hand-held food only attracts an approaching pole, while empty poles retain their exact strike path',()=>{
  const w=fixture(2);
  w.stallEffects.handoffCone('player');w.stallEffects.update(1);
  w.paddleGroup.position.set(-.6,1.05,-.3); w.orientPaddleAndHands(0,null,1/60);
  assert.equal(w.paddleContact.active,false); assert.equal(w.paddleRollGroup.position.length(),0);
  w.paddleGroup.position.copy(w.scoop2.localToWorld(V(0,w.scoop2.geometry.parameters.radius,0))).add(V(0,.04,0));
  w.refreshPaddleAttachment(); assertContact(w); assert.equal(w.conePivot.parent,w.heldSocket);
  w.updateIceCreamScoops(0,true);w.refreshPaddleAttachment();
  assert.equal(w.paddleContact.active,false);
  const expected=w.paddleRollGroup.localToWorld(V(0,0,.035));
  assert.ok(w.getPaddleStrikePoint().distanceTo(expected)<1e-12);
  assert.notDeepEqual(BLADE_CONTACT,{x:0,y:.02,z:0},'ice contact is not the old cone pivot');
});

test('a carried scoop and both vendor grips follow the real shaft, not the cone pivot',()=>{
  const w=fixture(0);w.carryScoop.visible=true;w.paddleCarryOffsetY=.066;
  for(let n=0;n<30;n++)w.orientPaddleAndHands(.2,null,1/60);
  assertContact(w);assert.equal(w.paddleContact.scoop,w.carryScoop);
  for(const [rig,anchor] of [[w.rArmRig,w.paddleRearGripAnchor],[w.lArmRig,w.paddleFrontGripAnchor]]) {
    if(rig===w.rArmRig||w._leftHandOnShaft)assert.ok(rig.handGroup.getWorldPosition(V()).distanceTo(anchor.getWorldPosition(V()))<.01,'active palm remains attached to shaft');
    else assert.equal(rig.handRig.pose,w._leftSupportRecovery?'support-reach':'open','support visibly releases or approaches the shaft');
  }
  w.carryScoop.visible=false;w.refreshPaddleAttachment();
  assert.equal(w.paddleContact.active,false);assert.equal(w.paddleRollGroup.position.length(),0);
});

test('large hand-held servings keep top contact when an authored takeback approaches the original cone socket',()=>{
  for(const count of [1,2,8])for(const owner of ['vendor','player']) {
    const w=fixture(count);w.stallEffects.handoffCone(owner);w.stallEffects.update(1);
    // Layered and researched takeback paths use the real cone pivot. They must
    // still attach to ice even when the eighth scoop is far above that pivot.
    const socket=w.conePivot.getWorldPosition(V());
    w.paddleGroup.position.copy(socket).add(V(0,-.02,0));
    w.refreshPaddleAttachment();assertContact(w);
    assert.equal(w.conePivot.parent,owner==='vendor'?w.lArmRig.handGroup:w.heldSocket);
    // Customer-service hand delivery instead targets the top scoop's center.
    w.paddleGroup.position.copy(w.getScoopAnchor(count-1));w.refreshPaddleAttachment();assertContact(w);
    // Releasing food in the hand must not magnetically retain a withdrawn pole.
    w.paddleGroup.position.copy(socket).add(V(-.4,0,-.3));w.refreshPaddleAttachment();
    assert.equal(w.paddleContact.active,false);
  }
});

test('cancelling an airborne scoop restores ordinary pole attachment on the same stack',()=>{
  const w=fixture(8),stack=w.scoopStackGroup;w.stallEffects.setScoop('paddle',V(.2,1.5,.1));
  w.scoopInFlight=true;w.refreshPaddleAttachment();assert.equal(w.paddleContact.active,false);
  w.clearTrickPresentations();w.refreshPaddleAttachment();
  assert.equal(w.scoopInFlight,false);assert.equal(w.scoopStackGroup,stack);assert.equal(stack.parent,w.conePivot);assertContact(w);
});
