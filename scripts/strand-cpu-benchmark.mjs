import {performance} from 'node:perf_hooks';
import {CatmullRomCurve3,TubeGeometry,Vector3} from 'three';
import {createDeformingTube,updateDeformingTube} from '../src/deforming-tube.js';

// CPU-only comparison of the former per-frame rebuild and retained buffers.
// Uses identical samples, radii and vertices; this is not a phone FPS test.
const frames=Number(process.env.BENCH_FRAMES)||1800;
function run(reuse){
  const paths=Array.from({length:3},()=>new CatmullRomCurve3(Array.from({length:14},(_,i)=>new Vector3(i*.05,1+i*.02,.2))));
  const geometries=paths.map((path,i)=>createDeformingTube(path,i?16:24,.038,i?6:10));
  let replacements=0;const start=performance.now();
  for(let frame=0;frame<frames;frame++)for(let i=0;i<3;i++){
    const path=paths[i];path.points.forEach((p,j)=>p.set(j*.05,1+Math.sin(j*.4+frame*.04)*.15,.2+Math.cos(j*.3+frame*.03)*.06));
    const radius=(i?.52:1)*(.025+Math.sin(frame*.03)*.005);
    if(reuse)updateDeformingTube(geometries[i],path,radius);
    else{geometries[i].dispose();geometries[i]=new TubeGeometry(new CatmullRomCurve3(path.points),i?16:24,radius,i?6:10,false);geometries[i].computeBoundingSphere();replacements++;}
  }
  const meanMs=(performance.now()-start)/frames;geometries.forEach(g=>g.dispose());return{meanMs,replacements};
}
run(false);run(true);
const before=[],after=[];
for(let repeat=0;repeat<3;repeat++)for(const reuse of(repeat%2?[true,false]:[false,true]))(reuse?after:before).push(run(reuse));
const median=values=>values.map(x=>x.meanMs).sort((a,b)=>a-b)[1];
console.log(JSON.stringify({node:process.version,frames,cpuOnly:true,threeStrands:true,before,after,speedup:median(before)/median(after)},null,2));
