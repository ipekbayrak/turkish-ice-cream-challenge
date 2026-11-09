import {Group,Vector3,Quaternion,MathUtils,Shape,Path,ExtrudeGeometry} from 'three';
import {ICE_CREAM_FLAVORS} from './flavors.js';

/** Real openings: an opaque deck must not cover the empty bucket interior. */
export function createBucketDeckGeometry(){
 const plate=new Shape();plate.moveTo(-.54,-.225);plate.lineTo(.54,-.225);plate.lineTo(.54,.225);plate.lineTo(-.54,.225);plate.closePath();
 for(const flavor of ICE_CREAM_FLAVORS){const hole=new Path();hole.absarc(flavor.xOffset,.065,.112,0,Math.PI*2,true);plate.holes.push(hole);}
 return new ExtrudeGeometry(plate,{depth:.018,bevelEnabled:false,steps:1,curveSegments:24});
}

// The seated crown matches the original sculpted surface. Its dense body fits
// below the rim; the same mesh can then leave and return to that exact seat.
export function tubMoldSeat(world,index,out=new Vector3()){
 const tub=world.tubIceGroups?.[index],group=tub?.group;
 const crown=world.giantBlockHeight*.5+.085*.22;
 if(group?.parent){
  group.parent.updateWorldMatrix(true,false);
  return out.set(0,(tub.baseY??.018)+(tub.surfaceY??.07408)-crown,0).applyMatrix4(group.parent.matrixWorld);
 }
 return out.copy(world.tubPositions[index].worldPos).add(new Vector3(0,-.14,0));
}

/** The carrier is the existing trick prop. Actual food models live either in
 * their own bucket or in that carrier, never in both places. At most four
 * models share the existing geometry; materials stay flavor-specific. */
export class TubMoldTransfer {
 constructor(world){
  this.world=world;this.carrier=world.giantBlockGroup;this.template=new Group();
  for(const child of [...this.carrier.children])this.template.add(child);
  this.baseMaterial=world.giantBlockMat;this.entries=new Map();this.active=null;
  this.position=new Vector3();this.seat=new Vector3();this.delta=new Vector3();this.up=new Vector3();
  this.rotation=new Quaternion();this.seatRotation=new Quaternion();this.parentRotation=new Quaternion();
 }
 begin(index){
  if(this.active?.index===index)return;
  if(this.active)this.dock();
  const w=this.world,tub=w.tubIceGroups[index];let entry=this.entries.get(index);
  if(!entry){
   const model=this.template.clone(true),material=this.baseMaterial.clone();
   model.name=`whole-tub-ice-${index}`;material.color.setHex(ICE_CREAM_FLAVORS[index]?.colorHex??0xfff8e7);
   model.traverse(node=>{if(node.isMesh)node.material=material;});
   entry={index,model,material,tub,original:[...tub.group.children]};this.entries.set(index,entry);
  }
  for(const mesh of entry.original)mesh.visible=false;
  tub.churnEnergy=0;tub.fill=0;tub.moldOut=true;tub.group.visible=false;
  tub.group.position.y=tub.baseY??.018;tub.group.rotation.set(0,0,0);tub.group.scale.set(1,1,1);
  w.scene.attach(this.carrier);this.carrier.add(entry.model);
  entry.model.position.set(0,0,0);entry.model.quaternion.identity();entry.model.scale.setScalar(1);entry.model.visible=true;
  this.carrier.visible=true;w.giantBlockMat=entry.material;this.active=entry;
 }
 align(){
  if(!this.active)return;
  const w=this.world,{index,tub}=this.active,root=this.carrier;
  if(!tub.group.parent||!root.parent)return;
  root.getWorldPosition(this.position);tubMoldSeat(w,index,this.seat);this.delta.copy(this.position).sub(this.seat);
  tub.group.parent.getWorldQuaternion(this.seatRotation);this.up.set(0,1,0).applyQuaternion(this.seatRotation);
  const height=this.delta.dot(this.up);this.delta.addScaledVector(this.up,-height);
  const blend=(1-MathUtils.smoothstep(height,.28,.41))*(1-MathUtils.smoothstep(this.delta.length(),.02,.12));
  if(blend<=0)return;
  root.getWorldQuaternion(this.rotation);this.rotation.slerp(this.seatRotation,blend);
  root.parent.getWorldQuaternion(this.parentRotation).invert();root.quaternion.copy(this.parentRotation).multiply(this.rotation);
  root.updateWorldMatrix(true,true);
 }
 dock(){
  if(!this.active)return;
  const {tub,model}=this.active,w=this.world;
  tub.group.add(model);model.position.set(0,(tub.surfaceY??.07408)-(w.giantBlockHeight*.5+.085*.22),0);
  model.quaternion.identity();model.scale.setScalar(1);model.visible=true;
  tub.fill=1;tub.moldOut=false;tub.group.visible=true;tub.group.scale.set(1,1,1);tub.group.position.y=tub.baseY??.018;
  this.carrier.visible=false;w.giantBlockMat=this.baseMaterial;this.active=null;
 }
}
