import {scrapeServing,scrapeBladePoint} from './scrape-serving.js';
import {NapkinReturn,napkinReturnCue} from './napkin-return.js';
import { Vector3, MathUtils } from 'three';
import { shellViewport, projectShellTarget } from './shell-targeting.js';
import { surfaceStrikePath, scoopPath } from './trick-motion.js';

/** User-authored service sequences. All phases move the one existing serving. */
export const CUSTOMER_MOLD = 'CUSTOMER_MOLD_MOUNT';
export const CUSTOMER_SCOOP = 'CUSTOMER_SCOOP_SHOW';
export const HAND_INVERT = 'HAND_INVERTED_OFFER';
export const HAND_PAPER = 'HAND_NAPKIN_OFFER';
export const CUSTOMER_SERVICE_IDS = Object.freeze([CUSTOMER_MOLD,CUSTOMER_SCOOP,HAND_INVERT,HAND_PAPER]);
export const CUSTOMER_SERVICE_CATALOG = [
 [CUSTOMER_MOLD,'Kalıp Senin Külahında','The Mold on Your Cone','Kovadan çıkan bütün kalıp senin tuttuğun külaha oturur; usta aynı kalıbı geri alıp haznesine bırakır.'],
 [CUSTOMER_SCOOP,'Tık Tık, El Değiştir','Tap, Tap, Change Hands','Boş çubuk masada iki vuruş yapar; sonra ilk top alınır, külahın dolar ve çubuğa geçer. Seçtiysen ikinci top eklenir; el ve çubuk arasında gerçek devirlerle servis sürer.'],
 [HAND_INVERT,'Elden Ters Teklif','The Inverted Hand Offer','Usta eliyle uzattığı dolu külahı düşürür gibi ters çevirir, sonra düzeltip gerçek teklifi yapar.'],
 [HAND_PAPER,'Elden Peçete Şakası','Paper from the Vendor’s Hand','Eliyle uzatılan sarılı külahın peçetesini tutarsın; dolu külah geri çekilirken aynı kâğıt elinde kalır.'],
].map(([id,tr,en,description])=>({id,names:{tr,en},descs:{tr:description,en:'An authored service sequence using the same cone, scoops and serving paper.'},icon:'🍦',difficulty:id===CUSTOMER_SCOOP?3:2,category:'hand_service',provenance:'user-authored-service-combination'}));
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const ease=x=>{const p=MathUtils.clamp(x,0,1);return p*p*(3-2*p);};
const blend=(out,from,to,t)=>out.copy(from).lerp(to,ease(t));
const POLE_REST=V(-.25,1.28,-.12), VENDOR_BACK=V(.18,1.24,-.23), VENDOR_OFFER=V(.12,1.25,.18);
const rootPoint=(w,o)=>{w.scene.updateMatrixWorld(true);return o.getWorldPosition(V());};
const conePoint=d=>rootPoint(d.world,d.world.conePivot);
const topPoint=d=>d.world.getScoopAnchor(Math.max(0,d.scoopCount-1));
const phase=(d,n)=>{d.subStep=n;d.stageTimer=0;d.stepCooldown=0;d.customerService.from=d.coneWorldPos.clone();d.customerService.transferred=false;};
const owner=(d,name)=>{const w=d.world;return w.conePivot.parent===(name==='player'?w.heldSocket:name==='vendor'?w.lArmRig.handGroup:w.paddleGroup);};
function handoff(d,name){if(!owner(d,name))d.world.handoffCone(name);d.heldItem=name==='player'?'CUSTOMER_CONE':null;}
function vendorHand(d,target=VENDOR_OFFER){d.leftHandCustomTarget=target.clone().add(V(0,-.10,-.025));}
function poleTo(d,target){d.world.vendorPoleFree=false;d.coneTargetPos.copy(target);d.presentationExact=true;d.shaftRoll=0;d.conePitchX=0;}
function wrap(d,ownerName='vendor',peel=0){d.world.setServingNapkin?.({owner:ownerName,peel,visible:true});}
function reward(d,n=300,icon='🍦'){d.score+=n;d._spawnScorePopup(n,conePoint(d),icon);d._vibrate(25);}
function finish(d,n=300){d.world.coneHandTiltZ=0;d.world.carryScoop.visible=false;d.carryScoopOffsetY=null;reward(d,n);d._advanceRoutineStep();}

