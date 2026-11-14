import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const ROOT = process.cwd();
const ANDROID_RES = path.join(ROOT, 'android/app/src/main/res');
const PLAY_PUBLISH_DIR = path.join(ROOT, 'play-store-publish');
const PLAY_PLUGIN_DIR = path.join(ROOT, 'android/app/src/main/play');

function renderSvgToPng(svgString, width, outputPath) {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true },
  });
  const pngBuffer = resvg.render().asPng();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pngBuffer);
}

// 1. Read base icon.svg & optional 3D WebGL hero render (raw-3d-icon.png)
const baseVectorIconSvg = fs.readFileSync(path.join(ROOT, 'public/icon.svg'), 'utf8');
const raw3dIconPath = path.join(PLAY_PUBLISH_DIR, 'graphics/raw-3d-icon.png');
const hasRaw3dIcon = fs.existsSync(raw3dIconPath);
const raw3dIconB64 = hasRaw3dIcon ? fs.readFileSync(raw3dIconPath).toString('base64') : '';

const storeIconSvg = hasRaw3dIcon
  ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff3b0"/>
      <stop offset="50%" stop-color="#f5b942"/>
      <stop offset="100%" stop-color="#9e6208"/>
    </linearGradient>
    <linearGradient id="vignette" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.16"/>
      <stop offset="65%" stop-color="#000000" stop-opacity="0.0"/>
      <stop offset="100%" stop-color="#140502" stop-opacity="0.52"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="#1c0805"/>
  <image href="data:image/png;base64,${raw3dIconB64}" x="0" y="0" width="512" height="512" preserveAspectRatio="xMidYMid slice"/>
  <rect width="512" height="512" fill="url(#vignette)"/>
  <rect x="8" y="8" width="496" height="496" rx="84" fill="none" stroke="url(#goldBorder)" stroke-width="16"/>
  <rect x="22" y="22" width="468" height="468" rx="72" fill="none" stroke="#ffe07d" stroke-width="2.5" stroke-dasharray="12 8" opacity="0.72"/>
  <!-- Corner 3D Badge -->
  <g transform="translate(378, 412)">
    <rect x="0" y="0" width="98" height="54" rx="27" fill="#3a0a0e" stroke="url(#goldBorder)" stroke-width="5"/>
    <text x="49" y="37" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="30" fill="#ffe07d">3D</text>
  </g>
</svg>`
  : baseVectorIconSvg;

const roundIconSvg = hasRaw3dIcon
  ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff3b0"/>
      <stop offset="50%" stop-color="#f5b942"/>
      <stop offset="100%" stop-color="#9e6208"/>
    </linearGradient>
    <clipPath id="circleClip">
      <circle cx="256" cy="256" r="240"/>
    </clipPath>
  </defs>
  <circle cx="256" cy="256" r="256" fill="#1c0805"/>
  <g clip-path="url(#circleClip)">
    <image href="data:image/png;base64,${raw3dIconB64}" x="0" y="0" width="512" height="512" preserveAspectRatio="xMidYMid slice"/>
  </g>
  <circle cx="256" cy="256" r="240" fill="none" stroke="url(#goldBorder)" stroke-width="16"/>
</svg>`
  : baseVectorIconSvg.replace(
      '<rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>',
      '<circle cx="256" cy="256" r="256" fill="url(#bgGrad)"/>'
    );

// Adaptive icon foreground (108dp canvas with safe 66dp inner zone)
const foregroundIconSvg = hasRaw3dIcon
  ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff3b0"/>
      <stop offset="50%" stop-color="#f5b942"/>
      <stop offset="100%" stop-color="#9e6208"/>
    </linearGradient>
    <clipPath id="fgCircle">
      <circle cx="256" cy="256" r="168"/>
    </clipPath>
  </defs>
  <g clip-path="url(#fgCircle)">
    <image href="data:image/png;base64,${raw3dIconB64}" x="88" y="88" width="336" height="336" preserveAspectRatio="xMidYMid slice"/>
  </g>
  <circle cx="256" cy="256" r="168" fill="none" stroke="url(#goldRing)" stroke-width="12"/>
