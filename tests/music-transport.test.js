import test from 'node:test';
import assert from 'node:assert/strict';
import {RhythmClock,rhythmStepTime} from '../src/rhythm-clock.js';
import {MusicTransport} from '../src/music-transport.js';

test('lookahead schedules a stable swung grid through jittery rendering and physical impacts',()=>{
 const ctx={state:'running',currentTime:10},clock=new RhythmClock(2.2),transport=new MusicTransport(clock,()=>ctx),notes=[];
 for(let i=0;i<1000;i++){
  ctx.currentTime=10+i*.017;
  transport.schedule((step,at)=>notes.push({step,at}));
  if(i%7!==0)clock.advance(.05); // intentionally incorrect/irregular frame dt
  if(i%3===0)clock.accent();
 }
 clock.advance(0);
 assert.ok(Math.abs(clock.realTime-999*.017)<1e-9);
 assert.equal(new Set(notes.map(n=>n.step)).size,notes.length);
 for(const n of notes)assert.ok(Math.abs(n.at-(10+rhythmStepTime(n.step,2.2)))<1e-9);
});
test('suspension freezes heard time; context replacement and muted fallback retain phase',()=>{
 let now=0,ctx=null;const clock=new RhythmClock(1),transport=new MusicTransport(clock,()=>ctx,()=>now);
 now=.5;clock.advance(.016);assert.equal(clock.time,.5);
 ctx={state:'running',currentTime:7};clock.advance(.016);assert.equal(clock.time,.5);
 ctx.currentTime=7.5;clock.advance(.016);assert.equal(clock.time,1);
 ctx.state='suspended';clock.advance(20);assert.equal(clock.time,1);
 ctx={state:'running',currentTime:0};clock.advance(.016);assert.equal(clock.time,1);
 ctx.currentTime=.25;clock.advance(.016);assert.equal(clock.time,1.25);
});
test('a background scheduling gap skips old notes without changing future grid',()=>{
 const ctx={state:'running',currentTime:0},clock=new RhythmClock(),transport=new MusicTransport(clock,()=>ctx),notes=[];
 transport.schedule((step,at)=>notes.push({step,at}));ctx.currentTime=40;
 clock.advance(.016);transport.schedule((step,at)=>notes.push({step,at}));
 assert.ok(notes.length<=2);
 for(const note of notes.slice(1))assert.ok(Math.abs(note.at-rhythmStepTime(note.step))<1e-9);
});
test('explicit background pause excludes hidden time and resumes the same phrase',()=>{
 const ctx={state:'running',currentTime:0},clock=new RhythmClock(),transport=new MusicTransport(clock,()=>ctx);
 ctx.currentTime=.4;clock.advance(.01);transport.setPaused(true);
 ctx.currentTime=40;transport.setPaused(false);clock.advance(.01);assert.equal(clock.time,.4);
 ctx.currentTime=40.1;clock.advance(.01);assert.ok(Math.abs(clock.time-.5)<1e-9);
});
test('cancelled lookahead notes can be rescheduled on the original grid after resume',()=>{
 const ctx={state:'running',currentTime:0},clock=new RhythmClock(2),transport=new MusicTransport(clock,()=>ctx),notes=[];
 ctx.currentTime=.08;transport.schedule((step,at)=>notes.push({step,at}));
 const expected=notes[0];assert.equal(expected.step,1);
 transport.resume();notes.length=0;transport.schedule((step,at)=>notes.push({step,at}));
 assert.deepEqual(notes,[expected]);assert.equal(transport.elapsed,.08);
});
