import {fitAnchoredPlayerArm} from './player-arm.js';
import { CapsuleGeometry, Color, Group, MathUtils, Mesh, MeshStandardMaterial, Object3D, Quaternion, SphereGeometry, Vector3 } from 'three';
import { handSide } from './hand-orientation.js';

const Y=new Vector3(0,1,0),Z=new Vector3(0,0,1),scratch=new Vector3();
export const HAND_GRIP_CENTER=Object.freeze({x:0,y:.079,z:-.050});
export function handGripCenter(pose='cone',radius=.028,out=new Vector3()){
  out.copy(HAND_GRIP_CENTER);if(pose==='pole')out.z=-(radius+.022);return out;
}

/** One anatomical wrist/palm/finger hierarchy shared by customer and vendor.
 * +Y follows the hand; the natural cylindrical grip runs across the knuckles
 * on X. Turn the entire hand/forearm to serve a vertical cone, never just the
 * palm at the end of an unrelated forearm. */
export class HandRig extends Group {
  constructor({material=new MeshStandardMaterial({color:0xf2c29b,roughness:.62}),side,handedness}={}){
    super();this.name='articulated-hand';
    this.handedness=handedness||(side===undefined?'right':side<0?'right':'left');
    this.side=handSide(this.handedness);this.pose='point';
    const sphere=(radius,scale,position)=>{const mesh=new Mesh(new SphereGeometry(radius,14,10),material);mesh.scale.set(...scale);mesh.position.set(...position);mesh.castShadow=true;return mesh;};
    this.wristAnchor=new Object3D();this.wristAnchor.name='anatomical-wrist';this.add(this.wristAnchor);
    this.wrist=sphere(.028,[1,1.12,.82],[0,0,0]);this.add(this.wrist);
    this.palm=sphere(.052,[.97,1.10,.43],[0,.045,-.006]);this.add(this.palm);
    this.thenar=sphere(.026,[.88,1.18,.78],[this.side*.029,.028,-.008]);this.add(this.thenar);
    const joint=(parent,radius)=>{const mesh=sphere(radius,[1,1,1],[0,0,0]);parent.add(mesh);return mesh;};
    const segment=(parent,length,radius)=>{const mesh=new Mesh(new CapsuleGeometry(radius,Math.max(.002,length-2*radius),4,10),material);mesh.position.y=length*.5;mesh.castShadow=true;parent.add(mesh);return mesh;};
    this.fingers=[];
    const nailMat=new MeshStandardMaterial({color:material.color.clone().lerp(new Color(0xffe5d2),.48),roughness:.7});
    const offsets=[.033,.011,-.011,-.032],lengths=[.075,.083,.077,.063];
    for(let i=0;i<4;i++){
      const parts=[lengths[i]*.43,lengths[i]*.32,lengths[i]*.25],base=new Group(),middle=new Group(),tip=new Group();
      base.position.set(offsets[i]*this.side,.087-(i===3?.009:0),-.006);this.add(base);
      const baseJoint=joint(base,.0115),proximal=segment(base,parts[0],.0105);
      middle.position.y=parts[0];base.add(middle);const middleJoint=joint(middle,.0095),intermediate=segment(middle,parts[1],.009);
      tip.position.y=parts[1];middle.add(tip);const tipJoint=joint(tip,.0085),distal=segment(tip,parts[2],.008);
      const tipAnchor=new Object3D();tipAnchor.position.y=parts[2];tipAnchor.name=i===0?'index-tip':`finger-tip-${i}`;tip.add(tipAnchor);
      const nail=new Mesh(new SphereGeometry(1,8,6),nailMat);nail.name='dorsal-nail';nail.scale.set(.006,.008,.0012);nail.position.set(0,parts[2]*.56,.0078);tip.add(nail);
      this.fingers.push({base,middle,tip,lengths:parts,proximal,intermediate,distal,baseJoint,middleJoint,tipJoint,tipAnchor});
    }
    this.thumbPivot=new Group();this.thumbPivot.position.set(this.side*.038,.029,-.004);this.add(this.thumbPivot);
    this.thumbBaseJoint=joint(this.thumbPivot,.015);this.thumbProximal=segment(this.thumbPivot,.032,.0125);
    this.thumbJoint=new Group();this.thumbJoint.position.y=.032;this.thumbPivot.add(this.thumbJoint);
    this.thumbKnuckle=joint(this.thumbJoint,.0115);this.thumbDistal=segment(this.thumbJoint,.026,.0105);
    const thumbNail=new Mesh(new SphereGeometry(1,8,6),nailMat);thumbNail.name='dorsal-nail';thumbNail.scale.set(.007,.009,.0012);thumbNail.position.set(0,.015,.0102);this.thumbJoint.add(thumbNail);
    this.thumbTip=new Object3D();this.thumbTip.position.y=.026;this.thumbJoint.add(this.thumbTip);
    this.gripAnchor=new Object3D();this.gripAnchor.position.copy(HAND_GRIP_CENTER);this.gripAnchor.name='palm-grip';this.add(this.gripAnchor);
    this.aimAnchor=this.fingers[0].tipAnchor;
    this.setPose('point',1);
  }
  setPose(pose,blend=1,{count=4,curl=.15,radius=.02}={}){
    this.pose=pose;const b=MathUtils.clamp(blend,0,1);
    const cylinder=pose==='cone'||pose==='pole';
    const gripWidth=MathUtils.clamp((radius-.014)/.013,0,1);
    handGripCenter(pose,radius,this.gripAnchor.position);
    for(const [i,f] of this.fingers.entries()){
      const open=pose==='open'&&i<count||pose==='point'&&i===0;
      // Each finger follows a different arc around a tapered wafer. Equal
      // curls push the short little finger through the cone instead of around it.
      const gripCurl=pose==='cone'?[.56,.66,.72,.60][i]:MathUtils.lerp([1.10,1.23,1.14,.92][i],[.66,.78,.70,.54][i],gripWidth);
      const amount=pose==='relaxed'?[.18,.27,.33,.38][i]:open?.035:cylinder?gripCurl:pose==='pinch'?(i===0?.90:.55):MathUtils.clamp(.45+curl*.45,.4,.9);
      f.base.rotation.x=MathUtils.lerp(f.base.rotation.x,-amount,b);
      f.middle.rotation.x=MathUtils.lerp(f.middle.rotation.x,-amount*1.12,b);
      f.tip.rotation.x=MathUtils.lerp(f.tip.rotation.x,-amount*.66,b);
      f.base.rotation.z=MathUtils.lerp(f.base.rotation.z,open||pose==='relaxed'?(1.5-i)*-.028*this.side:0,b);
    }
    this.thumbPivot.position.z=MathUtils.lerp(this.thumbPivot.position.z,pose==='cone'?-.024:pose==='pole'?-.014-gripWidth*.006:pose==='pinch'?-.014:-.004,b);
    this.thumbPivot.rotation.x=MathUtils.lerp(this.thumbPivot.rotation.x,pose==='cone'?-1.00:pose==='pole'?-.80-gripWidth*.12:pose==='pinch'?-.70:-.12,b);
    this.thumbPivot.rotation.y=MathUtils.lerp(this.thumbPivot.rotation.y,(cylinder?-.15:pose==='pinch'?0:.12)*this.side,b);
    this.thumbPivot.rotation.z=MathUtils.lerp(this.thumbPivot.rotation.z,(cylinder?.45:pose==='pinch'?.10:-.72)*this.side,b);
    this.thumbJoint.rotation.x=MathUtils.lerp(this.thumbJoint.rotation.x,cylinder||pose==='pinch'?-.45:-.18,b);
    if(pose==='pinch'){
      this.updateWorldMatrix(true,true);
      const index=this.worldToLocal(this.aimAnchor.getWorldPosition(new Vector3()));
      const thumb=this.worldToLocal(this.thumbTip.getWorldPosition(new Vector3()));
      this.gripAnchor.position.copy(index).add(thumb).multiplyScalar(.5);
    }
    return this;
  }
  /** Place a cylindrical grip without moving its owner/contact root. */
  placeGrip(center,axis,pose='cone',radius=.028){
    this.setPose(pose,1,{radius});
    if(axis==='cone')this.quaternion.setFromAxisAngle(Z,this.side*Math.PI/2);
    else this.quaternion.setFromAxisAngle(Y,-this.side*Math.PI/2);
    this.position.copy(center).sub(scratch.copy(this.gripAnchor.position).applyQuaternion(this.quaternion));
    return this;
  }
  placeOpen(count=4){this.position.set(0,0,0);this.quaternion.identity();this.setPose('open',1,{count});return this;}
  placePinch(center){this.setPose('pinch',1);this.quaternion.setFromAxisAngle(Z,this.side*Math.PI/2);this.position.copy(center).sub(scratch.copy(this.gripAnchor.position).applyQuaternion(this.quaternion));return this;}
}