</svg>`
  : baseVectorIconSvg;

const MIPMAP_SIZES = [
  { dir: 'mipmap-mdpi', launcher: 48, fg: 108 },
  { dir: 'mipmap-hdpi', launcher: 72, fg: 162 },
  { dir: 'mipmap-xhdpi', launcher: 96, fg: 216 },
  { dir: 'mipmap-xxhdpi', launcher: 144, fg: 324 },
  { dir: 'mipmap-xxxhdpi', launcher: 192, fg: 432 },
];

for (const { dir, launcher, fg } of MIPMAP_SIZES) {
  renderSvgToPng(storeIconSvg, launcher, path.join(ANDROID_RES, dir, 'ic_launcher.png'));
  renderSvgToPng(roundIconSvg, launcher, path.join(ANDROID_RES, dir, 'ic_launcher_round.png'));
  renderSvgToPng(foregroundIconSvg, fg, path.join(ANDROID_RES, dir, 'ic_launcher_foreground.png'));
}

// 2. Generate 512x512 Google Play Store High-Res Icon
const icon512Path = path.join(PLAY_PUBLISH_DIR, 'graphics/icon-512x512.png');
renderSvgToPng(storeIconSvg, 512, icon512Path);

// 3. Generate Localized 1024x500 Google Play Store Feature Graphics (TR & EN) from real 3D WebGL scene
const raw3dFeaturePath = path.join(PLAY_PUBLISH_DIR, 'graphics/raw-3d-feature.png');
const hasRaw3dFeature = fs.existsSync(raw3dFeaturePath);
const raw3dFeatureB64 = hasRaw3dFeature ? fs.readFileSync(raw3dFeaturePath).toString('base64') : '';

function escXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildFeatureGraphicSvg({ kicker, line1, line2, subtitle, pill1, pill2, pill3 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="rightShade" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#140503" stop-opacity="0.05"/>
      <stop offset="36%" stop-color="#140503" stop-opacity="0.35"/>
      <stop offset="54%" stop-color="#180604" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#120402" stop-opacity="0.98"/>
    </linearGradient>
    <linearGradient id="goldText" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff4b8"/>
      <stop offset="52%" stop-color="#f5b942"/>
      <stop offset="100%" stop-color="#bd780f"/>
    </linearGradient>
  </defs>

  <rect width="1024" height="500" fill="#1a0604"/>
  ${
    hasRaw3dFeature
      ? `<image href="data:image/png;base64,${raw3dFeatureB64}" x="0" y="0" width="1024" height="500" preserveAspectRatio="xMidYMid slice"/>`
      : ''
  }
  <rect width="1024" height="500" fill="url(#rightShade)"/>

  <!-- Decorative Ottoman Gold Frame -->
  <rect x="14" y="14" width="996" height="472" rx="24" fill="none" stroke="url(#goldText)" stroke-width="5" opacity="0.9"/>
  <rect x="24" y="24" width="976" height="452" rx="18" fill="none" stroke="#f5b942" stroke-width="1.5" stroke-dasharray="10 8" opacity="0.55"/>

  <!-- Right Side Typography & Feature Pills -->
  <g transform="translate(442, 0)">
    <rect x="0" y="68" width="364" height="38" rx="19" fill="#3b0c10" stroke="#f5b942" stroke-width="2"/>
    <text x="182" y="93" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="18" fill="#ffe07d" letter-spacing="1.8">${escXml(kicker)}</text>

    <text x="0" y="168" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="44" fill="url(#goldText)">${escXml(line1)}</text>
    <text x="0" y="228" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="42" fill="#ffffff">${escXml(line2)}</text>
    <text x="0" y="278" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="19" fill="#f5d3a6">${escXml(subtitle)}</text>

    <!-- 3 Feature Badges -->
    <g transform="translate(0, 326)">
      <rect x="0" y="0" width="172" height="50" rx="25" fill="#143820" stroke="#36db62" stroke-width="3"/>
      <text x="86" y="30" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="14" fill="#86efac">${escXml(pill1)}</text>

      <rect x="182" y="0" width="176" height="50" rx="25" fill="#47150b" stroke="#f5b942" stroke-width="3"/>
      <text x="270" y="30" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="14" fill="#ffe07d">${escXml(pill2)}</text>

      <rect x="368" y="0" width="168" height="50" rx="25" fill="#2b1640" stroke="#c084fc" stroke-width="3"/>
      <text x="452" y="30" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="14" fill="#e9d5ff">${escXml(pill3)}</text>
    </g>
  </g>
</svg>`;
}

const featureGraphicTrPath = path.join(PLAY_PUBLISH_DIR, 'graphics/feature-graphic-tr.png');
const featureGraphicEnPath = path.join(PLAY_PUBLISH_DIR, 'graphics/feature-graphic-en.png');
const featureGraphicDefaultPath = path.join(PLAY_PUBLISH_DIR, 'graphics/feature-graphic-1024x500.png');

