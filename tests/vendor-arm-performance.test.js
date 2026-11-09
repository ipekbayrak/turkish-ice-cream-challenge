import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Group,Vector3} from 'three';
import {VendorArmSolver,segmentBoxDistanceSquared} from '../src/vendor-arm-solver.js';
import {VendorArmSolver as ReferenceSolver,segmentBoxDistanceSquared as referenceDistance} from './fixtures/vendor-arm-solver-reference.js';

// Frozen pre-optimization implementation is an oracle: timing improvements may
// not change collision depths, search choices, shoulder travel or final bones.
function random(){let state=0x5eedd00d;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);

test('allocation-free segment distance is bit-identical for crossing, tangent and degenerate segments',()=>{
 const rng=random(),box=new Box3(V(-.21,.03,-.12),V(.21,.55,.22));
 const values=[[V(-.4,.2,0),V(.8,0,0)],[V(.21,.2,.22),V()],[V(-.4,.55,-.12),V(.8,0,0)]];
 for(let i=0;i<5000;i++)values.push([V(rng()-.5,rng(),rng()-.5),V(rng()*2-1,rng()*2-1,rng()*2-1)]);
 for(const [a,d]of values)assert.equal(segmentBoxDistanceSquared(a,d,box),referenceDistance(a,d,box));
});

test('optimized collision and arm searches preserve every result from the original solver',()=>{
 const rng=random(),torso=new Group(),actual=new VendorArmSolver(torso),reference=new ReferenceSolver(torso);
 for(let i=0;i<160;i++){
  torso.position.set(rng()*.2-.1,.87+rng()*.17,-.9);torso.rotation.set(rng()*.35-.1,rng()*1.3-.65,0);
  torso.scale.setScalar([.91,.94,1,1.1][i%4]);actual.prepare();reference.prepare();
  const side=i%2?1:-1,shoulder=torso.localToWorld(V(side*.31,.46,.12));
  const target=V(rng()*1.6-.8,.7+rng()*1.2,-1.2+rng()*1.8),previous=V(side*.4,.9+rng()*.5,-.7+rng()*.6);
  const gripAxis=i%3?V(rng()-.5,rng()-.5,rng()-.5).normalize():null;
  for(const join of[false,true])assert.equal(actual.penetration(shoulder,target,join),reference.penetration(shoulder,target,join));
  for(const fast of[false,true]){
   const options={side,mode:i%4?'front':'back',previous,clampReach:i%3!==0,shoulderTravel:true,fast,gripAxis};
   assert.deepEqual(actual.solve(shoulder,target,options),reference.solve(shoulder,target,options),`pose ${i}, fast ${fast}`);
  }
  const backward=V(rng()-.5,rng()-.5,rng()-.5).normalize(),offset=V(.012,.04,-.06);
  const options={side,mode:i%4?'front':'back',wristOffset:offset};
  assert.deepEqual(actual.shaftGrip(target,backward,shoulder,.12,.95,.67,options),reference.shaftGrip(target,backward,shoulder,.12,.95,.67,options),`shaft ${i}`);
 }
});
