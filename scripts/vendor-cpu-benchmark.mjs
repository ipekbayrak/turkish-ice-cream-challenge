import {performance} from 'node:perf_hooks';
import {makeVendorFlourishFixture} from '../tests/vendor-flourish-fixture.js';
import {VendorArmSolver} from '../src/vendor-arm-solver.js';
import {GameWorld} from '../src/world.js';
import {HandRig} from '../src/hand-rig.js';
import {VendorSupportReach} from '../src/vendor-support-reach.js';
import {VendorArmSolver as ReferenceSolver} from '../tests/fixtures/vendor-arm-solver-reference.js';

// CPU only: real rigs, director, kinematics and environment, without WebGL or
// static shop meshes. Timed and instrumented passes are separate so per-call
// profiling overhead does not inflate reported frame time.
const frames=Number(process.env.BENCH_FRAMES)||480;
const repeats=Number(process.env.BENCH_REPEATS)||3;
const sorted=a=>a.slice().sort((x,y)=>x-y);
const quantile=(a,q)=>sorted(a)[Math.min(a.length-1,Math.floor(a.length*q))];
function fixture(kind,Solver=VendorArmSolver){
 const f=makeVendorFlourishFixture(kind==='flourish'?3:1,kind==='large-serving'?8:2);
 f.w._vendorArmSolver=new Solver(f.w.vendorTorso);
 // The frozen arithmetic oracle predates display-pose continuity.
 if(!f.w._vendorArmSolver.solveContinuous)f.w._vendorArmSolver.solveContinuous=function(shoulder,target,options){return this.solve(shoulder,target,options);};
 if(kind==='offer'){let time=0;f.w.prepareEmptyConeOffer();return()=>{time+=1/120;f.w.updateEmptyConeOffer(time,1/120);f.w.updateEnvironmentAnimations(time,1/120);};}
 return()=>f.step(1/120,f.time>=2.25);
}
function instrument(){
 const rows=new Map(),restore=[],stack=[];
 for(const [prototype,prefix,names]of[
  [VendorArmSolver.prototype,'solver',['prepare','solve','penetration','_localPenetration','pointBlocked','shaftGrip']],
  [GameWorld.prototype,'world',['orientPaddleAndHands','_safeShaftGrip','_resolveVendorGrips','_fitArmToHand','refreshPaddleAttachment']],
  [HandRig.prototype,'hand',['setPose']],
  [VendorSupportReach.prototype,'support',['update','apply']],
 ])for(const name of names){
  const original=prototype[name],key=`${prefix}.${name}`,row={calls:0,selfMs:0,totalMs:0};rows.set(key,row);
  if(!original)continue;
  prototype[name]=function(...args){const frame={start:performance.now(),children:0};stack.push(frame);row.calls++;
   try{return original.apply(this,args);}finally{const elapsed=performance.now()-frame.start;stack.pop();row.totalMs+=elapsed;row.selfMs+=elapsed-frame.children;if(stack.length)stack.at(-1).children+=elapsed;}};
  restore.push(()=>prototype[name]=original);
 }
 return {rows,restore:()=>restore.forEach(fn=>fn())};
}
let seed=0x1a2b3c4d;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
if(process.argv.includes('--compare')){
 const results=[];
 for(const kind of['offer','flourish','large-serving']){
  for(const Solver of[VendorArmSolver,ReferenceSolver]){const step=fixture(kind,Solver);for(let i=0;i<frames;i++)step();}
  const runs={current:[],reference:[]};
  for(let run=0;run<repeats;run++)for(const [name,Solver]of(run%2?[['reference',ReferenceSolver],['current',VendorArmSolver]]:[['current',VendorArmSolver],['reference',ReferenceSolver]])){
   const step=fixture(kind,Solver),times=[];const started=performance.now();
   for(let i=0;i<frames;i++){const t=performance.now();step();times.push(performance.now()-t);}
   runs[name].push({meanMs:(performance.now()-started)/frames,p95Ms:quantile(times,.95)});
  }
  const currentMs=quantile(runs.current.map(r=>r.meanMs),.5),referenceMs=quantile(runs.reference.map(r=>r.meanMs),.5);
  results.push({kind,frames,repeats,currentMs,referenceMs,speedup:referenceMs/currentMs,runs});
 }
 console.log(JSON.stringify({node:process.version,cpuOnly:true,comparison:true,results},null,2));
 process.exit(0);
}
// Warm the exact paths once before collecting measurements.
for(const kind of['offer','flourish','large-serving']){const step=fixture(kind);for(let i=0;i<frames;i++)step();}
const results=[];
for(const kind of['offer','flourish','large-serving']){
 const runs=[];
 for(let run=0;run<repeats;run++){
  const step=fixture(kind),times=[];const start=performance.now();
  for(let i=0;i<frames;i++){const t=performance.now();step();times.push(performance.now()-t);}
  runs.push({meanMs:(performance.now()-start)/frames,p50Ms:quantile(times,.5),p95Ms:quantile(times,.95),maxMs:Math.max(...times)});
 }
 const step=fixture(kind),profile=instrument();for(let i=0;i<frames;i++)step();profile.restore();
 const cost=[...profile.rows].map(([name,value])=>({name,callsPerFrame:value.calls/frames,selfMsPerFrame:value.selfMs/frames,totalMsPerFrame:value.totalMs/frames})).sort((a,b)=>b.selfMsPerFrame-a.selfMsPerFrame);
 results.push({kind,frames,repeats,meanMs:quantile(runs.map(r=>r.meanMs),.5),runs,profile:cost});
}
console.log(JSON.stringify({node:process.version,cpuOnly:true,results},null,2));
