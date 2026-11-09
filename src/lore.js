/**
 * Optional narrative only. No gameplay, progression, storage or scene imports.
 * Short entry/win lines belong between rounds; fragments belong in the archive.
 * Character secrets and the ending must be revealed only after actual completion.
 */
export const STORY = Object.freeze({
  tr: Object.freeze({
    title: 'Son Nota',
    teaser: 'Eski bir kartpostal. Dört usta. Yarım kalmış bir çan ezgisi.',
    prologue: 'Büyükannenin verdiği kartpostalın arkasında bir Maraş tezgâhı, birkaç nota ve tek cümle var: “Döndüğünde sonunu bana anlat.” Adres silinmiş; çizimdeki çanlar hâlâ burada. Sen dondurma almaya geldin. Kadir ise elindeki kâğıdı tanımış gibi bakıyor.',
    ending: 'Haydar kartpostalı çevirir: Son satır silinmemiş; hiç yazılmamış. Büyükannen Nora, ezginin sonunu bir sonraki misafire bırakmış. Ustaların sakladığı tarif, birinin yabancı geldiği yerde kendine yer bulmasının hikâyesiymiş. Bu kez külah senin elinde. Eve götüreceğin cevap da hazır: “Büyükanne, beni de bekliyorlarmış.”',
  }),
  en: Object.freeze({
    title: 'The Last Note',
    teaser: 'An old postcard. Four vendors. A bell tune left unfinished.',
    prologue: 'Your grandmother gave you a postcard with a Maraş cart, a few musical notes and one line: “Tell me how it ends when you return.” The address has faded, but the bells in the drawing are still here. You came for ice cream. Kadir seems to recognize the paper in your hand.',
    ending: 'Haydar turns the postcard over. Its final line never faded; it was never written. Your grandmother Nora left the end of the tune for the next guest. The recipe the vendors kept was a story about finding a place where you arrived as a stranger. This time, the cone is yours. You know what to tell her: “Grandma, they were waiting for me too.”',
  }),
});

