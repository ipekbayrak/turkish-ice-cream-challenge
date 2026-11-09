import {Vector3} from 'three';
import {scoopPath} from './trick-motion.js';
const V=(x=0,y=0,z=0)=>new Vector3(x,y,z);
export const scrapeBladePoint=w=>w.paddleStrikeAnchor?w.getPaddleStrikePoint(V()):w.paddleGroup.getWorldPosition(V());
/** The authored path is the steel blade contact, not the unrelated pole root.
 * A scoop is exposed only while that same blade lifts it out of the ice. */
export function scrapeServing(d,{progress,start,tub,deposit,color,radius=.064}){
 const w=d.world,p=Math.max(0,Math.min(1,progress)),tip=scoopPath(p,start,tub,deposit.clone().add(V(0,radius,0)));
 d.contactPathOwnsMotion=true;w.stretchyStrand.detach();d.shaftRoll=0;d.conePitchX=0;d.presentationExact=true;
 w.carryScoop.visible=p>=.51&&p<.92;
 if(w.carryScoop.visible){
  w.vendorPoleFree=false;w.carryScoop.material.color.setHex(color);w.carryScoop.scale.setScalar(radius/(w.carryScoop.geometry?.parameters?.radius||.064));
  const center=tip.clone().add(V(0,-radius,0));w.carryScoop.position.copy(center);d.carryScoopOffsetY=radius;d.coneTargetPos.copy(center).y-=radius;d.presentationStrikeTip=null;
 }else{
  w.vendorPoleFree=true;d.presentationStrikeTip=tip;
  const offset=scrapeBladePoint(w).sub(w.paddleGroup.position);d.coneTargetPos.copy(tip).sub(offset);
 }
 return tip;
}
