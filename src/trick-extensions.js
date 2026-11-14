import {scrapeServing,scrapeBladePoint} from './scrape-serving.js';
import {NapkinReturn,napkinReturnCue} from './napkin-return.js';
import { RESEARCHED_SERVICE_CATALOG, enterResearchedService, updateResearchedService, researchedServiceCue } from './researched-service.js';
import * as THREE from 'three';
import { CUSTOMER_SERVICE_CATALOG, enterCustomerService, updateCustomerService, customerServiceCue, customerServiceTarget, reachVisibleService } from './customer-service.js';
import { LAYERED_SERVICE_ID, enterLayeredService, updateLayeredService, layeredServiceCue } from './serving-sequence.js';
import { MARAS_FLOURISH_CATALOG, enterMarasFlourish, updateMarasFlourish, marasFlourishCue } from './maras-flourish-tricks.js';

/**
 * Authored playable arrangements of real dondurma service gestures, not canonical
 * named folk routines. Primary references: GoTürkiye's serving/pull-away account
 * https://goturkiye.com/blog/traditional-maras-ice-cream-and-its-history
 * and Vedat Dumanli's original demonstration published by GoPro:
 * https://www.youtube.com/watch?v=Jx_NjpeBqQw
 * First-person photos/video of transferring ice between cones:
 * https://daydreamtourist.com/2012/07/05/istanbul-ice-cream-show/
 * The extra-scoop take-back is described in that first-person account. No steel
 * container is presented as edible ice cream; the full mold is solid tub-shaped ice.
 */
