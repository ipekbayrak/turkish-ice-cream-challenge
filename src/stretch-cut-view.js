import * as THREE from 'three';

/** Small, reusable presentation for pressure and the player's chopping hand.
 * It rotates joints at the wrist, never the hand root or any gameplay target. */
export class StretchCutView {
  constructor(world) {
    this.w=world;this.state=null;this.blend=0;this.hold=0;this.followThrough=0;
    this.direction=new THREE.Vector3(1,0,0);this.point=new THREE.Vector3();
    this.trail=new THREE.Group();this.trail.name='hand-cut-streak';this.trail.visible=false;world.scene.add(this.trail);
    this.material=new THREE.MeshBasicMaterial({color:0xfff7de,transparent:true,opacity:.45,depthWrite:false});
    this.line=new THREE.Mesh(new THREE.CylinderGeometry(.005,.002,1,6),this.material);this.trail.add(this.line);
    this.ring=new THREE.Mesh(new THREE.TorusGeometry(.028,.0025,6,24),this.material);this.trail.add(this.ring);
    this.yAxis=new THREE.Vector3(0,1,0);this.cutRotation=new THREE.Quaternion();this.cutAxis=new THREE.Vector3(0,0,1);
  }
  set(state) {
    this.state=state;
    if(state?.direction)this.direction.copy(state.direction).normalize();
    if(state?.point)this.point.copy(state.point);
    if(state?.contact)this.hold=.12;
    if(state?.cut)this.followThrough=.38;
  }
  reset(){this.state=null;this.blend=0;this.hold=0;this.followThrough=0;this.trail.visible=false;}
  update(dt) {
    this.hold=Math.max(0,this.hold-dt);this.followThrough=Math.max(0,this.followThrough-dt);
    const active=this.hold>0||this.followThrough>0;
    this.blend+=(Number(active)-this.blend)*(1-Math.exp(-dt*20));
    const w=this.w;if(this.blend<.002||!w.palmGroup)return;
    // Fingers together, thumb tucked, palm edge turned into the swipe.
    const b=this.blend;
    // A small relative wrist roll preserves the natural POV frame. Absolute
    // Euler assignments used to overturn the entire rig and throw the arm up.
    this.cutRotation.setFromAxisAngle(this.cutAxis,(this.direction.x<0?-.28:.28)*b);
    w.palmGroup.quaternion.multiply(this.cutRotation);
    for(const finger of w.fingers||[]){finger.base.rotation.x=THREE.MathUtils.lerp(finger.base.rotation.x,-.08,b);finger.middle.rotation.x=THREE.MathUtils.lerp(finger.middle.rotation.x,-.08,b);finger.tip.rotation.x=THREE.MathUtils.lerp(finger.tip.rotation.x,-.03,b);}
    if(w.thumbPivot){const side=w.playerHandRig?.side||1;w.thumbPivot.rotation.z=THREE.MathUtils.lerp(w.thumbPivot.rotation.z,.14*side,b);w.thumbPivot.rotation.y=THREE.MathUtils.lerp(w.thumbPivot.rotation.y,-.40*side,b);}
    if(w.thumbJoint)w.thumbJoint.rotation.x=THREE.MathUtils.lerp(w.thumbJoint.rotation.x,-.85,b);
    this.trail.visible=active;
    if(!active)return;
    this.material.opacity=(this.followThrough>0?.50:.22)*b;
    const length=this.followThrough>0?.10+this.followThrough*.55:.07;
    this.trail.position.copy(this.point);
    this.line.quaternion.setFromUnitVectors(this.yAxis,this.direction);
    this.line.scale.y=length;
    this.line.position.copy(this.direction).multiplyScalar(-length*.22);
    this.ring.visible=this.followThrough>0;
    this.ring.scale.setScalar(1+(1-this.followThrough/.38)*1.2);
    if(w.camera)this.ring.quaternion.copy(w.camera.quaternion);
  }
}