/** The visible object is the pick target; vendor hand IK may lie behind the input plane. */
export function customerServiceTarget(d,object=d.world.conePivot){
 const w=d.world,point=rootPoint(w,object);
 if(!w.camera||!w.canvas)return{target:point};
 const viewport=shellViewport(w),projected=projectShellTarget(w,object,viewport);
 return{target:point,screen:projected.screen,viewport,visible:projected.visible,radius:MathUtils.clamp(Math.min(viewport.width,viewport.height)*.1,26,44)};
}
export function reachVisibleService(d,key,object,input,dt){
 const target=customerServiceTarget(d,object);
 if(!target.screen)return d.gestureValidation.reach(key,input.intentPos.distanceTo(target.target),.28,dt);
 const s=input.gestureState,x=((s.aimNormX??s.normX)+1)*target.viewport.width*.5,y=(1-(s.aimNormY??s.normY))*.5*target.viewport.height;
 return d.gestureValidation.reach(key,target.visible?Math.hypot(x-target.screen.x,y-target.screen.y):Infinity,target.radius,dt);
}
const reach=reachVisibleService;
function beginScoop(d,index){
 const s=d.customerService,w=d.world,f=d._getFlavorForScoop(index);
 s.index=index;s.flavor=f;s.tub=d._getTubWorldPosForScoop(index);s.from=scrapeBladePoint(w);
 w.carryScoop.material.color.setHex(f.colorHex);w.carryScoop.scale.setScalar(w.servingScale||1);
 d.carryScoopOffsetY=(w.carryScoop.geometry?.parameters?.radius||.064)*(w.servingScale||1);
}
function pickup(d,t,duration=.75){
 const s=d.customerService,w=d.world,lift=s.tub.clone().add(V(0,.28,.04));
 // Pickup stops at the lift, then the existing deposit phase moves to the cone.
 const p=Math.min(.69,(t/duration)*.69);
 scrapeServing(d,{progress:p,start:s.from,tub:s.tub,deposit:lift,color:s.flavor.colorHex,radius:d.carryScoopOffsetY||.064});
 w.churnTubIceCream?.(s.flavor.index,.045);

}
function tapTwice(d,t,keyPrefix){
 const s=d.customerService,w=d.world,beat=Math.min(1,Math.floor(t/.5)),p=Math.min(.999,(t-beat*.5)/.5);
 const contact=w.getCounterStrikeTarget?.(beat===0?-.13:.08)||V(0,1.05,.27);
 const key=`${keyPrefix}:${beat}`;
 if(s.tapKey!==key){s.tapKey=key;s.tapStart=w.getPaddleStrikePoint(V());}
 const tip=surfaceStrikePath(p,s.tapStart,contact,.12);
 const offset=w.getPaddleStrikePoint(V()).sub(w.paddleGroup.position);
 poleTo(d,tip.clone().sub(offset));d.presentationStrikeTip=tip;
 w.vendorPoleFree=true;
 if(p>=.48&&p<.68&&d.lastAfkContactKey!==key)d.presentationSurface={kind:'counter',point:contact,key,beat,power:.7};
}
function deposit(d,t,index){
 const w=d.world,s=d.customerService,destination=w.getScoopAnchor(index).clone();
 destination.y-=d.carryScoopOffsetY||.035;
 blend(d.coneTargetPos,s.from,destination,t/.55);d.presentationExact=true;w.carryScoop.visible=t<.5;
 if(t>=.5){d.scoopCount=Math.max(d.scoopCount,index+1);w.updateIceCreamScoops(d.scoopCount,false);w.carryScoop.visible=false;}
}
function recoverToPole(d,t,duration=.8){
 d.world.vendorPoleFree=false;
 const s=d.customerService;
 if(t<duration*.5){blend(d.coneTargetPos,s.from,topPoint(d),t/(duration*.5));d.presentationExact=true;}
 else{
  if(!s.transferred){handoff(d,'paddle');s.from=d.coneWorldPos.clone();s.transferred=true;}
  blend(d.coneTargetPos,s.from,POLE_REST,(t-duration*.5)/(duration*.5));d.presentationExact=true;
 }
}

