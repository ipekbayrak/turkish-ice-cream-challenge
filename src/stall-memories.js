import { getCulturalDetail } from './cultural-details.js';
import { getVenueForStage } from './venues.js';

export const STALL_MEMORY_TITLE={tr:'Tezgâhın Emaneti',en:'What the Stall Keeps'};
/** Original game fiction. These connections are not claims about Turkish customs. */
export const STALL_MEMORIES=Object.freeze([
 {
  id:'empty-slot',venueId:'karakoy',unlockStage:11,winStage:15,objects:['pearl-inlay-box','copper-milk-pail'],
  tr:{title:'Boş göz',entry:'Sedef kutuda bir göz boş. Kadir, eksik parçanın ne olduğunu söylemiyor.',
   hint:'Sedef kutuya baktın mı? İçinde hâlâ bir boş yer var.',
   clueLive:'Sedef kutudaki boş gözü sen de gördün. Hikâyesi henüz bitmedi.',
   clue:'Kadir kutunun boş gözüne bakıp kapağı kapatır. Cezmi, "Acele etme," der.',
   reveal:'Cezmi o gözü Kadir’in ilk kendi işareti için ayırmış. Kadir henüz bir işaret seçememiş.',
   live:'Kutudaki boş gözü yeni bir işarete ayırdık. O aceleye gelmez.',
   result:'Kutudaki boş göz, Kadir’in ilk işaretini bekliyormuş.',
   returning:'Kutunun boş gözünü sen de biliyorsun. Şimdi izleri birleştirelim.'},
  en:{title:'An empty space',entry:'One space in the inlaid box is empty. Kadir will not say what belongs there.',
   hint:'Have you looked in the inlaid box? There is still an empty space.',
   clueLive:'You saw the empty space in the box. Its story is not finished yet.',
   clue:'Kadir closes the box after looking at its empty space. Cezmi tells him not to hurry.',
   reveal:'Cezmi saved that space for Kadir’s first personal mark. Kadir has not chosen one yet.',
   live:'We saved the empty space for a new mark. Some things cannot be rushed.',
   result:'The empty space was waiting for Kadir’s first personal mark.',
   returning:'You know about the empty space now. Let us follow the clues.'},
 },
 {
  id:'kept-notch',venueId:'kadikoy',unlockStage:16,winStage:20,objects:['tokat-print-block','carved-cooking-spoon'],
  tr:{title:'Saklanan çentik',entry:'Baskı kalıbındaki çentiği Pala onartmamış. Kadir nedenini öğrenmek istiyor.',
   hint:'Baskı kalıbının kenarındaki çentik tesadüf değil. Yakından bak.',
   clueLive:'Çentiği gördün. Onu neden onarmadan sakladığımızı sonra anlatırım.',
   clue:'Pala çentiği düzeltmek isteyen Kadir’in elini durdurmuş. Kalıp hâlâ aynı izi bırakıyor.',
   reveal:'Çentik, Pala’nın ilk başarısız denemesinden kalmış. Cezmi yeni bir kalıp yapmak yerine onu saklamış.',
   live:'O küçük çentiği kapatmadık. Birinin öğrenirken bıraktığı izi silmek istemedik.',
   result:'Pala’nın sakladığı çentik, Kadir’e kusursuz başlaması gerekmediğini anlatıyor.',
   returning:'Çentiği hatırladın mı? Bugün yeni bir denemeye yer açıyoruz.'},
  en:{title:'The notch they kept',entry:'Pala never repaired the notch in the printing block. Kadir wants to know why.',
   hint:'The notch in the printing block is no accident. Take a closer look.',
   clueLive:'You noticed the notch. I will tell you why we kept it without repairing it.',
   clue:'Pala stopped Kadir from repairing the notch. The block still leaves the same mark.',
   reveal:'The notch came from Pala’s first failed attempt. Cezmi kept the block instead of replacing it.',
   live:'We kept the little notch. We did not want to erase the mark of someone learning.',
   result:'Pala’s old notch tells Kadir that a beginning need not be perfect.',
   returning:'Remember the notch? Today there is room for another attempt.'},
 },
 {
  id:'shared-thread',venueId:'uskudar',unlockStage:21,winStage:25,objects:['eyup-acrobat','harbor-tug'],
  tr:{title:'İpi tutan el',entry:'Oyuncak cambazın ipinde yeni bir düğüm var. Haydar onunla övünmüyor.',
   hint:'Cambazın ipindeki yeni düğümü gördün mü? Bu kez iki elin işi.',
   clueLive:'Cambazın yeni düğümünü gördün. Onu tek bir el yapmadı.',
   clue:'Haydar ipi tutarken Kadir düğümü atmış. Küçük römorkörün yanına bu yüzden konmuş.',
   reveal:'Kadir oyuncağı tek başına onarmaya çalışmış. Haydar yalnız ipi tutmuş; düğümü Kadir’e bırakmış.',
   live:'Biri ipi tutar, öteki düğümü atar. Bu tezgâhta her şeyi tek başına yapmak gerekmez.',
   result:'Kadir’in düğümü yerinde duruyor. Haydar ona yalnızca bir el uzatmış.',
   returning:'Düğüm hâlâ sağlam. Sırayı sana bırakabileceğimizi biliyoruz.'},
  en:{title:'The hand on the thread',entry:'The toy acrobat has a new knot in its thread. Haydar says little about it.',
   hint:'Did you see the new knot on the acrobat? Two hands worked on it this time.',
   clueLive:'You saw the acrobat’s new knot. One hand did not make it alone.',
   clue:'Haydar held the thread while Kadir tied the knot. That is why it stands beside the little tugboat.',
   reveal:'Kadir first tried to repair the toy alone. Haydar only held the thread and let Kadir tie the knot.',
   live:'One holds the thread, another ties the knot. Nobody has to do everything alone here.',
   result:'Kadir’s knot is holding. Haydar only lent him a hand.',
   returning:'The knot is still holding. We know we can leave the next turn to you.'},
 },
 {
  id:'apprentice-mark',venueId:'ustalar-avlusu',unlockStage:26,winStage:30,objects:['leather-bound-book','guest-serving-tray'],
  tr:{title:'Kadir’in işareti',entry:'Defterde temiz bir sayfa açık. Misafir tepsisinde küçük bir damga bekliyor.',
   hint:'Defterin yeni sayfasına bak. Bu kez eksik bir tarif arama.',
   clueLive:'Damga ve defter yan yana. Bugün neyin iz bırakacağını birlikte göreceğiz.',
   clue:'Kadir’in küçük damgası misafir tepsisinde duruyor. Defterdeki temiz yer henüz ona dokunmamış.',
   reveal:'Kadir kendi işareti olarak eğri bir çan çizmiş. İlk misafirin gülüşünü seninle birlikte deftere koymuş.',
   live:'Defterde artık Kadir’in de işareti var. İlk misafirini hatırlamasına sen yardım ettin.',
   self:'Deftere sonunda kendi işaretimi koydum. İlk misafirimi seninle hatırlayacağım.',
   result:'Kadir’in eğri çanı boş sayfayı doldurdu. Sen de ilk işaretinin tanığı oldun.',
   returning:'O küçük işareti gördün mü? Tezgâhın hikâyesinde artık senin de izin var.'},
  en:{title:'Kadir’s mark',entry:'A clean page lies open. A small stamp waits on the guest tray.',
   hint:'Look at the new page in the notebook. This time, do not look for a missing recipe.',
   clueLive:'The stamp and book are together. We will see what leaves a mark today.',
   clue:'Kadir’s little stamp rests on the guest tray. The clean space in the notebook is still untouched.',
   reveal:'Kadir chose a crooked bell as his own mark. With you, he put his first guest’s smile into the book.',
   live:'Kadir has his own mark in the notebook now. You helped him remember his first guest.',
   self:'I finally put my own mark in the notebook. I will remember my first guest with you.',
   result:'Kadir’s crooked bell filled the clean page. You witnessed his first personal mark.',
   returning:'Did you see the little mark? Your visit is part of the stall’s story now.'},
 },
].map(m=>Object.freeze({...m,objects:Object.freeze(m.objects),tr:Object.freeze(m.tr),en:Object.freeze(m.en),provenance:'original-game-fiction'})));
const KEY='maras-stall-memories-v1';
const BY_ID=new Map(STALL_MEMORIES.map(m=>[m.id,m]));
const HEARD_KEYS=new Set(STALL_MEMORIES.flatMap(m=>['hint','clue','reveal'].map(kind=>`${kind}:${m.id}`)));
const locale=lang=>lang==='tr'?'tr':'en';
const stages=values=>new Set((Array.isArray(values)?values:[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=30));
function browserStorage(){try{return globalThis.localStorage;}catch{return null;}}
export function stallMemoryForVenue(stage){const venue=getVenueForStage(stage);return STALL_MEMORIES.find(m=>m.venueId===venue.id)||null;}
export function laterVenueStory(stage,lang='tr') {const m=stallMemoryForVenue(stage);return m?{id:m.id,...m[locale(lang)]}:null;}

/** Derived from discoveries + actual wins; this store only remembers which lines
 * have already been heard. It never writes the game save or discovery save. */
export class StallMemoryProgress {
 constructor(storage=browserStorage()){
  this.storage=storage;this.discovered=new Set();this.wins=new Set();this.unlockedStage=1;this.earned=new Set();this.heard=new Set();
  try{const data=JSON.parse(storage?.getItem(KEY)||'[]');if(Array.isArray(data))for(const id of data)if(HEARD_KEYS.has(id))this.heard.add(id);}catch{}
 }
 setContext({completedStages=[],unlockedStage=1,discoveredIds}={}){
  this.wins=stages(completedStages);const unlocked=Number(unlockedStage);this.unlockedStage=Number.isFinite(unlocked)?Math.max(1,Math.min(30,Math.floor(unlocked)||1)):1;
  if(discoveredIds!==undefined){this.discovered=new Set((Array.isArray(discoveredIds)?discoveredIds:[]).filter(id=>getCulturalDetail(id)));}
  const previous=this.earned;this.earned=new Set();
  for(const [index,memory]of STALL_MEMORIES.entries()){
   const previousReady=index===0||this.earned.has(STALL_MEMORIES[index-1].id);
   if(previousReady&&memory.unlockStage<=this.unlockedStage&&this.wins.has(memory.winStage)&&memory.objects.some(id=>this.discovered.has(id)))this.earned.add(memory.id);
  }
  return [...this.earned].filter(id=>!previous.has(id));
 }
 discover(id,venueId){const item=getCulturalDetail(id);if(!item||item.venueId!==venueId||item.unlockStage>this.unlockedStage)return false;this.discovered.add(id);return true;}
 card(id,venueId,lang='tr'){
  const item=getCulturalDetail(id);if(!item||item.venueId!==venueId||item.unlockStage>this.unlockedStage||!this.discovered.has(id))return null;
  const memory=STALL_MEMORIES.find(m=>m.venueId===venueId&&m.objects.includes(id));if(!memory)return null;
  return memory[locale(lang)][this.earned.has(memory.id)?'reveal':'clue'];
 }
 nextBeat(stage,lang='tr',vendor=0){
  const candidates=STALL_MEMORIES.filter(m=>m.unlockStage<=stage&&m.unlockStage<=this.unlockedStage);
  const earned=candidates.find(m=>this.earned.has(m.id)&&!this.heard.has(`reveal:${m.id}`));
  if(earned)return this.beat(earned,'reveal',lang,vendor);
  const local=stallMemoryForVenue(stage);if(!local||local.unlockStage>this.unlockedStage)return null;
  if(local.objects.some(id=>this.discovered.has(id))&&!this.earned.has(local.id)&&!this.heard.has(`clue:${local.id}`))return this.beat(local,'clue',lang,vendor);
  if(!this.earned.has(local.id)&&!this.heard.has(`hint:${local.id}`)&&!local.objects.some(id=>this.discovered.has(id)))return this.beat(local,'hint',lang,vendor);
  return null;
 }
 beat(memory,kind,lang,vendor){const text=memory[locale(lang)];return {id:`${kind}:${memory.id}`,memoryId:memory.id,kind,text:kind==='reveal'?(vendor===0&&text.self?text.self:text.live):kind==='clue'?text.clueLive:text.hint,focus:'ledger'};}
 markHeard(id){if(!HEARD_KEYS.has(id))return;this.heard.add(id);try{this.storage?.setItem(KEY,JSON.stringify([...this.heard]));}catch{}}
 result(id,lang='tr'){return BY_ID.get(id)?.[locale(lang)].result||null;}
 get earnedIds(){return [...this.earned];}
}