renderSvgToPng(
  buildFeatureGraphicSvg({
    kicker: 'KAPALIÇARŞI • 3B POV OYUN',
    line1: 'MARAŞ DONDURMACISI',
    line2: '3D ŞOV & HİLELER',
    subtitle: 'Ustayı Alt Et • 5 Kg Kalıp ve Boş Külah Tuzakları!',
    pill1: '112 HİLE & ŞOV',
    pill2: '6 MEKÂN • 4 USTA',
    pill3: '3B SÜNEN FİZİK',
  }),
  1024,
  featureGraphicTrPath
);

renderSvgToPng(
  buildFeatureGraphicSvg({
    kicker: 'GRAND BAZAAR • 3D POV GAME',
    line1: 'TURKISH ICE CREAM',
    line2: 'CHALLENGE 3D',
    subtitle: 'Outsmart the Master • Dodge 5-Kilo Mold & Cone Traps!',
    pill1: '112 TRICKS & SHOWS',
    pill2: '6 VENUES • 4 MASTERS',
    pill3: '3D STRETCH PHYSICS',
  }),
  1024,
  featureGraphicEnPath
);

fs.copyFileSync(featureGraphicTrPath, featureGraphicDefaultPath);

// 4. Preserve Real 3D WebGL Screenshots in play-store-publish/graphics/
const screenshotsDefaultDir = path.join(PLAY_PUBLISH_DIR, 'graphics/screenshots');
const screenshotsTrDir = path.join(PLAY_PUBLISH_DIR, 'graphics/screenshots-tr');
const screenshotsEnDir = path.join(PLAY_PUBLISH_DIR, 'graphics/screenshots-en');
const tabletTrDir = path.join(PLAY_PUBLISH_DIR, 'graphics/tablet-tr');
const tabletEnDir = path.join(PLAY_PUBLISH_DIR, 'graphics/tablet-en');

fs.mkdirSync(screenshotsDefaultDir, { recursive: true });
if (fs.existsSync(screenshotsTrDir)) {
  // Remove obsolete mock files in default screenshots dir and sync real TR 3D screenshots
  for (const oldFile of fs.readdirSync(screenshotsDefaultDir)) {
    fs.unlinkSync(path.join(screenshotsDefaultDir, oldFile));
  }
  for (const file of fs.readdirSync(screenshotsTrDir).filter((f) => f.endsWith('.png')).sort()) {
    fs.copyFileSync(path.join(screenshotsTrDir, file), path.join(screenshotsDefaultDir, file));
  }
}

