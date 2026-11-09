import test from 'node:test';import assert from 'node:assert/strict';import {Vector3} from 'three';
import {makeEncounterFixture} from './encounter-fixture.js';import {EncounterDriver} from './encounter-driver.js';
const V=()=>new Vector3();
test('air-scoop show prepares the receiving hand, makes contact and completes through real touch inputs on every master',()=>{
 const f=makeEncounterFixture({Driver:EncounterDriver});
 for(let vendor=0;vendor<4;vendor++)for(const count of[2,8]){
  f.reset({id:'SCOOP_AIR_CATCH',vendor,count});const cone=f.w.conePivot,scoops=[...f.w.scoopMeshes];let contact=null;
  const original=f.w.handoffCone.bind(f.w);
  f.w.handoffCone=owner=>{if(owner==='vendor'&&f.d.subStep===0){f.w.scene.updateMatrixWorld(true);contact=cone.getWorldPosition(V()).distanceTo(f.w.lArmRig.handGroup.localToWorld(new Vector3(0,.11,.035)));}original(owner);};
  for(let i=0;i<30*20&&!f.d.roundEnded&&f.d.routineIndex===0;i++)f.tick();
  f.w.handoffCone=original;
  assert.equal(f.d.routineIndex,1,`${vendor}/${count}: ${JSON.stringify(f.state())}`);assert.ok(contact!==null&&contact<.04,`contact ${contact}`);
  assert.equal(f.w.conePivot,cone);assert.deepEqual(f.w.scoopMeshes,scoops);assert.equal(f.d.score,440);assert.equal(f.d.hearts,3);
 }
});
