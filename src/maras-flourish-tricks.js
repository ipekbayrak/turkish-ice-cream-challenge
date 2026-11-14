import * as THREE from 'three';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (x) => {
  const p = THREE.MathUtils.clamp(x, 0, 1);
  return p * p * (3 - 2 * p);
};
const mix = (a, b, t) => a.clone().lerp(b, ease(t));
const toPhase = (d, phase) => {
  d.subStep = phase;
  d.stageTimer = 0;
  d.stepCooldown = 0;
};
const reward = (d, points, icon) => {
  d.score += points;
  d._spawnScorePopup(points, d.coneWorldPos, icon);
  d.sound.playGripTug?.(0);
  d._vibrate?.(25);
};
const flavorFor = (d) => d._getFlavorForScoop(Math.max(0, d.scoopCount - 1));

export const MARAS_FLOURISH_CATALOG = [
  {
    id: 'TRIPLE_BELL_CRESCENDO',
    icon: '🔔🎶',
    difficulty: 3,
    category: 'rhythm_trap',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Üçlü Çan Kreşendosu',
      en: 'Triple Bell Crescendo',
      ar: 'تصاعد الأجراس الثلاثة',
      ru: 'Тройное крещендо колокольчиков',
      de: 'Dreifach-Glocken-Crescendo',
      ja: 'トリプルベル・クレッシェンド',
    },
    descs: {
      tr: 'Usta sol, sağ ve orta çana hızlanan tempoyla vurarak külahı gezdirir! Üçüncü çan tınlayıp külah merkeze indiğinde yakala!',
      en: 'Strikes the left, right, and center brass bells in an accelerating crescendo! Wait for the third chime and catch in the center!',
      ar: 'يدق الأجراس الثلاثة بإيقاع متسارع! انتظر الرنين الثالث وامسك القمع في المنتصف!',
      ru: 'Звенит в левый, правый и центральный колокольчики в ускоряющемся темпе! Лови после третьего удара!',
      de: 'Schlägt im schneller werdenden Takt an drei Glocken! Greif nach dem dritten Glockenschlag in der Mitte zu!',
      ja: '左・右・中央のベルを加速するリズムで打ち鳴らす！3つ目の音が響いて中央に降りた瞬間に掴め！',
    },
  },
  {
    id: 'COUNTER_DRUM_CADENCE',
    icon: '🥁🍦',
    difficulty: 2,
    category: 'rhythm_trap',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Tezgah Darbuka Ritmi',
      en: 'Counter Drum Cadence',
      ar: 'إيقاع الطبل على الرخام',
      ru: 'Барабанный ритм на стойке',
      de: 'Theken-Trommeltakt',
      ja: 'カウンター・ドラムリズム',
    },
    descs: {
      tr: 'Külahı sol elinde tutarken çelik çubukla mermer tezgaha 1-2-3 darbuka ritmi vurur, 4. vuruşta çubuğa aktarıp uzatır!',
      en: 'Holds the cone in his free hand while drumming a 1-2-3 cadence on the marble counter with the steel rod, then offers on beat 4!',
      ar: 'يمسك القمع بيده اليسرى ويدق إيقاع ١-٢-٣ بالعصا على الرخام ثم يقدمه في الضربة الرابعة!',
      ru: 'Держит рожок в левой руке, отбивая ритм 1-2-3 шестом по мрамору, и подает на 4-й такт!',
      de: 'Hält die Waffel links, trommelt einen 1-2-3-Takt mit dem Stab auf den Marmor und serviert bei Schlag 4!',
      ja: '左手にコーンを持ち、鉄棒で大理石カウンターを1・2・3と叩いてから4拍目で差し出す！',
    },
  },
  {
    id: 'SYNCOPATED_BELL_FAKE',
    icon: '🔕🔔',
    difficulty: 3,
    category: 'rhythm_trap',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Es’li Çan Yanıltması',
      en: 'Syncopated Bell Fakeout',
      ar: 'خدعة الجرس الصامت',
      ru: 'Синкопированный обман колокольчика',
      de: 'Synkopierte Glockenfinte',
      ja: 'シンコペーション・ベルフェイント',
    },
    descs: {
      tr: 'Çubuğu çana hızla yaklaştırıp 2 cm kala sessizce durur! Erken hamleye kanma; gerçek çan sesinden sonra yakala!',
      en: 'Halts the rod an inch from the brass bell in a silent syncopated fakeout! Wait for the real ring before reaching!',
      ar: 'يوقف العصا قبل الجرس بلحظة في خدعة صامتة! انتظر الرنين الحقيقي قبل أن تمد يدك!',
      ru: 'Останавливает шест в сантиметре от колокольчика в немой паузе! Дождись настоящего звона!',
      de: 'Stoppt den Stab kurz vor der Glocke für eine stille Finte! Warte auf den echten Glockenschlag!',
      ja: 'ベルの寸前でピタッと止める無音のフェイント！本物のベルが鳴るまで我慢して掴め！',
    },
  },
  {
    id: 'TWIN_RIBBON_SCISSORS',
    icon: '✂️🎗️',
    difficulty: 2,
    category: 'elastic_mass',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Salınan Sünme Şeridi',
      en: 'Swinging Taffy Ribbon',
      ar: 'شريط البوظة المتأرجح',
      ru: 'Качающаяся лента дондурмы',
      de: 'Schwingendes Eisband',
      ja: 'スイング・伸びリボン',
    },
    descs: {
      tr: 'Kazanla külah arasında sünmüş Maraş dondurmasını sağa sola salındırır! Şerit koptuktan sonra temiz sunuşta yakala!',
      en: 'Swings a stretched viscoelastic dondurma ribbon left and right between tub and cone! Catch cleanly once the strand releases!',
      ar: 'يؤرجح شريط البوظة المطاطي بين الحوض والقمع يميناً ويساراً! امسك القمع بعد انفصال الشريط!',
      ru: 'Раскачивает тягучую ленту мороженого между котлом и рожком! Хватай рожок, когда лента отпустит!',
      de: 'Schwingt ein gedehntes Eisband zwischen Kessel und Waffel hin und her! Greif zu, sobald sich das Band löst!',
      ja: '釜とコーンの間で伸びたアイスを左右にスイング！リボンが離れた瞬間にキャッチ！',
    },
  },
  {
    id: 'ELASTIC_BUNGEE_YO_YO',
    icon: '🪀🍦',
    difficulty: 3,
    category: 'elastic_mass',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Lastik Yo-Yo Sarkıtması',
      en: 'Elastic Bungee Yo-Yo',
      ar: 'يويو البوظة المطاطي',
      ru: 'Эластичное йо-йо',
      de: 'Elastisches Eis-Jo-Jo',
      ja: 'ゴム・ヨーヨーバウンス',
    },
    descs: {
      tr: 'Dondurmayı elastik sakız bağıyla yo-yo gibi iki kez aşağı zıplatıp geri çeker! Zıplama bitip sabitlenince yakala!',
      en: 'Bounces the cone down and up twice on a stretchy dondurma bungee cord! Catch it once the yo-yo bounce finishes!',
      ar: 'ينطط القمع للأسفل والأعلى مرتين كاليويو بخيط البوظة المطاطي! امسكه عندما يستقر!',
      ru: 'Дважды подбрасывает рожок вверх-вниз на тягучей нити как йо-йо! Лови, когда он остановится!',
      de: 'Lässt die Waffel zweimal wie ein Jo-Jo am elastischen Eisfaden hüpfen! Greif zu, wenn sie ruht!',
      ja: '伸びるアイスの糸でコーンをヨーヨーのように2回バウンドさせる！止まった瞬間に掴め！',
    },
  },
  {
    id: 'MOLD_PENDULUM_HEIST',
    icon: '🧊🕰️',
    difficulty: 3,
    category: 'elastic_mass',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Koca Kalıp Sarkacı',
      en: 'Giant Mold Pendulum',
      ar: 'بندول القالب العملاق',
      ru: 'Маятник ледяной глыбы',
      de: 'Riesenblock-Pendel',
      ja: '巨大アイスブロックの振り子',
    },
    descs: {
      tr: 'Kovadaki dev dondurma kalıbını çıkarıp sarkaç gibi sallayarak görüşünü kapatır; kalıp kovaya dönünce külahı yakala!',
      en: 'Swings the entire tub mold across the counter like a heavy pendulum before seating it back and offering your cone!',
      ar: 'يؤرجح قالب البوظة العملاق أمامك كبندول ثقيل ثم يعيده للحوض ويقدم القمع!',
      ru: 'Раскачивает огромную глыбу мороженого перед стойкой, возвращает в котел и протягивает рожок!',
      de: 'Schwingt den ganzen Eisblock wie ein schweres Pendel, setzt ihn zurück und reicht dir die Waffel!',
      ja: '巨大なアイス塊を振り子のように揺らして視界を遮り、釜に戻してからコーンを差し出す！',
    },
  },
  {
    id: 'UNDER_ARM_PIROUETTE',
    icon: '🤺🌀',
    difficulty: 3,
    category: 'acrobatics',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Koltuk Altı Çarkı',
      en: 'Under-Arm Pirouette',
      ar: 'دوران تحت الذراع',
      ru: 'Пируэт под рукой',
      de: 'Unterarm-Pirouette',
      ja: 'アンダーアーム・ピルエット',
    },
    descs: {
      tr: 'Külahı sağ kolunun altına doğru derin bir yayla çekip çubuğu iki tam tur (720°) döndürerek alttan yukarı çıkarır!',
      en: 'Sweeps the cone low under his right arm with a 720° double shaft spin before popping it up to center!',
      ar: 'يسحب القمع أسفل ذراعه بدوران مزدوج ٧٢٠ درجة ثم يرفعه للمنتصف!',
      ru: 'Уводит рожок под правую руку с двойным вращением на 720° и выносит в центр!',
      de: 'Zieht die Waffel mit einer 720°-Drehung tief unter den rechten Arm und hebt sie mittig hoch!',
      ja: '右腕の下へ深く潜らせながら720°ダブルスピンし、下から中央へ跳ね上げる！',
    },
  },
  {
    id: 'HORIZONTAL_HELICOPTER',
    icon: '🚁🍦',
    difficulty: 2,
    category: 'paddle_spin',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Yatay Pervane Turu',
      en: 'Horizontal Helicopter Orbit',
      ar: 'مدار المروحية الأفقي',
      ru: 'Горизонтальный пропеллер',
      de: 'Horizontaler Helikopterkreis',
      ja: 'ホリゾンタル・ヘリコプター',
    },
    descs: {
      tr: 'Külahı tezgaha paralel yatay bir dairede helikopter pervanesi gibi hızla döndürür; tur bitince yakala!',
      en: 'Whirls the cone in a wide horizontal orbit parallel to the marble counter like a helicopter rotor!',
      ar: 'يدير القمع في مدار أفقي واسع موازٍ للرخام كمروحية! امسكه عند التوقف!',
      ru: 'Крутит рожок по широкому горизонтальному кругу параллельно стойке как лопасти вертолета!',
      de: 'Kreist die Waffel flach über dem Tresen wie einen Helikopterrotor! Greif am Ende zu!',
      ja: 'カウンターと平行な水平サークルでヘリコプターのように高速旋回させる！',
    },
  },
  {
    id: 'BACKHAND_WRIST_SNAP',
    icon: '🫱💨',
    difficulty: 2,
    category: 'sleight_of_hand',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Ters Bilek Tokadı',
      en: 'Backhand Wrist Snap',
      ar: 'خطفة المعصم العكسية',
      ru: 'Обратный щелчок запястьем',
      de: 'Rückhand-Handgelenkschnapper',
      ja: 'バックハンド・リストスナップ',
    },
    descs: {
      tr: 'Soldan uzatır gibi yapıp ters bilek vuruşuyla sağa ve yukarı kaçırır, ardından merkezde sabitler!',
      en: 'Feints an offer on the left, snaps his wrist backhand across to the right, then locks the cone dead-center!',
      ar: 'يموه بالتقديم يساراً ثم يخطف معصمه يميناً بحركة عكسية قبل التثبيت في الوسط!',
      ru: 'Делает ложную подачу слева, резко перебрасывает кистью вправо и фиксирует по центру!',
      de: 'Täuscht links an, schnappt mit der Rückhand nach rechts und serviert dann ruhig in der Mitte!',
      ja: '左から差し出すと見せかけてバックハンドで右へ弾き、中央へピタッと戻す！',
    },
  },
  {
    id: 'INFINITY_CROWN_LOOP',
    icon: '👑♾️',
    difficulty: 3,
    category: 'acrobatics',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Tepe Sonsuzluk Halkası',
      en: 'Overhead Infinity Loop',
      ar: 'حلقة اللانهاية العلوية',
      ru: 'Петля бесконечности над головой',
      de: 'Überkopf-Unendlichkeitsschleife',
      ja: 'オーバーヘッド・インフィニティ',
    },
    descs: {
      tr: 'Külahı baş hizasının üstünde sonsuzluk (∞) halkası çizerek döndürür ve göğüs hizasına indirir!',
      en: 'Traces a high overhead infinity loop near the hanging bells before lowering the cone to chest height!',
      ar: 'يرسم علامة اللانهاية عالياً فوق الرأس بالقرب من الأجراس ثم ينزل القمع للمنتصف!',
      ru: 'Рисует высоко под колокольчиками петлю бесконечности и опускает рожок к груди!',
      de: 'Zeichnet hoch oben unter den Glocken eine Unendlichkeitsschleife und senkt die Waffel dann ab!',
      ja: '頭上のベル近くで無限大（∞）ループを描いてから胸の高さへスッと下ろす！',
    },
  },
  {
    id: 'LEFT_RIGHT_SHELL_BLITZ',
    icon: '👐⚡',
    difficulty: 3,
    category: 'sleight_of_hand',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Üçlü Çapraz Külah Düellosu',
      en: 'Triple Cross-Cone Blitz',
      ar: 'مبارزة الأقماع المتقاطعة',
      ru: 'Тройной блиц с двумя рожками',
      de: 'Dreifach-Waffel-Kreuzblitz',
      ja: 'トリプルクロス・コーンブリッツ',
    },
    descs: {
      tr: 'Sol eldeki yedek külahla çubuktaki gerçek külahı 3 kez yıldırım hızında çapraz değiştirir; gerçek külah durduğunda yakala!',
      en: 'Criss-crosses a decoy wafer in his left hand with the real cone on the rod three rapid times before presenting the real one!',
      ar: 'يقاطع القمع المزيف في يده اليسرى مع القمع الحقيقي ثلاث مرات بسرعة البرق ثم يقدم الحقيقي!',
      ru: 'Трижды молниеносно скрещивает пустой рожок в левой руке с настоящим на шесте — хватай настоящий!',
      de: 'Kreuzt dreimal blitzschnell eine Attrappe links mit der echten Waffel am Stab!',
      ja: '左手のダミーコーンと棒の本物コーンを3回連続で高速交差！止まった本物を掴め！',
    },
  },
  {
    id: 'NAPKIN_FAN_CURTAIN',
    icon: '🧻🎭',
    difficulty: 2,
    category: 'cone_deception',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Peçete Perdesi Sürprizi',
      en: 'Napkin Curtain Reveal',
      ar: 'ستارة المنديل المفاجئة',
      ru: 'Занавес из салфетки',
      de: 'Servietten-Vorhang',
      ja: 'ナプキン・カーテンサプライズ',
    },
    descs: {
      tr: 'Peçeteyi perde gibi açıp külahı sağdan sola gizlice kaydırır; perde kalkıp külah ortaya çıkınca yakala!',
      en: 'Fans a white napkin like a stage curtain while gliding the cone across behind it, then unveils the real offer!',
      ar: 'يفتح المنديل كستارة مسرح ويحرك القمع خلفه قبل أن يكشف عنه في المنتصف!',
      ru: 'Раскрывает салфетку как ширму, переводит рожок за ней и открывает для захвата!',
      de: 'Fächert eine Serviette wie einen Vorhang auf, zieht die Waffel dahinter vorbei und enthüllt sie!',
      ja: 'ナプキンを幕のように広げてコーンを横へ滑らせ、幕が引かれた瞬間に差し出す！',
    },
  },
  {
    id: 'WAITER_TRAY_BALANCE',
    icon: '🍽️🍦',
    difficulty: 2,
    category: 'acrobatics',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Garson Tepsisi Dengesi',
      en: 'Waiter Tray Balance',
      ar: 'توازن صينية النادل',
      ru: 'Баланс официанта на лопатке',
      de: 'Kellner-Tablett-Balance',
      ja: 'ウェイター・トレイバランス',
    },
    descs: {
      tr: 'Külahı çubuğun yassı ucunda garson tepsisi gibi dik taşır, devriliyormuş gibi eğip düzelttikten sonra sunar!',
      en: 'Balances the cone high on the flat paddle blade like a waiter’s tray, fakes a tip-over, then steadies it for you!',
      ar: 'يوازن القمع عالياً على طرف العصا كصينية النادل، يتظاهر بميلانه ثم يثبته لك!',
      ru: 'Балансирует рожком на плоском конце шеста как официант с подносом, делает ложный наклон и подает!',
      de: 'Balanciert die Waffel wie auf einem Kellnertablett, täuscht ein Kippen an und serviert sie stabil!',
      ja: 'ウェイターのトレイのように平らな先端でコーンをバランス運搬し、傾くフェイントの後に差し出す！',
    },
  },
  {
    id: 'DOUBLE_PUMP_CROSSOVER',
    icon: '⚔️🍦',
    difficulty: 2,
    category: 'sleight_of_hand',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Çapraz Çift Pompa',
      en: 'Crossover Double Pump',
      ar: 'الاندفاع المزدوج المتقاطع',
      ru: 'Перекрестный двойной выпад',
      de: 'Kreuz-Doppelpump-Finte',
      ja: 'クロスオーバー・ダブルポンプ',
    },
    descs: {
      tr: 'Önce sol alt köşeye, sonra sağ alt köşeye iki hızlı sahte uzatma yapar; üçüncüde tam ortadan sunar!',
      en: 'Fakes a quick thrust to the bottom-left, then bottom-right, before offering the cone cleanly in the center on beat 3!',
      ar: 'ينطلق بخدعتين سريعتين نحو اليسار الأسفل ثم اليمين الأسفل قبل التقديم في الوسط!',
      ru: 'Делает два резких ложных выпада влево-вниз и вправо-вниз, а на третий раз подает по центру!',
      de: 'Täuscht erst unten links, dann unten rechts an und bietet beim dritten Mal mittig an!',
      ja: '左下、右下へと素早く2回フェイントで突き出し、3回目で中央に差し出す！',
    },
  },
  {
    id: 'TRIANGLE_RHYTHM_CHASE',
    icon: '📐👀',
    difficulty: 3,
    category: 'reactive_service',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Altın Üçgen Ritmi',
      en: 'Golden Triangle Cadence',
      ar: 'إيقاع المثلث الذهبي',
      ru: 'Ритм золотого треугольника',
      de: 'Goldenes-Dreieck-Takt',
      ja: 'ゴールデントライアングル・ビート',
    },
    descs: {
      tr: 'Külahı tepe, sol alt ve sağ alt arasında kusursuz bir üçgen rota üzerinde gezdirir; üçgen kapanınca ortada yakala!',
      en: 'Drives the cone around three sharp vertices of a golden triangle across the stall before settling at the centroid!',
      ar: 'يحرك القمع بين رؤوس مثلث ذهبي ثلاث مرات ثم يثبته في المركز للامساك به!',
      ru: 'Проводит рожок по трем вершинам треугольника и останавливает точно в центре!',
      de: 'Führt die Waffel über drei Ecken eines goldenen Dreiecks und hält im Zentrum an!',
      ja: '上・左下・右下の三角形の頂点をリズミカルに巡り、重心でピタッと止まった瞬間に掴め！',
    },
  },
  {
    id: 'MAGNETIC_PULL_ESCAPE',
    icon: '🧲💨',
    difficulty: 2,
    category: 'reactive_service',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Mıknatıs Kaçışı',
      en: 'Magnetic Repel Escape',
      ar: 'هروب المغناطيس المعاكس',
      ru: 'Магнитный отскок',
      de: 'Magnet-Fluchtsprung',
      ja: 'マグネット・エスケープ',
    },
    descs: {
      tr: 'Külah burnunun dibinde dururken aynı kutuplu mıknatıs gibi iki kez zıt köşelere sıçrar; üçüncü gelişte yakala!',
      en: 'Sits temptingly close, then repels away like opposing magnets to two corners before locking still on the third offer!',
      ar: 'يقترب منك ثم ينفر كمغناطيس نحو زاويتين قبل أن يثبت في المرة الثالثة!',
      ru: 'Подходит вплотную и дважды отскакивает в стороны как одноименный магнит — лови с третьей подачи!',
      de: 'Kommt ganz nah, springt zweimal wie ein Magnet weg und bleibt beim dritten Mal greifbar!',
      ja: '目の前に近づいてから磁石が反発するように2回コーナーへ跳ね、3回目で静止する！',
    },
  },
  {
    id: 'LOW_RAIL_SKIMMER',
    icon: '🛤️🍦',
    difficulty: 2,
    category: 'paddle_spin',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Mermer Kenarı Sıyırması',
      en: 'Marble Rail Skimmer',
      ar: 'انزلاق حافة الرخام',
      ru: 'Скольжение вдоль бортика',
      de: 'Marmorkanten-Gleiter',
      ja: 'マーブルレール・スキマー',
    },
    descs: {
      tr: 'Külahı tezgahın ön pirinç korkuluğu boyunca soldan sağa alçaktan sıyırır, yukarı sıçratıp ortaya kondurur!',
      en: 'Skims the cone low along the front brass rail from left to right, arcs over the bells, and lands in the catch zone!',
      ar: 'يمرر القمع منخفضاً على طول الحافة النحاسية من اليسار لليمين ثم يرفعه ويقدمه في الوسط!',
      ru: 'Проводит рожок низко вдоль переднего бортика слева направо, подбрасывает по дуге и подает!',
      de: 'Zieht die Waffel tief entlang der Messingreling von links nach rechts und hebt sie dann in die Mitte!',
      ja: 'カウンター手前の真鍮レールすれすれを左から右へ滑らせ、弧を描いて中央へ着地させる！',
    },
  },
  {
    id: 'GRAND_FINALE_BOW_TEASE',
    icon: '🙇‍♂️🍦',
    difficulty: 3,
    category: 'acrobatics',
    provenance: 'recreated-service-gesture',
    names: {
      tr: 'Usta Selamı Şakası',
      en: 'Master’s Grand Bow Tease',
      ar: 'تحية المعلم الاستعراضية',
      ru: 'Поклон мастера с разворотом',
      de: 'Meister-Verbeugungsfinte',
      ja: 'マエストロのお辞儀フェイント',
    },
    descs: {
      tr: 'Külahı tepeye kaldırıp reverans yapar gibi öne eğer, 360° çevirip geri çektikten sonra saygıyla sunar!',
      en: 'Raises the cone in a grand salute, bows it deeply forward, spins 360° back, and presents the real serving with flair!',
      ar: 'يرفع القمع في تحية عالية ثم يحنيه للأمام ويديره ٣٦٠ درجة قبل تقديمه بأناقة!',
      ru: 'Поднимает рожок в салюте, низко кланяется им вперед, крутит на 360° и торжественно вручает!',
      de: 'Hebt die Waffel zum Gruß, verbeugt sie tief nach vorn, dreht sie um 360° und serviert!',
      ja: 'コーンを高く掲げてから深くお辞儀させ、360°スピンで引き戻して華麗に差し出す！',
    },
  },
];

