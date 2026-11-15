import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildShareUrl,
  createSeededRandom,
  decodeChallengePayload,
  encodeChallengePayload,
  getDailyChallengeSpec,
  getDailyDateKey,
  hashStringSeed,
} from '../src/seeded-random.js';
import {
  formatEmojiStrip,
  formatShareText,
  renderShareCardCanvas,
} from '../src/daily-challenge.js';
import {
  CURATED_TRAP_TRICKS,
  createTrapChallengeLink,
  formatChallengeComparison,
  parseIncomingChallengeUrl,
} from '../src/challenge-builder.js';
import { makeEncounterFixture } from './encounter-fixture.js';

test('Phase 16.1: mulberry32 seeded PRNG & getDailyChallengeSpec are 100% deterministic across sessions and discoveredTricks states', () => {
  const dailyA = getDailyChallengeSpec('2026-07-15');
  const dailyB = getDailyChallengeSpec('2026-07-15');
  assert.deepEqual(dailyA, dailyB);
  assert.equal(dailyA.kind, 'daily');
  assert.ok(dailyA.stage >= 4 && dailyA.stage <= 18);
  assert.ok(dailyA.scoopCount >= 2 && dailyA.scoopCount <= 4);

  const fFresh = makeEncounterFixture({ stage: dailyA.stage, count: dailyA.scoopCount, vendor: 1 });
  fFresh.d.save.data.discoveredTricks = [];
  fFresh.d.setSeededChallenge({
    randomFn: createSeededRandom(dailyA.seed),
    meta: dailyA,
  });
  fFresh.d.setOrderConfig(dailyA.scoopCount, dailyA.flavors, dailyA.stage);
  fFresh.d.resetRound(dailyA.stage, false);
  fFresh.d.startRound({ customerCone: false });

  const fVeteran = makeEncounterFixture({ stage: dailyA.stage, count: dailyA.scoopCount, vendor: 1 });
  fVeteran.d.save.data.discoveredTricks = [
    'DOUBLE_CONE_SLIDE',
    'UPSIDE_DOWN_GRAVITY',
    'NAPKIN_CONE_FAKEOUT',
    'EYE_LOCK_RHYTHM_CHASE',
    'GIANT_BLOCK_TEASE',
  ];
  fVeteran.d.setSeededChallenge({
    randomFn: createSeededRandom(dailyA.seed),
    meta: dailyA,
  });
  fVeteran.d.setOrderConfig(dailyA.scoopCount, dailyA.flavors, dailyA.stage);
  fVeteran.d.resetRound(dailyA.stage, false);
  fVeteran.d.startRound({ customerCone: false });

  assert.deepEqual(
    fFresh.d.routine,
    fVeteran.d.routine,
    'Fresh and veteran players receive the exact same routine for Daily Master'
  );
  assert.equal(getDailyDateKey(new Date('2026-11-15T12:00:00Z')), '2026-11-15');
  assert.notEqual(hashStringSeed('2026-11-15'), hashStringSeed('2026-11-16'));
});

test('Phase 16.2: encodeChallengePayload & decodeChallengePayload roundtrip, sanitize untrusted inputs, and reject malformed tokens', () => {
  const token = encodeChallengePayload({
    seed: 987654321,
    stage: 8,
    scoopCount: 3,
    flavors: [1, 2, 0],
    tricks: ['DOUBLE_CONE_SLIDE', 'SHELL_SWAP_DUEL', 'UPSIDE_DOWN_GRAVITY', 'FINAL_PISTACHIO_CATCH'],
    senderScore: 2450,
    senderBamboozled: 1,
    senderName: '<script>Ali</script>',
  });
  assert.ok(token.length > 10 && token.length < 120);

  const decoded = decodeChallengePayload(token);
  assert.ok(decoded);
  assert.equal(decoded.kind, 'challenge');
  assert.equal(decoded.seed, 987654321);
  assert.equal(decoded.stage, 8);
  assert.equal(decoded.scoopCount, 3);
  assert.deepEqual(decoded.flavors, [1, 2, 0]);
  assert.deepEqual(decoded.tricks, ['DOUBLE_CONE_SLIDE', 'SHELL_SWAP_DUEL', 'UPSIDE_DOWN_GRAVITY']);
  assert.equal(decoded.senderScore, 2450);
  assert.equal(decoded.senderBamboozled, 1);
  assert.equal(decoded.senderName.includes('<'), false, 'HTML brackets stripped from nickname');

  assert.equal(decodeChallengePayload(''), null);
  assert.equal(decodeChallengePayload('not-valid-base64!!!'), null);
  assert.equal(decodeChallengePayload('e30'), null);
});

