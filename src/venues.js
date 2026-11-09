/** Fictional ice-cream stalls inspired by Istanbul; data shared by UI and scene. */
export const MAX_SCOOPS = 12;
export const CAMPAIGN_STAGE_COUNT = 30;

const venue = (id, tr, en, subtitleTr, subtitleEn, firstStage, palette, lightColor, lightIntensity, propTheme, scoopScale) => Object.freeze({
  id, name: Object.freeze({ tr, en }), subtitle: Object.freeze({ tr: subtitleTr, en: subtitleEn }),
  firstStage, lastStage: firstStage + 4,
  palette: Object.freeze({ ...palette, tiles: palette.tile }),
  lightColor, lightIntensity, propTheme, scoopScale,
});

export const VENUES = Object.freeze([
  venue('istiklal', 'İstiklal', 'Istiklal', 'Tramvay köşesindeki ilk tezgâh', 'The first stall by the tram', 1,
    { wall: 0x70513a, tile: 0x296d6b, wood: 0x4a2c1c, metal: 0xb89b62, accent: 0xb43f32 }, 0xffe2b8, 1, 'tram', 1),
  venue('galata', 'Galata', 'Galata', 'Taş sokaklarda yeni numaralar', 'New tricks on the cobbled lanes', 6,
    { wall: 0xcfc2a7, tile: 0x3f6668, wood: 0x594331, metal: 0xa9966d, accent: 0x386e71 }, 0xffe6c3, .96, 'tower', 1.025),
  venue('karakoy', 'Karaköy', 'Karakoy', 'Rıhtımda daha büyük siparişler', 'Bigger orders by the harbor', 11,
    { wall: 0xd5d5c8, tile: 0x426979, wood: 0x674e3a, metal: 0xb77f56, accent: 0xd17c48 }, 0xe0f0ff, 1.04, 'harbor', 1.06),
  venue('kadikoy', 'Kadıköy', 'Kadikoy', 'Çarşının renkli ritmi', 'The colorful rhythm of the market', 16,
    { wall: 0xe5d7b9, tile: 0x6d805b, wood: 0x6b4935, metal: 0xc4a16a, accent: 0xa14b67 }, 0xffedc8, 1.02, 'market', 1.1),
  venue('uskudar', 'Üsküdar', 'Uskudar', 'Vapur iskelesinde sabır oyunu', 'A patient duel by the ferry', 21,
    { wall: 0xe9e1cb, tile: 0x4f7495, wood: 0x72533d, metal: 0xb19c78, accent: 0x508ba5 }, 0xe3edff, 1, 'ferry', 1.14),
  venue('ustalar-avlusu', 'Ustalar Avlusu', 'Masters’ Courtyard', 'Büyüyen siparişler, dört usta, ustalık sınavı', 'Growing orders, four masters, a test of mastery', 26,
    { wall: 0xdac9a9, tile: 0x8a4039, wood: 0x583b29, metal: 0xc3a257, accent: 0xbf8d36 }, 0xffddb0, .98, 'courtyard', 1.18),
]);

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
