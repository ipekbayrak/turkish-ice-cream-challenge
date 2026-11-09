import {Vector3,MathUtils} from 'three';
import {ICE_CREAM_FLAVORS} from './flavors.js';
import {FLAVOR_FEINT_ID} from './flavor-feint-plan.js';
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z),Y=V(0,1,0);
const ease=t=>{const p=MathUtils.clamp(t,0,1);return p*p*(3-2*p);};
const HOLD=V(.25,1.20,-.235),REST=V(-.25,1.28,-.12);

export function activateFlavorFeint(d,index){
 const plan=d.flavorFeint;
 if(!plan||plan.status!=='planned'||index!==plan.prepareAt)return;
 plan.status='active';const display=d.selectedFlavors.slice();display[plan.index]=plan.offered;
 d.world.applySelectedFlavorColors(display);
}
export function clearFlavorFeint(d){
 const plan=d.flavorFeint,w=d.world;
 if(plan&&plan.status!=='done'){
  w.applySelectedFlavorColors(d.selectedFlavors);w.carryScoop.visible=false;w.updateIceCreamScoops(d.scoopCount||0,false);
  w.vendorConeReceiveProgress=null;w.vendorConeReceiveFrom=null;
 }
 if(w._vendorReaction?.kind==='refusal')w.cancelVendorReaction?.();
 d.flavorFeintShow=null;d.flavorFeint=null;
}
function phase(d,n){const s=d.flavorFeintShow;s.phase=n;s.age=0;s.from=d.coneWorldPos.clone();s.blade=d.world.getPaddleStrikePoint(V());}
function bareAt(d,point){d.world.vendorPoleFree=true;d.coneTargetPos.copy(point);d.presentationStrikeTip=point.clone();d.presentationExact=true;}
function carryAt(d,point){const w=d.world,s=d.flavorFeintShow;w.vendorPoleFree=false;w.carryScoop.visible=true;w.carryScoop.position.copy(point);d.presentationStrikeTip=null;d.carryScoopOffsetY=s.radius;d.coneTargetPos.copy(point).addScaledVector(Y,-s.radius);d.presentationExact=true;}
function arc(out,from,to,u,height=.16){out.copy(from).lerp(to,ease(u));out.y+=Math.sin(MathUtils.clamp(u,0,1)*Math.PI)*height;return out;}
function worldPoint(w,object){w.scene.updateMatrixWorld(true);return object.getWorldPosition(V());}
function sourceCenter(d){return d.world.getScoopAnchor(d.flavorFeint.index).clone();}
function highestCrown(w){const top=w.paddleContact.highestVisible(w);if(!top)return worldPoint(w,w.conePivot);return top.localToWorld(V(0,top.geometry.parameters.radius,0));}

export function enterFlavorFeint(d){
 if(d.currentMechanic!==FLAVOR_FEINT_ID)return false;
 const w=d.world,plan=d.flavorFeint;
 if(!plan||plan.status!=='active'){d._enterRoutineStep(d.routineIndex+1);return true;}
 const mesh=w.scoopMeshes[plan.index];w.scene.updateMatrixWorld(true);
 const scale=mesh.getWorldScale(V()),radius=mesh.geometry.parameters.radius*scale.y;
 d.flavorFeintShow={phase:plan.rejected?0:-1,age:0,offerAge:0,rejectionPause:0,from:d.coneWorldPos.clone(),point:V(),radius,carryScale:scale.multiplyScalar(mesh.geometry.parameters.radius/w.carryScoop.geometry.parameters.radius),receive:null,blade:w.getPaddleStrikePoint(V())};
 w.carryScoop.visible=false;d.heldItem=null;
 return true;
}

/** Returns the same visible top to its own tub, then physically fetches its replacement.
 * Lower scoops keep their layout throughout; no saved order or score is changed. */
