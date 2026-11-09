import test from 'node:test';
import assert from 'node:assert/strict';
import {makeEncounterFixture} from './encounter-fixture.js';
import {CollectedCones} from '../src/collected-cones.js';
import {EncounterDriver} from './encounter-driver.js';
test('folded paper clears both real wafer tapers and stays outside a nested pair',()=>{
 const {w}=makeEncounterFixture(),paper=w.servingNapkin;
 for(const outer of[false,true]){
  w.handoffOuterCone('nested',outer);w.setServingNapkin({owner:'vendor',peel:0});
  w.stallEffects.napkinPeel=0;w.stallEffects.updateNapkinSurface();
  const mesh=outer?w.outerConeMesh:w.mainConeMesh;
  assert.equal(paper.parent,outer?w.outerConeGroup:w.conePivot);
  const p=w.stallEffects.napkinGeometry.attributes.position,h=mesh.geometry.parameters.height,r=mesh.geometry.parameters.radius;
  for(let i=0;i<p.count;i++){
   const y=p.getY(i)+w.stallEffects.napkinRest.y;
   const waferRadius=r*(y-(mesh.position.y-h/2))/h;
   assert.ok(Math.hypot(p.getX(i),p.getZ(i))-waferRadius>.0028,`paper vertex ${i} buried in ${outer?'outer':'inner'} wafer`);
  }
 }
 w.handoffOuterCone('player',true);assert.equal(paper.parent,w.outerConeGroup,'the same wrapper travels with the outside wafer');
 const stock=new CollectedCones(w);w.outerConeGroup.add(w.scoopStackGroup);
 stock.collect(w.outerConeGroup,'test');assert.equal(stock.pool[0].mesh.children.length,w.outerConeGroup.children.length-2,'stock contains wafer only, never duplicate paper or ice');
});
test('retained paper on a double cone is recovered and wrapped without stalling or duplication',()=>{
 const f=makeEncounterFixture({Driver:EncounterDriver});
 for(const vendor of[0,1,2,3])for(const count of[1,8,12]){
  f.reset({id:'DOUBLE_CONE_SLIDE',vendor,count,pace:46});
  const paper=f.w.servingNapkin;f.w.setServingNapkin({owner:'outer',peel:0});f.w.stallEffects.napkinRecovered=true;
  for(let frame=0;frame<60*35&&f.d.routineIndex===0;frame++)f.tick(1/60);
  assert.ok(f.d.routineIndex>0,`vendor ${vendor}, count ${count}: ${JSON.stringify(f.state())}`);
  assert.equal(f.w.servingNapkin,paper);
 }
});
