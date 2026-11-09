import {Vector3,MathUtils} from 'three';
import {RoutinePreviewDriver} from './routines-driver.js';
import {researchedServiceCue,RESEARCHED_SERVICE_IDS} from '../src/researched-service.js';
import {customerServiceTarget} from '../src/customer-service.js';
import {flavorFeintCue} from '../src/flavor-feint-show.js';

/** Valid screen-space actions only. No writes to director progress, objects,
 * score, health, timers or validators. The ordinary director decides success. */
export class EncounterDriver extends RoutinePreviewDriver {
 reset(){super.reset();this.cutAttemptKey=null;this.cutAttemptStart=0;}
 cue(key,cue,dt){
  if(!cue||cue.kind==='wait'||cue.quiet){this.release();return;}
  if(cue.kind==='pull'){this.pull(`${key}:pull`,dt,cue.target);return;}
  if(cue.screen&&cue.viewport)this.reachScreen(key,cue.screen,cue.viewport,dt);
  else this.reach(key,cue.target,dt,cue.kind||'reach');
 }
 cutAcross(key,dt){
  if(this.cutAttemptKey!==key){this.cutAttemptKey=key;this.cutAttemptStart=this.time;}
  // A miss is retried with a new physical contact and current strand geometry.
  super.cutAcross(`${key}:attempt${Math.floor((this.time-this.cutAttemptStart)/2)}`,dt);
 }
 update(dt){
  const d=this.director,w=this.world,mechanic=d.currentMechanic;
  if(this.safePlay&&d.hearts<=1&&mechanic==='NAPKIN_CONE_FAKEOUT'&&d.subStep===0){this.time+=dt;this.release();return this.input;}
  const special=RESEARCHED_SERVICE_IDS.includes(mechanic)||mechanic==='FINAL_PISTACHIO_CATCH'||mechanic==='FIGURE_EIGHT_WEAVE'||mechanic==='SCOOP_LIFT_BACK'&&!d.extraTrick?.fullCaught&&d.subStep===0||d.flavorFeintShow;
  if(!special)return super.update(dt);
  this.time+=dt;
  const key=`${mechanic}:${d.choreography?.index}:${d.subStep}:${d.heldItem||''}`;
  if(!d.active||d.roundEnded||d.trickTransition||d.pendingTrickEntry||d.servingHandoff||d.entryPaperPreparation||d.pendingEntryPaper||d.pendingTrickAdvance>0||d.choreography?.bridge){this.release();return this.input;}
  if(d.flavorFeintShow){
   const cue=flavorFeintCue(d);
   if(cue?.kind==='reject'){
    this.begin(`refusal:${d.routineIndex}`);const x=Math.sin((this.time-this.actionStart)*Math.PI*8)*.22;
    this.move(new Vector3(x,1.24,.26),dt);this.mode='refuse-flavor';
   }else this.release();
  }else if(RESEARCHED_SERVICE_IDS.includes(mechanic))this.cue(`${key}:${d.researchedService?.attempt??0}:${d.researchedService?.feints??0}`,researchedServiceCue(d),dt);
  else if(mechanic==='SCOOP_LIFT_BACK'){
   if(d.stageTimer>.36)this.cue(`${key}:full`,{kind:'reach',...customerServiceTarget(d,w.conePivot)},dt);else this.release();
  }else if(mechanic==='FINAL_PISTACHIO_CATCH'){
   if(d.subStep===0)this.reach(`${key}:catch`,d.coneWorldPos,dt);
   else this.pull(`${key}:free`,dt,d.coneWorldPos);
  }else if(mechanic==='FIGURE_EIGHT_WEAVE'){
   this.begin(key);const f=d.figureEight.frame,p=MathUtils.clamp((this.time-this.actionStart)/2.2,0,1);
   this.reachScreen(key,{x:f.center.x+Math.sin(p*Math.PI*2)*f.rx,y:f.center.y-Math.sin(p*Math.PI*4)*f.ry},f.viewport,dt);
   this.mode='draw-eight';
  }
  return this.input;
 }
}