export function updateFlavorFeint(d,dt,input){
 const s=d.flavorFeintShow;if(!s)return false;
 const w=d.world,plan=d.flavorFeint;
 s.age+=Math.max(0,dt)*(d.config?.speedMult||1)*1.22;
 d.idleSeconds=0;d.isAfkShowActive=false;d.shaftRoll=d.coneFlipZ=d.conePitchX=0;
 d.gestureValidation.update(input,dt,`flavor-feint:${d.routineIndex}`);
 if(s.phase>=2)d.leftHandCustomTarget=HOLD.clone();
 const t=s.age,p=s.point;
 if(s.phase===-1){
  s.offerAge+=Math.max(0,dt);d.coneTargetPos.copy(s.from);d.conePitchX=-.06*ease(s.offerAge/.3);d.presentationExact=true;
  if(plan.rejected){s.rejectionPause+=dt;if(s.rejectionPause>=.35)phase(d,0);}
  else if(s.offerAge>=4){d.sayLine?.(d.save.lang==='tr'?'Şakaydı! Seninki geliyor.':'Just teasing! Yours is coming.','taunt',1.5);phase(d,0);}
 }else if(s.phase===0){
  const beat=Math.min(1,Math.floor(t/.8)),u=Math.min(1,(t-beat*.8)/.8),pulse=Math.sin(u*Math.PI);
  if(s.feintBeat!==beat){s.feintBeat=beat;d.sound.syncMusicBeat?.();d.sound.playWhoosh?.(.65,(beat?1:-1)*.14);}
  d.coneTargetPos.copy(s.from).add(V((beat?1:-1)*.14*pulse,.035*pulse,.13*pulse));
  d.shaftRoll=(beat?-.5:.5)*pulse;d.conePitchX=-.12*pulse;d.presentationExact=true;
  if(t>=1.6){w.beginVendorConeReceive?.();s.receive={age:0,from:d.coneWorldPos.clone()};phase(d,1);}
 }else if(s.phase===1){
  const receive=s.receive;receive.age+=dt;w.vendorConeReceiveProgress=Math.min(1,receive.age/.25);
  d.leftHandCustomTarget=HOLD.clone();d.coneTargetPos.copy(receive.from).lerp(V(.25,1.31,-.20),ease(receive.age/.44));d.presentationExact=true;
  w.scene.updateMatrixWorld(true);const grip=w.lArmRig.handGroup.localToWorld(V(0,.11,.035)),cone=worldPoint(w,w.conePivot);
  if(receive.age>=.44&&grip.distanceTo(cone)<.04){w.setConeInVendorHand(true);w.vendorConeReceiveProgress=null;w.vendorConeReceiveFrom=null;w.vendorPoleFree=true;phase(d,2);}
 }else if(s.phase===2){
  const mesh=w.scoopMeshes[plan.index],scale=mesh.getWorldScale(V());
  s.radius=mesh.geometry.parameters.radius*scale.y;s.carryScale.copy(scale).multiplyScalar(mesh.geometry.parameters.radius/w.carryScoop.geometry.parameters.radius);
  const center=sourceCenter(d),contact=center.clone().addScaledVector(Y,s.radius);
  bareAt(d,p.copy(s.blade).lerp(contact,ease(t/.45)));
  if(t>=.45&&w.getPaddleStrikePoint(V()).distanceTo(contact)<.035){
   w.scoopMeshes[plan.index].visible=false;w.carryScoop.material.color.setHex(ICE_CREAM_FLAVORS[plan.offered].colorHex);w.carryScoop.scale.copy(s.carryScale);carryAt(d,center);
   phase(d,3);s.from.copy(center);
  }
 }else if(s.phase===3){
  const tub=w.tubPositions[plan.offered].worldPos,inside=tub.clone().addScaledVector(Y,-s.radius);
  carryAt(d,arc(p,s.from,inside,t/.8,.18));
  if(t>.6)w.churnTubIceCream?.(plan.offered,dt*.7);
  if(t>=.8){
   w.carryScoop.visible=false;w.vendorPoleFree=true;plan.status='restoring';w.applySelectedFlavorColors(d.selectedFlavors);phase(d,4);
   d.sayLine?.(d.save.lang==='tr'?'Tamam, istediğin geliyor.':'Here comes the one you ordered.','hmm',1.5);
  }
 }else if(s.phase===4){
  const tub=w.tubPositions[plan.requested].worldPos,inside=tub.clone().add(V(0,-.025,0));
  bareAt(d,arc(p,s.blade,inside,t/.6,.22));w.churnTubIceCream?.(plan.requested,dt);
  if(t>=.6){w.carryScoop.material.color.setHex(ICE_CREAM_FLAVORS[plan.requested].colorHex);phase(d,5);s.from.copy(tub).addScaledVector(Y,-s.radius);}
 }else if(s.phase===5){
  const tub=w.tubPositions[plan.requested].worldPos,lift=tub.clone().add(V(0,.28,.04));
  p.copy(s.from).lerp(lift,ease(t/.7));w.churnTubIceCream?.(plan.requested,dt);
  if(t<.18)bareAt(d,p.clone().addScaledVector(Y,s.radius));else carryAt(d,p);
  if(t>=.7){phase(d,6);s.from.copy(p);}
 }else if(s.phase===6){
  const destination=sourceCenter(d);carryAt(d,arc(p,s.from,destination,t/.65,.08));
  if(t>=.65){
   w.carryScoop.visible=false;w.scoopMeshes[plan.index].visible=true;w.vendorPoleFree=true;
   d.sound.playScoopAdded?.();d.sound.syncMusicBeat?.();w.triggerScoopJiggle(.7);phase(d,7);
  }
 }else if(s.phase===7){
  const contact=highestCrown(w);bareAt(d,p.copy(s.blade).lerp(contact,ease(t/.5)));
  if(t>=.5&&w.getPaddleStrikePoint(V()).distanceTo(contact)<.035){w.handoffCone('paddle');w.vendorPoleFree=false;d.heldItem=null;phase(d,8);}
 }else{
  d.coneTargetPos.copy(s.from).lerp(REST,ease(t/.6));d.presentationExact=true;w.vendorPoleFree=false;
  if(t>=.6){plan.status='done';d.flavorFeintShow=null;d.carryScoopOffsetY=null;d._enterRoutineStep(d.routineIndex+1);}
 }
 return true;
}

export function flavorFeintCue(d){
 const s=d.flavorFeintShow;if(!s)return null;
 if(s.phase===-1&&!d.flavorFeint?.rejected)return{kind:'reject',quiet:false,progress:d.flavorFeint?.refusalGesture?.progress||0,text:d.save.lang==='tr'?'SAĞA–SOLA SALLA':'WAVE LEFT–RIGHT'};
 return{quiet:true,progress:Math.max(0,Math.min(1,(s.phase+Math.min(1,s.age))/9)),text:d.save.lang==='tr'?'USTAYI İZLE':'WATCH THE VENDOR'};
}
