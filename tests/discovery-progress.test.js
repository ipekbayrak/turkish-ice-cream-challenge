import test from 'node:test';
import assert from 'node:assert/strict';
import { DiscoveryProgress } from '../src/discovery-progress.js';
const catalog=[{id:'cezve',venueId:'istiklal',unlockStage:1},{id:'hatira',venueId:'istiklal',unlockStage:3},{id:'topac',venueId:'galata',unlockStage:6}];
const storage=(value='[]')=>({value,keys:[],getItem(){return this.value;},setItem(key,next){this.keys.push(key);this.value=next;}});
test('only a present unlocked object can be discovered; revisiting never duplicates it',()=>{
 const s=storage(),p=new DiscoveryProgress(catalog,s);
 assert.equal(p.discover('cezve','istiklal',1),true);assert.equal(p.discover('cezve','istiklal',1),false);
 assert.equal(p.discover('hatira','istiklal',1),false);assert.equal(p.discover('topac','istiklal',10),false);assert.equal(p.discover('unknown','istiklal',30),false);
 assert.equal(p.count(),1);assert.equal(p.count('galata'),0);
});
test('saved discoveries validate IDs and remain separate from the game record',()=>{
 const s=storage('["cezve","cezve","unknown"]'),p=new DiscoveryProgress(catalog,s);
 assert.deepEqual(p.ids,['cezve']);p.discover('topac','galata',6);assert.deepEqual(new DiscoveryProgress(catalog,s).ids,['cezve','topac']);
 assert.ok(s.keys.every(key=>key==='maras-cultural-discoveries-v1'));
});
test('blocked storage and corrupted data do not break discovery or gameplay',()=>{
 const p=new DiscoveryProgress(catalog,{getItem(){throw Error('disabled');},setItem(){throw Error('quota');}});
 assert.equal(p.discover('cezve','istiklal',1),true);assert.equal(p.count(),1);
 assert.equal(new DiscoveryProgress(catalog,storage('not-json')).count(),0);
});


test('a denied browser storage getter cannot prevent the scene from starting', () => {
 const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
 Object.defineProperty(globalThis, 'localStorage', { configurable:true, get(){ throw new Error('SecurityError'); } });
 try {
   const progress = new DiscoveryProgress([{id:'tea', venueId:'first', unlockStage:1}]);
   assert.equal(progress.discover('tea','first',1), true);
 } finally {
   if (descriptor) Object.defineProperty(globalThis,'localStorage',descriptor);
   else delete globalThis.localStorage;
 }
});
