import test from 'node:test';
import assert from 'node:assert/strict';
import { DiscoveryUI } from '../src/discovery-ui.js';

function fixture(run) {
 const old=Object.getOwnPropertyDescriptor(globalThis,'document'),classes=new Set(),calls=[];
 Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}}}});
 try {
  let captured=null;const surface={setPointerCapture:id=>captured=id,hasPointerCapture:id=>captured===id,releasePointerCapture:()=>captured=null};
  const ui=Object.create(DiscoveryUI.prototype);Object.assign(ui,{active:true,selected:'tea',pointer:null,world:{culturalScene:{beginRotation:id=>calls.push(['begin',id]),rotateBy:(...args)=>calls.push(['rotate',...args]),endRotation:(...args)=>calls.push(['end',...args])}},point:(...args)=>calls.push(['tap',...args])});
  const event=(pointerId,x,y,timeStamp=16,target={closest:()=>null})=>({pointerId,clientX:x,clientY:y,timeStamp,target,currentTarget:surface,button:0,isPrimary:true,preventDefault(){}});
  run({ui,event,calls,classes,captured:()=>captured});
 } finally {if(old)Object.defineProperty(globalThis,'document',old);else delete globalThis.document;}
}
test('a drag rotates the object and cannot turn into a close/pick on release',()=>fixture(({ui,event,calls,classes,captured})=>{
 assert.equal(ui.pointerDown(event(1,100,200)),true);assert.equal(captured(),1);
 ui.pointerMove(event(1,130,215,32));assert.ok(classes.has('discovery-dragging'));
 ui.pointerUp(event(1,130,215,48));assert.ok(calls.some(c=>c[0]==='rotate'));assert.ok(!calls.some(c=>c[0]==='tap'));assert.equal(captured(),null);assert.equal(ui.pointer,null);
}));
test('only a stationary canvas tap selects/returns an object; card interaction stays native',()=>fixture(({ui,event,calls})=>{
 assert.equal(ui.pointerDown(event(1,100,200,16,{closest:()=>({})})),false);
 ui.pointerDown(event(1,100,200));ui.pointerMove(event(1,102,201,32));ui.pointerUp(event(1,102,201,48));
 assert.deepEqual(calls.filter(c=>c[0]==='tap'),[['tap',102,201]]);
}));
test('second pointer and canceled drag cannot change the object or perform a tap',()=>fixture(({ui,event,calls,captured})=>{
 ui.pointerDown(event(1,100,200));assert.equal(ui.pointerDown(event(2,120,210)),false);assert.equal(ui.pointerMove(event(2,170,220)),false);
 ui.pointerMove(event(1,130,210,32));ui.pointerCancel(event(1,130,210,48));
 assert.equal(ui.pointer,null);assert.equal(captured(),null);assert.ok(!calls.some(c=>c[0]==='tap'));assert.deepEqual(calls.at(-1),['end',1,true]);
}));
