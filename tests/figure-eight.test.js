import test from 'node:test';
import assert from 'node:assert/strict';
import { createFigureEightPath, FigureEightGesture } from '../src/figure-eight.js';

const make=(width=390,height=844)=>new FigureEightGesture(createFigureEightPath({canvas:{clientWidth:width,clientHeight:height}}));
function at(t,phase,{rawStill=false,offset=0,epoch=1,cancel=0,down=true}={}) {
 const f=t.frame,x=f.center.x+Math.sin(phase*Math.PI*2)*f.rx,y=f.center.y-Math.sin(phase*Math.PI*4)*f.ry;
 return {normX:rawStill?0:x/f.viewport.width*2-1,normY:rawStill?0:1-(y+offset)/f.viewport.height*2,
  aimNormX:x/f.viewport.width*2-1,aimNormY:1-y/f.viewport.height*2,isPointerDown:down,pointerEpoch:epoch,cancelEpoch:cancel};
}
test('a continuous complete8 succeeds in either direction, both starts, mouse and raised touch aim',()=>{
 for(const [w,h]of[[320,700],[390,844],[1280,720]])for(const direction of[-1,1])for(const start of[0,.5])for(const offset of[0,90]){
  const t=make(w,h);let done=false;
  for(let i=0;i<=160;i++)done=t.update(at(t,start+direction*i/160,{offset}),1/60)||done;
  assert.equal(done,true,`${w} ${direction} ${start} ${offset}`);assert.equal(t.progress,1);
 }
});
test('one lobe, a circle, a line, corner jumps and tiny jitter cannot complete8',()=>{
 for(const kind of['one-lobe','circle','line','jumps','jitter']){
  const t=make();t.update(at(t,0),1/60);let done=false;
  for(let i=1;i<360;i++){
   let input=at(t,kind==='one-lobe'?Math.min(.5,i/160):kind==='jumps'?Math.floor(i/40)/4:i/160);
   if(kind==='circle'){input.aimNormX=Math.sin(i*.04)*.6;input.aimNormY=.02+Math.cos(i*.04)*.19;input.normX=input.aimNormX;input.normY=input.aimNormY;}
   if(kind==='line'){input.aimNormY=input.normY=.02;}
   if(kind==='jitter'){input.aimNormX=input.normX=(i%2?.003:-.003);input.aimNormY=input.normY=.02;}
   done=t.update(input,1/60)||done;
  }
  assert.equal(done,false,kind);
 }
});
test('camera or rendered aim motion with no raw input cannot paint the track',()=>{
 const t=make();for(let i=0;i<320;i++)t.update(at(t,i/160,{rawStill:true}),1/60);
 assert.equal(t.progress,0);assert.equal(t.complete,false);
});
test('release and cancellation erase partial strokes before a fresh full8',()=>{
 for(const interruption of['release','cancel','epoch']){
  const t=make();for(let i=0;i<=80;i++)t.update(at(t,i/160),1/60);assert.ok(t.progress>.3);
  t.update(at(t,.5,{down:interruption!=='release',cancel:interruption==='cancel'?1:0,epoch:interruption==='epoch'?2:1}),1/60);
  assert.equal(t.progress,0);
  for(let i=81;i<=160;i++)t.update(at(t,i/160,{epoch:2,cancel:1}),1/60);
  assert.equal(t.complete,false);
  t.reset();for(let i=0;i<=160;i++)t.update(at(t,i/160,{epoch:3,cancel:1}),1/60);assert.equal(t.complete,true);
 }
});
test('ordinary fast strokes work at30/60Hz without jumping through checkpoints',()=>{
 for(const hz of[30,60])for(const seconds of[.8,1.2,2.5]){
  const t=make();for(let i=0;i<=Math.ceil(seconds*hz);i++)t.update(at(t,Math.min(1,i/(seconds*hz))),1/hz);
  assert.equal(t.complete,true,`${hz}Hz ${seconds}s`);
 }
});
test('a very fast closed8 can settle at its endpoint without needing another movement',()=>{
 const t=make();for(let i=0;i<=30;i++)t.update(at(t,i/30),1/60);
 assert.equal(t.progress,1);assert.equal(t.complete,false);
 for(let i=0;i<12;i++)t.update(at(t,1),1/60);
 assert.equal(t.complete,true);
});

test('the first center contact after waiting starts a complete stroke without an extra hold',()=>{
 for(const width of [320,390]){
  const t=make(width,844);for(let i=0;i<20;i++)t.update(at(t,0,{down:false,epoch:0}),1/30);
  for(let i=0;i<=66;i++)t.update(at(t,i/66,{epoch:1}),1/30);
  assert.equal(t.complete,true,`${width}px first contact must not discard the first lobe`);
 }
});