export const EXTRA_TRICK_CATALOG = [
  ...RESEARCHED_SERVICE_CATALOG,
  ...CUSTOMER_SERVICE_CATALOG,
  {
    id: LAYERED_SERVICE_ID, icon: '🍦🧻', difficulty: 4, category: 'cone_deception',
    provenance: 'user-authored-service-combination',
    names: {
      tr: 'Külah, Peçete, Bir Daha',
      en: 'Cone, Paper, Once More',
      ar: 'قمع، منديل، ومرة أخرى',
      ru: 'Рожок, салфетка и ещё раз',
      de: 'Waffel, Serviette, noch einmal',
      ja: 'コーン、ナプキン、もう一度',
    },
    descs: {
      tr: 'İç içe külahlar ayrılır; boş külah, peçete ve gerçek servis sırayla el değiştirir. Usta son teklifi peçeteyle sararak tamamlar.',
      en: 'Nested cones separate; the empty wafer, paper and real serving change hands in sequence. The final offer is wrapped in paper.',
      ar: 'تنفصل الأقماع المتداخلة؛ يتنقل القمع الفارغ والمنديل والتقديم الحقيقي بالتتابع مع تغليف العرض الأخير بالورق.',
      ru: 'Вложенные рожки разделяются: пустой вафельный рожок, салфетка и настоящее мороженое по очереди переходят из рук в руки.',
      de: 'Ineinandergesteckte Waffeln trennen sich; leere Waffel, Serviette und echtes Eis wechseln der Reihe nach den Besitzer.',
      ja: '重ねたコーンが分かれ、空コーン・ナプキン・本物のアイスが順番に入れ替わる多段サービストリック！',
    },
    evidence: 'A user-authored sequence combining service gestures; not a separately documented traditional routine.',
  },
  {
    id: 'WHOLE_MOLD_ON_CONE', icon: '🧊🍦', difficulty: 2, category: 'elastic_mass',
    provenance: 'recreated-service-gesture',
    names: { tr: 'Külahta Koca Kalıp', en: 'Whole Mold on a Cone', ar: 'قالب كامل فوق القمع', ru: 'Целый блок на рожке', de: 'Ganzer Eisblock auf der Waffel', ja: 'コーンの上の巨大アイス' },
    descs: {
      tr: 'Usta kovadaki kalıbın tamamını minicik külahın üstüne oturtur. Dev teklife kanma; kalıp kovaya dönünce gerçek külaha uzan.',
      en: 'The vendor balances the whole tub-shaped mold on a tiny cone. Wait out the giant offer, then reach after the mold returns to its tub.',
      ar: 'يضع البائع قالب البوظة الكامل فوق قمع صغير! لا تنخدع بالعرض الضخم وانتظر حتى يعود القالب للحوض.',
      ru: 'Мастер водружает целый блок мороженого на маленький рожок. Пережди гигантскую подачу и хватай после возврата блока!',
      de: 'Der Verkäufer setzt den gesamten Eisblock auf eine kleine Waffel. Warte ab, bis der Block zurück im Kessel ist!',
      ja: '小さなコーンの上に樽ごとの巨大アイス塊を乗せる！塊が釜に戻ってから本物のコーンを掴め！',
    },
  },
  {
    id: 'SCOOP_LIFT_BACK', icon: '🍦🥄', difficulty: 3, category: 'cone_deception',
    provenance: 'recreated-service-gesture',
    names: { tr: 'Üstü Gitti, Külah Kaldı', en: 'Scoops Back on the Paddle', ar: 'القمع الفارغ', ru: 'Мороженое ушло с рожка', de: 'Eis zurück am Stab', ja: 'アイスだけが逃げた' },
    descs: {
      tr: 'Toplar külahın üzerinden çubuğa kayar; sana gerçekten boş külah uzatılır. Boşu alırsan çubuktaki dondurmanın altına geri götür.',
      en: 'The real scoops lift back onto the paddle, leaving an actually empty cone. If you take the empty cone, return it underneath the scoops.',
      ar: 'ترتفع كرات البوظة عائدة إلى العصا ويبقى القمع فارغاً في يدك! أعد القمع الفارغ أسفل البوظة.',
      ru: 'Шарики мороженого снимаются обратно на шест, оставляя пустой рожок. Верни пустой рожок под мороженое!',
      de: 'Die Eiskugeln gleiten zurück an den Stab und lassen eine leere Waffel zurück. Halte sie wieder unter das Eis!',
      ja: 'アイスの玉だけが棒に戻り、手には空のコーンが残る！空コーンをアイスの下へ戻して合体させろ！',
    },
  },
  {
    id: 'BONUS_SCOOP_TAKEBACK', icon: '🍦🥄', difficulty: 3, category: 'cone_deception',
    provenance: 'documented-service-gesture',
    source: 'https://daydreamtourist.com/2012/07/05/istanbul-ice-cream-show/',
    names: { tr: 'Bir Top Daha İster Misin?', en: 'One More Scoop?', ar: 'كرة أخرى؟', ru: 'Ещё один шарик?', de: 'Noch eine Kugel?', ja: 'もうひと玉いかが？' },
    descs: {
      tr: 'Gerçek külah elindeyken usta bir top daha teklif eder. Külahı uzatınca çubuğa geri yapıştırıp kaçırır; fazladan topu kovaya geri koyar. Külahı yeniden yakala!',
      en: 'With the real cone in your hand, the vendor offers an extra scoop. Bring your cone closer and it sticks back to the paddle! He returns the bait scoop to its tub; catch your cone again.',
      ar: 'بينما القمع الحقيقي في يدك يعرض عليك البائع كرة إضافية، فيلصق قمعك بالعصا ويسحبه! امسك قمعك مجدداً!',
      ru: 'Когда рожок уже у тебя, мастер предлагает еще шарик, приклеивает рожок обратно к шесту и уводит! Поймай рожок снова!',
      de: 'Mit der echten Waffel in der Hand bietet der Meister noch eine Kugel an und zieht deine Waffel am Stab weg! Fang sie wieder!',
      ja: '手にしたコーンに「もうひと玉」と誘いかけ、棒にくっつけて奪い返す！もう一度コーンをキャッチせよ！',
    },
  },
  ...MARAS_FLOURISH_CATALOG,
  {
    id: 'PENDULUM_BELL_SWING', icon: '🕰️🔔', difficulty: 2, category: 'rhythm_trap',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Sarkaç Çan Salınımı',
      en: 'Pendulum Bell Swing',
      ar: 'أرجوحة الجرس البندولية',
      ru: 'Маятник с колокольчиком',
      de: 'Pendel-Glockenschwung',
      ja: '振り子ベルスイング',
    },
    descs: {
      tr: 'Külahı saat sarkacı gibi sağa sola sallarken her uçta çana dokunur! Salınım sırasında uzanma, ortada durduğunda yakala!',
      en: 'Swings the cone left and right like a clock pendulum, chiming a bell at each peak! Wait out the swing and catch when it settles in the center!',
      ar: 'يؤرجح القمع يميناً ويساراً كبندول الساعة مع دق الجرس! انتظر حتى يتوقف في المنتصف ثم امسكه!',
      ru: 'Раскачивает рожок влево-вправо как маятник часов со звоном! Не тянись во время качания — лови в центре!',
      de: 'Schwingt die Waffel wie ein Uhrpendel hin und her mit Glockenschlag! Warte ab und greif in der Mitte zu!',
      ja: '時計の振り子のようにコーンを左右に揺らしてベルを鳴らす！揺れている間は我慢し、中央で止まった瞬間に掴め！',
    },
  },
  {
    id: 'SHOULDER_FAKEOUT_PIVOT', icon: '🕺🍦', difficulty: 2, category: 'sleight_of_hand',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Omuzdan Sahte Dönüş',
      en: 'Over-the-Shoulder Feint',
      ar: 'خدعة الدوران فوق الكتف',
      ru: 'Финт через плечо',
      de: 'Schulter-Drehfinte',
      ja: '肩越しフェイントターン',
    },
    descs: {
      tr: 'Külahı aniden sol omzuna kaldırıp sağ aşağıya sahte dalış yapar! Çubuğu çevirip ortaya sunduğunda yakala!',
      en: 'Pivots the cone high toward his shoulder, fakes a low dip to the side, then spins it back to center for the catch!',
      ar: 'يرفع القمع نحو كتفه ثم يموه بالهبوط جانباً قبل أن يعيده للمنتصف!',
      ru: 'Уводит рожок к плечу, делает ложный нырок вбок и возвращает в центр — лови!',
      de: 'Zieht die Waffel hoch zur Schulter, täuscht tief zur Seite an und serviert sie dann mittig!',
      ja: 'コーンを肩の高さへ引き上げ、斜め下へフェイントしてから中央へ差し出す！',
    },
  },
  {
    id: 'ZIGZAG_LIGHTNING_TEASE', icon: '⚡🍦', difficulty: 2, category: 'paddle_spin',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Zikzak Şimşek Kaçışı',
      en: 'Zigzag Lightning Evasion',
      ar: 'مراوغة البرق المتعرجة',
      ru: 'Зигзаг молнии',
      de: 'Zickzack-Blitzfinte',
      ja: 'ジグザグ稲妻フェイント',
    },
    descs: {
      tr: 'Külahı tezgahta üç köşe arasında şimşek gibi zikzak çizerek kaçırır! Zikzak bitip külah sabitlenince yakala!',
      en: 'Darts the cone across three rapid diagonal corners in a lightning zigzag! Catch it as soon as it locks in place!',
      ar: 'يحرك القمع بسرعة البرق في مسار متعرج بين ثلاث زوايا! امسكه عندما يثبت!',
      ru: 'Молниеносно водит рожком зигзагом по трем углам! Хватай, когда он замрет!',
      de: 'Zieht die Waffel blitzschnell im Zickzack durch drei Ecken! Greif zu, sobald sie stillsteht!',
      ja: 'コーンを稲妻のように3つのコーナーへジグザグ移動させる！ピタッと止まった瞬間にキャッチ！',
    },
  },
  {
    id: 'CROWN_TAP_KISS_TEASE', icon: '👃🍦', difficulty: 2, category: 'acrobatics',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Burnun Ucunda Dokun-Kaç',
      en: 'Nose-Tip Tap & Pull',
      ar: 'لمسة طرف الأنف والانسحاب',
      ru: 'Касание у носа и рывок',
      de: 'Nasenspitzen-Antippen',
      ja: '鼻先タッチ＆プル',
    },
    descs: {
      tr: 'Dondurmayı burnunun ucuna kadar yaklaştırıp eğerek kışkırtır, sonra tam tur çevirip geri çeker! İkinci sunuşta yakala!',
      en: 'Brings the cone right up to your nose with a playful tilt, then yanks it back with a spin! Catch it on the real offer!',
      ar: 'يقرب البوظة حتى طرف أنفك ثم يسحبها بدوران سريع! امسكها في التقديم الثاني!',
      ru: 'Подносит мороженое прямо к носу с наклоном и резко уводит с вращением! Лови со второй подачи!',
      de: 'Hält dir das Eis frech bis vor die Nasenspitze, zieht es mit einem Dreh weg und bietet es dann echt an!',
      ja: '鼻先スレスレまでアイスを近づけて挑発し、クルッと回転させて引っ込める！2回目の差し出しで掴め！',
    },
  },
  {
    id: 'SPIRAL_CROWN_ASCENT', icon: '🌪️🍦', difficulty: 2, category: 'paddle_spin',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Burgu Kule Yükselişi',
      en: 'Spiral Tower Ascent',
      ar: 'صعود البرج اللولبي',
      ru: 'Спиральный подъем',
      de: 'Spiral-Turmaufstieg',
      ja: 'スパイラルタワー上昇',
    },
    descs: {
      tr: 'Külahı çubuğun ucunda burgu gibi döndüre döndüre aşağıdan tepeye yükseltir, sonra hızla ortaya indirir! İndiği anda yakala!',
      en: 'Spirals the cone upward in a tight corkscrew from low to high while spinning the rod, then drops it cleanly to center for the catch!',
      ar: 'يرفع القمع بحركة لولبية من الأسفل للأعلى مع تدوير العصا ثم ينزله للمنتصف!',
      ru: 'Поднимает рожок по спирали снизу вверх с вращением, затем опускает в центр — хватай!',
      de: 'Schraubt die Waffel spiralförmig von unten nach oben und senkt sie dann mittig zum Fangen!',
      ja: 'コーンを螺旋状に回転させながら下から上へせり上げ、中央へスッと下ろす！その瞬間を掴め！',
    },
  },
];