test('Phase 16.3: Capacitor localhost share URLs rewrite to canonical https://dondurma.ipekbayrak.com.tr/ and parseIncomingChallengeUrl resolves ?c= & ?daily=1', () => {
  const androidUrl = buildShareUrl('https://localhost/index.html', { daily: 1 });
  assert.equal(androidUrl, 'https://dondurma.ipekbayrak.com.tr/?daily=1');

  const trap = createTrapChallengeLink({
    tricks: CURATED_TRAP_TRICKS.slice(0, 4),
    stage: 6,
    scoopCount: 3,
    flavors: [0, 2, 1],
    senderScore: 1900,
    senderBamboozled: 2,
    baseHref: 'https://localhost/',
    seed: 424242,
  });
  assert.ok(trap.url.startsWith('https://dondurma.ipekbayrak.com.tr/?c='));

  const parsedTrap = parseIncomingChallengeUrl(new URL(trap.url).search);
  assert.equal(parsedTrap.kind, 'challenge');
  assert.deepEqual(parsedTrap.tricks, CURATED_TRAP_TRICKS.slice(0, 4));
  assert.equal(parsedTrap.senderBamboozled, 2);

  const parsedDaily = parseIncomingChallengeUrl('?daily=1&date=2026-08-01');
  assert.equal(parsedDaily.kind, 'daily');
  assert.equal(parsedDaily.dateKey, '2026-08-01');
});

test('Phase 16.4: Trap custom trick sequence runs directly in TrickDirector and formats rival comparison & 720x960 share card', () => {
  const customTricks = ['DOUBLE_CONE_SLIDE', 'NAPKIN_CONE_FAKEOUT', 'UPSIDE_DOWN_GRAVITY'];
  const f = makeEncounterFixture({ stage: 6, count: 2, vendor: 1 });
  f.d.setSeededChallenge({
    randomFn: createSeededRandom(12345),
    customTricks,
    meta: {
      kind: 'challenge',
      senderScore: 1800,
      senderBamboozled: 2,
    },
  });
  f.d.resetRound(6, false);
  for (const trickId of customTricks) {
    assert.ok(f.d.routine.includes(trickId), `custom trick ${trickId} scheduled in routine`);
  }

  const beatMsg = formatChallengeComparison({
    challengeMeta: f.d.challengeMeta,
    won: true,
    bamboozled: 0,
    score: 2200,
    lang: 'tr',
  });
  assert.ok(beatMsg.includes('Arkadaşını geçtin'));

  const lostMsg = formatChallengeComparison({
    challengeMeta: f.d.challengeMeta,
    won: false,
    bamboozled: 3,
    score: 400,
    lang: 'en',
  });
  assert.ok(lostMsg.includes('trap'));

  const drawOps = [];
  const mockCanvas = renderShareCardCanvas({
    badge: 'GÜNÜN USTASI · 2026-11-15',
    title: 'DONDURMAYI KAPTIN!',
    emojiStrip: formatEmojiStrip(['✅', '❌', '✅', '🍦']),
    bamboozled: 1,
    scoreText: '2,150',
    canvasFactory(w, h) {
      return {
        width: w,
        height: h,
        getContext() {
          return {
            createLinearGradient() {
              return { addColorStop() {} };
            },
            fillRect(...args) { drawOps.push(['fillRect', ...args]); },
            strokeRect(...args) { drawOps.push(['strokeRect', ...args]); },
            beginPath() {},
            roundRect() {},
            rect() {},
            fill() {},
            fillText(txt) { drawOps.push(['fillText', txt]); },
          };
        },
      };
    },
  });
  assert.equal(mockCanvas.width, 720);
  assert.equal(mockCanvas.height, 960);
  assert.ok(drawOps.some(([op, val]) => op === 'fillText' && String(val).includes('✅❌✅🍦')));

  const shareTxt = formatShareText({
    lang: 'tr',
    mode: 'daily',
    dateKey: '2026-11-15',
    emojiStrip: '✅❌✅🍦',
    bamboozled: 1,
    score: 2150,
  });
  assert.ok(shareTxt.includes('Günün Ustası (2026-11-15)'));
  assert.ok(shareTxt.includes('✅❌✅🍦'));
});
