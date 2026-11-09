import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { STALL_MEMORIES, StallMemoryProgress, laterVenueStory } from '../src/stall-memories.js';
import { getCulturalDetail } from '../src/cultural-details.js';
import { VendorRelationships } from '../src/vendor-relationships.js';
import { buildStallDecor } from '../src/stall-decor.js';

const allObjects=STALL_MEMORIES.flatMap(memory=>memory.objects);
const allWins=STALL_MEMORIES.map(memory=>memory.winStage);
const storage=()=>{const entries=new Map(),writes=[];return{entries,writes,getItem:k=>entries.get(k)||null,setItem:(k,v)=>{entries.set(k,v);writes.push(k);}};};

test('four later venue threads link real catalog objects, with short explicitly fictional copy',()=>{
 assert.equal(STALL_MEMORIES.length,4);
 assert.deepEqual(allWins,[15,20,25,30]);
 for(const memory of STALL_MEMORIES){
  assert.equal(memory.provenance,'original-game-fiction');
  for(const id of memory.objects)assert.equal(getCulturalDetail(id)?.venueId,memory.venueId);
  for(const lang of ['tr','en']){
   for(const field of ['title','entry','hint','clue','reveal','live','result','returning'])assert.ok(memory[lang][field]?.length>0);
   assert.ok(memory[lang].live.length<=115);assert.ok(memory[lang].clue.length<=125);assert.ok(memory[lang].reveal.length<=160);
  }
 }
 assert.equal(laterVenueStory(5),null);assert.notEqual(laterVenueStory(11).entry,laterVenueStory(16).entry);
});

test('unlocks require actual venue completion and an inspected clue; later wins cannot skip the linked story',()=>{
 const p=new StallMemoryProgress(storage());
 p.setContext({unlockedStage:30,discoveredIds:allObjects,completedStages:[]});assert.deepEqual(p.earnedIds,[]);
 assert.equal(p.nextBeat(26).kind,'clue');assert.equal(p.card('leather-bound-book','ustalar-avlusu'),STALL_MEMORIES[3].tr.clue);
 p.setContext({unlockedStage:30,completedStages:[30]});assert.deepEqual(p.earnedIds,[]);
 p.setContext({unlockedStage:30,completedStages:allWins,discoveredIds:[]});assert.deepEqual(p.earnedIds,[]);
 p.setContext({unlockedStage:30,completedStages:allWins,discoveredIds:allObjects});assert.deepEqual(p.earnedIds,STALL_MEMORIES.map(m=>m.id));
 assert.equal(p.card('leather-bound-book','ustalar-avlusu'),STALL_MEMORIES[3].tr.reveal);
});

test('discovery callbacks reject wrong venues, future objects and unknown IDs without changing the game',()=>{
 const p=new StallMemoryProgress(storage());p.setContext({unlockedStage:11,completedStages:[]});
 assert.equal(p.discover('pearl-inlay-box','kadikoy'),false);assert.equal(p.discover('leather-bound-book','ustalar-avlusu'),false);assert.equal(p.discover('not-real','karakoy'),false);
 assert.equal(p.discover('pearl-inlay-box','karakoy'),true);assert.equal(p.card('pearl-inlay-box','karakoy'),STALL_MEMORIES[0].tr.clue);
 assert.equal(p.card('pearl-inlay-box','kadikoy'),null);assert.equal(p.card('leather-bound-book','ustalar-avlusu'),null);
});

test('heard lines are capped and persisted separately; corrupted records cannot reveal stories',()=>{
 const s=storage();s.entries.set('maras-stall-memories-v1',JSON.stringify(['reveal:empty-slot','future','apprentice-mark',1]));
 const p=new StallMemoryProgress(s);p.setContext({unlockedStage:30,completedStages:[],discoveredIds:allObjects});
 assert.deepEqual(p.earnedIds,[]);assert.equal(p.heard.size,1);
 p.markHeard('clue:kept-notch');p.markHeard('made-up');
 assert.deepEqual(s.writes,['maras-stall-memories-v1']);
 assert.equal(new StallMemoryProgress(s).heard.has('clue:kept-notch'),true);
 p.setContext({unlockedStage:Infinity,completedStages:allWins,discoveredIds:allObjects});assert.deepEqual(p.earnedIds,[]);
 assert.doesNotThrow(()=>p.setContext({discoveredIds:'corrupt'}));
});