export function enterCustomerService(d){
 if(!CUSTOMER_SERVICE_IDS.includes(d.currentMechanic))return false;
 const w=d.world;d.customerService={from:d.coneWorldPos.clone(),transferred:false,tapKey:null};d.world.coneHandTiltZ=0;d.carryScoopOffsetY=null;
 w.updateIceCreamScoops(d.scoopCount,false);if(!w.stallEffects?.napkinRecovered)w.clearServingNapkin?.();
 if([CUSTOMER_MOLD,CUSTOMER_SCOOP].includes(d.currentMechanic)){
  handoff(d,'player');d.heldItem='CUSTOMER_CONE';
  if(d.currentMechanic===CUSTOMER_MOLD){d.customerService.flavor=d._getFlavorForScoop(0);d.customerService.tub=d._getTubWorldPosForScoop(0);w.setGiantBlockColor(d.customerService.flavor.colorHex);}
  else beginScoop(d,0);
 }else{
  vendorHand(d,conePoint(d));handoff(d,'vendor');
  if(d.currentMechanic===HAND_PAPER)wrap(d);
 }
 return true;
}

function updateMold(d,dt){
 const s=d.customerService,w=d.world,t=d.stageTimer,tub=s.tub;
 if(d.subStep===0){
  const position=tub.clone().add(V(Math.sin(t*12)*.055,.03,-Math.cos(t*12)*.035));
  blend(d.coneTargetPos,s.from,position,t/.3);d.shaftRoll=Math.sin(t*16)*.3;d.presentationExact=true;w.churnTubIceCream?.(s.flavor.index,dt*2);
  if(t>=.8)phase(d,1);
 }else if(d.subStep===1){
  const start=w.getTubMoldSeat(s.flavor.index),high=tub.clone().add(V(0,.42,0));
  const position=start.lerp(high,ease(t/.7));w.setMoldPresentation({mode:'block',tubIndex:s.flavor.index,position});
  poleTo(d,position.clone().add(V(0,-w.giantBlockHeight*.32,0)));
  if(t>=.7){s.moldFrom=position.clone();phase(d,2);}
 }else if(d.subStep===2){
  const cap=conePoint(d).add(V(0,.035+w.giantBlockHeight*.5,0));const position=s.moldFrom.clone().lerp(cap,ease(t/.6));
  w.setMoldPresentation({mode:'block',tubIndex:s.flavor.index,position});poleTo(d,position.clone().add(V(0,-w.giantBlockHeight*.32,-.03)));
  if(t>=.6){w.setMoldPresentation({mode:'cone-cap',tubIndex:s.flavor.index});phase(d,3);d._triggerVendorSpeech('giant');}
 }else if(d.subStep===3){
  w.setMoldPresentation({mode:'cone-cap',tubIndex:s.flavor.index});poleTo(d,conePoint(d).add(V(0,.11,-.03)));
  if(t>=.75){s.moldFrom=rootPoint(w,w.giantBlockGroup);phase(d,4);}
 }else{
  const over=tub.clone().add(V(0,.30,0)),inside=w.getTubMoldSeat(s.flavor.index);
  const position=t<.5?s.moldFrom.clone().lerp(over,ease(t/.5)):over.clone().lerp(inside,ease((t-.5)/.45));
  w.setMoldPresentation({mode:'block',tubIndex:s.flavor.index,position});poleTo(d,position.clone().add(V(0,-w.giantBlockHeight*.32,0)));
  if(t>=.95){w.clearMoldPresentation();w.tubIceGroups[s.flavor.index].fill=1;finish(d,180);}
 }
}
function updateScoopShow(d,dt,input){
 const s=d.customerService,w=d.world,t=d.stageTimer;
 d.conePitchX=0;d.shaftRoll=0;
 switch(d.subStep){
  case 0:w.carryScoop.visible=false;tapTwice(d,t,'scoop-taps');if(t>=1){beginScoop(d,0);phase(d,1);}break;
  case 1:pickup(d,t);if(t>=.75)phase(d,2);break;
  case 2:deposit(d,t,0);if(t>=.6)phase(d,3);break;
  case 3:recoverToPole(d,t);if(t>=.8)phase(d,4);break;
  case 4:{
   const to=V(.05,1.24,.27);blend(d.coneTargetPos,POLE_REST,to,t/.5);d.shaftRoll=Math.PI*2*ease(t/.6);
   if(t>.55)d.coneTargetPos.lerp(POLE_REST,ease((t-.55)/.4));
   if(t>=.95){if(d.targetScoopCount>1){handoff(d,'vendor');vendorHand(d,VENDOR_BACK);beginScoop(d,1);phase(d,5);}else phase(d,7);}
   break;
  }
  case 5:vendorHand(d,VENDOR_BACK);pickup(d,t);if(t>=.75)phase(d,6);break;
  case 6:vendorHand(d,VENDOR_BACK);deposit(d,t,1);if(t>=.6)phase(d,7);break;
  case 7:
   vendorHand(d,VENDOR_BACK.clone().lerp(VENDOR_OFFER,ease(t/.55)));
   if(!s.transferred){handoff(d,'vendor');s.transferred=true;}
   poleTo(d,topPoint(d));
   if(t>.6&&reach(d,'hand-with-pole',w.conePivot,input,dt)){handoff(d,'player');phase(d,8);d.sound.playConePop();}break;
  case 8:
   poleTo(d,topPoint(d));if(t>=.65)phase(d,9);break;
  case 9:recoverToPole(d,t);if(t>=.8)phase(d,10);break;
  case 10:
   vendorHand(d,VENDOR_BACK);if(!s.transferred){handoff(d,'vendor');s.transferred=true;}
   blend(d.coneTargetPos,s.from,POLE_REST,t/.5);if(t>=.5)phase(d,11);break;
  case 11:vendorHand(d,VENDOR_BACK);w.carryScoop.visible=false;tapTwice(d,t,'bare-pole-taps');if(t>=1)phase(d,12);break;
  case 12:
   vendorHand(d,VENDOR_BACK.clone().lerp(VENDOR_OFFER,ease(t/.55)));d.coneTargetPos.copy(POLE_REST);
   if(t>.55&&reach(d,'bare-hand-offer',w.conePivot,input,dt)){handoff(d,'player');phase(d,13);d.sound.playConePop();}break;
  case 13:d.coneTargetPos.copy(POLE_REST);if(t>=.85)phase(d,14);break;
  case 14:recoverToPole(d,t);if(t>=.8)finish(d,400);break;
 }
}
function updateHandInvert(d,dt,input){
 const w=d.world,t=d.stageTimer;
 d.coneTargetPos.copy(POLE_REST);
 if(d.subStep===0){vendorHand(d,VENDOR_BACK.clone().lerp(VENDOR_OFFER,ease(t/.6)));if(t>=.6)phase(d,1);}
 else if(d.subStep===1){
  const p=ease(t/.6);vendorHand(d,VENDOR_OFFER.clone().add(V(.10*Math.sin(p*Math.PI),-.09*Math.sin(p*Math.PI),-.12*Math.sin(p*Math.PI))));
  w.coneHandTiltZ=Math.sin(p*Math.PI)*Math.PI*.92;
  if(t>=.6){w.coneHandTiltZ=0;phase(d,2);d._triggerVendorSpeech('hoppa');}
 }else if(d.subStep===2){
  vendorHand(d,VENDOR_OFFER);if(reach(d,'upright-hand-offer',w.conePivot,input,dt)){handoff(d,'player');phase(d,3);d.sound.playConePop();}
 }else if(d.subStep===3){if(t>=.65)phase(d,4);}
 else {recoverToPole(d,t);if(t>=.8)finish(d,280);}
}
function updateHandPaper(d,dt,input){
 const w=d.world,t=d.stageTimer;
 if(d.subStep===0){vendorHand(d,VENDOR_BACK.clone().lerp(VENDOR_OFFER,ease(t/.6)));wrap(d);d.coneTargetPos.copy(POLE_REST);if(t>=.6)phase(d,1);}
 else if(d.subStep===1){
  vendorHand(d,VENDOR_OFFER);d.coneTargetPos.copy(POLE_REST);
  if(reach(d,'paper-pinch',w.servingNapkin,input,dt)){wrap(d,'player',1);d.heldItem='HAND_PAPER';phase(d,2);d.sound.playPaperRustle?.();}
 }else if(d.subStep===2){
  if(!d.customerService.paperPulled){vendorHand(d,VENDOR_OFFER);d.coneTargetPos.copy(POLE_REST);d.idleSeconds=0;if(d.gestureValidation.pull('hand-paper-pull')){d.customerService.paperPulled=true;d.stageTimer=0;}return;}
  vendorHand(d,VENDOR_OFFER.clone().lerp(VENDOR_BACK,ease(t/.55)));d.coneTargetPos.copy(POLE_REST);
  if(t>=.75)phase(d,3);
 }else if(d.subStep===3){
  const s=d.customerService;
  if(!s.paperReturn){
   vendorHand(d,VENDOR_BACK);recoverToPole(d,t,.28);
   if(t>=.28)s.paperReturn=new NapkinReturn(d,{retreat:false});
  }else{
   d.coneTargetPos.copy(POLE_REST);
   if(s.paperReturn.update(d,input.realDt??dt)){
    // The hand is already under this same cone after wrapping the sheet.
    handoff(d,'vendor');w.vendorPoleFree=true;phase(d,4);
   }
  }
 }else if(d.subStep===4){
  vendorHand(d,VENDOR_BACK.clone().lerp(VENDOR_OFFER,ease(t/.5)));d.coneTargetPos.copy(POLE_REST);
  if(t>.5&&reach(d,'paper-real-cone',w.conePivot,input,dt)){handoff(d,'player');phase(d,5);d.sound.playConePop();}
 }else if(d.subStep===5){if(t>=.7)phase(d,6);}
 else {recoverToPole(d,t);if(t>=.8)finish(d,300);}
}

