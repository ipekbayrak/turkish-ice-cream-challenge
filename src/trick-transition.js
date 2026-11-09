import {ServingHandoff,servingOwner,restoreServing,servingContactReached} from './serving-handoff.js';
import {NapkinReturn} from './napkin-return.js';
import {Vector3,Matrix4,MathUtils} from 'three';
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const nearest=(from,to)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from));
const key=d=>`${d.routineIndex}:${d.currentMechanic}:${d.subStep}:${d.choreography?.index??0}`;

export function captureTrickPose(d){
 const w=d.world;
 return{position:d.coneWorldPos.clone(),roll:w.paddleAngularMotion?.shaft?.value??d.shaftRoll??0,
  pitch:w.paddleAngularMotion?.pitch?.value??d.conePitchX??0,flip:w.paddleAngularMotion?.flip?.value??d.coneFlipZ??0,
  left:(d.leftHandCustomTarget||w.leftPropSpring?.pos)?.clone()||null};
}
/** Entry clears/ownership changes must not move a serving in world space. */
export function beginTrickEntry(d){
 const w=d.world;w.scene.updateMatrixWorld(true);
 const objects=[w.conePivot,w.scoopStackGroup,w.servingNapkin,w.outerConeGroup].filter(Boolean).map(object=>({object,visible:object.visible,parent:object.parent,matrix:object.matrixWorld.clone()}));
 return{from:captureTrickPose(d),serial:d._updateSerial||0,objects};
}
export function finishTrickEntry(d,entry){
 const w=d.world;
 for(const s of entry.objects){
  if(!s.visible||!s.object.visible||!s.object.parent)continue;
  s.object.parent.updateWorldMatrix(true,false);
  new Matrix4().copy(s.object.parent.matrixWorld).invert().multiply(s.matrix).decompose(s.object.position,s.object.quaternion,s.object.scale);
 }
 const serving=entry.objects.find(s=>s.object===w.conePivot);
 if(serving&&serving.parent!==w.conePivot.parent){d.pendingServingOwner=servingOwner(w);restoreServing(w,serving);}
 const paperWasVisible=entry.objects.find(s=>s.object===w.servingNapkin)?.visible;
 if(!paperWasVisible&&w.servingNapkin?.visible){
  d.pendingEntryPaper={owner:w.stallEffects?.napkinOwner||'vendor'};w.servingNapkin.visible=false;
 }
 const outer=entry.objects.find(s=>s.object===w.outerConeGroup);
 if(outer&&!outer.visible&&w.outerConeGroup?.visible&&w.outerConeGroup.parent===w.conePivot&&w.stallEffects){
  w.outerConeGroup.position.y=-.008;w.stallEffects.outerMoving=true;
 }
 const effects=w.stallEffects;
 if(effects){
  const parent=w.conePivot.parent,owner=parent===w.heldSocket?'player':parent===w.lArmRig.handGroup?'vendor':'paddle';
  effects.coneOwner=owner;effects.coneRest.set(0,owner==='player'?.05:owner==='vendor'?.11:.02,owner==='vendor'?.035:0);
  effects.coneMoving=w.conePivot.position.distanceTo(effects.coneRest)>.002;
  effects.scoopMoving=w.scoopStackGroup.position.distanceTo(effects.scoopRest)>.002;
  if(w.servingNapkin?.visible)effects.napkinMoving=true;
 }
 w.scene.updateMatrixWorld(true);d.pendingTrickEntry=entry;
}

function preparePaperWorkPose(d,pose,owner){
 if(d.pendingEntryPaper&&owner==='paddle'&&pose.position.z>.02){
  d.afterEntryPaperPose=pose;
  return{...pose,position:V(.18,1.31,-.16),roll:0,pitch:0,flip:0};
 }
 return pose;
}

