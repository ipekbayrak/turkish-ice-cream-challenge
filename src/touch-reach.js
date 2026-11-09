import { MathUtils, Vector3 } from 'three';

export const TOUCH_DOT_RADIUS = 4;
// Fixed, modest offset: the hand behaves like a cursor, independent of arm pose.
export const pointerLift = (type='touch',height=844) => type==='mouse' ? 28 : 44;

/** The interaction point is the fingertip, slightly above physical contact.
 * Input uses a frozen camera and never reads a posed hand or carried object. */
export class TouchReach {
  constructor(world) {
    this.world=world;this.target=new Vector3();this.ray=new Vector3();this.scratch=new Vector3();
    this.camera=null;this.width=1;this.height=1;this.aimX=0;this.aimY=0;this.pointerType='touch';
  }
  begin(camera,width,height) {
    camera.updateWorldMatrix(true,false);this.camera=camera.clone();this.camera.updateMatrixWorld(true);
    this.width=Math.max(1,width);this.height=Math.max(1,height);
  }
  end(){this.camera=null;}
  update(clientX,clientY,depth=.26,pointerType='touch') {
    this.pointerType=pointerType;
    return this.updateAim(clientX,clientY-pointerLift(pointerType,this.height),depth);
  }
  /** Already positioned virtual cursor; no physical-finger offset is applied. */
  updateAim(screenX,screenY,depth=.26) {
    if(!this.camera)return null;
    const x=MathUtils.clamp(screenX,8,this.width-8);
    const y=MathUtils.clamp(screenY,12,this.height-12);
    this.aimX=x/this.width*2-1;this.aimY=1-y/this.height*2;
    this.ray.set(this.aimX,this.aimY,.5).unproject(this.camera).sub(this.camera.position).normalize();
    const z=MathUtils.clamp(depth,.24,.48);
    this.target.copy(this.camera.position).addScaledVector(this.ray,(z-this.camera.position.z)/this.ray.z);
    return this.target;
  }
  /** Inverse for previews: a desired fingertip target becomes raw input. */
  contactAt(point,pointerType=this.pointerType,out={x:0,y:0}) {
    this.scratch.copy(point).project(this.camera);
    out.x=(this.scratch.x+1)*this.width*.5;
    out.y=(1-this.scratch.y)*this.height*.5+pointerLift(pointerType,this.height);
    return out;
  }
}
