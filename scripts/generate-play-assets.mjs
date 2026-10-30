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

// 1. Read base icon.svg + create round and adaptive foreground SVG variants
const baseIconSvg = fs.readFileSync(path.join(ROOT, 'public/icon.svg'), 'utf8');

const roundIconSvg = baseIconSvg.replace(
  '<rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>',
  '<circle cx="256" cy="256" r="256" fill="url(#bgGrad)"/>'
);

// Adaptive icon foreground (108dp canvas with safe 66dp inner zone)
const foregroundIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe07d"/>
      <stop offset="50%" stop-color="#f5b942"/>
      <stop offset="100%" stop-color="#b87914"/>
    </linearGradient>
    <linearGradient id="coneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e39d52"/>
      <stop offset="100%" stop-color="#9e591c"/>
    </linearGradient>
    <linearGradient id="fezGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#b81422"/>
      <stop offset="100%" stop-color="#6b0810"/>
    </linearGradient>
  </defs>
  <g transform="translate(256 256) scale(0.68) translate(-256 -256)">
    <circle cx="256" cy="256" r="214" fill="#4a090e" stroke="url(#goldRing)" stroke-width="14"/>
    <g transform="rotate(-28 256 256)">
      <rect x="247" y="42" width="18" height="390" rx="9" fill="#cfd6e0" stroke="#5d6675" stroke-width="4"/>
      <ellipse cx="256" cy="395" rx="32" ry="18" fill="#dfe5ed" stroke="#5d6675" stroke-width="4"/>
    </g>
    <polygon points="184,268 328,268 256,448" fill="url(#coneGrad)" stroke="#6e390c" stroke-width="8" stroke-linejoin="round"/>
    <circle cx="256" cy="240" r="68" fill="#fff8eb" stroke="#e0cfa9" stroke-width="6"/>
    <circle cx="212" cy="182" r="54" fill="#68c947" stroke="#3f8c25" stroke-width="6"/>
    <circle cx="298" cy="184" r="52" fill="#5e2c15" stroke="#381708" stroke-width="6"/>
    <polygon points="214,132 298,132 284,68 228,68" fill="url(#fezGrad)" stroke="#f5b942" stroke-width="5" stroke-linejoin="round"/>
    <path d="M256,68 Q305,72 312,126" fill="none" stroke="#f5b942" stroke-width="8" stroke-linecap="round"/>
    <circle cx="256" cy="68" r="9" fill="#ffe07d"/>
    <path d="M256,246 C225,232 186,258 166,236 C182,272 228,268 256,256 C284,268 330,272 346,236 C326,258 287,232 256,246 Z" fill="#24120b" stroke="#f5b942" stroke-width="3"/>
  </g>