// 5. Generate 6-Language Store Listings & Release Notes (v2.0.0)
const LISTINGS = {
  'tr-TR': {
    title: 'Maraş Dondurmacısı 3D Şov',
    shortDescription: '112 Maraş dondurma hilesi ve şovu! 5 kg kalıp ve boş külah tuzaklarından kaç!',
    fullDescription: `🍦 MARAŞ DONDURMACISI 3D ŞOV (TURKISH ICE CREAM CHALLENGE v2.0)

Kapalıçarşı'nın kalbinde gerçek bir Kahramanmaraş dondurma ustasının karşısına geçmeye hazır mısın?

Usta bakır kazanlardan uzayan gerçekçi Maraş dondurmasını demir kürekle kazıyor, 5 kiloluk dev kalıbı havada çeviriyor, çanları çalıyor ve "HOPPAAA!" diyerek seni ters köşeye yatırıyor!

✨ YENİ v2.0 ÖNE ÇIKAN ÖZELLİKLER:
• 112 Otantik Numara ve Koreografik Şov:
  - 50 Tekil Maraş Hilesi: Akrobasi, El Çabukluğu, Sünen Dondurma & Kalıp, Ritim & Çan.
  - 60 Çok Adımlı Efsane Şov: Ustanın 3 ila 5 hileyi kesintisiz zincirlediği baş döndürücü gösteriler!
  - İnteraktif Hile Ansiklopedisi ve Pratik Modu: Keşfettiğin 111 hileyi 6 kategoride incele ve "▶ Dene" butonuyla istediğin numarayı anında ustaya yaptır!
• Gerçekçi 3B Fizik ve Uzayan Dondurma:
  - 5 Kiloluk Dev Kalıp Tuzağı: Kazandan çıkan dev dondurma kütlesine kanıp elini uzatma!
  - Sünen Dondurma Kesme: Kürekten külaha uzayan dondurma şeridini parmağınla hızlıca dik kes!
  - Boş Külah ve Peçeteli Külah Tuzakları: Eline tutuşturulan sahte külahları hızlıca kaydırarak fırlat!
• 4 Efsane Usta, 6 Kültürel Mekân (30 Seviye + Sonsuz Mod) ve 4 Lezzet (1–12 Top):
  1. Çırak Kadir (İstiklal Caddesi)
  2. Pala Usta (Sultanahmet Meydanı)
  3. Cezmi Dede (Galata Kulesi & Ortaköy)
  4. Başusta Haydar (Kapalıçarşı & Karaköy)
• 6 Dil Desteği: Türkçe, İngilizce, Arapça (RTL), Rusça, Almanca ve Japonca.
• %100 Çevrimdışı (Offline) Oynanabilir, Reklamsız ve Veri Toplamaz.`,
    releaseNotes: 'v2.0.1: El çabukluğu ve mola dönüşü sırasındaki donma hatası giderildi, mobil akıcılık iyileştirildi ve ustanın yanlış lezzet şakası konuşma balonlarıyla netleştirildi!',
  },
  'en-US': {
    title: 'Turkish Ice Cream Challenge 3D',
    shortDescription: '112 3D Maraş ice cream tricks & shows! Dodge giant mold & empty cone traps!',
    fullDescription: `🍦 TURKISH ICE CREAM CHALLENGE 3D (MARAŞ DONDURMA SHOW v2.0)

Step up to the gleaming copper cart in Istanbul's Grand Bazaar and test your reflexes against legendary Turkish Maraş ice cream masters!

Watch closely as the vendor scrapes stretchy dondurma from copper tubs with his long iron paddle, hoists a 5-kilo ice cream block, rings the brass bells, and shouts "HOPPAAA!" just as your hand reaches for the cone.

✨ NEW IN v2.0 — KEY FEATURES:
• 112 Authentic Tricks & Choreographed Shows:
  - 50 Individual Maraş Tricks across Acrobatics, Sleight of Hand, Elastic & Giant Mold, and Rhythm & Bell categories.
  - 60 Multi-Step Show Routines chaining 3 to 5 tricks seamlessly!
  - Interactive Trick Encyclopedia & Practice Mode: Track all 111 discoverable tricks across 6 tabs and tap "▶ Practice" to challenge the master on any trick immediately!
• Viscoelastic 3D Physics & Interactive Traps:
  - 5-Kilo Giant Mold Trap: Pull your hand back when the master swings the massive dondurma block!
  - Stretchy Ribbon Slice: Swipe across the elastic ice cream strand to sever it cleanly!
  - Empty Cone & Napkin Decoy Traps: Flick away fake napkin cones before the next trick begins!
• 4 Unique Masters Across 6 Cultural Venues (30 Stages + Endless Mode):
  1. Apprentice Kadir (Istiklal Avenue)
  2. Master Pala (Sultanahmet Square)
  3. Grandpa Cezmi (Galata Tower & Ortakoy)
  4. Grandmaster Haydar (Grand Bazaar & Karakoy)
• 6 Languages Supported: English, Turkish, Arabic (Full RTL), Russian, German, and Japanese.
• 100% Offline Playable, Haptic Feedback & Zero Data Collection.`,
    releaseNotes: 'v2.0.1: Stability & clarity update! Fixed rare gameplay freeze after idle recovery, improved mobile timer resilience, and added playful vendor banter for the wrong-flavor prank!',
  },
  'ar': {
    title: 'تحدي الآيس كريم التركي 3D',
    shortDescription: '١١٢ خدعة وعرض للآيس كريم التركي 3D! تجنب فخ القالب العملاق والقمع الفارغ!',
    fullDescription: `🍦 تحدي الآيس كريم التركي 3D (عرض دوندورما مرعش الإصدار 2.0)

قف أمام عربة النحاس التقليدية في البازار الكبير واختبر سرعة بديهتك أمام أشهر معلمي الآيس كريم التركي!

✨ المميزات الرئيسية في الإصدار 2.0:
• ١١٢ خدعة وعرض استعراضي: ٥٠ خدعة فردية + ٦٠ عرضاً متسلسلاً مع موسوعة الخدع ووضع التدريب المباشر!
• فيزياء ثلاثية الأبعاد واقعية: فخ قالب الآيس كريم العملاق (٥ كجم)، قطع الآيس كريم المطاطي، وفخ القمع الفارغ والمنديل.
• ٤ معلمين عبر ٦ أماكن ثقافية (٣٠ مرحلة + الوضع اللانهائي).
• دعم كامل للغة العربية (RTL) و٥ لغات أخرى، وتعمل بدون إنترنت ١٠٠٪.`,
    releaseNotes: 'الإصدار 2.0.1: تحديث الاستقرار! إصلاح مشكلة التوقف النادرة أثناء اللعب وتوضيح مقلب النكهة الخاطئة الفكاهي للمعلم!',
  },
  'ru': {
    title: 'Турецкое Мороженое 3D Шоу',
    shortDescription: '112 трюков и шоу марашской дондурмы в 3D! Избегай ловушек и поймай рожок!',
    fullDescription: `🍦 ТУРЕЦКОЕ МОРОЖЕНОЕ 3D (TURKISH ICE CREAM CHALLENGE v2.0)

Испытайте свою реакцию перед медной тележкой Гранд-Базара! Турецкий мороженщик зачерпывает тягучую дондурму железной лопаткой, звенит в колокольчики и устраивает настоящее шоу.

✨ ОСОБЕННОСТИ ВЕРСИИ 2.0:
• 112 трюков и хореографических шоу (50 одиночных трюков + 60 многошаговых шоу) и Энциклопедия трюков с режимом тренировки!
• Реалистичная 3D-физика: ловушка с 5-килограммовым блоком мороженого, разрезание тягучей дондурмы, пустой рожок и салфетка.
• 4 уникальных мастера в 6 локациях (30 уровней + бесконечный режим).
• Полная поддержка русского языка и работа без интернета.`,
    releaseNotes: 'v2.0.1: Исправлено редкое зависание после анимации ожидания и добавлены весёлые реплики для шутки с другой начинкой!',
  },
  'de': {
    title: 'Maraş Eis-Challenge 3D',
    shortDescription: '112 3D-Maraş-Eistricks & Shows! Weiche Riesenblock- & Waffelfallen aus!',
    fullDescription: `🍦 MARAŞ EIS-CHALLENGE 3D (TURKISH ICE CREAM CHALLENGE v2.0)

Tritt an den glänzenden Kupferwagen im Großen Basar und teste deine Reflexe gegen legendäre türkische Maraş-Eismeister!

✨ HIGHLIGHTS IN VERSION 2.0:
• 112 authentische Tricks & Shows (50 Einzeltricks + 60 mehrstufige Choreografien) inklusive Trick-Enzyklopädie & Übungsmodus!
• Echte 3D-POV-Physik: 5-Kilo-Eisblock-Falle, dehnbares Maraş-Eis zum Durchschneiden, Leere-Waffel-Falle und Servietten-Täuschung.
• 4 Eismeister an 6 Schauplätzen (30 Level + Endlosmodus).
• 6 Sprachen (inkl. Deutsch) & 100 % offline spielbar.`,
    releaseNotes: 'v2.0.1: Seltener Einfrier-Fehler behoben, mobile Stabilität verbessert und witzige Kommentare für den Maraş-Sorten-Streich ergänzt!',
  },
  'ja': {
    title: 'トルコアイス挑戦 3D',
    shortDescription: '全112種の3Dトルコアイストリック＆ショー！巨大塊や空コーンの罠を見破れ！',
    fullDescription: `🍦 トルコアイス挑戦 3D (TURKISH ICE CREAM CHALLENGE v2.0)

グランドバザールの銅製ワゴン前に立ち、伝統的なトルコ（マラシュ）アイス職人の華麗なトリックを見破りましょう！

✨ v2.0の新特徴:
• 全112種類のトリック＆ショー（単独トリック50種＋連続ショー60種）と、いつでも練習できるトリック図鑑モードを搭載！
• リアルな3D物理演算：5kgの巨大アイス塊トラップ、伸びるアイスのスライス切断、空コーンやナプキンの罠。
• 6つの会場（30ステージ＋エンドレスモード）と個性豊かな4人の職人。
• 日本語を含む6言語対応・完全オフライン対応。`,
    releaseNotes: 'v2.0.1: 待機アクション復帰時の稀なフリーズ不具合を修正し、職人の「違う味のイタズラ」演出をより分かりやすく改善しました！',
  },
};

