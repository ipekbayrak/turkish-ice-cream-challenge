import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,PerspectiveCamera,Scene,Vector3} from 'three';
import {VendorFlourish,flourishOrbit,clearVendorFlourish,setFlourishPose} from '../src/vendor-flourish.js';
import {TrickDirector} from '../src/tricks.js';
import {makeVendorFlourishFixture} from './vendor-flourish-fixture.js';
import {inspectVendorArmSurfaces,inspectVendorHandSurfaces} from './vendor-arm-geometry.js';
import {shopCameraProfile} from '../src/shop-interior.js';

const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
function fixture(){
 const scene=new Scene(),paddleGroup=new Group(),paddleRollGroup=new Group(),handGroup=new Group();
 scene.add(paddleGroup,handGroup);paddleGroup.add(paddleRollGroup);paddleGroup.position.set(.15,1.35,.34);handGroup.position.set(.15,1.35,-.33);
 return{scene,paddleGroup,paddleRollGroup,rArmRig:{handGroup}};
}
function insideTorso(point,yaw=0){
 const local=point.clone().sub(V(0,.94,-.86)).applyAxisAngle(V(0,1,0),-yaw);
 return Math.abs(local.x)<.285&&local.y>.01&&local.y<.61&&local.z>-.28&&local.z<.29;
}
test('the complete bare shaft follows a tangent outside the torso on the back orbit',()=>{
 for(let frame=0;frame<=240;frame++){
  const p=flourishOrbit(frame/240*2.1);
  for(let step=0;step<=80;step++){
   const point=p.grip.clone().addScaledVector(p.forward,-.36+1.03*step/80);
   assert.equal(insideTorso(point,p.bodyYaw),false,`theta ${p.theta} shaft ${step}`);
  }
 }
});
test('behind-back motion and every interrupted return are continuous, finite and finish in front',()=>{
 for(const interruptedAt of[null,.16,.42,.67,1.15,1.73,2.35,2.85]){
  const world=fixture(),f=new VendorFlourish(world,1.1);let previous=f.current.tip.clone(),previousForward=f.current.forward.clone(),maxStep=0,back=false;
  for(let frame=0;frame<600&&!f.done;frame++){
   if(interruptedAt!==null&&f.age>=interruptedAt&&!f.returning)f.beginReturn();
   const p=f.step(1/120);maxStep=Math.max(maxStep,p.tip.distanceTo(previous));
   assert.ok(p.tip.toArray().every(Number.isFinite));assert.ok(previousForward.dot(p.forward)>.93,'shaft cannot flip between frames');
   back ||= p.armMode==='back';previous.copy(p.tip);previousForward.copy(p.forward);
  }
  assert.ok(f.done);assert.ok(maxStep<.085,`${interruptedAt}: ${maxStep}`);
  assert.ok(f.current.tip.z>.35);assert.equal(f.stageTimer,1.1);
  if(interruptedAt===null)assert.ok(back,'the path actually reaches the back side');
 }
});
test('the complete idle shaft stays framed during its high turn and body-clear orbit',()=>{
 for(const [width,height] of [[390,844],[430,932],[360,900],[320,844],[1280,800],[844,390]]){
  const profile=shopCameraProfile(width,height),camera=new PerspectiveCamera(profile.fov,width/height,.05,40);
  camera.position.fromArray(profile.position);camera.lookAt(V(...profile.target));camera.updateMatrixWorld(true);
  for(const startForward of[V(0,0,1),V(.944,-.015,.329).normalize()]){
   const w=fixture();w.paddleRollGroup.quaternion.setFromUnitVectors(V(0,0,1),startForward);
   const motion=new VendorFlourish(w);
   for(let frame=36;frame<=408;frame++){
    const p=motion.sample(frame/120);
    for(const along of[-1.06,.03]){
     const projected=p.tip.clone().addScaledVector(p.forward,along).project(camera);
     const x=(projected.x+1)*width/2,y=(1-projected.y)*height/2;
     assert.ok(x>=8&&x<=width-8&&y>=8&&y<=height-8,`${width}x${height} age${frame/120} shaft${along}: ${x},${y}`);
    }
   }
  }
 }
});
test('presentation hints and left-hand target do not write score, food ownership or input',()=>{
 const world=fixture(),cone=new Group();world.paddleGroup.add(cone);const d={world,coneTargetPos:V(),score:123,hearts:3,stageTimer:1.1};
 const f=new VendorFlourish(world,1.1);setFlourishPose(d,f.sample(1.7));d.vendorFlourish=f;
 assert.equal(world.vendorArmMode,'back');assert.ok(Math.abs(world.vendorRearGripHint-.67)<1e-12);
 assert.ok(d.leftHandCustomTarget.z>-.3);assert.equal(cone.parent,world.paddleGroup);
 assert.equal(d.score,123);assert.equal(d.hearts,3);assert.equal(d.stageTimer,1.1);
 clearVendorFlourish(d);assert.equal(d.vendorFlourish,null);assert.equal(world.vendorArmMode,'front');assert.equal(world.vendorPoleForwardHint,null);assert.equal(world.vendorRearGripHint,null);assert.equal(world.vendorBodyYawHint,null,'ordinary tracking resumes when the authored override ends');
});
test('an interrupted idle flourish returns safely before resuming without consuming the catch timer',()=>{
 const world=fixture(),owners=[];world.setConeInVendorHand=value=>owners.push(value);
 const d=Object.assign(Object.create(TrickDirector.prototype),{world,active:true,roundEnded:false,
  vignetteFlash:{alpha:0},floatingPopups:[],vendorBubbleTimer:0,coneTargetPos:V(),score:321,hearts:3,routineIndex:4,
  stageTimer:9,isAfkShowActive:true,idleSeconds:5,_applyKinematics(){},_triggerVendorSpeech(){}});
 d.vendorFlourish=new VendorFlourish(world,.75);
 while(d.vendorFlourish.age<1.6)d.vendorFlourish.step(.02);
 let elapsed=0;
 while(d.vendorFlourish&&elapsed<2){d.update(.02,elapsed,{isPointerDown:true,isMoving:true});elapsed+=.02;}
 assert.equal(d.vendorFlourish,null);assert.ok(elapsed>.7&&elapsed<1.3);
 assert.deepEqual(owners,[],'no food is invented in the empty recovery fixture');assert.equal(d.isAfkShowActive,false);assert.equal(d.idleSeconds,0);
 assert.equal(d.stageTimer,.75);assert.equal(d.score,321);assert.equal(d.hearts,3);assert.equal(d.routineIndex,4);
 assert.equal(world.vendorArmMode,'front');assert.equal(world.vendorPoleForwardHint,null);
});
test('actual preview reset, environment and handoff stay continuous for all vendors and1/2/8 scoops',()=>{
 for(let vendor=0;vendor<4;vendor++)for(const count of[1,2,8])for(const interrupted of[false,true]){
  const f=makeVendorFlourishFixture(vendor,count),{w,d}=f,cone=w.conePivot;
  const context=`vendor${vendor}/${count}/${interrupted?'interrupted':'complete'}`;
  let returning=false,returnStart=0,finished=false,restoredAt=0,postFrames=0,previousTip=null,previousWrists=[],lastOwner=cone.parent,previousContact=Infinity;
  for(let frame=0;frame<800;frame++){
   if(!returning&&(interrupted?f.time>=2.25:d.vendorFlourish?.done)){returning=true;returnStart=f.time;}
   f.step(1/120,returning);w.scene.updateMatrixWorld(true);
   const tip=w.paddleContact.bladePoint(w),wrists=[w.rArmRig,w.lArmRig].map(r=>r.handRig.wristAnchor.getWorldPosition(V()));
   assert.equal(w.conePivot,cone);assert.equal(w.scoopMeshes.filter(s=>s.visible).length,count);
   if(previousTip&&!finished)assert.ok(tip.distanceTo(previousTip)<.085,`${context} tip discontinuity at${f.time}: ${tip.distanceTo(previousTip)}`);
   for(let side=0;side<2;side++){
    const rig=side?w.lArmRig:w.rArmRig;
    // Once the original fast spin resumes, its pole/right-hand speed belongs
    // to that show. Continue checking our new support-hand recovery and skin
    // clearance, without imposing a new gameplay animation speed limit.
    if(previousWrists[side]&&(!finished||side===1))assert.ok(wrists[side].distanceTo(previousWrists[side])<.080,`${context} wrist${side} at${f.time}: ${wrists[side].distanceTo(previousWrists[side])}`);
    if(frame%24===0||rig.armPose.penetration>.003){
      const probe=inspectVendorArmSurfaces(w,rig);assert.equal(probe.hits,0,`${context} side${side} at${f.time} skin clipping: ${JSON.stringify(probe.first)}`);
      const skin=inspectVendorHandSurfaces(w,rig);assert.equal(skin.hits,0,`${context} hand${side} at${f.time} enters body: ${JSON.stringify(skin.first)}`);
    }
   }
   if(lastOwner===w.lArmRig.handGroup&&cone.parent===w.paddleGroup){
    assert.ok(previousContact<.04,`${context} pole must contact the crown before transfer`);
    assert.equal(d.stageTimer,0,'presentation does not consume the waiting prompt');
    assert.ok(tip.distanceTo(previousTip)<.025,`${context} ownership change cannot snap the steel`);
    finished=true;restoredAt=f.time;
   }
   const top=w.paddleContact.highestVisible(w);
   previousContact=tip.distanceTo(top.localToWorld(V(0,top.geometry.parameters.radius,0)));
   previousTip=tip;previousWrists=wrists;lastOwner=cone.parent;
   if(finished&&++postFrames>=(count>4?240:60))break;
  }
  assert.ok(finished,`${context} returns ownership after contact`);assert.ok(restoredAt-returnStart<1.8,`${context} bounded return`);
  assert.equal(d.score,0);assert.equal(d.hearts,d.maxHearts);assert.equal(w.vendorPoleFree,false);
  assert.equal(w.vendorConeReceiveProgress,null);assert.equal(d.afkRejoin,null);
 }
});

