import {MathUtils,Vector3,Quaternion} from 'three';
import {shopCameraProfile} from './shop-interior.js';

/** Close POV framing, staged by the encounter rather than by the pole motion. */
export class EncounterCamera {
 constructor(world,onSettled=()=>{}){this.world=world;this.onSettled=onSettled;this.phase='offer';this.position=new Vector3();this.rotation=new Quaternion();this.from=new Vector3();this.fromQ=new Quaternion();this.goal=new Vector3();this.goalQ=new Quaternion();this.age=1;this.width=0;this.height=0;}
 frame(phase,width,height){
  const p=shopCameraProfile(width,height),camera=this.world.camera;
  camera.fov=p.fov;camera.aspect=width/height;camera.updateProjectionMatrix();
  this.goal.fromArray(p.position);camera.updateWorldMatrix(true,false);
  // Fit both actual outside steel rims with a small screen margin.
  const halfWidth=Math.max(...this.world.tubPositions.map(t=>Math.abs(t.x)))+.125;
  const fit=halfWidth/(Math.tan(p.fov*Math.PI/360)*(width/height))+.06-.30;
  this.goal.z=phase==='offer'?Math.max(fit+.45,1.80):phase==='order'?fit+.14:fit;
  this.goal.z=Math.max(1.18,this.goal.z);
  const original=camera.position.clone(),q=camera.quaternion.clone();
  // Aim higher rather than backing away: the counter stays close, unused floor
  // leaves the bottom, and the bells sit below the compact information area.
  const gazeY=width<height?(height<650?1.50:1.42):1.36;
  camera.position.copy(this.goal);camera.lookAt(new Vector3(0,gazeY,-.45));this.goalQ.copy(camera.quaternion);
  camera.position.copy(original);camera.quaternion.copy(q);
 }
 setPhase(phase,snap=false){
  const w=this.world.canvas?.clientWidth||globalThis.innerWidth||390,h=this.world.canvas?.clientHeight||globalThis.innerHeight||844;
  this.width=w;this.height=h;this.phase=phase;this.from.copy(this.world.camera.position);this.fromQ.copy(this.world.camera.quaternion);this.frame(phase,w,h);this.age=snap?1:0;
  if(snap){this.position.copy(this.goal);this.rotation.copy(this.goalQ);this.apply();this.onSettled();}
 }
 apply(){const w=this.world;w.baseCamPos.copy(this.position);w.camera.position.copy(this.position);w.camera.quaternion.copy(this.rotation);w.camera.updateMatrixWorld(true);}
 update(dt){
  const width=this.world.canvas?.clientWidth||this.width,height=this.world.canvas?.clientHeight||this.height;
  if(width!==this.width||height!==this.height){this.setPhase(this.phase,true);return;}
  const before=this.age;this.age=Math.min(1,this.age+dt/.65);const t=MathUtils.smoothstep(this.age,0,1);
  this.position.lerpVectors(this.from,this.goal,t);this.rotation.slerpQuaternions(this.fromQ,this.goalQ,t);this.apply();
  if(before<1&&this.age===1)this.onSettled();
 }
}
