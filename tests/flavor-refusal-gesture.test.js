import test from 'node:test';import assert from 'node:assert/strict';
import {FlavorRefusalGesture} from '../src/flavor-refusal-gesture.js';
const active={isPointerDown:true,pointerEpoch:1,cancelEpoch:0,pointerX:160,pointerY:600};
const sample=(g,x,y=600,extra={},dt=.04)=>g.update({...active,pointerX:x,pointerY:y,...extra},dt,{enabled:true,width:390});
const wave=(g,xs)=>xs.map(x=>sample(g,x)).filter(Boolean).length;
test('left-right and right-left physical waves each emit exactly one refusal',()=>{
 for(const points of[[160,150,135,120,130,145,160],[160,170,185,200,190,175,160]]){
  const g=new FlavorRefusalGesture();assert.equal(wave(g,points),1);assert.equal(g.progress,1);assert.equal(wave(g,points),0);
 }
});
test('stationary, subthreshold jitter and one-direction slices are not refusals',()=>{
 const g=new FlavorRefusalGesture();for(let n=0;n<1000;n++)assert.equal(sample(g,160+(n%3)-1),false);
 g.reset();assert.equal(wave(g,[160,150,140,130,120,100,80,60]),0);
});
test('vertical and figure-eight-like motion cannot replace a horizontal no',()=>{
 const g=new FlavorRefusalGesture();for(const[x,y]of[[160,600],[160,630],[130,650],[100,620],[130,590],[160,570],[190,600],[200,640],[160,650]])assert.equal(sample(g,x,y),false);
});
test('release, new pointer epoch and cancellation cannot join two separate strokes',()=>{
 for(const changed of[{isPointerDown:false},{pointerEpoch:2},{cancelEpoch:1}]){
  const g=new FlavorRefusalGesture();wave(g,[160,145,125]);sample(g,330,600,changed);
  assert.equal(sample(g,350,600,{pointerEpoch:changed.pointerEpoch??1,cancelEpoch:changed.cancelEpoch??0}),false);
 }
});
test('posed hand, aim, camera or stale velocity changes with a fixed physical finger do not count',()=>{
 const g=new FlavorRefusalGesture();for(let n=0;n<150;n++)assert.equal(sample(g,160,600,{aimNormX:Math.sin(n),normX:Math.sin(n),vx:20,handWorldPos:{x:Math.sin(n),y:1,z:0}}),false);
});
test('desktop hover uses the same raw intent while disabled input remains silent',()=>{
 const g=new FlavorRefusalGesture();let fired=0;for(const x of[160,150,135,120,130,145,160])fired+=Number(sample(g,x,600,{isPointerDown:false,isMouseHover:true}));assert.equal(fired,1);
 g.reset();for(const x of[160,130,160])assert.equal(g.update({...active,pointerX:x},.1,{enabled:false}),false);
});
test('too-fast jumps cannot turn into a refusal by holding still afterward',()=>{
 const g=new FlavorRefusalGesture();sample(g,160,600,{},.01);sample(g,130,600,{},.01);assert.equal(sample(g,160,600,{},.01),false);
 for(let n=0;n<40;n++)assert.equal(sample(g,160),false);
});
test('a slow expired first sweep cannot be joined to a later return',()=>{
 const g=new FlavorRefusalGesture();wave(g,[160,145,125]);for(let n=0;n<35;n++)sample(g,125);assert.equal(sample(g,160),false);
});
test('viewport scaling, invalid inputs and reset preserve deliberate recognition',()=>{
 const g=new FlavorRefusalGesture();sample(g,160);sample(g,130);assert.equal(g.update({...active,pointerX:NaN},.04,{enabled:true}),false);
 assert.equal(g.update(active,NaN,{enabled:true}),false);g.reset();assert.equal(wave(g,[160,150,135,120,130,145,160]),1);
 const large=new FlavorRefusalGesture();for(const x of[100,120,100])assert.equal(large.update({...active,pointerX:x},.1,{enabled:true,width:1280}),false);
});
