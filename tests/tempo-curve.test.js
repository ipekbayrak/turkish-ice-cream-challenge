import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_GAME_SPEED,
  BASE_MUSIC_TEMPO,
  isStageNumber,
  normalizeStage,
  tempoForStage,
} from '../src/progression.js';

test('exports baseline speed and music tempo constants', () => {
  assert.equal(BASE_GAME_SPEED, 0.78);
  assert.equal(BASE_MUSIC_TEMPO, 0.85);
});

test('isStageNumber strictly validates positive safe integer numbers', () => {
  assert.equal(isStageNumber(1), true);
  assert.equal(isStageNumber(30), true);
  assert.equal(isStageNumber(1_000_000), true);
  assert.equal(isStageNumber(Number.MAX_SAFE_INTEGER), true);

  assert.equal(isStageNumber(0), false);
  assert.equal(isStageNumber(-1), false);
  assert.equal(isStageNumber(1.5), false);
  assert.equal(isStageNumber(NaN), false);
  assert.equal(isStageNumber(Infinity), false);
  assert.equal(isStageNumber(-Infinity), false);
  assert.equal(isStageNumber(Number.MAX_SAFE_INTEGER + 1), false);
  assert.equal(isStageNumber('1'), false);
  assert.equal(isStageNumber(null), false);
  assert.equal(isStageNumber(undefined), false);
  assert.equal(isStageNumber({}), false);
});

test('normalizeStage floors numeric values, defaults to 1, and clamps at MAX_SAFE_INTEGER without campaign cap', () => {
  assert.equal(normalizeStage(1), 1);
  assert.equal(normalizeStage(2.9), 2);
  assert.equal(normalizeStage(30.99), 30);
  assert.equal(normalizeStage(31), 31);
  assert.equal(normalizeStage(1000), 1000);
  assert.equal(normalizeStage(1e6), 1_000_000);
  assert.equal(normalizeStage(1e20), Number.MAX_SAFE_INTEGER);

  for (const invalid of [undefined, null, NaN, Infinity, -Infinity, 0, 0.9, -10, 'invalid', '', {}, []]) {
    const stage = normalizeStage(invalid);
    assert.equal(stage, 1);
    assert.equal(isStageNumber(stage), true);
  }
});

test('tempoForStage matches baseline, expected milestones, monotonic growth, and diminishing increments', () => {
  assert.equal(tempoForStage(1), 1);
  assert.ok(Math.abs(tempoForStage(2) - (1 + 0.30 * Math.log1p(1))) < 1e-12);
  assert.ok(Math.abs(tempoForStage(2) - 1.21) < 0.01);
  assert.ok(Math.abs(tempoForStage(3) - 1.33) < 0.01);
  assert.ok(Math.abs(tempoForStage(10) - 1.69) < 0.01);
  assert.ok(Math.abs(tempoForStage(30) - 2.02) < 0.01);

  for (let s = 1; s <= 50; s += 1) {
    const t0 = tempoForStage(s);
    const t1 = tempoForStage(s + 1);
    const t2 = tempoForStage(s + 2);
    const d1 = t1 - t0;
    const d2 = t2 - t1;
    assert.ok(d1 > 0, `expected positive derivative at stage ${s}`);
    assert.ok(d2 < d1, `expected diminishing increment at stage ${s}`);
  }
});

test('tempoForStage grows beyond stage 30 through 31, 1000, and 1e6 without NaN or Infinity', () => {
  const t30 = tempoForStage(30);
  const t31 = tempoForStage(31);
  const t1000 = tempoForStage(1000);
  const t1e6 = tempoForStage(1e6);
  const tMax = tempoForStage(Number.MAX_SAFE_INTEGER);

  assert.ok(t31 > t30);
  assert.ok(t1000 > t31);
  assert.ok(t1e6 > t1000);
  assert.ok(tMax > t1e6);
  assert.ok(Number.isFinite(tMax));

  for (const input of [undefined, null, NaN, Infinity, -Infinity, -5, 0, 2.7, 1e30]) {
    const tempo = tempoForStage(input);
    assert.ok(Number.isFinite(tempo));
    assert.ok(!Number.isNaN(tempo));
    assert.ok(tempo >= 1);
  }
});