const FLOURISH_EXTRA_IDS = new Set([
  'PENDULUM_BELL_SWING',
  'SHOULDER_FAKEOUT_PIVOT',
  'ZIGZAG_LIGHTNING_TEASE',
  'CROWN_TAP_KISS_TEASE',
  'SPIRAL_CROWN_ASCENT',
]);

const EXTRA_IDS = new Set(EXTRA_TRICK_CATALOG.map((t) => t.id));
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (x) => { const p = THREE.MathUtils.clamp(x, 0, 1); return p * p * (3 - 2 * p); };
const mix = (a, b, t) => a.clone().lerp(b, ease(t));
const flavorFor = (d) => d._getFlavorForScoop(Math.max(0, d.scoopCount - 1));
const conePoint = (d) => {
  d.world.scene.updateMatrixWorld(true);
  return d.world.conePivot.getWorldPosition(V());
};
const reward = (d, points, icon) => {
  d.score += points;
  d._spawnScorePopup(points, d.coneWorldPos, icon);
  d.sound.playGripTug(0);
  d._vibrate(25);
};
const toPhase = (d, phase) => { d.subStep = phase; d.stageTimer = 0; d.stepCooldown = 0; };

export function enterExtraTrick(d) {
  if (!EXTRA_IDS.has(d.currentMechanic)) return false;
  if (enterResearchedService(d)) return true;
  if (enterCustomerService(d)) return true;
  if (d.currentMechanic === LAYERED_SERVICE_ID) { enterLayeredService(d); return true; }
  if (enterMarasFlourish(d)) return true;
  d.extraTrick = { returnStart: null, scoopStart: null, heldAt: null, entryPos: d.coneWorldPos.clone(), bell1: false, bell2: false };
  d.world.updateIceCreamScoops(d.scoopCount, false);
  d.coneTargetPos.set(0.08, 1.22, 0.27);
  if (d.currentMechanic === 'WHOLE_MOLD_ON_CONE') {
    d.world.setGiantBlockColor(flavorFor(d).colorHex);
    // Keep the ordered scoops visible until the arriving mold occludes them.
    d._triggerVendorSpeech('giant');
  } else if (d.currentMechanic === 'SCOOP_LIFT_BACK') d._triggerVendorSpeech('empty_trap');
  else d._triggerVendorSpeech('hoppa');
  return true;
}