export const CHAPTERS = Object.freeze([
  {
    stage: 1, vendor: 0, symbol: '✉',
    tr: {
      title: 'Çizimdeki tezgâh',
      entry: 'Kadir kartpostala eğilir. “Bu çanları bir yerden tanıyorum…”',
      win: '“Çizimdeki eğri çan bizimki! Dedem onu düzeltmeye hiç izin vermedi.”',
      fragmentTitle: 'Eğri duran çan',
      fragment: 'Kartpostaldaki tezgâh bugünkünden küçük. Tentenin bir köşesi sarkıyor, soldaki çan hafifçe eğri duruyor. Kadir çekmeceden eski bir fotoğraf çıkarıyor: aynı çan, aynı eğrilik. Fotoğrafın kenarında, yüzü kadraja girmemiş bir yolcunun eli var. Avucunda boş bir külah tutuyor. Kadir gülüyor: “En azından başlangıçta ikinizin durumu aynı.”',
      retry: 'Kadir külahı yeniden uzatıyor. İlk teklif hâlâ masada.',
    },
    en: {
      title: 'The cart in the drawing',
      entry: 'Kadir leans over the postcard. “I know those bells from somewhere…”',
      win: '“That crooked bell is ours! Grandpa never let anyone straighten it.”',
      fragmentTitle: 'The crooked bell',
      fragment: 'The cart on the postcard is smaller than this one. One corner of the awning sags; the bell on the left hangs crooked. Kadir finds an old photograph in a drawer: the same bell, the same tilt. At the edge is a traveller’s hand, its owner outside the frame, holding an empty cone. Kadir grins. “At least you both started with the same thing.”',
      retry: 'Kadir offers the cone again. The first invitation still stands.',
    },
  },
  {
    stage: 2, vendor: 0, symbol: '◇',
    tr: {
      title: 'Kat yerindeki iz',
      entry: '“Arkasında tarif mi var?” Kadir kâğıdı ışığa tutuyor.',
      win: 'Kat yerinden üç küçük nota çıkıyor. Dördüncü notanın yeri boş.',
      fragmentTitle: 'Üç nota, bir boşluk',
      fragment: 'Kadir önce notaları top sayısı sanıyor. “Üç top isteyip dördüncüden vazgeçmiş olabilir.” Kartın kat yerini açınca çizgilerin çanlara uzandığı görülüyor. Kenardaki küçük N harfinin altında bir parmak izi var; mürekkep değil, kurumuş vişne lekesi. Kadir fotoğrafla kartı yan yana koyuyor. Bir tarif bulmadınız. Aynı günün iki ayrı izini buldunuz. O günü hatırlayabilecek biri var: Pala Usta.',
      retry: '“Dördüncü topu sonra konuşuruz,” diyor Kadir. “Bir daha?”',
    },
    en: {
      title: 'A mark in the fold',
      entry: '“Is there a recipe on the back?” Kadir holds the paper to the light.',
      win: 'Three little notes emerge from the fold. The space for a fourth is empty.',
      fragmentTitle: 'Three notes and a space',
      fragment: 'Kadir first mistakes the notes for scoops. “Maybe someone ordered three and changed their mind about a fourth.” Unfolded, their lines point to the bells. Beneath a small N is a fingerprint made with dried cherry juice, not ink. Kadir places the photograph beside the card. You have not found a recipe, but two traces of the same afternoon. Someone might remember it: Master Pala.',
      retry: '“We can discuss that fourth scoop later,” Kadir says. “Again?”',
    },
  },
  {
    stage: 3, vendor: 1, symbol: 'Ⅱ',
    tr: {
      title: 'İki külah, bir fotoğraf',
      entry: 'Pala fotoğrafa bakıp güler. “O boş külahın öteki yarısını hatırlıyorum.”',
      win: '“Yolcu bana kızmadı. Boş külahı kaldırıp fotoğrafın içine girdi.”',
      fragmentTitle: 'Fotoğrafın dışındaki kahkaha',
      fragment: 'Pala o gün çırakmış. İki külahı ayırırken numarayı erken ele vermiş; kendi ustası kadar yolcu da gülmüş. Yolcu, boş külahı bir ödülmüş gibi havaya kaldırmış. Fotoğraf tam o anda çekilmiş. Pala yıllarca kendisinin ilk başarılı şakası diye anlatmış bunu. Şimdi kartpostala bakınca başka türlü söylüyor: “Sanırım beni utandırmamayı seçmişti.” Fotoğrafın dışındaki yüzü hâlâ hatırlayamıyor. Kahkahasını hatırlıyor.',
      retry: 'Pala iki külahı yeniden iç içe geçiriyor. “Bu defa dikkatli bak.”',
    },
    en: {
      title: 'Two cones, one photograph',
      entry: 'Pala laughs at the photograph. “I remember the other half of that empty cone.”',
      win: '“The traveller wasn’t angry. She raised the empty cone and stepped into the picture.”',
      fragmentTitle: 'Laughter outside the frame',
      fragment: 'Pala was an apprentice that day. He exposed his two-cone trick too soon; the traveller laughed along with his teacher. She raised the empty cone as if it were a prize. That was when the photograph was taken. For years Pala called it his first successful trick. Looking at the postcard, he puts it differently. “I think she decided not to embarrass me.” He cannot quite recall her face. He remembers her laugh.',
      retry: 'Pala nests the cones again. “Watch closely this time.”',
    },
  },
  {
    stage: 4, vendor: 1, symbol: '↻',
    tr: {
      title: 'Çubuğun izi',
      entry: 'Kartın kıvrımlı çizgisi Pala’nın çubuğuyla aynı yolu çiziyor.',
      win: '“Bu bir harita değil. Bizi çizerken elinin izini de kâğıtta bırakmış.”',
      fragmentTitle: 'Gizli olmayan tarif',
      fragment: 'Kâğıttaki kıvrımı önce kayıp bir sokağın yolu sanmıştın. Pala çubuğu ağır ağır çevirdiğinde çizginin ne olduğu anlaşılıyor: dondurmanın uzayıp yeniden toplanan izi. Yolcu onu yakalamaya çalışırken kartın arkasına el hareketlerini çizmiş. Altına tek kelime yazmış: “yeniden”. Pala gizli bir malzeme aramanın boşuna olduğunu söylüyor. Sütü, salebi, emeği herkes biliyor. Aynı hareketi her gün yeniden öğrenmeyi pek kimse fotoğraflamıyor.',
      retry: 'Çizgi bitmedi. Pala çubuğu bir kez daha çeviriyor.',
    },
    en: {
      title: 'The path of the paddle',
      entry: 'The curved line on the card follows the same path as Pala’s paddle.',
      win: '“It isn’t a map. She was drawing us, and left the path of her hand on the paper.”',
      fragmentTitle: 'A recipe with no secret',
      fragment: 'You thought the curve marked a forgotten street. As Pala slowly turns his paddle, its meaning becomes clear: ice cream stretching out and gathering again. The traveller sketched her hand movements on the back of the card while trying to catch it. Underneath she wrote one word: “again”. There is no secret ingredient to discover, Pala says. People know the milk, the salep and the work. They rarely photograph someone learning the same movement anew each day.',
      retry: 'The line has not ended. Pala turns his paddle once more.',
    },
  },
  {
    stage: 5, vendor: 1, symbol: '♪',
    tr: {
      title: 'Aradaki sus',
      entry: 'Pala notaları sayıyor. “Vuruşlar doğru. Ama aradaki boşluğu unuttun.”',
      win: '“O yolcu hep erken alkışlardı. Sonra bize beklemeyi değil, ona yer açmayı öğretti.”',
      fragmentTitle: 'Yanlış yerde gelen alkış',
      fragment: 'Yolcu ezginin bittiğini sanıp her defasında erken alkışlamış. Ustalar gülmüş, sonra ritme onun alkışını da katmış. Kartta bu yüzden notalar eşit aralıklı değil. Pala, boşluğun bir hata olmadığını ilk kez o gün anlamış. Fakat ezginin sonunu hatırlamıyor; o sırada çelik kovaları taşımaya gönderilmiş. “Ben işin gösterişli kısmındaydım,” diyor. “Cezmi, insanların anlattıklarını dinlerdi.”',
      retry: 'Pala çana hafifçe dokunuyor. “Aynı yerden alalım.”',
    },
    en: {
      title: 'The pause between',
      entry: 'Pala counts the notes. “The beats are right. You missed the space between them.”',
      win: '“She always clapped too soon. We learned to make room for her in the tune.”',
      fragmentTitle: 'Applause in the wrong place',
      fragment: 'The traveller kept clapping early, thinking the tune had ended. The vendors laughed, then made her applause part of it. That is why the notes on the card are unevenly spaced. Pala learned that a pause need not be a mistake. He cannot remember the ending: someone sent him to carry the steel tubs. “I was busy with the show,” he says. “Cezmi listened to what people were saying.”',
      retry: 'Pala touches a bell softly. “Let’s take it from there.”',
    },
  },
  {
    stage: 6, vendor: 2, symbol: '▤',
    tr: {
      title: 'Tarif defterinin kenarı',
      entry: 'Cezmi gözlüğünü düzeltir. “Tarif arıyorsan yanlış sayfayı açtın.”',
      win: 'Defterin kenarında ölçüler değil; isimler, küçük çizimler ve yarım cümleler var.',
      fragmentTitle: 'İnsanları unutmamak için',
      fragment: 'Cezmi’nin eski defterinde süt ve salep ölçülerinin yanında yol tarifleri, ödünç alınmış bir tabak ve bir çocuğun çizdiği kedi duruyor. Her misafir bir şey bırakmış. Senin kartındaki çan çizimi de bir sayfanın köşesinde. Yanında şu not var: “Eve tarif götürmek istedi. Önce herkesin adını sordu.” Cezmi defteri kapatmıyor. “Malzemeyi başka yere de götürürsün,” diyor. “Kiminle güldüğünü yazmazsan o kısmı unutursun.”',
      retry: 'Cezmi sayfayı açık bırakıyor. “Ben buradayım. Bir daha dene.”',
    },
    en: {
      title: 'The edge of the recipe book',
      entry: 'Cezmi adjusts his glasses. “If you want a recipe, that is the wrong page.”',
      win: 'The margins hold names, little drawings and unfinished sentences instead of measurements.',
      fragmentTitle: 'So people are remembered',
      fragment: 'Beside the milk and salep measurements in Cezmi’s old notebook are directions, a borrowed plate and a child’s drawing of a cat. Every guest left something. Your postcard’s bells appear in one corner. A note reads: “Wanted a recipe to take home. Asked everyone’s name first.” Cezmi leaves the book open. “You can carry ingredients elsewhere,” he says. “You might forget who made you laugh unless you write that part down.”',
      retry: 'Cezmi keeps the page open. “I’m here. Try again.”',
    },
  },
  {
    stage: 7, vendor: 2, symbol: '✎',
    tr: {
      title: 'Peçetedeki cümle',
      entry: 'Defterden bir peçete düşer. Üstündeki el yazısı büyükanneninki.',
      win: '“Ben de buraya ilk kez geldim.” Demek kartı yazan, ustalardan biri değildi.',
      fragmentTitle: 'Bir başka turist',
      fragment: 'Peçetede birkaç Türkçe kelime, karşılarında büyükannenin kendi dilindeki karşılıkları var. “Bir daha”, “teşekkür ederim”, “hoş bulduk”. Cezmi onun çubuğu tutmayı değil, son kelimeyi doğru söylemeyi daha çok dert ettiğini hatırlıyor. Sen bir aile sırrının izini sürerken, büyükannenin de senin gibi yabancı bir sokağa merakla girdiğini öğreniyorsun. Kimse onu önceden tanımıyormuş. Sonra aynı tezgâhta bütün bir öğleden sonrayı geçirmişler.',
      retry: 'Peçete kaçmıyor. Cezmi’nin külahı için aynı şey söylenemez.',
    },
    en: {
      title: 'A sentence on a napkin',
      entry: 'A napkin slips out of the notebook. The handwriting is your grandmother’s.',
      win: '“It is my first time here too.” The writer was another traveller, not one of the vendors.',
      fragmentTitle: 'Another tourist',
      fragment: 'On the napkin are a few Turkish words with translations in your grandmother’s language: “again”, “thank you”, “glad to be here”. Cezmi recalls that she worried more about pronouncing the last phrase than catching the paddle. You came looking for a family secret and found someone who once entered an unfamiliar street as you did. Nobody knew her beforehand. Then they spent an entire afternoon together at the same cart.',
      retry: 'The napkin is staying put. Cezmi’s cone makes no such promise.',
    },
  },
  {
    stage: 8, vendor: 2, symbol: '·',
    tr: {
      title: 'Silinmemiş boşluk',
      entry: 'Cezmi boş satıra dokunur. “Burada mürekkep yok. Hiç olmamış.”',
      win: 'Eksik nota kaybolmamış. Biri, başka birinin devam edebilmesi için yer bırakmış.',
      fragmentTitle: 'Yarım bırakmanın sebebi',
      fragment: 'Cezmi kartın boş kısmını defterdeki çizimle karşılaştırıyor. İkisinde de aynı yer boş. Yağmur, güneş veya geçen yıllar silmemiş son notayı. Büyükannen bu boşluğu bilerek bırakmış. “Eve dönünce bitiririm mi dedi?” diye soruyorsun. Cezmi başını sallıyor: “Tam tersini söyledi.” Cümlenin devamını o gün Haydar duymuş. Cezmi’nin aklında kalan, ustanın çanları susturup yolcuya cevap vermeden önce gülümsemesi.',
      retry: 'Boş satır seni bekliyor. Bu kez hareketin sonunu gör.',
    },
    en: {
      title: 'A space that never faded',
      entry: 'Cezmi touches the blank line. “There is no ink here. There never was.”',
      win: 'The missing note was not lost. Someone left room for another person to continue.',
      fragmentTitle: 'Why it was left unfinished',
      fragment: 'Cezmi compares the blank part of the postcard with the drawing in his notebook. Both leave the same space. Rain, sunlight and passing years did not erase the final note. Your grandmother left it empty on purpose. “Did she say she would finish it at home?” you ask. Cezmi shakes his head. “Quite the opposite.” Haydar heard the rest. Cezmi remembers the master letting the bells settle and smiling before he answered.',
      retry: 'The empty line can wait. Watch the movement through this time.',
    },
  },
  {
    stage: 9, vendor: 3, symbol: 'N',
    tr: {
      title: 'N harfinin sahibi',
      entry: 'Haydar imzayı hemen tanır. “Nora. Bana da bir kart bırakmıştı.”',
      win: 'Büyükannenin mesajı kısa: “Bir gün benden sonra biri gelirse, ona da yer açın.”',
      fragmentTitle: 'Bir dönüş sözü değil',
      fragment: 'Haydar’ın kartında aynı çanlar var; arkasında Nora’nın tam imzası. Bu bir geri dönme sözü değilmiş. Büyükannen, o öğleden sonranın kendisi gidince de sürmesini istemiş. Pala’nın acemi şakası, Cezmi’nin defteri, adını bilmeden el uzatan insanlar… Hepsini eve götürmenin yolunu aramış. Haydar gülüyor: “Bir tezgâhı zarfa sığdıramadık. Biz de ona, kapısı açık kalacak bir hikâye verdik.”',
      retry: 'Haydar çubuğu yeniden kavrıyor. “Hikâyenin sonuna geldin.”',
    },
    en: {
      title: 'The name behind the N',
      entry: 'Haydar recognizes the signature at once. “Nora. She left me a card too.”',
      win: 'Your grandmother’s message is brief: “If someone comes after me, make room for them too.”',
      fragmentTitle: 'Not a promise to return',
      fragment: 'Haydar’s card has the same bells and Nora’s full signature on the back. It was never a promise to return. Your grandmother wanted that afternoon to continue after she left: Pala’s beginner’s trick, Cezmi’s notebook, people offering a hand before they knew her name. She wanted to take them all home. Haydar smiles. “We couldn’t fit a cart inside an envelope. So we gave her a story that would keep its door open.”',
      retry: 'Haydar takes hold of the paddle again. “You’re near the end of the story.”',
    },
  },
  {
    stage: 10, vendor: 3, symbol: '✦',
    tr: {
      title: 'Son nota senden',
      entry: 'Haydar külahı kaldırır. “Son notayı ben çalmayacağım. Senin sıran.”',
      win: 'Külah elinde. Kartpostalın cevabı bulundu: Bu tezgâhta sana da yer var.',
      fragmentTitle: 'Eve götürülen şey',
      fragment: 'Sonunda büyükannenin bitiremediği bir işi tamamlamadığını anlıyorsun. O, bir sonraki kişinin başlayabileceği bir yer bırakmış. Çan ezgisinin sonu, tek bir doğru nota değil; karşıdan uzanan ele verilen cevapmış. Kadir fotoğrafın kenarında bir yer daha olduğunu söylüyor. Pala bu kez boş külah vermediğine yemin ediyor. Cezmi defterini açıyor. Haydar ise tezgâhın öbür ucundaki yeni misafire dönüyor. Hikâye oradan yeniden başlıyor.',
      retry: 'Haydar külahı biraz yaklaştırıyor. “Hadi, son bir kez.”',
    },
    en: {
      title: 'The last note is yours',
      entry: 'Haydar raises the cone. “I won’t play the last note. It is your turn.”',
      win: 'The cone is in your hand. You have the postcard’s answer: there is room for you here too.',
      fragmentTitle: 'What you take home',
      fragment: 'You realize you have not finished a task your grandmother failed to complete. She left a place where someone else could begin. The tune’s ending was never one correct note, but an answer to an offered hand. Kadir says there is room at the edge of the photograph. Pala swears he did not give you an empty cone this time. Cezmi opens his notebook. Haydar turns to a new guest at the other end of the cart. The story starts again there.',
      retry: 'Haydar brings the cone a little closer. “Come on. One more time.”',
    },
  },
].map((chapter) => Object.freeze({ ...chapter, tr: Object.freeze(chapter.tr), en: Object.freeze(chapter.en) })));

