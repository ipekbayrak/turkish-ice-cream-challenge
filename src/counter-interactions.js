import {Vector3,MathUtils} from 'three';
import {playerOwnsCone} from './cone-grip.js';
import {HandInteractionIntent} from './hand-interaction-intent.js';
import {BellMelodies} from './bell-melodies.js';

export function customerHandEmpty(world,director={}){
 return !playerOwnsCone(world)&&!director.heldItem&&!director.isGraspingPaddleCone&&!world.playerConeGripRequested&&
  !world.heldNapkin?.visible&&!(world.servingNapkin?.visible&&world.servingNapkin.parent===world.heldSocket);
}
const segmentDistance=(x,y,a,b)=>{
 const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy,t=d?MathUtils.clamp(((x-a.x)*dx+(y-a.y)*dy)/d,0,1):0;
 return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);
};
/** Optional counter play, isolated from trick scoring and ownership. */
export class CounterInteractions {
 constructor(world,sound,{onInspect=()=>{},onPoke=()=>{},onRecognized=()=>{},canInspect=()=>true}={}){
  Object.assign(this,{world,sound,onInspect,onPoke,onRecognized,canInspect});this.intent=new HandInteractionIntent();
  this.point=new Vector3();this.previous=null;this.epoch=null;this.latched=new Set();this.focus=null;this.reach=0;
  this.bellHits=0;this.faceTouches=0;
  this.melodies=new BellMelodies({
   onNote:index=>{
    const bell=this.world.bells?.find(b=>b.index===index)??this.world.bells?.[index];
    this.world.strikeBell?.(index,.55);
    this.sound?.playBellNote?.(index,.55,bell?.worldPos?.x??0);
   },
   onRecognized:id=>{
    this.sound?.speakVendor?.('cheer');
    this.onRecognized(id);
   }
  });
 }
 reset(){this.melodies.reset();this.intent.reset();this.previous=null;this.latched.clear();this.focus=null;this.reach=0;this.world.playerInspectPointing=false;this.world.playerCounterInteractionEnabled=false;}
 project(point,width,height){this.point.copy(point).project(this.world.camera);return{x:(this.point.x+1)*width*.5,y:(1-this.point.y)*height*.5,visible:this.point.z> -1&&this.point.z<1};}
 update(dt,{active,empty,x,y,epoch,width,height,melodyEnabled=false}={}){
  const w=this.world;
  this.melodies.update(dt,Boolean(melodyEnabled));
  w.playerCounterInteractionEnabled=Boolean(active&&empty);
  if(!active||!empty){this.intent.update(dt,{});this.previous=null;this.latched.clear();this.focus=null;w.playerInspectPointing=false;this.reach*=Math.exp(-dt*14);return;}
  const current={x,y},previous=this.epoch===epoch?this.previous:null;
  const moved=Boolean(previous&&Math.hypot(x-previous.x,y-previous.y)>1);
  let bellFocus=null;
  for(const bell of w.bells){
   const p=this.project(w.getBellBodyCenter(bell.index,this.point),width,height),near=Math.hypot(x-p.x,y-p.y)<17;
   const crossed=p.visible&&previous&&segmentDistance(p.x,p.y,previous,current)<17;
   if(moved&&crossed&&!this.latched.has(bell.index)&&bell.strikeCooldown<=0){
    w.strikeBell(bell.index,.65);this.sound.playBellNote(bell.index,.70,bell.worldPos.x);this.bellHits++;
    if(melodyEnabled)this.melodies.note(bell.index);
   }
   if(near){this.latched.add(bell.index);bellFocus={kind:'bell',id:`bell-${bell.index}`,...p,radius:17};}else this.latched.delete(bell.index);
  }
  let target=bellFocus;
  if(!target){
   w.vendorHead.updateWorldMatrix(true,false);
   const parts=[['nose',0,.002,.194,16],['eye',-.065,.055,.186,15],['eye',.065,.055,.186,15],['face',0,-.04,.13,30]];
   for(const[part,px,py,pz,radius]of parts){
    this.point.set(px,py,pz).applyMatrix4(w.vendorHead.matrixWorld);const p=this.project(this.point,width,height);
    if(p.visible&&Math.hypot(x-p.x,y-p.y)<radius){target={id:`face-${part}`,kind:'face',part,...p,radius};break;}
   }
  }
  if(!target){const item=w.culturalScene?.pickFromCounter(x/width,y/height);if(item&&this.canInspect(item.id))target=item;}
  const event=this.intent.update(dt,{active,empty,moved,target});
  this.previous=current;this.epoch=epoch;this.focus=target;
  w.playerInspectPointing=target?.kind==='detail';
  const desired=target?.kind==='detail'?.10*this.intent.progress:target?.kind==='bell'?.14:target?.kind==='face'?.12:0;
  this.reach=MathUtils.lerp(this.reach,desired,1-Math.exp(-dt*12));
  if(event?.type==='inspect'){this.onInspect(event.target.id);this.reset();}
  if(event?.type==='poke'){w.playFaceTouch(event.target.part);this.faceTouches++;this.onPoke(event.target.part);}
 }
 draw(ctx){
  if(this.focus?.kind!=='detail'||!this.intent.progress)return;
  const p=this.intent.progress,{x,y}=this.focus,radius=34-15*p;
  ctx.save();ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);
  ctx.fillStyle=`rgba(255,236,191,${.04+.07*p})`;ctx.fill();ctx.strokeStyle='rgba(255,237,196,.35)';ctx.lineWidth=1;ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,radius,-Math.PI/2,-Math.PI/2+p*Math.PI*2);ctx.strokeStyle='rgba(255,241,212,.85)';ctx.lineWidth=2;ctx.stroke();ctx.restore();
 }
}
