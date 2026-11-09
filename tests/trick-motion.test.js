import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { scoopPath, moldPath, bellPath } from '../src/trick-motion.js';
const tub = new Vector3(-.37,.97,-.33), start = new Vector3(0,1.22,.27), deposit = new Vector3(.2,1.30,-.22);
test('scrape connects existing pole, chosen bucket and cone without discontinuities',()=>{
  assert.ok(scoopPath(0,start,tub,deposit).distanceTo(start)<1e-9);
  assert.ok(scoopPath(1,start,tub,deposit).distanceTo(deposit)<1e-9);
  let last=scoopPath(0,start,tub,deposit), min=Infinity;
  for(let i=1;i<=300;i++) {const next=scoopPath(i/300,start,tub,deposit);assert.ok(next.distanceTo(last)<.04);min=Math.min(min,next.distanceTo(tub));last=next;}
  assert.ok(min<.02,'pole must reach selected bucket, not scrape empty air');
});
test('both mold shows return to same bucket before becoming invisible',()=>{
 for(const flip of [false,true]) {
  let last=moldPath(0,tub,flip).position;
  for(let i=1;i<=500;i++) {const frame=moldPath(i/500,tub,flip);assert.ok(frame.position.distanceTo(last)<.035); if(i>100&&!frame.visible)assert.ok(frame.position.y<tub.y);last=frame.position;}
  assert.equal(moldPath(.5,tub,flip).tubFill,0);assert.equal(moldPath(1,tub,flip).tubFill,1);
  assert.ok(moldPath(1,tub,flip).position.distanceTo(moldPath(0,tub,flip).position)<1e-9);
 }
});
test('bell path physically reaches the rim and rebounds continuously',()=>{
 const contact=new Vector3(.3,1.83,-.08);
 assert.ok(bellPath(.35,start,contact).distanceTo(contact)<1e-9);
 assert.ok(bellPath(1,start,contact).distanceTo(start)<1e-9);
 for(const p of [.28,.43,.78]) assert.ok(bellPath(p-.00001,start,contact).distanceTo(bellPath(p+.00001,start,contact))<.001);
});

test('surface strikes lift before traversing, dwell on contact, rebound and never pass below the rail', async () => {
 const {surfaceStrikePath}=await import('../src/trick-motion.js');
 const contact=new Vector3(.3,1.05,.25), origin=new Vector3(-.3,1.3,-.1);
 assert.ok(surfaceStrikePath(0,origin,contact).distanceTo(origin)<1e-9);
 assert.ok(surfaceStrikePath(.55,origin,contact).distanceTo(contact)<1e-9);
 assert.ok(surfaceStrikePath(1,origin,contact).y>=contact.y+.129);
 let last=surfaceStrikePath(0,origin,contact);
 for(let i=1;i<=500;i++) {const p=surfaceStrikePath(i/500,origin,contact);assert.ok(p.y>=contact.y-1e-9);assert.ok(p.distanceTo(last)<.025);last=p;}
});
