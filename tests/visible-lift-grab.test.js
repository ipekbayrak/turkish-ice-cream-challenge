import test from 'node:test';import assert from 'node:assert/strict';import {Vector3} from 'three';
import {makeVendorFlourishFixture} from './vendor-flourish-fixture.js';import {EncounterCamera} from '../src/encounter-camera.js';import {TouchReach} from '../src/touch-reach.js';import {ICE_CREAM_FLAVORS} from '../src/flavors.js';import {extraTrickCue} from '../src/trick-extensions.js';
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
function fixture(width,height,count=2){
 globalThis.window={innerWidth:width,innerHeight:height};const f=makeVendorFlourishFixture(3,count),{w,d,input}=f;
 w.canvas={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>({width,height})};w.tubPositions=ICE_CREAM_FLAVORS.map(t=>({x:t.xOffset,worldPos:V(t.xOffset,.98,-.3)}));new EncounterCamera(w).setPhase('play',true);
 Object.assign(w.stretchyStrand,{attach(){},update(){}});d.isAfkShowActive=false;d.idleSeconds=0;d.routine=['SCOOP_LIFT_BACK','FINAL_PISTACHIO_CATCH'];d._enterRoutineStep(0);
 const tick=()=>{d.update(1/60,3,input);w.updateEnvironmentAnimations(3,1/60);};for(let i=0;i<150;i++)tick();const reach=new TouchReach(w);reach.begin(w.camera,width,height);
 return{...f,tick,aim(screen){input.aimNormX=input.normX=screen.x/width*2-1;input.aimNormY=input.normY=1-screen.y/height*2;input.intentWorldPos.copy(reach.updateAim(screen.x,screen.y));input.handWorldPos.copy(input.intentWorldPos);}};
}
test('the pictured lift trick accepts the same green circle at any authored hand depth',()=>{
 for(const [width,height]of[[620,704],[390,844],[1280,720]])for(const count of[2,8]){
  const f=fixture(width,height,count),{d,w,input}=f,score=d.score;const cue=extraTrickCue(d);
  input.pointerEpoch++;input.isPointerDown=input.isReaching=true;f.aim(cue.screen);
  if(width===620&&count===2)assert.ok(input.intentWorldPos.distanceTo(cue.target)>.28,'reproduces old impossible 3D hit test');
  for(let i=0;i<12&&!d.extraTrick.fullCaught;i++)f.tick();
  assert.equal(d.extraTrick.fullCaught,true);assert.equal(w.conePivot.parent,w.heldSocket);assert.equal(d.heldItem,'FULL_FOR_LIFT');assert.equal(d.score,score);
  assert.equal(extraTrickCue(d).kind,'pull','the original active pull phase still follows the catch');
 }
});
test('hovering deliberately onto the visible offer works without clicking; outside and inactive input do not',()=>{
 const f=fixture(620,704),{d,input}=f;const cue=extraTrickCue(d);
 input.isMouseHover=true;f.aim({x:cue.screen.x-100,y:cue.screen.y});for(let i=0;i<20;i++)f.tick();assert.ok(!d.extraTrick.fullCaught);
 input.isMouseHover=false;f.aim(cue.screen);for(let i=0;i<20;i++)f.tick();assert.ok(!d.extraTrick.fullCaught);
 input.isMouseHover=true;f.aim({x:cue.screen.x-100,y:cue.screen.y});for(let i=0;i<10;i++)f.tick();f.aim(cue.screen);for(let i=0;i<12;i++)f.tick();assert.equal(d.extraTrick.fullCaught,true);
});
