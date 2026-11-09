import test from 'node:test';
import assert from 'node:assert/strict';
import {getStageConfig,CAMPAIGN_LEVELS} from '../src/protocol.js';
import {SaveManager} from '../src/storage.js';
import {SoundEngine} from '../src/audio.js';
import {RhythmClock} from '../src/rhythm-clock.js';

test('first stage retains its game and music pace, with unbounded later master rounds',()=>{
 assert.equal(getStageConfig(1).speedMult,CAMPAIGN_LEVELS[0].speedMult);
 assert.equal(getStageConfig(1).musicTempo,.85);
 let previous=0;
 for(const stage of[1,2,3,10,30,31,100,1000,1000000]){
  const config=getStageConfig(stage);assert.equal(config.stage,stage);assert.ok(config.speedMult>previous);previous=config.speedMult;
  assert.ok(config.trickPool.length>0);assert.ok(config.maxScoops<=12);assert.ok(config.vendorIdx>=0&&config.vendorIdx<4);
 }
});

test('wins continue after stage30, persist across reload, and keep base score arrays bounded',()=>{
 const previous=globalThis.localStorage;let raw=null;globalThis.localStorage={getItem:()=>raw,setItem:(_key,value)=>raw=value};
 try{
  const save=new SaveManager();save.data.unlockedStage=30;save.data.completedStages=Array.from({length:29},(_,i)=>i+1);
  save.recordStageResult(30,900,3,true);assert.equal(save.data.unlockedStage,31);
  save.recordStageResult(31,950,2,true);assert.equal(save.data.unlockedStage,32);
  const loaded=new SaveManager();assert.equal(loaded.data.unlockedStage,32);assert.equal(loaded.getStageBestScore(31),950);assert.equal(loaded.getStageStars(31),2);
  assert.equal(loaded.data.stageHighScores.length,30);assert.equal(loaded.data.stageStars.length,30);
  loaded.data.unlockedStage=1000000;loaded.save();const far=new SaveManager();assert.equal(far.data.unlockedStage,1000000);assert.ok(far.data.completedStages.length<100);
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

test('audio clock owns game time; impacts cannot alter scheduled music',()=>{
 const played=[],clock=new RhythmClock(2),sound=new SoundEngine();
 Object.assign(sound,{ctx:{currentTime:0,state:'running'},init(){},_canScheduleAudio(){return true;},_playMusicStep(step,at){played.push({step,at});}});
 sound.bindRhythmClock(clock);sound.startMusic();
 try{
  assert.notEqual(sound.musicTimer,null);assert.equal(played.length,1);
  clock.advance(.08);assert.equal(clock.time,0,'RAF cannot push the audio clock');
  sound.ctx.currentTime=.08;clock.advance(.001);assert.equal(clock.time,.16);
  const before=[clock.step,clock.nextAt,clock.phase,played.length];
  for(let i=0;i<20;i++)sound.syncMusicBeat();
  assert.deepEqual([clock.step,clock.nextAt,clock.phase,played.length],before);
  sound.musicTransport.schedule((step,at)=>played.push({step,at}));
  assert.ok(played[1].at>.08,'next note is scheduled ahead, not on a render frame');
 }finally{sound.stopMusic();}
});

test('the actual vendor director advances its choreography on the same scaled timeline as the music',async()=>{
 const{makeVendorFlourishFixture}=await import('./vendor-flourish-fixture.js');
 for(const stage of[1,3,31,1000])for(const seed of[.02,.99]){
  const{w,d}=makeVendorFlourishFixture(1,1),notes=[];
  w.stretchyStrand.attach=()=>{};w.stretchyStrand.update=()=>{};
  const silent=()=>{};d.sound=new Proxy({playRhythmNotes:batch=>notes.push(...batch)},{get:(object,key)=>key in object?object[key]:silent});
  d.resetRound(stage,false);d.routine=['SCRAPE_FLAVOR_SCOOP','FINAL_PISTACHIO_CATCH'];d.flavorFeintRandom=()=>seed;d.startRound();
  const input={isPointerDown:false,isMoving:false,normX:0,normY:0,handWorldPos:w.touristHand.position.clone(),intentWorldPos:w.touristHand.position.clone(),pointerEpoch:0,cancelEpoch:0};
  // The receiving hand/pose lead-in is presentation time; it cannot consume
  // the subsequent action's response timer. Music keeps its shared clock.
  let frame=0;do{d.update(1/60,100+frame/60,input);frame++;}while(frame<300&&(d.trickTransition||d.pendingTrickEntry||d.servingHandoff||d.entryPaperPreparation||d.pendingEntryPaper));
  assert.ok(frame<300,'physical entry must finish');
  const timer=d.stageTimer,clock=d.rhythmClock.time;notes.length=0;
  for(let i=0;i<15;i++)d.update(1/60,100+(frame+i)/60,input);
  assert.equal(d.currentStage,stage);assert.ok(Math.abs(d.rhythmClock.time-clock-.25*getStageConfig(stage).tempoFactor)<1e-10);
  assert.ok(notes.length>0);assert.ok(Math.abs(d.stageTimer-timer-.25*d.config.speedMult*1.22)<1e-9,`stage${stage}: timer ${d.stageTimer-timer}, expected ${.25*d.config.speedMult*1.22}, transition ${!!d.trickTransition}, handoff ${!!d.servingHandoff}`);
 }
});