export const CHARACTERS = Object.freeze([
  {
    id: 0, revealStage: 2,
    tr: { name: 'Çırak Kadir', role: 'İzleri birleştiren çırak', backstory: 'Tezgâhın eski çekmecelerini kurcalamayı seviyor. Ustalarının hikâyelerini ezbere biliyor; kendi hikâyesini henüz anlatmış değil.', secret: 'Kartı ilk görüşte tanımadı. Fotoğraftaki eğri çanı fark ederek dört ustanın da unuttuğu bağlantıyı o kurdu.' },
    en: { name: 'Apprentice Kadir', role: 'The apprentice connecting the clues', backstory: 'He likes exploring the cart’s old drawers. He knows his teachers’ stories by heart and has yet to tell one of his own.', secret: 'He did not recognize the card at first. Spotting the crooked bell connected two memories all four vendors had overlooked.' },
  },
  {
    id: 1, revealStage: 5,
    tr: { name: 'Pala Usta', role: 'Şakanın ritmini tutan usta', backstory: 'Çubuğu kadar hikâyelerini de çevirmeyi seviyor. Bir numara ters giderse yeni bir numara başlamış gibi davranıyor.', secret: 'İlk başarılı şakası diye anlattığı günü aslında bir misafirin inceliği kurtarmıştı. Şimdi aynı rahatlığı kendi çıraklarına tanıyor.' },
    en: { name: 'Master Pala', role: 'The keeper of the joke’s rhythm', backstory: 'He enjoys spinning a story as much as a paddle. If a trick goes wrong, he acts as though a new one has just begun.', secret: 'A guest’s kindness saved the day he calls his first successful trick. He now gives his apprentices the same room to stumble.' },
  },
  {
    id: 2, revealStage: 8,
    tr: { name: 'Cezmi Dede', role: 'Tezgâhın hafızası', backstory: 'Gözlüğünün ardından hem dondurmayı hem insanları dikkatle izliyor. Eski tarif defterinin kenarlarında ölçülerden fazlası var.', secret: 'Boşlukların bazıları unutkanlıktan değil, bir başkasını beklemekten kalır. Kartın son satırının hiç yazılmadığını fark eden odur.' },
    en: { name: 'Grandpa Cezmi', role: 'The cart’s memory', backstory: 'Behind his glasses, he watches people as carefully as the ice cream. His old recipe book has more than measurements in its margins.', secret: 'Some gaps come from waiting for another person, not from forgetting. He noticed that the postcard’s last line had never been written.' },
  },
  {
    id: 3, revealStage: 10,
    tr: { name: 'Başusta Haydar', role: 'Son notayı saklayan usta', backstory: 'Tezgâha en erken gelen, son misafir gidince ayrılan usta. Kimin ilk kez geldiğini hemen anlıyor; bunu belli etmiyor.', secret: 'Nora’ya saklı bir tarif vermedi. Yıllar sonra gelecek birinin de aynı sofradan sayılacağına söz verdi; boş notayı bunun için korudu.' },
    en: { name: 'Grandmaster Haydar', role: 'The keeper of the last note', backstory: 'First to arrive, last to leave after the final guest. He recognizes a newcomer at once, but never makes a show of it.', secret: 'He gave Nora no secret recipe. He promised that someone arriving years later would belong at the same table, and kept the blank note for them.' },
  },
].map((character) => Object.freeze({ ...character, tr: Object.freeze(character.tr), en: Object.freeze(character.en) })));

