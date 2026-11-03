/**
 * Turkish Ice Cream Challenge — Unified Singleplayer & Future 2-Player (Vendor vs. Customer) Protocol
 *
 * Designed so the 3D World (`GameWorld`) and Trick State Machine (`TrickDirector`) operate via
 * deterministic commands and state snapshots:
 *  - Mode 1 (Active): `SINGLEPLAYER_CUSTOMER` (Player = Customer POV Hand, AI = Master Vendor)
 *  - Mode 2 (Ready Hook): `SINGLEPLAYER_VENDOR` (Player = Vendor controlling paddle & tricks, AI = Tourist)
 *  - Mode 3 (Ready Hook): `MULTIPLAYER_DUEL` (2 Players over WebSocket/WebRTC: 1 Vendor vs. 1 Customer)
 */

export const GAME_MODES = {
  SINGLEPLAYER_CUSTOMER: 'SINGLEPLAYER_CUSTOMER',
  SINGLEPLAYER_VENDOR: 'SINGLEPLAYER_VENDOR',
  MULTIPLAYER_DUEL: 'MULTIPLAYER_DUEL',
};

export const PLAYER_ROLES = {
  CUSTOMER: 'CUSTOMER',
  VENDOR: 'VENDOR',
  SPECTATOR: 'SPECTATOR',
};

/**
 * 6 Authentic Kahramanmaraş Ice Cream Tubs in the Copper Cart
 */
export const ICE_CREAM_FLAVORS = [
  {
    id: 'vanilla',
    index: 0,
    colorHex: 0xfff8e7,
    cssColor: '#fff8e7',
    borderColor: '#f5b942',
    emoji: '🍦',
    xOffset: -0.62,
    names: {
      tr: 'Sade Keçi Sütlü',
      en: 'Goat Milk Vanilla',
      ar: 'حليب الماعز',
      ru: 'Козье молоко',
      de: 'Ziegenmilch',
      ja: 'ヤギミルク',
    },
  },
  {
    id: 'pistachio',
    index: 1,
    colorHex: 0x76c84d,
    cssColor: '#76c84d',
    borderColor: '#4ade80',
    emoji: '💚',
    xOffset: -0.37,
    names: {
      tr: 'Antep Fıstıklı',
      en: 'Antep Pistachio',
      ar: 'فستق عنتاب',
      ru: 'Фисташковое',
      de: 'Pistazie',
      ja: 'ピスタチオ',
    },
  },
  {
    id: 'chocolate',
    index: 2,
    colorHex: 0x5c2c16,
    cssColor: '#7f4224',
    borderColor: '#d97706',
    emoji: '🍫',
    xOffset: -0.12,
    names: {
      tr: 'Maraş Kakaolu',
      en: 'Dark Chocolate',
      ar: 'شوكولاتة مرعش',
      ru: 'Шоколадное',
      de: 'Schokolade',
      ja: 'チョコレート',
    },
  },
  {
    id: 'berry',
    index: 3,
    colorHex: 0xd92662,
    cssColor: '#e63973',
    borderColor: '#fb7185',
    emoji: '🫐',
    xOffset: 0.12,
    names: {
      tr: 'Karadut & Vişne',
      en: 'Mulberry & Cherry',
      ar: 'توت أسود وكرز',
      ru: 'Шелковица',
      de: 'Maulbeere',
      ja: 'マルベリー',
    },
  },
  {
    id: 'caramel',
    index: 4,
    colorHex: 0xf4a236,
    cssColor: '#f4a236',
    borderColor: '#fde047',
    emoji: '🍯',
    xOffset: 0.37,
    names: {
      tr: 'Bal & Badem',
      en: 'Honey Almond',
      ar: 'عسل ولوز',
      ru: 'Мед и миндаль',
      de: 'Honig-Mandel',
      ja: 'ハニーアーモンド',
    },
  },
  {
    id: 'mastic',
    index: 5,
    colorHex: 0x56cfe1,
    cssColor: '#56cfe1',
    borderColor: '#67e8f9',
    emoji: '💎',
    xOffset: 0.62,
    names: {
      tr: 'Damla Sakızlı',
      en: 'Aegean Mastic',
      ar: 'المستكة',
      ru: 'Мастика',
      de: 'Mastix-Eis',
      ja: 'マスティック',
    },
  },
];

