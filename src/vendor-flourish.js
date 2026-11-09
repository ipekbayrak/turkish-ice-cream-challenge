import { MathUtils, Quaternion, Vector3 } from 'three';
import { BLADE_CONTACT } from './pole-contact.js';
import { markIdleSettling } from './idle-presentation.js';

export const VENDOR_FLOURISH_SECONDS = 3.4;
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const ease=t=>{const p=MathUtils.clamp(t,0,1);return p*p*(3-2*p);};
const FRONT=V(.16,1.28,-.38), END=V(-.12,1.38,-.16);
const SIDE_FORWARD=V(-1,0,0), END_FORWARD=V(.25,0,1).normalize();
const lerp=(a,b,t)=>a.clone().lerp(b,ease(t));
// Counter the hand against the turn: the whole 1.03m shaft stays centered,
// instead of sweeping its blade beyond the edge of a portrait phone.
const highGrip=forward=>V(-.155*forward.x,1.60,-.23-.20*Math.abs(forward.x));
function turn(a,b,t){
  const dot=MathUtils.clamp(a.dot(b),-1,1),axis=a.clone().cross(b);
  if(axis.lengthSq()<1e-8){
    if(dot>0)return a.clone();
    axis.set(0,1,0).addScaledVector(a,-a.y);
    if(axis.lengthSq()<1e-8)axis.set(1,0,0);
  }
  return a.clone().applyAxisAngle(axis.normalize(),Math.acos(dot)*ease(t)).normalize();
}

/** A bare shaft follows a tangent to an ellipse around the torso. The food
 * stays in the other hand, in front of the body, throughout this flourish. */
export function flourishOrbit(theta) {
  const grip=V(.16-.57*Math.sin(theta),1.28+Math.sin(theta)*.035,-.86+.48*Math.cos(theta));
  const forward=V(-.57*Math.cos(theta),0,-.48*Math.sin(theta)).normalize();
  return {grip,forward,theta,bodyYaw:-theta*.22,armMode:theta>1.7?'back':theta>.3?'side':'front'};
}
function pose(grip,forward,bodyYaw=0,armMode='front',theta=0,rearGrip=.67){
  return {grip,forward:forward.normalize(),tip:grip.clone().addScaledVector(forward,rearGrip),bodyYaw,armMode,theta,rearGrip};
}
function orbitPose(theta){
  const p=flourishOrbit(theta),rearGrip=.57+.10*ease(theta/.4);
  // Slide toward the blade before crossing the chest, especially for the
  // shorter master. The visible shaft keeps its same body-clear trajectory.
  p.grip.addScaledVector(p.forward,.67-rearGrip);
  return pose(p.grip,p.forward,p.bodyYaw,p.armMode,theta,rearGrip);
}
function frontExit(age,from) {
  if(age<.14)return pose(lerp(from.grip,highGrip(from.forward),age/.14),from.forward.clone(),from.bodyYaw*(1-ease(age/.14)),'front',0,MathUtils.lerp(from.rearGrip??.67,.67,ease(age/.14)));
  if(age<.52){const forward=turn(from.forward,END_FORWARD,(age-.14)/.38);return pose(highGrip(forward),forward);}
  return pose(lerp(highGrip(END_FORWARD),END,(age-.52)/.20),END_FORWARD.clone());
}

export class VendorFlourish {
  constructor(world,stageTimer=0) {
    world.scene?.updateMatrixWorld(true);
    const shaft=world.paddleRollGroup||world.paddleGroup;
    this.startForward=shaft.getWorldDirection(V()).normalize();
    this.startGrip=world.rArmRig?.handGroup?.getWorldPosition(V()) ||
      world.paddleGroup.position.clone().addScaledVector(this.startForward,-.67);
    this.startTip=shaft.getWorldPosition(V());
    this.startDistance=this.startTip.clone().sub(this.startGrip).dot(this.startForward);
    // Preserve the actual rendered tip while releasing food from the pole;
    // the logical cone pivot can be far below it on an eight-scoop serving.
    this.stageTimer=stageTimer;this.age=0;this.returnAge=0;this.returning=false;this.done=false;
    this.current=pose(this.startGrip.clone(),this.startForward.clone());
    this.current.tip.copy(this.startTip);
    this.current.rearGrip=this.startDistance;
  }
  sample(age) {
    if(age<.3){
      const high=highGrip(this.startForward);
      const p=pose(lerp(this.startGrip,high,age/.3),this.startForward.clone());
      p.tip.copy(this.startTip).lerp(high.clone().addScaledVector(p.forward,.67),ease(age/.3));
      p.rearGrip=MathUtils.lerp(this.startDistance,.67,ease(age/.3));
      return p;
    }
    if(age<.72){const forward=turn(this.startForward,SIDE_FORWARD,(age-.3)/.42);return pose(highGrip(forward),forward);}
    if(age<.92){
      const t=(age-.72)/.2,rearGrip=MathUtils.lerp(.67,.57,ease(t));
      const grip=lerp(highGrip(SIDE_FORWARD),FRONT,t).addScaledVector(SIDE_FORWARD,.67-rearGrip);
      return pose(grip,SIDE_FORWARD.clone(),0,'front',0,rearGrip);
    }
    if(age<2.68){
      const p=(age-.92)/1.76;
      const theta=p<.5?2.1*ease(p*2):2.1*(1-ease((p-.5)*2));
      return orbitPose(theta);
    }
    return frontExit(age-2.68,orbitPose(0));
  }
  beginReturn(){
    if(this.returning||this.done)return;
    this.returning=true;this.returnAge=0;this.returnFrom=this.current;
    this.returnOrbit=this.current.theta>0.001;
  }
  step(dt) {
    dt=Math.max(0,Math.min(.1,dt));
    if(this.returning){
      this.returnAge+=dt;
      if(this.returnOrbit&&this.returnAge<.42){
        this.current=orbitPose(this.returnFrom.theta*(1-ease(this.returnAge/.42)));
      }else{
        const elapsed=this.returnAge-(this.returnOrbit ? .42 : 0);
        this.current=frontExit(elapsed,this.returnOrbit?orbitPose(0):this.returnFrom);
        this.done=elapsed>=.72;
      }
    }else{
      this.age=Math.min(VENDOR_FLOURISH_SECONDS,this.age+dt);this.current=this.sample(this.age);
      this.done=this.age>=VENDOR_FLOURISH_SECONDS;
    }
    return this.current;
  }
}

