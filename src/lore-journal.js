import { CAMPAIGN_STAGE_COUNT, getVenueForStage, getStageOrderOptions } from './venues.js';
import { CHAPTERS, getStory, getChapter, getCharacters, getUnlockedChapters } from './lore.js';
import { completedStoryStages, loadStoryWins, recordStoryWin } from './lore-progress.js';
import { laterVenueStory } from './stall-memories.js';
const $ = id => document.getElementById(id);
const COPY = {
 tr:{journal:'Kartpostalın hikâyesi',open:'Defteri aç',chapter:'Bölüm',locked:'Henüz anlatılmadı',hint:'Bu bölümü tamamla; ustanın sakladığı anıyı keşfet.',memories:'anı',people:'Tezgâhın ardındakiler',ending:'Son satır',newMemory:'Yeni bir anı'},
 en:{journal:'The postcard story',open:'Open the journal',chapter:'Chapter',locked:'Not told yet',hint:'Complete this stage to discover the memory the vendor keeps.',memories:'memories',people:'Behind the counter',ending:'The last line',newMemory:'A new memory'},
};
const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Optional narrative UI. No gameplay state, scoring or stage unlocks are changed. */
export class LoreJournal {
 constructor(save) {
  this.save=save;this.stage=save.data.unlockedStage||1;this.wins=loadStoryWins();
  $('btn-open-story').addEventListener('click',()=>this.open());
  this.update(this.stage);
 }
 get language(){return this.save.lang==='tr'?'tr':'en';}
 get completed(){return completedStoryStages(this.save.data.unlockedStage,this.wins);}
 update(stage=this.stage) {
  this.stage=Math.max(1,Math.min(CAMPAIGN_STAGE_COUNT,stage));
  const chapter=getChapter(this.stage,this.language),story=getStory(this.language),copy=COPY[this.language];
  const place=getVenueForStage(this.stage),order=getStageOrderOptions(this.stage),expanded=this.stage>CHAPTERS.length;
  const continuation=expanded?laterVenueStory(this.stage,this.language):null;
  $('home-story-line').textContent=expanded?(continuation?.entry||place.subtitle[this.language]):this.completed.length?chapter.entry:story.teaser;
  $('stage-story-title').textContent=`${place.name[this.language]} · ${expanded?(continuation?.title||(this.language==='tr'?'Yeni bir gösteri':'A new show')):chapter.title}`;
  $('stage-story-entry').textContent=expanded?(continuation?.entry||place.subtitle[this.language]):chapter.entry;
  $('story-progress').textContent=`${this.completed.length} / ${CHAPTERS.length} ${copy.memories}`;
  $('btn-open-story').textContent=copy.open;
  $('story-dialog-title').textContent=copy.journal;
  if($('dialog-story').open)this.render();
 }
 recordResult(stage,won,scoops=1) {
  if(won && stage<=CHAPTERS.length)this.wins=recordStoryWin(this.wins,stage);
  this.update(stage);
  const chapter=getChapter(stage,this.language);
  if(stage>CHAPTERS.length){
   const place=getVenueForStage(stage).name[this.language];
   $('result-story').textContent=this.language==='tr'?(won?`${place}’deki ${scoops} topluk servis senin. Usta bir dahaki gelişini bekliyor.`:`${place}’de usta yeni bir numara hazırlıyor. Bir daha dene.`):(won?`Your ${scoops}-scoop serving in ${place} is yours. The vendor will remember you.`:`The vendor in ${place} has another trick ready. Try again.`);
  } else $('result-story').textContent=won?chapter.win:chapter.retry;
  $('result-story').classList.toggle('memory-earned',won);
 }
 open() {
  $('dialog-stages').close();
  this.render();
  $('dialog-story').showModal();
 }
 render() {
  const copy=COPY[this.language], story=getStory(this.language), completed=new Set(this.completed);
  const unlocked=new Map(getUnlockedChapters(this.completed,this.language).map(c=>[c.stage,c]));
  const chars=getCharacters(this.language);
  const chapters=Array.from({length:CHAPTERS.length},(_,i)=>getChapter(i+1,this.language));
  const lastCompleted=Math.max(0,...completed);
  $('story-book').innerHTML=`<article class="postcard"><span class="postcard-stamp" aria-hidden="true">N.</span><span class="postcard-eyebrow">MARAŞ · ${this.language === 'tr' ? 'BİR YAZ GÜNÜ' : 'A SUMMER AFTERNOON'}</span><h3>${escape(story.title)}</h3><p>${escape(story.prologue)}</p></article>
  <p class="story-memory-count">${completed.size} / ${CHAPTERS.length} ${escape(copy.memories)}</p>
  <div class="story-chapters">${chapters.map(c=>{
   const chapter=unlocked.get(c.stage),available=c.stage<=this.save.data.unlockedStage;
   return `<details class="story-chapter ${chapter?'unlocked':'locked'}" ${chapter&&c.stage===lastCompleted?'open':''}><summary><span class="chapter-number">${String(c.stage).padStart(2,'0')}</span><span>${escape(chapter?chapter.fragmentTitle:available?c.title:copy.locked)}</span><span class="chapter-marker" aria-hidden="true">${chapter?c.symbol:'◇'}</span></summary><p>${escape(chapter?chapter.fragment:available?c.entry+' '+copy.hint:copy.hint)}</p></details>`;
  }).join('')}</div>
  <h3 class="story-people-title">${escape(copy.people)}</h3><div class="story-people">${chars.map(c=>`<details><summary>${escape(c.name)} <small>${escape(c.role)}</small></summary><p>${escape(c.backstory)}${completed.has(c.revealStage)?' '+escape(c.secret):''}</p></details>`).join('')}</div>
  ${completed.has(10)?`<article class="story-ending"><small>${escape(copy.ending)}</small><p>${escape(story.ending)}</p></article>`:''}`;
 }
}
