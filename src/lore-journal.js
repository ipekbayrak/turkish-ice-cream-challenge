import { CAMPAIGN_STAGE_COUNT, getVenueForStage, getStageOrderOptions, formatTurkishVenueLocative } from './venues.js';
import { CHAPTERS, getStory, getChapter, getCharacters, getUnlockedChapters } from './lore.js';
import { completedStoryStages, loadStoryWins, recordStoryWin } from './lore-progress.js';
import { laterVenueStory } from './stall-memories.js';
const $ = id => document.getElementById(id);
const COPY = {
 tr:{journal:'Kartpostalın hikâyesi',open:'Defteri aç',chapter:'Bölüm',locked:'Henüz anlatılmadı',hint:'Bu bölümü tamamla; ustanın sakladığı anıyı keşfet.',memories:'anı',people:'Tezgâhın ardındakiler',ending:'Son satır',newMemory:'Yeni bir anı',newShow:'Yeni bir gösteri',summer:'BİR YAZ GÜNÜ'},
 en:{journal:'The postcard story',open:'Open the journal',chapter:'Chapter',locked:'Not told yet',hint:'Complete this stage to discover the memory the vendor keeps.',memories:'memories',people:'Behind the counter',ending:'The last line',newMemory:'A new memory',newShow:'A new show',summer:'A SUMMER AFTERNOON'},
 ar:{journal:'حكاية البطاقة البريدية',open:'افتح الدفتر',chapter:'الفصل',locked:'لم تُروَ بعد',hint:'أكمل هذه المرحلة لاكتشاف الذكرى التي يحتفظ بها المعلم.',memories:'ذكريات',people:'خلف العربة',ending:'السطر الأخير',newMemory:'ذكرى جديدة',newShow:'عرض جديد',summer:'ظهيرة صيف'},
 ru:{journal:'История открытки',open:'Открыть дневник',chapter:'Глава',locked:'Ещё не рассказано',hint:'Пройдите этот уровень, чтобы узнать воспоминание мастера.',memories:'воспоминаний',people:'За прилавком',ending:'Последняя строка',newMemory:'Новое воспоминание',newShow:'Новое шоу',summer:'ЛЕТНИЙ ДЕНЬ'},
 de:{journal:'Die Geschichte der Postkarte',open:'Notizbuch öffnen',chapter:'Kapitel',locked:'Noch nicht erzählt',hint:'Schließe diese Stufe ab, um die Erinnerung des Meisters zu entdecken.',memories:'Erinnerungen',people:'Hinter dem Stand',ending:'Die letzte Zeile',newMemory:'Eine neue Erinnerung',newShow:'Eine neue Show',summer:'EIN SOMMERNACHMITTAG'},
 ja:{journal:'絵葉書の物語',open:'手帳を開く',chapter:'章',locked:'まだ語られていない',hint:'このステージをクリアして、職人が秘めた思い出を見つけよう。',memories:'の記憶',people:'屋台の向こうの人々',ending:'最後の一行',newMemory:'新しい記憶',newShow:'新しいショー',summer:'ある夏の午後'},
};
const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Optional narrative UI. No gameplay state, scoring or stage unlocks are changed. */
export class LoreJournal {
 constructor(save) {
  this.save=save;this.stage=save.data.unlockedStage||1;this.wins=loadStoryWins();
  $('btn-open-story').addEventListener('click',()=>this.open());
  this.update(this.stage);
 }
 get language(){return COPY[this.save.lang]?this.save.lang:'en';}
 get completed(){return completedStoryStages(this.save.data.unlockedStage,this.wins);}
 update(stage=this.stage) {
  this.stage=Math.max(1,Math.min(CAMPAIGN_STAGE_COUNT,stage));
  const lang=this.language,chapter=getChapter(this.stage,lang),story=getStory(lang),copy=COPY[lang];
  const place=getVenueForStage(this.stage),order=getStageOrderOptions(this.stage),expanded=this.stage>CHAPTERS.length;
  const continuation=expanded?laterVenueStory(this.stage,lang):null;
  const placeName=place.name[lang]||place.name.en;
  const placeSub=place.subtitle[lang]||place.subtitle.en;
  $('home-story-line').textContent=expanded?(continuation?.entry||placeSub):this.completed.length?chapter.entry:story.teaser;
  $('stage-story-title').textContent=`${placeName} · ${expanded?(continuation?.title||copy.newShow):chapter.title}`;
  $('stage-story-entry').textContent=expanded?(continuation?.entry||placeSub):chapter.entry;
  $('story-progress').textContent=`${this.completed.length} / ${CHAPTERS.length} ${copy.memories}`;
  $('btn-open-story').textContent=copy.open;
  $('story-dialog-title').textContent=copy.journal;
  if($('dialog-story').open)this.render();
 }
 recordResult(stage,won,scoops=1) {
  if(won && stage<=CHAPTERS.length)this.wins=recordStoryWin(this.wins,stage);
  this.update(stage);
  const lang=this.language,chapter=getChapter(stage,lang);
  if(stage>CHAPTERS.length){
   const venue=getVenueForStage(stage),place=venue.name[lang]||venue.name.en;
   if(lang==='tr'){
    const locKi=formatTurkishVenueLocative(venue,true),loc=formatTurkishVenueLocative(venue,false);
    $('result-story').textContent=won?`${locKi} ${scoops} topluk servis senin. Usta bir dahaki gelişini bekliyor.`:`${loc} usta yeni bir numara hazırlıyor. Bir daha dene.`;
   } else {
    $('result-story').textContent=won?`Your ${scoops}-scoop serving in ${place} is yours. The vendor will remember you.`:`The vendor in ${place} has another trick ready. Try again.`;
   }
  } else $('result-story').textContent=won?chapter.win:chapter.retry;
  $('result-story').classList.toggle('memory-earned',won);
 }
 open() {
  $('dialog-stages').close();
  this.render();
  $('dialog-story').showModal();
 }
 render() {
  const lang=this.language,copy=COPY[lang], story=getStory(lang), completed=new Set(this.completed);
  const unlocked=new Map(getUnlockedChapters(this.completed,lang).map(c=>[c.stage,c]));
  const chars=getCharacters(lang);
  const chapters=Array.from({length:CHAPTERS.length},(_,i)=>getChapter(i+1,lang));
  const lastCompleted=Math.max(0,...completed);
  $('story-book').innerHTML=`<article class="postcard"><span class="postcard-stamp" aria-hidden="true">N.</span><span class="postcard-eyebrow">MARAŞ · ${escape(copy.summer)}</span><h3>${escape(story.title)}</h3><p>${escape(story.prologue)}</p></article>
  <p class="story-memory-count">${completed.size} / ${CHAPTERS.length} ${escape(copy.memories)}</p>
  <div class="story-chapters">${chapters.map(c=>{
   const chapter=unlocked.get(c.stage),available=c.stage<=this.save.data.unlockedStage;
   return `<details class="story-chapter ${chapter?'unlocked':'locked'}" ${chapter&&c.stage===lastCompleted?'open':''}><summary><span class="chapter-number">${String(c.stage).padStart(2,'0')}</span><span>${escape(chapter?chapter.fragmentTitle:available?c.title:copy.locked)}</span><span class="chapter-marker" aria-hidden="true">${chapter?c.symbol:'◇'}</span></summary><p>${escape(chapter?chapter.fragment:available?c.entry+' '+copy.hint:copy.hint)}</p></details>`;
  }).join('')}</div>
  <h3 class="story-people-title">${escape(copy.people)}</h3><div class="story-people">${chars.map(c=>`<details><summary>${escape(c.name)} <small>${escape(c.role)}</small></summary><p>${escape(c.backstory)}${completed.has(c.revealStage)?' '+escape(c.secret):''}</p></details>`).join('')}</div>
  ${completed.has(10)?`<article class="story-ending"><small>${escape(copy.ending)}</small><p>${escape(story.ending)}</p></article>`:''}`;
 }
}
