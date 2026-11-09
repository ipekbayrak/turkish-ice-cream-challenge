import {rhythmStepAt,rhythmStepTime} from './rhythm-clock.js';

/** Audio time is authoritative. A silent monotonic clock keeps muted play
 * possible before an AudioContext exists; changing sources preserves phase. */
export class MusicTransport{
 constructor(clock,getContext,now=()=>performance.now()/1000){
  this.clock=clock;this.getContext=getContext;this.now=now;
  this.elapsed=clock.realTime;this.scheduledStep=0;this.source=undefined;this.last=0;
  this.sample();clock.bindTimeSource(()=>this.sample());
 }
 sample(){
  const context=this.getContext(),source=context&&context.state!=='closed'?context:null;
  const current=source?source.currentTime:this.now();
  if(!this.paused&&this.source===source)this.elapsed+=Math.max(0,current-this.last);
  this.source=source;this.last=current;
  return this.elapsed;
 }
 setPaused(paused){this.sample();this.paused=paused;}
 resume(){
  const elapsed=this.sample();this.scheduledStep=rhythmStepAt(elapsed,this.clock.tempo);
  if(rhythmStepTime(this.scheduledStep,this.clock.tempo)<elapsed-.005)this.scheduledStep++;
 }
 schedule(play,horizon=.10){
  const elapsed=this.sample(),context=this.getContext();
  if(!context||!this.clock.running)return;
  // Background stalls discard missed beats, never compress them into a burst.
  this.scheduledStep=Math.max(this.scheduledStep,rhythmStepAt(elapsed,this.clock.tempo));
  let count=0;
  while(count++<16){
   const at=rhythmStepTime(this.scheduledStep,this.clock.tempo);
   if(at>elapsed+horizon)break;
   if(at>=elapsed-.025)play(this.scheduledStep,context.currentTime+Math.max(0,at-elapsed));
   this.scheduledStep++;
  }
 }
}