const armDirection=new Vector3(),wristLocal=new Vector3(),armEnd=new Vector3(),axis=new Vector3();
/** Keep the customer's forearm anatomically aligned with the posed wrist.
 * Geometry ends inside the wrist; a small bend toward the player's elbow is
 * distributed over the forearm instead of shearing the palm ninety degrees. */
export function fitPlayerForearm(world){
  if(fitAnchoredPlayerArm(world))return;
  if(!world.playerHandRig||!world.touristForearm)return;
  const hand=world.playerHandRig;
  wristLocal.copy(hand.position);
  armDirection.copy(Y).applyQuaternion(hand.quaternion);
  armEnd.copy(wristLocal).addScaledVector(armDirection,-.30).add(new Vector3(0,-.06,.10));
  axis.copy(wristLocal).sub(armEnd).normalize();
  const arm=world.touristForearm,sleeve=world.touristSleeve;
  arm.position.copy(wristLocal).add(armEnd).multiplyScalar(.5);
  arm.quaternion.setFromUnitVectors(Y,axis);
  arm.scale.set(1,(wristLocal.distanceTo(armEnd)+.025)/arm.geometry.parameters.height,1);
  sleeve.quaternion.copy(arm.quaternion);sleeve.position.copy(armEnd).addScaledVector(axis,.018);sleeve.scale.set(1,1,1);
  if(world.touristBracelet){world.touristBracelet.position.copy(wristLocal).addScaledVector(axis,-.027);world.touristBracelet.quaternion.setFromUnitVectors(Z,axis);}
}
