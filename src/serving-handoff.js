import {Vector3,Quaternion,MathUtils} from 'three';
import {VendorPoleRejoin,setFlourishPose} from './vendor-flourish.js';
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
export const servingOwner=(w,parent=w.conePivot.parent)=>parent===w.heldSocket?'player':parent===w.lArmRig.handGroup?'vendor':'paddle';
export function restoreServing(w,s){
 w.scene.updateMatrixWorld(true);s.parent.attach(w.conePivot);s.matrix.clone().premultiply(s.parent.matrixWorld.clone().invert()).decompose(w.conePivot.position,w.conePivot.quaternion,w.conePivot.scale);
 w.coneHeldByVendor=s.parent===w.lArmRig.handGroup;
 if(w.stallEffects){w.stallEffects.coneMoving=false;w.stallEffects.coneOwner=servingOwner(w);}
}
export function servingContactReached(w,owner){
 w.scene.updateMatrixWorld(true);const cone=w.conePivot.getWorldPosition(V());
 if(owner==='vendor')return cone.distanceTo(w.lArmRig.handGroup.localToWorld(V(0,.11,.035)))<.04;
 if(owner==='player')return cone.distanceTo(w.heldSocket.localToWorld(V(0,.05,0)))<.04;
 const top=w.paddleContact?.highestVisible(w),crown=top?top.localToWorld(V(0,top.geometry.parameters.radius,0)):w.conePivot.localToWorld(V(0,.036,0));
 return Boolean(w.paddleContact)&&w.paddleContact.bladePoint(w).distanceTo(crown)<.035;
}
function takeOnPole(d){
 const w=d.world;w.scene.updateMatrixWorld(true);const p=w.conePivot.getWorldPosition(V()),q=w.conePivot.getWorldQuaternion(new Quaternion());
 w.handoffCone('paddle');const parent=w.paddleGroup.getWorldQuaternion(new Quaternion());
 w.paddleGroup.position.copy(p).sub(V(0,.02,0).applyQuaternion(parent));w.conePivot.position.set(0,.02,0);w.conePivot.quaternion.copy(parent.invert().multiply(q));
 d.coneWorldPos.copy(w.paddleGroup.position);d.coneTargetPos.copy(d.coneWorldPos);w.coneSpring.pos.copy(d.coneWorldPos);w.coneSpring.target.copy(d.coneWorldPos);w.stallEffects.coneMoving=false;w.coneSpring.vel.set(0,0,0);w.prevConePos?.copy(d.coneWorldPos);w.vendorLargeServingReturn=false;
 w.vendorPoleFree=false;w.vendorPoleForwardHint=w.vendorRearGripHint=w.vendorBodyYawHint=null;w.vendorArmMode='front';
}
/** Physical transfer before a new pose: the same serving stays with its old
 * owner until the receiving hand or bare blade has really reached it. */
export class ServingHandoff {
 constructor(d,owner,goal){this.owner=owner;this.goal=goal;this.age=0;this.offerAge=0;this.offerWeight=0;this.presentationKind='serving-return';this.releasing=false;this.from=d.coneWorldPos.clone();if(owner==='paddle'||owner==='vendor'&&d.world.conePivot.parent===d.world.heldSocket||owner==='player'&&d.world.conePivot.parent===d.world.lArmRig.handGroup)this.rejoin=new VendorPoleRejoin(d.world,d.stageTimer);}
 update(d,dt){
  const w=d.world;this.age+=dt;this.offerAge+=dt;d.idleSeconds=0;d.presentationExact=true;
  if(this.owner==='player'||w.conePivot.parent===w.heldSocket||d.paperReturnPose===this){
   this.offerWeight=MathUtils.smoothstep(this.offerAge,0,.50);d.paperReturnPose=this;
  }
  if(this.rejoin&&this.owner!=='paddle'){setFlourishPose(d,this.rejoin.step(dt));if(this.rejoin.inContact){takeOnPole(d);this.rejoin=null;this.from=d.coneWorldPos.clone();this.age=0;}return false;}
  if(this.owner==='vendor'){
   if(!d._prepareIdleServing(dt))return false;
   d.flourishPreparation=null;w.vendorConeReceiveProgress=null;w.vendorConeReceiveFrom=null;w.vendorPoleFree=true;return true;
  }
  if(this.owner==='paddle'){
   setFlourishPose(d,this.rejoin.step(dt));
   if(this.rejoin.inContact){takeOnPole(d);return true;}return false;
  }
  w.scene.updateMatrixWorld(true);const target=w.heldSocket.localToWorld(V(0,.05,0)),actual=w.conePivot.getWorldPosition(V());
  const offset=actual.clone().sub(d.coneWorldPos),u=MathUtils.smoothstep(this.age,0,.42);
  d.coneTargetPos.copy(this.from).lerp(target.clone().sub(offset),u);d.shaftRoll=d.conePitchX=d.coneFlipZ=0;
  if(this.age>=.42&&actual.distanceTo(target)<.035){w.handoffCone('player');return true;}return false;
 }
}
