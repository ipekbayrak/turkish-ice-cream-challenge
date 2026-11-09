import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDeformingTube,updateDeformingTube} from '../src/deforming-tube.js';
import {StretchyDondurmaStrand,RigidBodyManager} from '../src/physics.js';

test('deforming tube retains the exact TubeGeometry surface, normals and UVs through moving curves',()=>{
  for(const [segments,radial]of[[24,10],[16,6]]){
    const nodes=Array.from({length:14},(_,i)=>new THREE.Vector3(i*.05,1+i*.01,.2));
    const curve=new THREE.CatmullRomCurve3(nodes),tube=createDeformingTube(curve,segments,.038,radial);
    const position=tube.attributes.position,index=tube.index,uv=tube.attributes.uv;
    for(let frame=0;frame<40;frame++){
      nodes.forEach((n,i)=>n.set(i*.05,1+Math.sin(i*.4+frame*.1)*.14,.2+Math.cos(i*.3+frame*.1)*.06));
      const radius=.015+frame*.0005;updateDeformingTube(tube,curve,radius);
      const expected=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(nodes),segments,radius,radial,false);
      for(const key of['position','normal','uv'])assert.deepEqual(tube.attributes[key].array,expected.attributes[key].array,`${key} frame${frame}`);
      assert.deepEqual(tube.index.array,expected.index.array);
      expected.computeBoundingSphere();assert.ok(tube.boundingSphere.center.distanceTo(expected.boundingSphere.center)<1e-12);
      assert.equal(tube.boundingSphere.radius,expected.boundingSphere.radius);
      assert.equal(tube.attributes.position,position);assert.equal(tube.index,index);assert.equal(tube.attributes.uv,uv);expected.dispose();
    }
    tube.dispose();
  }
});

test('three elastic strands retain GPU buffers and refreshed bounds through repeated pulls and cuts',()=>{
  const strand=new StretchyDondurmaStrand(new THREE.Scene());
  const geometries=[strand.mesh,...strand.subMeshes].map(m=>m.geometry),positions=geometries.map(g=>g.attributes.position);
  let disposed=0;geometries.forEach(g=>g.addEventListener('dispose',()=>disposed++));
  for(let round=0;round<20;round++){
    const start=new THREE.Vector3(0,1.2,-.2),end=new THREE.Vector3(.4,1.3,.2);
    strand.attach(start,end,0xffeedd,true);
    for(let frame=0;frame<60;frame++){
      end.x=.4+Math.sin(frame*.1)*.2;strand.update(1/60,start,end,1.2,.8);
      assert.equal(strand.nodes[0].distanceTo(start),0);
      assert.ok(strand.nodes.at(-1).distanceTo(end)<1e-12);
      [strand.mesh,...strand.subMeshes].forEach((mesh,i)=>{assert.equal(mesh.geometry,geometries[i]);assert.equal(mesh.geometry.attributes.position,positions[i]);assert.ok(Number.isFinite(mesh.geometry.boundingSphere.radius));});
    }
    strand.detach();assert.equal(strand.active,false);assert.equal(strand.mesh.visible,false);
  }
  assert.equal(disposed,0,'animation never replaces GPU buffers');
});

test('30 simulated minutes of flying scoops release owned resources and retain landing timing',()=>{
  const scene=new THREE.Scene(),manager=new RigidBodyManager(scene);
  let landed=0,geometries=0,materials=0;
  for(let second=0;second<1800;second++){
    manager.spawnFlyingScoop(0xffeedd,new THREE.Vector3(0,1,0),()=>new THREE.Vector3(.3,1.2,.2),()=>landed++);
    const body=manager.bodies[0];body.mesh.geometry.addEventListener('dispose',()=>geometries++);body.mesh.material.addEventListener('dispose',()=>materials++);
    for(let frame=0;frame<26;frame++)manager.update(1/60);
    assert.equal(landed,second);manager.update(1/60);assert.equal(landed,second+1);
    assert.equal(manager.bodies.length,0);assert.equal(scene.children.length,0);assert.equal(body.getTargetPosFn,null);assert.equal(body.onLandCallback,null);
    for(let frame=27;frame<60;frame++)manager.update(1/60);
  }
  assert.equal(geometries,1800);assert.equal(materials,1800);
});

test('thrown cones retain shared source geometry when their transient clone expires',()=>{
  const scene=new THREE.Scene(),manager=new RigidBodyManager(scene);
  const cone=new THREE.Mesh(new THREE.ConeGeometry(.05,.2),new THREE.MeshStandardMaterial());let disposed=0;
  cone.geometry.addEventListener('dispose',()=>disposed++);cone.material.addEventListener('dispose',()=>disposed++);
  manager.spawnThrownObject(cone.clone(),new THREE.Vector3(0,1,0),new THREE.Vector3(),new THREE.Vector3());manager.update(3);
  assert.equal(scene.children.length,0);assert.equal(disposed,0);
});