export const MARAS_FLOURISH_IDS = new Set(MARAS_FLOURISH_CATALOG.map((t) => t.id));

export function enterMarasFlourish(d) {
  if (!MARAS_FLOURISH_IDS.has(d.currentMechanic)) return false;
  d.marasFlourish = {
    entryPos: d.coneWorldPos.clone(),
    b1: false,
    b2: false,
    b3: false,
  };
  d.world.updateIceCreamScoops(d.scoopCount, false);
  d.coneTargetPos.copy(d.coneWorldPos);
  if (d.currentMechanic === 'MOLD_PENDULUM_HEIST') {
    d.world.setGiantBlockColor?.(flavorFor(d).colorHex);
    d._triggerVendorSpeech('giant');
  } else if (d.currentMechanic === 'LEFT_RIGHT_SHELL_BLITZ') {
    d.world.leftHandConeProp.visible = true;
    d._triggerVendorSpeech('hoppa');
  } else if (d.currentMechanic === 'NAPKIN_FAN_CURTAIN') {
    d.world.napkinProp.visible = true;
    d._triggerVendorSpeech('hmm');
  } else {
    d._triggerVendorSpeech('hoppa');
  }
  return true;
}

export function updateMarasFlourish(d, dt, time, input) {
  if (!MARAS_FLOURISH_IDS.has(d.currentMechanic)) return false;
  const { intentPos, gestureState, validReach } = input;
  const world = d.world;
  const flav = flavorFor(d);
  const tub = d._getTubWorldPosForScoop(Math.max(0, d.scoopCount - 1));
  const state = (d.marasFlourish ||= { entryPos: d.coneWorldPos.clone(), b1: false, b2: false, b3: false });
  const start = state.entryPos;
  const t = d.stageTimer;
  const id = d.currentMechanic;

  const checkFeintPenalty = (icon = '🍦', tMin = 0.20, tMax = 1.38) => {
    if (
      t > tMin &&
      t < tMax &&
      d.stepCooldown <= 0 &&
      d.gestureValidation.reach('feint-penalty', intentPos.distanceTo(d.coneWorldPos), 0.25, dt)
    ) {
      d.stepCooldown = 0.8;
      d._triggerVendorSpeech('laugh');
      if (d._loseHeart(d.coneWorldPos, icon)) return true;
    }
    return false;
  };

  if (id === 'TRIPLE_BELL_CRESCENDO') {
    if (d.subStep === 0) {
      const bL = V(-0.24, 1.44, 0.18), bR = V(0.24, 1.44, 0.18), bC = V(0.0, 1.46, 0.19), offer = V(0.02, 1.22, 0.28);
      if (t < 0.38) d.coneTargetPos.copy(mix(start, bL, t / 0.38));
      else if (t < 0.76) d.coneTargetPos.copy(mix(bL, bR, (t - 0.38) / 0.38));
      else if (t < 1.12) d.coneTargetPos.copy(mix(bR, bC, (t - 0.76) / 0.36));
      else d.coneTargetPos.copy(mix(bC, offer, (t - 1.12) / 0.42));
      d.shaftRoll = Math.sin(t * Math.PI * 3) * 0.45;
      if (t >= 0.35 && !state.b1) { state.b1 = true; world.ringBells?.([0]); d.sound.playBellStrike?.(0); }
      if (t >= 0.73 && !state.b2) { state.b2 = true; world.ringBells?.([2]); d.sound.playBellStrike?.(2); }
      if (t >= 1.10 && !state.b3) { state.b3 = true; world.ringBells?.([1]); d.sound.playBellStrike?.(1); }
      if (checkFeintPenalty('🔔')) return true;
      if (t >= 1.54) { d.shaftRoll = 0; toPhase(d, 1); d._triggerVendorSpeech('yakala'); }
    } else {
      d.shaftRoll = 0;
      d.coneTargetPos.set(0.02 + Math.sin(time * 2.2) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 370, '🔔'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'COUNTER_DRUM_CADENCE') {
    if (d.subStep === 0) {
      if (t < 1.15) {
        const beat = Math.floor(t / 0.38);
        const bp = (t % 0.38) / 0.38;
        const strikeX = beat === 0 ? -0.14 : beat === 1 ? 0.0 : 0.14;
        const drumArc = Math.abs(Math.sin(bp * Math.PI));
        // Free left hand drums the actual marble counter rail while cone dances safely upright above!
        d.leftHandCustomTarget = V(strikeX, 1.02 + (1 - drumArc) * 0.12, 0.20);
        const target = V(strikeX * 0.75, 1.26 + drumArc * 0.06, 0.25);
        d.coneTargetPos.copy(mix(start, target, Math.min(1, t / 0.25)));
        if (bp > 0.45 && bp < 0.65 && state.lastBeat !== beat) {
          state.lastBeat = beat;
          world.triggerCounterImpact?.(V(strikeX, 1.01, 0.22), 0.45);
          d.sound.playPaddleClank?.(0.5, strikeX);
        }
      } else {
        d.leftHandCustomTarget = null;
        d.coneTargetPos.copy(mix(V(0.10, 1.26, 0.25), V(-0.04, 1.22, 0.28), (t - 1.15) / 0.40));
      }
      if (checkFeintPenalty('🥁')) return true;
      if (t >= 1.55) { d.leftHandCustomTarget = null; toPhase(d, 1); d._triggerVendorSpeech('hoppa'); }
    } else {
      d.leftHandCustomTarget = null;
      d.coneTargetPos.set(-0.04 + Math.sin(time * 2.1) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 350, '🥁'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'SYNCOPATED_BELL_FAKE') {
    if (d.subStep === 0) {
      const nearBell = V(-0.08, 1.41, 0.19), lowBait = V(0.06, 1.18, 0.29), realBell = V(0.08, 1.45, 0.18), offer = V(0.0, 1.22, 0.28);
      if (t < 0.42) d.coneTargetPos.copy(mix(start, nearBell, t / 0.42));
      else if (t < 0.78) d.coneTargetPos.copy(nearBell); // Syncopated silent pause!
      else if (t < 1.12) d.coneTargetPos.copy(mix(nearBell, lowBait, (t - 0.78) / 0.34));
      else if (t < 1.38) {
        d.coneTargetPos.copy(mix(lowBait, realBell, (t - 1.12) / 0.26));
        if (t >= 1.30 && !state.b1) { state.b1 = true; world.ringBells?.([1]); d.sound.playBellStrike?.(1); }
      } else d.coneTargetPos.copy(mix(realBell, offer, (t - 1.38) / 0.27));
      if (checkFeintPenalty('🔕', 0.20, 1.48)) return true;
      if (t >= 1.65) { toPhase(d, 1); d._triggerVendorSpeech('yakala'); }
    } else {
      d.coneTargetPos.set(Math.sin(time * 2.0) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 360, '🔔'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'TWIN_RIBBON_SCISSORS') {
    if (d.subStep === 0) {
      const swing = V(Math.sin(t * Math.PI * 2.8) * 0.22, 1.35, 0.21);
      d.coneTargetPos.copy(mix(start, swing, Math.min(1, t / 0.30)));
      d.shaftRoll = Math.cos(t * Math.PI * 2.8) * 0.5;
      const tubAnchor = tub.clone().add(V(0, 0.05, 0));
      if (t < 1.44) {
        const strandStart = t < 1.20 ? tubAnchor : mix(tubAnchor, d.coneWorldPos, (t - 1.20) / 0.24);
        if (t >= 1.20 && !state.retracted) { state.retracted = true; d.sound.playStretchPull?.(0.65, d.coneWorldPos.x); }
        world.stretchyStrand.attach(strandStart, d.coneWorldPos, flav.colorHex, false);
        world.stretchyStrand.update(dt, strandStart, d.coneWorldPos, 0.45 * (1 - Math.max(0, (t - 1.20) / 0.24)));
      } else {
        world.stretchyStrand.detach();
      }
      if (checkFeintPenalty('✂️')) return true;
      if (t >= 1.52) { world.stretchyStrand.detach(); d.shaftRoll = 0; toPhase(d, 1); d._triggerVendorSpeech('hoppa'); }
    } else {
      world.stretchyStrand.detach();
      d.shaftRoll = 0;
      d.coneTargetPos.set(0.05 + Math.sin(time * 2.2) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 360, '✂️'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'ELASTIC_BUNGEE_YO_YO') {
    if (d.subStep === 0) {
      const anchor = V(-0.06, 1.44, 0.20);
      d.leftHandCustomTarget = t < 1.42 ? V(-0.06, 1.42, 0.16) : null;
      const bounceY = 1.28 - Math.sin(t * Math.PI * 2.6) * 0.16;
      const target = V(-0.06 + Math.cos(t * Math.PI * 2.6) * 0.08, bounceY, 0.25);
      d.coneTargetPos.copy(mix(start, target, Math.min(1, t / 0.28)));
      if (t < 1.42) {
        const strandTop = t < 1.22 ? anchor : mix(anchor, d.coneWorldPos, (t - 1.22) / 0.20);
        world.stretchyStrand.attach(strandTop, d.coneWorldPos, flav.colorHex, false);
        world.stretchyStrand.update(dt, strandTop, d.coneWorldPos, 0.4 * (1 - Math.max(0, (t - 1.22) / 0.20)));
      } else {
        world.stretchyStrand.detach();
      }
      if (checkFeintPenalty('🪀')) return true;
      if (t >= 1.54) { d.leftHandCustomTarget = null; world.stretchyStrand.detach(); toPhase(d, 1); d._triggerVendorSpeech('hoppa'); }
    } else {
      d.leftHandCustomTarget = null;
      world.stretchyStrand.detach();
      d.coneTargetPos.set(-0.05 + Math.sin(time * 2.1) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 370, '🪀'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'MOLD_PENDULUM_HEIST') {
    if (d.subStep === 0) {
      const seat = world.getTubMoldSeat?.(flav.index) || tub.clone();
      const swingX = Math.sin(t * Math.PI * 2.2) * 0.22;
      const pos = V(swingX, 1.38, -0.05);
      const blockPos = t < 0.35 ? mix(seat, pos, t / 0.35) : t < 1.25 ? pos : mix(pos, seat, (t - 1.25) / 0.35);
      world.setMoldPresentation?.({ mode: 'block', tubIndex: flav.index, position: blockPos });
      d.leftHandCustomTarget = blockPos.clone().add(V(0.06, -0.05, 0.02));
      // Cone counter-swings cleanly in front of the raised mold without clipping!
      const coneFeint = V(-swingX * 0.85, 1.22, 0.25);
      d.coneTargetPos.copy(mix(start, coneFeint, Math.min(1, t / 0.28)));
      if (checkFeintPenalty('🧊')) return true;
      if (t >= 1.60) {
        world.clearMoldPresentation?.();
        d.leftHandCustomTarget = null;
        if (world.tubIceGroups?.[flav.index]) world.tubIceGroups[flav.index].fill = 1;
        toPhase(d, 1);
        d._triggerVendorSpeech('hoppa');
      }
    } else {
      world.clearMoldPresentation?.();
      d.leftHandCustomTarget = null;
      d.coneTargetPos.set(0.03 + Math.sin(time * 2.0) * 0.03, 1.23, 0.27);
      if (validReach(0.28)) { reward(d, 380, '🧊'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'UNDER_ARM_PIROUETTE') {
    if (d.subStep === 0) {
      const lowRight = V(0.26, 1.12, 0.15), underLeft = V(-0.18, 1.15, 0.23), highPop = V(0.14, 1.39, 0.19), offer = V(0.06, 1.22, 0.28);
      if (t < 0.42) d.coneTargetPos.copy(mix(start, lowRight, t / 0.42));
      else if (t < 0.84) d.coneTargetPos.copy(mix(lowRight, underLeft, (t - 0.42) / 0.42));
      else if (t < 1.22) d.coneTargetPos.copy(mix(underLeft, highPop, (t - 0.84) / 0.38));
      else d.coneTargetPos.copy(mix(highPop, offer, (t - 1.22) / 0.32));
      d.shaftRoll = ease(t / 1.54) * Math.PI * 4;
      if (checkFeintPenalty('🤺')) return true;
      if (t >= 1.54) { d.shaftRoll = 0; toPhase(d, 1); d._triggerVendorSpeech('hoppa'); }
    } else {
      d.shaftRoll = 0;
      d.coneTargetPos.set(0.06 + Math.sin(time * 2.2) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 370, '🤺'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'HORIZONTAL_HELICOPTER') {
    if (d.subStep === 0) {
      const ang = (t / 1.50) * Math.PI * 2.5;
      const orbit = V(Math.sin(ang) * 0.26, 1.24, 0.21 + Math.cos(ang) * 0.07);
      d.coneTargetPos.copy(mix(start, orbit, Math.min(1, t / 0.28)));
      d.shaftRoll = (t / 1.50) * Math.PI * 3;
      if (checkFeintPenalty('🚁')) return true;
      if (t >= 1.50) { d.shaftRoll = 0; toPhase(d, 1); d._triggerVendorSpeech('yakala'); }
    } else {
      d.shaftRoll = 0;
      d.coneTargetPos.set(-0.03 + Math.sin(time * 2.3) * 0.03, 1.23, 0.28);
      if (validReach(0.28)) { reward(d, 350, '🚁'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'BACKHAND_WRIST_SNAP') {
    if (d.subStep === 0) {
      const leftBait = V(-0.22, 1.23, 0.27), rightSnap = V(0.24, 1.27, 0.20), highLeft = V(-0.14, 1.38, 0.19), offer = V(0.0, 1.22, 0.28);
      if (t < 0.42) { d.coneTargetPos.copy(mix(start, leftBait, t / 0.42)); d.shaftRoll = 0.4; }
      else if (t < 0.82) { d.coneTargetPos.copy(mix(leftBait, rightSnap, (t - 0.42) / 0.40)); d.shaftRoll = -1.8; }
      else if (t < 1.18) { d.coneTargetPos.copy(mix(rightSnap, highLeft, (t - 0.82) / 0.36)); d.shaftRoll = 1.4; }
      else { d.coneTargetPos.copy(mix(highLeft, offer, (t - 1.18) / 0.32)); d.shaftRoll = 0; }
      if (checkFeintPenalty('🫱')) return true;
      if (t >= 1.50) { d.shaftRoll = 0; toPhase(d, 1); d._triggerVendorSpeech('hoppa'); }
    } else {
      d.shaftRoll = 0;
      d.coneTargetPos.set(Math.sin(time * 2.1) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 350, '🫱'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'INFINITY_CROWN_LOOP') {
    if (d.subStep === 0) {
      const ang = (t / 1.52) * Math.PI * 2;
      const loop = V(Math.sin(ang) * 0.25, 1.41 + Math.sin(ang * 2) * 0.06, 0.19);
      d.coneTargetPos.copy(t < 1.20 ? mix(start, loop, Math.min(1, t / 0.28)) : mix(loop, V(-0.02, 1.22, 0.28), (t - 1.20) / 0.32));
      d.conePitchX = Math.sin(ang) * 0.20;
      d.shaftRoll = Math.cos(ang) * 0.8;
      if (checkFeintPenalty('👑')) return true;
      if (t >= 1.52) { d.conePitchX = 0; d.shaftRoll = 0; toPhase(d, 1); d._triggerVendorSpeech('afiyet'); }
    } else {
      d.conePitchX = 0;
      d.shaftRoll = 0;
      d.coneTargetPos.set(-0.02 + Math.sin(time * 2.0) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 370, '👑'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'LEFT_RIGHT_SHELL_BLITZ') {
    if (d.subStep === 0) {
      world.leftHandConeProp.visible = true;
      const swapX = Math.sin(t * Math.PI * 3.8) * 0.24;
      const swapY = 1.25 + Math.cos(t * Math.PI * 3.8) * 0.07;
      d.coneTargetPos.copy(mix(start, V(swapX, swapY, 0.23), Math.min(1, t / 0.25)));
      d.leftHandCustomTarget = V(-swapX, 2.50 - swapY, 0.21);
      d.shaftRoll = Math.sin(t * Math.PI * 3.8) * 0.9;
      if (checkFeintPenalty('👐')) return true;
      if (t >= 1.54) {
        world.leftHandConeProp.visible = false;
        d.leftHandCustomTarget = null;
        d.shaftRoll = 0;
        toPhase(d, 1);
        d._triggerVendorSpeech('yakala');
      }
    } else {
      world.leftHandConeProp.visible = false;
      d.leftHandCustomTarget = null;
      d.shaftRoll = 0;
      d.coneTargetPos.set(0.08 + Math.sin(time * 2.1) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 380, '👐'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'NAPKIN_FAN_CURTAIN') {
    if (d.subStep === 0) {
      world.napkinProp.visible = true;
      const curtain = V(Math.cos(t * Math.PI * 2.4) * 0.23, 1.27, 0.17);
      d.coneTargetPos.copy(mix(start, curtain, Math.min(1, t / 0.28)));
      d.leftHandCustomTarget = V(Math.sin(t * Math.PI * 4.8) * 0.05, 1.25, 0.25);
      if (checkFeintPenalty('🧻')) return true;
      if (t >= 1.52) {
        world.napkinProp.visible = false;
        d.leftHandCustomTarget = null;
        toPhase(d, 1);
        d._triggerVendorSpeech('hoppa');
      }
    } else {
      world.napkinProp.visible = false;
      d.leftHandCustomTarget = null;
      d.coneTargetPos.set(-0.06 + Math.sin(time * 2.0) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 360, '🧻'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'WAITER_TRAY_BALANCE') {
    if (d.subStep === 0) {
      const trayLeft = V(-0.24, 1.36, 0.22), trayRight = V(0.24, 1.36, 0.22), tipFront = V(0.0, 1.19, 0.29), offer = V(0.02, 1.22, 0.28);
      if (t < 0.48) { d.coneTargetPos.copy(mix(start, trayLeft, t / 0.48)); d.conePitchX = -0.22; }
      else if (t < 0.96) { d.coneTargetPos.copy(mix(trayLeft, trayRight, (t - 0.48) / 0.48)); d.conePitchX = -0.22; d.coneFlipZ = 0.16; }
      else if (t < 1.28) { d.coneTargetPos.copy(mix(trayRight, tipFront, (t - 0.96) / 0.32)); d.conePitchX = 0.26; d.coneFlipZ = -0.14; }
      else { d.coneTargetPos.copy(mix(tipFront, offer, (t - 1.28) / 0.26)); d.conePitchX = 0; d.coneFlipZ = 0; }
      if (checkFeintPenalty('🍽️')) return true;
      if (t >= 1.54) { d.conePitchX = 0; d.coneFlipZ = 0; toPhase(d, 1); d._triggerVendorSpeech('afiyet'); }
    } else {
      d.conePitchX = 0;
      d.coneFlipZ = 0;
      d.coneTargetPos.set(0.02 + Math.sin(time * 2.0) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 350, '🍽️'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'DOUBLE_PUMP_CROSSOVER') {
    if (d.subStep === 0) {
      const pL = V(-0.22, 1.15, 0.29), back1 = V(0.0, 1.35, 0.14), pR = V(0.22, 1.15, 0.29), offer = V(0.0, 1.22, 0.28);
      if (t < 0.38) d.coneTargetPos.copy(mix(start, pL, t / 0.38));
      else if (t < 0.74) d.coneTargetPos.copy(mix(pL, back1, (t - 0.38) / 0.36));
      else if (t < 1.12) d.coneTargetPos.copy(mix(back1, pR, (t - 0.74) / 0.38));
      else d.coneTargetPos.copy(mix(pR, offer, (t - 1.12) / 0.38));
      d.shaftRoll = Math.sin(t * Math.PI * 2.6) * 0.65;
      if (checkFeintPenalty('⚔️')) return true;
      if (t >= 1.50) { d.shaftRoll = 0; toPhase(d, 1); d._triggerVendorSpeech('yakala'); }
    } else {
      d.shaftRoll = 0;
      d.coneTargetPos.set(Math.sin(time * 2.2) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 360, '⚔️'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'TRIANGLE_RHYTHM_CHASE') {
    if (d.subStep === 0) {
      const vTop = V(0.0, 1.43, 0.20), vBL = V(-0.24, 1.16, 0.26), vBR = V(0.24, 1.16, 0.26), center = V(0.0, 1.23, 0.28);
      if (t < 0.38) d.coneTargetPos.copy(mix(start, vTop, t / 0.38));
      else if (t < 0.76) d.coneTargetPos.copy(mix(vTop, vBL, (t - 0.38) / 0.38));
      else if (t < 1.14) d.coneTargetPos.copy(mix(vBL, vBR, (t - 0.76) / 0.38));
      else d.coneTargetPos.copy(mix(vBR, center, (t - 1.14) / 0.38));
      d.shaftRoll = (t / 1.52) * Math.PI * 2;
      if (checkFeintPenalty('📐')) return true;
      if (t >= 1.52) { d.shaftRoll = 0; toPhase(d, 1); d._triggerVendorSpeech('hoppa'); }
    } else {
      d.shaftRoll = 0;
      d.coneTargetPos.set(Math.sin(time * 2.1) * 0.03, 1.23, 0.28);
      if (validReach(0.28)) { reward(d, 370, '📐'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'MAGNETIC_PULL_ESCAPE') {
    if (d.subStep === 0) {
      const close = V(0.0, 1.24, 0.30), dodge1 = V(-0.23, 1.39, 0.16), dodge2 = V(0.23, 1.14, 0.18), offer = V(0.04, 1.22, 0.28);
      if (t < 0.36) d.coneTargetPos.copy(mix(start, close, t / 0.36));
      else if (t < 0.74) {
        if (!state.b1) { state.b1 = true; d.sound.playWhoosh?.(0.5, -0.2); }
        d.coneTargetPos.copy(mix(close, dodge1, (t - 0.36) / 0.38));
      } else if (t < 1.14) {
        if (!state.b2) { state.b2 = true; d.sound.playWhoosh?.(0.5, 0.2); }
        d.coneTargetPos.copy(mix(dodge1, dodge2, (t - 0.74) / 0.40));
      } else d.coneTargetPos.copy(mix(dodge2, offer, (t - 1.14) / 0.38));
      if (checkFeintPenalty('🧲')) return true;
      if (t >= 1.52) { toPhase(d, 1); d._triggerVendorSpeech('yakala'); }
    } else {
      d.coneTargetPos.set(0.04 + Math.sin(time * 2.0) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 360, '🧲'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'LOW_RAIL_SKIMMER') {
    if (d.subStep === 0) {
      const railL = V(-0.26, 1.11, 0.28), railR = V(0.26, 1.11, 0.28), highArc = V(0.0, 1.43, 0.21), offer = V(-0.04, 1.22, 0.28);
      if (t < 0.38) d.coneTargetPos.copy(mix(start, railL, t / 0.38));
      else if (t < 0.82) d.coneTargetPos.copy(mix(railL, railR, (t - 0.38) / 0.44));
      else if (t < 1.20) d.coneTargetPos.copy(mix(railR, highArc, (t - 0.82) / 0.38));
      else d.coneTargetPos.copy(mix(highArc, offer, (t - 1.20) / 0.32));
      d.shaftRoll = -ease(t / 1.52) * Math.PI * 2;
      if (checkFeintPenalty('🛤️')) return true;
      if (t >= 1.52) { d.shaftRoll = 0; toPhase(d, 1); d._triggerVendorSpeech('hoppa'); }
    } else {
      d.shaftRoll = 0;
      d.coneTargetPos.set(-0.04 + Math.sin(time * 2.2) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 350, '🛤️'); d._advanceRoutineStep(); }
    }
    return true;
  }

  if (id === 'GRAND_FINALE_BOW_TEASE') {
    if (d.subStep === 0) {
      const salute = V(0.0, 1.46, 0.18), bow = V(0.0, 1.14, 0.30), spinBack = V(-0.16, 1.34, 0.15), offer = V(0.02, 1.22, 0.28);
      if (t < 0.38) { d.coneTargetPos.copy(mix(start, salute, t / 0.38)); d.conePitchX = -0.18; }
      else if (t < 0.78) { d.coneTargetPos.copy(mix(salute, bow, (t - 0.38) / 0.40)); d.conePitchX = 0.28; }
      else if (t < 1.18) { d.coneTargetPos.copy(mix(bow, spinBack, (t - 0.78) / 0.40)); d.conePitchX = 0; d.shaftRoll = ease((t - 0.78) / 0.40) * Math.PI * 2; }
      else { d.coneTargetPos.copy(mix(spinBack, offer, (t - 1.18) / 0.36)); d.shaftRoll = 0; }
      if (checkFeintPenalty('🙇‍♂️')) return true;
      if (t >= 1.54) { d.conePitchX = 0; d.shaftRoll = 0; toPhase(d, 1); d._triggerVendorSpeech('afiyet'); }
    } else {
      d.conePitchX = 0;
      d.shaftRoll = 0;
      d.coneTargetPos.set(0.02 + Math.sin(time * 2.0) * 0.03, 1.22, 0.28);
      if (validReach(0.28)) { reward(d, 380, '🙇‍♂️'); d._advanceRoutineStep(); }
    }
    return true;
  }

  return false;
}

export function marasFlourishCue(d) {
  if (!MARAS_FLOURISH_IDS.has(d.currentMechanic)) return null;
  return d.subStep === 0
    ? { kind: 'wait', trap: true, target: d.coneWorldPos, progress: Math.min(1, d.stageTimer / 1.52) }
    : { kind: 'reach', target: d.coneWorldPos, progress: 1 };
}
