import test from 'node:test';import assert from 'node:assert/strict';
import {SaveManager} from '../src/storage.js';
import {CAMPAIGN_LEVELS,getStageConfig} from '../src/protocol.js';
import {VENUES,getVenueProgress,getStageOrderOptions} from '../src/venues.js';
function saved(seed,run){const old=globalThis.localStorage;let raw=seed?JSON.stringify(seed):null;globalThis.localStorage={getItem:()=>raw,setItem:(_k,v)=>raw=v};try{run(new SaveManager(),()=>new SaveManager());}finally{if(old===undefined)delete globalThis.localStorage;else globalThis.localStorage=old;}}
test('six venues partition thirty encounters and preserve the first ten authored difficulty settings',()=>{
 assert.equal(VENUES.length,6);assert.equal(CAMPAIGN_LEVELS.length,30);
 assert.deepEqual(VENUES.flatMap(v=>Array.from({length:v.lastStage-v.firstStage+1},(_,i)=>v.firstStage+i)),Array.from({length:30},(_,i)=>i+1));
 assert.deepEqual(CAMPAIGN_LEVELS.slice(0,10).map(x=>x.speedMult),[.78,.86,.94,1,1.06,1.12,1.18,1.24,1.3,1.38]);
});
test('later encounters vary masters and tricks while progressive tempo grows with decreasing increments',()=>{
 assert.ok(new Set(CAMPAIGN_LEVELS.slice(10).map(x=>x.vendorIdx)).size>=3);
 assert.ok(new Set(CAMPAIGN_LEVELS.slice(10).flatMap(x=>x.trickPool)).size>15);
 for(const n of[2,10,30,1000])assert.ok(getStageConfig(n+1).speedMult>getStageConfig(n).speedMult);
 assert.ok(getStageConfig(3).speedMult-getStageConfig(2).speedMult>getStageConfig(31).speedMult-getStageConfig(30).speedMult);
});
test('a legacy ten-encounter save retains every score and star while expanding arrays',()=>saved({unlockedStage:10,stageStars:Array(10).fill(2),stageHighScores:Array.from({length:10},(_,i)=>100+i)},save=>{
 assert.equal(save.data.unlockedStage,10);assert.equal(save.data.stageStars.length,30);assert.equal(save.data.stageHighScores.length,30);
 for(let n=1;n<=10;n++){assert.equal(save.getStageStars(n),2);assert.equal(save.getStageBestScore(n),99+n);}
}));
test('failure stars never mark the last legacy encounter won or unlock eleven',()=>saved({unlockedStage:10,stageStars:Array(10).fill(3)},save=>{
 save.recordStageResult(10,400,3,false);assert.equal(save.data.unlockedStage,10);assert.ok(!save.data.completedStages.includes(10));assert.equal(save.data.coins,0);assert.equal(save.data.conesCaught,0);
}));
test('an actual victory at ten unlocks eleven with the unchanged score and coin reward',()=>saved({unlockedStage:10},save=>{
 save.recordStageResult(10,500,3,true);assert.equal(save.data.unlockedStage,11);assert.equal(save.getStageBestScore(10),500);assert.equal(save.data.coins,175);assert.equal(save.data.conesCaught,1);
}));
test('trusted actual journal wins migrate consecutively without granting reward twice',()=>saved(null,save=>{
 save.reconcileCompletedStages([2,3]);assert.equal(save.data.unlockedStage,1);save.reconcileCompletedStages([1]);assert.equal(save.data.unlockedStage,4);
 save.reconcileCompletedStages([1,2,3]);assert.equal(save.data.unlockedStage,4);assert.equal(save.data.coins,0);assert.equal(save.data.conesCaught,0);
}));
test('final encounter completion continues to stage thirty-one without overflowing score arrays',()=>saved({unlockedStage:30},save=>{
 save.recordStageResult(30,900,3,true);assert.equal(save.data.unlockedStage,31);save.recordStageResult(31,1000,3,true);assert.equal(save.data.unlockedStage,32);
 assert.equal(save.data.stageHighScores.length,30);assert.equal(save.data.stageStars.length,30);assert.equal(save.getStageBestScore(31),1000);
}));
test('venue capacity grows while every deliberate order may contain one scoop',()=>{
 assert.deepEqual(VENUES.map(v=>getStageOrderOptions(v.firstStage).max),[4,4,5,6,7,8]);
 for(const n of[1,10,30,31,1000000]){const order=getStageOrderOptions(n);assert.equal(order.min,1);assert.equal(order.choices[0],1);assert.ok(order.max<=12);}
});
test('venue progress has no false completion from stars or a locked next venue',()=>{
 const data={unlockedStage:1,completedStages:[],stageStars:Array(30).fill(3)};
 assert.equal(getVenueProgress('istiklal',data).completed,0);assert.equal(getVenueProgress('galata',data).unlocked,false);
 data.completedStages=[1,2,3,4,5];data.unlockedStage=6;assert.equal(getVenueProgress('istiklal',data).cleared,true);assert.equal(getVenueProgress('galata',data).completed,0);
});
test('eight-scoop preferences round trip with eight flavor slots and global bounds',()=>saved(null,(save,reload)=>{
 save.setOrderPreferences(8,[0,1,2,3,0,1,2,3]);const loaded=reload();assert.equal(loaded.data.preferredScoopCount,8);assert.equal(loaded.data.preferredFlavors.length,8);
 loaded.setOrderPreferences(500,[0,1,2,3]);assert.equal(loaded.data.preferredScoopCount,12);
}));
test('retired honey and mastic choices map to plain without losing eight-scoop orders or progress',()=>saved({unlockedStage:20,preferredScoopCount:8,preferredFlavors:[4,5,0,1,2,3,4,5]},save=>{
 assert.equal(save.data.unlockedStage,20);assert.equal(save.data.preferredScoopCount,8);assert.deepEqual(save.data.preferredFlavors,[0,0,0,1,2,3,0,0]);
}));
