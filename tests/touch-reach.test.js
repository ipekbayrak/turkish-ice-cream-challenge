import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {TouchReach,pointerLift} from '../src/touch-reach.js';
import {GestureValidation} from '../src/gesture-validation.js';

function fixture(width=390,height=844){
 const camera=new PerspectiveCamera(64,width/height,.05,100);camera.position.set(0,1.5,1.12);camera.lookAt(0,1.28,-.55);camera.updateMatrixWorld(true);
 const reach=new TouchReach({});reach.begin(camera,width,height);return{reach,camera,width,height};
}
test('fingertip target sits a consistent visible distance above mouse/touch contact',()=>{
 for(const [width,height]of [[320,568],[390,844],[844,390],[1280,720]])for(const type of ['touch','mouse']){
  const f=fixture(width,height);
  for(const [x,y]of[[.2,.4],[.5,.65],[.8,.85]])for(const depth of[.26,.36,.48]){
   const target=f.reach.update(x*width,y*height,depth,type),p=target.clone().project(f.camera);
   assert.ok(Math.abs((p.x+1)*width*.5-x*width)<1e-7);
   assert.ok(Math.abs((1-p.y)*height*.5-(y*height-pointerLift(type,height)))<1e-7);
   assert.ok(Math.abs(target.z-depth)<1e-9);
   const contact=f.reach.contactAt(target,type);assert.ok(Math.abs(contact.x-x*width)<1e-7);assert.ok(Math.abs(contact.y-y*height)<1e-7);
  }
 }
});
test('edges keep the actual fingertip aim inside the visible playfield',()=>{
 const f=fixture();for(const [x,y]of[[0,0],[390,0],[0,844],[390,844]]){
  f.reach.update(x,y);assert.ok(f.reach.aimX>-1&&f.reach.aimX<1);assert.ok(f.reach.aimY>-1&&f.reach.aimY<1);
 }
});
test('camera breathing, a carried cone and posed fingertips cannot manufacture raw intention',()=>{
 const f=fixture();f.reach.update(180,640);const original=f.reach.target.clone();
 f.camera.position.y+=.03;f.camera.rotation.x+=.1;f.camera.updateMatrixWorld(true);
 for(let i=0;i<30;i++){f.reach.update(180,640);assert.ok(f.reach.target.distanceTo(original)<1e-10);}
 f.reach.end();assert.equal(f.reach.update(180,640),null);
});
test('a held pointer with a raised tip cannot count as following a new beat',()=>{
 const f=fixture(),validation=new GestureValidation();let passed=false;
 for(let i=0;i<180;i++){
  f.reach.update(195,620);validation.update({normX:0,normY:1-620/844*2,aimNormX:f.reach.aimX,aimNormY:f.reach.aimY,isPointerDown:true,pointerEpoch:1,cancelEpoch:0,intentWorldPos:f.reach.target},1/60,'follow');
  passed ||= validation.follow('beat',new Vector3(.27,1.22,.27),1/60);
 }assert.equal(passed,false);
});
