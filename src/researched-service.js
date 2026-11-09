import { MathUtils, Vector3 } from 'three';
import { shellViewport, projectShellTarget } from './shell-targeting.js';

export const WRIST_NEAR_MISS='WRIST_NEAR_MISS';
export const SCOOP_CONE_RELAY='SCOOP_CONE_RELAY';
export const EMPTY_WAFER_TOSS='EMPTY_WAFER_TOSS';
export const SCOOP_AIR_CATCH='SCOOP_AIR_CATCH';
export const RESEARCHED_SERVICE_IDS=Object.freeze([WRIST_NEAR_MISS,SCOOP_CONE_RELAY,EMPTY_WAFER_TOSS,SCOOP_AIR_CATCH]);
export const SERVICE_REFERENCES=Object.freeze({
 wrist:{title:'Kim et al. — observational features of human Turkish ice-cream performance, §III-C',url:'https://arxiv.org/html/2509.21776v1#S3.SS3',evidence:'The authors describe small wrist retractions as the customer approaches. Their robot policies are adaptations, not canonical folk trick names.'},
 relay:{title:'Christina, Daydream Tourist — Istanbul Ice Cream Show (firsthand account)',url:'https://daydreamtourist.com/2012/07/05/istanbul-ice-cream-show/',evidence:'The author describes ice cream moving back and forth over two cones and flipping away as the customer reaches.'},
 offers:{title:'For 91 Days — Catch the Ice Cream Cone (their own filming and account)',url:'https://for91days.com/videos/catch-the-ice-cream-cone-turkish-ice-cream-man-icecream/',evidence:'Their account describes repeated offers near the customer’s hand before the vendor finally releases the cone.'},
 toss:{title:'Galata Ice Cream & Desserts — Our Story (vendor account)',url:'https://d458ed000cb810c112e78e953b8935ff72a30b80.web.ordersave.com/story',evidence:'The vendor describes twisting, tossing and teasing cones. These catch challenges combine that vocabulary with existing cone/scoop separation; exact trajectories and rules are game-authored.'},
});
export const RESEARCHED_SERVICE_CATALOG=Object.freeze([
 {id:WRIST_NEAR_MISS,names:{tr:'Bilekten Son Anda',en:'A Small Wrist Feint'},descs:{tr:'Usta yaklaşan elini görünce iki küçük bilek hareketiyle külahı kaçırır. Son sakin teklif gerçekten tutulabilir.',en:'Two small wrist evasions react to a deliberate approach, then the serving settles for a genuine grab.'},icon:'🍦',difficulty:2,category:'reactive_service',unlockStage:4,provenance:'observed-movement-game-adaptation',sourceRefs:[SERVICE_REFERENCES.wrist.url,SERVICE_REFERENCES.offers.url],adaptation:'Two feints, timing, signals and touch rules are authored for the game.'},
 {id:SCOOP_CONE_RELAY,names:{tr:'Toplar Külah Değiştiriyor',en:'Ice Cream Changes Cones'},descs:{tr:'Aynı dondurma iki gerçek külah arasında geçer. Boş külah hazneye dönünce dolu külahı ustanın elinden al.',en:'The same ice cream passes between two real cones. Take the filled cone after the empty wafer returns to its holder.'},icon:'🍦',difficulty:3,category:'cone_transfer',unlockStage:8,provenance:'firsthand-movement-game-adaptation',sourceRefs:[SERVICE_REFERENCES.relay.url],adaptation:'The two-transfer sequence, paths and final catch window are authored for the game.'},
 {id:EMPTY_WAFER_TOSS,names:{tr:'Havadaki Boş Külah',en:'Catch the Flying Wafer'},descs:{tr:'Usta gerçek boş külahı kısa bir yayla atar. Havada tut; sonra dolu külahın altına geri geçir.',en:'The real empty wafer makes a short airborne turn. Catch it, then return it below the filled cone.'},icon:'🍦',difficulty:3,category:'airborne_wafer',unlockStage:5,provenance:'authored-service-challenge',sourceRefs:[SERVICE_REFERENCES.toss.url,SERVICE_REFERENCES.relay.url],adaptation:'An authored airborne catch and nesting challenge using documented toss and cone-transfer vocabulary; not a separately documented traditional name.'},
 {id:SCOOP_AIR_CATCH,names:{tr:'Topları Külahla Yakala',en:'Catch the Scoops in Your Cone'},descs:{tr:'Boş külah gerçekten elinde kalır. Ustanın attığı aynı dondurmayı külahın altında bekleyerek yakala.',en:'Keep the real bare cone and place it below the same airborne scoop stack to catch the ice cream.'},icon:'🍨',difficulty:4,category:'airborne_scoops',unlockStage:9,provenance:'authored-service-challenge',sourceRefs:[SERVICE_REFERENCES.toss.url,SERVICE_REFERENCES.relay.url],adaptation:'A game-authored catch challenge combining tosses with separation/reunion of the same serving. Catch timing is not a claim about a named traditional trick.'},
]);
export const researchedIdsForStage=stage=>RESEARCHED_SERVICE_CATALOG.filter(t=>t.unlockStage<=stage).map(t=>t.id);
export const isResearchedService=id=>RESEARCHED_SERVICE_IDS.includes(id);
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const ease=x=>{const t=MathUtils.clamp(x,0,1);return t*t*(3-2*t);};
const REST=V(-.18,1.28,-.08),OFFER=V(.025,1.24,.26),HAND=V(-.16,1.24,-.13),HAND_OFFER=V(.04,1.26,.17);
const point=(w,o)=>{w.scene.updateMatrixWorld(true);return o.getWorldPosition(V());};
const phase=(d,n)=>{d.subStep=n;d.stageTimer=0;d.stepCooldown=0;d.isGraspingPaddleCone=false;d.researchedService.from=d.coneWorldPos.clone();d.researchedService.transferred=false;};
const pose=(d,a,b,t)=>d.coneTargetPos.copy(a).lerp(b,ease(t));
const offeredPoint=d=>OFFER.clone().add(V(0,d.scoopCount>4?-(.06+Math.min(3,d.scoopCount-5)*.04):0,0));
const holdMain=(d,where=HAND)=>{d.leftHandCustomTarget=where.clone().add(V(0,-.10,-.025));};
function targetFor(d,object=d.world.conePivot){
 const w=d.world,position=point(w,object);
 if(!w.camera||!w.canvas)return{target:position};
 const viewport=shellViewport(w),p=projectShellTarget(w,object,viewport);
 return{target:position,screen:p.screen,viewport,visible:p.visible,radius:MathUtils.clamp(Math.min(viewport.width,viewport.height)*.095,27,43)};
}
function reach(d,key,object,input,dt){
 const target=targetFor(d,object);
 if(!target.screen)return d.gestureValidation.reach(key,input.intentPos.distanceTo(target.target),.27,dt);
 const s=input.gestureState,x=((s.aimNormX??s.normX)+1)*target.viewport.width*.5,y=(1-(s.aimNormY??s.normY))*target.viewport.height*.5;
 return d.gestureValidation.reach(key,target.visible?Math.hypot(x-target.screen.x,y-target.screen.y):Infinity,target.radius,dt);
}
function finish(d,score){d.heldItem=null;d.leftHandCustomTarget=null;d.shaftRoll=0;d.conePitchX=0;d.score+=score;d._spawnScorePopup(score,d.coneWorldPos,'🍦');d._vibrate?.(18);d._advanceRoutineStep();}
function takeMain(d,next){d.world.handoffCone('player');d.heldItem='RESEARCH_CONE';d.sound.playConePop?.(0);phase(d,next);}
function recoverMain(d,t){
 const s=d.researchedService,w=d.world;
 if(t<.38){const contact=point(w,w.conePivot).add(V(0,-.02,0));pose(d,s.from,contact,t/.38);d.presentationExact=true;}
 else {
  if(!s.transferred){w.handoffCone('paddle');d.heldItem=null;s.transferred=true;s.from=d.coneWorldPos.clone();}
  pose(d,s.from,REST,(t-.38)/.45);d.presentationExact=true;
 }
 return t>=.86;
}