/** Returns true only for an extra trick; original switch cases stay untouched. */
export function updateExtraTrick(d, dt, time, input) {
  if (!EXTRA_IDS.has(d.currentMechanic)) return false;
  if (updateResearchedService(d, dt, time, input)) return true;
  if (updateCustomerService(d, dt, time, input)) return true;
  if (d.currentMechanic === LAYERED_SERVICE_ID) { updateLayeredService(d, dt, time, input); return true; }
  if (updateMarasFlourish(d, dt, time, input)) return true;
  const { intentPos, gestureState, validReach } = input;
  const world = d.world;
  const flav = flavorFor(d);
  const tub = d._getTubWorldPosForScoop(Math.max(0, d.scoopCount - 1));
  const state = d.extraTrick;

  if (FLOURISH_EXTRA_IDS.has(d.currentMechanic)) {
    const start = state.entryPos ||= d.coneWorldPos.clone();
    const t = d.stageTimer;
    if (d.currentMechanic === 'PENDULUM_BELL_SWING') {
      if (d.subStep === 0) {
        const target = V(Math.sin(t * Math.PI * 2.4) * 0.24, 1.30 - Math.cos(t * Math.PI * 4.8) * 0.05, 0.23);
        d.coneTargetPos.copy(mix(start, target, Math.min(1, t / 0.30)));
        d.coneFlipZ = Math.sin(t * Math.PI * 2.4) * 0.20 * ease(t / 0.25);
        d.shaftRoll = Math.cos(t * Math.PI * 2.4) * 0.32 * ease(t / 0.25);
        if (t >= 0.35 && !state.bell1) { state.bell1 = true; world.ringBells?.([0]); d.sound.playBellStrike?.(1); }
        if (t >= 0.85 && !state.bell2) { state.bell2 = true; world.ringBells?.([1]); d.sound.playBellStrike?.(2); }
        if (t > 0.20 && t < 1.35 && d.stepCooldown <= 0 && d.gestureValidation.reach('feint-penalty', intentPos.distanceTo(d.coneWorldPos), 0.25, dt)) {
          d.stepCooldown = 0.8; d._triggerVendorSpeech('laugh'); if (d._loseHeart(d.coneWorldPos, '🔔')) return true;
        }
        if (t >= 1.50) { d.coneFlipZ = 0; d.shaftRoll = 0; toPhase(d, 1); d._triggerVendorSpeech('hoppa'); }
      } else {
        d.coneFlipZ = 0; d.shaftRoll = 0;
        d.coneTargetPos.set(0.02 + Math.sin(time * 2.2) * 0.03, 1.22, 0.28);
        if (validReach(0.28)) { reward(d, 340, '🔔'); d._advanceRoutineStep(); }
      }
      return true;
    }
    if (d.currentMechanic === 'SHOULDER_FAKEOUT_PIVOT') {
      if (d.subStep === 0) {
        const high = V(-0.22, 1.40, 0.16), dip = V(0.22, 1.16, 0.25), center = V(-0.04, 1.23, 0.28);
        if (t < 0.50) { d.coneTargetPos.copy(mix(start, high, t / 0.50)); d.shaftRoll = ease(t / 0.50) * 1.2; }
        else if (t < 1.05) { d.coneTargetPos.copy(mix(high, dip, (t - 0.50) / 0.55)); d.shaftRoll = 1.2 - ease((t - 0.50) / 0.55) * 2.4; }
        else { d.coneTargetPos.copy(mix(dip, center, (t - 1.05) / 0.45)); d.shaftRoll = -1.2 * (1 - ease((t - 1.05) / 0.45)); }
        if (t > 0.20 && t < 1.35 && d.stepCooldown <= 0 && d.gestureValidation.reach('feint-penalty', intentPos.distanceTo(d.coneWorldPos), 0.25, dt)) {
          d.stepCooldown = 0.8; d._triggerVendorSpeech('eeeh'); if (d._loseHeart(d.coneWorldPos, '🕺')) return true;
        }
        if (t >= 1.50) { d.shaftRoll = 0; toPhase(d, 1); d._triggerVendorSpeech('yakala'); }
      } else {
        d.shaftRoll = 0;
        d.coneTargetPos.set(-0.04 + Math.sin(time * 2.0) * 0.03, 1.23, 0.28);
        if (validReach(0.28)) { reward(d, 350, '🕺'); d._advanceRoutineStep(); }
      }
      return true;
    }
    if (d.currentMechanic === 'ZIGZAG_LIGHTNING_TEASE') {
      if (d.subStep === 0) {
        const c1 = V(-0.22, 1.36, 0.20), c2 = V(0.22, 1.18, 0.25), c3 = V(-0.16, 1.37, 0.19), c4 = V(0.04, 1.22, 0.28);
        if (t < 0.38) d.coneTargetPos.copy(mix(start, c1, t / 0.38));
        else if (t < 0.76) d.coneTargetPos.copy(mix(c1, c2, (t - 0.38) / 0.38));
        else if (t < 1.14) d.coneTargetPos.copy(mix(c2, c3, (t - 0.76) / 0.38));
        else d.coneTargetPos.copy(mix(c3, c4, (t - 1.14) / 0.36));
        d.shaftRoll = Math.sin(t * Math.PI * 3.5) * 0.38;
        if (t > 0.20 && t < 1.35 && d.stepCooldown <= 0 && d.gestureValidation.reach('feint-penalty', intentPos.distanceTo(d.coneWorldPos), 0.25, dt)) {
          d.stepCooldown = 0.8; d._triggerVendorSpeech('laugh'); if (d._loseHeart(d.coneWorldPos, '⚡')) return true;
        }
        if (t >= 1.50) { d.shaftRoll = 0; toPhase(d, 1); d._triggerVendorSpeech('hoppa'); }
      } else {
        d.shaftRoll = 0;
        d.coneTargetPos.set(0.04 + Math.sin(time * 2.4) * 0.03, 1.22, 0.28);
        if (validReach(0.28)) { reward(d, 360, '⚡'); d._advanceRoutineStep(); }
      }
      return true;
    }
    if (d.currentMechanic === 'CROWN_TAP_KISS_TEASE') {
      if (d.subStep === 0) {
        const close = V(0, 1.28, 0.32), pullBack = V(0.14, 1.38, 0.14), offer = V(0, 1.22, 0.28);
        if (t < 0.50) { d.coneTargetPos.copy(mix(start, close, t / 0.50)); d.conePitchX = ease(t / 0.50) * 0.26; }
        else if (t < 1.05) { const p = (t - 0.50) / 0.55; d.coneTargetPos.copy(mix(close, pullBack, p)); d.conePitchX = (1 - ease(p)) * 0.26; d.shaftRoll = ease(p) * Math.PI * 1.5; }
        else { const p = (t - 1.05) / 0.45; d.coneTargetPos.copy(mix(pullBack, offer, p)); d.shaftRoll = Math.PI * 1.5 * (1 - ease(p)); d.conePitchX = 0; }
        if (t > 0.20 && t < 1.35 && d.stepCooldown <= 0 && d.gestureValidation.reach('feint-penalty', intentPos.distanceTo(d.coneWorldPos), 0.25, dt)) {
          d.stepCooldown = 0.8; d._triggerVendorSpeech('hirr'); if (d._loseHeart(d.coneWorldPos, '👃')) return true;
        }
        if (t >= 1.50) { d.shaftRoll = 0; d.conePitchX = 0; toPhase(d, 1); d._triggerVendorSpeech('afiyet'); }
      } else {
        d.shaftRoll = 0; d.conePitchX = 0;
        d.coneTargetPos.set(Math.sin(time * 2.0) * 0.03, 1.22, 0.28);
        if (validReach(0.28)) { reward(d, 350, '🍦'); d._advanceRoutineStep(); }
      }
      return true;
    }
    if (d.currentMechanic === 'SPIRAL_CROWN_ASCENT') {
      if (d.subStep === 0) {
        const offer = V(0.02, 1.22, 0.28);
        if (t < 1.05) {
          const p = t / 1.05, ang = p * Math.PI * 3;
          const helix = V(Math.sin(ang) * 0.18, 1.16 + p * 0.26, 0.24 - Math.cos(ang) * 0.05);
          d.coneTargetPos.copy(mix(start, helix, Math.min(1, t / 0.28)));
          d.shaftRoll = ease(p) * Math.PI * 1.6;
        } else {
          const top = V(Math.sin(Math.PI * 3) * 0.18, 1.42, 0.24 - Math.cos(Math.PI * 3) * 0.05);
          const p = (t - 1.05) / 0.45;
          d.coneTargetPos.copy(mix(top, offer, p));
          d.shaftRoll = Math.PI * 1.6 * (1 - ease(p));
        }
        if (t > 0.20 && t < 1.35 && d.stepCooldown <= 0 && d.gestureValidation.reach('feint-penalty', intentPos.distanceTo(d.coneWorldPos), 0.25, dt)) {
          d.stepCooldown = 0.8; d._triggerVendorSpeech('laugh'); if (d._loseHeart(d.coneWorldPos, '🌪️')) return true;
        }
        if (t >= 1.50) { d.shaftRoll = 0; toPhase(d, 1); d._triggerVendorSpeech('hoppa'); }
      } else {
        d.shaftRoll = 0;
        d.coneTargetPos.set(0.02 + Math.sin(time * 2.1) * 0.03, 1.22, 0.28);
        if (validReach(0.28)) { reward(d, 360, '🌪️'); d._advanceRoutineStep(); }
      }
      return true;
    }
  }

  if(d.currentMechanic==='WHOLE_MOLD_ON_CONE'){
    if(d.subStep===0){
      const t=d.stageTimer;world.setConeInVendorHand(true);
      d.leftHandCustomTarget=V(.32,d.scoopCount>4?1.18:1.25,-.12);
      const cone=conePoint(d),cap=cone.clone().add(V(0,world.giantBlockHeight*.5+.035,0));
      if(t<1.02){
        const start=world.getTubMoldSeat(flav.index),lift=tub.clone().add(V(0,.34,0));
        const position=t<.52?mix(start,lift,t/.52):mix(lift,cap,(t-.52)/.50);
        world.setMoldPresentation({mode:'block',tubIndex:flav.index,position});d.coneTargetPos.copy(position).y-=world.giantBlockHeight*.35;
      }else if(t<2.20){
        world.setMoldPresentation({mode:'cone-cap',tubIndex:flav.index});d.coneTargetPos.copy(cone).add(V(0,.08,-.035));
        const xyDist=Math.hypot(intentPos.x-cone.x,intentPos.y-cone.y);
        const moldTrapHit=reachVisibleService(d,'mold-trap',world.conePivot,input,dt)||d.gestureValidation.reach('mold-trap-xy',xyDist,.25,dt);
        if(d.stepCooldown<=0&&moldTrapHit){d.stepCooldown=.8;d._triggerVendorSpeech('hirr');if(d._loseHeart(cone,'🧊'))return true;}
      }else{
        state.returnStart ||= world.giantBlockGroup.getWorldPosition(V());
        const over=tub.clone().add(V(0,.34,0)),seat=world.getTubMoldSeat(flav.index),p=(t-2.20)/.70;
        // Clear the rim first, then lower vertically into the actual socket.
        const position=p<.42?mix(state.returnStart,over,p/.42):mix(over,seat,(p-.42)/.58);
        world.setMoldPresentation({mode:'block',tubIndex:flav.index,position});d.coneTargetPos.copy(position).y-=world.giantBlockHeight*.35;
      }
      d.presentationExact=true;
      if(t>=2.90){world.clearMoldPresentation();world.setConeInVendorHand(false);world.tubIceGroups[flav.index].fill=1;world.updateIceCreamScoops(d.scoopCount,false);toPhase(d,1);d._triggerVendorSpeech('hoppa');}
    }else{world.setConeInVendorHand(false);d.leftHandCustomTarget=null;d.coneTargetPos.set(.04,1.23,.26);if(validReach(.28)){reward(d,360,'🍦');d._advanceRoutineStep();}}
    return true;
  }

  if (d.currentMechanic === 'SCOOP_LIFT_BACK') {
    if (d.subStep === 0) {
      const t = d.stageTimer;
      if(!state.fullCaught){
        world.setConeInVendorHand(true);d.leftHandCustomTarget=V(.12,1.20,.12);
        const full=conePoint(d);d.coneTargetPos.copy(full).add(V(0,.12,0));
        if(t>.35&&reachVisibleService(d,'full-before-lift',world.conePivot,input,dt)){world.handoffCone('player');d.heldItem='FULL_FOR_LIFT';state.fullCaught=true;d.stageTimer=0;return true;}
        if(t>=5.60){
          state.scoopStart=world.scoopStackGroup.getWorldPosition(V());
          world.setConeInVendorHand(false);d.leftHandCustomTarget=null;
          d.coneTargetPos.set(-0.12,1.22,0.27);
          toPhase(d,2);d.stageTimer=0.55;d._triggerVendorSpeech('hoppa');
        }
        return true;
      }
      const cone=conePoint(d);d.leftHandCustomTarget=null;
      if(!state.liftPulled){
        d.idleSeconds=0;
        if(d.gestureValidation.pull('lift-my-scoops')||t>=6.0){state.liftPulled=true;state.scoopStart=world.scoopStackGroup.getWorldPosition(V());d.stageTimer=0;}
        return true;
      }
      if (t < 0.35) {
        state.scoopStart = world.scoopStackGroup.getWorldPosition(V());
        d.coneTargetPos.copy(cone).add(V(0, 0.04, 0));
      } else {
        const raised = V(0.24, 1.46, 0.08);
        const position = mix(state.scoopStart || cone, raised, (t - 0.35) / 0.50);
        world.setScoopPresentation('paddle', position);
        d.coneTargetPos.copy(position).y -= 0.020;
        d.presentationExact = true;
        if (t < 0.85) {
          world.stretchyStrand.attach(cone.clone().add(V(0, 0.04, 0)), position, flav.colorHex, false);
          world.stretchyStrand.update(dt, cone.clone().add(V(0, 0.04, 0)), position, 0.45);
        } else world.stretchyStrand.detach();
      }
      if(t>=.90){
        d.heldItem='BARE_CONE';toPhase(d,1);d._triggerVendorSpeech('laugh');
        if(d.hearts>1){if(d._loseHeart(cone,'🍦'))return true;}
        else{d.penaltiesTaken++;d.sound?.playPenalty?.();world.setVendorMood?.('laugh');}
      }
    } else if (d.subStep === 1) {
      d.coneTargetPos.set(0.22 + Math.sin(time * 2.1) * 0.04, 1.25, 0.27);
      world.setScoopPresentation('paddle', d.coneWorldPos.clone().add(V(0, 0.020, 0)));
      if (d.gestureValidation.reach('return-bare', intentPos.distanceTo(d.coneWorldPos), 0.27, dt)) {
        world.handoffCone('paddle');
        world.setScoopPresentation('cone');
        d.heldItem = null;
        reward(d, 200, '🍦');
        d.pendingTrickAdvance = .28;
      }
    } else {
      const cone = conePoint(d);
      if (d.stageTimer < 0.55) {
        const position = mix(state.scoopStart || cone, cone, d.stageTimer / 0.55);
        world.setScoopPresentation('paddle', position);
        d.coneTargetPos.copy(position).y -= 0.020;
        d.presentationExact = true;
      } else {
        world.setScoopPresentation('cone');
        world.setConeInVendorHand(false);
        d.leftHandCustomTarget = null;
        d.coneTargetPos.set(-0.12, 1.22, 0.27);
        if (validReach(0.28)) { reward(d, 380, '🍦'); d._advanceRoutineStep(); }
      }
    }
    return true;
  }

  if (d.subStep === 0) {
    d.coneTargetPos.set(0.08, 1.22, 0.28);
    if (d.stageTimer > 0.40 && validReach(0.28)) {
      // This is the actual cone and actual ordered scoops, not a decoy clone.
      world.scene.updateMatrixWorld(true);
      world.handoffCone('player');
      d.heldItem = 'BONUS_CONE';
      d.sound.playConePop();
      toPhase(d, 1);
      d._triggerVendorSpeech('hmm');
    }
  } else if (d.subStep === 1) {
    state.bonusBladeStart ||= scrapeBladePoint(world);
    scrapeServing(d,{progress:Math.min(.91,d.stageTimer/1.10*.91),start:state.bonusBladeStart,tub,deposit:V(-.24,1.29,.26),color:flav.colorHex,radius:.064*.85*(world.servingScale||1)});
    if(d.stageTimer<.8)world.churnTubIceCream?.(flav.index,dt);
    if (d.stageTimer>=1.10&&d.gestureValidation.reach('bring-cone-for-extra', intentPos.distanceTo(d.coneWorldPos), 0.23, dt)) {
      world.scene.updateMatrixWorld(true);
      world.handoffCone('paddle');
      d.heldItem = null;
      state.returnStart = d.coneWorldPos.clone();
      d.sound.playWaferSlide();
      toPhase(d, 2);
      d._triggerVendorSpeech('eeeh');
    }
  } else if (d.subStep === 2) {
    const t = d.stageTimer;
    const retract = V(0.12, 1.34, -0.14);
    if (t < 0.28) d.coneTargetPos.copy(mix(state.returnStart, retract, t / 0.28));
    else {
      // Keep the customer's real serving safe in the free hand while only the
      // offered extra is visibly lowered back into the chosen flavor's tub.
      world.setConeInVendorHand(true);
      d.leftHandCustomTarget = V(0.22, 1.17, -0.24);
      d.coneTargetPos.copy(mix(retract, tub.clone().add(V(0, 0.01, 0)), (t - 0.28) / 0.60));
    }
    world.carryScoop.visible = t < 0.88;
    world.carryScoop.scale.setScalar(0.85 * (world.servingScale || 1) * (1 - ease((t - 0.72) / 0.16)));
    d.presentationExact = true;
    if (t >= 1.0) {
      world.carryScoop.visible = false;
      world.setConeInVendorHand(false);
      d.leftHandCustomTarget = null;
      toPhase(d, 3);
      d._triggerVendorSpeech('hoppa');
    }
  } else {
    d.coneTargetPos.set(0.10 + Math.sin(time * 2) * 0.04, 1.22, 0.28);
    if (validReach(0.28)) { reward(d, 320, '🍦'); d._advanceRoutineStep(); }
  }
  return true;
}

