import {Quaternion,MathUtils} from 'three';

/** Axial spins and ordinary flips interpret the authored roll differently.
 * Fade only that change of coordinate frame; retain every authored full turn. */
export class ServingOrientation {
 constructor(){this.mode=null;this.age=.32;this.last=new Quaternion();this.correction=new Quaternion();this.blend=new Quaternion();}
 reset(){this.mode=null;this.age=.32;}
 apply(cone,mode,dt){
  if(this.mode!==null&&mode!==this.mode){
   this.correction.copy(cone.quaternion).invert().premultiply(this.last);this.age=0;
  }
  this.mode=mode;this.age=Math.min(.32,this.age+Math.max(0,dt));
  if(this.age<.32){
   this.blend.identity().slerp(this.correction,1-MathUtils.smoothstep(this.age,0,.32));
   cone.quaternion.premultiply(this.blend);
  }
  this.last.copy(cone.quaternion);
 }
}