</svg>`;

const MIPMAP_SIZES = [
  { dir: 'mipmap-mdpi', launcher: 48, fg: 108 },
  { dir: 'mipmap-hdpi', launcher: 72, fg: 162 },
  { dir: 'mipmap-xhdpi', launcher: 96, fg: 216 },
  { dir: 'mipmap-xxhdpi', launcher: 144, fg: 324 },
  { dir: 'mipmap-xxxhdpi', launcher: 192, fg: 432 },
];

for (const { dir, launcher, fg } of MIPMAP_SIZES) {
  renderSvgToPng(baseIconSvg, launcher, path.join(ANDROID_RES, dir, 'ic_launcher.png'));
  renderSvgToPng(roundIconSvg, launcher, path.join(ANDROID_RES, dir, 'ic_launcher_round.png'));
  renderSvgToPng(foregroundIconSvg, fg, path.join(ANDROID_RES, dir, 'ic_launcher_foreground.png'));
}

// 2. Generate 512x512 Google Play Store High-Res Icon
const icon512Path = path.join(PLAY_PUBLISH_DIR, 'graphics/icon-512x512.png');
renderSvgToPng(baseIconSvg, 512, icon512Path);

// 3. Generate 1024x500 Google Play Store Feature Graphic
const featureGraphicSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500">
  <defs>
    <radialGradient id="bazaarBg" cx="35%" cy="50%" r="80%">
      <stop offset="0%" stop-color="#4e130c"/>
      <stop offset="55%" stop-color="#220906"/>
      <stop offset="100%" stop-color="#0f0302"/>
    </radialGradient>
    <linearGradient id="goldText" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff0a8"/>
      <stop offset="55%" stop-color="#f5b942"/>
      <stop offset="100%" stop-color="#c47e12"/>
    </linearGradient>
    <linearGradient id="coneG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e39d52"/>
      <stop offset="100%" stop-color="#9e591c"/>
    </linearGradient>
  </defs>

  <rect width="1024" height="500" fill="url(#bazaarBg)"/>

  <!-- Decorative Ottoman Border -->
  <rect x="18" y="18" width="988" height="464" rx="26" fill="none" stroke="url(#goldText)" stroke-width="5" opacity="0.8"/>
  <rect x="28" y="28" width="968" height="444" rx="20" fill="none" stroke="#f5b942" stroke-width="1.5" stroke-dasharray="10 8" opacity="0.45"/>

  <!-- Left Side: 3D Maraş Vendor Emblem & Stretchy Ice Cream -->
  <g transform="translate(215, 255)">
    <circle cx="0" cy="0" r="175" fill="#3a0a0d" stroke="url(#goldText)" stroke-width="10"/>
    <!-- Iron Paddle -->
    <rect x="-120" y="-155" width="16" height="310" rx="8" transform="rotate(-35)" fill="#d6dde6" stroke="#596270" stroke-width="4"/>
    <!-- Stretchy Dondurma Strand -->
    <path d="M-35,-75 Q0,-15 35,-65 Q18,20 -10,45" fill="#fff8eb" opacity="0.92"/>
    <!-- Waffle Cone -->
    <polygon points="-58,18 58,18 0,158" fill="url(#coneG)" stroke="#6e390c" stroke-width="6"/>
    <!-- 3 Scoops -->
    <circle cx="0" cy="-6" r="52" fill="#fff8eb" stroke="#e0cfa9" stroke-width="5"/>
    <circle cx="-36" cy="-52" r="42" fill="#68c947" stroke="#3f8c25" stroke-width="5"/>
    <circle cx="36" cy="-50" r="40" fill="#5e2c15" stroke="#381708" stroke-width="5"/>
    <!-- Fez Crown -->
    <polygon points="-34,-92 34,-92 24,-144 -24,-144" fill="#a8101e" stroke="#f5b942" stroke-width="4"/>
    <!-- Mustache -->
    <path d="M0,-2 C-26,-14 -58,8 -74,-10 C-62,20 -24,16 0,6 C24,16 62,20 74,-10 C58,8 26,-14 0,-2 Z" fill="#211009" stroke="#f5b942" stroke-width="2.5"/>
  </g>

  <!-- Right Side: Bold Title & Feature Pills -->
  <text x="440" y="138" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="30" fill="#ffd875" letter-spacing="3">GRAND BAZAAR • 3D POV GAME</text>
  <text x="440" y="212" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="62" fill="url(#goldText)">TURKISH ICE CREAM</text>
  <text x="440" y="280" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="56" fill="#ffffff">CHALLENGE</text>
  <text x="440" y="332" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="24" fill="#f5cfa0">Outsmart the Maraş Master • Dodge Empty Cone Traps!</text>

  <!-- Feature Badges -->
  <g transform="translate(440, 368)">
    <rect x="0" y="0" width="168" height="52" rx="26" fill="#183d24" stroke="#36db62" stroke-width="3"/>
    <text x="84" y="33" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="20" fill="#86efac">3D PHYSICS</text>

    <rect x="184" y="0" width="176" height="52" rx="26" fill="#4a160c" stroke="#f5b942" stroke-width="3"/>
    <text x="272" y="33" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="20" fill="#ffe07d">3 MASTERS</text>

    <rect x="376" y="0" width="164" height="52" rx="26" fill="#2e1842" stroke="#c084fc" stroke-width="3"/>
    <text x="458" y="33" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="20" fill="#e9d5ff">6 LANGUAGES</text>
  </g>
</svg>`;

const featureGraphicPath = path.join(PLAY_PUBLISH_DIR, 'graphics/feature-graphic-1024x500.png');
renderSvgToPng(featureGraphicSvg, 1024, featureGraphicPath);

