import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TrickDirector } from '../src/tricks.js';
import { GameWorld } from '../src/world.js';
import { StallEffects } from '../src/stall-effects.js';
import { stretchCutGuide } from '../src/stretch-cut.js';
import { figureEightWorldPoint } from '../src/figure-eight.js';
import { layeredServiceCue, LAYERED_SERVICE_ID } from '../src/serving-sequence.js';
import { customerServiceCue, CUSTOMER_SERVICE_IDS } from '../src/customer-service.js';
import { CAMPAIGN_LEVELS, TRICK_CATALOG, ICE_CREAM_FLAVORS } from '../src/protocol.js';
import { CHOREOGRAPHED_ROUTINES, ROUTINE_CATALOG, ROUTINE_SOURCES, BASE_SERVICE_ACTIONS, BRIDGE_FAMILIES, sampleBridgePose, routineSignature, isChoreographedRoutine, compoundLimitForStage } from '../src/trick-routines.js';

const V = (x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const noop=()=>{};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function fixture(routine, {stationary=false,jitter=false}={}) {
  const world=Object.create(GameWorld.prototype);
  world.scene=new THREE.Scene();
  world.canvas={clientWidth:400,clientHeight:800};
  for(const name of ['paddleGroup','paddleRollGroup','conePivot','scoopStackGroup','heldSocket','giantBlockGroup','vendorGroup','touristHand','mainConeMesh','sliceCueGroup','outerConeGroup','napkinProp','napkinConeProp','leftHandConeProp','heldEmptyCone','heldNapkin','heldNapkinCone','carryScoop','vendorHead','fezTassel'])world[name]=new THREE.Group();
  world.scene.add(world.paddleGroup,world.heldSocket,world.giantBlockGroup,world.vendorGroup,world.touristHand,world.carryScoop);
  world.paddleGroup.add(world.paddleRollGroup,world.conePivot);world.conePivot.add(world.scoopStackGroup,world.outerConeGroup);
  world.lArmRig={handGroup:new THREE.Group()};world.scene.add(world.lArmRig.handGroup);world.lArmRig.handGroup.add(world.napkinConeProp);world.napkinConeProp.position.set(0,.08,.03);
  world.scoopMeshes=Array.from({length:8},(_,i)=>{const mesh=new THREE.Group();mesh.position.y=.045+i*.035;return mesh;});world.scoopStackGroup.add(...world.scoopMeshes);
  world.giantBlockHeight=.34;world.giantBlockMat={color:{setHex:noop}};
  world.servingScale=1;world.carryScoop.material={color:{setHex:noop}};
  world.tubIceGroups=Array.from({length:6},()=>({fill:1}));
  world.tubPositions=ICE_CREAM_FLAVORS.map((flavor,i)=>({worldPos:V(-.5+i*.2,.99,-.3),color:flavor.colorHex}));
  world.stretchyStrand={active:false,nodes:[V(-.2,1.2,.18),V(.2,1.4,.18)],attach(a,b){this.active=true;this.nodes[0].copy(a);this.nodes[1].copy(b);},detach(){this.active=false;},update:noop};
  world.stallEffects=new StallEffects(world);
  world.coneSpring={pos:V(),target:V(),vel:V(),step(){return this.pos.copy(this.target);}};
  world.bells=Array.from({length:7},(_,i)=>({worldPos:V(-.5+i*.16,1.8,-.1)}));
  world.getBellStrikeTarget=(i)=>world.bells[i%7].worldPos.clone();
  world.getPaddleStrikePoint=(out=V())=>out.copy(world.paddleGroup.position).add(V(0,0,.035));
  world.getCounterStrikeTarget=(x)=>V(x,1.06,.28);
  world.getTubRimStrikeTarget=(i)=>world.tubPositions[i].worldPos.clone().add(V(0,.05,.1));
  world.projectToScreen=(p)=>({x:(p.x/.54+1)*200,y:(1-(p.y-1.22)/.36)*400});
  for(const key of ['setVendorMood','triggerScoopJiggle','triggerSpectatorReaction','ringBells','spawnBurst','setVendorCharacter','applySelectedFlavorColors','churnTubIceCream','strikeBell','throwHeldProp','triggerCounterImpact'])world[key]=noop;
  world.setServingScale=(value)=>{world.servingScale=value;world.conePivot.scale.setScalar(value);};
  world.updateIceCreamScoops=(count)=>{world.visibleScoops=count;world.scoopMeshes.forEach((mesh,i)=>{mesh.visible=i<count;});};
  const events=[],found=new Set();
  const save={data:{unlockedStage:1,preferredScoopCount:2,preferredFlavors:[0,1,2,3],tutorialCompleted:true},lang:'tr',hapticsEnabled:false,
    setOrderPreferences:noop,discoverTrick:(id)=>found.add(id),getTrickInfo:(id)=>({name:TRICK_CATALOG.find(t=>t.id===id)?.names.tr||id}),t:(key)=>key,getUstaName:()=>'',recordStageResult:noop,getStageBestScore:()=>0};
  const director=new TrickDirector(world,new Proxy({}, {get:()=>noop,set:()=>true}),save,{onTrickStart:(event)=>events.push(event),onReaction:noop,onRoundEnd:noop});
  director.currentStage=routine.unlockStage;director.config={...CAMPAIGN_LEVELS[routine.unlockStage-1],speedMult:1};
  director.targetScoopCount=2;director.scoopCount=2;world.updateIceCreamScoops(2);
  director.routine=[routine.id,'FINAL_PISTACHIO_CATCH'];
  let completed=false,ended=null,time=0,frames=0;
  director._endRound=(outcome)=>{ended=outcome;director.roundEnded=true;director.active=false;world.clearTrickPresentations();world.clearServingNapkin();};
  const entry=director._enterRoutineStep.bind(director);
  director._enterRoutineStep=(index,componentId=null)=>{entry(index,componentId);if(index>0){completed=true;director.active=false;}};
  director._applyKinematics=(dt)=>{
    director.coneWorldPos.copy(director.coneTargetPos);world.paddleGroup.position.copy(director.coneTargetPos);
    if(director.leftHandCustomTarget)world.lArmRig.handGroup.position.copy(director.leftHandCustomTarget);
    if(world.conePivot.parent===world.lArmRig.handGroup)world.conePivot.position.set(0,.11,.035);
    else if(world.conePivot.parent===world.paddleGroup)world.conePivot.position.set(0,.02,0);
    world.conePivot.rotation.z=director.shaftRoll*.88+director.coneFlipZ;
    world.scene.updateMatrixWorld(true);world.stallEffects.update(dt);
  };
  const input={isPointerDown:false,isReaching:false,isMoving:false,pointerEpoch:0,cancelEpoch:0,normX:0,normY:0,vx:0,vy:0,speed:0,handWorldPos:V(.22,1.04,.64),intentWorldPos:V(.22,1.04,.64)};
  let actionKey='',actionStart=0,mode='wait';
  const move=(p)=>{
    const oldX=input.normX;input.normX=clamp(p.x/.54,-1,1);input.normY=clamp((p.y-1.22)/.36,-1,1);
    input.intentWorldPos.set(clamp(input.normX*.54,-.5,.5),clamp(1.22+input.normY*.36,.92,1.72),THREE.MathUtils.lerp(.48,.26,clamp((input.normY+.48)/.52,0,1)));
    input.handWorldPos.copy(input.intentWorldPos);world.heldSocket.position.copy(input.handWorldPos);world.touristHand.position.copy(input.handWorldPos);
    input.vx=(input.normX-oldX)*60;input.speed=Math.abs(input.vx);input.isMoving=Math.abs(input.vx)>.03;
  };
  const release=()=>{input.isPointerDown=false;input.isReaching=false;input.isMoving=false;input.vx=0;input.speed=0;input.intentWorldPos.set(.22,1.04,.64);mode='wait';actionKey='';};
  const reach=(key,target,label='reach')=>{
    if(actionKey!==key){actionKey=key;actionStart=time;input.pointerEpoch++;}input.isPointerDown=input.isReaching=true;mode=label;move(target);
  };
  let pullX=0;
  const pull=(key,target=director.coneWorldPos)=>{
    if(actionKey!==key)pullX=clamp(target?.x??0,-.32,.32);
    reach(key,V(pullX,time-actionStart>.05?1.18:1.35,.26),'pull');
  };
  const slice=(key)=>{reach(key,V(time-actionStart>.06?.22:-.22,1.22,.27),'slice');};
  const bot=()=>{
    const d=director,key=`${d.currentMechanic}:${d.choreography?.index}:${d.subStep}:${d.heldItem||''}:${d.bellBeatsDone}`;
    if(stationary||jitter){if(input.pointerEpoch===0)input.pointerEpoch=1;input.isPointerDown=input.isReaching=true;move(V(jitter?(frames%2?.004:-.004):0,1.22,.27));mode='stationary';return;}
    if(d.pendingTrickAdvance>0 || d.choreography?.bridge){release();return;}
    if(d.currentMechanic==='DOUBLE_CONE_SLIDE'){
      if(d.subStep===0&&d.stageTimer>.56)reach(`${key}:catch`,world.outerConeGroup.getWorldPosition(V()));
      else if(d.subStep===1&&!d.nestedService?.pulled)pull(`${key}:pull`,d.coneWorldPos);
      else if(d.subStep===1&&d.stageTimer>.52)reach(`${key}:return`,d.coneWorldPos,'return');
      else release();return;
    }
    if(d.heldItem==='EMPTY_CONE'){reach(key,d.coneWorldPos,'return');return;}
    if(d.heldItem==='NAPKIN_CONE'){slice(key);return;}
    if(d.currentMechanic==='NAPKIN_CONE_FAKEOUT'){
      if(d.subStep===0&&d.stageTimer>.4)reach(key,world.servingNapkin.getWorldPosition(V()),'pinch');
      else if(d.subStep===1&&!d.servingNapkinState?.pulled)pull(`${key}:pull`,world.servingNapkin.getWorldPosition(V()));
      else if(d.subStep===3&&d.stageTimer>.41)reach(key,d.coneWorldPos);
      else release();return;
    }
    if(d.currentMechanic===LAYERED_SERVICE_ID||CUSTOMER_SERVICE_IDS.includes(d.currentMechanic)){
      const cue=d.currentMechanic===LAYERED_SERVICE_ID?layeredServiceCue(d):customerServiceCue(d);
      if(!cue||cue.kind==='wait')release();
      else if(cue.kind==='pull')pull(`${key}:pull`,cue.target);
      else reach(`${key}:${cue.kind}`,cue.target,cue.kind);
      return;
    }
    if(d.currentMechanic==='MEGA_TAFFY_SLICE'){
      if(d.stageTimer<.4){release();return;}
      const guide=stretchCutGuide(world);
      if(actionKey!==key){actionKey=key;actionStart=time;input.pointerEpoch++;}
      input.isPointerDown=input.isReaching=true;
      const progress=clamp((time-actionStart-.18)/.18,0,1);
      const screen={x:guide.center.x+guide.normal.x*guide.span*progress,y:guide.center.y+guide.normal.y*guide.span*progress};
      move(V((screen.x/guide.viewport.width*2-1)*.54,1.22+(1-screen.y/guide.viewport.height*2)*.36,.27));mode=progress===0?'push-strand':'cut-across';return;
    }
    if(d.currentMechanic==='FIGURE_EIGHT_WEAVE'){
      if(actionKey!==key){actionKey=key;actionStart=time;input.pointerEpoch++;}
      input.isPointerDown=input.isReaching=true;move(figureEightWorldPoint(d.figureEight.frame,Math.min(1,(time-actionStart)/1.8)));mode='draw-eight';return;
    }
    if(d.currentMechanic==='EYE_LOCK_RHYTHM_CHASE'){
      if(d.subStep===0)reach(key,V(d.coneWorldPos.x*.5,1.15,.41),'midpoint');
      else reach(`${key}:${d.rhythmBeatsCompleted}:${d.rhythmTargetPos.x.toFixed(3)}`,d.rhythmTargetPos,'follow');return;
    }
    if(['GIANT_BLOCK_TEASE','MIDAIR_BLOCK_SOMERSAULT','VERTICAL_WINDMILL','UPSIDE_DOWN_GRAVITY','FAKE_DROP_PANIC','OVERHEAD_CROWN_DANGLE','COMBO_DOUBLE_PUMP','WHOLE_MOLD_ON_CONE'].includes(d.currentMechanic)){
      if(d.subStep===0)release();else reach(key,d.coneWorldPos);return;
    }
    if(d.currentMechanic==='BELL_RHYTHM_FEINT'){if(d.bellBeatsDone<2)release();else reach(key,d.coneWorldPos);return;}
    if(d.currentMechanic==='SHELL_SWAP_DUEL'){if(d.stageTimer<1.25)release();else reach(key,d.coneWorldPos,'pick-real');return;}
    if(d.currentMechanic==='SCOOP_LIFT_BACK'){
      if(d.subStep===0&&!d.extraTrick?.fullCaught){if(d.stageTimer>.36)reach(`${key}:catch`,world.conePivot.getWorldPosition(V()),'take-full');else release();}
      else if(d.subStep===0&&!d.extraTrick?.liftPulled)pull(`${key}:pull`,world.conePivot.getWorldPosition(V()));
      else if(d.subStep===1)reach(`${key}:return`,d.coneWorldPos,'return');
      else if(d.subStep===2&&d.stageTimer>.56)reach(key,d.coneWorldPos);else release();return;
    }
    if(d.currentMechanic==='BONUS_SCOOP_TAKEBACK'){
      if(d.subStep===0&&d.stageTimer>.41)reach(key,d.coneWorldPos,'take-cone');
      else if(d.subStep===1&&d.stageTimer>=1.10)reach(key,d.coneWorldPos,'return');
      else if(d.subStep===3)reach(key,d.coneWorldPos);else release();return;
    }
    reach(key,d.coneWorldPos,'reach-hold');
  };
  const parentTag=(object)=>object.parent===world.heldSocket?'hand':object.parent===world.conePivot?'cone':object.parent===world.scene?'scene':object.parent===world.lArmRig.handGroup?'vendor':object.parent===world.paddleGroup?'pole':'other';
  const trace=[];let previousTrace='';
  director.startRound();
  return {director,world,input,events,found,
    get completed(){return completed;},get ended(){return ended;},get time(){return time;},trace,
    move,
    tick({drive=true}={}){frames++;if(drive)bot();time+=1/60;director.update(1/60,time,input);
      const observable=[mode,director.choreography?.bridge?.pulse>0.7?'beat':'-',parentTag(world.conePivot),parentTag(world.scoopStackGroup),parentTag(world.servingNapkin),world.servingNapkin.visible?1:0,world.giantBlockGroup.visible?1:0,world.outerConeGroup.visible?1:0,world.stretchyStrand.active?1:0,Math.round(director.coneWorldPos.x*5),Math.round(director.coneWorldPos.y*5),Math.round(director.coneWorldPos.z*5),Math.round(director.shaftRoll/1.5)].join('|');
      if(observable!==previousTrace){trace.push(observable);previousTrace=observable;}
    },run(seconds=35){for(let i=0;i<seconds*60&&!completed&&!ended;i++)this.tick();return completed;},
  };
}

test('repertoire has63 playable non-final shows,36 distinct authored signatures and honest component provenance',()=>{
  assert.equal(TRICK_CATALOG.filter(t=>t.id!=='FINAL_PISTACHIO_CATCH').length,63);
  assert.equal(CHOREOGRAPHED_ROUTINES.length,36);
  assert.equal(new Set(CHOREOGRAPHED_ROUTINES.map(routineSignature)).size,36);
  const ids=new Set(TRICK_CATALOG.map(t=>t.id));
  for(const routine of CHOREOGRAPHED_ROUTINES){
    assert.ok(routine.componentIds.length>=2&&routine.componentIds.length<=3);
    assert.ok(routine.estimatedSeconds<=12);
    assert.equal(routine.bridges.length,routine.componentIds.length-1);
    assert.ok(routine.bridges.every(bridge=>BRIDGE_FAMILIES[bridge.family]));
    assert.equal(routine.provenance,'choreographed-combination');
    assert.ok(routine.evidence.includes('authored'));
    assert.ok(routine.componentIds.every(id=>ids.has(id)&&BASE_SERVICE_ACTIONS[id]&&!isChoreographedRoutine(id)));
    assert.ok(routine.sourceRefs.length>0&&routine.sourceRefs.every(id=>ROUTINE_SOURCES[id]?.url));
  }
  assert.equal(ROUTINE_CATALOG.length,36);
});

test('the standalone8 awards only a closed drawn stroke, never the old brief reach-and-hold',()=>{
 const routine={id:'FIGURE_EIGHT_WEAVE',unlockStage:4};
 const held=fixture(routine,{stationary:true});held.run(4);
 assert.equal(held.completed,false);assert.equal(held.director.score,0);assert.equal(held.director.currentMechanic,'FIGURE_EIGHT_WEAVE');
 const drawn=fixture(routine);assert.equal(drawn.run(6),true);assert.equal(drawn.director.score,360);assert.equal(drawn.director.figureEight.complete,true);
});

test('every choreographed show completes through original director input/ownership paths with a distinct observable trace',()=>{
  const traces=new Set();
  for(const routine of CHOREOGRAPHED_ROUTINES){
    const f=fixture(routine);
    assert.equal(f.run(),true,`${routine.id}: stuck ${f.director.currentMechanic}/${f.director.subStep} held=${f.director.heldItem} at${f.time.toFixed(2)}s end=${f.ended}`);
    assert.equal(f.director.tricksSurvived,1,'component completion is not campaign-slot completion');
    assert.equal(f.director.routineIndex,1);
    const starts=f.events.filter(e=>e.trickId===routine.id).map(e=>e.componentId);
    assert.deepEqual(starts,routine.componentIds);
    assert.ok(f.found.has(routine.id));
    assert.equal(f.world.conePivot.parent,f.world.paddleGroup);
    assert.equal(f.world.scoopStackGroup.parent,f.world.conePivot);
    traces.add(f.trace.join('\n')); // Does not contain show/component IDs or names.
  }
  assert.equal(traces.size,36,'renaming an identical physical sequence must not increase repertoire count');
});

test('stationary center and tiny jitter cannot finish any compound show',()=>{
  for(const routine of CHOREOGRAPHED_ROUTINES){
    for(const jitter of [false,true]){
      const f=fixture(routine,{stationary:!jitter,jitter});
      assert.equal(f.run(20),false,`${routine.id} auto-completed with ${jitter?'jitter':'stationary'} input`);
      assert.notEqual(f.ended,'MASTER_CATCH');
    }
  }
});

test('reset during each show clears choreography and transient prop ownership',()=>{
  for(const routine of CHOREOGRAPHED_ROUTINES){
    const f=fixture(routine);
    for(let i=0;i<45&&!f.completed;i++)f.tick();
    f.director.resetRound(routine.unlockStage);
    assert.equal(f.director.choreography,null);
    assert.equal(f.director.active,false);
    assert.equal(f.world.conePivot.parent,f.world.paddleGroup);
    assert.equal(f.world.scoopStackGroup.parent,f.world.conePivot);
    assert.equal(f.world.servingNapkin.visible,false);
    assert.equal(f.world.giantBlockGroup.visible,false);
    assert.equal(f.world.stretchyStrand.active,false);
    assert.equal(f.director.heldItem,null);
  }
});

test('progression/replays expose all36 shows but bound compounds to1/2/3 slots and preserve guaranteed eye-lock',()=>{
  const exposed=new Set();
  for(const level of CAMPAIGN_LEVELS){
    for(const id of level.trickPool){if(isChoreographedRoutine(id))exposed.add(id);}
    for(let replay=0;replay<20;replay++){
      const sequence=TrickDirector.prototype._buildDynamicRoutineForStage.call({targetScoopCount:2,currentStage:level.stage},level);
      const shows=sequence.filter(isChoreographedRoutine);
      assert.ok(shows.length<=compoundLimitForStage(level.stage));
      assert.ok(sequence.includes('EYE_LOCK_RHYTHM_CHASE'));
      assert.equal(sequence.filter(id=>id!=='SCRAPE_FLAVOR_SCOOP'&&id!=='FINAL_PISTACHIO_CATCH').length,level.trickCount);
      assert.ok(shows.every(id=>CHOREOGRAPHED_ROUTINES.find(r=>r.id===id).unlockStage<=level.stage));
    }
  }
  assert.equal(exposed.size,36);
});


test('six authored bridge families are continuous, keep the serving on its owner and expose distinct beat/pose patterns',()=>{
  const traces=new Set();
  for(const [family,spec] of Object.entries(BRIDGE_FAMILIES)){
    const bridge={...spec,family,start:V(-.12,1.26,.23),end:V(.04,1.24,.25),rail:V(0,1.23,.26),startRoll:.1,startPitch:.05};
    assert.ok(sampleBridgePose(bridge,0).position.distanceTo(bridge.start)<1e-9);
    assert.ok(sampleBridgePose(bridge,1).position.distanceTo(bridge.end)<1e-9);
    let last=sampleBridgePose(bridge,0).position;const trace=[];
    for(let i=1;i<=120;i++){const pose=sampleBridgePose(bridge,i/120);assert.ok(pose.position.distanceTo(last)<.03);trace.push([...pose.position.toArray().map(x=>x.toFixed(3)),pose.roll.toFixed(3),pose.pitch.toFixed(3),pose.support].join(','));last=pose.position;}
    traces.add(trace.join('|'));
  }
  assert.equal(traces.size,6);
});

test('every authored connector runs and keeps the same serving on the rod',()=>{
  for(const routine of CHOREOGRAPHED_ROUTINES){
    const f=fixture(routine);let bridges=0,lastBridge=null;
    for(let i=0;i<35*60&&!f.completed&&!f.ended;i++){
      f.tick();
      const bridge=f.director.choreography?.bridge;
      if(bridge&&bridge!==lastBridge){bridges++;lastBridge=bridge;assert.equal(f.world.conePivot.parent,f.world.paddleGroup);assert.equal(f.world.scoopStackGroup.parent,f.world.conePivot);}
    }
    assert.equal(f.completed,true,routine.id);
    assert.equal(bridges,routine.bridges.length);
  }
});


test('moving during an anticipation bridge cannot become a stale successful reach in the next action window',()=>{
  const routine=CHOREOGRAPHED_ROUTINES.find(r=>r.id==='SHOW_KALIBIN_PESINDE');
  const f=fixture(routine);
  for(let i=0;i<15*60&&!f.director.choreography?.bridge;i++)f.tick();
  assert.ok(f.director.choreography?.bridge);
  const earned=f.director.score;
  f.move(V(0,1.15,.36)); // Anticipate the future midpoint during the watch-only bridge.
  for(let i=0;i<120;i++)f.tick({drive:false});
  assert.equal(f.director.currentMechanic,'EYE_LOCK_RHYTHM_CHASE');
  assert.equal(f.director.subStep,0);
  assert.equal(f.director.score,earned);
});

test('reset during each bridge family stops the connector and clears transient serving state',()=>{
  for(const family of Object.keys(BRIDGE_FAMILIES)){
    const routine=CHOREOGRAPHED_ROUTINES.find(r=>r.bridges[0].family===family);
    const f=fixture(routine);
    for(let i=0;i<15*60&&!f.director.choreography?.bridge;i++)f.tick();
    assert.equal(f.director.choreography?.bridge.family,family);
    f.director.resetRound(routine.unlockStage);
    assert.equal(f.director.choreography,null);
    assert.equal(f.director.leftHandCustomTarget,null);
    assert.equal(f.world.conePivot.parent,f.world.paddleGroup);
    assert.equal(f.world.scoopStackGroup.parent,f.world.conePivot);
    assert.equal(f.world.servingNapkin.visible,false);
  }
});


test('layered paper service unlocks in Galata and resolves into the final after all scoop preparation',()=>{
 for(const level of CAMPAIGN_LEVELS)assert.equal(level.trickPool.includes('LAYERED_SERVICE_TEASE'),level.stage>=6);
 for(let i=0;i<20;i++) {
  const seq=TrickDirector.prototype._buildDynamicRoutineForStage.call({targetScoopCount:8,currentStage:30},{stage:30,trickCount:4,trickPool:['LAYERED_SERVICE_TEASE','EYE_LOCK_RHYTHM_CHASE','SHAFT_SPIN_360','DOUBLE_CONE_SLIDE']});
  assert.equal(seq.at(-2),'LAYERED_SERVICE_TEASE');assert.equal(seq.at(-1),'FINAL_PISTACHIO_CATCH');
  assert.equal(seq.filter(id=>id==='SCRAPE_FLAVOR_SCOOP').length,8);
 }
});
