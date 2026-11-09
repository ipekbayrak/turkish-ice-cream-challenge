import test from 'node:test';import assert from 'node:assert/strict';
import {makeEncounterFixture} from './encounter-fixture.js';import {EncounterDriver} from './encounter-driver.js';import{seededPreviewRandom}from'./routines-driver.js';

test('repaired mechanics also finish the following handoff and final catch on all masters',()=>{
 const f=makeEncounterFixture({Driver:EncounterDriver}),old=Math.random;
 try{for(const pace of[1,31])for(let vendor=0;vendor<4;vendor++)for(const count of[2,8])for(const id of['GIANT_BLOCK_TEASE','FIGURE_EIGHT_WEAVE','SCOOP_AIR_CATCH','HAND_NAPKIN_OFFER']){
  Math.random=seededPreviewRandom(71931+vendor+count);f.reset({id,vendor,count,pace});const cone=f.w.conePivot;
  for(let i=0;i<30*35&&!f.d.roundEnded;i++)f.tick();
  assert.equal(f.outcome,'MASTER_CATCH',`${id}/${vendor}/${count}/${pace}: ${JSON.stringify(f.state())}`);
  assert.equal(f.w.conePivot,cone);assert.equal(cone.parent,f.w.heldSocket);assert.equal(f.w.servingNapkin.parent,cone);
 }}finally{Math.random=old;}
});

test('the final still requires actual player input after watching the show',()=>{
 const f=makeEncounterFixture({Driver:EncounterDriver});f.reset({id:'FINAL_PISTACHIO_CATCH',vendor:3,count:8});f.driver.release();
 for(let i=0;i<30*30&&!f.d.roundEnded;i++)f.tick(1/30,{drive:false});
 assert.notEqual(f.outcome,'MASTER_CATCH');assert.equal(f.d.score,0);
});
