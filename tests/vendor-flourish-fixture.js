import * as THREE from 'three';
import {GameWorld} from '../src/world.js';
import {TrickDirector} from '../src/tricks.js';
import {SpringVec3} from '../src/physics.js';
import {StallEffects} from '../src/stall-effects.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),noop=()=>{};
/** Actual scene rigs and animation loop, omitting only the WebGL renderer and
 * unrelated static scenery. This follows the browser preview's full reset. */
export function makeVendorFlourishFixture(vendor=1,count=2){
 const w=Object.create(GameWorld.prototype);w.scene=new THREE.Scene();w.waffleTexture=w.outerWaffleTexture=new THREE.Texture();
 w.camera=new THREE.PerspectiveCamera(54,390/844,.05,40);w.baseCamPos=V(0,1.52,1.05);w.camera.position.copy(w.baseCamPos);
 w.handSpring=new SpringVec3(.22,1.08,.62,135,18);w.coneSpring=new SpringVec3(0,1.24,.22,72,15);
 w.scoopJiggleSpring=new SpringVec3(0,0,0,220,14);w.leftPropSpring=new SpringVec3(.24,1.22,-.25,88,16);w.prevConePos=V(0,1.24,.22);
 w.blinkTimer=2.5;w.isBlinking=false;w.vendorMood='smile';w.spectatorReactionTimer=0;w.spectatorReactionType='idle';
 w.spectators=[];w.frostMotes=[];w.lanterns=[];w.bells=[];w.particles=[];w.tubIceGroups=[];
 w.tubPositions=Array.from({length:6},(_,i)=>({x:-.6+i*.24,worldPos:V(-.6+i*.24,.98,-.3)}));
 w.basinDeckGroup=new THREE.Group();w.basinDeckGroup.position.set(0,.94,-.34);w.basinDeckGroup.rotation.x=.22;w.scene.add(w.basinDeckGroup);
 w._buildPaddleAndCones();w._buildVendor();w._buildTouristPOVHand();w.sliceCueGroup=new THREE.Group();
 w.rigidBodies={bodies:[],update:noop};w.stretchyStrand={detach:noop,setHandPressure:noop};w.stallEffects=new StallEffects(w);
 const sound=new Proxy({},{get:()=>noop});
 const save={lang:'tr',data:{unlockedStage:30,preferredScoopCount:2,preferredFlavors:[0,2,1,3,4,5,0,2]},hapticsEnabled:false,t:k=>k,discoverTrick:noop,setOrderPreferences:noop,recordStageResult:noop,getStageBestScore:()=>0,getUstaName:()=>'',getTrickInfo:id=>({name:id})};
 const d=new TrickDirector(w,sound,save,{onRoundEnd:noop});
 d.setOrderConfig(count,[0,2,1,3,4,5,0,2],30);d.resetRound(30,false);d.routine=['SHAFT_SPIN_360','FINAL_PISTACHIO_CATCH'];d._enterRoutineStep(0);
 d.scoopCount=d.targetScoopCount;w.updateIceCreamScoops(d.scoopCount);w.setVendorCharacter(vendor);
 w.resetPaddleOrientation();w.paddleGroup.position.copy(d.coneWorldPos);w.paddleGroup.quaternion.identity();
 w.prevConePos.copy(d.coneWorldPos);w.scoopJiggleSpring.pos.set(0,0,0);w.scoopJiggleSpring.vel.set(0,0,0);w.scoopJiggleSpring.target.set(0,0,0);
 w.updateServingLayout(1);w.vendorTorso.position.set(0,.94,0);w.vendorTorso.rotation.set(0,0,0);
 d.active=true;d.isAfkShowActive=true;d.afkScenario=4;d.afkTimer=0;d.idleSeconds=3;d.passiveLimitSec=99;
 for(let i=0;i<45;i++)w.orientPaddleAndHands(0,null,1/60,0,0);
 const input={isPointerDown:false,isReaching:false,isMoving:false,normX:0,normY:-1,vx:0,vy:0,speed:0,handWorldPos:V(.22,1.04,.64),intentWorldPos:V(.22,1.04,.64),pointerEpoch:0,cancelEpoch:0};
 let time=0;
 return{w,d,input,get time(){return time;},step(dt=1/120,interrupted=false){time+=dt;
  if(interrupted){input.isMoving=input.isPointerDown=true;d.update(dt,time,input);}
  else{d.presentationExact=false;d.presentationStrikeTip=null;d.presentationSurface=null;d.presentationBell=null;d._updateAfkShow(dt,time);d._applyKinematics(dt,time,input);}
  w.updateEnvironmentAnimations(time,dt);
 }};
}
