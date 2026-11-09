import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TrickDirector } from '../src/tricks.js';
import { GameWorld } from '../src/world.js';

const noop=()=>{};
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function fixture(scenario){
 const world=Object.create(GameWorld.prototype);
 world.scene=new THREE.Scene();world.paddleGroup=new THREE.Group();world.conePivot=new THREE.Group();world.heldSocket=new THREE.Group();world.lArmRig={handGroup:new THREE.Group()};
 world.scene.add(world.paddleGroup,world.heldSocket,world.lArmRig.handGroup);world.paddleGroup.add(world.conePivot);
 world.paddleGroup.position.set(0,1.35,.1);
 world.paddleStrikeAnchor=new THREE.Object3D();world.paddleStrikeAnchor.position.z=.035;world.paddleGroup.add(world.paddleStrikeAnchor);
 world.vendorHead=new THREE.Group();world.fezTassel=new THREE.Group();world.carryScoop=new THREE.Group();world.carryScoop.visible=false;
 world.tubPositions=Array.from({length:6},(_,i)=>({worldPos:V(-.5+i*.2,1,-.25)}));
 world.coneSpring={pos:V(),target:V(),vel:V(),step(){return this.pos.copy(this.target);}};
 world.orientPaddleAndHands=()=>{world.paddleGroup.rotation.y=world.paddleGroup.position.x*.35;world.paddleGroup.rotation.x=.12;world.scene.updateMatrixWorld(true);};
 world.getCounterStrikeTarget=(x)=>V(x,1.1,.34);
 world.getTubRimStrikeTarget=(index)=>V(-.5+index*.2,1.02,-.18);
 const impacts=[],sounds=[];
 world.triggerCounterImpact=(point)=>impacts.push({target:point.clone(),actual:world.getPaddleStrikePoint()});
 const d=Object.create(TrickDirector.prototype);
 Object.assign(d,{world,sound:{playCounterRap:()=>sounds.push(world.getPaddleStrikePoint()),playPaddleClank:()=>sounds.push(world.getPaddleStrikePoint())},
  isAfkShowActive:true,afkScenario:scenario,afkTimer:0,lastAfkBeatTime:-1,lastAfkSurfaceKey:null,lastAfkContactKey:null,
  coneWorldPos:V(0,1.35,.1),coneTargetPos:V(0,1.35,.1),isGraspingPaddleCone:false,shaftRoll:0,conePitchX:0,coneFlipZ:0,
  _triggerVendorSpeech:noop});
 return {d,world,impacts,sounds,tick(frames=1){for(let i=0;i<frames;i++){d.presentationExact=false;d.presentationStrikeTip=null;d.presentationSurface=null;d.presentationBell=null;d._updateAfkShow(1/60,d.afkTimer);d._applyKinematics(1/60,d.afkTimer,{});}}};
}

test('AFK counter raps protect the cone and sound only at real spatula contact, once per beat',()=>{
 const f=fixture(0);
 f.tick(6);assert.equal(f.sounds.length,0);
 f.tick(170);
 assert.equal(f.sounds.length,8);
 assert.equal(f.sounds.length,f.impacts.length);
 for(const hit of f.impacts)assert.ok(hit.actual.distanceTo(hit.target)<=.02);
 assert.equal(f.world.conePivot.parent,f.world.lArmRig.handGroup);
});

test('AFK stirs an actual tub and withdraws bare steel without table-impact sounds',()=>{
 const f=fixture(2);let churn=0;f.world.churnTubIceCream=()=>churn++;
 f.tick(5);assert.equal(f.sounds.length,0);
 f.tick(175);
  assert.equal(f.impacts.length,0);assert.equal(f.sounds.length,0);
  assert.ok(churn>20);assert.equal(f.world.vendorPoleFree,true);
 assert.equal(f.world.conePivot.parent,f.world.lArmRig.handGroup);
});

test('a scheduled contact phase cannot emit a sound if actual spatula point misses the surface',()=>{
 const f=fixture(0);f.world.getPaddleStrikePoint=(out=V())=>out.set(2,2,2);
 f.d._poseAfkSurfaceStrike('counter',0,.55,V(0,1.1,.34));
 f.d._applyKinematics(1/60,0,{});
 assert.equal(f.sounds.length,0);assert.equal(f.impacts.length,0);
});


test('idle bell show touches only two or three bells quickly, then holds silently',()=>{
 for(const indices of [[1,2],[4,3,2]]){
  const f=fixture(1),hits=[];f.world.bells=Array.from({length:7},()=>({strikeCooldown:0}));
  f.world.getBellStrikeTarget=i=>V(-.36+i*.12,1.80,-.05);
  f.world.strikeBell=i=>hits.push({i,time:f.d.afkTimer,gap:f.world.getPaddleStrikePoint().distanceTo(f.world.getBellStrikeTarget(i))});
  f.d.sound.playBellNote=noop;
  f.d.afkBellPhrase={indices,beatSeconds:.36,duration:indices.length*.36};
  f.tick(100);const rest=f.world.getPaddleStrikePoint();f.tick(70);
  assert.deepEqual(hits.map(h=>h.i),indices);assert.ok(hits.every(h=>h.time<1.15&&h.gap<.025));
  assert.ok(f.world.getPaddleStrikePoint().distanceTo(rest)<1e-8,'the rest must not sweep across unused bells');
 }
});
