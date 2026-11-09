import { MathUtils, Vector3 } from 'three';
import { GestureValidation } from './gesture-validation.js';
import { isControlActive } from './pointer-controls.js';
const V=()=>new Vector3();
const ease=t=>{const p=MathUtils.clamp(t,0,1);return p*p*(3-2*p);};

/** The first real empty cone is the start control. No score or trick rules live here. */
export class ConeIntroduction {
  constructor(world,{onTake=()=>{},onTransfer=()=>{},onComplete=()=>{}}={}) {
    this.world=world;this.onTake=onTake;this.onTransfer=onTransfer;this.onComplete=onComplete;
    this.phase='inactive';this.age=0;this.transferred=false;
    this.validation=new GestureValidation();
    this.start=V();this.contact=V();this.withdraw=V();this.point=V();
  }
  get active(){return this.phase==='offer'||this.phase==='take';}
  get ready(){return this.phase==='offer';}
  reset(){
    this.phase='offer';this.movementHint=false;this.age=0;this.transferred=false;this.validation.reset();
    this.world.setPlayerConeGrip?.(false);
    this.world.prepareEmptyConeOffer();
  }
  pause(){this.phase='inactive';this.world.setPlayerConeGrip?.(false);this.world.setConeOfferGlow?.(0);}
  beginTake(input={}) {
    if(!this.ready)return false;
    this.phase='take';this.age=0;this.transferred=false;
    this.orderIntentAnchor=Number.isFinite(input.pointerX)&&Number.isFinite(input.pointerY)
      ?{pointerX:input.pointerX,pointerY:input.pointerY,epoch:input.pointerEpoch||0}:null;
    this.world.setConeOfferGlow?.(0);
    this.start.copy(this.world.touristHand.position);
    this.withdraw.copy(this.start);
    this.updateWithdraw(input);
    // A keyboard/menu activation uses a comfortable carry position too.
    if(!isControlActive(input))this.withdraw.set(.04,1.20,.26);
    this.world.setPlayerConeGrip?.(true);
    this.updateContact();this.onTake();return true;
  }
  updateContact(){
    this.world.getConeOfferTarget(this.point);
    this.world.getPlayerConeGripTarget(this.point,this.contact);
  }
  updateWithdraw(input){
    if(!isControlActive(input)||!input.intentWorldPos)return;
    if(this.world.getPlayerTipRootTarget)this.world.getPlayerTipRootTarget(input.intentWorldPos,this.withdraw);
    else this.withdraw.copy(input.intentWorldPos);
  }
  handTarget(out,input={}) {
    if(this.phase!=='take')return null;
    if(!this.transferred)this.updateContact();
    // Keep the latest converted root even when contact is released mid-take.
    // The initial approach still uses the real cone's physical grip target.
    this.updateWithdraw(input);
    if(this.age<.25)return out.copy(this.start).lerp(this.contact,ease(this.age/.25));
    return out.copy(this.contact).lerp(this.withdraw,ease((this.age-.32)/.46));
  }
  update(dt,time,input,blocked=false) {
    if(!this.active)return;
    if(!blocked)this.age+=Math.max(0,Math.min(dt,.05));
    const receiving=this.phase==='take';
    this.movementHint ||= Boolean(input.isMoving||input.speed>.05);
    this.world.setConeOfferGlow?.(this.ready&&!blocked ? .65+.35*Math.sin(time*3.2) : 0);
    const reach=receiving?1-ease((this.age-.25)/.53):ease(this.age/.7);
    this.world.updateEmptyConeOffer(time,dt,{reach,receiving});
    if(blocked)return;
    if(this.ready){
      this.validation.update(input,dt,'first-cone');
      const w=this.world,camera=w.camera;camera.updateMatrixWorld(true);
      // Touch the visible wafer body; its pivot is above the natural grip area.
      if (w.mainConeMesh) w.mainConeMesh.getWorldPosition(this.point);
      else this.world.getConeOfferTarget(this.point);
      this.point.project(camera);
      const width=w.canvas?.clientWidth||globalThis.window?.innerWidth||390;
      const height=w.canvas?.clientHeight||globalThis.window?.innerHeight||844;
      const x=(this.point.x+1)*width*.5,y=(1-this.point.y)*height*.5;
      const px=((input.aimNormX??input.normX)+1)*width*.5;
      const py=(1-(input.aimNormY??input.normY))*height*.5;
      const radius=MathUtils.clamp(Math.min(width,height)*.085,27,44);
      const visible=this.point.z>-1&&this.point.z<1&&x>=0&&x<=width&&y>=0&&y<=height;
      if(this.age>.45&&this.validation.reach('offered-cone',visible?Math.hypot(px-x,py-y):Infinity,radius,dt))this.beginTake(input);
    }else{
      if(this.age>=.25&&!this.transferred){
        this.updateContact();this.world.handoffCone('player');this.transferred=true;this.onTransfer();
      }
      if(this.age>=.78){
        this.phase='complete';this.world.setPlayerConeGrip?.(false);this.onComplete();
      }
    }
  }
}