export function enterResearchedService(d){
 if(!isResearchedService(d.currentMechanic))return false;
 d.researchedService={from:d.coneWorldPos.clone(),feints:0,transferred:false,evade:null,approach:null};
 d.world.updateIceCreamScoops(d.scoopCount,false);if(!d.world.stallEffects?.napkinRecovered)d.world.clearServingNapkin?.();d.world.carryScoop.visible=false;
 if(d.currentMechanic===SCOOP_CONE_RELAY){d.world.handoffOuterCone('nested',true);d.world.reuseEmptyCone?.(d.world.outerConeGroup);holdMain(d);}
 if(d.currentMechanic===EMPTY_WAFER_TOSS){d.world.handoffOuterCone('vendor',true);d.world.reuseEmptyCone?.(d.world.outerConeGroup);d.leftHandCustomTarget=V(-.20,1.22,-.10);d.researchedService.attempt=0;}
 if(d.currentMechanic===SCOOP_AIR_CATCH){holdMain(d);d.researchedService.attempt=0;}
 return true;
}
function updateWrist(d,dt,input){
 const s=d.researchedService,w=d.world,t=d.stageTimer,offered=offeredPoint(d);
 d.presentationExact=true;
 if(d.subStep===0){pose(d,s.from,offered,t/.55);d.shaftRoll=.04*Math.sin(t*3);if(t>=.55)phase(d,1);}
 else if(d.subStep===1){
  d.coneTargetPos.copy(offered);d.shaftRoll=0;d.conePitchX=.04;
  if(t<dt*1.5)s.approach={x:input.gestureState.normX||0,y:input.gestureState.normY||0};
  if(reach(d,`wrist-bait-${s.feints}`,w.conePivot,input,dt)){
   const dx=(input.gestureState.normX||0)-(s.approach?.x||0);
   const away=Math.abs(dx)>.025?-Math.sign(dx):s.feints%2===0?-1:1;
   s.evade=d.coneWorldPos.clone().add(V(away*.105,.035,-.065));s.turn=away*.28;s.feints++;
   phase(d,2);d.sound.playWhoosh?.(.48,s.evade.x);d._triggerVendorSpeech?.('eeeh');
  }
 }else if(d.subStep===2){pose(d,s.from,s.evade,t/.28);d.shaftRoll=s.turn*ease(t/.28);d.conePitchX=.05;if(t>=.48)phase(d,3);}
 else if(d.subStep===3){pose(d,s.from,offered,t/.40);d.shaftRoll=s.turn*(1-ease(t/.4));if(t>=.48)phase(d,s.feints<2?1:4);}
 else if(d.subStep===4){d.coneTargetPos.copy(offered);d.shaftRoll=0;d.conePitchX=.02;if(reach(d,'wrist-real-offer',w.conePivot,input,dt))takeMain(d,5);}
 else if(d.subStep===5){pose(d,s.from,REST,t/.42);if(t>=.48)phase(d,6);}
 else if(recoverMain(d,t))finish(d,320);
}
function alignOuterWithMain(d,offset=V(.22*(d.world.servingScale||1),.02,0)){
 const w=d.world,outer=point(w,w.outerConeGroup),main=point(w,w.conePivot);
 return main.add(offset).sub(outer.sub(d.coneWorldPos));
}
function transferScoops(d,to){d.world.setScoopPresentation(to);d.sound.playWaferSlide?.(d.coneWorldPos.x);d.world.triggerScoopJiggle?.(.45);}
function updateRelay(d,dt,input){
 const s=d.researchedService,w=d.world,t=d.stageTimer;
 d.shaftRoll=0;d.conePitchX=0;holdMain(d);
 if(d.subStep===0){
  if(!s.transferred){
   if(w.lArmRig?.handRig){
    if(!s.receiving){w.beginVendorConeReceive();s.receiving=true;}
    w.vendorConeReceiveProgress=Math.min(1,t/.3);
   }
   // Bring the nested pair to the actual, IK-constrained receiving hand first.
   // Only then keep the filled inner cone in that hand and the outer on the rod.
   w.scene.updateMatrixWorld(true);
   const grip=w.lArmRig.handGroup.localToWorld(V(0,.11,.035));
   const cone=point(w,w.conePivot),offset=cone.clone().sub(d.coneWorldPos);
   pose(d,s.from,grip.clone().sub(offset),t/.65);d.presentationExact=true;
   if(t>=.65&&cone.distanceTo(grip)<.04){
    s.entryContactDistance=cone.distanceTo(grip);w.handoffCone('vendor');w.handoffOuterCone('paddle',true);
    w.vendorConeReceiveProgress=null;w.vendorConeReceiveFrom=null;
    s.transferred=true;s.entryTransferAt=t;s.from=d.coneWorldPos.clone();d.sound.playWaferSlide?.(0);
   }
  }else{
   pose(d,s.from,V(.16,1.30,.08),(t-s.entryTransferAt)/.5);d.presentationExact=true;
   if(t-s.entryTransferAt>=.6)phase(d,1);
  }
 }
 else if(d.subStep===1){pose(d,s.from,alignOuterWithMain(d),t/.65);d.presentationExact=true;if(t>=.7){transferScoops(d,'outer');phase(d,2);}}
 else if(d.subStep===2){
  const out=V(.14,d.scoopCount>4?1.26:1.37,.06);pose(d,s.from,out,t/.75);d.coneTargetPos.y+=Math.sin(Math.min(1,t/.75)*Math.PI)*.06;d.presentationExact=true;
  if(t>=.9)phase(d,3);
 }else if(d.subStep===3){pose(d,s.from,alignOuterWithMain(d),t/.65);d.presentationExact=true;if(t>=.7){transferScoops(d,'cone');phase(d,4);}}
 else if(d.subStep===4){
  const rack=w.coneStackWorldPos?.clone()||V(-.65,1.18,-.60);pose(d,s.from,rack,t/.75);d.presentationExact=true;
  if(t>=.82){w.handoffOuterCone('nested',false);phase(d,5);}
 }else if(d.subStep===5){
  if(w.conePivot.parent!==w.lArmRig.handGroup)w.handoffCone('vendor');
  holdMain(d,HAND.clone().lerp(HAND_OFFER,ease(t/.55)));pose(d,s.from,REST,t/.45);d.presentationExact=true;
  if(t>.6&&reach(d,'relay-filled-cone',w.conePivot,input,dt))takeMain(d,6);
 }else if(d.subStep===6){d.leftHandCustomTarget=null;d.coneTargetPos.copy(REST);if(t>=.5)phase(d,7);}
 else {d.leftHandCustomTarget=null;if(recoverMain(d,t))finish(d,420);}
}
function looseProp(w,object){w.scene.updateMatrixWorld(true);w.scene.attach(object);if(object===w.outerConeGroup)w.stallEffects.outerMoving=false;else w.stallEffects.scoopMoving=false;}
const arc=(start,end,p,height)=>start.clone().lerp(end,p).add(V(0,4*height*p*(1-p),0));
function pointTarget(w,position){
 if(!w.camera||!w.canvas)return{target:position};
 const viewport=shellViewport(w),screen=w.projectToScreen(position);
 return{target:position,screen,viewport,visible:screen.x>12&&screen.x<viewport.width-12&&screen.y>40&&screen.y<viewport.height-50,radius:MathUtils.clamp(Math.min(viewport.width,viewport.height)*.09,27,43)};
}
function landingTarget(d){
 const w=d.world,s=d.researchedService;
 // Aim with the palm, allowing the real cone's offset above that palm. Merely
 // aligning a marker cannot catch food unless the actual cone is below it.
 const palm=point(w,w.playerAimAnchor||w.touristHand),offset=point(w,w.conePivot).sub(palm);
 return pointTarget(w,s.landing.clone().sub(offset));
}
function reachTarget(d,key,target,input,dt){
 if(!target.screen)return d.gestureValidation.reach(key,input.intentPos.distanceTo(target.target),.20,dt);
 const g=input.gestureState,x=((g.aimNormX??g.normX)+1)*target.viewport.width*.5,y=(1-(g.aimNormY??g.normY))*target.viewport.height*.5;
 return d.gestureValidation.reach(key,target.visible?Math.hypot(x-target.screen.x,y-target.screen.y):Infinity,target.radius,dt);
}

