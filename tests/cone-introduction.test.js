import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {ConeIntroduction} from '../src/cone-introduction.js';
function fixture(){
 const scene=new THREE.Scene(),hand=new THREE.Group(),vendor=new THREE.Group(),pole=new THREE.Group(),cone=new THREE.Group(),socket=new THREE.Group();hand.add(socket);scene.add(hand,vendor,pole);vendor.position.set(0,1.3,-.12);hand.position.set(0,1.2,.26);
 const camera=new THREE.PerspectiveCamera(65,390/844,.05,100);camera.position.set(0,1.5,1.12);camera.lookAt(0,1.28,-.55);camera.updateMatrixWorld(true);
 let transferred=0,complete=0,started=0;const world={scene,camera,canvas:{clientWidth:390,clientHeight:844},touristHand:hand,heldSocket:socket,conePivot:cone,paddleGroup:pole,
  prepareEmptyConeOffer(){vendor.add(cone);cone.position.set(0,0,0);},setPlayerConeGrip(){},
  getConeOfferTarget(out){return cone.getWorldPosition(out);},getPlayerConeGripTarget(p,out){return out.copy(p).add(new THREE.Vector3(0,-.08,0));},
  updateEmptyConeOffer(){},handoffCone(owner){assert.equal(owner,'player');scene.updateMatrixWorld(true);socket.attach(cone);transferred++;},
 };
 const intro=new ConeIntroduction(world,{onTake:()=>started++,onComplete:()=>complete++});intro.reset();
 const input={isPointerDown:false,isMouseHover:false,pointerEpoch:0,cancelEpoch:0,normX:0,normY:0,intentWorldPos:new THREE.Vector3(0,1.2,.26)};
 function tick(n=1,blocked=false){for(let i=0;i<n;i++){intro.handTarget(hand.position,input);intro.update(1/60,i/60,input,blocked);}}
 return {intro,world,input,tick,vendor,pole,cone,get transfers(){return transferred},get complete(){return complete},get started(){return started}};
}
test('idle counter offers same empty cone by hand and never starts by itself',()=>{
 const f=fixture();f.tick(600);assert.equal(f.intro.ready,true);assert.equal(f.cone.parent,f.vendor);assert.equal(f.pole.children.length,0);assert.equal(f.complete,0);
});
test('offered cone pulses before any contact and the camera callback occurs only at physical transfer',()=>{
 const f=fixture(),glow=[];let transferred=0;
 f.world.setConeOfferGlow=value=>glow.push(value);f.intro.onTransfer=()=>transferred++;
 f.tick(30);assert.ok(glow.some(value=>value>.3));assert.equal(f.started,0);assert.equal(transferred,0);
 f.intro.beginTake(f.input);f.tick(10);assert.equal(transferred,0);
 f.tick(12);assert.equal(transferred,1);assert.equal(f.cone.parent,f.world.heldSocket);
});
test('touching the visible offered cone starts one contact-before-transfer handoff',()=>{
 const f=fixture();f.tick(45);const point=f.cone.getWorldPosition(new THREE.Vector3()).project(f.world.camera);
 Object.assign(f.input,{normX:point.x,normY:point.y,isPointerDown:true,pointerEpoch:1});f.tick(6);assert.equal(f.intro.phase,'take');assert.equal(f.started,1);assert.equal(f.transfers,0);
 f.tick(8);assert.equal(f.cone.parent,f.vendor);f.tick(10);assert.equal(f.cone.parent,f.world.heldSocket);assert.equal(f.transfers,1);
 f.tick(60);assert.equal(f.complete,1);assert.equal(f.transfers,1);assert.equal(f.world.conePivot,f.cone);
});
test('options and exploration pause the physical start without scoring or handoff',()=>{
 const f=fixture();f.input.isPointerDown=true;f.input.pointerEpoch=1;f.tick(120,true);assert.equal(f.transfers,0);assert.equal(f.complete,0);
 f.intro.pause();f.tick(120);assert.equal(f.transfers,0);f.intro.reset();assert.equal(f.cone.parent,f.vendor);
});


test('the visible wafer body is selectable even when its pivot lies above the touch',()=>{
 const f=fixture();f.world.mainConeMesh=new THREE.Group();f.world.mainConeMesh.position.y=-.10;f.cone.add(f.world.mainConeMesh);
 f.tick(45);const point=f.world.mainConeMesh.getWorldPosition(new THREE.Vector3()).project(f.world.camera);
 Object.assign(f.input,{normX:point.x,normY:point.y,isPointerDown:true,pointerEpoch:1});f.tick(6);
 assert.equal(f.intro.phase,'take');assert.equal(f.started,1);
});

test('active withdrawal converts fingertip intent while initial approach still targets actual cone contact',()=>{
 const f=fixture(),offset=new THREE.Vector3(-.12,-.02,-.05);
 f.world.getPlayerTipRootTarget=(tip,out)=>out.copy(tip).sub(offset);
 f.input.isPointerDown=true;f.input.intentWorldPos.set(.14,1.28,.26);f.intro.beginTake(f.input);
 f.intro.age=.125;const target=new THREE.Vector3();f.intro.handTarget(target,f.input);
 assert.ok(target.distanceTo(f.intro.start.clone().lerp(f.intro.contact,.5))<1e-9,'approach remains on the physical receiving grip path');
 f.intro.age=.78;f.intro.handTarget(target,f.input);
 assert.ok(target.distanceTo(f.input.intentWorldPos.clone().sub(offset))<1e-9);
 assert.equal(f.transfers,0,'target conversion alone never changes ownership');
});

test('release during take preserves the latest converted withdrawal root instead of stale raw input',()=>{
 const f=fixture(),offset=new THREE.Vector3(-.12,-.02,-.05),target=new THREE.Vector3();
 f.world.getPlayerTipRootTarget=(tip,out)=>out.copy(tip).sub(offset);
 f.input.isPointerDown=true;f.intro.beginTake(f.input);
 f.input.intentWorldPos.set(.2,1.3,.3);f.intro.age=.2;f.intro.handTarget(target,f.input);
 const last=f.intro.withdraw.clone();f.input.isPointerDown=false;f.input.intentWorldPos.set(9,9,9);
 f.intro.age=.78;f.intro.handTarget(target,f.input);assert.ok(target.distanceTo(last)<1e-9);
 const menu=fixture();menu.intro.beginTake();menu.intro.age=.78;menu.intro.handTarget(target,{});
 assert.ok(target.distanceTo(new THREE.Vector3(.04,1.2,.26))<1e-9,'keyboard/menu carry destination is unchanged');
});
