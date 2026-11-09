import {StretchyDondurmaStrand} from '../src/physics.js';
import test from 'node:test';import assert from 'node:assert/strict';import{Vector3}from'three';
import{makeVendorFlourishFixture}from'./vendor-flourish-fixture.js';import{StretchCutView}from'../src/stretch-cut-view.js';import{TouchReach}from'../src/touch-reach.js';import{PointerTipView}from'../src/touch-arm-view.js';import{TubOrderView}from'../src/order-view.js';
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
function setup(count=2){const f=makeVendorFlourishFixture(1,count);f.w._buildIceCreamCart();f.w.stretchyStrand=new StretchyDondurmaStrand(f.w.scene,14);f.d.isAfkShowActive=false;f.d.idleSeconds=0;f.d._spawnScorePopup=()=>{};return f;}
test('scraping drives actual steel below the rim, scrapes sideways and lifts ice without a straight rope',()=>{
 const{w,d,input}=setup(2);d.routine=['SCRAPE_FLAVOR_SCOOP','FINAL_PISTACHIO_CATCH'];d.scoopCount=1;w.updateIceCreamScoops(1);d._enterRoutineStep(0);const tub=d._getTubWorldPosForScoop(1);let dips=0,carries=0,minX=Infinity,maxX=-Infinity;
 for(let i=0;i<600&&d.currentMechanic==='SCRAPE_FLAVOR_SCOOP';i++){
  d.update(1/60,i/60,input);w.updateEnvironmentAnimations(i/60,1/60);
  assert.equal(w.stretchyStrand.active,false,'no premature thin rope');
  const p=d.stageTimer/1.45;if(p>.31&&p<.5&&!d.servingHandoff&&!d.trickTransition){const tip=w.getPaddleStrikePoint();assert.ok(tip.y<tub.y+.015);minX=Math.min(minX,tip.x);maxX=Math.max(maxX,tip.x);dips++;}
  if(w.carryScoop.visible)carries++;
 }
 assert.ok(dips>3);assert.ok(maxX-minX>.025);assert.ok(carries>3);assert.equal(d.scoopCount,2);
});
test('whole-mold shows retain every ordered scoop on the same cone in the other hand',()=>{
 for(const id of['GIANT_BLOCK_TEASE','MIDAIR_BLOCK_SOMERSAULT','WHOLE_MOLD_ON_CONE']){
  const{w,d,input}=setup(5),cone=w.conePivot,stack=w.scoopStackGroup;d.routine=[id,'FINAL_PISTACHIO_CATCH'];d._enterRoutineStep(0);let held=0,mold=0;
  for(let i=0;i<160;i++){d.update(1/60,i/60,input);w.updateEnvironmentAnimations(i/60,1/60);assert.equal(w.conePivot,cone);assert.equal(w.scoopStackGroup,stack);assert.equal(w.scoopMeshes.filter(m=>m.visible).length,5);if(cone.parent===w.lArmRig.handGroup)held++;if(w.giantBlockGroup.visible)mold++;}
  assert.ok(held>10);assert.ok(mold>3,`${id} must actually lift its mold`);
 }
});
test('cutting keeps the relaxed POV hand inside the phone frame with its tip on the same aim',()=>{
 const{w}=setup();w.camera.aspect=394/853;w.camera.position.set(0,1.5,1.4);w.camera.lookAt(0,1.28,-.55);w.camera.updateProjectionMatrix();w.camera.updateMatrixWorld(true);
 const reach=new TouchReach(w),view=new PointerTipView(w),cut=new StretchCutView(w);reach.begin(w.camera,394,853);w.setPlayerConeGrip(false);
 for(let i=0;i<90;i++){const x=120+i*1.5,y=590;reach.updateAim(x,y);w.updateTouristHand(reach.target,.2,0,1/60,true);cut.set({contact:true,cut:i===40,direction:V(1,.2,0),point:reach.target});cut.update(1/60);view.update(true,x,y,394,853,'touch',true,{x,y});const p=w.touristHand.getWorldPosition(V()).project(w.camera);assert.ok(p.y> -1&&p.y<1);assert.ok(Math.abs(view.y-y)<1);}
});
test('selection accepts the visible wafer body even with the finger away from the tub',()=>{
 const{w}=setup(1);w.canvas={clientWidth:394,clientHeight:853};w.camera.aspect=394/853;w.camera.lookAt(0,1.28,-.55);w.camera.updateProjectionMatrix();const view=new TubOrderView(w);view.begin();view.settleCamera();w.scene.attach(w.conePivot);
 for(let i=0;i<4;i++){const t=view.projectedTub(i,394,853);const ray=V(t.x/394*2-1,1-t.y/853*2,.5).unproject(w.camera).sub(w.camera.position).normalize();w.conePivot.position.copy(w.camera.position).addScaledVector(ray,(.26-w.camera.position.z)/ray.z);w.conePivot.rotation.set(0,0,0);assert.equal(view.pickCone(.95,.95),i);}
 view.update({count:0,hover:-1,dwell:0},.1);assert.ok(view.materials.every(row=>row.every(s=>s.material.emissive.equals(s.color))));
 view.update({count:1,hover:-1,dwell:0},.1);assert.ok(view.materials.every(row=>row.every(s=>s.material.emissive.equals(s.color))));
});

test('real bell crossing recognises the opening, plays the same bell voice in its continuation after release and stops on leaving the intro',async()=>{
 const{CounterInteractions}=await import('../src/counter-interactions.js');const{w}=setup();w.camera.lookAt(0,1.28,-.55);w.camera.updateMatrixWorld(true);const notes=[],found=[];
 const c=new CounterInteractions(w,{playBellNote:(...args)=>notes.push(args)},{onRecognized:id=>found.push(id)});
 let epoch=0;
 const tick=(dt,active,x=0,y=0,enabled=true)=>{c.update(dt,{active,empty:true,x,y,epoch,width:390,height:844,melodyEnabled:enabled});w.updateEnvironmentAnimations(0,dt);};
 for(const n of[0,0,1,2,2,1,0,1,2,0]){const p=c.project(w.getBellBodyCenter(n),390,844);epoch++;tick(.05,true,p.x,p.y+35);tick(.05,true,p.x,p.y);for(let i=0;i<12;i++)tick(.025,false);}
 assert.deepEqual(found,['usta-answer']);const manual=notes.length;for(let i=0;i<30;i++)tick(.05,false);assert.ok(notes.length>manual);assert.ok(notes.every(n=>n.length===3));
 tick(.05,false,0,0,false);const count=notes.length;for(let i=0;i<30;i++)tick(.05,false,0,0,false);assert.equal(notes.length,count);
});
