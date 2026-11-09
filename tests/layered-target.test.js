import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import { GameWorld } from '../src/world.js';import { StallEffects } from '../src/stall-effects.js';import { GestureValidation } from '../src/gesture-validation.js';import { TouchReach } from '../src/touch-reach.js';import { layeredEmptyOfferTarget, reachLayeredEmpty } from '../src/serving-sequence.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function fixture(width,height){
 const w=Object.create(GameWorld.prototype);w.scene=new THREE.Scene();
 for(const n of ['paddleGroup','conePivot','outerConeGroup','scoopStackGroup','giantBlockGroup'])w[n]=new THREE.Group();
 w.scene.add(w.paddleGroup,w.giantBlockGroup);w.paddleGroup.position.set(.23,1.36,-.1);w.paddleGroup.lookAt(V(.5,1.39,.5));w.paddleGroup.add(w.conePivot);w.conePivot.add(w.outerConeGroup,w.scoopStackGroup);
 w.vendorSkinMat=w.vendorShirtMat=new THREE.MeshBasicMaterial();w.lArmRig=w._createIKLimbRig();
 // Real finite-reach arm solver, exactly the service pose requested by phase5.
 w._solveArmIK(w.lArmRig,V(.25,1.67,-.68),V(-.12,1.17,.20),V(.35,-.5,-.2));
 const wafer=new THREE.Mesh(new THREE.ConeGeometry(.064,.195,20,1,true));wafer.rotation.x=Math.PI;wafer.position.y=-.06;w.outerConeGroup.add(wafer);w.outerConeGroup.scale.setScalar(1.18);
 w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();w._buildTouristPOVHand();
 const aspect=width/height;w.camera=new THREE.PerspectiveCamera(aspect<.75?THREE.MathUtils.clamp(62+(.65-aspect)*28,64,72):54,aspect,.05,40);w.camera.position.set(0,aspect<.75?1.5:1.52,aspect<.75?1.12:1.05);w.camera.lookAt(0,1.28,-.55);w.camera.updateMatrixWorld(true);
 w.canvas={clientWidth:width,clientHeight:height};w.projectToScreen=p=>{const v=p.clone().project(w.camera);return{x:(v.x+1)*width/2,y:(1-v.y)*height/2};};
 w.stallEffects=new StallEffects(w);w.handoffOuterCone('vendor',true);w.setServingNapkin({owner:'vendor-hand',peel:1,offset:V(-.11,.025,-.025)});for(let i=0;i<90;i++)w.stallEffects.update(1/60);w.scene.updateMatrixWorld(true);
 const reach=new TouchReach(w);reach.begin(w.camera,width,height);return{w,reach,width,height};
}
function bounds(w,object){const r={minX:Infinity,maxX:-Infinity};object.traverse(mesh=>{if(!mesh.isMesh)return;const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=w.projectToScreen(V().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld));r.minX=Math.min(r.minX,p.x);r.maxX=Math.max(r.maxX,p.x);}});return r;}
function inputAt(f){const t=layeredEmptyOfferTarget(f.w),c=f.reach.camera;const ray=V(t.screen.x/f.width*2-1,1-t.screen.y/f.height*2,.5).unproject(c).sub(c.position).normalize();const desired=c.position.clone().addScaledVector(ray,(.26-c.position.z)/ray.z);const x=t.screen.x,y=f.reach.contactAt(desired).y;const intent=f.reach.update(x,y).clone();return{isPointerDown:true,pointerEpoch:1,cancelEpoch:0,normX:x/f.width*2-1,normY:1-y/f.height*2,aimNormX:f.reach.aimX,aimNormY:f.reach.aimY,intentWorldPos:intent};}

test('finite-arm empty offer is selected at its rendered position, with original75ms deliberate dwell',()=>{
 for(const [width,height]of[[390,844],[1280,720]]){
  const f=fixture(width,height),input=inputAt(f),g=new GestureValidation(),d={world:f.w,gestureValidation:g};
  assert.ok(f.w.lArmRig.handGroup.position.z<0,'real vendor wrist remains behind the player interaction plane');
  assert.ok(input.intentWorldPos.distanceTo(layeredEmptyOfferTarget(f.w).position)>.28,'old world-distance pick would miss this visible offer');
  for(let i=0;i<4;i++){g.update(input,1/60,'empty-offer');assert.equal(reachLayeredEmpty(d,1/60,input,input.intentWorldPos),false);}
  g.update(input,1/60,'empty-offer');assert.equal(reachLayeredEmpty(d,1/60,input,input.intentWorldPos),true);
 }
});
test('retained paper is visibly aside the bare wafer on phone and desktop',()=>{
 for(const size of[[390,844],[1280,720]]){const {w}=fixture(...size);const paper=bounds(w,w.servingNapkin),wafer=bounds(w,w.outerConeGroup);assert.ok(paper.maxX+2<wafer.minX,`paper overlaps wafer: ${JSON.stringify({paper,wafer})}`);assert.equal(w.servingNapkin.parent,w.lArmRig.handGroup);assert.equal(w.outerConeGroup.parent,w.lArmRig.handGroup);}
});
test('preheld or canceled contact cannot collect the reoffered empty cone',()=>{
 const f=fixture(390,844),input=inputAt(f),g=new GestureValidation(),d={world:f.w,gestureValidation:g};g.update(input,1/60,'paper-return');
 for(let i=0;i<60;i++){g.update(input,1/60,'empty-offer');assert.equal(reachLayeredEmpty(d,1/60,input,input.intentWorldPos),false);}
 input.pointerEpoch++;for(let i=0;i<3;i++){g.update(input,1/60,'empty-offer');reachLayeredEmpty(d,1/60,input,input.intentWorldPos);}input.isPointerDown=false;input.cancelEpoch++;g.update(input,1/60,'empty-offer');assert.equal(reachLayeredEmpty(d,1/60,input,input.intentWorldPos),false);
});
