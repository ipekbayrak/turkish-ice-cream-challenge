import test from 'node:test';import assert from 'node:assert/strict';
import {OrderFlow,ORDER_DWELL_SECONDS,ORDER_MOVE_PIXELS,orderFinishDelay} from '../src/order-flow.js';
const advance=(flow,seconds,input={active:false,flavor:null})=>{for(let i=0;i<Math.round(seconds*100);i++)flow.update(.01,input);};
const hold=(flavor,epoch=1,pointerX=40+flavor*45,pointerY=300)=>({active:true,flavor,epoch,pointerX,pointerY});
const start=(options={},callbacks={})=>{const flow=new OrderFlow(callbacks);flow.start({greetingSeconds:0,...options});advance(flow,.01);return flow;};
const choose=(flow,flavor,epoch=1,x)=>advance(flow,ORDER_DWELL_SECONDS,hold(flavor,epoch,x));

test('first stationary scoop confirms after1.35s and fires onSingle once around.65s, without a pull or extra scoop',()=>{
 let result,single=0;const seen=[];const f=start({}, {onChoice:c=>seen.push(c),onSingle:()=>single++,onComplete:r=>result=r});choose(f,0);
 assert.equal(f.count,1);assert.equal(f.snapshot.finishDelay,1.35);assert.equal(f.snapshot.idleProgress,0);assert.equal(single,0);
 advance(f,.64,hold(0));assert.equal(single,0);assert.equal(f.phase,'order');
 advance(f,.01,hold(0));assert.equal(single,1);assert.equal(f.phase,'order');
 advance(f,.69,hold(0));assert.equal(f.phase,'order');assert.equal(single,1);assert.ok(f.snapshot.idleProgress>.98);
 advance(f,.01,hold(0));assert.equal(f.phase,'confirm');assert.equal(f.snapshot.remainingSeconds,0);assert.equal(single,1);
 advance(f,.55);assert.deepEqual(result,{count:1,flavors:[0]});assert.equal(seen.length,1);assert.equal(single,1);
});
test('second scoop uses800ms, cancels one-scoop finish after onSingle, and returns deliberately selected flavors',()=>{
 let result,single=0;const f=start({}, {onSingle:()=>single++,onComplete:r=>result=r});choose(f,0);
 advance(f,.95,hold(0));assert.equal(single,1);assert.equal(f.phase,'order');
 choose(f,2,2);assert.equal(f.count,2);assert.equal(f.snapshot.idleSeconds,0);
 assert.equal(f.snapshot.finishDelay,.8);assert.deepEqual(f.flavors,[0,2]);assert.equal(single,1);
 advance(f,.79,hold(2,2));assert.equal(f.phase,'order');advance(f,.01,hold(2,2));assert.equal(f.phase,'confirm');
 advance(f,.55);assert.deepEqual(result,{count:2,flavors:[0,2]});assert.equal(single,1);
});
test('every accepted scoop shortens timeout to a450ms floor, including eight-scoop orders',()=>{
 const delays=[1.35,.8,.6,.45,.45,.45,.45,.45],flavors=[0,1,2,3,0,1,0,2];
 for(let total=1;total<=8;total++){
  let result;const f=start({maxScoops:8},{onComplete:r=>result=r});
  for(let i=0;i<total;i++){choose(f,flavors[i],i+1);assert.equal(f.snapshot.finishDelay,delays[i]);assert.equal(f.snapshot.idleSeconds,0);}
  const input=hold(flavors[total-1],total);advance(f,delays[total-1]-.01,input);assert.equal(f.phase,'order');
  advance(f,.01,input);assert.equal(f.phase,'confirm');advance(f,.55);
  assert.deepEqual(result,{count:total,flavors:flavors.slice(0,total)});
 }
 assert.equal(orderFinishDelay(0),0);
});
test('real raw movement keeps the selected order open, then stopping starts the full interval',()=>{
 const f=start();choose(f,0);let x=40;
 for(let i=0;i<12;i++){
  x+=ORDER_MOVE_PIXELS+1;const input={...hold(null),pointerX:x};f.update(.01,input);
  assert.equal(f.snapshot.idleSeconds,0);advance(f,.3,input);assert.equal(f.phase,'order');
 }
 const stationary={...hold(null),pointerX:x};advance(f,1.04,stationary);assert.equal(f.phase,'order');advance(f,.01,stationary);assert.equal(f.phase,'confirm');
});
test('tiny pointer jitter, stale speed and rendered-aim animation cannot restart the timeout',()=>{
 const f=start();choose(f,0);
 for(let i=0;i<135;i++)f.update(.01,{...hold(0),pointerX:40+Math.sin(i)*2,pointerY:300+Math.cos(i)*2,speed:999,isMoving:true,aimNormX:Math.sin(i),aimNormY:Math.cos(i)});
 assert.equal(f.phase,'confirm');assert.equal(f.count,1);
});
test('camera/visual hit changes without raw motion cannot add scoops or hold ordering open',()=>{
 const f=start();choose(f,0);
 advance(f,1.35,{...hold(2),pointerX:40});assert.equal(f.phase,'confirm');assert.deepEqual(f.flavors,[0]);
});
test('released finger also accepts the existing order after the same inactivity delay',()=>{
 let result;const f=start({maxScoops:8},{onComplete:r=>result=r});choose(f,2);
 advance(f,1.34);assert.equal(f.phase,'order');advance(f,.01);assert.equal(f.phase,'confirm');advance(f,.55);
 assert.deepEqual(result,{count:1,flavors:[2]});
});
test('fresh deliberate dwell is allowed to finish even just before the short timeout',()=>{
 const f=start({maxScoops:8});for(let i=0;i<4;i++)choose(f,i,i+1);
 advance(f,.44,hold(3,4));assert.equal(f.phase,'order');
 // New real contact at the same flavor, not movement fabricated by animation.
 choose(f,3,5);assert.equal(f.phase,'order');assert.equal(f.count,5);assert.equal(f.snapshot.idleSeconds,0);
});
test('changing uncompleted dwell candidates cannot pause confirmation forever without raw movement',()=>{
 const f=start();choose(f,0);advance(f,.13);
 // A new contact can begin a dwell, but camera-driven candidate oscillation
 // must exhaust its bounded grace instead of indefinitely renewing it.
 for(let i=0;i<200&&f.phase==='order';i++)f.update(.01,{...hold(i%2?1:2,2),pointerX:40});
 assert.equal(f.phase,'confirm');assert.equal(f.count,1);
});
test('a brief crossing never chooses a flavor and silence never adds a default',()=>{
 let result;const f=start({}, {onComplete:r=>result=r});advance(f,.2,hold(0));advance(f,.3,hold(2));
 assert.equal(f.count,0);advance(f,30);assert.equal(f.phase,'order');assert.equal(result,undefined);
 assert.equal(f.snapshot.idleProgress,0);assert.equal(f.snapshot.remainingSeconds,0);
 assert.ok(!('choices' in f.snapshot));assert.ok(!('targets' in f));
});
test('capacity never adds a ninth scoop and still confirms the exact chosen order',()=>{
 let result;const seen=[];const f=start({maxScoops:8},{onChoice:c=>seen.push(c),onComplete:r=>result=r});
 const flavors=[0,1,2,3,0,1,0,2];for(let i=0;i<flavors.length;i++)choose(f,flavors[i],i+1);
 assert.equal(f.snapshot.capacityReached,true);assert.equal(f.snapshot.canFinish,true);
 advance(f,.46,hold(3,9));assert.equal(f.phase,'confirm');advance(f,.55);
 assert.deepEqual(result,{count:8,flavors});assert.equal(seen.length,8);
});
test('leaving and reentering deliberately repeats the same flavor before confirmation',()=>{
 const f=start();choose(f,3);advance(f,.2);assert.equal(f.phase,'order');choose(f,3,2);
 assert.equal(f.count,2);assert.deepEqual(f.flavors,[3,3]);
});
test('short boundary jitter cannot rearm a flavor or avoid automatic confirmation',()=>{
 const f=start();choose(f,0);
 for(let i=0;i<12&&f.phase==='order';i++){
  advance(f,.04,{...hold(null),pointerX:42});advance(f,.08,hold(0));
 }
 assert.equal(f.count,1);assert.equal(f.phase,'confirm');
});
test('same held pointer can select immediately after the intro without leaving the tub',()=>{
 const f=new OrderFlow();f.start({greetingSeconds:0,maxScoops:4});assert.equal(f.phase,'order');
 advance(f,.42,hold(0,1));assert.deepEqual(f.flavors,[0]);
 advance(f,.30,hold(0,1));assert.equal(f.count,1,'continuous hold cannot silently add more scoops');
});
test('cancellation, restart and invalid time steps cannot complete or leak an old order',()=>{
 let done=0;const f=start({}, {onComplete:()=>done++});choose(f,1);advance(f,.8,hold(1));
 for(const dt of[NaN,Infinity,-1,0])f.update(dt,hold(1));assert.equal(f.phase,'order');assert.ok(Math.abs(f.snapshot.idleSeconds-.8)<1e-8);
 f.cancel();advance(f,30);assert.equal(done,0);f.start({greetingSeconds:0,maxScoops:8});advance(f,.01);assert.equal(f.count,0);assert.equal(f.snapshot.idleProgress,0);
 choose(f,2);advance(f,2,hold(2));assert.equal(done,1);advance(f,30);assert.equal(done,1);
});

test('intro motion gate accepts movement within the same tub without leaving or releasing',()=>{
 const f=new OrderFlow();f.start({greetingSeconds:0,initialPointer:{pointerX:40,pointerY:600,epoch:1}});
 advance(f,1,{...hold(2),pointerX:40,pointerY:600});assert.equal(f.count,0,'carried cone cannot choose on its own');
 advance(f,.42,{...hold(2),pointerX:52,pointerY:600});assert.deepEqual(f.flavors,[2]);
});
test('movement made during cone delivery already unlocks the first selection',()=>{
 const f=new OrderFlow();f.start({greetingSeconds:0,initialPointer:{pointerX:200,pointerY:400,epoch:1}});
 advance(f,.42,{...hold(0),pointerX:80,pointerY:600});assert.deepEqual(f.flavors,[0]);
});
