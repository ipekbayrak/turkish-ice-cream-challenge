import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { TrickDirector } from '../src/tricks.js';
import { isQuietVendorPresentation, markIdleSettling, tickIdleGuide, suppressIdleScene } from '../src/idle-presentation.js';
import { clearVendorFlourish } from '../src/vendor-flourish.js';
import { StretchyDondurmaStrand } from '../src/physics.js';
import { makeVendorFlourishFixture } from './vendor-flourish-fixture.js';

function withGuide(run) {
 const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{innerWidth:390,innerHeight:844}});
 try {
  const d=Object.create(TrickDirector.prototype);
  Object.assign(d,{world:{touristHand:{position:new Vector3(.1,1.2,.3)},projectToScreen:p=>({x:195+p.x*100,y:600-p.y*100})},
   save:{lang:'tr',getTrickInfo:()=>({name:'Numara'}),t:key=>key},active:true,roundEnded:false,
   coneWorldPos:new Vector3(0,1.3,.2),routineIndex:1,routine:['one','two','final'],currentMechanic:'EYE_LOCK_RHYTHM_CHASE',
   vendorBubbleTimer:1,vendorBubbleText:'Hop!',floatingPopups:[],vignetteFlash:{alpha:0},
   isAfkShowActive:false,afkScenario:0,idleSeconds:5,passiveLimitSec:20,heldItem:null,isGraspingPaddleCone:false,
   pendingTrickAdvance:0,subStep:0,eyeLockHoldTimer:.2,rhythmBeatsCompleted:1,stageTimer:.2,config:{}});
  run(d);
 } finally {if(previous)Object.defineProperty(globalThis,'window',previous);else delete globalThis.window;}
}

test('idle table, bell, tub, wave and back flourish have no arrow or target ring',()=>withGuide(d=>{
 d.isAfkShowActive=true;
 for(const scenario of [0,1,2,3,4]){
  d.afkScenario=scenario;const g=d.getGestureGuide();
  assert.deepEqual(g.comets,[]);assert.deepEqual(g.rings,[]);
  assert.equal(g.vendorBubble.text,'Hop!');assert.equal(g.active,true);
  assert.equal(g.quiet,true);
 }
}));

test('receiving, back turn and the transfer frame stay quiet if AFK clears early',()=>withGuide(d=>{
 d.choreography={bridge:{pulse:1,elapsed:.1,duration:.6},index:0,routine:{id:'show',names:{tr:'Şov'},componentIds:['one','two']}};
 for(const pending of ['flourishPreparation','vendorFlourish','afkRejoin']){
  d[pending]={};const guide=d.getGestureGuide();
  assert.equal(guide.quiet,true,pending);assert.deepEqual(guide.comets,[]);assert.deepEqual(guide.rings,[]);
  d[pending]=null;
 }
 d.choreography=null;markIdleSettling(d);
 assert.equal(d.getGestureGuide().quiet,true,'the last handoff frame still belongs to the vendor');
 tickIdleGuide(d);
 assert.equal(isQuietVendorPresentation(d),false);
 assert.ok(d.getGestureGuide().comets.length,'the first active update exposes the rhythm immediately');
 markIdleSettling(d);clearVendorFlourish(d);
 assert.equal(isQuietVendorPresentation(d),false,'routine reset cannot carry a stale quiet state');
}));

test('complete idle receive, flourish and interrupted rejoin never expose an action arrow',()=>withGuide(()=>{
 for(const interruptAt of [.20,2.25,4]){
 const f=makeVendorFlourishFixture(1,2),{d}=f;
 let returned=false;
 for(let frame=0;frame<600;frame++){
  f.step(1/120,f.time>interruptAt);
  const guide=d.getGestureGuide();
  assert.equal(guide.quiet,true,`at ${f.time}`);assert.equal(guide.comets.length,0);assert.equal(guide.rings.length,0);
  if(!d.isAfkShowActive&&!d.flourishPreparation&&!d.vendorFlourish&&!d.afkRejoin){returned=true;break;}
 }
 assert.ok(returned);assert.equal(d.stageTimer,0);assert.equal(d.score,0);assert.equal(d.hearts,d.maxHearts);
 const dt=1/120;
 f.step(dt,true);
 assert.equal(Boolean(d.getGestureGuide().quiet),false,'no post-return delay may hide the active cue');
 assert.ok(d.getGestureGuide().comets.length,'the first resumed SHAFT_SPIN update has its action cue');
 assert.ok(Math.abs(d.stageTimer-dt*(d.config.speedMult||1))<1e-12,'the response timer resumes at its unchanged rate');
 assert.equal(d.score,0);assert.equal(d.hearts,d.maxHearts);
 }
}));

