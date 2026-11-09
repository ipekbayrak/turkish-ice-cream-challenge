import {createIdleBellPhrase,idleBellPhraseAt} from './idle-bell-phrase.js';
import {Vector3,MathUtils} from 'three';
import {surfaceStrikePath,bellPath} from './trick-motion.js';
import {poleHasFood} from './pole-hygiene.js';

/** Remind an undecided customer without choosing, stealing or scoring a scoop. */
export class OrderPatience {
 constructor(world,sound,onPrompt=()=>{}){this.world=world;this.sound=sound;this.onPrompt=onPrompt;this.rest=new Vector3();this.offset=new Vector3();this.reset();}
 reset(){this.wait=0;this.age=0;this.active=false;this.cycle=0;this.beat=-1;this.hit=-1;this.hits=0;this.bellPhrase=null;}
 stop(){if(this.active&&this.world._orderPolePosition)this.world._orderPolePosition.copy(this.world.paddleGroup.position);this.active=false;this.wait=0;this.age=0;this.world.vendorBellLook=null;}
 update(dt,time,order){
  const w=this.world;
  if(!order.active||order.phase!=='order'||order.count>0||order.hover>=0||poleHasFood(w)){this.stop();return false;}
  if(!this.active){this.wait+=dt;if(this.wait<4.0)return false;this.active=true;this.age=0;this.beat=-1;this.hit=-1;this.bellPhrase=createIdleBellPhrase(w.bells.length);this.onPrompt(this.cycle%2?'bell':'counter');}
  this.age+=dt;
  if(this.age>=(this.cycle%2?Math.max(2.25,(this.bellPhrase?.duration||0)+.35):2.25)){this.stop();this.cycle++;return false;}
  const bell=this.cycle%2===1,pulse=bell?idleBellPhraseAt(this.bellPhrase,this.age):null;
  const beat=bell?pulse.beat:Math.min(2,Math.floor(this.age/.65)),phase=bell?pulse.phase:Math.min(1,(this.age-beat*.65)/.65);
  if(beat!==this.beat){this.beat=beat;this.rest.copy(w.getPaddleStrikePoint());}
  const index=bell?pulse.index:[2,4,3][beat];w.vendorBellLook=bell?index:null;const contact=bell?w.getBellStrikeTarget(index):w.getCounterStrikeTarget(-.24+beat*.08);
  const tip=bell?bellPath(phase,this.rest,contact):surfaceStrikePath(phase,this.rest,contact,.14);
  w.beginPoseFrame();w.vendorPoleFree=true;
  this.offset.copy(w.getPaddleStrikePoint()).sub(w.paddleGroup.position);w.paddleGroup.position.copy(tip).sub(this.offset);
  const support=new Vector3(.25,1.29,-.35);
  w.orientPaddleAndHands(0,support,dt,0,0);
  for(let fit=0;fit<3;fit++){this.offset.copy(w.getPaddleStrikePoint()).sub(tip);w.paddleGroup.position.sub(this.offset);w.orientPaddleAndHands(0,support,0,0,0);}
  w.coneSpring.pos.copy(w.paddleGroup.position);w._orderPolePosition?.copy(w.paddleGroup.position);
  const contactWindow=bell?pulse.striking&&phase>=.28&&phase<.43:phase>=.48&&phase<.68;
  if(contactWindow&&this.hit!==beat&&w.getPaddleStrikePoint().distanceTo(contact)<.025){
   this.hit=beat;this.hits++;
   if(bell){if(w.bells[index].strikeCooldown<=0){w.strikeBell(index,.7);this.sound.playBellNote(index,.8,contact.x);}}
   else{w.triggerCounterImpact(contact,.7);this.sound.playCounterRap(contact.x,1+beat*.035);}
  }
  return true;
 }
}
