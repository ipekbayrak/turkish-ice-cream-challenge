import {CONE_DEPOSIT_HAND} from './collected-cones.js';
import {NapkinReturn,napkinReturnCue} from './napkin-return.js';
import { Vector3, MathUtils } from 'three';
import { shellViewport, projectShellTarget } from './shell-targeting.js';

// One outer wafer, one real filled cone and one sheet of serving paper. These
// routines move those objects; a caught item is never replaced by a prop clone.
const V = (x=0,y=0,z=0) => new Vector3(x,y,z);
const ease = value => { const t=MathUtils.clamp(value,0,1);return t*t*(3-2*t); };
const pose = (d,from,to,duration) => d.coneTargetPos.copy(from).lerp(to,ease(d.stageTimer/duration));
const point = (w,object) => { w.scene.updateMatrixWorld(true);return object.getWorldPosition(V()); };
const phase = (d,index) => { d.subStep=index;d.stageTimer=0;d.stepCooldown=0;d.isGraspingPaddleCone=false; };
const offer = V(.05,1.22,.27), back = V(.23,1.36,-.10);
const handRest = V(-.18,1.21,-.22);
const outerPoint = d => point(d.world,d.world.outerConeGroup);
const paperPoint = d => point(d.world,d.world.servingNapkin);
const realPoint = d => point(d.world,d.world.conePivot);
const handFor = p => p.clone().add(V(0,-.10,-.025));
const reward = (d,score,icon) => {d.score+=score;d._spawnScorePopup(score,d.coneWorldPos,icon);d._vibrate(25);};

/** Pick the actual visible wafer, whose vendor hand is constrained by arm IK. */
export function layeredEmptyOfferTarget(world) {
  if (!world.camera || !world.canvas) return null;
  world.scene.updateMatrixWorld(true); world.camera.updateMatrixWorld(true);
  const viewport = shellViewport(world), target = projectShellTarget(world, world.outerConeGroup, viewport);
  return { ...target, viewport, radius: MathUtils.clamp(Math.min(viewport.width, viewport.height) * .10, 26, 44) };
}
export function reachLayeredEmpty(d, dt, gestureState, intentPos) {
  const target = layeredEmptyOfferTarget(d.world);
  if (!target) return d.gestureValidation.reach('layered-empty-again', intentPos.distanceTo(outerPoint(d)), .28, dt);
  const x = ((gestureState.aimNormX ?? gestureState.normX) + 1) * target.viewport.width * .5;
  const y = (1 - (gestureState.aimNormY ?? gestureState.normY)) * target.viewport.height * .5;
  const distance = target.visible ? Math.hypot(x - target.screen.x, y - target.screen.y) : Infinity;
  return d.gestureValidation.reach('layered-empty-again', distance, target.radius, dt);
}