export class TrickPoseTransition {
 constructor(from,to,{tempo=1}={}){
  this.from=from;this.to={...to,roll:nearest(from.roll,to.roll),pitch:nearest(from.pitch,to.pitch),flip:nearest(from.flip,to.flip)};
  const distance=from.position.distanceTo(to.position),angle=Math.max(Math.abs(this.to.roll-from.roll),Math.abs(this.to.pitch-from.pitch),Math.abs(this.to.flip-from.flip));
  this.duration=MathUtils.clamp((.18+distance*.55+angle*.055)/Math.min(1.35,Math.sqrt(Math.max(1,tempo))),.22,.58);
  this.age=0;this.done=false;
 }
 apply(d,dt){
  this.age=Math.min(this.duration,this.age+Math.max(0,dt));const t=this.age/this.duration,u=t*t*(3-2*t),a=this.from,b=this.to;
  if(b.position.y<1.10&&Math.hypot(b.position.x-a.position.x,b.position.z-a.position.z)>.12){
   const above=b.position.clone();above.y=Math.max(1.16,a.position.y,b.position.y+.26);
   const p=t<.65?t/.65:(t-.65)/.35,v=p*p*(3-2*p);
   d.coneTargetPos.copy(t<.65?a.position:above).lerp(t<.65?above:b.position,v);
  }else d.coneTargetPos.copy(a.position).lerp(b.position,u);
  d.shaftRoll=MathUtils.lerp(a.roll,b.roll,u);d.conePitchX=MathUtils.lerp(a.pitch,b.pitch,u);d.coneFlipZ=MathUtils.lerp(a.flip,b.flip,u);
  if(b.left)d.leftHandCustomTarget=(a.left||b.left).clone().lerp(b.left,u);
  else d.leftHandCustomTarget=null; // Existing support-hand recovery retains its physical path.
  d.presentationExact=true;d.presentationStrikeTip=null;d.presentationSurface=null;d.presentationBell=null;
  this.done=t>=1;
 }
}

/** Called before mechanics: no response window, score or AFK time runs in a join. */
export function updateTrickTransition(d,dt,input){
 const returned=d.paperReturnPose;
 if(returned?.presentationKind==='serving-return'&&returned.releasing){returned.offerWeight*=Math.exp(-Math.max(0,dt)*12);if(returned.offerWeight<.005)d.paperReturnPose=null;}
 if(d.servingHandoff){
  const transfer=d.servingHandoff;d.gestureValidation.update(input,dt,`handoff:${key(d)}`);
  if(transfer.update(d,dt)){
   transfer.releasing=true;d.servingHandoff=null;d.trickTransition=new TrickPoseTransition(captureTrickPose(d),transfer.goal,{tempo:d.config?.tempoFactor});d._lastAuthoredStep=null;d.trickTransition.apply(d,0);
  }return true;
 }
 const transition=d.trickTransition;
 if(!transition){
  if(!d.entryPaperPreparation&&d.pendingEntryPaper&&!d.pendingTrickEntry){
   const w=d.world,e=w.stallEffects,outer=d.pendingEntryPaper.owner==='outer';
   w.setServingNapkin({owner:'vendor-hand',peel:1});
   w.servingNapkin.position.copy(e.napkinRest);w.servingNapkin.quaternion.identity();e.napkinMoving=false;e.napkinPeel=1;
   e.napkin.scale.setScalar(.2);
   d.entryPaperPreparation=new NapkinReturn(d,{fromVendor:true,retreat:false,wrapObject:outer?w.outerConeGroup:w.conePivot,wrapOwner:outer?'outer':'vendor',collarOffset:outer?-.045:-.065});
   d.entryPaperPreparation.revealFold=true;d.pendingEntryPaper=null;
  }
  if(!d.entryPaperPreparation)return false;
  d.gestureValidation.update(input,dt,`paper-entry:${key(d)}`);
  if(d.entryPaperPreparation.update(d,dt)){d.entryPaperPreparation=null;d.sound.syncMusicBeat?.();if(d.afterEntryPaperPose){d.trickTransition=new TrickPoseTransition(captureTrickPose(d),d.afterEntryPaperPose,{tempo:d.config?.tempoFactor});d.afterEntryPaperPose=null;d._lastAuthoredStep=null;d.trickTransition.apply(d,0);}}
  return true;
 }
 transition.apply(d,dt);d.idleSeconds=0;
 d.gestureValidation.update(input,dt,`pose-join:${key(d)}`);
 if(transition.done){d.trickTransition=null;d._poseTransitionFinishing=true;d.sound.syncMusicBeat?.();}
 return true;
}

/** Called after a mechanic has authored its first pose, before IK/contact solve.
 * This uses that real pose rather than a generic guessed 'neutral' position. */