// 4. Generate 4 Promotional 1080x1920 Phone Screenshots for Google Play Console
const SCREENSHOT_SCENES = [
  {
    file: 'phone-1-gameplay.png',
    badge: '3D POV MARAŞ SHOW',
    title: 'GRAB THE CONE!',
    subtitle: 'Follow the glowing green ring &amp; swipe at the exact millisecond',
    ringColor: '#36db62',
    ringText: 'UZAT &amp; TUT!',
    score: '1,450',
    combo: 'x4',
    usta: 'Pala Usta',
    scoopCount: 3,
  },
  {
    file: 'phone-2-empty-cone-trap.png',
    badge: 'EMPTY CONE TRAP!',
    title: 'DON\'T GRAB BARE CONES!',
    subtitle: 'Ice cream stays on the iron paddle while he thrusts an empty cone',
    ringColor: '#ff3b30',
    ringText: '✕ BOŞ KÜLAH! ELİNİ ÇEK',
    score: '1,920',
    combo: 'x5',
    usta: 'Cezmi Dede',
    scoopCount: 0,
  },
  {
    file: 'phone-3-napkin-fakeout.png',
    badge: 'NAPKIN DECOY TRICK',
    title: 'FLICK AWAY FAKE CONES!',
    subtitle: 'Caught a napkin cone in your 3D hand? Swipe fast to throw it back!',
    ringColor: '#f5b942',
    ringText: '🧻 FIRLAT / SALLA!',
    score: '2,380',
    combo: 'x6',
    usta: 'Pala Usta',
    scoopCount: 2,
  },
  {
    file: 'phone-4-final-catch.png',
    badge: '3-SCOOP VICTORY!',
    title: 'OUTSMART 3 MASTERS!',
    subtitle: 'Vanilla, Antep Pistachio &amp; Chocolate — win the ultimate Maraş cone',
    ringColor: '#36db62',
    ringText: '🏆 ŞİMDİ KAP! (+480)',
    score: '3,600',
    combo: 'x8',
    usta: 'Cezmi Dede',
    scoopCount: 3,
  },
];