function updateWaferToss(d,dt,input){
 const w=d.world,s=d.researchedService,t=d.stageTimer;
 d.coneTargetPos.copy(REST);d.shaftRoll=0;d.conePitchX=0;
 if(d.subStep===0){
  d.leftHandCustomTarget=V(-.20,1.22,-.10);
  if(t>=.45){s.launch=point(w,w.outerConeGroup);s.landing=V(.16,1.23,.27);looseProp(w,w.outerConeGroup);phase(d,1);d.sound.playWhoosh?.(.45,-.1);}
 }else if(d.subStep===1){
  const p=Math.min(1,t/1.12);w.outerConeGroup.position.copy(arc(s.launch,s.landing,p,.22));w.outerConeGroup.rotation.set(.08,0,Math.PI*2*p);d.leftHandCustomTarget=null;
  if(p>.30&&p<.94&&reach(d,`flying-wafer-${s.attempt}`,w.outerConeGroup,input,dt)){
   w.handoffOuterCone('player',true);d.heldItem='TOSSED_WAFER';phase(d,2);d.sound.playConePop?.(.1);
  }else if(p>=1){s.recovery=point(w,w.outerConeGroup);s.attempt++;phase(d,5);}
 }else if(d.subStep===2){
  pose(d,s.from,OFFER,t/.32);
  if(t>.35&&reach(d,'nest-caught-wafer',w.conePivot,input,dt)){w.handoffOuterCone('nested',true);d.heldItem=null;phase(d,3);d.sound.playWaferSlide?.(0);}
 }else if(d.subStep===3){
  d.coneTargetPos.copy(OFFER);
  if(t>.35&&reach(d,'wafer-final-filled',w.conePivot,input,dt))takeMain(d,4);
 }else if(d.subStep===4){if(recoverMain(d,t))finish(d,380);}
 else {
  const receive=point(w,w.lArmRig.handGroup).add(V(0,.11,.035));d.leftHandCustomTarget=V(-.20,1.22,-.10);
  w.outerConeGroup.position.copy(s.recovery).lerp(receive,ease(t/.42));w.outerConeGroup.rotation.z=Math.PI*2;
  if(t>=.45){w.handoffOuterCone('vendor',true);phase(d,0);}
 }
}