/** Describe only the gesture being offered; use the existing guide renderer/i18n. */
export function extraTrickCue(d) {
  const researchCue = researchedServiceCue(d); if (researchCue) return researchCue;
  const customer = customerServiceCue(d); if (customer) return customer;
  const flourish = marasFlourishCue(d); if (flourish) return flourish;
  if (!EXTRA_IDS.has(d.currentMechanic)) return null;
  if (d.currentMechanic === LAYERED_SERVICE_ID) return layeredServiceCue(d);
  if (FLOURISH_EXTRA_IDS.has(d.currentMechanic)) {
    return d.subStep === 0
      ? { kind: 'wait', trap: true, target: d.coneWorldPos, progress: Math.min(1, d.stageTimer / 1.50) }
      : { kind: 'reach', target: d.coneWorldPos, progress: 1 };
  }
  if (d.currentMechanic === 'WHOLE_MOLD_ON_CONE') {
    if (d.subStep === 1) return { kind: 'reach', target: d.coneWorldPos, progress: 1 };
    const trapWindow = d.stageTimer >= 1.02 && d.stageTimer < 2.20;
    return { kind: trapWindow ? 'pull' : 'wait', trap: trapWindow, ...customerServiceTarget(d, d.world.conePivot), progress: d.stageTimer / 2.9 };
  }
  if (d.currentMechanic === 'SCOOP_LIFT_BACK') {
    if(d.subStep===0)return{kind:!d.extraTrick.fullCaught?'reach':!d.extraTrick.liftPulled?'pull':'wait',...customerServiceTarget(d),progress:.3};
    if (d.subStep === 1) return { kind: 'return', target: d.coneWorldPos, progress: 0.65 };
    if (d.subStep === 2 && d.stageTimer >= 0.55) return { kind: 'reach', ...customerServiceTarget(d), progress: 1 };
    return { kind: d.subStep === 0 && d.stageTimer > 1.05 ? 'pull' : 'wait', target: conePoint(d), progress: 0.35 };
  }
  if(d.currentMechanic==='BONUS_SCOOP_TAKEBACK'&&d.subStep===1&&d.stageTimer<1.10)return{kind:'wait',target:d.coneWorldPos,progress:.3};
  return { kind: d.subStep === 1 ? 'return' : d.subStep === 2 ? 'wait' : 'reach', target: d.coneWorldPos, progress: (d.subStep + 1) / 4 };
}

