import test from 'node:test';import assert from 'node:assert/strict';import{SoundEngine}from'../src/audio.js';
class Param{value=1;setValueAtTime(v){this.value=v;}cancelScheduledValues(){}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}}
class Node{constructor(c,k){this.ctx=c;this.kind=k;c.nodes.push(this);this.gain=new Param();this.frequency=new Param();this.pan=new Param();this.Q=new Param();}connect(){}disconnect(){this.disconnected=true;}addEventListener(){}start(){this.started=true;}stop(){this.stopped=true;}}
class Context{
 constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=16000;this.destination={};this.nodes=[];this.listeners=[];this.pending=[];this.resumes=0;}
 addEventListener(type,fn){if(type==='statechange')this.listeners.push(fn);}
 change(state){this.state=state;this.listeners.forEach(f=>f());}
 resume(){this.resumes++;return new Promise((resolve,reject)=>this.pending.push({resolve,reject}));}
 allow(){this.change('running');this.pending.splice(0).forEach(p=>p.resolve());}
 deny(){this.pending.splice(0).forEach(p=>p.reject(Error('NotAllowedError')));}
 createGain(){return new Node(this,'gain');}createBufferSource(){return new Node(this,'buffer');}createOscillator(){return new Node(this,'oscillator');}createStereoPanner(){return new Node(this,'panner');}createBiquadFilter(){return new Node(this,'filter');}
 createBuffer(c,n){return{length:n,getChannelData:()=>new Float32Array(n)};}
}
async function withEngine(run){const old=globalThis.window;globalThis.window={AudioContext:Context};const s=new SoundEngine();try{await run(s);}finally{s.setMuted(true);if(old===undefined)delete globalThis.window;else globalThis.window=old;}}
test('first gesture primes synchronously, then async resume enables sound without a second click or mixer',()=>withEngine(async s=>{
 s.bindRhythmClock({accent:()=>null});s.startMusic();const ctx=s.ctx,mixer=s.masterGain;s.playConePop();assert.equal(s.activeSources.size,0);
 const first=s.unlockFromGesture(),second=s.unlockFromGesture();assert.ok(ctx.resumes>=1);assert.equal(ctx.nodes.filter(n=>n.kind==='buffer').length,1);assert.equal([...s.activeSources][0].buffer.length,1);
 assert.equal(s.speakVendor('hmm'),false);assert.equal(s.voiceCount,0);ctx.allow();assert.equal(await first,true);assert.equal(await second,true);assert.equal(s._iosUnlocked,true);assert.equal(s.masterGain,mixer);assert.equal(s.musicPlaying,true);assert.equal(s.musicTimer,null);
 s.playConePop();assert.ok(ctx.nodes.some(n=>n.kind==='oscillator'&&n.started));assert.equal(s.enabled,true);
}));
test('rejected activation cleans the token and a later real gesture can retry',()=>withEngine(async s=>{
 const pending=s.unlockFromGesture(),ctx=s.ctx;ctx.deny();assert.equal(await pending,false);assert.equal(s.activeSources.size,0);assert.equal(s._iosUnlocked,false);
 const retry=s.unlockFromGesture();ctx.allow();assert.equal(await retry,true);assert.equal(s.ctx,ctx);
}));
test('a muted preference is never undone by a game gesture',()=>withEngine(async s=>{
 s.setMuted(true);assert.equal(await s.unlockFromGesture(),false);assert.equal(s.ctx,null);assert.equal(s.enabled,false);
}));
test('interruption and closed context recover while preserving the one shared music clock',()=>withEngine(async s=>{
 const clock={accent:()=>null};s.bindRhythmClock(clock);s.startMusic();let p=s.unlockFromGesture();const old=s.ctx;old.allow();await p;
 old.change('interrupted');p=s.unlockFromGesture();old.allow();await p;assert.equal(s.ctx,old);assert.equal(s.musicPlaying,true);
 old.currentTime=42;s.lastVoiceAt=41;s.lastVoiceByGroup.set('curious',41);s.voiceCount=2;old.change('closed');assert.equal(s.musicPlaying,false);const mixer=s.masterGain;p=s.unlockFromGesture();const fresh=s.ctx;assert.notEqual(fresh,old);assert.notEqual(s.masterGain,mixer);assert.ok(mixer.disconnected);fresh.allow();await p;
 assert.equal(s.rhythmClock,clock);assert.equal(s.musicPlaying,true);assert.equal(s.musicTimer,null);assert.equal(s.masterGain.gain.value,1);assert.equal(s.lastVoiceAt,-1);assert.equal(s.lastVoiceByGroup.get('curious'),-1);assert.equal(s.voiceCount,2);
}));
