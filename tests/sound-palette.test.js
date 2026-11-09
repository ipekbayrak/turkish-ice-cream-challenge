import test from 'node:test';import assert from 'node:assert/strict';
import {USTA_BASE_PITCH,VENDOR_REACTIONS,synthesizeVendorVocal,MUSIC_MELODY,musicStepEvents,musicStepSeconds,synthesizeMusicNote,renderMusicPhrase} from '../src/sound-palette.js';
import {renderLegacyMusic} from './fixtures/audio-legacy-reference.js';
const stats=samples=>{let peak=0,sum=0,dc=0;for(const x of samples){assert.ok(Number.isFinite(x));peak=Math.max(peak,Math.abs(x));sum+=x*x;dc+=x;}return{peak,rms:Math.sqrt(sum/samples.length),dc:dc/samples.length};};

test('the four-bar phrase has breathing space and no denser/louder onset budget than the old score',()=>{
 assert.equal(MUSIC_MELODY.length,32);assert.deepEqual(MUSIC_MELODY.slice(-3),[-1,-1,-1]);
 let notes=0;for(let step=0;step<32;step++){const events=musicStepEvents(step);notes+=events.length;assert.ok(events.reduce((sum,e)=>sum+e.peak,0)<.11);}
 assert.ok(notes<=40,`${notes} note onsets versus old40`);
 for(const tempo of [.2,.85,1,1.15,100])for(let i=0;i<32;i++)assert.ok(musicStepSeconds(i,tempo)>0&&musicStepSeconds(i,tempo)<=.267);
 assert.ok(Math.abs(musicStepSeconds(0,2)*2-musicStepSeconds(0,1))<1e-12);
 const now=stats(renderMusicPhrase(16000)),before=stats(renderLegacyMusic(16000));
 assert.ok(now.peak<.11);assert.ok(now.rms<=before.rms);assert.ok(now.rms>=before.rms*.65,'music must not be made inaudible');
 assert.ok(Math.abs(now.dc)<.0001);
});

test('all instrument notes start/end silently and remain finite at mobile audio rates',()=>{
 for(const rate of [22050,44100,48000])for(const event of musicStepEvents(0).concat(musicStepEvents(2))){
  const samples=synthesizeMusicNote(rate,event),s=stats(samples);
  assert.equal(samples[0],0);assert.equal(samples.at(-1),0);assert.ok(s.peak<=event.peak+1e-7);assert.ok(s.rms>.001);
 }
});

test('every vendor remains brief, voiced and click-free with unchanged source peak limits',()=>{
 for(const pitch of USTA_BASE_PITCH)for(const gestures of Object.values(VENDOR_REACTIONS))for(const gesture of gestures){
  const pcm=synthesizeVendorVocal(16000,pitch,gesture,851),s=stats(pcm);
  assert.ok(gesture.duration<=.25);assert.ok(s.peak<=.04*gesture.volume+1e-7);assert.ok(s.peak>.015);
  assert.equal(pcm[0],0);assert.equal(pcm.at(-1),0);assert.ok(Math.abs(s.dc)<.00002);
  let sub=0,high=0,body=0;
  for(let hz=40;hz<=4000;hz+=40){let real=0,imag=0;for(let i=0;i<pcm.length;i++){const a=2*Math.PI*hz*i/16000;real+=pcm[i]*Math.cos(a);imag+=pcm[i]*Math.sin(a);}const e=real*real+imag*imag;if(hz<200)sub+=e;else if(hz>=3000)high+=e;else body+=e;}
  assert.ok(sub/body<.002,`subharmonic ${sub/body}`);assert.ok(high/body<.0001,`high-band ${high/body}`);
 }
});