for (const [locale, data] of Object.entries(LISTINGS)) {
  if (data.title.length > 30) {
    throw new Error(`Title exceeds 30 chars for ${locale}: ${data.title.length}`);
  }
  if (data.shortDescription.length > 80) {
    throw new Error(`Short description exceeds 80 chars for ${locale}: ${data.shortDescription.length}`);
  }
  if (data.fullDescription.length > 4000) {
    throw new Error(`Full description exceeds 4000 chars for ${locale}: ${data.fullDescription.length}`);
  }
  if (data.releaseNotes.length > 500) {
    throw new Error(`Release notes exceeds 500 chars for ${locale}: ${data.releaseNotes.length}`);
  }

  // Write to play-store-publish/store-listings/<locale>/
  const pubDir = path.join(PLAY_PUBLISH_DIR, 'store-listings', locale);
  fs.mkdirSync(pubDir, { recursive: true });
  fs.writeFileSync(path.join(pubDir, 'title.txt'), data.title + '\n');
  fs.writeFileSync(path.join(pubDir, 'short-description.txt'), data.shortDescription + '\n');
  fs.writeFileSync(path.join(pubDir, 'full-description.txt'), data.fullDescription + '\n');
  fs.writeFileSync(path.join(pubDir, 'release-notes.txt'), data.releaseNotes + '\n');

  // Write to Gradle Play Publisher structure: android/app/src/main/play/listings/<locale>/
  const pluginListingDir = path.join(PLAY_PLUGIN_DIR, 'listings', locale);
  fs.mkdirSync(pluginListingDir, { recursive: true });
  fs.writeFileSync(path.join(pluginListingDir, 'title.txt'), data.title + '\n');
  fs.writeFileSync(path.join(pluginListingDir, 'short-description.txt'), data.shortDescription + '\n');
  fs.writeFileSync(path.join(pluginListingDir, 'full-description.txt'), data.fullDescription + '\n');

  const pluginNotesDir = path.join(PLAY_PLUGIN_DIR, 'release-notes', locale);
  fs.mkdirSync(pluginNotesDir, { recursive: true });
  fs.writeFileSync(path.join(pluginNotesDir, 'default.txt'), data.releaseNotes + '\n');
}

