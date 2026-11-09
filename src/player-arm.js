import {Vector3} from 'three';

// Only the distal forearm and cuff are rendered in POV. The shoulder remains
// outside the view; no camera-to-wrist bridge can cross the playing area.
export const PLAYER_FOREARM_LENGTH=.24;
export const PLAYER_UPPER_ARM_LENGTH=.09;
export const PLAYER_SHOULDER=Object.freeze({x:.26,y:-.28,z:-.64});
const Y=new Vector3(0,1,0),Z=new Vector3(0,0,1);
export function playerShoulderWorld(w,out=new Vector3()){
 w.camera.updateWorldMatrix(true,false);
 return out.set(PLAYER_SHOULDER.x,PLAYER_SHOULDER.y,PLAYER_SHOULDER.z).applyMatrix4(w.camera.matrixWorld);
}
// Compatibility with late fingertip alignment. Rendering never changes aim
// depth to satisfy an unseen full arm, so the hand cannot grow toward camera.
export function constrainPlayerArmDepth(w,target,out=new Vector3()){return out.copy(target);}

export function fitAnchoredPlayerArm(w){
 if(!w.playerHandRig||!w.touristForearm||!w.touristSleeve)return false;
 const hand=w.playerHandRig,root=w.touristHand;
 const s=w.playerArmState ||= {wrist:new Vector3(),elbow:new Vector3(),shoulder:new Vector3(),axis:new Vector3(),a:new Vector3(),b:new Vector3()};
 root.updateWorldMatrix(true,true);hand.wristAnchor.getWorldPosition(s.wrist);
 s.axis.copy(Y).transformDirection(hand.matrixWorld);
 s.elbow.copy(s.wrist).addScaledVector(s.axis,-PLAYER_FOREARM_LENGTH);
 s.shoulder.copy(s.elbow).addScaledVector(s.axis,-PLAYER_UPPER_ARM_LENGTH);
 const segment=(mesh,a,b,length)=>{
  s.a.copy(a);s.b.copy(b);root.worldToLocal(s.a);root.worldToLocal(s.b);
  mesh.position.copy(s.a).add(s.b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(Y,s.b.sub(s.a).normalize());
  mesh.scale.set(1,length/mesh.geometry.parameters.height,1);
 };
 segment(w.touristForearm,s.elbow,s.wrist,PLAYER_FOREARM_LENGTH);
 segment(w.touristSleeve,s.shoulder,s.elbow,PLAYER_UPPER_ARM_LENGTH);
 if(s.joint)s.joint.visible=false;if(s.collar)s.collar.visible=false;
 if(w.touristBracelet){
  s.a.copy(s.wrist).addScaledVector(s.axis,-.027);root.worldToLocal(s.a);w.touristBracelet.position.copy(s.a);
  s.a.copy(s.axis).transformDirection(root.matrixWorld.clone().invert());w.touristBracelet.quaternion.setFromUnitVectors(Z,s.a);
 }
 return true;
}
