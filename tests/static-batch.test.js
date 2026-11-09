import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {batchStaticMeshes,batchIceCreamCart} from '../src/static-batch.js';
import {shopBodyFixture} from './shop-body-fixture.js';
import {TubOrderView} from '../src/order-view.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function stream(mesh,relativeTo=new THREE.Matrix4()){
 mesh.updateWorldMatrix(true,false);const matrix=new THREE.Matrix4().multiplyMatrices(relativeTo,mesh.matrixWorld),normal=new THREE.Matrix3().getNormalMatrix(matrix),g=mesh.geometry,rows=[];
 for(let i=0;i<(g.index?.count||g.attributes.position.count);i++){
  const n=g.index?g.index.getX(i):i,p=V().fromBufferAttribute(g.attributes.position,n).applyMatrix4(matrix),q=V().fromBufferAttribute(g.attributes.normal,n).applyMatrix3(normal).normalize();
  rows.push(...p.toArray(),...q.toArray(),g.attributes.uv.getX(n),g.attributes.uv.getY(n));
 }return rows;
}
function surfaces(root){
 root.updateWorldMatrix(true,true);const groups=new Map();
 root.traverse(o=>{if(!o.isMesh)return;const key=[o.material.uuid,o.castShadow,o.receiveShadow,o.renderOrder,o.layers.mask].join('|'),row=groups.get(key)||{vertices:0,sum:Array(8).fill(0),square:Array(8).fill(0)};
  for(const[i,value]of stream(o).entries()){row.sum[i%8]+=value;row.square[i%8]+=value*value;if(i%8===0)row.vertices++;}groups.set(key,row);
 });return groups;
}

test('static batch retains transformed triangle positions, normals, UVs, material and shadow flags',()=>{
 const root=new THREE.Group();root.position.set(.8,-.2,.7);root.rotation.y=.3;const material=new THREE.MeshStandardMaterial({color:0xcd9278});
 for(let i=0;i<3;i++){const mesh=new THREE.Mesh(i===1?new THREE.SphereGeometry(.2,8,6):new THREE.BoxGeometry(.2,.3,.4),material);mesh.position.set(i*.4,i*.1,-i*.2);mesh.rotation.set(i*.3,-i*.2,i*.1);mesh.scale.set(.8+i*.1,1.2,.9);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
 root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),before=root.children.flatMap(m=>stream(m,inverse));
 const result=batchStaticMeshes(root),batch=root.children[0],after=stream(batch,inverse);assert.equal(result.saved,2);assert.equal(after.length,before.length);assert.equal(batch.material,material);assert.ok(batch.castShadow&&batch.receiveShadow);
 for(let i=0;i<before.length;i++)assert.ok(Math.abs(before[i]-after[i])<2e-6,`attribute${i}: ${before[i]} vs${after[i]}`);
});

test('transparent, animated, negative-scale and instanced pieces retain identity and shared geometry is never disposed',()=>{
 const root=new THREE.Group(),geo=new THREE.BoxGeometry(1,1,1),mat=new THREE.MeshStandardMaterial(),special=new THREE.Group();root.add(special);
 let disposed=0;geo.addEventListener('dispose',()=>disposed++);
 for(let i=0;i<3;i++){const m=new THREE.Mesh(geo,mat);m.position.x=i;root.add(m);}
 const glass=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({transparent:true,opacity:.5}));root.add(glass);
 const mirrored=new THREE.Mesh(geo,mat);mirrored.scale.x=-1;root.add(mirrored);
 const instance=new THREE.InstancedMesh(geo,mat,7);root.add(instance);
 const animated=new THREE.Mesh(geo,mat);special.add(animated);const result=batchStaticMeshes(root,{exclude:[special]});
 assert.equal(result.saved,2);assert.equal(glass.parent,root);assert.equal(mirrored.parent,root);assert.equal(instance.parent,root);assert.equal(instance.count,7);assert.equal(animated.parent,special);assert.equal(disposed,0);assert.equal(glass.geometry,geo);
});

