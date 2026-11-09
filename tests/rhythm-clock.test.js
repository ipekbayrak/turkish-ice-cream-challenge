import test from 'node:test';
import assert from 'node:assert/strict';
import { RhythmClock } from '../src/rhythm-clock.js';

function simulateSeconds(hz, durationSec, tempo = 1) {
  const clock = new RhythmClock(tempo);
  const frames = Math.round(hz * durationSec);
  const dt = 1 / hz;
  let totalSteps = 0;

  for (let i = 0; i < frames; i += 1) {
    const due = clock.advance(dt);
    totalSteps += due.length;
  }

  return { clock, totalSteps };
}

test('30Hz, 60Hz, and 120Hz produce equal step count over 60 seconds within tolerance 1', () => {
  const run30 = simulateSeconds(30, 60);
  const run60 = simulateSeconds(60, 60);
  const run120 = simulateSeconds(120, 60);

  assert.ok(run60.totalSteps > 200);
  assert.ok(Math.abs(run30.totalSteps - run60.totalSteps) <= 1);
  assert.ok(Math.abs(run120.totalSteps - run60.totalSteps) <= 1);
  assert.ok(Math.abs(run30.totalSteps - run120.totalSteps) <= 1);
});

test('tempo 2 advances twice the logical time and music steps compared to tempo 1', () => {
  const slow = simulateSeconds(60, 10, 1);
  const fast = simulateSeconds(60, 10, 2);

  assert.ok(Math.abs(slow.clock.realTime - 10) < 1e-6);
  assert.ok(Math.abs(fast.clock.realTime - 10) < 1e-6);
  assert.ok(Math.abs(fast.clock.time - slow.clock.time * 2) < 1e-6);
  assert.ok(Math.abs(fast.totalSteps - slow.totalSteps * 2) <= 2);
});

test('physical accents never move the song grid or consume a beat', () => {
 const clock=new RhythmClock(1.2);clock.advance(.09);
 const before=[clock.step,clock.nextAt,clock.time,clock.phase];
 for(let i=0;i<20;i++)assert.equal(clock.accent(),null);
 assert.deepEqual([clock.step,clock.nextAt,clock.time,clock.phase],before);
 assert.equal(clock.advance(.15).length,1);
});

test('stop, reset, invalid dt, phase range, and bounded 16-step backlog skip', () => {
  const clock = new RhythmClock(0.5); // invalid < 1 defaults to 1
  assert.equal(clock.tempo, 1);

  for (const badDt of [-0.5, NaN, Infinity, -Infinity, null, undefined, '0.016']) {
    assert.deepEqual(clock.advance(badDt), []);
  }
  assert.equal(clock.time, 0);
  assert.equal(clock.realTime, 0);

  // Huge frame backlog: capped at 16 steps and skips remaining backlog
  const burst = clock.advance(30);
  assert.equal(burst.length, 16);
  assert.equal(burst[0].step, 0);
  assert.equal(burst[15].step, 15);
  assert.ok(clock.nextAt > clock.time);
  assert.ok(clock.phase >= 0 && clock.phase <= 1);

  // Next normal frame should not keep draining stale backlog
  const nextFrame = clock.advance(1 / 60);
  assert.equal(nextFrame.length, 0);
  assert.ok(clock.phase > 0 && clock.phase < 1);

  clock.stop();
  assert.equal(clock.running, false);
  assert.deepEqual(clock.advance(1), []);
  assert.equal(clock.accent(), null);

  clock.reset(1.5);
  assert.equal(clock.running, true);
  assert.equal(clock.tempo, 1.5);
  assert.equal(clock.time, 0);
  assert.equal(clock.realTime, 0);
  assert.equal(clock.step, 0);
  assert.equal(clock.nextAt, 0);
  assert.equal(clock.lastNoteReal, -Infinity);
});
