import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { StretchCutGesture, stretchCutGuide } from '../src/stretch-cut.js';
import { StretchyDondurmaStrand, SpringVec3 } from '../src/physics.js';
import { StallEffects } from '../src/stall-effects.js';
import { StretchCutView } from '../src/stretch-cut-view.js';
import { GameWorld } from '../src/world.js';
import { ICE_CREAM_FLAVORS } from '../src/protocol.js';
import { TouchReach } from '../src/touch-reach.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function fixture(angle=0){
 const axis=V(Math.sin(angle),Math.cos(angle),0),nodes=Array.from({length:14},(_,i)=>axis.clone().multiplyScalar((i/13-.5)*1.2));
 const world={stretchyStrand:{nodes},canvas:{clientWidth:400,clientHeight:600},projectToScreen:p=>({x:200+p.x*160,y:300-p.y*160})};
 const guide=stretchCutGuide(world),gesture=new StretchCutGesture();
 const input={isPointerDown:true,isMouseHover:false,normX:0,normY:0,pointerEpoch:1,cancelEpoch:0};
 const step=(point,raw=point,dt=1/60)=>{input.normX=raw.x/400*2-1;input.normY=1-raw.y/600*2;input.aimNormX=point.x/400*2-1;input.aimNormY=1-point.y/600*2;return gesture.update(input,dt,guide);};
 return {world,guide,gesture,input,step};
}
function point(g,normalDistance,tangentDistance=0){return {x:g.center.x+g.normal.x*normalDistance+g.tangent.x*tangentDistance,y:g.center.y+g.normal.y*normalDistance+g.tangent.y*tangentDistance};}
function swipe(f,normal=true){let result;for(let i=0;i<18;i++){const d=-65+i*130/17;result=f.step(normal?point(f.guide,d):point(f.guide,0,d));if(result.cut)return result;}for(let i=0;i<12;i++){result=f.step(normal?point(f.guide,65):point(f.guide,0,65));if(result.cut)return result;}return result;}