test('a mesh carrying an anchor remains the same parent after batching nearby static pieces',()=>{
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial(),geometry=new THREE.BoxGeometry(1,1,1),parent=new THREE.Mesh(geometry,material),anchor=new THREE.Object3D();
 parent.position.set(.3,.5,-.2);anchor.position.set(.1,.2,.3);parent.add(anchor);root.add(parent);for(let i=0;i<2;i++)root.add(new THREE.Mesh(geometry,material));
 const before=anchor.getWorldPosition(V());assert.equal(batchStaticMeshes(root).saved,1);assert.equal(parent.parent,root);assert.equal(anchor.parent,parent);assert.ok(anchor.getWorldPosition(V()).distanceTo(before)<1e-10);
});

test('cart batching preserves every visible surface and moving bell frame, contact anchors and four ray-selectable tubs',()=>{
 const w=shopBodyFixture(390,844,{batchGeometry:false}),iceRefs=[...w.tubMeshes],pivots=w.bells.map(b=>b.pivot),shimmers=w.bells.map(b=>b.shimmerRing),coneInstances=w.coneRack.children.filter(o=>o.isInstancedMesh);
 const beforeByAngle=new Map();for(const angle of[0,.2,-.4]){for(const b of w.bells){b.pivot.rotation.z=angle;b.clapperPivot.rotation.z=angle*.5;}beforeByAngle.set(angle,surfaces(w.cartGroup));}
 for(const b of w.bells){b.pivot.rotation.z=0;b.clapperPivot.rotation.z=0;}
 const bellAnchors=w.bells.map((_,i)=>w.getBellStrikeTarget(i).clone()),bellCenters=w.bells.map((_,i)=>w.getBellBodyCenter(i).clone()),counter=w.getCounterStrikeTarget(.17).clone(),rims=w.tubPositions.map((_,i)=>w.getTubRimStrikeTarget(i).clone());
 const result=batchIceCreamCart(w);assert.ok(result.saved>=60);
 for(const angle of[0,.2,-.4]){for(const b of w.bells){b.pivot.rotation.z=angle;b.clapperPivot.rotation.z=angle*.5;}const actual=surfaces(w.cartGroup),expected=beforeByAngle.get(angle);assert.equal(actual.size,expected.size);
  for(const[key,a]of actual){const e=expected.get(key);assert.ok(e);assert.equal(a.vertices,e.vertices);for(let n=0;n<8;n++){assert.ok(Math.abs(a.sum[n]-e.sum[n])<.006);assert.ok(Math.abs(a.square[n]-e.square[n])<.006);}}
 }
 for(const b of w.bells){b.pivot.rotation.z=0;b.clapperPivot.rotation.z=0;}
 for(let i=0;i<7;i++){assert.equal(w.bells[i].pivot,pivots[i]);assert.equal(w.bells[i].shimmerRing,shimmers[i]);assert.ok(w.getBellStrikeTarget(i).distanceTo(bellAnchors[i])<1e-10);assert.ok(w.getBellBodyCenter(i).distanceTo(bellCenters[i])<1e-10);}
 assert.ok(w.getCounterStrikeTarget(.17).distanceTo(counter)<1e-10);for(let i=0;i<4;i++)assert.ok(w.getTubRimStrikeTarget(i).distanceTo(rims[i])<1e-10);
 assert.deepEqual(w.tubMeshes,iceRefs);for(const instance of coneInstances){assert.equal(instance.parent,w.coneRack);assert.equal(instance.count,56);}assert.equal(coneInstances.length,3);
 const view=new TubOrderView(w);view.begin();view.settleCamera();for(let i=0;i<4;i++){const p=view.projectedTub(i,390,844);assert.equal(view.pick(p.x/390,p.y/844),i);}
});
