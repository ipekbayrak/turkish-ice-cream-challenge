import {
  buildShareUrl,
  decodeChallengePayload,
  encodeChallengePayload,
  getDailyChallengeSpec,
} from './seeded-random.js';

/**
 * Friend Trap Builder ("Arkadaşına Tuzak Kur") & Incoming URL Challenge Parser.
 * Lets any player pick 3–5 signature tricks and generate a zero-server `?c=` link
 * without requiring full 3D Vendor Mode first.
 */

export const CURATED_TRAP_TRICKS = Object.freeze([
  'DOUBLE_CONE_SLIDE',
  'UPSIDE_DOWN_GRAVITY',
  'FAKE_DROP_PANIC',
  'GIANT_BLOCK_TEASE',
  'MEGA_TAFFY_SLICE',
  'NAPKIN_CONE_FAKEOUT',
  'SHELL_SWAP_DUEL',
  'CROWN_TAP_KISS_TEASE',
  'BELL_RHYTHM_FEINT',
  'COMBO_DOUBLE_PUMP',
  'OVERHEAD_CROWN_DANGLE',
  'WHOLE_MOLD_ON_CONE',
  'SCOOP_LIFT_BACK',
  'BONUS_SCOOP_TAKEBACK',
  'FIGURE_EIGHT_WEAVE',
  'EYE_LOCK_RHYTHM_CHASE',
]);

export function parseIncomingChallengeUrl(search = '') {
  try {
    const params = new URLSearchParams(search || '');
    const token = params.get('c');
    if (token) {
      const decoded = decodeChallengePayload(token);
      if (decoded) return decoded;
    }
    if (params.get('daily') === '1') {
      return getDailyChallengeSpec(params.get('date') || new Date());
    }
  } catch {
    // Ignore malformed query string
  }
  return null;
}

export function createTrapChallengeLink({
  tricks = ['DOUBLE_CONE_SLIDE', 'UPSIDE_DOWN_GRAVITY', 'NAPKIN_CONE_FAKEOUT', 'SHELL_SWAP_DUEL'],
  stage = 6,
  scoopCount = 3,
  flavors = [0, 1, 2],
  senderScore = null,
  senderBamboozled = null,
  senderName = '',
  baseHref = 'https://dondurma.ipekbayrak.com.tr/',
  seed = Date.now() >>> 0,
} = {}) {
  const chosen = Array.isArray(tricks) && tricks.length >= 3
    ? tricks.slice(0, 5)
    : ['DOUBLE_CONE_SLIDE', 'UPSIDE_DOWN_GRAVITY', 'NAPKIN_CONE_FAKEOUT'];
  const token = encodeChallengePayload({
    seed,
    stage,
    scoopCount,
    flavors,
    tricks: chosen,
    senderScore,
    senderBamboozled,
    senderName,
  });
  const url = buildShareUrl(baseHref, { c: token });
  return { token, url, tricks: chosen, seed, stage, scoopCount, flavors };
}

export function formatChallengeComparison({
  challengeMeta = null,
  won = false,
  bamboozled = 0,
  score = 0,
  lang = 'tr',
} = {}) {
  if (!challengeMeta || challengeMeta.kind !== 'challenge') return '';
  const tr = lang === 'tr';
  const rivalBamboozled = challengeMeta.senderBamboozled;
  const rivalScore = challengeMeta.senderScore;

  if (!won) {
    return tr
      ? '😈 Arkadaşının kurduğu tuzağa düştün! Rövanş al!'
      : '😈 You fell into your friend’s trap! Hit retry for revenge!';
  }
  if (Number.isFinite(rivalBamboozled)) {
    if (bamboozled < rivalBamboozled || (bamboozled === rivalBamboozled && Number.isFinite(rivalScore) && score > rivalScore)) {
      return tr
        ? `🏅 Arkadaşını geçtin! (Sen: 🎣 ${bamboozled} • O: 🎣 ${rivalBamboozled})`
        : `🏅 You beat your friend! (You: 🎣 ${bamboozled} • Them: 🎣 ${rivalBamboozled})`;
    }
    return tr
      ? `😄 Dondurmayı kaptın! (Sen: 🎣 ${bamboozled} • Arkadaşın: 🎣 ${rivalBamboozled})`
      : `😄 Caught it! (You: 🎣 ${bamboozled} • Friend: 🎣 ${rivalBamboozled})`;
  }
  return tr
    ? '🏆 Arkadaşının kurduğu özel tuzak serisini aştın!'
    : '🏆 You conquered your friend’s custom trap sequence!';
}
