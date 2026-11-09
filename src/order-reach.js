import { MathUtils, Vector3 } from 'three';

const ease=t=>{const p=MathUtils.clamp(t,0,1);return p*p*(3-2*p);};

/** Acknowledgement pose only: raw aim, flavor picking and timers stay untouched.
 * The same held cone travels with the palm, briefly offering it to the vendor. */
export class OrderReach {
  constructor(){this.reset();}
  reset(){this.age=.4;this.amount=0;this.from=0;}
  acknowledge(){this.from=this.amount;this.age=0;}
  apply(target,dt,enabled,out=new Vector3()){
    if(!enabled)this.reset();
    else {
      this.age=Math.min(.4,this.age+Math.max(0,dt));
      this.amount=this.age<.16 ? MathUtils.lerp(this.from,1,ease(this.age/.16))
        : 1-ease((this.age-.20)/.20);
    }
    out.copy(target);
    out.x*=1-this.amount*.08;
    out.y+=this.amount*.035;
    out.z-=this.amount*.18;
    return out;
  }
}
