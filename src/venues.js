/** Fictional ice-cream stalls inspired by Istanbul; data shared by UI and scene. */
export const MAX_SCOOPS = 12;
export const CAMPAIGN_STAGE_COUNT = 30;

const venue = (id, names, subtitles, firstStage, palette, lightColor, lightIntensity, propTheme, scoopScale) => Object.freeze({
  id, name: Object.freeze(names), subtitle: Object.freeze(subtitles),
  firstStage, lastStage: firstStage + 4,
  palette: Object.freeze({ ...palette, tiles: palette.tile }),
  lightColor, lightIntensity, propTheme, scoopScale,
});

export const VENUES = Object.freeze([
  venue(
    'istiklal',
    { tr: 'İstiklal', en: 'Istiklal', ar: 'الاستقلال', ru: 'Истикляль', de: 'Istiklal', ja: 'イスティクラル', es: 'Istiklal', pt: 'Istiklal', id: 'Istiklal', hi: 'इस्तिकलाल', ko: '이스티클랄' },
    {
      tr: 'Tramvay köşesindeki ilk tezgâh',
      en: 'The first stall by the tram',
      ar: 'أول عربة آيس كريم عند زاوية الترام',
      ru: 'Первый прилавок у трамвайного угла',
      de: 'Der erste Eisstand an der Straßenbahnecke',
      ja: 'トラム角の最初の屋台',
      es: 'El primer puesto junto al tranvía',
      pt: 'A primeira banca perto do bonde',
      id: 'Gerobak pertama di sudut trem',
      hi: 'ट्राम के कोने वाला पहला स्टॉल',
      ko: '트램 모퉁이의 첫 번째 가판대',
    },
    1,
    { wall: 0x70513a, tile: 0x296d6b, wood: 0x4a2c1c, metal: 0xb89b62, accent: 0xb43f32 }, 0xffe2b8, 1, 'tram', 1
  ),
  venue(
    'galata',
    { tr: 'Galata', en: 'Galata', ar: 'غلطة', ru: 'Галата', de: 'Galata', ja: 'ガラタ', es: 'Gálata', pt: 'Gálata', id: 'Galata', hi: 'गलाटा', ko: '갈라타' },
    {
      tr: 'Taş sokaklarda yeni numaralar',
      en: 'New tricks on the cobbled lanes',
      ar: 'خدع جديدة في الأزقة الحجرية',
      ru: 'Новые трюки на мощёных улочках',
      de: 'Neue Tricks in den Kopfsteinpflastergassen',
      ja: '石畳の路地で始まる新しい技',
      es: 'Nuevos trucos en las calles empedradas',
      pt: 'Novos truques nas ruas de pedra',
      id: 'Trik baru di gang berbatu',
      hi: 'पत्थर की गलियों में नई चालें',
      ko: '자갈길 골목의 새로운 기술',
    },
    6,
    { wall: 0xcfc2a7, tile: 0x3f6668, wood: 0x594331, metal: 0xa9966d, accent: 0x386e71 }, 0xffe6c3, .96, 'tower', 1.025
  ),
  venue(
    'karakoy',
    { tr: 'Karaköy', en: 'Karakoy', ar: 'قره كوي', ru: 'Каракёй', de: 'Karaköy', ja: 'カラキョイ', es: 'Karaköy', pt: 'Karaköy', id: 'Karakoy', hi: 'काराकोय', ko: '카라쾨이' },
    {
      tr: 'Rıhtımda daha büyük siparişler',
      en: 'Bigger orders by the harbor',
      ar: 'طلبات أكبر على رصيف الميناء',
      ru: 'Большие заказы у морской пристани',
      de: 'Größere Bestellungen am Hafenkai',
      ja: '港の桟橋で増える大きな注文',
      es: 'Pedidos más grandes junto al puerto',
      pt: 'Pedidos maiores perto do porto',
      id: 'Pesanan lebih besar di dermaga',
      hi: 'बंदरगाह के पास बड़े ऑर्डर',
      ko: '항구 부두의 더 커진 주문',
    },
    11,
    { wall: 0xd5d5c8, tile: 0x426979, wood: 0x674e3a, metal: 0xb77f56, accent: 0xd17c48 }, 0xe0f0ff, 1.04, 'harbor', 1.06
  ),
  venue(
    'kadikoy',
    { tr: 'Kadıköy', en: 'Kadikoy', ar: 'قاضي كوي', ru: 'Кадыкёй', de: 'Kadıköy', ja: 'カドゥキョイ', es: 'Kadıköy', pt: 'Kadıköy', id: 'Kadikoy', hi: 'कादिकोय', ko: '카드쾨이' },
    {
      tr: 'Çarşının renkli ritmi',
      en: 'The colorful rhythm of the market',
      ar: 'الإيقاع المبهج للسوق الشعبي',
      ru: 'Красочный ритм оживлённого базара',
      de: 'Der farbenfrohe Rhythmus des Basars',
      ja: '市場に響くカラフルなリズム',
      es: 'El ritmo colorido del mercado',
      pt: 'O ritmo colorido do mercado',
      id: 'Irama pasar yang penuh warna',
      hi: 'बाज़ार की रंगीन लय',
      ko: '시장의 다채로운 리듬',
    },
    16,
    { wall: 0xe5d7b9, tile: 0x6d805b, wood: 0x6b4935, metal: 0xc4a16a, accent: 0xa14b67 }, 0xffedc8, 1.02, 'market', 1.1
  ),
  venue(
    'uskudar',
    { tr: 'Üsküdar', en: 'Uskudar', ar: 'أسكدار', ru: 'Ускюдар', de: 'Üsküdar', ja: 'ユスキュダル', es: 'Üsküdar', pt: 'Üsküdar', id: 'Uskudar', hi: 'उस्कुदार', ko: '위스퀴다르' },
    {
      tr: 'Vapur iskelesinde sabır oyunu',
      en: 'A patient duel by the ferry',
      ar: 'مبارزة الصبر عند رصيف العبارات',
      ru: 'Дуэль терпения у паромного причала',
      de: 'Ein Geduldsduell am Fähranleger',
      ja: '連絡船の桟橋で挑む忍耐の勝負',
      es: 'Un duelo de paciencia en el muelle',
      pt: 'Um duelo de paciência na balsa',
      id: 'Duel kesabaran di dermaga feri',
      hi: 'फेरी घाट पर सब्र का इम्तिहान',
      ko: '유람선 선착장의 인내심 대결',
    },
    21,
    { wall: 0xe9e1cb, tile: 0x4f7495, wood: 0x72533d, metal: 0xb19c78, accent: 0x508ba5 }, 0xe3edff, 1, 'ferry', 1.14
  ),
  venue(
    'ustalar-avlusu',
    { tr: 'Ustalar Avlusu', en: 'Masters’ Courtyard', ar: 'ساحة المعلمين', ru: 'Двор мастеров', de: 'Hof der Meister', ja: '名人の中庭', es: 'Patio de los Maestros', pt: 'Pátio dos Mestres', id: 'Pelataran Para Master', hi: 'उस्तादों का आँगन', ko: '장인들의 안뜰' },
    {
      tr: 'Büyüyen siparişler, dört usta, ustalık sınavı',
      en: 'Growing orders, four masters, a test of mastery',
      ar: 'طلبات متزايدة وأربعة معلمين واختبار الإتقان',
      ru: 'Растущие заказы, четыре мастера и экзамен мастерства',
      de: 'Wachsende Bestellungen, vier Meister, die Meisterprüfung',
      ja: '増える注文、四人の親方、名人への試練',
      es: 'Pedidos crecientes, cuatro maestros y la prueba final',
      pt: 'Pedidos crescentes, quatro mestres e o teste final',
      id: 'Pesanan membesar, empat master, ujian kemahiran',
      hi: 'बढ़ते ऑर्डर, चार उस्ताद और महारत की परीक्षा',
      ko: '커지는 주문, 네 명의 장인, 마스터의 시험',
    },
    26,
    { wall: 0xdac9a9, tile: 0x8a4039, wood: 0x583b29, metal: 0xc3a257, accent: 0xbf8d36 }, 0xffddb0, .98, 'courtyard', 1.18
  ),
]);

