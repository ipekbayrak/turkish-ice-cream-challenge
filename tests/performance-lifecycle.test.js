import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Scene,Vector3} from 'three';
import {resizeRenderer,resizeOverlay} from '../src/render-size.js';
import {GameWorld} from '../src/world.js';
import {shopCameraProfile} from '../src/shop-interior.js';

test('first viewport fit sets the camera even if the constructor already allocated the buffer',()=>{
  const previous=globalThis.window;
  try{
    globalThis.window={innerWidth:390,innerHeight:844,devicePixelRatio:2};
    let resizes=0;const w=Object.create(GameWorld.prototype);
    w.renderer={domElement:{style:{}},setDrawingBufferSize(){resizes++;}};
    w.camera=new PerspectiveCamera(55,390/844,.05,40);w.baseCamPos=new Vector3();w.baseCamTarget=new Vector3();
    w._renderSize=resizeRenderer(w.renderer,390,844,2);
    w.onResize();assert.equal(resizes,1);
    assert.equal(w.camera.fov,shopCameraProfile(390,844).fov);
    assert.deepEqual(w.camera.position.toArray(),shopCameraProfile(390,844).position);
    const projection=w.camera.projectionMatrix.clone();w.camera.position.x=.005;
    w.onResize();assert.equal(resizes,1);assert.equal(w.camera.position.x,.005);assert.deepEqual(w.camera.projectionMatrix,projection);
    window.innerWidth=844;window.innerHeight=390;w.onResize();
    assert.equal(resizes,2);assert.equal(w.camera.aspect,844/390);assert.equal(w.camera.fov,shopCameraProfile(844,390).fov);
  }finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});

test('duplicate viewport events preserve backing buffers; real size/DPR changes apply once',()=>{
  const calls=[],renderer={domElement:{style:{}},setDrawingBufferSize(...args){calls.push(args);}};
  let size=resizeRenderer(renderer,390,844,2),same=size;
  for(let i=0;i<20;i++)size=resizeRenderer(renderer,390,844,2,size);
  assert.equal(size,same);assert.deepEqual(calls,[[390,844,2]]);
  size=resizeRenderer(renderer,844,390,2,size);
  size=resizeRenderer(renderer,844,390,1.5,size);
  assert.deepEqual(calls,[[390,844,2],[844,390,2],[844,390,1.5]]);
  assert.deepEqual(renderer.domElement.style,{width:'844px',height:'390px'});
  let clears=0,transforms=0;const canvas={set width(v){this.w=v;clears++;},set height(v){this.h=v;clears++;}};
  const context={setTransform(...args){transforms++;assert.equal(args[0],args[3]);}};
  let overlay=resizeOverlay(canvas,context,390,844,2);
  for(let i=0;i<20;i++)overlay=resizeOverlay(canvas,context,390,844,2,overlay);
  assert.equal(clears,2);assert.equal(transforms,1);assert.deepEqual([canvas.w,canvas.h],[780,1688]);
  resizeOverlay(canvas,context,844,390,1.5,overlay);
  assert.equal(clears,4);assert.equal(transforms,2);assert.deepEqual([canvas.w,canvas.h],[1266,585]);
});

test('expired bursts release their shared GPU resources exactly once, retaining live motes',()=>{
  const w=Object.create(GameWorld.prototype);w.scene=new Scene();w.particles=[];
  let geometryDisposed=0,materialDisposed=0;
  for(let round=0;round<100;round++){
    w.spawnBurst(new Vector3(0,1,0),0xffe194,12);
    const resource=w.particles[0].resources;
    resource.geometry.addEventListener('dispose',()=>geometryDisposed++);
    resource.material.addEventListener('dispose',()=>materialDisposed++);
    w.particles[0].life=.3;
    w.updateBurstParticles(.4);
    assert.equal(w.particles.length,11);assert.equal(geometryDisposed,round);
    w.updateBurstParticles(.4);
    assert.equal(w.particles.length,0);assert.equal(w.scene.children.length,0);
    assert.equal(geometryDisposed,round+1);assert.equal(materialDisposed,round+1);
  }
});

test('round reset releases live bursts once and never releases them again',()=>{
  const w=Object.create(GameWorld.prototype);w.scene=new Scene();w.particles=[];
  w.spawnBurst(new Vector3(),0xffffff,10);
  let disposed=0;w.particles[0].resources.geometry.addEventListener('dispose',()=>disposed++);
  w.resetTransientPresentation();w.updateBurstParticles(1);w.resetTransientPresentation();
  assert.equal(disposed,1);assert.equal(w.scene.children.length,0);
});
