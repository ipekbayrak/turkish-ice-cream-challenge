import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { HAND_GRIP_CENTER, fitPlayerForearm } from './hand-rig.js';
import { playerConeRotation, coneHandRotation } from './hand-orientation.js';

const UP=new Vector3(0,1,0),Z=new Vector3(0,0,1);
const playerConeEuler=new Euler().setFromQuaternion(playerConeRotation(-1));
export const PLAYER_CONE_PALM=Object.freeze({x:playerConeEuler.x,y:playerConeEuler.y,z:playerConeEuler.z});
const desiredConeUp=new Quaternion(),scratchQ=new Quaternion(),gripQ=new Quaternion(),scratch=new Vector3();

export function playerOwnsCone(world){
 return Boolean(world.conePivot&&world.heldSocket&&world.conePivot.parent===world.heldSocket)||
  Boolean(world.outerConeGroup?.visible&&world.outerConeGroup.parent===world.heldSocket)||
  Boolean(world.heldEmptyCone?.visible||world.heldNapkinCone?.visible);
}

/** Rotate hand and its connected forearm together into a side grip. Finger
 * joints close around the wafer; the wrist itself never folds at ninety degrees. */
export function applyPlayerConeGrip(world,dt,requested=false){
 const blend=1-Math.exp(-Math.max(0,dt)*18);
 world.playerConeGripBlend=MathUtils.lerp(world.playerConeGripBlend||0,requested?1:0,blend);
 const amount=world.playerConeGripBlend,hand=world.playerHandRig;
 if(!hand)return;
 hand.position.copy(world.playerWristRest);
 playerConeRotation(hand.side,gripQ);
 hand.quaternion.slerp(gripQ,amount);
 if(amount>.0001)hand.setPose('cone',amount,{radius:.028});
 // The original cone sits world-up. Its mesh center is .01 below heldSocket
 // (pivot+.05, wafer center-.06), so put that center exactly in the shared grip.
 hand.updateWorldMatrix(true,false);
 hand.getWorldQuaternion(scratchQ).invert();
 world.heldSocket.quaternion.copy(scratchQ);
 world.heldSocket.position.copy(HAND_GRIP_CENTER).add(scratch.copy(UP).multiplyScalar(.01).applyQuaternion(scratchQ));
 fitPlayerForearm(world);
}

export function playerConeGripTarget(world,coneWorldPosition,out=new Vector3()){
 const rootQ=world.touristHand.getWorldQuaternion(new Quaternion());
 playerConeRotation(world.playerHandRig?.side||-1,gripQ);
 const offset=new Vector3().copy(HAND_GRIP_CENTER).applyQuaternion(gripQ)
  .add(world.playerWristRest||new Vector3(0,-.05,.012)).applyQuaternion(rootQ).addScaledVector(UP,.06);
 return out.copy(coneWorldPosition).sub(offset);
}

export function applyVendorConeGrip(rig,tiltZ=0,center=new Vector3(0,.05,.035)){
 if(!rig.handRig)return;
 rig.handGroup.quaternion.setFromEuler(new Euler(0,-.12,tiltZ));
 const contact=center.clone().applyQuaternion(rig.handGroup.quaternion).add(rig.handGroup.position);
 const approach=rig.armPose?.elbow?contact.clone().sub(rig.armPose.elbow):new Vector3(0,0,1);
 const up=UP.clone().applyAxisAngle(Z,tiltZ);
 const worldFrame=coneHandRotation(rig.handRig.side,approach,up);
 const localFrame=rig.handGroup.quaternion.clone().invert().multiply(worldFrame);
 rig.handRig.setPose('cone',1,{radius:.028});rig.handRig.quaternion.copy(localFrame);
 rig.handRig.position.copy(center).sub(rig.handRig.gripAnchor.position.clone().applyQuaternion(localFrame));
}

export function applyVendorPaperGrip(rig,center){
 if(!rig.handRig)return;
 rig.handGroup.quaternion.setFromEuler(new Euler(0,-.12,0));
 const contact=center.clone().applyQuaternion(rig.handGroup.quaternion).add(rig.handGroup.position);
 const approach=rig.armPose?.elbow?contact.clone().sub(rig.armPose.elbow):new Vector3(0,0,1);
 const frame=coneHandRotation(rig.handRig.side,approach);
 frame.premultiply(rig.handGroup.quaternion.clone().invert());
 rig.handRig.setPose('pinch',1);rig.handRig.quaternion.copy(frame);
 rig.handRig.position.copy(center).sub(rig.handRig.gripAnchor.position.clone().applyQuaternion(frame));
}

/** Capture before entering receiving IK, so the old shaft pose remains the
 * first frame rather than being replaced by a new contact frame instantly. */
export function captureVendorHandPose(rig){
 const hand=rig.handRig;if(!hand)return null;
 const joints=hand.fingers.flatMap(f=>[f.base,f.middle,f.tip]).concat(hand.thumbPivot,hand.thumbJoint);
 return {position:hand.position.clone(),quaternion:hand.quaternion.clone(),rootQuaternion:rig.handGroup.quaternion.clone(),
  grip:hand.gripAnchor.position.clone(),thumbPosition:hand.thumbPivot.position.clone(),joints:joints.map(joint=>joint.rotation.clone())};
}

/** Prepare the same physical hand before ownership changes. Its true wrist,
 * palm and every finger move continuously from the released pole grip. */
export function applyVendorReceivingGrip(rig,progress,from){
 if(!rig.handRig||!from)return;
 const p=MathUtils.smoothstep(MathUtils.clamp(progress,0,1),0,1),hand=rig.handRig;
 applyVendorConeGrip(rig);
 const handRotation=hand.quaternion.clone(),rootRotation=rig.handGroup.quaternion.clone();
 hand.position.lerpVectors(from.position,hand.position,p);
 hand.quaternion.copy(from.quaternion).slerp(handRotation,p);
 rig.handGroup.quaternion.copy(from.rootQuaternion).slerp(rootRotation,p);
 hand.gripAnchor.position.lerpVectors(from.grip,hand.gripAnchor.position,p);
 hand.thumbPivot.position.lerpVectors(from.thumbPosition,hand.thumbPivot.position,p);
 const joints=hand.fingers.flatMap(f=>[f.base,f.middle,f.tip]).concat(hand.thumbPivot,hand.thumbJoint);
 joints.forEach((joint,index)=>{const a=from.joints[index],b=joint.rotation;joint.rotation.set(MathUtils.lerp(a.x,b.x,p),MathUtils.lerp(a.y,b.y,p),MathUtils.lerp(a.z,b.z,p));});
 hand.pose=p<1?'receive':'cone';
}

export function orientVendorHeldCone(world,dt){
 if(!world.coneHeldByVendor||world.conePivot.parent!==world.lArmRig.handGroup)return;
 const tilt=Number.isFinite(world.coneHandTiltZ)?world.coneHandTiltZ:0;
 desiredConeUp.setFromAxisAngle(Z,tilt);
 const local=world.lArmRig.handGroup.getWorldQuaternion(scratchQ).invert().multiply(desiredConeUp);
 world.conePivot.quaternion.slerp(local,1-Math.exp(-Math.max(0,dt)*20));
}

export function poleGripRenderTarget(world,logicalHand,polePosition,out=new Vector3()){
 const offset=world.conePivot.getWorldPosition(new Vector3()).sub(polePosition);
 out.copy(logicalHand).add(new Vector3(0,.03,-.04)).add(offset);
 return playerConeGripTarget(world,out,out);
}
