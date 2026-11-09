import {Vector3,MathUtils} from 'three';

const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const REST=V(.22,1.20,-.235);
const WRAP_WORK_POSITION=V(.18,1.31,-.16);
const worldPoint=(w,o,p=V())=>{w.scene.updateMatrixWorld(true);return o.localToWorld(p);};

/** The existing sheet is picked up at real hand contact, carried to the cone,
 * and folded around its base. No tossed replacement and no timed teleport. */
export class NapkinReturn {
 constructor(d,{retrieveOnly=false,retreat=true,fromVendor=false,wrapObject=null,wrapOwner='vendor',collarOffset=-.065}={}){
  this.phase=fromVendor?'carry':'reach';this.age=0;this.done=false;
  const nested=!wrapObject&&d.world.outerConeGroup?.visible&&d.world.outerConeGroup.parent===d.world.conePivot;
  this.retrieveOnly=retrieveOnly;this.retreat=retreat;this.wrapObject=wrapObject||(nested?d.world.outerConeGroup:d.world.conePivot);this.wrapOwner=nested?'outer':wrapOwner;this.collarOffset=nested?-.045:collarOffset;
  const w=d.world;
  this.hand=(d.leftHandCustomTarget||w.lArmRig.handGroup.getWorldPosition(V())).clone();
  this.point=V();this.waiting=false;this.offerWeight=0;this.revealAge=0;
  this.workPose=null;this.workAge=0;
 }
 aim(d,target,dt){
  const grip=worldPoint(d.world,d.world.lArmRig.handGroup,V(0,.07,0));
  const wrist=d.world.lArmRig.handGroup.getWorldPosition(V()).add(target.clone().sub(grip));
  this.hand.lerp(wrist,1-Math.exp(-Math.max(0,dt)*25));
  this.hand.clamp(V(-.62,.94,-.34),V(.62,1.70,.42));
  d.leftHandCustomTarget=this.hand.clone();
  return grip.distanceTo(target);
 }
 next(phase){this.phase=phase;this.age=0;}
 prepareWorkPose(d,dt){
  if(this.retrieveOnly)return;
  const w=d.world;
  let owner=this.wrapObject;while(owner&&owner!==w.paddleGroup)owner=owner.parent;
  if(!owner)return; // A customer's or vendor's hand keeps its own serving.
  if(!this.workPose){
   const motion=w.paddleAngularMotion;
   this.workPose={position:d.coneWorldPos.clone(),roll:motion?.shaft?.value??d.shaftRoll??0,pitch:motion?.pitch?.value??d.conePitchX??0,flip:motion?.flip?.value??d.coneFlipZ??0};
  }
  this.workAge+=dt;const t=MathUtils.smoothstep(this.workAge,0,.28),pose=this.workPose;
  // Both hands participate. A pole parked to the vendor's right can be beyond
  // the left paper hand's reach even when the two props look nearly touching.
  d.coneTargetPos.copy(pose.position).lerp(WRAP_WORK_POSITION,t);
  const settle=angle=>angle+Math.atan2(Math.sin(-angle),Math.cos(-angle))*t;
  d.shaftRoll=settle(pose.roll);d.conePitchX=settle(pose.pitch);d.coneFlipZ=settle(pose.flip);
  d.presentationExact=true;d.contactPathOwnsMotion=true;
 }
 update(d,dt){
  if(this.done)return true;
  const w=d.world,paper=w.servingNapkin;
  if(!paper?.visible)return false;
  dt=Math.max(0,Math.min(.05,dt));this.age+=dt;d.idleSeconds=0;
  if(this.revealFold){this.revealAge+=dt;const t=Math.min(1,this.revealAge/.12);paper.scale.setScalar(.2+.8*t*t*(3-2*t));}
  d.paperReturnPose=this;
  if(this.phase!=='reach')this.prepareWorkPose(d,dt);
  const offering=this.phase==='reach'&&!this.waiting;
  this.offerWeight+=(Number(offering)-this.offerWeight)*(1-Math.exp(-dt*22));
  if(this.phase==='reach'){
   const target=worldPoint(w,paper);
   this.waiting=target.x<-.62||target.x>.62||target.y<.98||target.y>1.67||target.z>.48;
   const distance=this.aim(d,target,dt);
   // The sheet stays in the customer's fingers throughout the approach.
   if(this.age>=.06&&distance<.035){
    w.setServingNapkin({owner:'vendor-hand',peel:1});d.heldItem=null;
    d.sound.playPaperRustle?.();this.next(this.retrieveOnly?'retreat':'carry');
   }
  }else if(this.phase==='carry'){
   const collar=worldPoint(w,this.wrapObject,V(0,this.collarOffset,0));
   const oneHand=paper.parent===this.wrapObject.parent&&paper.parent===w.lArmRig.handGroup;
   if(oneHand)d.leftHandCustomTarget=this.hand.clone();else this.aim(d,collar,dt);
   // In one hand the sheet's edge already overlaps the wafer; fold its nearby
   // pinched edge around the base without chasing that same hand indefinitely.
   if(this.age>=.08&&worldPoint(w,paper).distanceTo(collar)<(oneHand?.055:.035)){
    w.setServingNapkin({owner:this.wrapOwner,peel:0});this.next('wrap');
    d.sound.playPaperRustle?.();
   }
  }else if(this.phase==='wrap'){
   this.aim(d,worldPoint(w,this.wrapObject,V(0,this.collarOffset,0)),dt);
   if(w.stallEffects)w.stallEffects.napkinPeel*=Math.exp(-dt*32);
   if(this.age>=.08&&(w.stallEffects?.napkinPeel??0)<.04){
    if(w.stallEffects)w.stallEffects.napkinRecovered=true;
    this.next(this.retreat?'retreat':'done');
   }
  }else if(this.phase==='retreat'){
   this.hand.lerp(REST,1-Math.exp(-dt*22));d.leftHandCustomTarget=this.hand.clone();
   if(this.age>=.10)this.next('done');
  }
  if(this.phase==='done'){if(this.revealFold)paper.scale.setScalar(1);this.done=true;d.paperReturnPose=null;return true;}
  return false;
 }
}

export function napkinReturnCue(d,state){
 if(!state||state.done)return null;
 if(state.phase==='reach'&&state.waiting)return{kind:'return',target:V(.04,1.23,.26),progress:.6};
 return{kind:'wait',quiet:true,target:d.coneWorldPos,progress:.75};
}

/** Choreography only: the customer's same hand offers retained paper or cone into
 * the master's physical reach. Canonical joystick/gesture intent never moves. */
export function paperReturnHandTarget(d,base,out=new Vector3()){
 const pose=d.paperReturnPose;out.copy(base);
 if(pose)out.lerp(new Vector3(.10,1.24,-.12),pose.offerWeight);
 return out;
}
