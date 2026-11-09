import {Box3,Vector3} from 'three';

/** Filled vendor servings remain above the worktop. Scraping an actual tub
 * and the customer's independent hand retain their own authored paths. */
export class ServingClearance {
 constructor(){this.bounds=new Box3();this.part=new Box3();this.position=new Vector3();}
 apply(world){
  if(!world.basinDeckGroup)return false;
  const cone=world.conePivot,owner=cone?.parent;
  if(!cone||!cone.visible||!(world.scoopMeshes||[]).some(m=>m.visible))return false;
  if(owner!==world.paddleGroup&&owner!==world.lArmRig?.handGroup)return false;
  if(world.scoopStackGroup?.parent!==cone)return false;
  this.bounds.makeEmpty();
  for(const mesh of[world.mainConeMesh,...world.scoopMeshes]){
   if(!mesh?.visible||!mesh.geometry)continue;
   mesh.updateWorldMatrix(true,false);if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
   this.part.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);this.bounds.union(this.part);
  }
  const box=this.bounds;
  if(box.isEmpty()||box.max.x<-.60||box.min.x>.60||box.max.z<-.53||box.min.z>.07||box.min.y>=1.055)return false;
  const rise=1.055-box.min.y;
  owner.position.y+=rise;owner.updateWorldMatrix(true,true);
  if(owner===world.paddleGroup){if(world.coneSpring){world.coneSpring.pos.y+=rise;world.coneSpring.vel.y=Math.max(0,world.coneSpring.vel.y);}}
  else if(world.leftPropSpring){world.leftPropSpring.pos.y+=rise;world.leftPropSpring.vel.y=Math.max(0,world.leftPropSpring.vel.y);}
  return true;
 }
}