export function joinAuthoredPose(d,dt){
 if(!d.world.lArmRig?.handRig)return;
 if(d.pendingEntryPaper&&d.world.servingNapkin)d.world.servingNapkin.visible=false;
 if(d.entryPaperPreparation||d.servingHandoff)return;
 if(!d.active||d.roundEnded||!d._updateSerial||d.isAfkShowActive||d.afkRejoin||d.flourishPreparation||d.vendorFlourish)return;
 if(d.trickTransition||d._poseTransitionFinishing){d._poseTransitionFinishing=false;return;}
 if(d._skipPoseJoinOnce){d._skipPoseJoinOnce=false;d.pendingTrickEntry=null;d._lastMotionStepKey=key(d);d._lastAuthoredPosition=d.coneTargetPos.clone();d._lastAuthoredStep=null;return;}
 const pending=d.pendingTrickEntry;
 if(pending&&pending.serial===d._updateSerial){
  // _advanceRoutineStep may enter during the old mechanic's update. Keep its
  // final rendered pose until the new mechanic authors its actual first frame.
  const a=pending.from;d.coneTargetPos.copy(a.position);d.shaftRoll=a.roll;d.conePitchX=a.pitch;d.coneFlipZ=a.flip;
  d.leftHandCustomTarget=a.left?.clone()||null;d.presentationExact=true;return;
 }
 const frame=d._servingFrame;
 let requested=d.pendingServingOwner||(frame&&frame.parent!==d.world.conePivot.parent&&(pending||servingOwner(d.world)!=='player')?servingOwner(d.world):null);
 if(requested&&servingContactReached(d.world,requested)){if(d.pendingServingOwner)d.world.handoffCone(requested);d.pendingServingOwner=null;requested=null;}
 if(requested&&frame&&!d.world.scoopInFlight){
  const goal=preparePaperWorkPose(d,{position:d.coneTargetPos.clone(),roll:d.shaftRoll||0,pitch:d.conePitchX||0,flip:d.coneFlipZ||0,left:d.leftHandCustomTarget?.clone()||null},requested);
  restoreServing(d.world,frame);d.pendingServingOwner=null;d.pendingTrickEntry=null;
  d.servingHandoff=new ServingHandoff(d,requested,goal);d._lastMotionStepKey=d._motionStepKey||key(d);d._lastAuthoredPosition=goal.position.clone();d._lastAuthoredStep=null;d.coneTargetPos.copy(d.coneWorldPos);d.presentationStrikeTip=null;d.presentationSurface=null;d.presentationBell=null;
  d.presentationExact=true;return;
 }

 if(d.contactPathOwnsMotion&&!pending){d._lastMotionStepKey=key(d);d._lastAuthoredPosition=d.coneTargetPos.clone();d._lastAuthoredStep=null;return;}
 if(d.world.scoopInFlight||d.world.outerConeGroup?.visible&&d.world.outerConeGroup.parent===d.world.scene){d._lastAuthoredPosition=d.coneTargetPos.clone();return;}
 const authored=d.coneTargetPos.clone(),actualKey=key(d);
 let phaseKey=d._motionStepKey||actualKey;
 const immediatePhaseJump=actualKey!==phaseKey&&d._lastTrickPose&&d._lastTrickPose.position.distanceTo(authored)>.09;
 if(immediatePhaseJump)phaseKey=actualKey;
 const step=d._lastAuthoredPosition?authored.clone().sub(d._lastAuthoredPosition):null;
 const expected=d._lastAuthoredStep?.clone().multiplyScalar(dt/(d._lastAuthoredDt||dt||1));
 const abrupt=step&&expected&&step.clone().sub(expected).length()>Math.max(.16,Math.max(0,dt)*8)&&!d.isGraspingPaddleCone;
 d._lastAuthoredStep=step;d._lastAuthoredDt=dt;
 const changed=pending||phaseKey!==d._lastMotionStepKey||abrupt;
 d._lastAuthoredPosition=authored;
 d._lastMotionStepKey=phaseKey;
 const from=pending?.from||d._lastTrickPose;d.pendingTrickEntry=null;
 if(changed&&from){
  const to=preparePaperWorkPose(d,{position:d.coneTargetPos.clone(),roll:d.shaftRoll||0,pitch:d.conePitchX||0,flip:d.coneFlipZ||0,left:d.leftHandCustomTarget?.clone()||null},servingOwner(d.world));
  const distance=from.position.distanceTo(to.position),angle=Math.max(Math.abs(nearest(from.roll,to.roll)-from.roll),Math.abs(nearest(from.pitch,to.pitch)-from.pitch),Math.abs(nearest(from.flip,to.flip)-from.flip));
  if(distance>.035||angle>.18){
   d.trickTransition=new TrickPoseTransition(from,to,{tempo:d.config?.tempoFactor});d._lastAuthoredStep=null;d.trickTransition.apply(d,0);
  }
 }
}
export function finishAuthoredPose(d){d._lastTrickPose=captureTrickPose(d);}
export function clearTrickTransition(d){d.trickTransition=d.pendingTrickEntry=d._lastTrickPose=null;d.pendingEntryPaper=d.entryPaperPreparation=d.paperReturnPose=null;d.servingHandoff=d.pendingServingOwner=d._servingFrame=d.afterEntryPaperPose=null;d._lastMotionStepKey=null;d._lastAuthoredPosition=null;d._lastAuthoredStep=null;d._lastAuthoredDt=0;d._poseTransitionFinishing=false;}