test('cut direction follows horizontal, vertical and diagonal actual strand axes',()=>{
 for(const angle of [0,.4,Math.PI/2,2.4]){
  const f=fixture(angle);assert.ok(Math.abs(f.guide.normal.x*f.guide.tangent.x+f.guide.normal.y*f.guide.tangent.y)<1e-10);
  const result=swipe(f);assert.equal(result.cut,true,`perpendicular ${angle}`);assert.ok(result.point instanceof THREE.Vector3);
  assert.equal(f.gesture.update(f.input,1/60,f.guide).cut,false,'one award per physical cut');
  const parallel=fixture(angle);assert.notEqual(swipe(parallel,false).cut,true,'parallel drag can push but cannot cut');
 }
});
test('ice loads elastically before severing; stationary contact and tiny jitter only press it',()=>{
 const f=fixture();let pending=false,cutFrame=-1,pendingFrame=-1;
 for(let i=0;i<30;i++){const r=f.step(point(f.guide,Math.min(65,-65+i*14)));if(f.gesture.pending&&!pending){pending=true;pendingFrame=i;assert.equal(r.cut,false);assert.equal(r.pressure,1);}if(r.cut){cutFrame=i;break;}}
 assert.ok(cutFrame-pendingFrame>=5,'several visible deformation frames precede rupture');
 for(const jitter of [0,3]){const s=fixture();let cut=false;for(let i=0;i<300;i++)cut||=s.step(point(s.guide,Math.sin(i)*jitter)).cut;assert.equal(cut,false);assert.ok(s.gesture.pressure>.9);}
});
test('misses, canceled strokes and visual-only aim movement cannot cut',()=>{
 const miss=fixture();let cut=false;for(let i=0;i<25;i++)cut||=miss.step(point(miss.guide,-70+i*6,250)).cut;assert.equal(cut,false);
 const visual=fixture();for(let i=0;i<25;i++)assert.notEqual(visual.step(point(visual.guide,-70+i*6),point(visual.guide,-70)).cut,true);
 const canceled=fixture();for(let i=0;i<5;i++)canceled.step(point(canceled.guide,-65));canceled.input.cancelEpoch++;for(let i=0;i<20;i++)assert.notEqual(canceled.step(point(canceled.guide,65)).cut,true);
});
test('hand pressure bows and thins the same anchored strand, stays bounded, then releases',()=>{
 const strand=new StretchyDondurmaStrand(new THREE.Scene(),14),a=V(-.2,1.02,.1),b=V(.2,1.5,.1);
 strand.attach(a,b,0xffffff,true);for(let i=0;i<30;i++)strand.update(1/60,a,b,.8);
 const rest=strand.nodes.map(p=>p.clone()),radius=strand.mesh.geometry.parameters.radius;
 strand.setHandPressure({t:.5,offset:V(.08,0,.08)});
 for(let i=0;i<180;i++)strand.update(1/60,a,b,.8);
 assert.ok(strand.nodes[7].distanceTo(rest[7])>.05);assert.ok(strand.nodes[7].distanceTo(rest[7])<.18);
 assert.ok(strand.mesh.geometry.parameters.radius<radius*.9);assert.ok(strand.nodes[0].equals(a));assert.ok(strand.nodes.at(-1).equals(b));
 strand.setHandPressure(null);for(let i=0;i<90;i++)strand.update(1/60,a,b,.8);assert.ok(strand.pressureOffset.length()<1e-8);
 strand.detach();assert.equal(strand.active,false);assert.equal(strand.mesh.visible,false);assert.ok(strand.appliedPressure.every(v=>v.lengthSq()===0));
});
test('severed curved ice retains two real paths, opens a gap and follows the actual cut direction',()=>{
 const scene=new THREE.Scene(),conePivot=new THREE.Group(),heldSocket=new THREE.Group(),scoopStackGroup=new THREE.Group();scene.add(conePivot,heldSocket);conePivot.add(scoopStackGroup);
 const nodes=[V(-.25,1.1,.15),V(-.12,1.2,.22),V(0,1.3,.28),V(.12,1.4,.2),V(.25,1.5,.15)];
 const w={scene,conePivot,heldSocket,scoopStackGroup,stretchyStrand:{active:true,nodes}};
 const fx=new StallEffects(w);fx.triggerSlice(nodes[2],0xfff0dd,V(0,1,0));
 assert.ok(fx.cutPaths[0].some(v=>v.distanceTo(nodes[1])<1e-10));assert.ok(fx.cutPaths[1].some(v=>v.distanceTo(nodes[3])<1e-10));
 fx.update(.12);assert.ok(fx.cutTips[0].position.distanceTo(fx.cutTips[1].position)>.04);
 assert.ok(Math.abs(fx.scraps[0].position.x-fx.cut.x)<1e-10);assert.ok(fx.scraps[0].position.y>fx.cut.y);
 fx.clearSlice();assert.equal(fx.sliceGroup.visible,false);
});
test('cutting pose turns the palm edge and straightens fingers without moving grip roots',()=>{
 const w=Object.create(GameWorld.prototype);w.scene=new THREE.Scene();w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();w.conePivot=new THREE.Group();w.handSpring=new SpringVec3(.22,1.08,.62,135,18);w._buildTouristPOVHand();
 const target=V(0,1.22,.26);w.updateTouristHand(target,.8,0,1/60,true);const wrist=w.touristWrist.position.clone();
 const view=new StretchCutView(w);view.set({contact:true,cut:true,point:V(0,1.2,.15),direction:V(.8,.6,0)});
 for(let i=0;i<8;i++){w.updateTouristHand(target,.8,0,1/60,true);const root=w.touristHand.position.clone();view.update(1/60);assert.ok(w.touristHand.position.equals(root));assert.ok(w.handSpring.target.equals(target));}
 assert.ok(w.palmGroup.rotation.y>.8);assert.ok(w.fingers[0].middle.rotation.x>-.3);assert.ok(w.touristWrist.position.equals(wrist));assert.equal(view.trail.visible,true);
 view.reset();assert.equal(view.trail.visible,false);
});

