import {writeFileSync,appendFileSync,existsSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {TRICK_CATALOG} from '../src/protocol.js';
import {makeEncounterFixture} from '../tests/encounter-fixture.js';
import {RoutinePreviewDriver,seededPreviewRandom} from '../tests/routines-driver.js';
const opts={};for(let i=2;i<process.argv.length;i+=2)opts[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const Driver=opts.driver==='preview'||!existsSync(new URL('../tests/encounter-driver.js',import.meta.url))?RoutinePreviewDriver:(await import('../tests/encounter-driver.js')).EncounterDriver;
const campaign=opts.campaign==='1',throughFinal=opts.finish!=='0';
const ids=campaign?['CAMPAIGN']:opts.ids?opts.ids.split(','):[...TRICK_CATALOG.map(t=>t.id),'SCRAPE_FLAVOR_SCOOP'];
const counts=(opts.counts||'1,2,3,4,5,6,7,8,9,10,11,12').split(',').map(Number),vendors=(opts.vendors||'0,1,2,3').split(',').map(Number);
const fps=Number(opts.fps||30),pace=Number(opts.pace||1),width=Number(opts.width||394),height=Number(opts.height||853),output=opts.output||'/tmp/maras-encounters.jsonl';
writeFileSync(output,'');let done=0,passed=0;const began=performance.now(),fixture=makeEncounterFixture({width,height,Driver});
for(const vendor of vendors)for(const count of counts)for(const id of ids){
 const seed=Number(opts.seed||71931),rng=seededPreviewRandom(seed),oldRandom=Math.random;Math.random=rng;
 let result,trace=[],last='',lastAt=0,error=null;const observed=new Set();let feintSeen=false;
 try{
  fixture.reset({id,vendor,count,pace,seed,campaign,forceFeint:opts.feint==='1'});
  for(let frame=0;frame<fps*Number(opts.seconds||75);frame++){
   fixture.tick(1/fps);const s=fixture.state();observed.add(s.mechanic);feintSeen ||= s.flavorPhase!==undefined;
   const key=[s.mechanic,s.step,s.component,s.held,s.transition,s.paper?.phase,s.coneOwner,s.paperOwner,s.flavorPhase,fixture.d.bellBeatsDone,fixture.d.rhythmBeatsCompleted,fixture.d.scoopCount].join('|');
   if(key!==last){trace.push({...s});last=key;lastAt=fixture.time;}
   const completed=campaign||throughFinal||id==='FINAL_PISTACHIO_CATCH'?fixture.outcome==='MASTER_CATCH':fixture.d.routineIndex>=(id==='SCRAPE_FLAVOR_SCOOP'?count:1);
   if(completed){result={ok:true,...s};break;}
   if(fixture.d.roundEnded){result={ok:false,reason:'round-ended',...s};break;}
   if(fixture.time-lastAt>Number(opts.stall||8)){result={ok:false,reason:s.transition||s.action==='wait'?'automatic-stall':'input-stall',...s};break;}
  }
  result ||= {ok:false,reason:'case-timeout',...fixture.state()};
 }catch(e){error=e.stack;result={ok:false,reason:'exception',...fixture.state()};}
 finally{Math.random=oldRandom;}
 const row={id,vendor,count,pace,fps,throughFinal,viewport:[width,height],seed,...result,...(!result.ok?{trace,error}:{}),observed:[...observed],feintSeen,starts:fixture.events.map(e=>e.componentId||e.trickId)};
 appendFileSync(output,JSON.stringify(row)+'\n');done++;if(result.ok)passed++;
 if(!result.ok||done%16===0)console.log(JSON.stringify({done,passed,failed:done-passed,id,vendor,count,reason:result.reason,mechanic:result.mechanic,step:result.step,elapsed:Math.round((performance.now()-began)/1000)}));
}
console.log(JSON.stringify({done,passed,failed:done-passed,seconds:(performance.now()-began)/1000,output}));

process.exitCode=done===passed?0:1;
