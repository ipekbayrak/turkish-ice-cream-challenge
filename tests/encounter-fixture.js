import * as THREE from 'three';
import {GameWorld} from '../src/world.js';
import {TrickDirector} from '../src/tricks.js';
import {SpringVec3,StretchyDondurmaStrand,RigidBodyManager} from '../src/physics.js';
import {StallEffects} from '../src/stall-effects.js';
import {EncounterCamera} from '../src/encounter-camera.js';
import {PointerTipView} from '../src/touch-arm-view.js';
import {poleGripRenderTarget} from '../src/cone-grip.js';
import {paperReturnHandTarget} from '../src/napkin-return.js';
import {getStageConfig} from '../src/protocol.js';
import {RoutinePreviewDriver,seededPreviewRandom} from './routines-driver.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),noop=()=>{};

/** Actual gameplay geometry/IK/physics, without WebGL or unrelated scenery.
 * No actor/prop teleports, fake arm solve, gesture bypass or skipped phase. */
export function makeEncounterFixture({width=394,height=853,Driver=RoutinePreviewDriver,world:providedWorld=null}={}){
 if(typeof document==='undefined')globalThis.window={innerWidth:width,innerHeight:height};
 const w=providedWorld||Object.create(GameWorld.prototype);
 if(!providedWorld){w.scene=new THREE.Scene();w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();
 w.canvas={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>({width,height})};
 w.camera=new THREE.PerspectiveCamera(64,width/height,.05,40);w.baseCamPos=V(0,1.45,1.55);w.camera.position.copy(w.baseCamPos);
 w.handSpring=new SpringVec3(.22,1.08,.62,135,18);w.coneSpring=new SpringVec3(0,1.24,.22,72,15);
 w.scoopJiggleSpring=new SpringVec3(0,0,0,220,14);w.leftPropSpring=new SpringVec3(.24,1.22,-.25,88,16);w.prevConePos=V(0,1.24,.22);
 Object.assign(w,{blinkTimer:2.5,isBlinking:false,vendorMood:'smile',spectatorReactionTimer:0,spectatorReactionType:'idle',spectators:[],frostMotes:[],lanterns:[],bells:[],particles:[]});
 w._buildIceCreamCart();w._buildPaddleAndCones();w._buildVendor();w._buildTouristPOVHand();w._buildDiegetic3DCues();
 w.stretchyStrand=new StretchyDondurmaStrand(w.scene,14);w.rigidBodies=new RigidBodyManager(w.scene);w.stallEffects=new StallEffects(w);}
 const cam=new EncounterCamera(w);w.encounterCamera=cam;cam.setPhase('play',true);
 const sound=new Proxy({},{get:(target,key)=>target[key]??noop});
 const save={lang:'tr',data:{unlockedStage:46,preferredScoopCount:2,preferredFlavors:[0,1,2,3]},hapticsEnabled:false,t:k=>k,discoverTrick:noop,setOrderPreferences:noop,recordStageResult:(_stage,_score,_stars,won)=>{outcome=won?'MASTER_CATCH':'FAILED';},getStageBestScore:()=>0,getUstaName:()=>'',getTrickInfo:id=>({name:id})};
 const events=[];let outcome=null,time=0;
 const d=new TrickDirector(w,sound,save,{onTrickStart:e=>events.push(e),onRoundEnd:noop});
 const driver=new Driver(d,w),tip=new PointerTipView(w),grip=V(),target=V(),paperTarget=V(),rawTarget=V();
 function reset({id,vendor=0,count=2,pace=1,seed=71931,campaign=false,forceFeint=false}={}){
  outcome=null;time=0;events.length=0;
  const oldRandom=Math.random;Math.random=seededPreviewRandom(seed);
  try{
   d.setOrderConfig(count,Array.from({length:12},(_,i)=>(i+vendor)%4),46);d.resetRound(46,false);
   // Isolated catalog cases; random flavor overlay is exercised in campaign replays.
   d.flavorFeintRandom=campaign?(forceFeint?()=>0:undefined):()=>1;
   d.config={...getStageConfig(pace),ustaId:vendor};
   w.setVendorCharacter(vendor);w.setServingScale(Math.max(d.config.scoopScale??1,count>4?1.18:1));
   const opening=campaign||['CUSTOMER_MOLD_MOUNT','CUSTOMER_SCOOP_SHOW'].includes(id);
   d.scoopCount=opening?0:count;w.updateIceCreamScoops(d.scoopCount);w.updateServingLayout(1);
   if(opening){w.handoffCone('player');w.stallEffects.update(1);}
   if(!campaign)d.routine=id==='SCRAPE_FLAVOR_SCOOP'?Array.from({length:count},()=>id).concat('FINAL_PISTACHIO_CATCH'):[id,'FINAL_PISTACHIO_CATCH'];
   if(id==='SCRAPE_FLAVOR_SCOOP'){d.scoopCount=0;w.updateIceCreamScoops(0);}
   if(id==='FINAL_PISTACHIO_CATCH')d.routine=[id];
   driver.setTouchMode(true);driver.safePlay=campaign;w.playerPointerActive=false;w.handSpring.pos.set(.26,1,.42);w.handSpring.target.copy(w.handSpring.pos);w.handSpring.vel.set(0,0,0);
   w.updateTouristHand(w.handSpring.pos,.14,0,1/60,false,0);cam.setPhase('play',true);
   d.startRound({customerCone:campaign});
  }finally{Math.random=oldRandom;}
 }
 function tick(dt=1/30,{drive=true}={}){
  time+=dt;const s=drive?driver.update(dt):driver.input;s.frameTime=time;
  const active=Boolean(s.isPointerDown||s.isMouseHover);
  if(d.isGraspingPaddleCone){target.copy(d.coneWorldPos).add(V(0,-.03,.04));s.handWorldPos.lerp(target,Math.min(1,dt*18));}
  else if(active)s.handWorldPos.copy(s.intentWorldPos);
  else if(!d.heldItem&&w.conePivot.parent!==w.heldSocket)s.handWorldPos.lerp(V(.26,1,.42),Math.min(1,dt*18));
  s.grabCurl=THREE.MathUtils.lerp(s.grabCurl||.14,d.isGraspingPaddleCone||d.heldItem?.length?.98:active?.36:.14,Math.min(1,dt*14));
  w.playerPointerActive=active;w.setPlayerConeGrip(d.isGraspingPaddleCone);
  rawTarget.copy(s.handWorldPos);
  const rendered=d.isGraspingPaddleCone&&w.conePivot.parent===w.paddleGroup?poleGripRenderTarget(w,rawTarget,d.coneWorldPos,grip):rawTarget;
  w.updateTouristHand(paperReturnHandTarget(d,rendered,paperTarget),s.grabCurl,0,dt,active&&!d.isGraspingPaddleCone,time);
  d.update(dt,time,s);w.updateEnvironmentAnimations(time,dt);cam.update(dt);
  tip.update(active,s.pointerX,s.pointerY,w.canvas.clientWidth,w.canvas.clientHeight,s.pointerType||'touch',!d.isGraspingPaddleCone&&!d.roundEnded&&!d.paperReturnPose);
 }
 function state(){
  const p=d.paperReturnPose,c=w.conePivot.getWorldPosition(V()),paper=w.servingNapkin.getWorldPosition(V());
  const owner=o=>o.parent===w.heldSocket?'player':o.parent===w.paddleGroup?'pole':o.parent===w.lArmRig.handGroup?'vendor':o.parent===w.conePivot?'cone':o.parent===w.outerConeGroup?'outer':'scene';
  return{time:+time.toFixed(3),scale:w.servingScale,mechanic:d.currentMechanic,step:d.subStep,routineIndex:d.routineIndex,flavorPhase:d.flavorFeintShow?.phase,component:d.choreography?.index,held:d.heldItem,action:driver.mode,score:d.score,hearts:d.hearts,outcome,
   transition:d.trickTransition?'pose':d.servingHandoff?`handoff:${d.servingHandoff.owner}`:d.entryPaperPreparation?`paper:${d.entryPaperPreparation.phase}`:d.choreography?.bridge?'bridge':null,
   paper:p?{phase:p.phase,age:+p.age?.toFixed(3),waiting:p.waiting,gap:+paper.distanceTo(w.conePivot.localToWorld(V(0,-.065,0))).toFixed(4)}:null,
   coneOwner:owner(w.conePivot),paperOwner:w.servingNapkin.visible?owner(w.servingNapkin):'hidden',cone:c.toArray().map(n=>+n.toFixed(4)),intent:driver.input.intentWorldPos.toArray().map(n=>+n.toFixed(4))};
 }
 return{w,d,driver,tip,events,cam,reset,tick,state,get time(){return time;},get outcome(){return outcome;}};
}