/**
 * 15 Authentic Turkish Ice Cream Vendor Tricks (Maraş Dondurmacısı Hile Listesi)
 */
export const TRICK_CATALOG = [
  {
    id: 'DOUBLE_CONE_SLIDE',
    icon: '🍦🍦',
    difficulty: 1,
    category: 'cone_deception',
    names: {
      tr: 'Çift Külah Tuzağı',
      en: 'Nested Double Cone',
      ar: 'خدعة القمع المزدوج',
      ru: 'Двойной рожок',
      de: 'Doppelwaffel-Trick',
      ja: '二重コーンの罠',
    },
    descs: {
      tr: 'Usta iki külahı iç içe geçirir; sen dıştaki külahı tutarken içteki dondurmalı külahı çubukla çekip alır!',
      en: 'Vendor nests two cones together; you grab the outer cone while he pulls the inner ice cream cone away!',
      ar: 'يضع البائع قمعين داخل بعضهما؛ تمسك الخارجي ويسحب الداخلي مع البوظة!',
      ru: 'Мастер вкладывает два рожка друг в друга и вытягивает внутренний с мороженым!',
      de: 'Der Meister steckt zwei Waffeln ineinander und zieht die innere samt Eis heraus!',
      ja: '2つのコーンを重ね、外側の空コーンだけをあなたの手に残して中身を引き抜く！',
    },
  },
  {
    id: 'GIANT_BLOCK_TEASE',
    icon: '🧊🍦',
    difficulty: 1,
    category: 'elastic_mass',
    names: {
      tr: 'Kalıptan Dev Kütle Çıkarma',
      en: 'Giant 5-Kilo Block Tease',
      ar: 'قالب البوظة العملاق',
      ru: 'Гигантский блок мороженого',
      de: 'Riesen-Eisblock',
      ja: '巨大アイス塊フェイント',
    },
    descs: {
      tr: 'Seçtiğin dondurmayı kazandan 5 kiloluk dev kalıp halinde sündürerek çıkarır, burnuna kadar uzatıp geri çeker!',
      en: 'Lifts the entire 5-kilo block of your chosen flavor out of the tub, dangles it in front of you, then yanks it back!',
      ar: 'يرفع قالب البوظة العملاق من الحوض ويمده أمامك ثم يسحبه بسرعة!',
      ru: 'Достает из чана огромную 5-килограммовую глыбу мороженого и дразнит перед лицом!',
      de: 'Hebt den gesamten 5-Kilo-Eisblock aus dem Kessel, hält ihn dir hin und zieht ihn weg!',
      ja: '選んだ味の5キロの巨大アイス塊をそのまま持ち上げて目の前に差し出し、サッと引き戻す！',
    },
  },
  {
    id: 'MIDAIR_BLOCK_SOMERSAULT',
    icon: '🤸🍦',
    difficulty: 2,
    category: 'acrobatics',
    names: {
      tr: 'Havada Dev Dondurma Taklası',
      en: 'Mid-Air Ice Cream Somersault',
      ar: 'شقلبة البوظة في الهواء',
      ru: 'Сальто мороженого в воздухе',
      de: 'Eis-Salto in der Luft',
      ja: '空中大回転アイス',
    },
    descs: {
      tr: 'Sünen dev dondurma kütlesini havaya fırlatıp 360° takla attırır ve demir kürekle havada yakalar!',
      en: 'Launches the stretchy ice cream mass into the air for a 360° somersault and catches it on the steel paddle!',
      ar: 'يقذف كتلة البوظة المطاطية في الهواء لتشقلب ٣٦٠ درجة ويلتقطها بالعصا!',
      ru: 'Подбрасывает тягучее мороженое в воздух с переворотом на 360° и ловит на лопатку!',
      de: 'Wirft die elastische Eismasse für einen 360°-Salto in die Luft und fängt sie mit dem Stab!',
      ja: '伸びる巨大アイスを空中に放り投げ、360度宙返りさせて鉄ヘラでキャッチ！',
    },
  },
  {
    id: 'SHAFT_SPIN_360',
    icon: '🌀🥖',
    difficulty: 1,
    category: 'paddle_spin',
    names: {
      tr: 'Kendi Etrafında 360° Fırıldak',
      en: '360° Axial Shaft Spin',
      ar: 'دوران العصا ٣٦٠ درجة',
      ru: 'Вращение на 360° вокруг оси',
      de: '360°-Stabwirbel',
      ja: '鉄棒360度スピン',
    },
    descs: {
      tr: 'Demir çubuğu avuçlarında hızla yuvarlayarak külahı kendi ekseni etrafında fırıldak gibi döndürür!',
      en: 'Rolls the long metal rod between his palms so the cone revolves 360° around the shaft axis!',
      ar: 'يدير العصا المعدنية بين كفيه ليدور القمع ٣٦٠ درجة حول نفسه!',
      ru: 'Быстро крутит железный шест в ладонях, вращая рожок на 360° вокруг оси!',
      de: 'Rollt die Eisenstange zwischen den Händen, sodass sich die Waffel um 360° dreht!',
      ja: '鉄の棒を両手で高速回転させ、コーンを軸の周りで360度くるくる回す！',
    },
  },
  {
    id: 'VERTICAL_WINDMILL',
    icon: '🎡⬆️',
    difficulty: 2,
    category: 'paddle_spin',
    names: {
      tr: 'Yukarı-Aşağı Değirmen Çevirme',
      en: 'Up-Down Vertical Windmill',
      ar: 'طاحونة الهواء العمودية',
      ru: 'Вертикальная мельница',
      de: 'Vertikale Windmühle',
      ja: '上下風車スイング',
    },
    descs: {
      tr: 'Dondurmayı dik tutmak yerine çubukla yukarı-aşağı dev daireler çizerek başının üstünden tezgâha indirir!',
      en: 'Swings the paddle in giant vertical up-and-down circles from above your head down to the counter!',
      ar: 'يأرجح العصا في دوائر عمودية كبيرة من فوق رأسك إلى الطاولة!',
      ru: 'Крутит шест огромными вертикальными кругами сверху вниз!',
      de: 'Schwingt den Stab in großen vertikalen Kreisen von oben nach unten!',
      ja: '棒を上下に大きく振り回し、頭上からカウンターまで風車のように回転させる！',
    },
  },
  {
    id: 'UPSIDE_DOWN_GRAVITY',
    icon: '🙃🍦',
    difficulty: 2,
    category: 'gravity_trap',
    names: {
      tr: 'Ters Külah Yerçekimi Şakası',
      en: 'Upside-Down Gravity Tease',
      ar: 'خدعة القمع المقلوب',
      ru: 'Перевернутый рожок',
      de: 'Kopfstand-Waffel',
      ja: '逆さまコーンの誘惑',
    },
    descs: {
      tr: 'Külahı tam 180° baş aşağı çevirip sallar; Maraş dondurması düşmez ama tersken uzanırsan elin boş kalır!',
      en: 'Flips the cone 180° upside down and shakes it; reach while inverted and you lose a heart!',
      ar: 'يقلب القمع ١٨٠ درجة رأساً على عقب؛ إذا مددت يدك وهو مقلوب تخسر محاولة!',
      ru: 'Переворачивает рожок вверх дном на 180° — не хватай, пока он перевернут!',
      de: 'Dreht die Waffel um 180° auf den Kopf — greif nicht zu, solange sie verkehrt herum ist!',
      ja: 'コーンを180度逆さまにして揺らす！逆さまの間に手を伸ばすと罠にかかるぞ！',
    },
  },
  {
    id: 'FAKE_DROP_PANIC',
    icon: '😱⬇️',
    difficulty: 2,
    category: 'gravity_trap',
    names: {
      tr: 'Yalancı Düşürme Paniği',
      en: 'Fake Drop Panic',
      ar: 'خدعة السقوط الكاذب',
      ru: 'Ложное падение',
      de: 'Schein-Fall-Schreck',
      ja: '落下フェイント',
    },
    descs: {
      tr: 'Dondurma üstüne düşüyormuş gibi hızla aşağı bırakır; panikle el uzatırsan sakız gibi yukarı geri sıçratır!',
      en: 'Pretends to drop the ice cream toward your lap, then snaps it back up on an elastic strand!',
      ar: 'يتظاهر بأن البوظة تسقط عليك ثم يسحبها للأعلى كالمطاط!',
      ru: 'Делает вид, что роняет мороженое вам на руки, и резко подтягивает обратно!',
      de: 'Tut so, als würde das Eis fallen, und zieht es im letzten Moment elastisch hoch!',
      ja: 'アイスが落ちるように見せかけて急降下させ、ゴムのように跳ね上げて回収する！',
    },
  },
  {
    id: 'MEGA_TAFFY_SLICE',
    icon: '✂️🧀',
    difficulty: 1,
    category: 'elastic_mass',
    names: {
      tr: 'Metrelik Sünme & Bıçak Kesimi',
      en: 'Meter-Long Taffy Stretch & Slice',
      ar: 'مط البوظة وقطعها',
      ru: 'Метровая тянучка и срез',
      de: 'Meter-Dehnung & Schnitt',
      ja: '超ロング伸び＆スライス',
    },
    descs: {
      tr: 'Kazanla külah arasında 1.5 metre uzayan Maraş dondurmasını altın çizgiden parmağınla keserek kopar!',
      en: 'Stretches a 1.5m viscoelastic ribbon from the tub — swipe across the golden line to slice it clean!',
      ar: 'يمط البوظة لمتر ونصف من الحوض — اسحب بالعرض لقطعها!',
      ru: 'Растягивает мороженое на полтора метра — проведи пальцем поперек, чтобы срезать!',
      de: 'Zieht das Eis über 1,5 Meter lang — wische quer durch die goldene Linie!',
      ja: '釜から1.5メートル伸びたトルコアイスを、金のラインに沿ってスワイプして断ち切れ！',
    },
  },
  {
    id: 'NAPKIN_CONE_FAKEOUT',
    icon: '🧻😂',
    difficulty: 2,
    category: 'cone_deception',
    names: {
      tr: 'Peçeteli Külah Şakası',
      en: 'Stuffed Napkin Cone Prank',
      ar: 'خدعة قمع المنديل',
      ru: 'Рожок с салфеткой',
      de: 'Servietten-Waffel',
      ja: 'ナプキン入りコーン',
    },
    descs: {
      tr: 'Sade dondurma sanıp uzandığın külahın içinden katlanmış beyaz kağıt peçete çıkar! Hemen yana savur!',
      en: 'Offers a cone stuffed with white folded napkins disguised as vanilla! Pull back or flick it away!',
      ar: 'يقدم قمعاً محشواً بمنديل أبيض يشبه الفانيليا! تراجع أو ارمه بعيداً!',
      ru: 'Протягивает рожок со сложенной белой салфеткой вместо пломбира! Смахни в сторону!',
      de: 'Hält dir eine Waffel mit weißer Serviette statt Vanilleeis hin! Wegschleudern!',
      ja: 'バニラアイスに見せかけた白ナプキン入りコーン！手を引くか横にスワイプして投げ捨てろ！',
    },
  },
  {
    id: 'SHELL_SWAP_DUEL',
    icon: '👐🔀',
    difficulty: 3,
    category: 'sleight_of_hand',
    names: {
      tr: 'İki El Külah Değiştirme',
      en: 'Two-Hand Cone Shell Game',
      ar: 'لعبة تبديل الأقماع',
      ru: 'Наперстки с рожками',
      de: 'Hütchenspiel mit Waffeln',
      ja: '二刀流コーンシャッフル',
    },
    descs: {
      tr: 'Sol elindeki sahte külahla çubuktaki gerçek dondurmayı havada çapraz döndürerek yer değiştirir!',
      en: 'Criss-crosses the real cone on the paddle with a decoy cone in his left hand at high speed!',
      ar: 'يبدل القمع الحقيقي بالقمع المزيف في يده اليسرى بحركات سريعة!',
      ru: 'Быстро меняет местами настоящий рожок на шесте и пустой рожок в левой руке!',
      de: 'Vertauscht blitzschnell die echte Waffel am Stab mit einer Attrappe in der linken Hand!',
      ja: '左手の偽コーンと棒の本物コーンを高速で交差させてシャッフル！本物を見極めろ！',
    },
  },
  {
    id: 'FIGURE_EIGHT_WEAVE',
    icon: '♾️🌀',
    difficulty: 2,
    category: 'paddle_spin',
    names: {
      tr: 'Sekiz Çizme & Bilek Kıvırma',
      en: 'Figure-Eight Wrist Weave',
      ar: 'حركة الرقم ثمانية',
      ru: 'Восьмерка с подкруткой',
      de: 'Achter-Schleife',
      ja: '8の字ツイスト',
    },
    descs: {
      tr: 'Külahı hem kendi etrafında döndürür hem de havada yatay 8 (∞) çizerek elinden kaçırır!',
      en: 'Traces a fast 3D figure-eight (∞) across the stall while rolling the cone around the shaft!',
      ar: 'يرسم شكل ٨ في الهواء مع تدوير القمع حول العصا!',
      ru: 'Выписывает в воздухе широкую восьмерку (∞), одновременно вращая рожок!',
      de: 'Zeichnet eine schnelle Acht (∞) in die Luft, während sich die Waffel dreht!',
      ja: 'コーンを自転させながら空中で8の字（∞）を描いてあなたの手をかわす！',
    },
  },
  {
    id: 'BELL_RHYTHM_FEINT',
    icon: '🔔🎶',
    difficulty: 3,
    category: 'rhythm_trap',
    names: {
      tr: 'Çan Ritmi & Üçlü Aldatma',
      en: 'Brass Bell Rhythm Feint',
      ar: 'إيقاع الأجراس الخادع',
      ru: 'Ритм колокольчиков',
      de: 'Glocken-Rhythmus-Finte',
      ja: 'ベルのリズムフェイント',
    },
    descs: {
      tr: 'Üstteki pirinç çanlara çubukla vurup tempo tutar: 1. ve 2. vuruş sahte, 3. çan vuruşunda yakala!',
      en: 'Strikes the hanging brass bells in rhythm: beats 1 and 2 are feints, catch on beat 3!',
      ar: 'يدق الأجراس النحاسية بإيقاع: الضربة ١ و٢ خدعة، امسك في الضربة ٣!',
      ru: 'Отбивает ритм по колокольчикам: 1-й и 2-й удары обманные, хватай на 3-й!',
      de: 'Schlägt im Takt gegen die Messingglocken: Schlag 1 & 2 sind Finten, greif bei 3 zu!',
      ja: '真鍮のベルを棒で鳴らすリズムトリック！1・2拍目はフェイント、3拍目で掴め！',
    },
  },
  {
    id: 'OVERHEAD_CROWN_DANGLE',
    icon: '👑⬆️',
    difficulty: 3,
    category: 'acrobatics',
    names: {
      tr: 'Tepeden Şapka Sarkıtması',
      en: 'Overhead Crown Dangle',
      ar: 'التعليق فوق الرأس',
      ru: 'Корона над головой',
      de: 'Überkopf-Pendel',
      ja: '頭上クラウン吊り下げ',
    },
    descs: {
      tr: 'Külahı başının tam üstüne kaldırıp ters sarkıtır, sonra aniden göğüs hizasına indirir!',
      en: 'Hoists the cone high above your head, dangles it inverted, then drops it to chest level!',
      ar: 'يرفع القمع عالياً فوق رأسك ثم ينزله فجأة أمام صدرك!',
      ru: 'Поднимает рожок высоко над вашей головой, а затем резко опускает к груди!',
      de: 'Hebt die Waffel hoch über deinen Kopf und lässt sie blitzschnell vor deine Brust sinken!',
      ja: 'コーンを頭上高くに掲げて逆さに吊るし、一気に胸の高さへ急降下させる！',
    },
  },
  {
    id: 'COMBO_DOUBLE_PUMP',
    icon: '⚡🤚',
    difficulty: 3,
    category: 'sleight_of_hand',
    names: {
      tr: 'İkili Sahte Uzat-Çek Kombo',
      en: 'Double-Pump Rapid Feint',
      ar: 'خدعة المد المزدوج السريع',
      ru: 'Двойной ложный выпад',
      de: 'Doppel-Finte',
      ja: '二段フェイント突き',
    },
    descs: {
      tr: 'Avucunun içine kadar uzatıp son salisede "Hırrr!" diye geri çeker, tam tur çevirip tekrar uzatır!',
      en: 'Thrusts the cone right into your palm, yanks it back with a growl, spins 360°, and thrusts again!',
      ar: 'يمد القمع داخل كفك ويسحبه فجأة مع دوران ٣٦٠ درجة ثم يمده مجدداً!',
      ru: 'Протягивает рожок прямо в ладонь, резко одергивает с разворотом на 360° и подает снова!',
      de: 'Streckt dir die Waffel direkt in die Hand, zieht sie knurrend mit 360°-Drehung zurück!',
      ja: '手のひらまで差し出して「フンッ！」と引き戻し、360度回してもう一度突き出す高速コンボ！',
    },
  },
  {
    id: 'EYE_LOCK_RHYTHM_CHASE',
    icon: '👀🎯',
    difficulty: 2,
    category: 'rhythm_trap',
    names: {
      tr: 'Göz Göze Ritim & Hop-Hop Yön Değiştirme',
      en: 'Eye-Lock Rhythm & Hop-Hop Switch',
      ar: 'نظرة العين وإيقاع هوب-هوب',
      ru: 'Взгляд глаза в глаза и ритм Хоп-Хоп',
      de: 'Blickduell & Hop-Hop-Rhythmus',
      ja: 'アイコンタクト＆ホップ・リズム追跡',
    },
    descs: {
      tr: 'Elini yeşil çizginin ortasında bekletip ustayla göz göze gelirsin; usta dondurmayı sağa-sola kaçırdıkça çizgiyle birlikte ritme uy! Geç kalırsan "Hop-hop!" diye çubuğun yönünü rastgele değiştirir!',
      en: 'Hold your hand at the midpoint of the green line to lock eyes with the vendor; follow the shifting green path left and right in rhythm! If you are late, he shouts "Hop-hop!" and randomly flips the rod direction!',
      ar: 'ثبّت يدك في منتصف الخط الأخضر وتبادل النظرات مع البائع، ثم اتبع الخط يميناً ويساراً على الإيقاع! إن تأخرت يغير اتجاه العصا عشوائياً!',
      ru: 'Задержи руку на середине зеленой линии, глядя мастеру в глаза, и двигай пальцем в ритм влево-вправо! Опоздаешь — он крикнет «Хоп-хоп!» и случайно сменит направление шеста!',
      de: 'Halte deine Hand in der Mitte der grünen Linie, schau dem Meister in die Augen und folge dem Rhythmus nach links und rechts! Bist du zu langsam, wechselt er mit „Hop-Hop!“ zufällig die Stabrichtung!',
      ja: '緑のラインの中央で手を止めて職人と目を合わせ、左右に動くラインのリズムに合わせて指を追従させろ！遅れると「ホップ・ホップ！」と棒の向きをランダムに変えられるぞ！',
    },
  },
  {
    id: 'FINAL_PISTACHIO_CATCH',
    icon: '🏆🥜',
    difficulty: 2,
    category: 'finale',
    names: {
      tr: 'Bol Antep Fıstıklı Final Kapışı',
      en: 'Pistachio Crown Finale Snatch',
      ar: 'النهاية بالفستق الحلبي',
      ru: 'Финал с фисташковой короной',
      de: 'Pistazien-Krone Finale',
      ja: 'ピスタチオ盛りファイナル',
    },
    descs: {
      tr: 'Tüm çanlar çalar, fıstıklar serpilir! Usta son kez sağa-sola kaçırırken yakala ve kendine çek!',
      en: 'All brass bells ring and pistachio toppings rain down! Catch the cone and pull it home!',
      ar: 'تقرع كل الأجراس ويُرش الفستق! امسك القمع واسحبه نحوك بقوة!',
      ru: 'Звенят все колокольчики! Схвати рожок с фисташками и тяни к себе!',
      de: 'Alle Glocken läuten! Schnapp dir die Pistazien-Waffel und zieh sie zu dir!',
      ja: '全てのベルが鳴り響きピスタチオが輝く！最後の勝負でコーンを掴んで手前に引き抜け！',
    },
  },
];

