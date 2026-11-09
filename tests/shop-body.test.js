import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {shopBodyFixture} from './shop-body-fixture.js';
import {sampleBodyVisibility} from './shop-body-visibility.js';
import {SHOP_FLOOR_Y} from '../src/shop-interior.js';
import {ICE_CREAM_FLAVORS} from '../src/protocol.js';
import {TubOrderView} from '../src/order-view.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

test('open counter retains four ice wells, cone rack and every counter/rim contact coordinate',()=>{
 const w=shopBodyFixture();assert.equal(w.tubIceGroups.length,4);assert.equal(w.tubMeshes.length,8);assert.ok(w.coneRack);
 const expected=new THREE.Matrix4().compose(V(0,.94,-.34),new THREE.Quaternion().setFromAxisAngle(V(1,0,0),.22),V(1,1,1));
 for(const flavor of ICE_CREAM_FLAVORS){
  assert.ok(w.getTubRimStrikeTarget(flavor.index).distanceTo(V(flavor.xOffset,.061,.117).applyMatrix4(expected))<1e-9);
  assert.equal(w.tubPositions[flavor.index].x,flavor.xOffset);
 }
 for(const x of[-.4,0,.4])assert.ok(w.getCounterStrikeTarget(x).distanceTo(V(x,.0375,.34).applyMatrix4(expected))<1e-9);
 assert.equal(w.counterBase.userData.opening.maxY,.78);
 const deck=new THREE.Box3().setFromObject(w.cartGroup.getObjectByName('counter-steel-deck'));
 const rail=new THREE.Box3().setFromObject(w.cartGroup.getObjectByName('counter-rear-rail'));
 assert.ok(deck.min.z>-.51&&rail.min.z>-.55,'unused rear deck leaves standing clearance in front of the abdomen');
 assert.ok(deck.min.z<w.tubMeshes[0].getWorldPosition(V()).z-.12,'rear ice-can rim remains supported by the deck');
});

test('actual cart and vest leave clothed waist, calves and shoes visible in central mobile and desktop views',()=>{
 for(const[width,height]of[[390,844],[1280,720],[320,568],[844,390],[360,900]]){
  const w=shopBodyFixture(width,height),m=sampleBodyVisibility(w,width,height);
  // The pelvis is under the vest/worktop; its visible boundary is the sash.
  for(const name of['waist','calf0','calf1','shoe0','shoe1'])assert.ok(m[name].visible>0,`${width}×${height}: ${name} blocked ${JSON.stringify(m)}`);
  const hudTop=height-(height<=650?126:148);
  assert.ok(m.shoe0.maxY<hudTop&&m.shoe1.maxY<hudTop,`${width}×${height}: grounded shoes must stay above bottom panels`);
  const head=w.vendorHead.getWorldPosition(V()).project(w.camera);assert.ok(Math.abs(head.x)<.9&&Math.abs(head.y)<.9,'head stays in the same full-body frame');
 }
});

test('lower body follows crouching and side steps without sliding both feet or stretching bones',()=>{
 const w=shopBodyFixture(),body=w.vendorBody,origin=w.vendorGroup.position.clone();
 for(const scale of[.94,1,1.06,1.08])for(let frame=0;frame<400;frame++){
  const time=frame/60;w.vendorTorso.scale.set(scale,1,scale);w.vendorTorso.position.x=Math.sin(time*1.5)*.20;
  w.vendorTorso.position.y=.94+Math.sin(time*2)*.07;w.vendorTorso.rotation.y=Math.sin(time)*.2;body.update(time,1/60);
  assert.ok(body.legs.filter(l=>l.foot.position.y>.0001).length<=1,'one planted support foot throughout a step');
  for(const leg of body.legs){
   assert.ok(leg.foot.position.y>=-1e-8);const sole=new THREE.Box3().setFromObject(leg.foot.children[0]);assert.ok(sole.min.y>=SHOP_FLOOR_Y-1e-8);
   assert.ok(Math.abs(leg.hip.distanceTo(leg.kneePoint)-.44)<1e-7);assert.ok(Math.abs(leg.kneePoint.distanceTo(leg.ankle)-.42)<1e-7);
  }
  assert.ok(w.vendorGroup.position.distanceTo(origin)<1e-12);
 }
 assert.ok(body.stepCount>6,'lateral movement plants new steps');
});

test('full-body camera still fits and selects all four real order tubs then restores the exact view',()=>{
 for(const[width,height]of[[390,844],[320,844],[360,900],[1280,720]]){
  const w=shopBodyFixture(width,height),view=new TubOrderView(w),position=w.camera.position.clone(),rotation=w.camera.quaternion.clone();
  view.begin();view.settleCamera();
  for(let index=0;index<4;index++){
   const p=view.projectedTub(index,width,height);assert.ok(p.x-p.radius>0&&p.x+p.radius<width);
   assert.ok(p.y>0&&p.y<height-126);assert.equal(view.pick(p.x/width,p.y/height),index);
  }
  view.end();assert.ok(w.camera.position.equals(position));assert.ok(w.camera.quaternion.equals(rotation));
 }
});

test('portrait counter edges and every flavor label fit before and during ordering',()=>{
 const context={font:'',measureText(text){return{width:text.length*parseFloat(this.font.slice(4))*.56};}};
 for(const[width,height]of[[320,568],[320,844],[360,900],[394,853],[430,932]]){
  const w=shopBodyFixture(width,height),view=new TubOrderView(w);
  for(const x of[-.59,.59]){
   const p=w.basinDeckGroup.localToWorld(V(x,.01,.34)).project(w.camera);
   assert.ok((p.x+1)*width/2>4&&(p.x+1)*width/2<width-4,`${width} counter edge`);
  }
  for(const ordering of[false,true]){
   if(ordering){view.begin();view.settleCamera();}
   const labels=view.labelLayout(context,width,height,'tr');assert.equal(labels.length,4);
   assert.deepEqual(labels.map(l=>l.text),['Sade','Fıstıklı','Kakaolu','Dutlu']);
   for(let i=0;i<labels.length;i++){
    const label=labels[i];assert.ok(label.boxX>=4&&label.boxX+label.boxWidth<=width-4);
    assert.ok(label.boxY>0&&label.boxY+label.boxHeight<height-100);
    if(i)assert.ok(labels[i-1].boxX+labels[i-1].boxWidth<label.boxX,'all names have their own space');
   }
  }
 }
});
