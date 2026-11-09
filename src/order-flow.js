import {ICE_CREAM_FLAVORS} from './flavors.js';
import { MAX_SCOOPS } from './venues.js';

export const ORDER_DWELL_SECONDS = .42;
export const ORDER_REARM_SECONDS = .12;
export const ORDER_MOVE_PIXELS = 6;
const DWELL_GRACE_SECONDS = ORDER_DWELL_SECONDS + .04;
export const orderFinishDelay = count => count > 0 ? Math.max(450, 1000 - (count - 1) * 200) / 1000 : 0;
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
const rawPoint = input => Number.isFinite(input.pointerX) && Number.isFinite(input.pointerY)
  ? {x:input.pointerX,y:input.pointerY} : null;

/** Deliberate tub visits choose scoops. Stillness accepts that exact order;
 * only raw pointer motion, never the hand's serving animation, restarts time. */
export class OrderFlow {
  constructor({onPhase=()=>{},onChoice=()=>{},onComplete=()=>{},onSingle=()=>{}}={}) {
    Object.assign(this,{onPhase,onChoice,onComplete,onSingle});this.active=false;this.phase='idle';
  }
  start({greetingSeconds=.7,maxScoops=4,initialPointer=null}={}) {
    this.maxScoops=clamp(Math.round(Number(maxScoops)||4),1,MAX_SCOOPS);
    this.count=0;this.singleAsked=false;this.flavors=[];this.elapsed=0;this.leaveTime=0;this.idleSeconds=0;
    this.pointerAnchor=null;this.motionRevision=0;this.dwellGrace=DWELL_GRACE_SECONDS;
    this.initialPointer=initialPointer?{...initialPointer}:null;
    this.hover=-1;this.dwell=0;this.blockedChoice=null;this.greetingSeconds=Math.max(0,greetingSeconds);
    this.focusFlavor=-1;this.active=true;this.setPhase(this.greetingSeconds>0?'greeting':'order');
  }
  setPhase(phase) {
    this.phase=phase;this.phaseTime=0;this.hover=-1;this.dwell=0;
    if(phase!=='confirm')this.idleSeconds=0;
    this.onPhase(this.snapshot);
  }
  get snapshot() {
    const finishDelay=orderFinishDelay(this.count)+(this.count===1?.35:0);
    const idleProgress=this.phase==='confirm'?1:finishDelay?Math.min(1,this.idleSeconds/finishDelay):0;
    return {active:this.active,phase:this.phase,count:this.count,flavors:[...this.flavors],maxScoops:this.maxScoops,
      hover:this.hover,focusFlavor:this.focusFlavor,dwell:Math.min(1,this.dwell/ORDER_DWELL_SECONDS),blockedFlavor:this.blockedChoice?.value??-1,
      finishDelay,idleSeconds:this.idleSeconds,idleProgress,finishProgress:idleProgress,
      remainingSeconds:this.phase==='confirm'?0:Math.max(0,finishDelay-this.idleSeconds),
      canFinish:this.count>0,capacityReached:this.count>=this.maxScoops};
  }
  choose(value,input={}) {
    if(!this.active||this.phase!=='order'||!Number.isInteger(value)||value<0||value>=ICE_CREAM_FLAVORS.length||this.count>=this.maxScoops)return false;
    this.flavors.push(value);this.count=this.flavors.length;this.leaveTime=0;this.idleSeconds=0;
    this.pointerAnchor=rawPoint(input)||this.pointerAnchor;this.dwellGrace=DWELL_GRACE_SECONDS;
    this.blockedChoice={value,epoch:input.epoch||0,motionRevision:this.motionRevision};this.hover=-1;this.dwell=0;
    this.onChoice({phase:'order',value,count:this.count,flavors:[...this.flavors],automatic:false});
    return true;
  }
  finish() {
    if(!this.active||this.phase!=='order'||!this.count)return;
    this.idleSeconds=orderFinishDelay(this.count);
    this.setPhase('confirm');
  }
  trackMotion(input) {
    const point=input.active?rawPoint(input):null;
    if(!point)return false;
    if(!this.pointerAnchor){this.pointerAnchor=point;return false;}
    if(Math.hypot(point.x-this.pointerAnchor.x,point.y-this.pointerAnchor.y)<ORDER_MOVE_PIXELS)return false;
    this.pointerAnchor=point;this.motionRevision++;this.idleSeconds=0;this.dwellGrace=DWELL_GRACE_SECONDS;return true;
  }
  update(dt,input={active:false,flavor:null}) {
    if(!this.active||!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(dt,.1);this.elapsed+=dt;this.phaseTime+=dt;
    if(this.phase==='greeting') {if(this.phaseTime>=this.greetingSeconds)this.setPhase('order');return;}
    if(this.phase==='confirm') {
      if(this.phaseTime>=.55){this.active=false;this.onComplete({count:this.count,flavors:[...this.flavors]});}
      return;
    }
    if(this.phase!=='order')return;
    if(this.initialPointer){
      // A cone carried across a tub is not a choice. Any deliberate movement
      // since pickup opens selection immediately, even within the same tub.
      // No release, excursion outside the tub or additional delay is needed.
      const p=rawPoint(input),a=this.initialPointer;
      if(!input.active||!p||((input.epoch||0)===a.epoch&&Math.hypot(p.x-a.pointerX,p.y-a.pointerY)<ORDER_MOVE_PIXELS))return;
      this.initialPointer=null;
    }
    const moved=this.trackMotion(input);
    const value=input.active&&Number.isInteger(input.flavor)&&input.flavor>=0&&input.flavor<ICE_CREAM_FLAVORS.length?input.flavor:null;
    this.focusFlavor=value??-1;
    if(this.blockedChoice){
      const newContact=input.active&&(input.epoch||0)!==this.blockedChoice.epoch;
      const movedSinceChoice=this.motionRevision>this.blockedChoice.motionRevision;
      if(newContact||(value!==null&&value!==this.blockedChoice.value&&movedSinceChoice))this.blockedChoice=null;
      else if(value===null){
        this.leaveTime+=dt;
        if(this.leaveTime>=ORDER_REARM_SECONDS&&(!input.active||movedSinceChoice))this.blockedChoice=null;
      }else this.leaveTime=0;
    }
    let choosing=false;
    if(value!==null) {
      this.leaveTime=0;
      if(!this.blockedChoice&&this.count<this.maxScoops) {
        if(this.hover!==value){this.hover=value;this.dwell=0;}
        this.dwell+=dt;choosing=true;
        if(this.dwell+1e-8>=ORDER_DWELL_SECONDS){this.choose(value,input);return;}
      } else {this.hover=-1;this.dwell=0;}
    } else {this.hover=-1;this.dwell=0;}
    // Give a fresh, deliberate tub dwell its full selection time, including at
    // eight-scoop pace. Holding a previously chosen tub is ordinary stillness.
    // A boundary/camera that keeps changing candidate flavor cannot renew
    // this grace forever. Only real movement or an accepted scoop renews it.
    const protectedDwell=choosing&&this.dwellGrace>0;
    if(choosing)this.dwellGrace=Math.max(0,this.dwellGrace-dt);
    if(this.count&&!moved&&!protectedDwell){
      this.idleSeconds+=dt;
      if(this.count===1&&!this.singleAsked&&this.idleSeconds>=.65){this.singleAsked=true;this.onSingle();}
      if(this.idleSeconds+1e-8>=orderFinishDelay(this.count)+(this.count===1?.35:0))this.finish();
    }
  }
  cancel(){this.active=false;this.phase='idle';this.blockedChoice=null;this.hover=-1;this.dwell=0;this.idleSeconds=0;this.focusFlavor=-1;this.pointerAnchor=null;}
}