export function enterNestedService(d) {
  d.nestedService={from:d.coneWorldPos.clone(),returnFrom:null,variant:Math.random()<.5?'hand':'pole',outerStartY:-.008};
  d.world.handoffOuterCone('nested',true);d.world.reuseEmptyCone?.(d.world.outerConeGroup);
  if(d.world.servingNapkin?.visible)d.world.setServingNapkin({owner:'outer',peel:0});
  d.world.mainConeMesh.visible=true;d.world.heldEmptyCone.visible=false;
  d.coneTargetPos.copy(offer);d.leftHandCustomTarget=null;
}
export function separateNestedCone(d) {
  d.world.handoffOuterCone('player',true);
  d.world.heldEmptyCone.visible=false;
  d.heldItem='EMPTY_CONE';
  d.nestedService.from=d.coneWorldPos.clone();
  phase(d,1);d.stepCooldown=.45;
  d.sound.playWaferSlide(0);d.sound.playCrowdReaction('chuckle');
  d.world.setVendorMood('laugh');d._triggerVendorSpeech('eeeh');d._vibrate([35,30,45]);
}
export function updateNestedService(d,dt,time,{intentPos,validReach,validSlice}) {
  const w=d.world,s=d.nestedService,t=d.stageTimer;
  if(d.subStep===0){
    w.handoffOuterCone('nested',true);
    w.outerConeGroup.position.y=MathUtils.lerp(s.outerStartY??-.008,-.052,ease(t/.55));
    w.outerConeGroup.rotation.z=.045;
    pose(d,s.from,offer,.55);d.conePitchX=.08;d.shaftRoll=0;
    d.leftHandCustomTarget=t<.55?handFor(outerPoint(d)):null;
    if(t>.55&&validReach(.29)) separateNestedCone(d);
    else if(t>=2.7){w.handoffOuterCone('nested',false);reward(d,200,'🍦');d._advanceRoutineStep();}
  }else if(d.subStep===1){
    if(!s.pulled){d.coneTargetPos.copy(s.from);d.idleSeconds=0;if(!d.gestureValidation.pull('nested-pull'))return;s.pulled=true;d.stageTimer=0;}
    pose(d,s.from,back,.5);d.conePitchX=-.12;d.shaftRoll=.3*ease(t/.5);
    if(t>.5)d.coneTargetPos.copy(back).lerp(V(.18,1.32,.22),ease((t-.5)/.35));
    if(s.variant==='hand'&&t<.5){w.setConeInVendorHand(true);d.leftHandCustomTarget=d.coneTargetPos.clone().add(V(0,-.10,-.025));}
    else {w.setConeInVendorHand(false);d.leftHandCustomTarget=t>.4?handFor(outerPoint(d)):null;}
    if(t>.5&&(d.gestureValidation.reach('return-outer',intentPos.distanceTo(d.coneWorldPos),.30,dt)||validSlice())){
      w.setConeInVendorHand(false);s.returnFrom=handFor(outerPoint(d));
      d.leftHandCustomTarget=s.returnFrom.clone();w.handoffOuterCone('vendor',true);
      d.heldItem=null;d.sound.playWaferSlide(0);phase(d,2);
    }
  }else{
    d.coneTargetPos.copy(back);d.leftHandCustomTarget=s.returnFrom.clone().lerp(CONE_DEPOSIT_HAND,ease(t/.65));
    if(t>=.65){
      if(!s.deposited){
        if(w.servingNapkin?.visible&&w.servingNapkin.parent===w.outerConeGroup){w.setServingNapkin({owner:'vendor-hand',peel:1});s.paperReturn=new NapkinReturn(d,{fromVendor:true,wrapObject:w.conePivot});}
        w.collectEmptyCone?.(w.outerConeGroup,`nested:${d.routineIndex}`);w.handoffOuterCone('nested',false);s.deposited=true;
      }
      if(s.paperReturn&&!s.paperReturn.update(d,dt/(d.config?.tempoFactor||1)))return;
      d.leftHandCustomTarget=null;reward(d,240,'🍦');d._triggerVendorSpeech('hoppa');d._advanceRoutineStep();
    }
  }
}
export function nestedServiceCue(d){
  if(d.currentMechanic!=='DOUBLE_CONE_SLIDE'||!d.nestedService)return null;
  if(d.subStep===1&&!d.nestedService.pulled)return{kind:'pull',target:d.coneWorldPos,progress:.35};
  return {kind:d.subStep===0?(d.stageTimer<.55?'wait':'reach'):d.subStep===1?(d.stageTimer<.5?'wait':'return'):'wait',target:d.subStep===0?outerPoint(d):d.coneWorldPos,progress:d.subStep===0?d.stageTimer/2.7:d.subStep===1?.55:.85};
}

