import { getVenueForStage } from './venues.js';
import { StallMemoryProgress, laterVenueStory } from './stall-memories.js';
/** A remembered customer and four linked masters. Narrative never awards gameplay progress. */
const KEY='maras-vendor-relationships-v1';
const TEXT={
 tr:{
 first:['Hoş geldin! O kart… bizim eski tezgâh mı?','Kadir seni gönderdi, değil mi? Kartı bir göreyim.','Pala ilk şakasını anlattı mı? O gün ben de buradaydım.','Cezmi’nin boş satırını buldun. Şimdi sıra bende.'],
 returning:['Yine geldin! Bu kez boş külahı bana bırak.','Seni tanıdım! Kadir’den öğrendiklerin yetmez burada.','Hoş geldin evladım. Defterde sana da bir yer ayırdım.','Bizim misafir geri dönmüş. Son notayı unutmadın ya?'],
 success:['Elin alışıyor! Pala bunu görse şaşırır.','Bu dönüşü bana Cezmi öğretmişti.','Sabretmeyi öğrendin. Haydar buna sevinir.','Artık çanlara değil, birbirimize kulak veriyoruz.'],
 mistake:['Ben de ilk gün hep peçeteyi alırdım.','Bunu Kadir’e söyleme; numarayı o buldu.','Acele yok. Pala hâlâ bazen bu şakaya düşer.','Bir daha. Bu tezgâhta kimse eli boş dönmez.'],
 reveal:['Soldaki eğri çana bak. Fotoğrafta da öyle duruyor.','O eski fotoğraf… benim ilk şakamdı. Cezmi çekmişti.','Tarif defterinin kenarlarında misafirlerin adları var.','Karttaki boşluğu silmedik. Birini bekliyorduk.'],
 final:'Kartın son satırı sana kaldı. Bu tezgâhta artık senin de yerin var.',
 },
 en:{
 first:['Welcome! That card… is that our old cart?','Kadir sent you, didn’t he? Let me see that card.','Did Pala tell you about his first joke? I was there.','You found Cezmi’s blank line. Now it is my turn.'],
 returning:['You’re back! Leave the empty cone with me this time.','I remember you! Kadir’s tricks only get you so far.','Welcome back. I saved a place for you in the notebook.','Our guest has returned. Remember the last note?'],
 success:['You’re getting it! Pala would be surprised.','Cezmi taught me that turn.','You learned patience. Haydar will be pleased.','Now we listen to each other, not only the bells.'],
 mistake:['I kept catching the napkin on my first day too.','Don’t tell Kadir. This was his idea.','No rush. Even Pala still falls for this one.','Again. Nobody leaves this cart empty-handed.'],
 reveal:['Look at the crooked bell. It leans in the photo too.','That photograph was my first joke. Cezmi took it.','The recipe book has guests’ names in its margins.','We never erased the blank line. We left room for someone.'],
 final:'The last line is yours. There is a place for you at this cart now.',
 },
};
const sanitize=value=>Array.from({length:4},(_,i)=>Math.max(0,Math.min(999,Number(value?.[i])||0)));
export function relationshipLine(kind,vendor,visits=0,lang='tr',completedStages=[]){
 const t=TEXT[lang==='tr'?'tr':'en'];const id=Math.max(0,Math.min(3,Number(vendor)||0));
 if(kind==='greeting') {
  const completed=new Set(completedStages);
  const milestones=[2,5,8,10];
  if(completed.has(milestones[id]))return (lang==='tr'?
   ['Pala seni bekliyor. Fotoğrafı unutma; artık bizim hikâyeyi de biliyorsun.','Cezmi defteri sana açacaktır. Benim acemilik hikâyemi de öğrendin artık.','Haydar’a boş satırı sor. Bu kez seni eski bir dost gibi karşılayacak.','Bizim tezgâhın misafiri değil, dostusun artık. Yeni bir şaka deneyelim mi?']:
   ['Pala is waiting. Take the photo; you know our story now.','Cezmi will open his notebook for you. You know my apprentice story now.','Ask Haydar about the blank line. He will welcome you as an old friend.','You are our friend now, not just a guest. Shall we try a new joke?'])[id];
  return (visits>1 || completed.has([1,3,6,9][id]) ? t.returning : t.first)[id];
 }
 return kind==='final'?t.final:(t[kind]||t.reveal)[id];
}
export class VendorRelationships {
 constructor({save,lore,world,director,storage}){
  if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
  this.save=save;this.lore=lore;this.world=world;this.director=director;this.storage=storage;
  try{this.visits=sanitize(JSON.parse(storage?.getItem(KEY)||'[]'));}catch{this.visits=sanitize([]);}
  this.time=0;this.lastLine=-10;this.active=false;this.spoken=new Set();this.vendor=director.levelIndex||0;this.stage=director.currentStage||1;
  this.memories=new StallMemoryProgress(storage);this.lineCount=0;this.newMemorySpoken=false;this.pendingRecognition=null;
  this.syncMemories();this.refreshScene();
 }
 get recognized(){return this.visits[this.vendor]>1||this.lore.completed.includes([1,3,6,9][this.vendor]);}
 syncMemories(discoveredIds){return this.memories.setContext({completedStages:this.save.data?.completedStages||[],unlockedStage:this.save.data?.unlockedStage||1,discoveredIds});}
 setDiscoveredObjects(ids=[]){this.syncMemories(ids);this.refreshScene();}
 discoverObject({id,venueId}={}){
  this.syncMemories();if(!this.memories.discover(id,venueId))return false;
  this.syncMemories();this.refreshScene();return true;
 }
 discoveryMemory(id,venueId){return this.memories.card(id,venueId,this.save.lang);}
 refreshScene(){this.world.setNarrativeState?.({vendorIndex:this.vendor,completedStages:this.lore.completed,visits:this.visits[this.vendor],chapter:this.stage,stallMemories:this.memories.earnedIds});}
 begin(stage,vendor){
  this.stage=stage;this.vendor=vendor;this.visits[vendor]++;this.time=0;this.lastLine=-10;this.active=true;this.spoken.clear();this.lineCount=0;this.newMemorySpoken=false;this.pendingThanks=false;this.pendingRecognition=null;this.syncMemories();
  try{this.storage?.setItem(KEY,JSON.stringify(this.visits));}catch{}
  this.refreshScene();
  this.world.playVendorReaction?.(this.visits[vendor]>1?'recognition':'greeting');
  if(stage>10){
   const thread=laterVenueStory(stage,this.save.lang);
   const place=getVenueForStage(stage).name[this.save.lang==='tr'?'tr':'en'];
   const text=thread?(this.memories.earned.has(thread.id)?thread.returning:thread.entry):(this.save.lang==='tr'?`${place}’de de seni bekliyorduk.`:`We were expecting you in ${place}.`);
   this.pendingRecognition=thread&&this.memories.earned.has(thread.id)?thread.returning:this.visits[vendor]>1?TEXT[this.save.lang==='tr'?'tr':'en'].returning[vendor]:thread?.hint||text;return text;
  }
  return relationshipLine('greeting',vendor,this.visits[vendor],this.save.lang,this.lore.completed);
 }
 update(dt){if(this.active)this.time+=dt;}
 canSpeak(){
  return this.lineCount<3&&this.time-this.lastLine>=7&&!(this.director.vendorBubbleTimer>.25)&&!((this.director.captionLockUntil||0)>(this.director.speechClock||0)+.05);
 }
 speakOnce(key,text,reaction='thanks',focus=null,voice='hmm'){
  if(this.spoken.has(key)||!this.canSpeak())return false;
  this.spoken.add(key);this.lastLine=this.time;this.lineCount++;
  if(this.director.sayLine)this.director.sayLine(text,voice,2.8);
  else {this.director.vendorBubbleText=text;this.director.vendorBubbleTimer=2.8;}
  if(focus)this.world.stallDecor?.focus?.(focus);
  // Head-only thanks never pulls a scripted serving hand away from the cone.
  this.world.playVendorReaction?.(reaction);return true;
 }
 say(kind,reaction='photo'){
  const text=relationshipLine(kind,this.vendor,this.visits[this.vendor],this.save.lang,this.lore.completed);
  return this.speakOnce(kind,text,reaction);
 }
 offerMemory(){
  if(this.newMemorySpoken)return false;
  const beat=this.memories.nextBeat(this.stage,this.save.lang,this.vendor);
  if(beat&&this.speakOnce(beat.id,beat.text,'thanks',beat.focus)){
   this.memories.markHeard(beat.id);this.newMemorySpoken=true;this.pendingRecognition=null;return true;
  }
  if(!beat&&this.pendingRecognition&&this.speakOnce('returning-thread',this.pendingRecognition,'thanks','ledger')){
   this.pendingRecognition=null;this.newMemorySpoken=true;return true;
  }
  return false;
 }
 onTrickStart(event){
  this.world.cancelVendorReaction?.();
  if (this.pendingThanks) { this.world.playVendorReaction?.('thanks'); this.pendingThanks = false; }
  if(!this.active)return;
  const mechanic = event.componentId || event.trickId;
  // Only these preparation starts have a long autonomous interval. No new
  // story line is inserted into reach, pull, cut, or beat-matching windows.
  const safe=['CUSTOMER_MOLD_MOUNT','CUSTOMER_SCOOP_SHOW','SCRAPE_FLAVOR_SCOOP'].includes(mechanic);
  if(safe&&this.offerMemory())return;
  if(this.stage<=10&&mechanic==='SCRAPE_FLAVOR_SCOOP'&&event.index>1)this.say('reveal','photo');
  const jokes={
   WHOLE_MOLD_ON_CONE: ['Kadir “bir top” derken bunu kastetmiş olmalı!', 'Kadir must have meant this when he said “one scoop”!'],
   SCOOP_LIFT_BACK: ['Bu numarayı Pala’dan öğrendim. Bana da boş külah vermişti.', 'Pala taught me this one. He left me with an empty cone too.'],
   BONUS_SCOOP_TAKEBACK: ['Biraz daha mı? Pala bu teklife hâlâ inanıyor!', 'A little extra? Pala still falls for that offer!'],
  };
  if(jokes[mechanic])this.speakOnce('trick-memory',jokes[mechanic][this.save.lang==='tr'?0:1],'thanks',null,'eeeh');
 }
 onReaction(event){
  if(!this.active)return;
  if(event.kind==='success'&&event.index>0&&event.showComplete!==false) { this.pendingThanks=true; this.say('success','thanks'); }
  if(event.kind==='mistake')this.say('mistake','recognition');
 }
 finish(won){
  if(won&&this.stage===10)this.say('final','thanks');
  if(won)this.world.playVendorReaction?.('thanks');
  const earned=this.syncMemories();this.refreshScene();this.active=false;
  return won&&earned.length?this.memories.result(earned.at(-1),this.save.lang):null;
 }
}
