import test from 'node:test';import assert from 'node:assert/strict';
import {makeEncounterFixture} from './encounter-fixture.js';
import {isTimedVendorShow} from '../src/idle-presentation.js';

test('watching timed vendor animations at the slow starting rhythm never interrupts them with AFK',()=>{
 const f=makeEncounterFixture();
 for(const id of ['GIANT_BLOCK_TEASE','MIDAIR_BLOCK_SOMERSAULT','VERTICAL_WINDMILL','UPSIDE_DOWN_GRAVITY','FAKE_DROP_PANIC','OVERHEAD_CROWN_DANGLE','COMBO_DOUBLE_PUMP','BELL_RHYTHM_FEINT','SHELL_SWAP_DUEL']){
  f.reset({id,vendor:3,count:2,pace:1});f.driver.release();let finished=false;
  for(let frame=0;frame<8*60;frame++){
   f.tick(1/60,{drive:false});
   assert.equal(f.d.isAfkShowActive,false,`${id} interrupted at ${f.time}s`);
   if(!isTimedVendorShow(f.d)&&!f.d.trickTransition&&!f.d.servingHandoff&&!f.d.entryPaperPreparation&&!f.d.pendingEntryPaper){finished=true;break;}
  }
  assert.equal(finished,true,`${id} never opened its player window`);
  assert.equal(f.d.routineIndex,0,'watching alone must not complete the catch');
  assert.ok(f.d.idleSeconds<.1,'player gets the full catch/response period');
 }
});

test('required gestures are never classified as automatic watch phases',()=>{
 for(const currentMechanic of ['SHAFT_SPIN_360','FIGURE_EIGHT_WEAVE','EYE_LOCK_RHYTHM_CHASE','MEGA_TAFFY_SLICE','FINAL_PISTACHIO_CATCH'])assert.equal(isTimedVendorShow({currentMechanic,subStep:0}),false);
 assert.equal(isTimedVendorShow({currentMechanic:'GIANT_BLOCK_TEASE',subStep:1}),false);
 assert.equal(isTimedVendorShow({currentMechanic:'BELL_RHYTHM_FEINT',bellBeatsDone:2}),false);
});

test('declining a timed empty-cone or napkin bait reaches its authored next step at slow tempo',()=>{
 const f=makeEncounterFixture();
 for(const id of ['DOUBLE_CONE_SLIDE','NAPKIN_CONE_FAKEOUT']){
  f.reset({id,vendor:3,count:2,pace:1});f.driver.release();let progressed=false;
  for(let i=0;i<6*30;i++){
   f.tick(1/30,{drive:false});assert.equal(f.d.isAfkShowActive,false);
   if(id==='DOUBLE_CONE_SLIDE'?f.d.routineIndex===1:f.d.subStep===3){progressed=true;break;}
  }
  assert.ok(progressed,id);assert.equal(f.d.hearts,3);
  assert.equal(f.outcome,null,'the final catch still requires the player');
 }
});