export const LAYERED_SERVICE_ID='LAYERED_SERVICE_TEASE';
export const LAYERED_SERVICE_PHASES=Object.freeze(['nested-offer','filled-retract','return-empty','retrieve-empty','return-paper','empty-reoffer','retrieve-empty-again','wrapped-full-offer','wrapped-takeback','bare-full-offer','bare-takeback','final-wrap']);
export function enterLayeredService(d){
  d.layeredService={from:d.coneWorldPos.clone(),returnFrom:handRest.clone(),tookBack:false};
  d.world.updateIceCreamScoops(d.scoopCount,false);d.world.handoffOuterCone('nested',true);d.world.reuseEmptyCone?.(d.world.outerConeGroup);
  d.world.setServingNapkin({owner:'outer',peel:0});d.heldItem=null;d.leftHandCustomTarget=null;d._triggerVendorSpeech('hmm');
}
function takeBack(d,dt){
  const w=d.world,s=d.layeredService,t=d.stageTimer;
  if(!s.tookBack){
    const cone=realPoint(d);
    pose(d,s.from,cone,.36);d.presentationExact=true;d.shaftRoll=0;d.conePitchX=0;
    if(t>=.36){w.handoffCone('paddle');d.heldItem=null;s.tookBack=true;s.returnFrom=cone.clone();d.sound.playWaferSlide();d._triggerVendorSpeech('eeeh');}
  }else{
    d.coneTargetPos.copy(s.returnFrom).lerp(back,ease((t-.36)/.5));d.presentationExact=true;
  }
  return t>=.9;
}
export function updateLayeredService(d,dt,time,{intentPos,validReach,gestureState}){
  const w=d.world,s=d.layeredService,t=d.stageTimer;
  d.conePitchX=.06;d.shaftRoll=0;
  s.pulls ||= {};
  if([1,6,8,10].includes(d.subStep)&&!s.pulls[d.subStep]){s.pullStarts ||= {};d.coneTargetPos.copy(s.pullStarts[d.subStep] ||= d.coneWorldPos.clone());d.idleSeconds=0;if(!d.gestureValidation.pull(`layered-pull-${d.subStep}`))return;s.pulls[d.subStep]=true;d.stageTimer=0;return;}
  if(d.subStep===0){
    pose(d,s.from,offer,.55);w.setServingNapkin({owner:'outer',peel:0});
    if(t>.55&&d.gestureValidation.reach('layered-outer',intentPos.distanceTo(outerPoint(d)),.29,dt)){
      w.handoffOuterCone('player',true);d.heldItem='SERVICE_EMPTY';s.from=d.coneWorldPos.clone();phase(d,1);d.sound.playWaferSlide();
    }
  }else if(d.subStep===1){
    pose(d,s.from,back,.55);d.presentationExact=true;
    if(t>=.55)phase(d,2);
  }else if(d.subStep===2){
    d.coneTargetPos.copy(back);d.leftHandCustomTarget=handFor(outerPoint(d));
    if(d.gestureValidation.reach('layered-return-empty',intentPos.distanceTo(V(-.12,1.26,.24)),.27,dt)){
      // Peel the SAME sheet away first; the customer is left holding only paper.
      w.setServingNapkin({owner:'player',peel:1});s.returnFrom=d.leftHandCustomTarget.clone();
      w.handoffOuterCone('vendor',true);d.heldItem='SERVICE_PAPER';phase(d,3);d.sound.playWaferSlide();
    }
  }else if(d.subStep===3){
    d.coneTargetPos.copy(back);d.leftHandCustomTarget=s.returnFrom.clone().lerp(handRest,ease(t/.6));
    if(t>=.6)phase(d,4);
  }else if(d.subStep===4){
    d.coneTargetPos.copy(back);if(!s.paperReturn&&!d.gestureValidation.reach('layered-paper-back',intentPos.distanceTo(V(-.12,1.26,.24)),.27,dt))return;s.paperReturn ||= new NapkinReturn(d,{retrieveOnly:true});
    if(s.paperReturn.update(d,dt/(d.config?.tempoFactor||1))){s.returnFrom=d.leftHandCustomTarget.clone();phase(d,5);d.sound.playWaferSlide();}
  }else if(d.subStep===5){
    d.coneTargetPos.copy(back);d.leftHandCustomTarget=s.returnFrom.clone().lerp(V(-.12,1.17,.20),ease(t/.4));
    w.setServingNapkin({owner:'vendor-hand',peel:1,offset:V(-.11,.025,-.025)});
    if(t>.45&&reachLayeredEmpty(d,dt,gestureState,intentPos)){
      w.handoffOuterCone('player',true);d.heldItem='SERVICE_EMPTY';s.tookBack=false;phase(d,6);
    }
  }else if(d.subStep===6){
    d.coneTargetPos.copy(back);
    if(!s.wrapping){
    w.setServingNapkin({owner:'vendor-hand',peel:1,offset:V(-.11,.025,-.025)});
    if(t<.38)d.leftHandCustomTarget=handFor(outerPoint(d));
    else{
      if(!s.tookBack){s.returnFrom=handFor(outerPoint(d));w.handoffOuterCone('vendor',true);d.heldItem=null;s.tookBack=true;d.sound.playWaferSlide();}
      d.leftHandCustomTarget=s.returnFrom.clone().lerp(CONE_DEPOSIT_HAND,ease((t-.38)/.48));
    }
    }
    if(t>=.95){
      if(!s.wrapping){w.collectEmptyCone?.(w.outerConeGroup,`layered:${d.routineIndex}`);w.handoffOuterCone('nested',false);w.setServingNapkin({owner:'vendor-hand',peel:1});s.wrapping=new NapkinReturn(d,{fromVendor:true});}
      if(s.wrapping.update(d,dt/(d.config?.tempoFactor||1))){s.from=back.clone();phase(d,7);}
    }
  }else if(d.subStep===7||d.subStep===9){
    pose(d,back,offer,.45);d.leftHandCustomTarget=d.subStep===9?V(-.20,1.30,-.12):null;
    if(d.subStep===7)w.setServingNapkin({owner:'vendor',peel:0});
    else w.setServingNapkin({owner:'vendor-hand',peel:1});
    if(t>.45&&validReach(.28)){
      w.handoffCone('player');d.heldItem='SERVICE_FULL';s.from=d.coneWorldPos.clone();s.tookBack=false;
      phase(d,d.subStep+1);d.sound.playConePop();
    }
  }else if(d.subStep===8||d.subStep===10){
    if(takeBack(d,dt)){
      if(d.subStep===8){
        s.unwrapping ||= new NapkinReturn(d,{retrieveOnly:true});
        if(s.unwrapping.update(d,dt/(d.config?.tempoFactor||1)))phase(d,9);
      }else{
        s.finalWrapping ||= new NapkinReturn(d,{fromVendor:true});
        if(s.finalWrapping.update(d,dt/(d.config?.tempoFactor||1)))phase(d,11);
      }
    }
  }else{
    pose(d,back,offer,.45);d.leftHandCustomTarget=null;w.setServingNapkin({owner:'vendor',peel:0});
    if(t>=.55){reward(d,520,'🍦');d._advanceRoutineStep();}
  }
}
export function layeredServiceCue(d){
  if(d.currentMechanic!==LAYERED_SERVICE_ID)return null;
  const p=d.subStep;
  if([1,6,8,10].includes(p)&&!d.layeredService?.pulls?.[p])return{kind:'pull',target:d.coneWorldPos,progress:p/12};
  if(p===4||p===6||p===8||p===10){const cue=napkinReturnCue(d,p===4?d.layeredService?.paperReturn:p===6?d.layeredService?.wrapping:p===8?d.layeredService?.unwrapping:d.layeredService?.finalWrapping);if(cue)return cue;}
  const waiting=[1,3,6,8,10,11].includes(p)||(p===0&&d.stageTimer<.55)||([5,7,9].includes(p)&&d.stageTimer<.45);
  const visible = p===5 ? layeredEmptyOfferTarget(d.world) : null;
  return {kind:waiting?'wait':[2,4].includes(p)?'return':'reach',target:p===0||p===5?outerPoint(d):p===2||p===4?V(-.12,1.26,.24):d.coneWorldPos,screen:visible?.screen,viewport:visible?.viewport,progress:(p+Math.min(1,d.stageTimer)) / LAYERED_SERVICE_PHASES.length};
}
export function servicePresentationPlaying(d){
  return d.currentMechanic===LAYERED_SERVICE_ID&&[1,3,6,8,10,11].includes(d.subStep) || d.currentMechanic==='DOUBLE_CONE_SLIDE'&&d.subStep===2;
}