test('all six real tub positions have reachable perpendicular touch strokes on narrow phones',()=>{
 for(const [width,height] of [[320,640],[390,844]])for(const flavor of ICE_CREAM_FLAVORS){
  const w=Object.create(GameWorld.prototype);w.scene=new THREE.Scene();w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();w.conePivot=new THREE.Group();w.handSpring=new SpringVec3(.22,1.08,.62,135,18);w._buildTouristPOVHand();
  w.canvas={clientWidth:width,clientHeight:height};w.camera=new THREE.PerspectiveCamera(55,width/height,.05,40);
  w.camera.position.set(0,1.52,1.05);w.camera.lookAt(0,1.28,-.55);
  w.camera.fov=Math.max(64,Math.min(72,62+(.65-width/height)*28));w.camera.position.set(0,1.5,1.12);w.camera.updateProjectionMatrix();w.camera.updateMatrixWorld(true);
  w.projectToScreen=p=>{const v=p.clone().project(w.camera);return{x:(v.x+1)*width*.5,y:(1-v.y)*height*.5};};
  const rope=w.stretchyStrand=new StretchyDondurmaStrand(w.scene,14),a=V(flavor.xOffset,.97,-.33),spring=new SpringVec3(0,1.24,.22,72,15);
  rope.attach(a,spring.pos,flavor.colorHex,true);
  for(let i=1;i<=45;i++){const t=i/60;rope.update(1/60,a,spring.pos,.8);spring.target.set(.18+Math.sin(t*2.4)*.035,1.39+Math.cos(t*3)*.025,.14);spring.step(1/60);}
  const guide=stretchCutGuide(w),reach=new TouchReach(w),cut=new StretchCutGesture();reach.begin(w.camera,width,height);
  for(const p of [guide.from,guide.to]){assert.ok(p.x>=13.9&&p.x<=width-13.9,`${width}/${flavor.id}: offscreen x${p.x}`);assert.ok(p.y>=64.9&&p.y<=height-69.9);}
  if(flavor.index>=4)assert.ok(guide.normal.x<0,'outer-right tub guide must point into available screen space');
  let cutSeen=false;
  for(let i=0;i<70;i++){
   const progress=Math.max(0,Math.min(1,(i/60-.18)/.18));
   const screen={x:guide.center.x+guide.normal.x*guide.span*progress,y:guide.center.y+guide.normal.y*guide.span*progress};
   const ray=V(screen.x/width*2-1,1-screen.y/height*2,.5).unproject(reach.camera).sub(reach.camera.position).normalize();
   const desired=reach.camera.position.clone().addScaledVector(ray,(.26-reach.camera.position.z)/ray.z);
   const projected=desired.clone().project(reach.camera);
   const fingerX=Math.max(6,Math.min(width-6,(projected.x+1)*width*.5)),fingerY=Math.max(6,Math.min(height-6,reach.contactAt(desired).y));
   reach.update(fingerX,fingerY);
   const input={isPointerDown:true,pointerEpoch:1,cancelEpoch:0,normX:fingerX/width*2-1,normY:1-fingerY/height*2,aimNormX:reach.aimX,aimNormY:reach.aimY,intentWorldPos:reach.target};
   const result=cut.update(input,1/60,stretchCutGuide(w));
   rope.setHandPressure(result.push?{t:result.parameter,offset:result.push}:null);rope.update(1/60,a,spring.pos,.8);
   if(result.cut){cutSeen=true;break;}
  }
  assert.equal(cutSeen,true,`${width}px ${flavor.id}: raised/clamped phone stroke could not cut`);
 }
});

// Same path, different speed: slow aiming/pressing is never a cut.
test('a deliberate fast cross cuts at 15/30/60/120Hz; a slow cross does not',()=>{
 for(const fps of [15,30,60,120])for(const duration of [.20,1.2]){
  const f=fixture(.4);let cut=false;
  for(let i=0;i<=Math.ceil(duration*fps);i++){const progress=Math.min(1,i/(duration*fps));cut||=f.step(point(f.guide,-65+130*progress),undefined,1/fps).cut;}
  for(let i=0;i<fps/2;i++)cut||=f.step(point(f.guide,65),undefined,1/fps).cut;
  assert.equal(cut,duration<1,`${fps}Hz / ${duration}s`);
 }
});
test('a quick approach that stops on the ice only presses; a subsequent flick out cuts',()=>{
 const f=fixture();let cut=false;
 for(let i=0;i<=6;i++)cut||=f.step(point(f.guide,-65+65*i/6)).cut;
 for(let i=0;i<90;i++)cut||=f.step(point(f.guide,0)).cut;
 assert.equal(cut,false);assert.equal(f.gesture.pending,null);
 for(let i=1;i<=8;i++)cut||=f.step(point(f.guide,60*i/8)).cut;
 for(let i=0;i<10;i++)cut||=f.step(point(f.guide,60)).cut;
 assert.equal(cut,true);
});
test('a strand drifting into old travel cannot cut under a stationary hand',()=>{
 const f=fixture();let cut=false;
 for(let i=0;i<=8;i++)cut||=f.step(point(f.guide,-120+60*i/8)).cut;
 const held=point(f.guide,-60);
 for(let i=0;i<80;i++){for(const p of f.guide.points)p.x-=.9;cut||=f.step(held).cut;}
 assert.equal(cut,false);
});
test('real frame timestamps prevent capped physics time from turning slow movement into a fast swipe',()=>{
 const f=fixture();let cut=false;
 for(let i=0;i<=20;i++){f.input.frameTime=100+i*.10;cut||=f.step(point(f.guide,-65+i*6.5),undefined,1/120).cut;}
 assert.equal(cut,false);
});

test('small jitter after an old fast approach cannot borrow that speed as the strand drifts closer',()=>{
 const f=fixture();let cut=false;
 for(let i=0;i<=8;i++)cut||=f.step(point(f.guide,-120+60*i/8)).cut;
 const held=point(f.guide,-60);
 for(let i=0;i<90;i++){for(const p of f.guide.points)p.x-=1.5;cut||=f.step({x:held.x+Math.sin(i)*2,y:held.y}).cut;}
 assert.equal(cut,false);
});
