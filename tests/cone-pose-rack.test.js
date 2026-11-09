import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GameWorld } from '../src/world.js';
import { SpringVec3 } from '../src/physics.js';
import { StallEffects } from '../src/stall-effects.js';
import { buildConeRack } from '../src/cone-rack.js';
import { poleGripRenderTarget } from '../src/cone-grip.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function worldFixture(){
 const w=Object.create(GameWorld.prototype);w.scene=new THREE.Scene();w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();
 w.handSpring=new SpringVec3(.22,1.08,.62,135,18);w.leftPropSpring=new SpringVec3(.24,1.22,-.25,88,16);w.coneSpring=new SpringVec3(0,1.24,.22,72,15);
 w._buildPaddleAndCones();w._buildVendor();w._buildTouristPOVHand();w.stallEffects=new StallEffects(w);w.stretchyStrand={active:false,detach(){this.active=false;}};
 return w;
}
const worldUp=o=>V(0,1,0).applyQuaternion(o.getWorldQuaternion(new THREE.Quaternion()));

test('recessed hopper has eight independent wells of seven hollow nested cones without per-cone drawcalls',()=>{
 const rack=buildConeRack(new THREE.Texture());assert.equal(rack.userData.wellCount,8);assert.equal(rack.userData.totalCones,56);
 const shells=rack.getObjectByName('nested-wafer-shells'),rims=rack.getObjectByName('individual-wafer-rims'),lining=rack.getObjectByName('hollow-wafer-linings');
 assert.ok(shells.isInstancedMesh&&rims.isInstancedMesh&&lining.isInstancedMesh);assert.equal(shells.count,56);assert.equal(rims.count,56);
 assert.equal(shells.geometry.parameters.openEnded,true);assert.equal(lining.material.side,THREE.BackSide);
 const first=new THREE.Matrix4(),next=new THREE.Matrix4();shells.getMatrixAt(0,first);shells.getMatrixAt(1,next);
 const p=V().setFromMatrixPosition(first),q=V().setFromMatrixPosition(next);
 assert.ok(q.y-p.y>0&&q.y-p.y<shells.geometry.parameters.height*.15,'rims overlap deeply in a nested stack');
 assert.equal(new Set(rack.userData.wellCenters.map(v=>`${v.x}:${v.z}`)).size,8);
 let drawcalls=0;rack.traverse(n=>{if(n.isMesh)drawcalls++;});assert.ok(drawcalls<30);
});

test('customer holds the actual cone upright in a side grip with vertical palm and connected wrist',()=>{
 const w=worldFixture(),cone=w.conePivot;w.handoffCone('player');
 for(let i=0;i<80;i++){w.updateTouristHand(V(.1,1.26,.26),1,0,1/60,true);w.stallEffects.update(1/60);}
 const normal=V(0,0,1).applyQuaternion(w.palmGroup.getWorldQuaternion(new THREE.Quaternion()));
 assert.ok(Math.abs(normal.y)<.005,'palm must remain perpendicular to the counter');
 assert.ok(worldUp(cone).distanceTo(V(0,1,0))<.001,'cone is upright, not aligned with a forward fist');
 const fingerAxis=V(0,1,0).applyQuaternion(w.fingers[0].base.getWorldQuaternion(new THREE.Quaternion()));
 assert.ok(Math.abs(fingerAxis.y)<.08,'finger rows wrap horizontally around the cone');
 assert.ok(w.palmGroup.getWorldPosition(V()).distanceTo(w.touristWrist.getWorldPosition(V()))<1e-10);
 assert.equal(w.conePivot,cone);assert.equal(cone.parent,w.heldSocket);
});

test('the grip root target aligns the same cone pivot with an actual handoff point',()=>{
 const w=worldFixture(),contact=V(.03,1.30,-.09);w.setPlayerConeGrip(true);w.handoffCone('player');
 const target=w.getPlayerConeGripTarget(contact);
 for(let i=0;i<80;i++){w.updateTouristHand(target,1,0,1/60,true);w.stallEffects.update(1/60);}
 assert.ok(w.heldSocket.getWorldPosition(V()).add(V(0,.05,0)).distanceTo(contact)<.0001);
 assert.ok(w.conePivot.getWorldPosition(V()).distanceTo(contact)<.0011,'existing transfer animation settles within one millimetre');
});

test('vendor offers the actual empty cone by hand with bare pole, and receiving never takes it back',()=>{
 const w=worldFixture(),original=w.conePivot;w.prepareEmptyConeOffer();
 for(let i=0;i<60;i++){w.updateEmptyConeOffer(i/60,1/60,{reach:1});w.stallEffects.update(1/60);}
 assert.equal(original.parent,w.lArmRig.handGroup);assert.equal(w.scoopMeshes.filter(mesh=>mesh.visible).length,0);assert.equal(w.carryScoop.visible,false);
 assert.ok(worldUp(original).distanceTo(V(0,1,0))<.001);
 assert.ok(w.getConeOfferTarget().distanceTo(original.getWorldPosition(V()))<1e-10);
 assert.ok(w.rArmRig.handGroup.getWorldPosition(V()).distanceTo(w.paddleRearGripAnchor.getWorldPosition(V()))<1e-8);
 w.handoffCone('player');
 for(let i=0;i<45;i++){w.updateEmptyConeOffer(1+i/60,1/60,{reach:1,receiving:true});w.stallEffects.update(1/60);}
 assert.equal(original.parent,w.heldSocket);assert.equal(w.conePivot,original);assert.equal(w.paddleGroup.children.includes(original),false);
});

test('a hand-held inversion rotates vendor wrist and cone together while pole grip stays connected',()=>{
 const w=worldFixture();w.prepareEmptyConeOffer();
 for(const tilt of [0,Math.PI*.45,Math.PI*.94,0]){
  w.coneHandTiltZ=tilt;
  for(let i=0;i<40;i++){w.updateEmptyConeOffer(i/60,1/60,{reach:1});w.stallEffects.update(1/60);}
  const expected=V(-Math.sin(tilt),Math.cos(tilt),0);
  assert.ok(worldUp(w.conePivot).distanceTo(expected)<.002);
  assert.ok(w.rArmRig.handGroup.getWorldPosition(V()).distanceTo(w.paddleRearGripAnchor.getWorldPosition(V()))<1e-8);
 }
});


test('pole grip render calibration aligns the side grip without changing logical motion or cone ownership',()=>{
 const w=worldFixture();w.paddleGroup.position.set(.12,1.3,.20);w.scene.updateMatrixWorld(true);
 const logical=w.paddleGroup.position.clone().add(V(0,-.03,.04)),before=logical.clone();
 const conePosition=w.conePivot.getWorldPosition(V());w.setPlayerConeGrip(true);
 const rendered=poleGripRenderTarget(w,logical,w.paddleGroup.position);
 for(let i=0;i<80;i++)w.updateTouristHand(rendered,1,0,1/60,true);
 assert.ok(w.heldSocket.getWorldPosition(V()).add(V(0,.05,0)).distanceTo(conePosition)<.001);
 assert.ok(logical.equals(before));assert.equal(w.conePivot.parent,w.paddleGroup);
});
