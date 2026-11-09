import {constrainPlayerArmDepth} from './player-arm.js';
import { MathUtils, Vector3 } from 'three';
import { pointerLift } from './touch-reach.js';

/** Natural forearm + actual fingertip feedback. Never clip/shorten a limb at
 * physical contact: the user now aims with the raised finger, not the wrist. */
export class PointerTipView {
  constructor(world){this.world=world;this.point=new Vector3();this.ray=new Vector3();this.target=new Vector3();this.active=false;this.visible=false;this.x=0;this.y=0;}
  setActive(active){this.active=Boolean(active);if(!active)this.visible=false;}
  update(active,rawX,rawY,width,height,pointerType='touch',pinTip=true,aimPosition=null){
    this.setActive(active);
    // Late cut/gesture poses can rotate the fingers after the hand update.
    // Keep their actual tip pinned without changing the canonical input spring.
    const camera=this.world.camera;
    camera.updateMatrixWorld(true);
    if((active||aimPosition)&&pinTip&&!this.world.playerConeGripRequested&&this.world.handSpring?.target){
      const x=MathUtils.clamp(aimPosition?.x??rawX,8,width-8),y=MathUtils.clamp(aimPosition?.y??(rawY-pointerLift(pointerType,height)),12,height-12);
      this.ray.set(x/width*2-1,1-y/height*2,.5).unproject(camera).sub(camera.position).normalize();
      // Keep the authored forward reach depth, but camera easing never slides
      // the visible cursor away from the player's raised selection point.
      this.target.copy(camera.position).addScaledVector(this.ray,(this.world.handSpring.target.z-camera.position.z)/this.ray.z);
      constrainPlayerArmDepth(this.world,this.target,this.target);
      this.world.alignPlayerTipTo?.(this.target);
    }
    this.world.fitPlayerForearm?.();
    if(!active)return;
    const anchor=this.world.playerAimAnchor;
    if(!anchor){this.visible=false;return;}
    anchor.getWorldPosition(this.point);this.point.project(camera);
    this.x=(this.point.x+1)*width*.5;this.y=(1-this.point.y)*height*.5;
    this.visible=this.point.z>-1&&this.point.z<1&&this.x>=0&&this.x<=width&&this.y>=0&&this.y<=height;
  }

}

// Compatibility for development previews: the hand itself is the cursor.
export function drawPointerTip() {}

// Existing development previews share the new implementation.
export { PointerTipView as TouchArmView };