for (const sc of SCREENSHOT_SCENES) {
  const screenshotSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">
    <defs>
      <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#260c07"/>
        <stop offset="50%" stop-color="#47160c"/>
        <stop offset="100%" stop-color="#170704"/>
      </linearGradient>
      <linearGradient id="copperCart" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#7c3314"/>
        <stop offset="50%" stop-color="#c96b2c"/>
        <stop offset="100%" stop-color="#69280e"/>
      </linearGradient>
    </defs>

    <rect width="1080" height="1920" fill="url(#sky)"/>

    <!-- Promo Header Banner -->
    <rect x="64" y="68" width="952" height="270" rx="38" fill="#1e0906" stroke="#f5b942" stroke-width="5"/>
    <text x="540" y="138" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="30" fill="#f5b942" letter-spacing="4">${sc.badge}</text>
    <text x="540" y="216" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="56" fill="#ffffff">${sc.title}</text>
    <text x="540" y="282" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="26" fill="#f2d5b0">${sc.subtitle}</text>

    <!-- In-Game Top HUD Pill -->
    <g transform="translate(84, 382)">
      <rect width="760" height="106" rx="53" fill="#160705" stroke="#f5b942" stroke-width="3" opacity="0.92"/>
      <text x="64" y="66" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="38" fill="#f5b942">🎩 ${sc.usta}</text>
      <text x="430" y="68" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="46" fill="#ffffff">${sc.score}</text>
      <rect x="610" y="24" width="110" height="58" rx="29" fill="#3b2006" stroke="#f5b942" stroke-width="2"/>
      <text x="665" y="62" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="34" fill="#ffe07d">${sc.combo}</text>
    </g>

    <!-- 3D Vendor Character Illustration -->
    <g transform="translate(540, 860)">
      <!-- Copper Hanging Bells -->
      <circle cx="-340" cy="-250" r="34" fill="#f5b942"/>
      <circle cx="340" cy="-250" r="34" fill="#f5b942"/>
      <!-- Vendor Torso & Ottoman Vest -->
      <rect x="-175" y="-120" width="350" height="330" rx="64" fill="#7a0d16" stroke="#f5b942" stroke-width="8"/>
      <rect x="-90" y="-120" width="180" height="310" fill="#fff6eb"/>
      <!-- Vendor Head -->
      <circle cx="0" cy="-230" r="102" fill="#f0be95"/>
      <!-- Crimson Fez -->
      <polygon points="-86,-296 86,-296 68,-410 -68,-410" fill="#a8101e" stroke="#f5b942" stroke-width="5"/>
      <!-- Mustache -->
      <path d="M0,-196 C-45,-215 -105,-180 -128,-208 C-108,-156 -42,-162 0,-180 C42,-162 108,-156 128,-208 C105,-180 45,-215 0,-196 Z" fill="#24120b"/>

      <!-- Copper Ice Cream Cart Counter -->
      <rect x="-460" y="180" width="920" height="230" rx="28" fill="url(#copperCart)" stroke="#f5b942" stroke-width="6"/>
      <ellipse cx="-240" cy="180" rx="110" ry="34" fill="#fff8eb" stroke="#b87914" stroke-width="6"/>
      <ellipse cx="0" cy="180" rx="110" ry="34" fill="#68c947" stroke="#b87914" stroke-width="6"/>
      <ellipse cx="240" cy="180" rx="110" ry="34" fill="#5e2c15" stroke="#b87914" stroke-width="6"/>
    </g>

    <!-- Foreground 3D Target Ring & Ice Cream Cone -->
    <g transform="translate(540, 1290)">
      <circle cx="0" cy="0" r="190" fill="none" stroke="${sc.ringColor}" stroke-width="14" stroke-dasharray="28 16"/>
      <circle cx="0" cy="0" r="154" fill="${sc.ringColor}" opacity="0.14"/>

      <!-- Iron Paddle -->
      <rect x="-12" y="-310" width="24" height="320" rx="10" fill="#d6dde6" stroke="#596270" stroke-width="4"/>

      <!-- Waffle Cone -->
      <polygon points="-66,10 66,10 0,185" fill="#d98e43" stroke="#6e390c" stroke-width="7"/>
      ${
        sc.scoopCount >= 1
          ? `<circle cx="0" cy="-22" r="58" fill="#fff8eb" stroke="#e0cfa9" stroke-width="5"/>`
          : `<circle cx="0" cy="-190" r="55" fill="#fff8eb"/><circle cx="0" cy="-255" r="46" fill="#68c947"/>`
      }
      ${
        sc.scoopCount >= 2
          ? `<circle cx="-38" cy="-76" r="48" fill="#68c947" stroke="#3f8c25" stroke-width="5"/>`
          : ''
      }
      ${
        sc.scoopCount >= 3
          ? `<circle cx="38" cy="-76" r="46" fill="#5e2c15" stroke="#381708" stroke-width="5"/>`
          : ''
      }

      <!-- Action Ring Tag -->
      <rect x="-250" y="-270" width="500" height="68" rx="34" fill="#140805" stroke="${sc.ringColor}" stroke-width="4"/>
      <text x="0" y="-224" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="32" fill="${sc.ringColor}">${sc.ringText}</text>
    </g>

    <!-- Player 3D POV Tourist Hand at Bottom -->
    <g transform="translate(540, 1740)">
      <ellipse cx="0" cy="0" rx="135" ry="92" fill="#f2c29b" stroke="#b57c50" stroke-width="6"/>
      <rect x="-85" y="60" width="170" height="190" rx="40" fill="#1e3a8a" stroke="#f5b942" stroke-width="5"/>
    </g>
  </svg>`;

  const outFile = path.join(PLAY_PUBLISH_DIR, 'graphics/screenshots', sc.file);
  renderSvgToPng(screenshotSvg, 1080, outFile);
}

// 5. Generate 6-Language Store Listings & Release Notes (both in play-store-publish/ and android/app/src/main/play/)
const LISTINGS = {
  'tr-TR': {
    title: 'Maraş Dondurmacısı 3D Şov',
    shortDescription: 'Gerçekçi 3D Maraş dondurma şovu! Boş külah ve peçete tuzaklarından kaç, kap!',
    fullDescription: `🍦 MARAŞ DONDURMACISI 3D ŞOV (TURKISH ICE CREAM CHALLENGE)

Kapalıçarşı'nın kalbinde gerçek bir Kahramanmaraş dondurma ustasının karşısına geçmeye hazır mısın?

Usta bakır kazanlardan uzayan gerçekçi Maraş dondurmasını demir kürekle kazıyor, külaha yapıştırıyor, çanları çalıyor ve "HOPPAAA!" diyerek seni ters köşeye yatırıyor!

✨ ÖNE ÇIKAN ÖZELLİKLER:
• Gerçekçi 3B Fizik ve Uzayan Dondurma: Viskoelastik Maraş dondurması sünme fiziği, bakır kazanlardan top kazıma ve 3B birinci şahıs (POV) turist eli.
• Otantik Maraş Dondurma Numaraları:
  - Boş Külah Tuzağı: Dondurma topları demir çubukta kalırken sana uzatılan boş külahı tutarsan elinde kalır ve ceza yersin!
  - Peçeteli Külah Numarası: Eline tutuşturulan peçeteli sahte külahı hızlıca kaydırarak fırlat!
  - İki Külah Değişimi, Bilek Çevirme ve Yatay Kesme şovları.
• 3 Farklı Efsane Usta:
  1. Çırak Kadir (Isınma ve Temel Numaralar)
  2. Pala Usta (Hızlı Çanlar ve Peçete Tuzakları)
  3. Cezmi Dede (Efsanevi Kapalıçarşı Ustası)
• Gerçek Zamanlı Ses Sentezi: Her ustanın kendine özgü ses tonu, dudak/bıyık senkronizasyonu, bakır çan sesleri ve Kapalıçarşı atmosferi.
• 6 Dil Desteği: Türkçe, İngilizce, Arapça (RTL), Rusça, Almanca ve Japonca.
• %100 Çevrimdışı (Offline) Oynanabilir, Reklamsız ve Veri Toplamaz.`,
    releaseNotes: 'v1.0.0: İlk resmi Google Play sürümü! 3 farklı Maraş ustası, gerçekçi 3B boş külah ve peçete tuzakları, 6 dil desteği ve tam ekran performans modu.',
  },
  'en-US': {
    title: 'Turkish Ice Cream Challenge 3D',
    shortDescription: '3D POV Maraş ice cream vendor game! Dodge empty cone traps & grab the cone!',
    fullDescription: `🍦 TURKISH ICE CREAM CHALLENGE 3D (MARAŞ DONDURMA SHOW)

Step up to the gleaming copper cart in Istanbul's Grand Bazaar and test your reflexes against legendary Turkish Maraş ice cream masters!

Watch closely as the vendor scrapes stretchy dondurma from copper tubs with his long iron paddle, rings the brass bells, and shouts "HOPPAAA!" just as your hand reaches for the cone.

✨ KEY FEATURES:
• Authentic 3D POV Hand & Viscoelastic Physics: Watch stretchy vanilla, pistachio, and chocolate Maraş ice cream pull and bounce with realistic spring physics.
• Iconic Real-Life Vendor Tricks:
  - Empty Cone Trap: The master leaves the scoops perched on the iron paddle while thrusting an empty waffle cone into your hand — grab it by mistake and it stays in your hand with a penalty!
  - Napkin Decoy Cone: Flick away fake napkin cones before the next trick begins!
  - Shell Swap, Wrist Roll, Upside-Down Fake & Horizontal Paddle Slice.
• 3 Unique Masters with Distinct Voices:
  1. Apprentice Kadir (Warm-up & Basic Tricks)
  2. Master Pala (Fast Bells & Napkin Traps)
  3. Grandpa Cezmi (Grand Bazaar Legend)
• 6 Languages Supported: English, Turkish, Arabic (Full RTL), Russian, German, and Japanese.
• 100% Offline Playable, Haptic Feedback & Zero Data Collection.`,
    releaseNotes: 'v1.0.0: Official launch! Experience 3D POV Maraş ice cream tricks, empty cone & napkin traps, 3 masters with vocal synthesis, and 6 languages.',
  },
  'ar': {
    title: 'تحدي الآيس كريم التركي 3D',
    shortDescription: 'لعبة بائع الآيس كريم التركي ثلاثية الأبعاد! تجنب فخ البسكويت الفارغ والمنديل!',
    fullDescription: `🍦 تحدي الآيس كريم التركي 3D (عرض دوندورما مرعش)

قف أمام عربة النحاس التقليدية في البازار الكبير واختبر سرعة بديهتك أمام أشهر معلمي الآيس كريم التركي!

✨ المميزات الرئيسية:
• منظور الشخص الأول (POV) وفيزياء ثلاثية الأبعاد واقعية للآيس كريم التركي المطاطي.
• خدع حقيقية وممتعة: فخ البسكويت الفارغ، خدعة المنديل، وتبديل الأقماع السريع.
• ٣ معلمين بمستويات صعوبة وأصوات مختلفة (قدير، المعلم بالا، والجد عزمي).
• دعم كامل للغة العربية (من اليمين إلى اليسار RTL) و٥ لغات أخرى.
• تعمل بدون إنترنت ١٠٠٪ وبدون جمع أي بيانات شخصية.`,
    releaseNotes: 'الإصدار 1.0.0: الإطلاق الرسمي! خدع الآيس كريم التركي ثلاثية الأبعاد مع دعم كامل للغة العربية.',
  },
  'ru': {
    title: 'Турецкое Мороженое 3D Шоу',
    shortDescription: '3D игра от первого лица: перехитри мастера марашской дондурмы и поймай рожок!',
    fullDescription: `🍦 ТУРЕЦКОЕ МОРОЖЕНОЕ 3D (TURKISH ICE CREAM CHALLENGE)

Испытайте свою реакцию перед медной тележкой Гранд-Базара! Турецкий мороженщик зачерпывает тягучую дондурму железной лопаткой, звенит в колокольчики и устраивает настоящее шоу.

✨ ОСОБЕННОСТИ:
• Реалистичная 3D-физика от первого лица (POV) и тягучее мороженое.
• Настоящие трюки: ловушка с пустым рожком, рожок в салфетке, подмена рожков и перевороты лопатки.
• 3 уникальных мастера с живой озвучкой и мимикой.
• Полная поддержка русского языка и работа без интернета.`,
    releaseNotes: 'v1.0.0: Официальный релиз! 3D трюки с турецким мороженым, 3 мастера и 6 языков.',
  },
  'de': {
    title: 'Maraş Eis-Challenge 3D',
    shortDescription: '3D-POV Türkisches Eis-Spiel! Weiche leeren Waffeln aus und schnapp dir das Eis!',
    fullDescription: `🍦 MARAŞ EIS-CHALLENGE 3D (TURKISH ICE CREAM CHALLENGE)

Tritt an den glänzenden Kupferwagen im Großen Basar und teste deine Reflexe gegen legendäre türkische Maraş-Eismeister!

✨ HIGHLIGHTS:
• Echte 3D-POV-Physik & dehnbares Maraş-Eis (Vanille, Pistazie, Schokolade).
• Authentische Tricks: Leere-Waffel-Falle, Servietten-Täuschung, Hütchenspieler-Tausch und Kellen-Drehung.
• 3 Eismeister mit eigener Stimme und steigendem Schwierigkeitsgrad.
• 6 Sprachen (inkl. Deutsch) & 100 % offline spielbar.`,
    releaseNotes: 'v1.0.0: Offizieller Start! 3D-POV Maraş-Eistricks, 3 Meister und 6 Sprachen.',
  },
  'ja': {
    title: 'トルコアイス挑戦 3D',
    shortDescription: '3D主観視点のトルコアイス職人ゲーム！空コーンやナプキンの罠を見破ってアイスを掴め！',
    fullDescription: `🍦 トルコアイス挑戦 3D (TURKISH ICE CREAM CHALLENGE)

グランドバザールの銅製ワゴン前に立ち、伝統的なトルコ（マラシュ）アイス職人の華麗なトリックを見破りましょう！

✨ 特徴:
• リアルな3D物理演算と伸びるトルコアイス、主観視点（POV）の3Dハンド。
• 本物のトリックを再現：空コーンの罠、ナプキン偽コーン、高速入れ替え。
• 個性豊かな3人の職人（カディル、パラ親方、ジェズミ師匠）。
• 日本語を含む6言語対応・完全オフライン対応。`,
    releaseNotes: 'v1.0.0: 公式リリース！3Dトルコアイス職人トリック、3人のマスター、6言語対応。',
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

// Copy default graphics into Gradle Play Publisher structure for en-US & tr-TR
for (const loc of ['tr-TR', 'en-US']) {
  const gDir = path.join(PLAY_PLUGIN_DIR, 'listings', loc, 'graphics');
  fs.mkdirSync(path.join(gDir, 'icon'), { recursive: true });
  fs.mkdirSync(path.join(gDir, 'feature-graphic'), { recursive: true });
  fs.mkdirSync(path.join(gDir, 'phone-screenshots'), { recursive: true });

  fs.copyFileSync(icon512Path, path.join(gDir, 'icon/icon.png'));
  fs.copyFileSync(featureGraphicPath, path.join(gDir, 'feature-graphic/feature-graphic.png'));
  for (const sc of SCREENSHOT_SCENES) {
    fs.copyFileSync(
      path.join(PLAY_PUBLISH_DIR, 'graphics/screenshots', sc.file),
      path.join(gDir, 'phone-screenshots', sc.file)
    );
  }
}

console.log('✔ Generated all Android launcher icons, Play Store graphics (512x512, 1024x500, 4x 1080x1920), and 6-language store listings.');