/** Formats proper Turkish locative (-da/-de/-ta/-te/-nda/-nde + optional -ki) with palatal-l & possessive buffer support. */
export function formatTurkishVenueLocative(placeOrName, withKi = false) {
  const raw = typeof placeOrName === 'string'
    ? placeOrName.trim()
    : String(placeOrName?.name?.tr || '').trim();
  if (!raw) return '';
  const lower = raw.toLocaleLowerCase('tr-TR');
  const hasPossessiveCompound = /\b(avlusu|iskelesi|köşesi|kapısı|meydanı|çarşısı)$/u.test(lower);
  const palatalL = /(istiklal|hilal|cemal|kemal|bilal)$/u.test(lower);
  const vowels = lower.match(/[aıoueiöü]/gu) || [];
  const lastVowel = vowels.at(-1) || 'e';
  const isFront = palatalL || ['e', 'i', 'ö', 'ü'].includes(lastVowel);
  const vowelChar = isFront ? 'e' : 'a';
  const lastChar = lower.slice(-1);
  const isVoiceless = !hasPossessiveCompound && ['f', 's', 't', 'k', 'ç', 'ş', 'h', 'p'].includes(lastChar);
  const consonant = hasPossessiveCompound ? 'nd' : isVoiceless ? 't' : 'd';
  return `${raw}’${consonant}${vowelChar}${withKi ? 'ki' : ''}`;
}