/** Real serving-paper prank: cone/ice stay on the rod; one sheet changes owner. */
export function enterServingNapkin(d) {
  d.servingNapkinState = { caught: false, retractStart: null };
  d.world.napkinConeProp.visible = false;
  d.world.heldNapkinCone.visible = false;
  d.world.napkinProp.visible = false;
  d.world.setServingNapkin?.({ owner: 'vendor', peel: 0, visible: true });
  d.coneTargetPos.set(0.08, 1.24, 0.12);
  d.leftHandCustomTarget = null;
  d.world.setVendorMood('mischief');
  d._triggerVendorSpeech('hmm');
}

export function updateServingNapkin(d, dt, time, { intentPos, gestureState, validReach, validSlice, realDt=dt }) {
  const w = d.world;
  const state = d.servingNapkinState;
  if (d.subStep === 0) {
    d.coneTargetPos.copy(mix(V(0.08, 1.24, 0.12), V(0.02, 1.21, 0.29), d.stageTimer / 0.55));
    d.conePitchX = 0.06;
    d.shaftRoll = Math.sin(time * 2) * 0.06;
    w.setServingNapkin?.({ owner: 'vendor', peel: 0, visible: true });
    const paper = w.servingNapkin?.getWorldPosition(V()) || d.coneWorldPos.clone().add(V(0, -0.04, 0));
    if (d.stageTimer > 0.35 && d.gestureValidation.reach('pinch-paper', intentPos.distanceTo(paper), 0.25, dt)) {
      state.caught = true;
      state.retractStart = d.coneWorldPos.clone();
      // Attach preserves the paper's world transform; only the real pole/cone retract.
      w.setServingNapkin?.({ owner: 'player', peel: 0, visible: true });
      d.heldItem = 'NAPKIN';
      d.isGraspingPaddleCone = false;
      toPhase(d, 1);
      d.sound.playWaferSlide();
      d._triggerVendorSpeech('laugh');
      if (d._loseHeart(paper, '🧻')) return;
    } else if (d.stageTimer >= 1.95) {
      state.offerFrom=d.coneWorldPos.clone();
      d.idleSeconds = 0;
      toPhase(d, 3);
      d._triggerVendorSpeech('hoppa');
    }
  } else if (d.subStep === 1) {
    if(!state.pulled){d.coneTargetPos.copy(state.retractStart);d.idleSeconds=0;if(!d.gestureValidation.pull('paper-peel-pull')&&!d.gestureValidation.slice('paper-peel-slice'))return;state.pulled=true;d.stageTimer=0;return;}
    const p = ease(d.stageTimer / 0.45);
    d.coneTargetPos.copy(state.retractStart).lerp(V(0.25, 1.34, -0.07), p);
    d.presentationExact = true;
    d.shaftRoll = p * 0.35;
    w.setServingNapkin?.({ owner: 'player', peel: p, visible: true });
    if (d.stageTimer >= 0.45) toPhase(d, 2);
  } else if (d.subStep === 2) {
    d.coneTargetPos.set(0.25, 1.31, -0.06);
    if(!state.returning)w.setServingNapkin?.({ owner: 'player', peel: 1, visible: true });
    state.returning ||= new NapkinReturn(d);
    if (state.returning.update(d,realDt)) {
      d.score += 140; // Existing recovery reward, once after the real wrap.
      d._spawnScorePopup(140,w.touristHand.position,'🧻');
      d._vibrate(25);d.idleSeconds=0;state.offerFrom=d.coneWorldPos.clone();toPhase(d,3);
    }
  } else {
    d.coneTargetPos.copy(mix(state.offerFrom||V(0.25,1.31,-0.06), V(0.02,1.21,0.29),d.stageTimer/.40));
    d.shaftRoll = 0;
    if (d.stageTimer >= 0.40 && validReach(0.28)) {
      if (!state.caught) reward(d, 360, '🍦'); // Original safe-wait reward.
      d._advanceRoutineStep();
    }
  }
}

export function servingNapkinCue(d) {
  if (d.currentMechanic !== 'NAPKIN_CONE_FAKEOUT') return null;
  const paper = d.world.servingNapkin?.getWorldPosition(V()) || d.coneWorldPos;
  if (d.subStep === 0) return { kind: d.stageTimer < 0.35 ? 'wait' : 'pull', target: paper, progress: Math.min(1, d.stageTimer / 1.95) };
  if(d.subStep===1&&!d.servingNapkinState?.pulled)return{kind:'pull',target:paper,progress:.4};
  if (d.subStep === 1) return { kind: 'wait', target: paper, progress: d.stageTimer / .45 };
  if (d.subStep === 2) return napkinReturnCue(d,d.servingNapkinState?.returning)||{kind:'wait',quiet:true,target:paper,progress:.6};
  return { kind: 'reach', target: d.coneWorldPos, progress: 1 };
}
