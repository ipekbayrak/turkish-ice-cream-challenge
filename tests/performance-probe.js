// Development-only instrumentation of the actual game, enabled with ?perf=1.
// Reports CPU submission time separately from RAF cadence; it does not infer GPU time.
export function attachPerformanceProbe({world,director}) {
  const panel=document.createElement('aside');
  panel.style.cssText='position:fixed;z-index:99999;bottom:8px;left:8px;max-width:calc(100% - 32px);padding:10px;background:#18140fee;color:#fff;font:11px monospace;border:1px solid #bda46e;border-radius:8px';
  const button=document.createElement('button');button.textContent='6 saniye ölç';
  const output=document.createElement('pre');output.setAttribute('role','status');output.style.cssText='margin:8px 0 0;white-space:pre-wrap';
  output.textContent='Gerçek oyun · ölçüm hazır';panel.append(button,output);document.body.append(panel);
  let active=false,start=0,last=0,frameStart=0,frames=[],metrics={},current={};
  const names=['orientPaddleAndHands','updateEnvironmentAnimations','updateTouristHand','render','_resolveVendorGrips','_safeShaftGrip','_solveArmIK','_fitArmToHand','updateServingLayout'];
  for(const name of names){const original=world[name];if(!original)continue;
    world[name]=function(...args){if(!active)return original.apply(this,args);const t=performance.now();try{return original.apply(this,args);}finally{current[name]=(current[name]||0)+performance.now()-t;}};
  }
  const originalUpdate=director.update;
  director.update=function(...args){if(!active)return originalUpdate.apply(this,args);const t=performance.now();try{return originalUpdate.apply(this,args);}finally{current.director=(current.director||0)+performance.now()-t;}};
  button.onclick=()=>{active=true;start=performance.now();last=0;frames=[];metrics={};output.textContent='Ölçülüyor…';};
  const stats=values=>{const a=[...values].sort((a,b)=>a-b);return{mean:+(a.reduce((s,n)=>s+n,0)/a.length).toFixed(2),p95:+a[Math.floor((a.length-1)*.95)].toFixed(2),max:+a.at(-1).toFixed(2)};};
  return {
    beginFrame(now){if(!active)return;frameStart=performance.now();current={};if(last)frames.push(now-last);last=now;},
    endFrame(){if(!active)return;current.cpu=performance.now()-frameStart;
      for(const [key,value]of Object.entries(current))(metrics[key]||=[]).push(value);
      if(performance.now()-start<6000)return;
      active=false;const scene={nodes:0,meshes:0,visibleMeshes:0};world.scene.traverse(n=>{scene.nodes++;if(n.isMesh)scene.meshes++;});world.scene.traverseVisible(n=>{if(n.isMesh)scene.visibleMeshes++;});
      const result={viewport:[innerWidth,innerHeight,devicePixelRatio],samples:frames.length,rafMs:stats(frames),cpuMs:Object.fromEntries(Object.entries(metrics).map(([key,value])=>[key,stats(value)])),render:{...world.renderer.info.render},memory:{...world.renderer.info.memory},scene};
      output.textContent=JSON.stringify(result,null,1);panel.dataset.complete='true';
    },
  };
}

export function attachEncounterProbe(snapshot){
 const out=document.createElement('output');out.setAttribute('aria-label','Kontrol durumu');
 out.style.cssText='position:fixed;bottom:4px;left:4px;max-width:90%;max-height:64px;overflow:auto;font:10px monospace;background:#16110cdd;color:#fff;z-index:99999;pointer-events:none';
 document.body.append(out);let previous=0;
 return{beginFrame(){},endFrame(){if(performance.now()-previous<100)return;previous=performance.now();out.textContent=JSON.stringify(snapshot());}};
}