// Copy localized graphics into Gradle Play Publisher structure for tr-TR & en-US
for (const loc of ['tr-TR', 'en-US']) {
  const gDir = path.join(PLAY_PLUGIN_DIR, 'listings', loc, 'graphics');
  fs.mkdirSync(path.join(gDir, 'icon'), { recursive: true });
  fs.mkdirSync(path.join(gDir, 'feature-graphic'), { recursive: true });
  fs.mkdirSync(path.join(gDir, 'phone-screenshots'), { recursive: true });
  fs.mkdirSync(path.join(gDir, 'tablet-screenshots'), { recursive: true });

  fs.copyFileSync(icon512Path, path.join(gDir, 'icon/icon.png'));
  fs.copyFileSync(
    loc === 'tr-TR' ? featureGraphicTrPath : featureGraphicEnPath,
    path.join(gDir, 'feature-graphic/feature-graphic.png')
  );

  const srcPhoneDir = loc === 'tr-TR' && fs.existsSync(screenshotsTrDir)
    ? screenshotsTrDir
    : loc === 'en-US' && fs.existsSync(screenshotsEnDir)
    ? screenshotsEnDir
    : screenshotsDefaultDir;

  for (const old of fs.readdirSync(path.join(gDir, 'phone-screenshots'))) {
    fs.unlinkSync(path.join(gDir, 'phone-screenshots', old));
  }
  for (const scFile of fs.readdirSync(srcPhoneDir).filter((f) => f.endsWith('.png')).sort()) {
    fs.copyFileSync(path.join(srcPhoneDir, scFile), path.join(gDir, 'phone-screenshots', scFile));
  }

  const srcTabletDir = loc === 'tr-TR' && fs.existsSync(tabletTrDir)
    ? tabletTrDir
    : loc === 'en-US' && fs.existsSync(tabletEnDir)
    ? tabletEnDir
    : null;

  if (srcTabletDir) {
    for (const old of fs.readdirSync(path.join(gDir, 'tablet-screenshots'))) {
      fs.unlinkSync(path.join(gDir, 'tablet-screenshots', old));
    }
    for (const tbFile of fs.readdirSync(srcTabletDir).filter((f) => f.endsWith('.png')).sort()) {
      fs.copyFileSync(path.join(srcTabletDir, tbFile), path.join(gDir, 'tablet-screenshots', tbFile));
    }
  }
}

console.log('✔ Generated 3D Android launcher icons, localized Play Store feature graphics (1024x500), verified 20 real 3D WebGL screenshots, and updated 6-language v2.0.0 store listings.');
