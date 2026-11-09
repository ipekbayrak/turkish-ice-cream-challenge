import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getShellTargets, classifyShellPick } from '../src/shell-targeting.js';
import { GestureValidation } from '../src/gesture-validation.js';
import { SpringVec3 } from '../src/physics.js';

function scene(width,height,side=1,scale=1.1){
 const world={canvas:{clientWidth:width,clientHeight:height},conePivot:new THREE.Group(),napkinConeProp:new THREE.Group()};
 const camera=new THREE.PerspectiveCamera(width/height<.75?THREE.MathUtils.clamp(62+(.65-width/height)*28,64,72):54,width/height,.05,40);
 camera.position.set(0,1.52,1.05);camera.lookAt(0,1.28,-.55);
 if(width/height<.75)camera.position.set(0,1.5,1.12);camera.updateMatrixWorld(true);
 const pole=new THREE.Group(),hand=new THREE.Group();pole.add(world.conePivot);hand.add(world.napkinConeProp);
 pole.position.set(-.28*side,1.24,.24);world.conePivot.position.y=.02;world.conePivot.scale.setScalar(scale);
 // Actual left-hand/decoy depth after finite arm reach, not the unreachable +.24 target.
 hand.position.set(.20*side,1.28,-.14);world.napkinConeProp.position.set(0,.08,.03);
 world.projectToScreen=(point)=>{const p=point.clone().project(camera);return{x:(p.x*.5+.5)*width,y:(.5-p.y*.5)*height};};
 return {world,pole,hand,camera};
}
const pointerAt=(screen,viewport)=>({normX:screen.x/viewport.width*2-1,normY:1-screen.y/viewport.height*2,isPointerDown:true,pointerEpoch:1,cancelEpoch:0,intentWorldPos:new THREE.Vector3(0,1.22,.27)});
function judgment(g,input,targets,scope='choice'){
 g.update(input,1/60,scope);const pick=classifyShellPick(input.normX,input.normY,targets);
 return {real:g.reach('real',pick.candidate==='real'?pick.realDistance:Infinity,pick.radius,1/60),fake:g.reach('fake',pick.candidate==='fake'?pick.fakeDistance:Infinity,pick.radius,1/60),candidate:pick.candidate};
}

test('phone and desktop pick visible cones at their rendered positions, including edge-straddling servings',()=>{
 for(const [width,height]of[[390,844],[1280,720]])for(const side of[-1,1])for(const scale of[1.1,1.18]){
  const {world}=scene(width,height,side,scale),targets=getShellTargets(world);
  assert.equal(targets.real.visible,true);assert.equal(targets.fake.visible,true);
  assert.ok(targets.real.screen.x>=8&&targets.real.screen.x<=width-8);
  for(const name of['real','fake']){const p=pointerAt(targets[name].screen,targets.viewport);assert.equal(classifyShellPick(p.normX,p.normY,targets).candidate,name);}
  assert.equal(classifyShellPick(0,0,targets).candidate,null);
 }
});

test('a fresh real grab waits for unchanged75ms dwell and cannot fall through into the fake choice',()=>{
 for(const [width,height]of[[390,844],[1280,720]]){
  const {world,pole,hand}=scene(width,height);pole.position.set(.18,1.24,.24);hand.position.x=-.17;
  const targets=getShellTargets(world),input=pointerAt(targets.real.screen,targets.viewport),g=new GestureValidation();
  for(let frame=0;frame<4;frame++){const result=judgment(g,input,targets);assert.equal(result.real,false);assert.equal(result.fake,false);}
  const ready=judgment(g,input,targets);assert.equal(ready.real,true);assert.equal(ready.fake,false);
 }
});

test('a genuine fresh grab of the visible decoy still validates as the penalized choice',()=>{
 for(const [width,height]of[[390,844],[1280,720]]){
  const {world}=scene(width,height),targets=getShellTargets(world),input=pointerAt(targets.fake.screen,targets.viewport),g=new GestureValidation();
  let ready;for(let frame=0;frame<6;frame++)ready=judgment(g,input,targets);
  assert.equal(ready.fake,true);assert.equal(ready.real,false);
 }
});

test('overlapping visual targets have an ambiguity gap rather than a penalty fall-through',()=>{
 const targets={viewport:{width:390,height:844},radius:39,real:{visible:true,screen:{x:190,y:450}},fake:{visible:true,screen:{x:197,y:450}}};
 const input=pointerAt({x:193,y:450},targets.viewport);
 assert.equal(classifyShellPick(input.normX,input.normY,targets).candidate,null);
});

test('a stationary contact made before reveal cannot catch the spring-driven cone crossing after1.2s',()=>{
 for(const [width,height]of[[390,844],[1280,720]]){
  const {world,pole}=scene(width,height);const crossing=world.projectToScreen(new THREE.Vector3(0,1.26,.24));
  const input=pointerAt(crossing,{width,height}),g=new GestureValidation(),spring=new SpringVec3(0,1.24,.22,72,15);
  let validated=false;
  for(let frame=0;frame<180;frame++){
   const t=frame/60;
   if(t<1.2){const a=t/1.2*Math.PI*2;spring.target.set(Math.cos(a)*.28,1.24+Math.sin(a*2)*.08,.18+Math.sin(a)*.09);}
   else spring.target.set(-.28,1.24,.24);
   pole.position.copy(spring.step(1/60));
   // The original director uses this same shuffle->choice opportunity boundary.
   const result=judgment(g,input,getShellTargets(world),t<1.2?'shuffle':'choice');
   if(t>=1.2)validated ||= result.real||result.fake;
  }
  assert.equal(validated,false);
 }
});

test('old contact, tiny jitter and canceled touches do not validate a new visible-prop choice',()=>{
 const {world}=scene(390,844),targets=getShellTargets(world),input=pointerAt(targets.real.screen,targets.viewport),g=new GestureValidation();
 g.update(input,1/60,'shuffle');
 for(let frame=0;frame<60;frame++){input.normX+=frame%2?.001:-.001;const result=judgment(g,input,targets,'choice');assert.equal(result.real,false);assert.equal(result.fake,false);}
 input.pointerEpoch++;let ready;for(let frame=0;frame<6;frame++)ready=judgment(g,input,targets,'choice');assert.equal(ready.real,true);
 input.isPointerDown=false;input.cancelEpoch++;const canceled=judgment(g,input,targets,'choice');assert.equal(canceled.real,false);assert.equal(canceled.fake,false);
});
