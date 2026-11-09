import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundEngine } from '../src/audio.js';
import { musicStepEvents } from '../src/sound-palette.js';

class Param {value=1;setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}cancelScheduledValues(){}}
class Node {
 constructor(ctx,kind){this.ctx=ctx;this.kind=kind;ctx.nodes.push(this);for(const key of ['gain','frequency','Q','pan'])this[key]=new Param();}
 connect(){}disconnect(){this.disconnected=true;}addEventListener(type,callback){if(type==='ended')this.ended=callback;}
 start(at=0){this.started=true;this.startAt=at;}stop(at=0){this.stopAt=at;this.cancelled=at<=this.ctx.currentTime;}
}
class StatefulContext {
 constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=16000;this.destination={};this.nodes=[];this.listeners=[];this.permitResume=false;this.resumes=0;}
 addEventListener(type,callback){if(type==='statechange')this.listeners.push(callback);}
 changeState(state){this.state=state;this.listeners.forEach(fn=>fn());}
 resume(){this.resumes++;if(this.permitResume)this.changeState('running');return Promise.resolve();}
 createGain(){return new Node(this,'gain');}createBufferSource(){return new Node(this,'buffer');}createOscillator(){return new Node(this,'oscillator');}createBiquadFilter(){return new Node(this,'filter');}createStereoPanner(){return new Node(this,'panner');}
 createBuffer(channels,size){const pcm=new Float32Array(size);return{getChannelData:()=>pcm};}
}
function harness(run){
 const oldWindow=globalThis.window,oldTimeout=globalThis.setTimeout,oldClear=globalThis.clearTimeout;
 const timers=[];let engine;
 globalThis.window={AudioContext:StatefulContext};
 globalThis.setTimeout=(callback,delay)=>{const timer={callback,delay,cancelled:false};timers.push(timer);return timer;};
 globalThis.clearTimeout=timer=>{if(timer)timer.cancelled=true;};
 const tick=()=>{let timer;while((timer=timers.shift())?.cancelled){}assert.ok(timer,'music retry remains scheduled');timer.callback();};
 try{engine=new SoundEngine();run(engine,tick,timers);}finally{engine?.setMuted(true);globalThis.setTimeout=oldTimeout;globalThis.clearTimeout=oldClear;if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;}
}
const sources=engine=>engine.ctx.nodes.filter(n=>n.kind==='buffer'||n.kind==='oscillator');

test('autoplay-blocked music cannot queue frozen-clock notes, effects, voices or consume limits',()=>harness((s,tick)=>{
 s.startMusic();assert.equal(s.musicPlaying,true);
 for(let i=0;i<20;i++){
  assert.equal(s.speakVendor(i%2?'hmm':'laugh'),false);
  s.playWaferSlide();s.playConePop();s.playBellBurst();s.playCounterRap();tick();
 }
 assert.equal(s.ctx.currentTime,0);assert.equal(s.beatStep,0);assert.equal(sources(s).length,0);
 assert.equal(s.activeSources.size,0);assert.equal(s.musicBuffers.size,0);assert.equal(s.pendingSounds.size,0);
 assert.equal(s.voiceCount,0);assert.equal(s.voiceVariation,0);assert.equal(s.voiceSyllables.length,0);assert.equal(s.lastVoiceAt,-Infinity);
 // A real subsequent gesture grants resume. Only this beat is scheduled now.
 s.ctx.permitResume=true;s.unlockFromGesture();s.ctx.currentTime=.05;tick();
 assert.equal(s.ctx.state,'running');assert.equal(s.beatStep,1);assert.equal(s.musicSources.size,musicStepEvents(0).length);
 assert.ok([...s.musicSources.keys()].every(source=>source.startAt===.05));
 assert.equal(sources(s).filter(n=>n.buffer?.getChannelData(0).length>1).length,musicStepEvents(0).length);
 assert.equal(s.voiceCount,0);assert.equal(s.speakVendor('hmm'),true);assert.equal(s.voiceCount,1);
}));

test('all effects reject suspended, interrupted and closed real contexts without source or timer creation',()=>harness((s)=>{
 s.init();const actions=['playCrowdReaction','playWaferSlide','playGripTug','playConePop','playBell','playBellNote','playCounterRap','playBellBurst','playPaddleClank','playWhoosh','playBoop','playShowBoost','playScoopAdded','playPenalty','playWinFanfare'];
 for(const state of ['suspended','interrupted','closed']){
  s.ctx.changeState(state);const count=sources(s).length;
  for(const action of actions)s[action]();
  assert.equal(s.speakVendor('hoppa'),false);assert.equal(s._playMusicStep(0),false);
  assert.equal(sources(s).length,count,state);assert.equal(s.pendingSounds.size,0,state);assert.equal(s.voiceCount,0);assert.equal(s.getVoiceMouthOpen(),0);
 }
}));

test('interruption cancels pending sounds but preserves requested music without catch-up or voice reset',()=>harness((s,tick)=>{
 s.init();s.ctx.permitResume=true;s.unlockFromGesture();s.startMusic();s.speakVendor('laugh');s.playBellBurst();
 const playing=[...s.activeSources];assert.ok(playing.length>5);assert.equal(s.beatStep,1);assert.equal(s.voiceCount,1);
 s.ctx.permitResume=false;s.ctx.changeState('interrupted');
 assert.equal(s.activeSources.size,0);assert.equal(s.vendorSources.size,0);assert.equal(s.pendingSounds.size,0);assert.equal(s.getVoiceMouthOpen(),0);
 assert.ok(playing.every(source=>source.cancelled));assert.equal(s.musicPlaying,true);assert.equal(s.voiceCount,1);
 for(let i=0;i<20;i++)tick();assert.equal(s.beatStep,1);assert.equal(s.activeSources.size,0);
 s.ctx.permitResume=true;s.unlockFromGesture();tick();assert.equal(s.beatStep,2,'resume advances one current step, including a rest');
 assert.equal(s.musicSources.size,musicStepEvents(1).length);assert.equal(s.voiceCount,1);
 s.ctx.changeState('closed');assert.equal(s.musicPlaying,false);assert.equal(s.musicTimer,null);
}));

test('offline contexts may schedule before rendering without trying mobile unlock/resume',()=>harness((s)=>{
 s.ctx=new StatefulContext();s.ctx.startRendering=()=>Promise.resolve();s.init();
 assert.equal(s.ctx.resumes,0);assert.equal(sources(s).length,0);
 s._playMusicStep(0,2);assert.equal(s.musicSources.size,musicStepEvents(0).length);assert.ok([...s.musicSources.keys()].every(source=>source.startAt===2));
 assert.equal(s.speakVendor('hmm'),true);assert.equal(s.voiceCount,1);
 s.ctx.changeState('closed');const count=sources(s).length;assert.equal(s.speakVendor('hoppa'),false);assert.equal(s._playMusicStep(1),false);assert.equal(sources(s).length,count);
}));
