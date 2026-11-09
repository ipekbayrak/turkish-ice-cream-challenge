import test from 'node:test';
import assert from 'node:assert/strict';
import { isControlActive, canUseMouseHover, controlPointerType, clearTouchTrace } from '../src/pointer-controls.js';
import { GestureValidation } from '../src/gesture-validation.js';

test('desktop mouse movement is active without pressing, touch/pen hover is not',()=>{
 assert.equal(canUseMouseHover({pointerType:'mouse',pointerId:1}),true);
 assert.equal(canUseMouseHover({pointerType:'touch',pointerId:1}),false);
 assert.equal(canUseMouseHover({pointerType:'pen',pointerId:1}),false);
 assert.equal(isControlActive({isPointerDown:false,isMouseHover:true}),true);
});
test('menus, ended rounds and another captured pointer reject hover input',()=>{
 const e={pointerType:'mouse',pointerId:2};
 for(const config of [{active:false},{blocked:true},{capturedPointer:1}]) assert.equal(canUseMouseHover(e,config),false);
});
function state(x,y,hover=true) {return {normX:x,normY:y,isMouseHover:hover,isPointerDown:false,pointerEpoch:0,cancelEpoch:0,intentWorldPos:{x:x*.54,y:1.22+y*.36,z:.27}};}
test('hover restores deliberate horizontal and downward gestures without button presses',()=>{
 for(const [axis,judge] of [['x','slice'],['y','pull']]) {
  const v=new GestureValidation();
  for(let i=0;i<12;i++){v.update(state(axis==='x'?i*.025:0,axis==='y'?-i*.025:0),1/60,axis);v[judge](axis);}
  assert.equal(v[judge](axis),true);
 }
});
test('restored hover cannot turn a stationary center or tiny jitter into beat matching',()=>{
 const v=new GestureValidation();let awarded=false;
 for(let i=0;i<300;i++){v.update(state(Math.sin(i)*.008,0),1/60,'beat');awarded ||=v.follow('beat',{x:.27,y:1.22,z:.27},1/60);}
 assert.equal(awarded,false);
});
test('leaving the game invalidates hover gesture history and held actions',()=>{
 const v=new GestureValidation();v.update(state(0,0),.02,'cut');v.update(state(.3,0),.1,'cut');assert.equal(v.slice('cut'),true);
 v.update({...state(.3,0,false),cancelEpoch:1},.02,'cut');assert.equal(v.slice('cut'),false);assert.equal(v.interrupted,true);
});


test('live preview mouse presses, moves and releases use touch without enabling hover',()=>{
 for(const type of ['pointerdown','pointermove','pointerup']) {
  const event={type,pointerType:'mouse',pointerId:1};
  assert.equal(controlPointerType(event), 'mouse');
  assert.equal(controlPointerType(event,true), 'touch');
  assert.equal(canUseMouseHover(event,{touchPreview:true}), false);
  assert.equal(canUseMouseHover(event), true);
 }
 for(const pointerType of ['touch','pen'])assert.equal(controlPointerType({pointerType},true),pointerType);
});

test('touch release clears only the drawn trace, preserving intent and mouse feedback',()=>{
 const intent={x:.1,y:1.2,z:.26};
 const state={pointerType:'touch',trailPoints:[{x:190,y:600,life:1}],intentWorldPos:intent,normX:.1,normY:-.2,pointerEpoch:3};
 assert.equal(clearTouchTrace(state),true);assert.deepEqual(state.trailPoints,[]);
 assert.equal(state.intentWorldPos,intent);assert.equal(state.normY,-.2);assert.equal(state.pointerEpoch,3);
 state.pointerType='mouse';state.trailPoints.push({x:190,y:600,life:1});
 assert.equal(clearTouchTrace(state),false);assert.equal(state.trailPoints.length,1);
});
