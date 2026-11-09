import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { BELL_MELODIES, BellMelodies } from '../src/bell-melodies.js';
import { CounterInteractions } from '../src/counter-interactions.js';

test('BellMelodies recognizes Ode to Joy, Twinkle, and custom usta-answer intros and plays exact continuations', () => {
  const cases = [
    {
      id: 'ode-to-joy',
      intro: [2, 2, 3, 4, 4, 3, 2, 1],
      continuation: [0, 0, 1, 2, 2, 1, 1, 2, 2, 3, 4, 4, 3, 2, 1, 0, 0, 1, 2, 1, 0, 0],
      beat: 0.30,
    },
    {
      id: 'twinkle',
      intro: [0, 0, 4, 4, 5, 5, 4],
      continuation: [3, 3, 2, 2, 1, 1, 0, 4, 4, 3, 3, 2, 2, 1, 4, 4, 3, 3, 2, 2, 1, 0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0],
      beat: 0.32,
    },
    {
      id: 'usta-answer',
      intro: [0, 0, 1, 2, 2, 1, 0, 1, 2, 0],
      continuation: [2, 3, 4, 4, 3, 2, 1, 0, 1, 2, 1, 0],
      beat: 0.28,
    },
  ];

  assert.equal(BELL_MELODIES.length, 3);

  for (const expected of cases) {
    const played = [];
    const recognized = [];
    const melodies = new BellMelodies({
      onNote: idx => played.push(idx),
      onRecognized: id => recognized.push(id),
    });

    expected.intro.forEach((n, idx) => {
      if (idx > 0) melodies.update(0.18 + (idx % 3) * 0.21, true);
      const matched = melodies.note(n);
      assert.equal(matched, idx === expected.intro.length - 1);
    });

    assert.deepEqual(recognized, [expected.id]);
    assert.equal(played.length, 0);

    for (let step = 0; step < expected.continuation.length; step++) {
      melodies.update(expected.beat, true);
      assert.equal(played.length, step + 1);
    }

    assert.deepEqual(played, expected.continuation);
    assert.equal(melodies.isPlaying, false);
  }
});

test('BellMelodies recovers viable suffix on wrong prefix and resets after 2s inter-note timeout', () => {
  const recognized = [];
  const melodies = new BellMelodies({
    onRecognized: id => recognized.push(id),
  });

  // Start Ode to Joy [2, 2, 3], then hit wrong note 2 -> suffix [2] preserved, finish [2, 3, 4, 4, 3, 2, 1]
  for (const n of [2, 2, 3, 2, 2, 3, 4, 4, 3, 2, 1]) {
    melodies.note(n);
  }
  assert.deepEqual(recognized, ['ode-to-joy']);

  melodies.reset();
  // Start Twinkle [0, 0, 4], switch to usta-answer [0, 0, 1, 2, 2, 1, 0, 1, 2, 0]
  for (const n of [0, 0, 4, 0, 0, 1, 2, 2, 1, 0, 1, 2, 0]) {
    melodies.note(n);
  }
  assert.deepEqual(recognized, ['ode-to-joy', 'usta-answer']);

  melodies.reset();
  // Timeout >= 2s between human notes clears partial intro
  for (const n of [0, 0, 4, 4]) {
    melodies.note(n);
    melodies.update(0.4, true);
  }
  melodies.update(2.0, true);
  assert.equal(melodies.buffer.length, 0);
  for (const n of [5, 5, 4]) {
    melodies.note(n);
  }
  assert.equal(recognized.length, 2);
});

test('BellMelodies never triggers on one-note, repeated spam, or sweeps and keeps input buffer bounded', () => {
  const recognized = [];
  const melodies = new BellMelodies({
    onRecognized: id => recognized.push(id),
  });

  // Single-note inputs and invalid indices
  for (const invalid of [-1, 7, 1.5, NaN, null, undefined]) {
    assert.equal(melodies.note(invalid), false);
  }
  assert.equal(melodies.note(0), false);
  assert.equal(melodies.note(2), false);
  melodies.reset();

  // Repeated single-bell spam followed by tail notes must not trigger Twinkle or Ode to Joy
  for (const n of [0, 0, 0, 0, 4, 4, 5, 5, 4]) {
    melodies.note(n);
    assert.ok(melodies.buffer.length <= 10);
  }
  for (const n of [2, 2, 2, 3, 4, 4, 3, 2, 1]) {
    melodies.note(n);
    assert.ok(melodies.buffer.length <= 10);
  }

  // Repeated full-rack sweeps and random-like noise keep buffer bounded and never trigger
  for (let round = 0; round < 30; round++) {
    for (let i = 0; i < 7; i++) {
      melodies.note(i);
      assert.ok(melodies.buffer.length <= 10);
    }
    for (let i = 6; i >= 0; i--) {
      melodies.note(i);
      assert.ok(melodies.buffer.length <= 10);
    }
  }

  assert.equal(recognized.length, 0);
});