test('ordinary idle exit shows its cue in the same update that resumes the mechanic',()=>withGuide(()=>{
 const f=makeVendorFlourishFixture(1,2),{d}=f,dt=1/120;
 d.afkScenario=3;
 f.step(dt,true);
 assert.equal(d.isAfkShowActive,false);assert.equal(Boolean(d.getGestureGuide().quiet),false);
 assert.ok(d.getGestureGuide().comets.length);
 assert.ok(Math.abs(d.stageTimer-dt*(d.config.speedMult||1))<1e-12);
 assert.equal(d.score,0);assert.equal(d.hearts,d.maxHearts);
}));

test('idle detaches an old cut rope, while the same cut resumes with fresh physical endpoints',()=>withGuide(()=>{
 const f=makeVendorFlourishFixture(1,2),{d,w}=f;
 w.stretchyStrand=new StretchyDondurmaStrand(w.scene);
 d.routine=['MEGA_TAFFY_SLICE','FINAL_PISTACHIO_CATCH'];d._enterRoutineStep(0);
 const foodOwner=w.conePivot.parent,score=d.score,hearts=d.hearts;
 assert.ok(w.stretchyStrand.active);
 w.sliceCueGroup.visible=true;suppressIdleScene(d);
 assert.equal(w.stretchyStrand.active,false);assert.equal(w.stretchyStrand.mesh.visible,false);
 assert.equal(w.sliceCueGroup.visible,false);
 d.update(1/120,.5,{...f.input,isMoving:true,isPointerDown:false});
 assert.equal(w.stretchyStrand.active,true);assert.equal(w.stretchyStrand.mesh.visible,true);
 assert.equal(d.idleStrandWasActive,false);assert.equal(w.conePivot.parent,foodOwner);
 assert.equal(d.score,score);assert.equal(d.hearts,hearts);assert.equal(d.currentMechanic,'MEGA_TAFFY_SLICE');
}));

test('presentation cleanup cannot detach a real customer-held tug',()=>withGuide(d=>{
 let detached=0;d.world.stretchyStrand={active:true,detach:()=>detached++};
 d.heldItem='FULL_CONE_TUG';suppressIdleScene(d);assert.equal(detached,0);
 d.heldItem=null;d.isGraspingPaddleCone=true;suppressIdleScene(d);assert.equal(detached,0);
}));

test('idle presentation overrides stale held-item, grip and compound bridge indicators',()=>withGuide(d=>{
 d.isAfkShowActive=true;
 d.choreography={bridge:{pulse:1,elapsed:.1,duration:.6},index:0,routine:{id:'show',names:{tr:'Şov'},componentIds:['one','two']}};
 for(const held of [null,'EMPTY_CONE','NAPKIN','NAPKIN_CONE','FULL_CONE_TUG']){
  d.heldItem=held;d.subStep=2;d.isGraspingPaddleCone=true;
  const g=d.getGestureGuide();assert.equal(g.comets.length,0);assert.equal(g.rings.length,0);
 }
}));

test('hold, moving rhythm, active bell timing and pull cues return when idle show ends',()=>withGuide(d=>{
 for(const subStep of [0,1]){d.subStep=subStep;const g=d.getGestureGuide();assert.ok(g.comets.length);assert.ok(g.rings.length);}
 d.currentMechanic='BELL_RHYTHM_FEINT';d.bellBeatsDone=0;assert.ok(d.getGestureGuide().rings.length);
 d.bellBeatsDone=2;assert.ok(d.getGestureGuide().comets.length);
 d.isGraspingPaddleCone=true;assert.equal(d.getGestureGuide().badgeText,'cue_tug');assert.ok(d.getGestureGuide().comets.length);
}));