export function setFlourishPose(d,pose) {
  const w=d.world;
  d.coneTargetPos.copy(pose.tip);d.presentationExact=true;
  d.leftHandCustomTarget=V(.25,1.20,-.23);
  d.shaftRoll=d.conePitchX=d.coneFlipZ=0;
  w.vendorArmMode=pose.armMode;w.vendorBodyYawHint=pose.bodyYaw;
  w.vendorPoleForwardHint=pose.forward;w.vendorRearGripHint=pose.rearGrip??.67;
  w.vendorPoleFree=true;
}

export function canRejoinVendorCone(w){
  return w.conePivot?.parent===w.lArmRig?.handGroup && w.scoopStackGroup?.parent===w.conePivot &&
    Boolean(w.paddleContact?.highestVisible(w));
}
function foodContactPose(w){
  w.scene.updateMatrixWorld(true);
  const top=w.paddleContact.highestVisible(w);
  const contact=w.paddleContact.poseForScoop(w,top),crown=contact.point.clone();
  const bladeOffset=V(BLADE_CONTACT.x,BLADE_CONTACT.y,BLADE_CONTACT.z).applyQuaternion(contact.rotation);
  return{tip:crown.clone().sub(bladeOffset),forward:contact.forward.clone(),crown};
}
/** Final rendezvous after the back path: the bare blade physically reaches
 * the top scoop before the same cone is returned to pole ownership. */
export class VendorPoleRejoin {
  constructor(world,stageTimer){
    this.world=world;this.stageTimer=stageTimer;this.age=0;
    world.vendorLargeServingReturn=true;
    world.scene.updateMatrixWorld(true);
    this.start=world.paddleRollGroup.getWorldPosition(V());
    this.forward=world.paddleRollGroup.getWorldDirection(V());
    this.yaw=world.vendorBodyYawHint||0;
  }
  step(dt){
    this.age+=Math.max(0,Math.min(.1,dt));
    const target=foodContactPose(this.world),t=ease(this.age/.40);
    const tip=this.start.clone().lerp(target.tip,t);tip.y+=Math.sin(Math.PI*t)*.045;
    return{tip,forward:turn(this.forward,target.forward,this.age/.40),bodyYaw:this.yaw*(1-t),armMode:'front'};
  }
  get inContact(){
    if(this.age<.40)return false;
    return this.world.paddleContact.bladePoint(this.world).distanceTo(foodContactPose(this.world).crown)<.025;
  }
}
export function finishVendorRejoin(d){
 d.trickTransition=d.pendingTrickEntry=null;d._lastAuthoredPosition=null;d._skipPoseJoinOnce=true;
  const w=d.world,saved=d.afkRejoin.stageTimer;
  w.scene.updateMatrixWorld(true);
  const position=w.conePivot.getWorldPosition(V()),rotation=w.conePivot.getWorldQuaternion(new Quaternion());
  w.setConeInVendorHand(false);
  const parentRotation=w.paddleGroup.getWorldQuaternion(new Quaternion());
  // Restore the logical cone pivot beneath the ice while preserving the food's
  // exact world pose; the rendered steel remains on its crown via PoleContact.
  w.paddleGroup.position.copy(position).sub(V(0,.02,0).applyQuaternion(parentRotation));
  w.conePivot.position.set(0,.02,0);w.conePivot.quaternion.copy(parentRotation.invert().multiply(rotation));
  d.coneWorldPos.copy(w.paddleGroup.position);d.coneTargetPos.copy(d.coneWorldPos);
  w.coneSpring.pos.copy(d.coneWorldPos);w.coneSpring.target.copy(d.coneWorldPos);w.coneSpring.vel.set(0,0,0);
  w.prevConePos?.copy(d.coneWorldPos);
  clearVendorFlourish(d);d.isAfkShowActive=false;d.idleSeconds=0;d.leftHandCustomTarget=null;d.stageTimer=saved;
  markIdleSettling(d);
  w.refreshPaddleAttachment();
}
export function clearVendorFlourish(d) {
  d.idleGuideSettle=0;
  d.vendorFlourish=null;
  d.flourishPreparation=null;
  d.afkRejoin=null;
  if(!d.world)return;
  d.world.vendorBellLook=null;
  d.world.vendorArmMode='front';d.world.vendorBodyYawHint=null;
  d.world.vendorPoleForwardHint=null;d.world.vendorRearGripHint=null;
  d.world.vendorPoleFree=false;
  d.world.vendorLargeServingReturn=false;
  d.world.vendorConeReceiveProgress=null;d.world.vendorConeReceiveFrom=null;
}