/**
 * 10-Stage Progressive Campaign across 4 Master Vendors
 */
export const CAMPAIGN_LEVELS = [
  {
    stage: 1,
    vendorIdx: 0,
    vendorKey: 'usta_0',
    titleKey: 'stage_1_title',
    speedMult: 0.78,
    defaultScoops: 2,
    hearts: 3,
    tutorialEnabled: true,
    trickCount: 4,
    trickPool: [
      'EYE_LOCK_RHYTHM_CHASE',
      'DOUBLE_CONE_SLIDE',
      'SHAFT_SPIN_360',
      'MEGA_TAFFY_SLICE',
    ],
    finalWindowSec: 3.6,
  },
  {
    stage: 2,
    vendorIdx: 0,
    vendorKey: 'usta_0',
    titleKey: 'stage_2_title',
    speedMult: 0.86,
    defaultScoops: 2,
    hearts: 3,
    tutorialEnabled: false,
    trickCount: 4,
    trickPool: [
      'EYE_LOCK_RHYTHM_CHASE',
      'DOUBLE_CONE_SLIDE',
      'GIANT_BLOCK_TEASE',
      'SHAFT_SPIN_360',
      'VERTICAL_WINDMILL',
    ],
    finalWindowSec: 3.3,
  },
  {
    stage: 3,
    vendorIdx: 1,
    vendorKey: 'usta_1',
    titleKey: 'stage_3_title',
    speedMult: 0.94,
    defaultScoops: 3,
    hearts: 3,
    tutorialEnabled: false,
    trickCount: 5,
    trickPool: [
      'EYE_LOCK_RHYTHM_CHASE',
      'DOUBLE_CONE_SLIDE',
      'GIANT_BLOCK_TEASE',
      'UPSIDE_DOWN_GRAVITY',
      'VERTICAL_WINDMILL',
      'MEGA_TAFFY_SLICE',
      'NAPKIN_CONE_FAKEOUT',
    ],
    finalWindowSec: 3.0,
  },
  {
    stage: 4,
    vendorIdx: 1,
    vendorKey: 'usta_1',
    titleKey: 'stage_4_title',
    speedMult: 1.0,
    defaultScoops: 3,
    hearts: 3,
    tutorialEnabled: false,
    trickCount: 5,
    trickPool: [
      'EYE_LOCK_RHYTHM_CHASE',
      'GIANT_BLOCK_TEASE',
      'MIDAIR_BLOCK_SOMERSAULT',
      'DOUBLE_CONE_SLIDE',
      'FAKE_DROP_PANIC',
      'FIGURE_EIGHT_WEAVE',
      'NAPKIN_CONE_FAKEOUT',
    ],
    finalWindowSec: 2.8,
  },
  {
    stage: 5,
    vendorIdx: 1,
    vendorKey: 'usta_1',
    titleKey: 'stage_5_title',
    speedMult: 1.06,
    defaultScoops: 3,
    hearts: 3,
    tutorialEnabled: false,
    trickCount: 6,
    trickPool: [
      'EYE_LOCK_RHYTHM_CHASE',
      'DOUBLE_CONE_SLIDE',
      'MIDAIR_BLOCK_SOMERSAULT',
      'SHELL_SWAP_DUEL',
      'UPSIDE_DOWN_GRAVITY',
      'MEGA_TAFFY_SLICE',
      'BELL_RHYTHM_FEINT',
    ],
    finalWindowSec: 2.6,
  },
  {
    stage: 6,
    vendorIdx: 2,
    vendorKey: 'usta_2',
    titleKey: 'stage_6_title',
    speedMult: 1.12,
    defaultScoops: 3,
    hearts: 3,
    tutorialEnabled: false,
    trickCount: 6,
    trickPool: [
      'EYE_LOCK_RHYTHM_CHASE',
      'GIANT_BLOCK_TEASE',
      'MIDAIR_BLOCK_SOMERSAULT',
      'DOUBLE_CONE_SLIDE',
      'SHELL_SWAP_DUEL',
      'OVERHEAD_CROWN_DANGLE',
      'FAKE_DROP_PANIC',
      'NAPKIN_CONE_FAKEOUT',
    ],
    finalWindowSec: 2.5,
  },
  {
    stage: 7,
    vendorIdx: 2,
    vendorKey: 'usta_2',
    titleKey: 'stage_7_title',
    speedMult: 1.18,
    defaultScoops: 4,
    hearts: 3,
    tutorialEnabled: false,
    trickCount: 7,
    trickPool: [
      'EYE_LOCK_RHYTHM_CHASE',
      'DOUBLE_CONE_SLIDE',
      'GIANT_BLOCK_TEASE',
      'MIDAIR_BLOCK_SOMERSAULT',
      'COMBO_DOUBLE_PUMP',
      'BELL_RHYTHM_FEINT',
      'UPSIDE_DOWN_GRAVITY',
      'FIGURE_EIGHT_WEAVE',
      'MEGA_TAFFY_SLICE',
    ],
    finalWindowSec: 2.35,
  },
  {
    stage: 8,
    vendorIdx: 2,
    vendorKey: 'usta_2',
    titleKey: 'stage_8_title',
    speedMult: 1.24,
    defaultScoops: 4,
    hearts: 3,
    tutorialEnabled: false,
    trickCount: 7,
    trickPool: [
      'EYE_LOCK_RHYTHM_CHASE',
      'DOUBLE_CONE_SLIDE',
      'MIDAIR_BLOCK_SOMERSAULT',
      'SHELL_SWAP_DUEL',
      'COMBO_DOUBLE_PUMP',
      'OVERHEAD_CROWN_DANGLE',
      'FAKE_DROP_PANIC',
      'NAPKIN_CONE_FAKEOUT',
      'BELL_RHYTHM_FEINT',
    ],
    finalWindowSec: 2.2,
  },
  {
    stage: 9,
    vendorIdx: 3,
    vendorKey: 'usta_3',
    titleKey: 'stage_9_title',
    speedMult: 1.3,
    defaultScoops: 4,
    hearts: 3,
    tutorialEnabled: false,
    trickCount: 8,
    trickPool: [
      'EYE_LOCK_RHYTHM_CHASE',
      'GIANT_BLOCK_TEASE',
      'MIDAIR_BLOCK_SOMERSAULT',
      'DOUBLE_CONE_SLIDE',
      'SHELL_SWAP_DUEL',
      'COMBO_DOUBLE_PUMP',
      'BELL_RHYTHM_FEINT',
      'OVERHEAD_CROWN_DANGLE',
      'UPSIDE_DOWN_GRAVITY',
      'MEGA_TAFFY_SLICE',
    ],
    finalWindowSec: 2.05,
  },
  {
    stage: 10,
    vendorIdx: 3,
    vendorKey: 'usta_3',
    titleKey: 'stage_10_title',
    speedMult: 1.38,
    defaultScoops: 4,
    hearts: 3,
    tutorialEnabled: false,
    trickCount: 9,
    trickPool: TRICK_CATALOG.filter((t) => t.id !== 'FINAL_PISTACHIO_CATCH').map((t) => t.id),
    finalWindowSec: 1.9,
  },
];