function relationshipsFixture(wins=[15]){
 const lines=[],reactions=[],scene=[];
 const save={lang:'tr',data:{unlockedStage:16,completedStages:[...wins]}};
 const director={score:456,hearts:3,sayLine:text=>lines.push(text),vendorBubbleTimer:0,speechClock:0,captionLockUntil:0};
 const n=new VendorRelationships({save,lore:{completed:[1,2,3,4,5,6,7,8,9,10]},director,world:{setNarrativeState:x=>scene.push(x),playVendorReaction:k=>reactions.push(k),cancelVendorReaction(){},stallDecor:{focus:k=>scene.push({focus:k})}},storage:storage()});
 n.setDiscoveredObjects(['pearl-inlay-box','tokat-print-block']);return{n,save,director,lines,reactions,scene};
}

test('one new memory appears only in safe preparation and never steals an existing urgent caption',()=>{
 const f=relationshipsFixture();f.n.begin(16,1);f.n.update(8);
 f.n.onTrickStart({trickId:'EYE_LOCK_RHYTHM_CHASE',index:1});assert.equal(f.lines.length,0);
 f.director.vendorBubbleTimer=1;f.n.onTrickStart({trickId:'CUSTOMER_MOLD_MOUNT',index:0});assert.equal(f.lines.length,0);assert.equal(f.n.memories.heard.size,0);
 f.director.vendorBubbleTimer=0;f.n.onTrickStart({trickId:'CUSTOMER_SCOOP_SHOW',index:1});assert.equal(f.lines.length,1);assert.equal(f.n.memories.heard.has('reveal:empty-slot'),true);
 f.n.update(9);f.n.onTrickStart({trickId:'SCRAPE_FLAVOR_SCOOP',index:4});assert.equal(f.lines.length,1);
 assert.equal(f.reactions.at(-1),'thanks');assert.ok(!f.reactions.includes('photo'));
 assert.equal(f.director.score,456);assert.equal(f.director.hearts,3);
 assert.ok(f.scene.some(value=>value.focus==='ledger'));
});

test('only a real newly completed memory supplies result text; replay and failure cannot award it again',()=>{
 const f=relationshipsFixture([]);f.n.begin(15,0);
 assert.equal(f.n.finish(false),null);assert.deepEqual(f.n.memories.earnedIds,[]);
 f.save.data.completedStages.push(15);assert.equal(f.n.finish(true),STALL_MEMORIES[0].tr.result);
 assert.equal(f.n.finish(true),null);assert.deepEqual(f.n.memories.earnedIds,['empty-slot']);
});

test('ledger tabs and apprentice mark change existing scene props without adding objects per update',()=>{
 const decor=buildStallDecor(new THREE.Scene(),{textureFactory:()=>new THREE.Texture()});const ledger=decor.props.ledger;
 const count=()=>{let n=0;decor.root.traverse(()=>n++);return n;},before=count();
 decor.setState({completedStages:[6],stallMemories:['empty-slot','invalid']});assert.deepEqual(ledger.memoryTabs.map(tab=>tab.visible),[true,false,false,false]);assert.equal(ledger.picture.material.map,ledger.openMap);
 decor.setState({completedStages:[6],stallMemories:STALL_MEMORIES.map(m=>m.id)});assert.ok(ledger.memoryTabs.every(tab=>tab.visible));assert.equal(ledger.picture.material.map,ledger.apprenticeMap);
 for(let i=0;i<120;i++)decor.update(i/60);assert.equal(count(),before);
});

test('blocked storage and a denied localStorage getter keep lore optional and safe',()=>{
 const broken={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}};
 const p=new StallMemoryProgress(broken);p.setContext({unlockedStage:30,completedStages:allWins,discoveredIds:allObjects});assert.doesNotThrow(()=>p.markHeard('reveal:empty-slot'));
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('SecurityError');}});
 try{assert.doesNotThrow(()=>new StallMemoryProgress());assert.doesNotThrow(()=>new VendorRelationships({save:{lang:'tr'},lore:{completed:[]},world:{},director:{}}));}
 finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});
