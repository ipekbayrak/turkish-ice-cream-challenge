const STORAGE_KEY = 'turkish_ice_cream_save_v5';

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
    gameTitle: 'Maraş Dondurma',
    playBtn: '▶ ŞOVA BAŞLA',
    nextUsta: '▶ SONRAKİ USTA',
    retryBtn: '🔄 TEKRAR',
    scoreLabel: 'Puan',
    bestLabel: 'Rekor',
    coneLabel: 'Sonuç',
    settingsTitle: 'Dil ve Ayarlar',
    soundLabel: 'Ses ve Müzik',
    hapticsLabel: 'Titreşim (Haptic)',
    fullscreenLabel: 'Tam Ekran',
    closeBtn: 'Tamam',

    legReach: '🟢 🤚⬆️ Uzat',
    legPull: '🔴 🤚⬇️ Çek',
    legFlick: '🧻 🤚💨 Savur',

    usta_0: 'Çırak Kadir',
    usta_1: 'Pala Usta',
    usta_2: 'Cezmi Dede',

    // Ultra-Short Visual Action Cues
    cue_scraping: 'KAZIYOR... BEKLE',
    cue_reach: 'UZAT & TUT',
    cue_tug: 'KENDİNE ÇEK!',
    cue_slice: 'ORTADAN KES',
    cue_return_cone: 'KÜLAHI TAK / AT',
    cue_swap_watch: 'TAKİP ET',
    cue_swap_pick: 'GERÇEĞİ TUT',
    cue_pendulum: 'ORTADA TUT',
    cue_pull_back: 'ELİNİ ÇEK!',
    cue_empty_trap: 'BOŞ KÜLAH! ÇEKİL!',
    cue_toss_fake: 'SAVUR AT!',
    cue_final_grab: 'TUT & KOPAR!',

    // Canvas Target Ring Short Tags
    tag_empty: 'BOŞ KÜLAH',
    tag_scraping: '🥄 KAZIYOR',
    tag_grab: '🤚 TUT',
    tag_scoop2: '🥄 2. TOP',
    tag_empty_trap: '✕ BOŞ KÜLAH',
    tag_on_paddle: '🍦 ÇUBUKTA',

    // Vendor Speech Bubble Exclamations
    speech_hoppa: 'HOPPAAA! 🌀',
    speech_laugh: 'HAHAHA! 🧻',
    speech_taunt: 'OOO-HOP! 👀',
    speech_cheer: 'HELAL OLSUN! 🏆',
    speech_shock: 'HAYDAA! 🍦',
    speech_scrape: 'KAZIYORUZ! 💪',
    speech_empty_trap: 'KÜLAH BOŞ! 😂',

    // Endings
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
    end_overtime_desc: 'Fırsatları kaçırdın, peçeteli külah elinde kaldı!',
    end_overtime_scoop: 'Peçeteli Külah',
    end_win_badge: 'USTA GEÇİLDİ!',
    end_win_title: 'DONDURMAYI KAPTIN!',
    end_win_desc: '3 top bol fıstıklı Maraş dondurması senin!',
    end_win_scoop: '3 Top + Fıstık',
  },

  en: {
    gameTitle: 'Turkish Ice Cream',
    playBtn: '▶ START SHOW',
    nextUsta: '▶ NEXT MASTER',
    retryBtn: '🔄 RETRY',
    scoreLabel: 'Score',
    bestLabel: 'Best',
    coneLabel: 'Result',
    settingsTitle: 'Language & Settings',
    soundLabel: 'Sound & Music',
    hapticsLabel: 'Vibration (Haptics)',
    fullscreenLabel: 'Fullscreen',
    closeBtn: 'Done',

    legReach: '🟢 🤚⬆️ Reach',
    legPull: '🔴 🤚⬇️ Pull Back',
    legFlick: '🧻 🤚💨 Flick',

    usta_0: 'Apprentice Kadir',
    usta_1: 'Master Pala',
    usta_2: 'Grandpa Cezmi',

    cue_scraping: 'SCRAPING... WAIT',
    cue_reach: 'REACH & GRAB',
    cue_tug: 'PULL TO YOU!',
    cue_slice: 'SLICE ACROSS',
    cue_return_cone: 'ATTACH / FLICK',
    cue_swap_watch: 'WATCH SWAP',
    cue_swap_pick: 'GRAB REAL',
    cue_pendulum: 'TAP CENTER',
    cue_pull_back: 'PULL BACK!',
    cue_empty_trap: 'EMPTY CONE! BACK!',
    cue_toss_fake: 'FLICK AWAY!',
    cue_final_grab: 'GRAB & PULL!',

    tag_empty: 'EMPTY CONE',
    tag_scraping: '🥄 SCRAPING',
    tag_grab: '🤚 GRAB',
    tag_scoop2: '🥄 2ND SCOOP',
    tag_empty_trap: '✕ EMPTY CONE',
    tag_on_paddle: '🍦 ON ROD',

    speech_hoppa: 'HOPPAAA! 🌀',
    speech_laugh: 'HAHAHA! 🧻',
    speech_taunt: 'OOO-HOP! 👀',
    speech_cheer: 'BRAVO! 🏆',
    speech_shock: 'WHOA! 🍦',
    speech_scrape: 'FRESH SCOOP! 💪',
    speech_empty_trap: 'EMPTY CONE! 😂',

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
    end_win_badge: 'MASTER BEAT!',
    end_win_title: 'YOU CAUGHT IT!',
    end_win_desc: 'Full 3-scoop pistachio Maraş ice cream is yours!',
    end_win_scoop: '3 Scoops + Pistachio',
  },

  ar: {
    gameTitle: 'آيس كريم مرعش',
    playBtn: '▶ ابدأ العرض',
    nextUsta: '▶ المعلم التالي',
    retryBtn: '🔄 إعادة',
    scoreLabel: 'النقاط',
    bestLabel: 'الأفضل',
    coneLabel: 'النتيجة',
    settingsTitle: 'اللغة والإعدادات',
    soundLabel: 'الصوت والموسيقى',
    hapticsLabel: 'الاهتزاز',
    fullscreenLabel: 'ملء الشاشة',
    closeBtn: 'تم',

    legReach: '🟢 🤚⬆️ امسك',
    legPull: '🔴 🤚⬇️ اسحب يدك',
    legFlick: '🧻 🤚💨 ارمِ بعيداً',

    usta_0: 'الصبي قادر',
    usta_1: 'المعلم بالا',
    usta_2: 'الجد عزمي',

    cue_scraping: 'يغرف البوظة... انتظر',
    cue_reach: 'مد يدك وامسك',
    cue_tug: 'اسحب نحوك!',
    cue_slice: 'اقطع بالعرض',
    cue_return_cone: 'ركّب أو ارمِ',
    cue_swap_watch: 'راقب التبديل',
    cue_swap_pick: 'امسك الحقيقي',
    cue_pendulum: 'امسك بالوسط',
    cue_pull_back: 'اسحب يدك!',
    cue_empty_trap: 'قمع فارغ! تراجع!',
    cue_toss_fake: 'ارمِ المنديل!',
    cue_final_grab: 'امسك واسحب!',

    tag_empty: 'قمع فارغ',
    tag_scraping: '🥄 يغرف',
    tag_grab: '🤚 امسك',
    tag_scoop2: '🥄 الكرة ٢',
    tag_empty_trap: '✕ قمع فارغ',
    tag_on_paddle: '🍦 على العصا',

    speech_hoppa: 'هوبااا! 🌀',
    speech_laugh: 'هاهاها! 🧻',
    speech_taunt: 'أووو-هوب! 👀',
    speech_cheer: 'أحسنت! 🏆',
    speech_shock: 'يا ساتر! 🍦',
    speech_scrape: 'بوظة مرعش! 💪',
    speech_empty_trap: 'القمع فارغ! 😂',

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
    end_win_badge: 'هزمت المعلم!',
    end_win_title: 'أمسكت البوظة!',
    end_win_desc: '٣ كرات بوظة مرعش بالفستق الحلبي لك!',
    end_win_scoop: '٣ كرات + فستق',
  },

  ru: {
    gameTitle: 'Турецкое Мороженое',
    playBtn: '▶ НАЧАТЬ ШОУ',
    nextUsta: '▶ СЛЕД. МАСТЕР',
    retryBtn: '🔄 ЗАНОВО',
    scoreLabel: 'Очки',
    bestLabel: 'Рекорд',
    coneLabel: 'Итог',
    settingsTitle: 'Язык и Настройки',
    soundLabel: 'Звук и Музыка',
    hapticsLabel: 'Вибрация',
    fullscreenLabel: 'Полный экран',
    closeBtn: 'Готово',

    legReach: '🟢 🤚⬆️ Тянись',
    legPull: '🔴 🤚⬇️ Назад',
    legFlick: '🧻 🤚💨 Смахни',

    usta_0: 'Ученик Кадир',
    usta_1: 'Мастер Пала',
    usta_2: 'Дедушка Джезми',

    cue_scraping: 'НАБИРАЕТ... ЖДИ',
    cue_reach: 'ТЯНИСЬ И ХВАТАЙ',
    cue_tug: 'ТЯНИ К СЕБЕ!',
    cue_slice: 'РЕЖЬ ПОПЕРЕК',
    cue_return_cone: 'ВЕРНИ / БРОСЬ',
    cue_swap_watch: 'СЛЕДИ ЗА РУКАМИ',
    cue_swap_pick: 'БЕРИ НАСТОЯЩИЙ',
    cue_pendulum: 'ЛОВИ В ЦЕНТРЕ',
    cue_pull_back: 'УБЕРИ РУКУ!',
    cue_empty_trap: 'ПУСТОЙ РОЖОК!',
    cue_toss_fake: 'СМАХНИ В СТОРОНУ!',
    cue_final_grab: 'ХВАТАЙ И ТЯНИ!',

    tag_empty: 'ПУСТО',
    tag_scraping: '🥄 НАБИРАЕТ',
    tag_grab: '🤚 ХВАТАЙ',
    tag_scoop2: '🥄 2-Й ШАР',
    tag_empty_trap: '✕ ПУСТОЙ РОЖОК',
    tag_on_paddle: '🍦 НА ПАЛКЕ',

    speech_hoppa: 'ХОППАА! 🌀',
    speech_laugh: 'ХА-ХА-ХА! 🧻',
    speech_taunt: 'ООО-ХОП! 👀',
    speech_cheer: 'МОЛОДЕЦ! 🏆',
    speech_shock: 'ОГО! 🍦',
    speech_scrape: 'МАРАШ! 💪',
    speech_empty_trap: 'ПУСТОЙ! 😂',

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
    end_win_badge: 'МАСТЕР ПОБЕЖДЕН!',
    end_win_title: 'МОРОЖЕНОЕ ВАШЕ!',
    end_win_desc: '3 шара мороженого Мараш с фисташками!',
    end_win_scoop: '3 Шара + Фисташки',
  },

  de: {
    gameTitle: 'Türkisches Eis',
    playBtn: '▶ SHOW STARTEN',
    nextUsta: '▶ NÄCHSTER MEISTER',
    retryBtn: '🔄 NOCHMAL',
    scoreLabel: 'Punkte',
    bestLabel: 'Rekord',
    coneLabel: 'Ergebnis',
    settingsTitle: 'Sprache & Optionen',
    soundLabel: 'Ton & Musik',
    hapticsLabel: 'Vibration',
    fullscreenLabel: 'Vollbild',
    closeBtn: 'Fertig',

    legReach: '🟢 🤚⬆️ Greifen',
    legPull: '🔴 🤚⬇️ Zurück',
    legFlick: '🧻 🤚💨 Wegwerfen',

    usta_0: 'Lehrling Kadir',
    usta_1: 'Meister Pala',
    usta_2: 'Opa Cezmi',

    cue_scraping: 'SCHABT EIS... WARTE',
    cue_reach: 'GREIF ZU',
    cue_tug: 'ZU DIR ZIEHEN!',
    cue_slice: 'DURCHSCHNEIDEN',
    cue_return_cone: 'ANSTECKEN / WERFEN',
    cue_swap_watch: 'BEOBACHTEN',
    cue_swap_pick: 'ECHTES GREIFEN',
    cue_pendulum: 'MITTE TREFFEN',
    cue_pull_back: 'HAND ZURÜCK!',
    cue_empty_trap: 'LEERE WAFFEL!',
    cue_toss_fake: 'WEGSCHLEUDERN!',
    cue_final_grab: 'GREIFEN & ZIEHEN!',

    tag_empty: 'LEERE WAFFEL',
    tag_scraping: '🥄 SCHABT',
    tag_grab: '🤚 GREIFEN',
    tag_scoop2: '🥄 2. KUGEL',
    tag_empty_trap: '✕ LEER!',
    tag_on_paddle: '🍦 AM STAB',

    speech_hoppa: 'HOPPAAA! 🌀',
    speech_laugh: 'HAHAHA! 🧻',
    speech_taunt: 'OOO-HOP! 👀',
    speech_cheer: 'BRAVO! 🏆',
    speech_shock: 'HOPPLA! 🍦',
    speech_scrape: 'MARAŞ EIS! 💪',
    speech_empty_trap: 'LEER! 😂',

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
    end_win_badge: 'MEISTER BESIEGT!',
    end_win_title: 'EIS GEFANGEN!',
    end_win_desc: '3 Kugeln Maraş-Eis mit Pistazien gehören dir!',
    end_win_scoop: '3 Kugeln + Pistazie',
  },

  ja: {
    gameTitle: 'トルコアイス職人',
    playBtn: '▶ ショー開始',
    nextUsta: '▶ 次の職人へ',
    retryBtn: '🔄 もう一度',
    scoreLabel: 'スコア',
    bestLabel: '最高記録',
    coneLabel: '結果',
    settingsTitle: '言語と設定',
    soundLabel: 'サウンド・音楽',
    hapticsLabel: '振動 (ハプティクス)',
    fullscreenLabel: '全画面表示',
    closeBtn: '閉じる',

    legReach: '🟢 🤚⬆️ 掴む',
    legPull: '🔴 🤚⬇️ 手を引く',
    legFlick: '🧻 🤚💨 投げ捨てる',

    usta_0: '見習いカディル',
    usta_1: 'パラ親方',
    usta_2: 'ジェズミ師匠',

    cue_scraping: '練り上げ中…待て',
    cue_reach: '手を伸ばして掴め',
    cue_tug: '手前に引け！',
    cue_slice: '横にスライドで切る',
    cue_return_cone: '戻す / 投げる',
    cue_swap_watch: 'よく見て！',
    cue_swap_pick: '本物を掴め',
    cue_pendulum: '中央でタッチ',
    cue_pull_back: '手を引け！罠だ！',
    cue_empty_trap: '空コーンだ！引け！',
    cue_toss_fake: '横に振って捨てろ！',
    cue_final_grab: '掴んで引き抜け！',

    tag_empty: '空コーン',
    tag_scraping: '🥄 練り中',
    tag_grab: '🤚 掴む',
    tag_scoop2: '🥄 2段目',
    tag_empty_trap: '✕ 空コーン',
    tag_on_paddle: '🍦 棒の上',

    speech_hoppa: 'ホッパー！🌀',
    speech_laugh: 'ハハハ！🧻',
    speech_taunt: 'おっと！👀',
    speech_cheer: 'お見事！🏆',
    speech_shock: 'おっと早すぎ！🍦',
    speech_scrape: '伸びるアイス！💪',
    speech_empty_trap: '空っぽだよ！😂',

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
    end_win_badge: '職人を攻略！',
    end_win_title: '完全キャッチ成功！',
    end_win_desc: '3段ピスタチオのトルコアイスをゲット！',
    end_win_scoop: '3段＋ピスタチオ',
  },
};

