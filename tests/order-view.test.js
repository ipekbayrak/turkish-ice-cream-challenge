import {ICE_CREAM_FLAVORS} from '../src/flavors.js';
import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {TubOrderView,orderAcknowledgement,orderTubPulse} from '../src/order-view.js';
import {TouchReach} from '../src/touch-reach.js';
import {GameWorld} from '../src/world.js';
import {SpringVec3} from '../src/physics.js';

function fixture(width,height) {
 const aspect=width/height,scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(aspect<.75?Math.max(64,Math.min(72,62+(.65-aspect)*28)):54,aspect,.05,100);
 const baseCamPos=new THREE.Vector3(0,aspect<.75?1.5:1.52,aspect<.75?1.12:1.05);camera.position.copy(baseCamPos);camera.lookAt(0,1.28,-.55);camera.updateMatrixWorld(true);
 const basin=new THREE.Group();basin.position.set(0,.94,-.34);basin.rotation.x=.22;scene.add(basin);
 const world={scene,camera,baseCamPos,tubMeshes:[],tubIceGroups:[]};
 for(const [index,x] of ICE_CREAM_FLAVORS.map(f=>f.xOffset).entries()){
  const group=new THREE.Group();group.position.set(x,.018,.01);basin.add(group);
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(.089,22,14,0,Math.PI*2,0,Math.PI*.62),new THREE.MeshStandardMaterial({color:0xffffff}));mesh.position.y=.01;mesh.scale.set(1,.72,1);mesh.userData.flavorIndex=index;group.add(mesh);world.tubMeshes.push(mesh);world.tubIceGroups.push({group});
 }
 scene.updateMatrixWorld(true);const view=new TubOrderView(world);return{world,view,width,height};
}
function screen(f,point){const p=point.clone().project(f.world.camera);return{x:(p.x+1)*.5,y:(1-p.y)*.5};}

test('all four real tub surfaces are visible and ray-selectable on phones and desktop',()=>{
 for(const [width,height] of [[320,568],[390,844],[844,390],[1280,720]]){
  const f=fixture(width,height);f.view.begin();f.view.settleCamera();
  for(const [index,mesh] of f.world.tubMeshes.entries()){
   const point=mesh.getWorldPosition(new THREE.Vector3()),p=screen(f,point);
   assert.ok(p.x*width>12&&p.x*width<width-12);assert.ok(p.y*height>0&&p.y*height<height-25);
   assert.equal(f.view.pick(p.x,p.y),index,`${width}x${height} tub${index}`);
  }
  assert.equal(f.view.pick(.5,.05),null,'the face/air is not a flavor option');
 }
});
test('tub hints preserve ice colors and exit restores exact material/camera state',()=>{
 const f=fixture(390,844),mat=f.world.tubMeshes[2].material,position=f.world.camera.position.clone(),rotation=f.world.camera.quaternion.clone();
 f.view.begin();f.view.settleCamera();assert.ok(f.world.camera.position.z>position.z);
 f.view.update({hover:2,dwell:.5},.016);assert.ok(mat.emissiveIntensity>0);assert.equal(mat.emissive.getHex(),0);
 f.view.end();assert.equal(mat.emissive.getHex(),0);assert.equal(mat.emissiveIntensity,1);assert.ok(f.world.camera.position.equals(position));assert.ok(f.world.camera.quaternion.equals(rotation));
});
test('a touch held through the intro can be rebased to actual tubs without a new contact',()=>{
 const f=fixture(390,844),w=Object.assign(Object.create(GameWorld.prototype),f.world);
 w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();w.conePivot=new THREE.Group();w.handSpring=new SpringVec3(.22,1.08,.62,135,18);w._buildTouristPOVHand();
 const reach=new TouchReach(w);reach.begin(w.camera,f.width,f.height);reach.update(195,620);
 f.view.begin();f.view.settleCamera();reach.begin(w.camera,f.width,f.height);
 const mesh=w.tubMeshes[2],p=screen(f,mesh.getWorldPosition(new THREE.Vector3()));
 const aim=new THREE.Vector3(p.x*2-1,1-p.y*2,.5).unproject(reach.camera),ray=aim.sub(reach.camera.position).normalize();
 const palm=reach.camera.position.clone().addScaledVector(ray,(.26-reach.camera.position.z)/ray.z);
 const rawY=reach.contactAt(palm).y;reach.update(p.x*f.width,rawY);
 assert.equal(f.view.pick((reach.aimX+1)*.5,(1-reach.aimY)*.5),2);
});
test('each Turkish acknowledgement names the chosen flavor, without a number menu',()=>{
 assert.equal(orderAcknowledgement({value:0,count:1},'tr'),'Bir sade.');assert.equal(orderAcknowledgement({value:2,count:2},'tr'),'Bir kakaolu. 2 top oldu.');
});
test('all four flavors have visible labels anchored to the actual ray-selectable tubs',()=>{
 for(const [width,height]of [[320,568],[390,844],[844,390],[1280,720]]){
  const f=fixture(width,height);f.view.begin();f.view.settleCamera();
  for(const index of [0,1,2,3]){const p=f.view.projectedTub(index,width,height);assert.ok(p.x-p.radius>0);assert.ok(p.x+p.radius<width);assert.equal(f.view.pick(p.x/width,p.y/height),index);}
 }
});

test('interaction light visits each tub separately, including plain, and stops after a choice',()=>{
 for(let i=0;i<4;i++){const p=orderTubPulse((i+.5)*.70);assert.equal(p.index,i);assert.ok(p.strength>.99);}
 assert.equal(orderTubPulse(2.8+.35).index,0);assert.equal(orderTubPulse(.35,1).index,-1);
});