function localeFor(lang) {
  const code = typeof lang === 'string' ? lang.toLowerCase().split(/[-_]/)[0] : 'en';
  return code === 'tr' ? 'tr' : 'en';
}

export function getStory(lang = 'tr') {
  const locale = localeFor(lang);
  return { locale, ...STORY[locale] };
}

export function getChapter(stage, lang = 'tr') {
  const numeric = Number(stage);
  const index = Number.isFinite(numeric) ? Math.max(1, Math.min(10, Math.trunc(numeric))) - 1 : 0;
  const chapter = CHAPTERS[index];
  const locale = localeFor(lang);
  return { stage: chapter.stage, vendor: chapter.vendor, symbol: chapter.symbol, locale, ...chapter[locale] };
}

export function getCharacters(lang = 'tr') {
  const locale = localeFor(lang);
  return CHARACTERS.map((character) => ({ id: character.id, revealStage: character.revealStage, locale, ...character[locale] }));
}

/** Exact completed IDs only: [1, 3] reveals those chapters, never chapter 2. */
export function getUnlockedChapters(completedStageIds, lang = 'tr') {
  const values = Array.isArray(completedStageIds) || completedStageIds instanceof Set ? [...completedStageIds] : [];
  return [...new Set(values.filter((stage) => Number.isInteger(stage) && stage >= 1 && stage <= CHAPTERS.length))]
    .sort((a, b) => a - b)
    .map((stage) => getChapter(stage, lang));
}
