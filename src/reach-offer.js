import {Vector3,MathUtils} from 'three';

/** Fit the whole axial catch sweep before animating it. Scaling the authored
 * path (rather than clipping every frame) preserves its continuous rhythm.
 * This changes the real target shared by spring, steel and gesture judging. */
export function axialReachX(world,x,subStep=0){
 const camera=world.camera;
 if(!camera?.isPerspectiveCamera)return x;
 const p=world._reachProjection ||= new Vector3();
 camera.updateWorldMatrix(true,false);
 const center=p.set(0,1.24,.25).project(camera).x;
 const slope=p.set(1,1.24,.25).project(camera).x-center;
 if(!Number.isFinite(slope)||slope<=0)return x;
 let count=0;for(const mesh of world.scoopMeshes||[])if(mesh.visible)count++;
 // Reserve the wafer, axial wrist tilt, scoop cluster and a small edge gap.
 const radius=(.13+(count>4?.05:count>2?.02:0))*(world.servingScale||1);
 const left=(-.94-center)/slope+radius,right=(.94-center)/slope-radius;
 const min=subStep===0?-.22:-.40,max=subStep===0?.22:-.12;
 const scale=MathUtils.clamp(Math.min(1,left/min,max>0?right/max:1),0,1);
 return x*scale;
}