export function updateCustomerService(d,dt,time,input){
 if(!CUSTOMER_SERVICE_IDS.includes(d.currentMechanic))return false;
 if(d.currentMechanic===CUSTOMER_MOLD)updateMold(d,dt);
 else if(d.currentMechanic===CUSTOMER_SCOOP)updateScoopShow(d,dt,input);
 else if(d.currentMechanic===HAND_INVERT)updateHandInvert(d,dt,input);
 else updateHandPaper(d,dt,input);
 return true;
}
export function customerServiceCue(d){
 if(!CUSTOMER_SERVICE_IDS.includes(d.currentMechanic))return null;
 const p=d.subStep,w=d.world;
 if(d.currentMechanic===CUSTOMER_SCOOP&&[7,12].includes(p))return{kind:'reach',...customerServiceTarget(d),progress:p/15};
 if(d.currentMechanic===HAND_INVERT&&p===2)return{kind:'reach',...customerServiceTarget(d),progress:.5};
 if(d.currentMechanic===HAND_PAPER&&p===1)return{kind:'reach',...customerServiceTarget(d,w.servingNapkin),progress:.25};
 if(d.currentMechanic===HAND_PAPER&&p===2&&!d.customerService.paperPulled)return{kind:'pull',target:conePoint(d),progress:.4};
 if(d.currentMechanic===HAND_PAPER&&p===3)return napkinReturnCue(d,d.customerService?.paperReturn)||{kind:'wait',quiet:true,target:d.coneWorldPos,progress:.5};
 if(d.currentMechanic===HAND_PAPER&&p===4)return{kind:'reach',...customerServiceTarget(d),progress:.65};
 return{kind:'wait',quiet:true,badgeText:({tr:'USTAYI İZLE',en:'WATCH THE VENDOR',de:'BEOBACHTE DEN VERKÄUFER',ar:'شاهد البائع',ru:'СМОТРИ НА МАСТЕРА',ja:'職人を見て'})[d.save?.lang]||'WATCH THE VENDOR',target:d.coneWorldPos,progress:Math.min(.95,p/(d.currentMechanic===CUSTOMER_SCOOP?15:5))};
}
export function customerServicePlaying(d){return CUSTOMER_SERVICE_IDS.includes(d.currentMechanic)&&customerServiceCue(d)?.kind==='wait';}
export function customerOpeningRoutine(routine,targetScoopCount){
 let remaining=Math.min(2,targetScoopCount);
 const rest=routine.filter(id=>{if(id==='SCRAPE_FLAVOR_SCOOP'&&remaining>0){remaining--;return false;}return true;});
 return [CUSTOMER_MOLD,CUSTOMER_SCOOP,...rest];
}
