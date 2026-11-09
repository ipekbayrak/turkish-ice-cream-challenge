import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {makeVendorFlourishFixture} from './vendor-flourish-fixture.js';
import {EncounterCamera} from '../src/encounter-camera.js';
import {ICE_CREAM_FLAVORS} from '../src/flavors.js';
import {axialReachX} from '../src/reach-offer.js';
import {RoutinePreviewDriver} from './routines-driver.js';

const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
function fixture(width,height,count){
 const f=makeVendorFlourishFixture(1,count),{w,d,input}=f;
 globalThis.window={innerWidth:width,innerHeight:height};
 w.canvas={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>({width,height})};
 w.tubPositions=ICE_CREAM_FLAVORS.map(t=>({x:t.xOffset,worldPos:V(t.xOffset,.98,-.3)}));
 new EncounterCamera(w).setPhase('play',true);
 w.setServingScale(count>4?1.18:1);w.updateServingLayout(1);
 Object.assign(w.stretchyStrand,{attach(){},update(){}});
 d.isAfkShowActive=false;d.idleSeconds=0;d.routine=['SHAFT_SPIN_360','FINAL_PISTACHIO_CATCH'];d._enterRoutineStep(0);
 input.isMoving=input.isPointerDown=true;input.intentWorldPos.set(-3,-3,3);
 return f;
}

test('both axial reach sweeps keep cone, every scoop and steel contact inside the close mobile frame',()=>{
 for(const [width,height] of [[390,844],[320,568],[1280,720]])for(const count of [1,4,8]){
  const {w,d,input}=fixture(width,height,count),hearts=d.hearts,score=d.score;
  let checked=0;
  for(let frame=0;frame<360;frame++){
   if(frame===180)d.subStep=1;
   d.update(1/60,frame/60,input);w.updateEnvironmentAnimations(frame/60,1/60);w.scene.updateMatrixWorld(true);
   if(d.trickTransition||d.pendingTrickEntry)continue;
   checked++;
   for(const mesh of [w.mainConeMesh,...w.scoopMeshes]){
    if(!mesh.visible)continue;
    if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
    const b=mesh.geometry.boundingBox;
    for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){
     const point=V(x,y,z).applyMatrix4(mesh.matrixWorld).project(w.camera);
     assert.ok(Math.abs(point.x)<.94&&Math.abs(point.y)<.94,`${width}×${height}, ${count} scoops, phase ${d.subStep}: ${point.toArray()}`);
    }
   }
   const blade=w.paddleContact.bladePoint(w).project(w.camera);
   assert.ok(Math.abs(blade.x)<.94&&Math.abs(blade.y)<.94);
   assert.equal(w.conePivot.parent,w.paddleGroup);
  }
  assert.ok(checked>250);assert.equal(d.score,score);assert.equal(d.hearts,hearts);
  assert.equal(d.currentMechanic,'SHAFT_SPIN_360','no free completion');
 }
});

test('wide screens retain the original authored path and narrowed paths retain the sinusoidal rhythm',()=>{
 for(const [width,height] of [[1280,720],[390,844]]){
  const {w}=fixture(width,height,2);
  for(const phase of [0,1]){
   const extent=phase===0?.22:.40,ratio=axialReachX(w,-extent,phase)/-extent;
   if(width===1280)assert.equal(ratio,1);
   else assert.ok(ratio>0&&ratio<1);
   for(let t=0;t<6;t+=.05){const x=phase===0?Math.sin(t*3.5)*.22:-.26+Math.cos(t*4)*.14;assert.ok(Math.abs(axialReachX(w,x,phase)-x*ratio)<1e-12);}
  }
 }
});

test('touch intent still catches both phases and awards the original score once',()=>{
 const {w,d}=fixture(390,844,2),driver=new RoutinePreviewDriver(d,w),initial=d.score;
 driver.setTouchMode(true);
 for(let frame=0;frame<900&&d.currentMechanic==='SHAFT_SPIN_360';frame++){
  const input=driver.update(1/60);
  if(d.isGraspingPaddleCone)input.handWorldPos.lerp(d.coneWorldPos.clone().add(V(0,-.03,.04)),.3);
  else input.handWorldPos.copy(input.intentWorldPos);
  d.update(1/60,frame/60,input);w.updateEnvironmentAnimations(frame/60,1/60);
 }
 assert.equal(d.currentMechanic,'FINAL_PISTACHIO_CATCH');
 assert.equal(d.score-initial,420);assert.equal(d.isGraspingPaddleCone,false);
});
