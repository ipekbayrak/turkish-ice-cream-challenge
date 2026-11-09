import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {OrderReach} from '../src/order-reach.js';

test('each selected scoop offers the same hand toward the vendor then restores raw aim',()=>{
 const pose=new OrderReach(),raw=new Vector3(-.35,1.15,.26),original=raw.clone(),rendered=new Vector3();
 for(let scoop=0;scoop<8;scoop++){
  pose.acknowledge();let farthest=0;
  for(let frame=0;frame<27;frame++){
   pose.apply(raw,1/60,true,rendered);
   farthest=Math.max(farthest,raw.z-rendered.z);
   assert.ok(raw.equals(original),'animation never writes raw target');
   assert.ok(rendered.y>=raw.y,'reach never moves the hand below its pointer');
  }
  assert.ok(farthest>.17);assert.ok(rendered.distanceTo(raw)<1e-9);
 }
});
test('another acknowledgement during motion starts from the current pose',()=>{
 const pose=new OrderReach(),raw=new Vector3(.2,1.1,.26),out=new Vector3();
 pose.acknowledge();pose.apply(raw,.08,true,out);const before=out.clone();
 pose.acknowledge();pose.apply(raw,0,true,out);assert.ok(out.distanceTo(before)<1e-9);
});
test('confirmation and cancellation cannot leak an order pose into gameplay',()=>{
 const pose=new OrderReach(),raw=new Vector3(.2,1.2,.26),out=new Vector3();
 pose.acknowledge();pose.apply(raw,.17,true,out);assert.ok(out.distanceTo(raw)>.1);
 pose.apply(raw,.016,false,out);assert.ok(out.equals(raw));
 pose.apply(raw,.016,true,out);assert.ok(out.equals(raw));
});
