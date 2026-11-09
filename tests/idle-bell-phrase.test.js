import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdleBellPhrase, idleBellPhraseAt } from '../src/idle-bell-phrase.js';

function seqRandom(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test('createIdleBellPhrase builds deterministic short (2 or 3 distinct bells) and sweep (all 7 asc/desc) phrases', () => {
  const shortTwo = createIdleBellPhrase(7, { random: seqRandom([0.4, 0.2, 0.0, 0.85]) });
  assert.equal(shortTwo.kind, 'short');
  assert.deepEqual(shortTwo.indices, [0, 6]);
  assert.equal(shortTwo.beatSeconds, 0.36);
  assert.ok(Math.abs(shortTwo.duration - 0.72) < 1e-12);

  const shortThree = createIdleBellPhrase(7, { random: seqRandom([0.8, 0.75, 0.9, 0.1, 0.5]) });
  assert.equal(shortThree.kind, 'short');
  assert.deepEqual(shortThree.indices, [6, 0, 3]);
  assert.equal(shortThree.beatSeconds, 0.36);
  assert.ok(Math.abs(shortThree.duration - 1.08) < 1e-12);

  const sweepAsc = createIdleBellPhrase(7, { random: seqRandom([0.1, 0.2]) });
  assert.equal(sweepAsc.kind, 'sweep');
  assert.deepEqual(sweepAsc.indices, [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(sweepAsc.beatSeconds, 0.36);
  assert.ok(Math.abs(sweepAsc.duration - 2.52) < 1e-12);

  const sweepDesc = createIdleBellPhrase(7, { random: seqRandom([0.24, 0.8]) });
  assert.equal(sweepDesc.kind, 'sweep');
  assert.deepEqual(sweepDesc.indices, [6, 5, 4, 3, 2, 1, 0]);
  assert.equal(sweepDesc.beatSeconds, 0.36);
  assert.ok(Math.abs(sweepDesc.duration - 2.52) < 1e-12);
});

test('createIdleBellPhrase across many seeds produces distinct in-range short phrases (including non-adjacent) and full 7-bell sweeps', () => {
  let shortCount = 0;
  let sweepAscCount = 0;
  let sweepDescCount = 0;
  let nonAdjacentShortCount = 0;

  for (let seed = 1; seed <= 250; seed++) {
    const random = lcg(seed);
    const phrase = createIdleBellPhrase(7, { random });
    assert.equal(phrase.beatSeconds, 0.36);
    assert.ok(Math.abs(phrase.duration - phrase.indices.length * 0.36) < 1e-12);
    assert.equal(new Set(phrase.indices).size, phrase.indices.length);

    for (const idx of phrase.indices) {
      assert.ok(Number.isInteger(idx));
      assert.ok(idx >= 0 && idx < 7);
    }

    if (phrase.kind === 'sweep') {
      assert.equal(phrase.indices.length, 7);
      if (phrase.indices[0] === 0) {
        assert.deepEqual(phrase.indices, [0, 1, 2, 3, 4, 5, 6]);
        sweepAscCount++;
      } else {
        assert.deepEqual(phrase.indices, [6, 5, 4, 3, 2, 1, 0]);
        sweepDescCount++;
      }
    } else {
      assert.equal(phrase.kind, 'short');
      assert.ok(phrase.indices.length === 2 || phrase.indices.length === 3);
      shortCount++;
      if (phrase.indices.some((idx, i) => i > 0 && Math.abs(idx - phrase.indices[i - 1]) > 1)) {
        nonAdjacentShortCount++;
      }
    }
  }

  assert.ok(shortCount > 100);
  assert.ok(sweepAscCount > 10);
  assert.ok(sweepDescCount > 10);
  assert.ok(nonAdjacentShortCount > 50);
});

test('createIdleBellPhrase handles small/invalid bellCount and out-of-range random values safely', () => {
  const oneBell = createIdleBellPhrase(1, { random: () => 0.9 });
  assert.equal(oneBell.kind, 'short');
  assert.deepEqual(oneBell.indices, [0]);
  assert.ok(Math.abs(oneBell.duration - 0.36) < 1e-12);

  const twoBellsAsc = createIdleBellPhrase(2, { random: seqRandom([0.9, 0.9, 0.1, 0.1]) });
  assert.equal(twoBellsAsc.kind, 'short');
  assert.deepEqual(twoBellsAsc.indices, [0, 1]);

  const twoBellsDesc = createIdleBellPhrase(2, { random: seqRandom([0.9, 0.9, 0.9, 0.1]) });
  assert.equal(twoBellsDesc.kind, 'short');
  assert.deepEqual(twoBellsDesc.indices, [1, 0]);

  const clampedZero = createIdleBellPhrase(0, { random: () => 1 });
  assert.deepEqual(clampedZero.indices, [0]);

  const clampedNegative = createIdleBellPhrase(-3, { random: () => NaN });
  assert.deepEqual(clampedNegative.indices, [0]);

  const weirdRandom = createIdleBellPhrase(7, { random: seqRandom([1, NaN, -5, 2, -1]) });
  assert.equal(weirdRandom.kind, 'short');
  assert.equal(weirdRandom.indices.length, 2);
  assert.deepEqual(weirdRandom.indices, [0, 6]);
});

test('idleBellPhraseAt tracks beat boundaries, clamps invalid ages, and rests after duration without looping', () => {
  const phrase = { indices: [2, 3, 4], beatSeconds: 0.36, duration: 1.08 };

  assert.deepEqual(idleBellPhraseAt(phrase, -2), {
    striking: true,
    beat: 0,
    index: 2,
    phase: 0,
  });

  assert.deepEqual(idleBellPhraseAt(phrase, NaN), {
    striking: true,
    beat: 0,
    index: 2,
    phase: 0,
  });

  assert.deepEqual(idleBellPhraseAt(phrase, 0), {
    striking: true,
    beat: 0,
    index: 2,
    phase: 0,
  });

  const midFirst = idleBellPhraseAt(phrase, 0.18);
  assert.equal(midFirst.striking, true);
  assert.equal(midFirst.beat, 0);
  assert.equal(midFirst.index, 2);
  assert.ok(Math.abs(midFirst.phase - 0.5) < 1e-12);

  const startSecond = idleBellPhraseAt(phrase, 0.36);
  assert.equal(startSecond.striking, true);
  assert.equal(startSecond.beat, 1);
  assert.equal(startSecond.index, 3);
  assert.ok(Math.abs(startSecond.phase) < 1e-12);

  const startThird = idleBellPhraseAt(phrase, 0.72);
  assert.equal(startThird.striking, true);
  assert.equal(startThird.beat, 2);
  assert.equal(startThird.index, 4);
  assert.ok(Math.abs(startThird.phase) < 1e-12);

  const exactEnd = idleBellPhraseAt(phrase, 1.08);
  assert.deepEqual(exactEnd, {
    striking: false,
    beat: 2,
    index: 4,
    phase: 1,
  });

  const after100s = idleBellPhraseAt(phrase, 100);
  assert.deepEqual(after100s, {
    striking: false,
    beat: 2,
    index: 4,
    phase: 1,
  });
});