/**
 * Multiplayer & Dual-Role Command Bus Architecture
 * Allows a local AI, a local human Vendor, or a remote WebSocket peer to issue
 * identical Vendor/Customer actions.
 */
export class GameSessionProtocol {
  constructor(mode = GAME_MODES.SINGLEPLAYER_CUSTOMER, localRole = PLAYER_ROLES.CUSTOMER) {
    this.mode = mode;
    this.localRole = localRole;
    this.listeners = new Set();
    this.commandLog = [];
  }

  emitCommand(actorRole, commandType, payload = {}) {
    const packet = {
      t: performance.now(),
      role: actorRole,
      type: commandType,
      payload,
    };
    this.commandLog.push(packet);
    if (this.commandLog.length > 64) {
      this.commandLog.shift();
    }
    this.listeners.forEach((fn) => fn(packet));
    return packet;
  }

  onCommand(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Builds a compact state snapshot suitable for 2-player network sync
   */
   createSnapshot(director) {
    return {
      mode: this.mode,
      stage: director.currentStage,
      trickId: director.currentMechanic,
      subStep: director.subStep,
      scoopCount: director.scoopCount,
      selectedFlavors: director.selectedFlavors,
      conePos: director.coneWorldPos.toArray(),
      shaftRoll: director.shaftRoll,
      paddlePitch: director.paddlePitch,
      coneFlipZ: director.coneFlipZ,
      hearts: director.hearts,
      score: director.score,
    };
  }
}
