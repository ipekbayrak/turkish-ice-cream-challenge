import {Quaternion,Vector3,MathUtils} from 'three';

/** Smooth a free hand's palm/finger pose while preserving its actual grip (or
 * wrist) contact. Pole support transitions keep VendorSupportReach's path. */
export class VendorHandBlend {
 constructor(rig){
  this.rig=rig;const h=rig.handRig;this.joints=h.fingers.flatMap(f=>[f.base,f.middle,f.tip]).concat(h.thumbPivot,h.thumbJoint);
  this.last={rotation:new Quaternion(),grip:new Vector3(),thumb:new Vector3(),joints:this.joints.map(j=>j.rotation.clone())};
  this.from={rotation:new Quaternion(),grip:new Vector3(),thumb:new Vector3(),joints:this.joints.map(j=>j.rotation.clone())};
  this.goal=new Quaternion();this.parent=new Quaternion();this.contact=new Vector3();this.local=new Vector3();this.role=null;this.age=.26;
 }
 save(out){const h=this.rig.handRig;h.getWorldQuaternion(out.rotation);out.grip.copy(h.gripAnchor.position);out.thumb.copy(h.thumbPivot.position);this.joints.forEach((j,i)=>out.joints[i].copy(j.rotation));}
 apply(role,dt){
  const rig=this.rig,h=rig.handRig;
  if(this.role===null){this.role=role;this.save(this.last);return;}
  if(role!==this.role){
   this.from.rotation.copy(this.last.rotation);this.from.grip.copy(this.last.grip);this.from.thumb.copy(this.last.thumb);this.joints.forEach((_,i)=>this.from.joints[i].copy(this.last.joints[i]));
   this.role=role;this.age=role==='pole'?.26:0;
  }
  this.age=Math.min(.26,this.age+Math.max(0,dt));
  if(this.age<.26&&role!=='pole'){
   const u=MathUtils.smoothstep(this.age,0,.26),anchor=role==='free'?h.wristAnchor:h.gripAnchor;
   h.updateWorldMatrix(true,true);anchor.getWorldPosition(this.contact);h.getWorldQuaternion(this.goal);rig.handGroup.getWorldQuaternion(this.parent);
   h.quaternion.copy(this.from.rotation).slerp(this.goal,u).premultiply(this.parent.invert());
   h.gripAnchor.position.lerpVectors(this.from.grip,h.gripAnchor.position,u);h.thumbPivot.position.lerpVectors(this.from.thumb,h.thumbPivot.position,u);
   this.joints.forEach((j,i)=>{const a=this.from.joints[i],b=j.rotation;b.set(MathUtils.lerp(a.x,b.x,u),MathUtils.lerp(a.y,b.y,u),MathUtils.lerp(a.z,b.z,u));});
   rig.handGroup.worldToLocal(this.local.copy(this.contact));
   h.position.copy(this.local).sub(this.contact.copy(anchor.position).applyQuaternion(h.quaternion));
   h.updateWorldMatrix(true,true);
  }
  this.save(this.last);
 }
}
