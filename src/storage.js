import { TRICK_CATALOG, CAMPAIGN_LEVELS, ICE_CREAM_FLAVORS } from './protocol.js';

const STORAGE_KEY = 'turkish_ice_cream_save_v6';

export const SUPPORTED_LANGS = [
  { code: 'tr', flag: '🇹🇷', label: 'Türkçe', dir: 'ltr', locale: 'tr-TR' },
  { code: 'en', flag: '🇬🇧', label: 'English', dir: 'ltr', locale: 'en-US' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية', dir: 'rtl', locale: 'ar-SA' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский', dir: 'ltr', locale: 'ru-RU' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch', dir: 'ltr', locale: 'de-DE' },
  { code: 'ja', flag: '🇯🇵', label: '日本語', dir: 'ltr', locale: 'ja-JP' },
];

export const I18N = {
  tr: {
    gameTitle: 'Maraş Dondurmacısı 3D',
    playBtn: '▶ ŞOVA BAŞLA',
    nextUsta: '▶ SONRAKİ SEVİYE',
    retryBtn: '🔄 TEKRAR DENE',
    menuBtn: '🏠 MENÜ',
    tricksBtn: '🎪 Hileler',
    tutorialBtn: '🎓 Öğretici',
    scoreLabel: 'Puan',
    bestLabel: 'Rekor',
    coneLabel: 'Sonuç',
    stageLabel: 'Seviye',
    tricksFoundLabel: 'Keşfedilen Hile',
    settingsTitle: 'Dil ve Ayarlar',
    tricksModalTitle: '🎪 Dondurmacı Hile Listesi (15 Hile)',
    soundLabel: 'Ses ve Müzik',
    hapticsLabel: 'Titreşim (Haptic)',
    fullscreenLabel: 'Tam Ekran',
    closeBtn: 'Tamam',
    iosFsTitle: 'iPhone Tam Ekran Modu',
    iosFsDesc: 'Geniş ekran modu açıldı! Safari çubuklarını tamamen gizleyip uygulama gibi tam ekran oynamak için:',
    iosFsStep1: 'Safari alt çubuğundaki Paylaş (⬆️) düğmesine dokunun.',
    iosFsStep2: '"Ana Ekrana Ekle" (➕) seçeneğine dokunun.',
    iosFsPlay: '▶ Hemen Oyna',

    legReach: '🟢 🤚⬆️ Uzat',
    legPull: '🔴 🤚⬇️ Çek',
    legFlick: '✂️ 🤚↔️ Kes / Savur',

    usta_0: 'Çırak Kadir',
    usta_1: 'Pala Usta',
    usta_2: 'Cezmi Dede',
    usta_3: 'Başusta Haydar',

    rank_0: 'Acemi Turist',
    rank_1: 'Külah Avcısı',
    rank_2: 'Maraş Gurmesi',
    rank_3: 'Usta Kıran Efsane',

    // Interactive 10s Tutorial Cues
    tut_badge: '🎓 HIZLI ÖĞRETİCİ',
    tut_step1: '1/3: YEŞİLDE ELİNİ UZAT & TUT! 🤚⬆️',
    tut_step2: '2/3: KIRMIZI TUZAKTA ELİNİ ÇEK! 🤚⬇️',
    tut_step3: '3/3: SÜNEN DONDURMAYI YANA KES! ✂️↔️',

    // Ultra-Short Visual Action Cues
    cue_scraping: 'KAZIYOR... BEKLE',
    cue_reach: 'UZAT & TUT!',
    cue_tug: 'KENDİNE ÇEK!',
    cue_slice: 'ORTADAN KES! ✂️',
    cue_return_cone: 'DIŞ KÜLAHI TAK / AT',
    cue_double_cone_bait: 'ÇİFT KÜLAH! DIŞINI TUT!',
    cue_giant_block: 'DEV KALIP! ELİNİ ÇEK!',
    cue_somersault: 'HAVADA TAKLA! İZLE!',
    cue_spin360: '360° FIRILDAK! BEKLE!',
    cue_windmill: 'DEĞİRMEN! ORTADA TUT!',
    cue_upside_down: 'TERS KÜLAH! ELİNİ ÇEK!',
    cue_fake_drop: 'DÜŞÜYOR ŞAKASI! ÇEKİL!',
    cue_bell_feint: 'ÇAN RİTMİ: 3. ZİLDE TUT!',
    cue_overhead: 'TEPEDEN İNİNCE TUT!',
    cue_double_pump: 'SAHTE UZATMA! 2.DE TUT!',
    cue_swap_watch: 'İKİ ELİ TAKİP ET!',
    cue_swap_pick: 'GERÇEK KÜLAHI TUT!',
    cue_pull_back: 'ELİNİ ÇEK! TUZAK!',
    cue_toss_fake: 'PEÇETEYİ SAVUR AT!',
    cue_final_grab: 'TUT & KENDİNE ÇEK!',

    // Canvas Target Ring Short Tags
    tag_empty: 'DIŞ KÜLAH',
    tag_double_cone: '🍦🍦 ÇİFT KÜLAH',
    tag_giant_block: '🧊 5 KG KALIP!',
    tag_somersault: '🤸 TAKLA!',
    tag_scraping: '🥄 KAZIYOR',
    tag_grab: '🤚 ŞİMDİ TUT!',
    tag_trap: '✕ TUZAK! ÇEKİL!',
    tag_on_paddle: '🍦 İÇ KÜLAH',
    tag_slice: '✂️ BURADAN KES',

    // Vendor Speech Bubble Exclamations
    speech_hmm: 'HIMMMM...? 🤔🍦',
    speech_hirr: 'HIRRRRR! 🦁🌀',
    speech_eeeh: 'EEEEH-HEHE! 😜',
    speech_cik: 'CIK CIK CIK! ☝️',
    speech_hoppa: 'HOPPAAA! 🌀',
    speech_laugh: 'HAHAHA! 🧻',
    speech_taunt: 'OOO-HOP! 👀',
    speech_cheer: 'HELAL OLSUN! 🏆',
    speech_shock: 'HAYDAA! 🍦',
    speech_scrape: 'KAZIYORUZ! 💪',
    speech_double_cone: 'ÇİFT KÜLAH OYUNU! 🍦🍦',
    speech_giant: 'KALIBIYLA GELDİ! 🧊',
    speech_flip: 'HAVADA TAKLA! 🤸',

    // Endings
    end_hearts_badge: 'SABIR BİTTİ (0 ❤️)',
    end_hearts_title: 'USTA SENİ OYUNA GETİRDİ!',
    end_hearts_desc: '3 kez tuzağa düştün! Usta dondurmayı geri aldı, elinde boş külah kaldı.',
    end_hearts_scoop: 'Boş Külah',
    end_early_badge: 'ERKEN KAPMA',
    end_early_title: 'YARIM KALDI!',
    end_early_desc: 'Şovun başında kaptığın için tek top kaldı.',
    end_early_scoop: 'Tek Top',
    end_passive_badge: 'HAREKETSİZ',
    end_passive_title: 'ŞOVSUZ! (0 PUAN)',
    end_passive_desc: 'El uzatmadığın için usta şov yapmadı.',
    end_passive_scoop: 'Şovsuz',
    end_overtime_badge: 'ÇOK UZADI',
    end_overtime_title: 'ELİNDE PEÇETE KALDI!',
    end_overtime_desc: 'Final fırsatını kaçırdın, peçeteli külah elinde kaldı!',
    end_overtime_scoop: 'Peçeteli Külah',
    end_win_badge: 'SEVİYE GEÇİLDİ!',
    end_win_title: 'DONDURMAYI KAPTIN!',
    end_win_desc: 'Ustanın tüm hilelerini aştın, bol fıstıklı Maraş dondurması senin!',
    end_win_scoop: 'Tam Külah + Fıstık',
  },

  en: {
    gameTitle: 'Turkish Ice Cream 3D',
    playBtn: '▶ START SHOW',
    nextUsta: '▶ NEXT STAGE',
    retryBtn: '🔄 RETRY',
    menuBtn: '🏠 MENU',
    tricksBtn: '🎪 15 Tricks',
    tutorialBtn: '🎓 Tutorial',
    scoreLabel: 'Score',
    bestLabel: 'Best',
    coneLabel: 'Result',
    stageLabel: 'Stage',
    tricksFoundLabel: 'Tricks Found',
    settingsTitle: 'Language & Settings',
    tricksModalTitle: '🎪 Master Vendor Trick List (15 Tricks)',
    soundLabel: 'Sound & Music',
    hapticsLabel: 'Vibration (Haptics)',
    fullscreenLabel: 'Fullscreen',
    closeBtn: 'Done',
    iosFsTitle: 'iPhone Fullscreen Mode',
    iosFsDesc: 'Immersive view enabled! To hide Safari bars completely like a native app:',
    iosFsStep1: 'Tap the Share (⬆️) button in the Safari toolbar.',
    iosFsStep2: 'Select "Add to Home Screen" (➕).',
    iosFsPlay: '▶ Play Now',

    legReach: '🟢 🤚⬆️ Grab',
    legPull: '🔴 🤚⬇️ Dodge',
    legFlick: '✂️ 🤚↔️ Slice / Flick',

    usta_0: 'Apprentice Kadir',
    usta_1: 'Master Pala',
    usta_2: 'Grandpa Cezmi',
    usta_3: 'Grandmaster Haydar',

    rank_0: 'Rookie Tourist',
    rank_1: 'Cone Hunter',
    rank_2: 'Maraş Gourmet',
    rank_3: 'Master Breaker',

    tut_badge: '🎓 10s TUTORIAL',
    tut_step1: '1/3: GREEN = REACH & HOLD! 🤚⬆️',
    tut_step2: '2/3: RED TRAP = PULL HAND BACK! 🤚⬇️',
    tut_step3: '3/3: SWIPE ACROSS TO SLICE! ✂️↔️',

    cue_scraping: 'SCRAPING... WAIT',
    cue_reach: 'REACH & GRAB!',
    cue_tug: 'PULL TO YOU!',
    cue_slice: 'SLICE ACROSS! ✂️',
    cue_return_cone: 'ATTACH / FLICK CONE',
    cue_double_cone_bait: 'DOUBLE CONE! GRAB OUTER!',
    cue_giant_block: '5-KILO BLOCK! PULL BACK!',
    cue_somersault: 'MID-AIR FLIP! WATCH!',
    cue_spin360: '360° ROD SPIN! WAIT!',
    cue_windmill: 'WINDMILL! CATCH CENTER!',
    cue_upside_down: 'UPSIDE DOWN! PULL BACK!',
    cue_fake_drop: 'FAKE DROP! PULL BACK!',
    cue_bell_feint: 'BELL RHYTHM: CATCH ON 3!',
    cue_overhead: 'WAIT FOR DROP & GRAB!',
    cue_double_pump: 'DOUBLE FEINT! CATCH 2ND!',
    cue_swap_watch: 'WATCH BOTH HANDS!',
    cue_swap_pick: 'GRAB REAL CONE!',
    cue_pull_back: 'PULL BACK! TRAP!',
    cue_toss_fake: 'FLICK NAPKIN AWAY!',
    cue_final_grab: 'GRAB & PULL!',

    tag_empty: 'OUTER CONE',
    tag_double_cone: '🍦🍦 DOUBLE CONE',
    tag_giant_block: '🧊 5KG BLOCK!',
    tag_somersault: '🤸 FLIP!',
    tag_scraping: '🥄 SCRAPING',
    tag_grab: '🤚 GRAB NOW!',
    tag_trap: '✕ TRAP! BACK!',
    tag_on_paddle: '🍦 INNER CONE',
    tag_slice: '✂️ SLICE HERE',

    speech_hmm: 'HMMMMM...? 🤔🍦',
    speech_hirr: 'HRRRRR! 🦁🌀',
    speech_eeeh: 'EEEEH-HEHE! 😜',
    speech_cik: 'TSK TSK TSK! ☝️',
    speech_hoppa: 'HOPPAAA! 🌀',
    speech_laugh: 'HAHAHA! 🧻',
    speech_taunt: 'OOO-HOP! 👀',
    speech_cheer: 'BRAVO! 🏆',
    speech_shock: 'WHOA! 🍦',
    speech_scrape: 'FRESH SCOOP! 💪',
    speech_double_cone: 'DOUBLE CONE TRICK! 🍦🍦',
    speech_giant: 'WHOLE BLOCK! 🧊',
    speech_flip: 'MID-AIR FLIP! 🤸',

    end_hearts_badge: 'OUT OF HEARTS (0 ❤️)',
    end_hearts_title: 'BAMBOOZLED BY THE MASTER!',
    end_hearts_desc: 'You fell for 3 traps! The vendor kept the ice cream and left you an empty cone.',
    end_hearts_scoop: 'Empty Cone',
    end_early_badge: 'TOO EARLY',
    end_early_title: 'SINGLE SCOOP!',
    end_early_desc: 'Snatched right at the start before the other flavors!',
    end_early_scoop: '1 Scoop Only',
    end_passive_badge: 'IDLE',
    end_passive_title: 'NO SHOW! (0 PTS)',
    end_passive_desc: 'You never reached out for the cone.',
    end_passive_scoop: 'Plain Cone',
    end_overtime_badge: 'TOO SLOW',
    end_overtime_title: 'STUCK WITH NAPKIN!',
    end_overtime_desc: 'Missed the catch window — stuck with a napkin cone!',
    end_overtime_scoop: 'Napkin Cone',
    end_win_badge: 'STAGE CLEARED!',
    end_win_title: 'YOU CAUGHT IT!',
    end_win_desc: 'You beat every trick — pistachio Maraş ice cream is yours!',
    end_win_scoop: 'Full Cone + Pistachio',
  },

  ar: {
    gameTitle: 'آيس كريم مرعش 3D',
    playBtn: '▶ ابدأ العرض',
    nextUsta: '▶ المرحلة التالية',
    retryBtn: '🔄 إعادة',
    menuBtn: '🏠 القائمة',
    tricksBtn: '🎪 ١٥ خدعة',
    tutorialBtn: '🎓 تعليم',
    scoreLabel: 'النقاط',
    bestLabel: 'الأفضل',
    coneLabel: 'النتيجة',
    stageLabel: 'المرحلة',
    tricksFoundLabel: 'الخدع المكتشفة',
    settingsTitle: 'اللغة والإعدادات',
    tricksModalTitle: '🎪 قائمة خدع بائع البوظة (١٥ خدعة)',
    soundLabel: 'الصوت والموسيقى',
    hapticsLabel: 'الاهتزاز',
    fullscreenLabel: 'ملء الشاشة',
    closeBtn: 'تم',
    iosFsTitle: 'وضع ملء الشاشة للآيفون',
    iosFsDesc: 'تم تفعيل العرض الكامل! لإخفاء شريط سفاري بالكامل واللعب كتطبيق:',
    iosFsStep1: 'اضغط على زر المشاركة (⬆️) في شريط سفاري.',
    iosFsStep2: 'اختر "إضافة إلى الشاشة الرئيسية" (➕).',
    iosFsPlay: '▶ العب الآن',

    legReach: '🟢 🤚⬆️ امسك',
    legPull: '🔴 🤚⬇️ اسحب يدك',
    legFlick: '✂️ 🤚↔️ اقطع / ارمِ',

    usta_0: 'الصبي قادر',
    usta_1: 'المعلم بالا',
    usta_2: 'الجد عزمي',
    usta_3: 'كبير المعلمين حيدر',

    rank_0: 'سائح مبتدئ',
    rank_1: 'صياد الأقماع',
    rank_2: 'خبير مرعش',
    rank_3: 'أسطورة البوظة',

    tut_badge: '🎓 تدريب سريع',
    tut_step1: '١/٣: أخضر = مد يدك وامسك! 🤚⬆️',
    tut_step2: '٢/٣: فخ أحمر = اسحب يدك للخلف! 🤚⬇️',
    tut_step3: '٣/٣: اسحب بالعرض لقطع البوظة! ✂️↔️',

    cue_scraping: 'يغرف البوظة... انتظر',
    cue_reach: 'مد يدك وامسك!',
    cue_tug: 'اسحب نحوك!',
    cue_slice: 'اقطع بالعرض! ✂️',
    cue_return_cone: 'ركّب أو ارمِ القمع',
    cue_double_cone_bait: 'قمع مزدوج! امسك الخارجي!',
    cue_giant_block: 'قالب عملاق! اسحب يدك!',
    cue_somersault: 'شقلبة في الهواء! راقب!',
    cue_spin360: 'دوران ٣٦٠! انتظر!',
    cue_windmill: 'طاحونة! امسك بالوسط!',
    cue_upside_down: 'قمع مقلوب! اسحب يدك!',
    cue_fake_drop: 'خدعة السقوط! تراجع!',
    cue_bell_feint: 'إيقاع الأجراس: امسك عند ٣!',
    cue_overhead: 'انتظر نزول القمع وامسك!',
    cue_double_pump: 'خدعة مزدوجة! امسك الثانية!',
    cue_swap_watch: 'راقب اليدين!',
    cue_swap_pick: 'امسك الحقيقي!',
    cue_pull_back: 'اسحب يدك! فخ!',
    cue_toss_fake: 'ارمِ المنديل!',
    cue_final_grab: 'امسك واسحب!',

    tag_empty: 'القمع الخارجي',
    tag_double_cone: '🍦🍦 قمع مزدوج',
    tag_giant_block: '🧊 قالب ٥ كغ!',
    tag_somersault: '🤸 شقلبة!',
    tag_scraping: '🥄 يغرف',
    tag_grab: '🤚 امسك الآن!',
    tag_trap: '✕ فخ! تراجع!',
    tag_on_paddle: '🍦 القمع الداخلي',
    tag_slice: '✂️ اقطع هنا',

    speech_hmm: 'همممم...؟ 🤔🍦',
    speech_hirr: 'هرررر! 🦁🌀',
    speech_eeeh: 'إيييه-هيهي! 😜',
    speech_cik: 'تؤ تؤ تؤ! ☝️',
    speech_hoppa: 'هوبااا! 🌀',
    speech_laugh: 'هاهاها! 🧻',
    speech_taunt: 'أووو-هوب! 👀',
    speech_cheer: 'أحسنت! 🏆',
    speech_shock: 'يا ساتر! 🍦',
    speech_scrape: 'بوظة مرعش! 💪',
    speech_double_cone: 'خدعة القمعين! 🍦🍦',
    speech_giant: 'القالب كامل! 🧊',
    speech_flip: 'شقلبة بالهواء! 🤸',

    end_hearts_badge: 'نفد الصبر (٠ ❤️)',
    end_hearts_title: 'خدعك المعلم!',
    end_hearts_desc: 'وقعت في ٣ فخاخ! أخذ المعلم البوظة وبقي القمع الفارغ.',
    end_hearts_scoop: 'قمع فارغ',
    end_early_badge: 'مبكر جداً',
    end_early_title: 'كرة واحدة فقط!',
    end_early_desc: 'خطفت القمع في البداية قبل اكتمال العرض!',
    end_early_scoop: 'كرة واحدة',
    end_passive_badge: 'بلا حركة',
    end_passive_title: 'بلا عرض! (٠ نقطة)',
    end_passive_desc: 'لم تمد يدك أبداً فملّ البائع.',
    end_passive_scoop: 'بلا عرض',
    end_overtime_badge: 'تأخرت كثيراً',
    end_overtime_title: 'قمع بالمنديل!',
    end_overtime_desc: 'فوتّ الفرصة وبقي المنديل في يدك!',
    end_overtime_scoop: 'قمع منديل',
    end_win_badge: 'اجتزت المرحلة!',
    end_win_title: 'أمسكت البوظة!',
    end_win_desc: 'تغلبت على كل الخدع — بوظة مرعش بالفستق لك!',
    end_win_scoop: 'قمع كامل + فستق',
  },

  ru: {
    gameTitle: 'Турецкое Мороженое 3D',
    playBtn: '▶ НАЧАТЬ ШОУ',
    nextUsta: '▶ СЛЕД. УРОВЕНЬ',
    retryBtn: '🔄 ЗАНОВО',
    menuBtn: '🏠 МЕНЮ',
    tricksBtn: '🎪 15 Трюков',
    tutorialBtn: '🎓 Обучение',
    scoreLabel: 'Очки',
    bestLabel: 'Рекорд',
    coneLabel: 'Итог',
    stageLabel: 'Уровень',
    tricksFoundLabel: 'Открыто трюков',
    settingsTitle: 'Язык и Настройки',
    tricksModalTitle: '🎪 Список трюков мастера (15 трюков)',
    soundLabel: 'Звук и Музыка',
    hapticsLabel: 'Вибрация',
    fullscreenLabel: 'Полный экран',
    closeBtn: 'Готово',
    iosFsTitle: 'Полный экран на iPhone',
    iosFsDesc: 'Широкий режим включен! Чтобы полностью скрыть панели Safari как в приложении:',
    iosFsStep1: 'Нажмите кнопку «Поделиться» (⬆️) внизу в Safari.',
    iosFsStep2: 'Выберите «На экран "Домой"» (➕).',
    iosFsPlay: '▶ Играть сейчас',

    legReach: '🟢 🤚⬆️ Хватай',
    legPull: '🔴 🤚⬇️ Назад',
    legFlick: '✂️ 🤚↔️ Режь / Смахни',

    usta_0: 'Ученик Кадир',
    usta_1: 'Мастер Пала',
    usta_2: 'Дедушка Джезми',
    usta_3: 'Гранд-мастер Хайдар',

    rank_0: 'Турист-новичок',
    rank_1: 'Охотник за рожками',
    rank_2: 'Гурман Мараша',
    rank_3: 'Легенда базара',

    tut_badge: '🎓 ОБУЧЕНИЕ 10 СЕК',
    tut_step1: '1/3: ЗЕЛЕНЫЙ = ТЯНИСЬ И ДЕРЖИ! 🤚⬆️',
    tut_step2: '2/3: КРАСНЫЙ = УБЕРИ РУКУ! 🤚⬇️',
    tut_step3: '3/3: ПРОВЕДИ ВБОК, ЧТОБЫ СРЕЗАТЬ! ✂️↔️',

    cue_scraping: 'НАБИРАЕТ... ЖДИ',
    cue_reach: 'ТЯНИСЬ И ХВАТАЙ!',
    cue_tug: 'ТЯНИ К СЕБЕ!',
    cue_slice: 'РЕЖЬ ПОПЕРЕК! ✂️',
    cue_return_cone: 'ВЕРНИ / СМАХНИ',
    cue_double_cone_bait: 'ДВОЙНОЙ РОЖОК! ДЕРЖИ!',
    cue_giant_block: '5 КГ ГЛЫБА! УБЕРИ РУКУ!',
    cue_somersault: 'САЛЬТО В ВОЗДУХЕ! СМОТРИ!',
    cue_spin360: 'ВРАЩЕНИЕ 360°! ЖДИ!',
    cue_windmill: 'МЕЛЬНИЦА! ЛОВИ В ЦЕНТРЕ!',
    cue_upside_down: 'ПЕРЕВЕРНУТ! УБЕРИ РУКУ!',
    cue_fake_drop: 'ЛОЖНОЕ ПАДЕНИЕ! НАЗАД!',
    cue_bell_feint: 'РИТМ: ЛОВИ НА 3-Й ЗВОН!',
    cue_overhead: 'ЖДИ СПУСКА СВЕРХУ!',
    cue_double_pump: 'ДВОЙНОЙ ВЫПАД! ЛОВИ 2-Й!',
    cue_swap_watch: 'СЛЕДИ ЗА РУКАМИ!',
    cue_swap_pick: 'БЕРИ НАСТОЯЩИЙ!',
    cue_pull_back: 'УБЕРИ РУКУ! ЛОВУШКА!',
    cue_toss_fake: 'СМАХНИ САЛФЕТКУ!',
    cue_final_grab: 'ХВАТАЙ И ТЯНИ!',

    tag_empty: 'ВНЕШНИЙ РОЖОК',
    tag_double_cone: '🍦🍦 ДВОЙНОЙ РОЖОК',
    tag_giant_block: '🧊 ГЛЫБА 5 КГ!',
    tag_somersault: '🤸 САЛЬТО!',
    tag_scraping: '🥄 НАБИРАЕТ',
    tag_grab: '🤚 ХВАТАЙ!',
    tag_trap: '✕ ЛОВУШКА!',
    tag_on_paddle: '🍦 ВНУТРЕННИЙ',
    tag_slice: '✂️ РЕЖЬ ТУТ',

    speech_hmm: 'ХММММ...? 🤔🍦',
    speech_hirr: 'ХРРРРР! 🦁🌀',
    speech_eeeh: 'ЭЭЭХ-ХЕХЕ! 😜',
    speech_cik: 'ЦК-ЦК-ЦК! ☝️',
    speech_hoppa: 'ХОППАА! 🌀',
    speech_laugh: 'ХА-ХА-ХА! 🧻',
    speech_taunt: 'ООО-ХОП! 👀',
    speech_cheer: 'МОЛОДЕЦ! 🏆',
    speech_shock: 'ОГО! 🍦',
    speech_scrape: 'МАРАШ! 💪',
    speech_double_cone: 'ДВОЙНОЙ РОЖОК! 🍦🍦',
    speech_giant: 'ЦЕЛЫЙ БЛОК! 🧊',
    speech_flip: 'САЛЬТО! 🤸',

    end_hearts_badge: 'НЕТ ПОПЫТОК (0 ❤️)',
    end_hearts_title: 'МАСТЕР ПЕРЕХИТРИЛ ВАС!',
    end_hearts_desc: 'Вы попались на 3 уловки! В руке остался пустой рожок.',
    end_hearts_scoop: 'Пустой рожок',
    end_early_badge: 'СЛИШКОМ РАНО',
    end_early_title: 'ТОЛЬКО ОДИН ШАР!',
    end_early_desc: 'Вы схватили рожок в самом начале шоу!',
    end_early_scoop: '1 Шар',
    end_passive_badge: 'БЕЗ ДВИЖЕНИЯ',
    end_passive_title: 'БЕЗ ШОУ! (0 ОЧКОВ)',
    end_passive_desc: 'Вы не тянулись к мороженому.',
    end_passive_scoop: 'Без шоу',
    end_overtime_badge: 'СЛИШКОМ ДОЛГО',
    end_overtime_title: 'РОЖОК С САЛФЕТКОЙ!',
    end_overtime_desc: 'Упустили момент — в руке осталась салфетка!',
    end_overtime_scoop: 'Салфетка',
    end_win_badge: 'УРОВЕНЬ ПРОЙДЕН!',
    end_win_title: 'МОРОЖЕНОЕ ВАШЕ!',
    end_win_desc: 'Вы прошли все уловки мастера! Мороженое с фисташками ваше!',
    end_win_scoop: 'Полный рожок + Фисташки',
  },

  de: {
    gameTitle: 'Türkisches Eis 3D',
    playBtn: '▶ SHOW STARTEN',
    nextUsta: '▶ NÄCHSTES LEVEL',
    retryBtn: '🔄 NOCHMAL',
    menuBtn: '🏠 MENÜ',
    tricksBtn: '🎪 15 Tricks',
    tutorialBtn: '🎓 Tutorial',
    scoreLabel: 'Punkte',
    bestLabel: 'Rekord',
    coneLabel: 'Ergebnis',
    stageLabel: 'Level',
    tricksFoundLabel: 'Tricks entdeckt',
    settingsTitle: 'Sprache & Optionen',
    tricksModalTitle: '🎪 Trickliste des Eismeisters (15 Tricks)',
    soundLabel: 'Ton & Musik',
    hapticsLabel: 'Vibration',
    fullscreenLabel: 'Vollbild',
    closeBtn: 'Fertig',
    iosFsTitle: 'iPhone Vollbildmodus',
    iosFsDesc: 'Vollbildansicht aktiviert! Um die Safari-Leiste komplett wie eine App auszublenden:',
    iosFsStep1: 'Tippe unten in Safari auf „Teilen“ (⬆️).',
    iosFsStep2: 'Wähle „Zum Home-Bildschirm“ (➕).',
    iosFsPlay: '▶ Jetzt spielen',

    legReach: '🟢 🤚⬆️ Greifen',
    legPull: '🔴 🤚⬇️ Zurück',
    legFlick: '✂️ 🤚↔️ Schneiden',

    usta_0: 'Lehrling Kadir',
    usta_1: 'Meister Pala',
    usta_2: 'Opa Cezmi',
    usta_3: 'Großmeister Haydar',

    rank_0: 'Neuling-Tourist',
    rank_1: 'Waffel-Jäger',
    rank_2: 'Maraş-Gourmet',
    rank_3: 'Meister-Bezwinger',

    tut_badge: '🎓 10s TUTORIAL',
    tut_step1: '1/3: GRÜN = GREIFEN & HALTEN! 🤚⬆️',
    tut_step2: '2/3: ROTE FALLE = HAND ZURÜCK! 🤚⬇️',
    tut_step3: '3/3: QUER WISCHEN ZUM SCHNEIDEN! ✂️↔️',

    cue_scraping: 'SCHABT EIS... WARTE',
    cue_reach: 'GREIF ZU!',
    cue_tug: 'ZU DIR ZIEHEN!',
    cue_slice: 'DURCHSCHNEIDEN! ✂️',
    cue_return_cone: 'ANSTECKEN / WERFEN',
    cue_double_cone_bait: 'DOPPELWAFFEL! AUSSEN HALTEN!',
    cue_giant_block: '5-KILO-BLOCK! HAND ZURÜCK!',
    cue_somersault: 'LUFT-SALTO! BEOBACHTEN!',
    cue_spin360: '360°-DREHUNG! WARTEN!',
    cue_windmill: 'WINDMÜHLE! MITTE GREIFEN!',
    cue_upside_down: 'KOPFÜBER! HAND ZURÜCK!',
    cue_fake_drop: 'SCHEIN-FALL! ZURÜCK!',
    cue_bell_feint: 'GLOCKEN-TAKT: BEI 3 GREIFEN!',
    cue_overhead: 'WARTEN BIS ES SINKT!',
    cue_double_pump: 'DOPPEL-FINTE! BEIM 2. MAL!',
    cue_swap_watch: 'HÄNDE BEOBACHTEN!',
    cue_swap_pick: 'ECHTES GREIFEN!',
    cue_pull_back: 'HAND ZURÜCK! FALLE!',
    cue_toss_fake: 'SERVIETTE WEGWERFEN!',
    cue_final_grab: 'GREIFEN & ZIEHEN!',

    tag_empty: 'AUSSENWAFFEL',
    tag_double_cone: '🍦🍦 DOPPELWAFFEL',
    tag_giant_block: '🧊 5KG BLOCK!',
    tag_somersault: '🤸 SALTO!',
    tag_scraping: '🥄 SCHABT',
    tag_grab: '🤚 JETZT GREIFEN!',
    tag_trap: '✕ FALLE! ZURÜCK!',
    tag_on_paddle: '🍦 INNENWAFFEL',
    tag_slice: '✂️ HIER SCHNEIDEN',

    speech_hmm: 'HMMMMM...? 🤔🍦',
    speech_hirr: 'HRRRRR! 🦁🌀',
    speech_eeeh: 'EEEEH-HEHE! 😜',
    speech_cik: 'TSK TSK TSK! ☝️',
    speech_hoppa: 'HOPPAAA! 🌀',
    speech_laugh: 'HAHAHA! 🧻',
    speech_taunt: 'OOO-HOP! 👀',
    speech_cheer: 'BRAVO! 🏆',
    speech_shock: 'HOPPLA! 🍦',
    speech_scrape: 'MARAŞ EIS! 💪',
    speech_double_cone: 'DOPPELWAFFEL! 🍦🍦',
    speech_giant: 'GANZER BLOCK! 🧊',
    speech_flip: 'LUFT-SALTO! 🤸',

    end_hearts_badge: 'KEINE HERZEN (0 ❤️)',
    end_hearts_title: 'VOM MEISTER AUSGETRICKST!',
    end_hearts_desc: '3 Mal auf Tricks hereingefallen! Du hältst nur eine leere Waffel.',
    end_hearts_scoop: 'Leere Waffel',
    end_early_badge: 'ZU FRÜH',
    end_early_title: 'NUR EINE KUGEL!',
    end_early_desc: 'Zu früh geschnappt, bevor die Show begann!',
    end_early_scoop: '1 Kugel',
    end_passive_badge: 'INAKTIV',
    end_passive_title: 'KEINE SHOW! (0 PKT)',
    end_passive_desc: 'Du hast nie nach dem Eis gegriffen.',
    end_passive_scoop: 'Ohne Show',
    end_overtime_badge: 'ZU LANGSAM',
    end_overtime_title: 'SERVIETTE BEKOMMEN!',
    end_overtime_desc: 'Chance verpasst — nur eine Serviette in der Hand!',
    end_overtime_scoop: 'Serviette',
    end_win_badge: 'LEVEL GESCHAFFT!',
    end_win_title: 'EIS GEFANGEN!',
    end_win_desc: 'Alle Tricks gemeistert — Maraş-Eis mit Pistazien gehört dir!',
    end_win_scoop: 'Volle Waffel + Pistazie',
  },

  ja: {
    gameTitle: 'トルコアイス職人 3D',
    playBtn: '▶ ショー開始',
    nextUsta: '▶ 次のステージへ',
    retryBtn: '🔄 もう一度',
    menuBtn: '🏠 メニュー',
    tricksBtn: '🎪 15の技',
    tutorialBtn: '🎓 練習',
    scoreLabel: 'スコア',
    bestLabel: '最高記録',
    coneLabel: '結果',
    stageLabel: 'ステージ',
    tricksFoundLabel: '発見した技',
    settingsTitle: '言語と設定',
    tricksModalTitle: '🎪 トルコアイス職人の技リスト (全15種)',
    soundLabel: 'サウンド・音楽',
    hapticsLabel: '振動 (ハプティクス)',
    fullscreenLabel: '全画面表示',
    closeBtn: '閉じる',
    iosFsTitle: 'iPhone 全画面モード',
    iosFsDesc: 'ワイド画面が有効になりました！Safariのバーを完全に消してアプリのように遊ぶには：',
    iosFsStep1: 'Safari下部の「共有」(⬆️) ボタンをタップします。',
    iosFsStep2: '「ホーム画面に追加」(➕) を選択します。',
    iosFsPlay: '▶ すぐ遊ぶ',

    legReach: '🟢 🤚⬆️ 掴む',
    legPull: '🔴 🤚⬇️ 手を引く',
    legFlick: '✂️ 🤚↔️ 切る・捨てる',

    usta_0: '見習いカディル',
    usta_1: 'パラ親方',
    usta_2: 'ジェズミ師匠',
    usta_3: '大親方ハイダル',

    rank_0: '新米ツーリスト',
    rank_1: 'コーンハンター',
    rank_2: 'マラシュ通',
    rank_3: '職人破りの伝説',

    tut_badge: '🎓 10秒チュートリアル',
    tut_step1: '1/3: 緑＝手を伸ばしてキープ！ 🤚⬆️',
    tut_step2: '2/3: 赤い罠＝手を下に引け！ 🤚⬇️',
    tut_step3: '3/3: 横スワイプで伸びるアイスを切れ！ ✂️↔️',

    cue_scraping: '練り上げ中…待て',
    cue_reach: '手を伸ばして掴め！',
    cue_tug: '手前に引け！',
    cue_slice: '横にスライドで切る！✂️',
    cue_return_cone: '外コーンを戻す/投げる',
    cue_double_cone_bait: '二重コーン！外側を掴め！',
    cue_giant_block: '5キロ塊フェイント！手を引け！',
    cue_somersault: '空中大回転！見て待て！',
    cue_spin360: '360度スピン！待て！',
    cue_windmill: '風車スイング！中央で掴め！',
    cue_upside_down: '逆さまコーン！手を引け！',
    cue_fake_drop: '落下フェイント！手を引け！',
    cue_bell_feint: 'ベルのリズム：3回目で掴め！',
    cue_overhead: '頭上から降りたら掴め！',
    cue_double_pump: '二段フェイント！2回目で掴め！',
    cue_swap_watch: '両手をよく見て！',
    cue_swap_pick: '本物を掴め！',
    cue_pull_back: '手を引け！罠だ！',
    cue_toss_fake: 'ナプキンを横に投げ捨てろ！',
    cue_final_grab: '掴んで引き抜け！',

    tag_empty: '外側コーン',
    tag_double_cone: '🍦🍦 二重コーン',
    tag_giant_block: '🧊 5キロ塊！',
    tag_somersault: '🤸 宙返り！',
    tag_scraping: '🥄 練り中',
    tag_grab: '🤚 今だ掴め！',
    tag_trap: '✕ 罠だ！引け！',
    tag_on_paddle: '🍦 内側コーン',
    tag_slice: '✂️ ここを切る',

    speech_hmm: 'フムムム…？ 🤔🍦',
    speech_hirr: 'ガルルルッ！ 🦁🌀',
    speech_eeeh: 'エ〜ッヘヘ！ 😜',
    speech_cik: 'チッチッチッ！ ☝️',
    speech_hoppa: 'ホッパー！🌀',
    speech_laugh: 'ハハハ！🧻',
    speech_taunt: 'おっと！👀',
    speech_cheer: 'お見事！🏆',
    speech_shock: 'おっと早すぎ！🍦',
    speech_scrape: '伸びるアイス！💪',
    speech_double_cone: '二重コーンの技！🍦🍦',
    speech_giant: '塊ごと来たぞ！🧊',
    speech_flip: '空中大回転！🤸',

    end_hearts_badge: 'ハート切れ (0 ❤️)',
    end_hearts_title: '職人に完全に騙された！',
    end_hearts_desc: '3回罠にかかり、手には空っぽのコーンだけが残った！',
    end_hearts_scoop: '空コーン',
    end_early_badge: '早すぎキャッチ',
    end_early_title: '1段だけで終了！',
    end_early_desc: '最初に奪ったため1段だけになりました。',
    end_early_scoop: '1段のみ',
    end_passive_badge: 'アクションなし',
    end_passive_title: 'ショーなし (0点)',
    end_passive_desc: '手を伸ばさなかったためそのまま渡されました。',
    end_passive_scoop: 'ショーなし',
    end_overtime_badge: '時間切れ',
    end_overtime_title: 'ナプキンの罰！',
    end_overtime_desc: 'チャンスを逃し、ナプキン入りコーンを掴まされた！',
    end_overtime_scoop: 'ナプキン',
    end_win_badge: 'ステージクリア！',
    end_win_title: '完全キャッチ成功！',
    end_win_desc: '職人の技を全て見破り、ピスタチオアイスをゲット！',
    end_win_scoop: '特製フルコーン',
  },
};

export class SaveManager {
  constructor() {
    this.lang = this._detectDefaultLang();
    this.hapticsEnabled = true;
    this.data = {
      unlockedStage: 1,
      stageStars: new Array(CAMPAIGN_LEVELS.length).fill(0),
      stageHighScores: new Array(CAMPAIGN_LEVELS.length).fill(0),
      discoveredTricks: ['DOUBLE_CONE_SLIDE', 'SHAFT_SPIN_360'],
      tutorialCompleted: false,
      coins: 0,
      conesCaught: 0,
      preferredScoopCount: 3,
      preferredFlavors: [0, 1, 2, 3],
    };
    this.load();
    this.applyDocumentDirection();
  }

  _detectDefaultLang() {
    try {
      const nav = (navigator.language || 'tr').slice(0, 2).toLowerCase();
      if (SUPPORTED_LANGS.some((l) => l.code === nav)) {
        return nav;
      }
    } catch {
      // Ignore
    }
    return 'tr';
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.unlockedStage === 'number') {
          this.data.unlockedStage = Math.max(
            1,
            Math.min(CAMPAIGN_LEVELS.length, parsed.unlockedStage)
          );
        }
        if (Array.isArray(parsed.stageStars)) {
          parsed.stageStars.forEach((s, i) => {
            if (i < this.data.stageStars.length) this.data.stageStars[i] = s || 0;
          });
        }
        if (Array.isArray(parsed.stageHighScores)) {
          parsed.stageHighScores.forEach((sc, i) => {
            if (i < this.data.stageHighScores.length) {
              this.data.stageHighScores[i] = sc || 0;
            }
          });
        }
        if (Array.isArray(parsed.discoveredTricks)) {
          this.data.discoveredTricks = Array.from(new Set(parsed.discoveredTricks));
        }
        if (typeof parsed.tutorialCompleted === 'boolean') {
          this.data.tutorialCompleted = parsed.tutorialCompleted;
        }
        if (typeof parsed.coins === 'number') this.data.coins = parsed.coins;
        if (typeof parsed.conesCaught === 'number') {
          this.data.conesCaught = parsed.conesCaught;
        }
        if (typeof parsed.preferredScoopCount === 'number') {
          this.data.preferredScoopCount = Math.max(2, Math.min(4, parsed.preferredScoopCount));
        }
        if (Array.isArray(parsed.preferredFlavors) && parsed.preferredFlavors.length >= 2) {
          this.data.preferredFlavors = parsed.preferredFlavors;
        }
        if (typeof parsed.hapticsEnabled === 'boolean') {
          this.hapticsEnabled = parsed.hapticsEnabled;
        }
        if (SUPPORTED_LANGS.some((l) => l.code === parsed.lang)) {
          this.lang = parsed.lang;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...this.data,
          lang: this.lang,
          hapticsEnabled: this.hapticsEnabled,
        })
      );
    } catch {
      // Ignore
    }
  }

  setLang(langCode) {
    if (SUPPORTED_LANGS.some((l) => l.code === langCode)) {
      this.lang = langCode;
      this.save();
      this.applyDocumentDirection();
    }
    return this.lang;
  }

  getLangMeta() {
    return SUPPORTED_LANGS.find((l) => l.code === this.lang) || SUPPORTED_LANGS[0];
  }

  applyDocumentDirection() {
    if (typeof document !== 'undefined') {
      const meta = this.getLangMeta();
      document.documentElement.lang = meta.code;
      document.documentElement.dir = meta.dir;
    }
  }

  formatNumber(num) {
    try {
      return new Intl.NumberFormat(this.getLangMeta().locale).format(Math.round(num));
    } catch {
      return String(Math.round(num));
    }
  }

  t(key) {
    return (I18N[this.lang] && I18N[this.lang][key]) || I18N.tr[key] || key;
  }

  getUstaName(vendorIdx) {
    return this.t(`usta_${vendorIdx % 4}`);
  }

  getFlavorName(flavorIdx) {
    const fl = ICE_CREAM_FLAVORS[flavorIdx % ICE_CREAM_FLAVORS.length];
    return (fl && (fl.names[this.lang] || fl.names.tr)) || '';
  }

  getTrickInfo(trickId) {
    const found = TRICK_CATALOG.find((t) => t.id === trickId);
    if (!found) return { name: trickId, desc: '', icon: '🍦', difficulty: 1 };
    return {
      id: found.id,
      icon: found.icon,
      difficulty: found.difficulty,
      name: found.names[this.lang] || found.names.tr,
      desc: found.descs[this.lang] || found.descs.tr,
    };
  }

  discoverTrick(trickId) {
    if (!trickId) return;
    if (!this.data.discoveredTricks.includes(trickId)) {
      this.data.discoveredTricks.push(trickId);
      this.save();
    }
  }

  isTrickDiscovered(trickId) {
    return this.data.discoveredTricks.includes(trickId);
  }

  getTotalStars() {
    return this.data.stageStars.reduce((a, b) => a + (b || 0), 0);
  }

  getPlayerRankTitle() {
    const stars = this.getTotalStars();
    if (stars >= 22) return this.t('rank_3');
    if (stars >= 12) return this.t('rank_2');
    if (stars >= 4) return this.t('rank_1');
    return this.t('rank_0');
  }

  setOrderPreferences(scoopCount, flavorsArray) {
    this.data.preferredScoopCount = Math.max(2, Math.min(4, scoopCount));
    if (Array.isArray(flavorsArray) && flavorsArray.length > 0) {
      this.data.preferredFlavors = flavorsArray.slice(0, 4);
    }
    this.save();
  }

  markTutorialCompleted() {
    this.data.tutorialCompleted = true;
    this.save();
  }

  toggleHaptics() {
    this.hapticsEnabled = !this.hapticsEnabled;
    this.save();
    return this.hapticsEnabled;
  }

  recordStageResult(stageNumber, score, starCount, wonFullCone) {
    const idx = Math.max(0, Math.min(CAMPAIGN_LEVELS.length - 1, stageNumber - 1));
    if (score > (this.data.stageHighScores[idx] || 0)) {
      this.data.stageHighScores[idx] = score;
    }
    if (starCount > (this.data.stageStars[idx] || 0)) {
      this.data.stageStars[idx] = starCount;
    }
    if (wonFullCone) {
      this.data.conesCaught++;
      this.data.coins += 25 * starCount + stageNumber * 10;
      if (stageNumber >= this.data.unlockedStage && stageNumber < CAMPAIGN_LEVELS.length) {
        this.data.unlockedStage = stageNumber + 1;
      }
    }
    this.save();
  }

  getStageBestScore(stageNumber) {
    const idx = Math.max(0, Math.min(CAMPAIGN_LEVELS.length - 1, stageNumber - 1));
    return this.data.stageHighScores[idx] || 0;
  }

  getStageStars(stageNumber) {
    const idx = Math.max(0, Math.min(CAMPAIGN_LEVELS.length - 1, stageNumber - 1));
    return this.data.stageStars[idx] || 0;
  }
}