test('BellMelodies ignores automatic playback notes as input, enforces 4s cooldown, and handles frame gaps/disable/reset', () => {
  const played = [];
  const recognized = [];
  let melodies;
  melodies = new BellMelodies({
    onNote: idx => {
      played.push(idx);
      // Feed automatic note back into .note() to verify it cannot self-trigger
      melodies.note(idx);
    },
    onRecognized: id => recognized.push(id),
  });

  // Trigger Twinkle
  for (const n of [0, 0, 4, 4, 5, 5, 4]) {
    melodies.note(n);
  }
  assert.deepEqual(recognized, ['twinkle']);

  // Huge frame gap (pause of 5.0s) emits only ONE due note and does not blast catch-up notes on subsequent 16ms frames
  melodies.update(5.0, true);
  assert.equal(played.length, 1);
  melodies.update(0.016, true);
  assert.equal(played.length, 1);
  melodies.update(0.016, true);
  assert.equal(played.length, 1);

  // Finish remaining notes of Twinkle continuation
  while (melodies.isPlaying) {
    melodies.update(0.32, true);
  }
  assert.equal(played.length, 35);
  assert.equal(recognized.length, 1);

  // During 4s cooldown after completion, human intro is ignored
  melodies.update(3.5, true);
  for (const n of [2, 2, 3, 4, 4, 3, 2, 1]) {
    melodies.note(n);
  }
  assert.equal(recognized.length, 1);

  // Once 4s cooldown completes, intro is recognized again
  melodies.update(0.6, true);
  for (const n of [2, 2, 3, 4, 4, 3, 2, 1]) {
    melodies.note(n);
  }
  assert.equal(recognized.length, 2);
  assert.equal(melodies.isPlaying, true);

  // Disabling via update(dt, false) immediately resets playback
  melodies.update(0.1, false);
  assert.equal(melodies.isPlaying, false);
  const countBefore = played.length;
  melodies.update(1.0, true);
  assert.equal(played.length, countBefore);
});

test('CounterInteractions gates melody input on melodyEnabled and continues playback after pointer release', () => {
  const camera = new PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const strikes = [];
  const sounds = [];
  const vendorCues = [];

  const bells = Array.from({ length: 7 }, (_, index) => ({
    index,
    strikeCooldown: 0,
    worldPos: new Vector3((index - 3) * 0.35, 0, 0),
  }));

  const world = {
    camera,
    bells,
    getBellBodyCenter(index, target) {
      return target.copy(bells[index].worldPos);
    },
    strikeBell(index, power) {
      strikes.push({ index, power });
    },
    vendorHead: {
      matrixWorld: new Matrix4(),
      updateWorldMatrix() {},
    },
    culturalScene: null,
  };

  const sound = {
    playBellNote(index, power, panX) {
      sounds.push({ index, power, panX });
    },
    speakVendor(cue) {
      vendorCues.push(cue);
    },
  };

  const counter = new CounterInteractions(world, sound);
  const width = 800;
  const height = 600;

  let strokeEpoch = 1;
  function crossBell(index, melodyEnabled) {
    const epoch = strokeEpoch++;
    const p = counter.project(bells[index].worldPos, width, height);
    counter.update(0.05, {
      active: true,
      empty: true,
      x: p.x,
      y: p.y - 24,
      epoch,
      width,
      height,
      melodyEnabled,
    });
    counter.update(0.05, {
      active: true,
      empty: true,
      x: p.x,
      y: p.y + 24,
      epoch,
      width,
      height,
      melodyEnabled,
    });
  }

  // With default melodyEnabled=false, crossings strike bells but do not feed melody buffer
  for (const n of [0, 0, 4, 4, 5, 5, 4]) {
    crossBell(n, undefined);
  }
  assert.equal(counter.melodies.isPlaying, false);

  // With melodyEnabled=true, crossing Twinkle intro triggers recognition
  for (const n of [0, 0, 4, 4, 5, 5, 4]) {
    crossBell(n, true);
  }
  assert.equal(counter.melodies.isPlaying, true);
  assert.equal(vendorCues.length, 1);

  const strikesBeforeAuto = strikes.length;
  // Finger released (active: false), but melodyEnabled remains true -> playback continues at 0.55 power
  counter.update(0.32, {
    active: false,
    empty: true,
    x: 0,
    y: 0,
    epoch: 2,
    width,
    height,
    melodyEnabled: true,
  });
  assert.equal(strikes.length, strikesBeforeAuto + 1);
  assert.deepEqual(strikes.at(-1), { index: 3, power: 0.55 });
  assert.equal(sounds.at(-1).index, 3);
  assert.equal(sounds.at(-1).power, 0.55);

  // reset() stops playback and clears buffer
  counter.reset();
  assert.equal(counter.melodies.isPlaying, false);
});
