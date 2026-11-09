import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Quaternion} from 'three';
import {makeVendorFlourishFixture} from './vendor-flourish-fixture.js';
import {inspectVendorArmSurfaces,inspectVendorHandSurfaces} from './vendor-arm-geometry.js';

test('axial turns keep small and tall servings clear while deliberate flip poses retain their rotation',()=>{
 for(const count of[2,8]){
  const f=makeVendorFlourishFixture(0,count),{w,d}=f;d.isAfkShowActive=false;d.idleSeconds=0;
  let inverted=false;
  for(let i=0;i<180;i++){
   f.step(1/60,true);
   const up=new Vector3(0,1,0).applyQuaternion(w.conePivot.getWorldQuaternion(new Quaternion()));
   inverted ||= up.y<-.5;
   assert.ok(up.y>.75,'the serving no longer propellers through the counter/torso');
   const top=w.paddleContact.highestVisible(w),crown=top.localToWorld(new Vector3(0,top.geometry.parameters.radius,0));
   assert.ok(w.paddleContact.bladePoint(w).distanceTo(crown)<1e-8,'top contact is retained throughout the turn');
   if(i%12===0)for(const rig of[w.rArmRig,w.lArmRig]){
    assert.equal(inspectVendorArmSurfaces(w,rig).hits,0);assert.equal(inspectVendorHandSurfaces(w,rig).hits,0);
   }
  }
  assert.equal(d.score,0);assert.equal(d.hearts,d.maxHearts);assert.ok(d.shaftRoll>Math.PI*8,'the existing fast roll timing is retained');
  assert.equal(inverted,false);
  w.resetTransientPresentation();assert.equal(w.presentationAxialSpin,false);
  w.handoffCone('paddle');w.updateIceCreamScoops(count);
  for(let i=0;i<90;i++)w.orientPaddleAndHands(0,null,1/60,Math.PI,0);
  const flipped=new Vector3(0,1,0).applyQuaternion(w.conePivot.getWorldQuaternion(new Quaternion()));
  assert.ok(flipped.y<-.75,'intentional upside-down tricks still fully invert the cone');
 }
});
