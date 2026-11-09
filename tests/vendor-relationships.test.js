import test from 'node:test';import assert from 'node:assert/strict';
import {relationshipLine,VendorRelationships} from '../src/vendor-relationships.js';
test('each master recognizes returning guests and mentions another master',()=>{
 for(let vendor=0;vendor<4;vendor++){assert.notEqual(relationshipLine('greeting',vendor,1),relationshipLine('greeting',vendor,2));assert.ok(relationshipLine('reveal',vendor).length<100);}
 assert.match(relationshipLine('success',1),/Cezmi/);assert.match(relationshipLine('greeting',3,1),/Cezmi/);
});
test('narrative reacts between tricks, rate limits repeated mistakes and never changes score',()=>{
 const lines=[],props=[],storage={getItem:()=>null,setItem(){}};
 const n=new VendorRelationships({save:{lang:'tr'},lore:{completed:[1]},world:{setNarrativeState:x=>props.push(x),playVendorReaction(){},cancelVendorReaction(){}},director:{score:320,sayLine:text=>lines.push(text)},storage});
 n.begin(3,1);n.update(8);n.onTrickStart({trickId:'SCRAPE_FLAVOR_SCOOP',index:2});n.onReaction({kind:'mistake'});assert.equal(lines.length,1);n.update(8);n.onReaction({kind:'mistake'});n.update(8);n.onReaction({kind:'mistake'});assert.equal(lines.length,2);assert.equal(n.director.score,320);assert.deepEqual(props.at(-1).completedStages,[1]);
});
test('visits persist independently from the original gameplay save',()=>{
 const values={};const storage={getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v};const args={save:{lang:'tr'},lore:{completed:[]},world:{},director:{},storage};
 const a=new VendorRelationships(args);const first=a.begin(1,0);const b=new VendorRelationships(args);const second=b.begin(1,0);assert.notEqual(first,second);assert.equal(b.visits[0],2);
});

test('completed master memories change the welcome, beyond merely counting visits',()=>{
 assert.notEqual(relationshipLine('greeting',0,3,'tr',[]),relationshipLine('greeting',0,3,'tr',[1,2]));
 assert.match(relationshipLine('greeting',3,2,'tr',[10]),/dostusun/);
});

test('a successful reaction remains visible after the next trick cancels old arm gestures',()=>{
 const poses=[];const n=new VendorRelationships({save:{lang:'tr'},lore:{completed:[]},world:{playVendorReaction:k=>poses.push(k),cancelVendorReaction:()=>poses.push('cancel')},director:{sayLine(){}},storage:{getItem:()=>null,setItem(){}}});
 n.begin(1,0);n.update(8);n.onReaction({kind:'success',index:1});n.onTrickStart({trickId:'SHAFT_SPIN_360',index:2});assert.equal(poses.at(-1),'thanks');
});


test('compound shows keep component memories but thank only the complete show',()=>{
 const lines=[],poses=[];
 const n=new VendorRelationships({save:{lang:'tr'},lore:{completed:[]},world:{playVendorReaction:k=>poses.push(k),cancelVendorReaction(){}},director:{sayLine:text=>lines.push(text)},storage:{getItem:()=>null,setItem(){}}});
 n.begin(2,1);n.update(8);
 n.onTrickStart({trickId:'SHOW_PECETEYE_BIR_TOP_DAHA',componentId:'BONUS_SCOOP_TAKEBACK',index:1});
 assert.match(lines.at(-1),/Pala/);
 n.onReaction({kind:'success',index:1,showComplete:false});
 assert.notEqual(n.pendingThanks,true);
 n.update(8);n.onReaction({kind:'success',index:1,showComplete:true});
 assert.equal(n.pendingThanks,true);
});