function positiveStage(stage) {
  const number = Number(stage);
  return Number.isFinite(number) ? Math.max(1, Math.floor(number)) : 1;
}

function stageNumber(stage) {
  return Math.min(CAMPAIGN_STAGE_COUNT, positiveStage(stage));
}

export function getVenueForStage(stage) {
  return VENUES[Math.floor((stageNumber(stage) - 1) / 5)];
}

/** Venue capacity grows, but an interactive order always contains exactly the chosen scoops. */
export function getStageOrderOptions(stage) {
  const number = positiveStage(stage), place = getVenueForStage(number);
  const tier = Math.floor((number - 1) / 5);
  const min = 1;
  const max = Math.min(MAX_SCOOPS, Math.max(1, tier) + 3);
  const choices = Array.from({ length: max }, (_, index) => index + 1);
  const earlyDefaults = [2, 2, 3, 3, 3, 3, 4, 4, 4, 4];
  const defaultCount = number <= 10 ? earlyDefaults[number - 1] : number - place.firstStage < 2 ? max - 1 : max;
  return { choices, min, max, default: defaultCount, scoopScale: place.scoopScale, venueId: place.id };
}

/** Stars are a score, never proof of a win. Completion uses explicit wins only. */
export function getVenueProgress(placeOrId, saveData = {}) {
  const place = typeof placeOrId === 'string' ? VENUES.find(entry => entry.id === placeOrId) : placeOrId;
  if (!place) return null;
  const unlockedStage = stageNumber(saveData.unlockedStage || 1);
  const won = new Set(Array.isArray(saveData.completedStages) ? saveData.completedStages : []);
  const stages = Array.from({ length: place.lastStage - place.firstStage + 1 }, (_, i) => place.firstStage + i);
  const completed = stages.filter(stage => won.has(stage)).length;
  const stars = stages.reduce((total, stage) => total + Math.max(0, Math.min(3, Number(saveData.stageStars?.[stage - 1]) || 0)), 0);
  const unlocked = unlockedStage >= place.firstStage;
  const nextStage = stages.find(stage => !won.has(stage)) ?? place.lastStage;
  return { unlocked, completed, total: stages.length, stars, maxStars: stages.length * 3, progress: completed / stages.length, nextStage, cleared: completed === stages.length };
}

/** Per-stage selector metadata so players can replay any unlocked stage 1..30 for 3★ or enter Endless 31+. */
export function getVenueStageEntries(placeOrId, saveData = {}) {
  const place = typeof placeOrId === 'string' ? VENUES.find(entry => entry.id === placeOrId) : placeOrId;
  if (!place) return [];
  const rawUnlocked = positiveStage(saveData.unlockedStage || 1);
  const won = new Set(Array.isArray(saveData.completedStages) ? saveData.completedStages : []);
  const entries = [];
  for (let stage = place.firstStage; stage <= place.lastStage; stage++) {
    const completed = won.has(stage);
    const stars = Math.max(0, Math.min(3, Number(saveData.stageStars?.[stage - 1]) || 0));
    const unlocked = rawUnlocked >= stage || completed;
    entries.push({ stage, unlocked, completed, stars, endless: false });
  }
  if (place.id === 'ustalar-avlusu' && entries.every(e => e.completed)) {
    entries.push({
      stage: Math.max(CAMPAIGN_STAGE_COUNT + 1, rawUnlocked),
      unlocked: true,
      completed: false,
      stars: 0,
      endless: true,
    });
  }
  return entries;
}
