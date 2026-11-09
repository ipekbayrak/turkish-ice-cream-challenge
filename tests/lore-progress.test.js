import test from 'node:test';
import assert from 'node:assert/strict';
import {completedStoryStages,loadStoryWins,recordStoryWin} from '../src/lore-progress.js';
test('legacy unlocks carry earlier wins, not unproven last-stage stars',()=>{
 assert.deepEqual(completedStoryStages(3),[1,2]);
 assert.equal(completedStoryStages(10).includes(10),false);
});
test('actual final victory unlocks ending once and corrupt IDs never unlock memories',()=>{
 const storage={setItem(){}};
 assert.deepEqual(recordStoryWin([2,2,99],10,storage),[2,10]);
 assert.deepEqual(completedStoryStages(1,['3',NaN,-1,4]),[4]);
});
test('unavailable or corrupt storage does not prevent playing',()=>{
 assert.deepEqual(loadStoryWins({getItem(){return 'invalid';}}),[]);
 assert.deepEqual(recordStoryWin([],1,{setItem(){throw Error('quota');}}),[1]);
});