test('moving during the receiving pose finishes its contact transition without a wrist snap',()=>{
 const f=makeVendorFlourishFixture(1,2),{w,d}=f;let previous=null,completed=false;
 while(f.time<2){
  f.step(1/120,f.time>.20);const wrist=w.lArmRig.handRig.wristAnchor.getWorldPosition(V());
  if(previous)assert.ok(wrist.distanceTo(previous)<.08);previous=wrist;
  if(f.time>.2&&!d.isAfkShowActive&&!d.afkRejoin&&!d.vendorFlourish){completed=true;break;}
 }
 assert.ok(completed);assert.equal(w.conePivot.parent,w.paddleGroup);assert.equal(d.stageTimer,0);
 assert.equal(w.vendorConeReceiveProgress,null);assert.equal(w.vendorConeReceiveFrom,null);
});

test('ordinary AFK exit after the flourish also contacts the food before transferring it',()=>{
 const f=makeVendorFlourishFixture(1,2),{w,d}=f;
 while(f.time<5&&!d.vendorFlourish?.done)f.step();
 f.step();assert.equal(d.afkScenario,0);assert.equal(w.conePivot.parent,w.lArmRig.handGroup);
 for(let i=0;i<12;i++)f.step();
 let previous=w.paddleContact.bladePoint(w),done=false;
 for(let i=0;i<120;i++){
  f.step(1/120,true);const next=w.paddleContact.bladePoint(w);
  assert.ok(next.distanceTo(previous)<.085);previous=next;
  if(!d.afkRejoin&&!d.isAfkShowActive){done=true;break;}
 }
 assert.ok(done);assert.equal(w.conePivot.parent,w.paddleGroup);assert.equal(w.vendorPoleFree,false);
});