function updateAirScoops(d,dt,input){
 const w=d.world,s=d.researchedService,t=d.stageTimer;d.shaftRoll=0;d.conePitchX=0;
 if(d.subStep===0){
  holdMain(d);
  if(w.lArmRig?.handRig){
   if(!s.receiving){w.beginVendorConeReceive();s.receiving=true;}
   w.vendorConeReceiveProgress=Math.min(1,t/.3);
  }
  w.scene.updateMatrixWorld(true);
  const grip=w.lArmRig.handGroup.localToWorld(V(0,.11,.035)),cone=point(w,w.conePivot),offset=cone.clone().sub(d.coneWorldPos);
  pose(d,s.from,grip.clone().sub(offset),t/.48);d.presentationExact=true;
  if(t>=.48&&cone.distanceTo(grip)<.04){w.handoffCone('vendor');w.vendorConeReceiveProgress=null;w.vendorConeReceiveFrom=null;w.setScoopPresentation('paddle');phase(d,1);}
 }else if(d.subStep===1){
  holdMain(d,HAND.clone().lerp(HAND_OFFER,ease(t/.36)));pose(d,s.from,V(-.12,1.44,.09),t/.38);d.presentationExact=true;
  if(t>.45&&reach(d,'take-air-bare-cone',w.conePivot,input,dt)){takeMain(d,2);d.heldItem='AIR_CATCH_CONE';}
 }else if(d.subStep===2){
  d.leftHandCustomTarget=null;d.coneTargetPos.copy(V(-.12,1.44,.09));
  if(t>=.35){s.launch=point(w,w.scoopStackGroup);s.landing=V(.14,1.24,.26);w.scoopInFlight=true;looseProp(w,w.scoopStackGroup);phase(d,3);d.sound.playWhoosh?.(.50,-.1);}
 }else if(d.subStep===3){
  const p=Math.min(1,t/1.20);w.scoopStackGroup.position.copy(arc(s.launch,s.landing,p,.18));w.scoopStackGroup.rotation.z=Math.sin(p*Math.PI)*.20;
  d.coneTargetPos.copy(s.landing).add(V(0,.19,-.14));d.presentationExact=true;
  const linedUp=reachTarget(d,`air-landing-${s.attempt}`,landingTarget(d),input,dt);
  if(p>=.82&&linedUp&&point(w,w.conePivot).distanceTo(s.landing)<.14){
   w.scoopInFlight=false;w.setScoopPresentation('cone');phase(d,4);d.sound.playIcePop?.(.1);w.triggerScoopJiggle?.(.5);
  }else if(p>=1){w.scoopInFlight=false;w.setScoopPresentation('paddle',s.landing);s.attempt++;phase(d,6);}
 }else if(d.subStep===4){d.coneTargetPos.copy(REST);if(t>=.32)phase(d,5);}
 else if(d.subStep===5){if(recoverMain(d,t))finish(d,440);}
 else {
  // On a miss the vendor collects the very same stack, then repeats the toss.
  d.coneTargetPos.copy(s.landing);d.presentationExact=true;
  if(t>=.30){w.setScoopPresentation('paddle');phase(d,2);}
 }
}
export function updateResearchedService(d,dt,time,input){
 if(!isResearchedService(d.currentMechanic))return false;
 if(d.currentMechanic===WRIST_NEAR_MISS)updateWrist(d,dt,input);
 else if(d.currentMechanic===SCOOP_CONE_RELAY)updateRelay(d,dt,input);
 else if(d.currentMechanic===EMPTY_WAFER_TOSS)updateWaferToss(d,dt,input);
 else updateAirScoops(d,dt,input);
 return true;
}
const safeFeintProgress=d=>(d.researchedService?.feints||0)*.35;
export function researchedServiceCue(d){
 if(!isResearchedService(d.currentMechanic))return null;
 const tr=d.save?.lang==='tr';
 if(d.currentMechanic===EMPTY_WAFER_TOSS){
  if(d.subStep===1)return{kind:'reach',...targetFor(d,d.world.outerConeGroup),badgeText:tr?'HAVADA TUT':'CATCH THE WAFER',progress:.2};
  if(d.subStep===2)return{kind:'reach',...targetFor(d),badgeText:tr?'ALTINA GEÇİR':'NEST THE WAFER',progress:.5};
  if(d.subStep===3)return{kind:'reach',...targetFor(d),badgeText:tr?'ŞİMDİ DOLUYU TUT':'TAKE THE FILLED CONE',progress:.8};
  return{kind:'wait',quiet:true,target:d.coneWorldPos,badgeText:tr?'İZLE':'WATCH',progress:0};
 }
 if(d.currentMechanic===SCOOP_AIR_CATCH){
  if(d.subStep===1)return{kind:'reach',...targetFor(d),badgeText:tr?'KÜLAHI AL':'TAKE THE CONE',progress:.2};
  if(d.subStep===3)return{kind:'reach',...landingTarget(d),badgeText:tr?'KÜLAHI ALTINA GETİR':'CATCH WITH YOUR CONE',progress:.55};
  return{kind:'wait',quiet:true,target:d.coneWorldPos,badgeText:tr?'İZLE':'WATCH',progress:d.subStep>=4?.9:0};
 }
 const p=d.subStep,awaiting=d.currentMechanic===WRIST_NEAR_MISS?[1,4].includes(p):p===5;
 if(d.currentMechanic===WRIST_NEAR_MISS&&[2,3].includes(p))return{kind:'pull',target:d.coneWorldPos,badgeText:d.save?.lang==='tr'?'ÇEK, YENİDEN UZAT':'WITHDRAW, REACH AGAIN',progress:safeFeintProgress(d)};
 if(awaiting)return{kind:'reach',...targetFor(d),badgeText:d.currentMechanic===WRIST_NEAR_MISS?(d.save?.lang==='tr'?(p===4?'ŞİMDİ TUT':'YAKLAŞ'):(p===4?'GRAB NOW':'REACH IN')):null,progress:d.currentMechanic===WRIST_NEAR_MISS?safeFeintProgress(d):.8};
 return{kind:'wait',quiet:true,badgeText:d.currentMechanic===WRIST_NEAR_MISS?(d.save?.lang==='tr'?'BEKLE':'WAIT'):(d.save?.lang==='tr'?'TOPLARI İZLE':'FOLLOW THE SCOOPS'),target:d.coneWorldPos,progress:Math.min(.95,p/8)};
}
export function researchedServicePlaying(d){return isResearchedService(d.currentMechanic)&&researchedServiceCue(d)?.kind==='wait';}