export class SaveManager {
  constructor() {
    this.lang = this._detectDefaultLang();
    this.hapticsEnabled = true;
    this.data = {
      highScores: [0, 0, 0],
      stars: [0, 0, 0],
      conesCaught: 0,
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
        if (Array.isArray(parsed.highScores)) this.data.highScores = parsed.highScores;
        if (Array.isArray(parsed.stars)) this.data.stars = parsed.stars;
        if (typeof parsed.conesCaught === 'number') this.data.conesCaught = parsed.conesCaught;
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

  toggleLang() {
    const idx = SUPPORTED_LANGS.findIndex((l) => l.code === this.lang);
    const next = SUPPORTED_LANGS[(idx + 1) % SUPPORTED_LANGS.length];
    return this.setLang(next.code);
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

  getUstaName(idx) {
    return this.t(`usta_${idx % 3}`);
  }

  toggleHaptics() {
    this.hapticsEnabled = !this.hapticsEnabled;
    this.save();
    return this.hapticsEnabled;
  }

  recordResult(ustaIdx, score, starCount, wonFullCone) {
    const idx = ustaIdx % 3;
    if (score > (this.data.highScores[idx] || 0)) {
      this.data.highScores[idx] = score;
    }
    if (starCount > (this.data.stars[idx] || 0)) {
      this.data.stars[idx] = starCount;
    }
    if (wonFullCone) {
      this.data.conesCaught++;
    }
    this.save();
  }

  getBestScore(ustaIdx) {
    return this.data.highScores[ustaIdx % 3] || 0;
  }

  getStars(ustaIdx) {
    return this.data.stars[ustaIdx % 3] || 0;
  }
}
