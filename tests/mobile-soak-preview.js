import * as THREE from 'three';
import {GameWorld} from '../src/world.js';
import {TrickDirector} from '../src/tricks.js';
import {SoundEngine} from '../src/audio.js';
import {RoutinePreviewDriver} from './routines-driver.js';
import {poleGripRenderTarget} from '../src/cone-grip.js';
import {PointerTipView} from '../src/touch-arm-view.js';
const $=id=>document.getElementById(id),V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),noop=()=>{};
const world=new GameWorld($('scene')),sound=new SoundEngine();sound.setMuted(true);
const save={lang:'tr',hapticsEnabled:false,data:{unlockedStage:30,preferredScoopCount:8,preferredFlavors:[0,1,2,3,4,5,0,1],tutorialCompleted:true},t:k=>k,discoverTrick:noop,recordStageResult:noop,getStageBestScore:()=>0,getUstaName:()=>'',setOrderPreferences:noop,getTrickInfo:id=>({name:id})};
const director=new TrickDirector(world,sound,save,{onRoundEnd:noop});
const driver=new RoutinePreviewDriver(director,world),tip=new PointerTipView(world);
const routines=['MEGA_TAFFY_SLICE','GIANT_BLOCK_TEASE','SHAFT_SPIN_360','MIDAIR_BLOCK_SOMERSAULT','BELL_RHYTHM_FEINT','NAPKIN_CONE_FAKEOUT','DOUBLE_CONE_SLIDE'];
const hand=V(),grip=V(),a=V(),b=V();let running=false,last=performance.now(),started=0,age=0,roundAge=0,rounds=0,nextEffect=0,nextSample=0,count=8,cpu=[],raf=[],windows=[],roundMechanics=new Set(),maxBodies=0,maxParticles=0,maxVisibleScoops=0,report=null;
const stats=values=>{if(!values.length)return null;const n=[...values].sort((a,b)=>a-b);return{mean:+(n.reduce((a,b)=>a+b,0)/n.length).toFixed(2),p95:+n[Math.floor((n.length-1)*.95)].toFixed(2),max:+n.at(-1).toFixed(2)};};
function beginRound(){
  director.setOrderConfig(count,[0,1,2,3,4,5,0,1],30);director.resetRound(30,false);
  director.routine=[routines[rounds%routines.length],'FINAL_PISTACHIO_CATCH'];
  director.scoopCount=count;world.updateIceCreamScoops(count);world.setVendorCharacter(rounds%4);
  driver.setTouchMode(true);director.startRound();roundAge=0;rounds++;
}
function sample(){
  const info=world.renderer.info;
  windows.push({second:+age.toFixed(1),rounds,cpuMs:stats(cpu),rafMs:stats(raf),geometries:info.memory.geometries,textures:info.memory.textures,calls:info.render.calls,bodies:world.rigidBodies.bodies.length,particles:world.particles.length,sceneNodes:(()=>{let n=0;world.scene.traverse(()=>n++);return n;})()});
  cpu=[];raf=[];
  console.info('MARAS_SOAK_WINDOW '+JSON.stringify(windows.at(-1)));
}
function status(done=false){
  report={state:done?'Tamamlandı':running?'Ölçülüyor':'Hazır',viewport:[innerWidth,innerHeight,devicePixelRatio],seconds:+age.toFixed(1),rounds,scoops:count,maxVisibleScoops,mechanics:[...roundMechanics],maxBodies,maxParticles,windows};
  $('status').textContent=JSON.stringify(report,null,1);
  if(done)console.info('MARAS_SOAK_DONE '+JSON.stringify({...report,windows:undefined}));
}
$('start').onclick=()=>{running=true;started=last=performance.now();age=0;rounds=0;windows=[];cpu=[];raf=[];roundMechanics.clear();maxBodies=maxParticles=maxVisibleScoops=0;nextEffect=0;nextSample=10;count=Math.max(1,Math.min(8,+$('scoops').value||8));beginRound();status();};
$('stop').onclick=()=>{running=false;sample();status(true);};
function frame(now){requestAnimationFrame(frame);const delta=(now-last)/1000,dt=Math.min(.05,Math.max(0,delta));last=now;
  if(running){const t=performance.now();age=(now-started)/1000;roundAge+=dt;
    if(roundAge>=12||director.roundEnded)beginRound();
    const s=driver.update(dt);roundMechanics.add(director.currentMechanic);
    hand.copy(s.isReaching?s.intentWorldPos:s.handWorldPos);s.handWorldPos.copy(hand);
    world.setPlayerConeGrip(director.isGraspingPaddleCone);
    const target=director.isGraspingPaddleCone&&world.conePivot.parent===world.paddleGroup?poleGripRenderTarget(world,hand,director.coneWorldPos,grip):hand;
    world.updateTouristHand(target,s.isPointerDown?.8:.14,0,dt,s.isPointerDown);
    director.update(dt,age,s);
    // Repeated real flying-scoop/burst paths exercise cleanup between rounds.
    if(age>=nextEffect){nextEffect=age+1;a.set(-.3,1.2,-.2);world.rigidBodies.spawnFlyingScoop(0xfff1dc,a,()=>b.set(.22,1.22,.25),noop);world.spawnBurst(a,0xffe194,12);}
    world.updateEnvironmentAnimations(age,dt,0,0,null,0);tip.update(s.isPointerDown,s.pointerX,s.pointerY,innerWidth,innerHeight);
    world.render();cpu.push(performance.now()-t);raf.push(delta*1000);
    maxBodies=Math.max(maxBodies,world.rigidBodies.bodies.length);maxParticles=Math.max(maxParticles,world.particles.length);
    maxVisibleScoops=Math.max(maxVisibleScoops,world.scoopMeshes.filter(mesh=>mesh.visible).length);
    if(age>=nextSample){sample();nextSample+=10;status();}
    if(age>=Math.max(30,+$('duration').value||300)){running=false;if(cpu.length)sample();status(true);}
  }else world.render();
}requestAnimationFrame(frame);
const parameters=new URLSearchParams(location.search);
if(parameters.get('autorun')==='1'){
  $('scoops').value=Math.max(1,Math.min(8,+parameters.get('scoops')||8));
  $('duration').value=Math.max(30,Math.min(900,+parameters.get('duration')||300));
  // Warm shaders first; the timed run still uses real RAF deltas and full rendering.
  setTimeout(()=>{$('start').click();console.info('MARAS_SOAK_START '+JSON.stringify({scoops:+$('scoops').value,seconds:+$('duration').value,viewport:[innerWidth,innerHeight,devicePixelRatio]}));},2500);
}
