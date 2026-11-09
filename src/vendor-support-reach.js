import {Quaternion,Vector3} from 'three';
import {handGripCenter} from './hand-rig.js';
import {canonicalPoleHandRotation,poleContactRotation} from './hand-orientation.js';

const Y=new Vector3(0,1,0),Z=new Vector3(0,0,1);
/** A free wrist approaches the pole before its root becomes a grip contact.
 * Only presentation state lives here; held props and gameplay are untouched. */
export class VendorSupportReach {
 constructor(rig,spring){
  this.spring=spring;rig.handRig.wristAnchor.getWorldPosition(spring.pos);spring.vel.set(0,0,0);
  this.groupRotation=rig.handGroup.quaternion.clone();this.handRotation=rig.handRig.quaternion.clone();
  this.goalGroup=new Quaternion();this.goalHand=new Quaternion();this.target=new Vector3();this.previous=new Vector3();this.age=0;
 }
 update(rig,contact,shaftDirection,roll,dt,obstacle=null,radius=.014,contactFrame=null){
  this.age+=dt;
  this.radius=radius;
  this.goalGroup.copy(contactFrame||poleContactRotation(rig.handRig.side,shaftDirection,contact,rig.armPose?.elbow,roll));
  canonicalPoleHandRotation(rig.handRig.side,this.goalHand);
  const offset=handGripCenter('pole',radius).applyQuaternion(this.goalHand).negate().applyQuaternion(this.goalGroup);
  this.target.copy(contact).add(offset);
  this.previous.copy(this.spring.pos);
  const waypoint=obstacle?obstacle.routeHandWaypoint(this.previous,this.target,rig.armSide||1):this.target;
  this.spring.target.copy(waypoint);this.spring.step(dt);
  const step=this.spring.pos.clone().sub(this.previous),limit=Math.max(0,dt)*1.8;
  if(step.length()>limit){this.spring.pos.copy(this.previous).add(step.setLength(limit));this.spring.vel.clampLength(0,1.8);}
  if(obstacle&&obstacle.penetration(this.previous,this.spring.pos)>1e-6){
    const clearStep=waypoint.clone().sub(this.previous).clampLength(0,limit);
    this.spring.pos.copy(this.previous).add(clearStep);this.spring.vel.set(0,0,0);
  }
  this.groupRotation.rotateTowards(this.goalGroup,dt*5);this.handRotation.rotateTowards(this.goalHand,dt*5);
  return this.spring.pos;
 }
 apply(rig,dt){
  rig.handGroup.quaternion.copy(this.groupRotation);rig.handRig.position.set(0,0,0);rig.handRig.quaternion.copy(this.handRotation);
  rig.handRig.setPose(this.age<.15?'open':'pole',1-Math.exp(-dt*12),{radius:this.radius});rig.handRig.pose='support-reach';
  this.spring.pos.copy(rig.handGroup.position);
 }
 ready(rig){
  return this.age>.22&&rig.handGroup.position.distanceTo(this.target)<.014&&
   this.groupRotation.angleTo(this.goalGroup)<.04&&this.handRotation.angleTo(this.goalHand)<.04;
 }
}
