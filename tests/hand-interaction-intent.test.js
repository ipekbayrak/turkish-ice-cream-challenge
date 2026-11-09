import test from 'node:test';
import assert from 'node:assert/strict';
import { HandInteractionIntent } from '../src/hand-interaction-intent.js';

function stepMany(intent, count, dt, state) {
  let last = null;
  for (let i = 0; i < count; i++) {
    last = intent.update(dt, state);
  }
  return last;
}

test('constructor initializes expected state and update clamps dt to <= 0.1s', () => {
  const intent = new HandInteractionIntent();
  assert.equal(intent.time, 0);
  assert.equal(intent.targetId, null);
  assert.equal(intent.progress, 0);
  assert.equal(intent.hover, null);
  assert.equal(intent.previousContact, null);
  assert.equal(intent.fired, false);
  assert.ok(intent.bellCooldown instanceof Map);
  assert.equal(intent.bellCooldown.size, 0);
  assert.equal(intent.faceUntil, 0);

  // Non-positive or non-finite dt does not advance clock
  intent.update(0);
  intent.update(-0.05);
  intent.update(NaN);
  intent.update(Infinity);
  assert.equal(intent.time, 0);

  // Oversized dt is clamped to 0.1s
  const detail = { id: 'certificate', kind: 'detail' };
  intent.update(0.8, { active: true, empty: true, moved: false, target: detail });
  assert.ok(Math.abs(intent.time - 0.1) < 1e-9);
  assert.ok(Math.abs(intent.progress - 0.1 / 1.5) < 1e-9);
});

test('detail dwell does not fire at 1.49s, emits once at 1.50s, and stays locked while held', () => {
  const intent = new HandInteractionIntent();
  const poster = { id: 'poster', kind: 'detail', label: 'Vintage Menu' };
  const state = { active: true, empty: true, moved: false, target: poster };

  for (let i = 0; i < 14; i++) {
    assert.equal(intent.update(0.1, state), null);
  }
  // At 1.49s: still below 1.5s threshold
  assert.equal(intent.update(0.09, state), null);
  assert.equal(intent.fired, false);
  assert.equal(intent.hover, poster);
  assert.equal(intent.targetId, 'poster');
  assert.ok(Math.abs(intent.progress - 1.49 / 1.5) < 1e-9);

  // At 1.50s: emits inspect once
  const event = intent.update(0.01, state);
  assert.deepEqual(event, { type: 'inspect', target: poster });
  assert.equal(intent.fired, true);
  assert.equal(intent.progress, 1);

  // Continued stationary hold never re-emits
  for (let i = 0; i < 10; i++) {
    assert.equal(intent.update(0.1, state), null);
    assert.equal(intent.fired, true);
    assert.equal(intent.progress, 1);
  }
});

test('detail cancellation and target switch reset dwell progress and fired lock', () => {
  const intent = new HandInteractionIntent();
  const first = { id: 'fez-stand', kind: 'detail' };
  const second = { id: 'spice-jar', kind: 'detail' };

  // Build 1.2s dwell on first target, then switch directly to second target
  stepMany(intent, 12, 0.1, { active: true, empty: true, moved: true, target: first });
  assert.ok(Math.abs(intent.progress - 1.2 / 1.5) < 1e-9);

  assert.equal(intent.update(0.1, { active: true, empty: true, moved: true, target: second }), null);
  assert.equal(intent.targetId, 'spice-jar');
  assert.equal(intent.hover, second);
  assert.equal(intent.fired, false);
  assert.ok(Math.abs(intent.progress - 0.1 / 1.5) < 1e-9);

  // Complete remaining 1.4s on second target
  stepMany(intent, 13, 0.1, { active: true, empty: true, moved: false, target: second });
  assert.equal(intent.fired, false);
  assert.deepEqual(
    intent.update(0.1, { active: true, empty: true, moved: false, target: second }),
    { type: 'inspect', target: second }
  );

  // Leaving target clears hover/progress/fired/previousContact so re-entry requires full 1.5s dwell
  assert.equal(intent.update(0.1, { active: true, empty: true, moved: true, target: null }), null);
  assert.equal(intent.targetId, null);
  assert.equal(intent.hover, null);
  assert.equal(intent.progress, 0);
  assert.equal(intent.fired, false);
  assert.equal(intent.previousContact, null);

  stepMany(intent, 14, 0.1, { active: true, empty: true, moved: false, target: second });
  assert.equal(intent.fired, false);
  assert.deepEqual(
    intent.update(0.1, { active: true, empty: true, moved: false, target: second }),
    { type: 'inspect', target: second }
  );
});

test('held item or inactive automatic return never triggers detail, bell, or face events', () => {
  const intent = new HandInteractionIntent();
  const detail = { id: 'trophy', kind: 'detail' };
  const bell = { id: 'counter-bell', kind: 'bell' };
  const face = { id: 'nose', kind: 'face' };

  // Automatic return (active: false) over bell, face, and detail
  assert.equal(intent.update(0.1, { active: false, empty: true, moved: true, target: bell }), null);
  assert.equal(intent.update(0.1, { active: false, empty: true, moved: true, target: face }), null);
  for (let i = 0; i < 20; i++) {
    assert.equal(intent.update(0.1, { active: false, empty: true, moved: false, target: detail }), null);
  }
  assert.equal(intent.progress, 0);
  assert.equal(intent.previousContact, null);

  // Active hand holding an item (empty: false) over bell, face, and detail
  assert.equal(intent.update(0.1, { active: true, empty: false, moved: true, target: bell }), null);
  assert.equal(intent.update(0.1, { active: true, empty: false, moved: true, target: face }), null);
  for (let i = 0; i < 20; i++) {
    assert.equal(intent.update(0.1, { active: true, empty: false, moved: false, target: detail }), null);
  }
  assert.equal(intent.progress, 0);
  assert.equal(intent.hover, null);
});

test('bell requires moving new contact and enforces per-id 0.30s cooldown across lifts', () => {
  const intent = new HandInteractionIntent();
  const bellA = { id: 'bell-left', kind: 'bell' };
  const bellB = { id: 'bell-right', kind: 'bell' };

  // Motionless press on bell does not ring and records contact
  assert.equal(intent.update(0.1, { active: true, empty: true, moved: false, target: bellA }), null);
  assert.equal(intent.previousContact, 'bell-left');
  assert.equal(intent.progress, 0);

  // Leave and re-enter with movement -> rings bellA and sets 0.30s cooldown
  intent.update(0.1, { active: true, empty: true, moved: true, target: null });
  const ring1 = intent.update(0.1, { active: true, empty: true, moved: true, target: bellA });
  assert.deepEqual(ring1, { type: 'bell', target: bellA });
  assert.equal(intent.progress, 0);

  // Continuing to move inside same bell without leaving does not re-ring
  assert.equal(intent.update(0.1, { active: true, empty: true, moved: true, target: bellA }), null);

  // Separate bell id can ring immediately during bellA's cooldown
  assert.deepEqual(
    intent.update(0.05, { active: true, empty: true, moved: true, target: bellB }),
    { type: 'bell', target: bellB }
  );

  // Re-entering bellA at +0.29s since ring1 (0.1 + 0.05 + 0.1 + 0.04 = 0.29s) is blocked by cooldown
  intent.reset(); // lift cannot bypass cooldown
  intent.update(0.1, { active: false, empty: true, moved: false, target: null });
  assert.equal(intent.update(0.04, { active: true, empty: true, moved: true, target: bellA }), null);

  // Leave and re-enter after 0.30s cooldown has elapsed: reactivating without movement still does not ring
  intent.update(0.05, { active: false, empty: true, moved: false, target: null });
  assert.equal(intent.update(0.05, { active: true, empty: true, moved: false, target: bellA }), null);

  // Leave and re-enter with movement after cooldown -> rings again
  intent.update(0.05, { active: true, empty: true, moved: true, target: null });
  assert.deepEqual(
    intent.update(0.05, { active: true, empty: true, moved: true, target: bellA }),
    { type: 'bell', target: bellA }
  );
});

test('facial poke requires moving new contact and shares global 2.0s cooldown across nose and eyes', () => {
  const intent = new HandInteractionIntent();
  const nose = { id: 'nose', kind: 'face' };
  const leftEye = { id: 'eye-left', kind: 'face' };
  const rightEye = { id: 'eye-right', kind: 'face' };

  // Motionless contact on nose does not poke
  assert.equal(intent.update(0.1, { active: true, empty: true, moved: false, target: nose }), null);
  intent.update(0.1, { active: true, empty: true, moved: true, target: null });

  // Moving entry into nose pokes and starts 2.0s global face cooldown
  assert.deepEqual(
    intent.update(0.1, { active: true, empty: true, moved: true, target: nose }),
    { type: 'poke', target: nose }
  );
  assert.equal(intent.progress, 0);

  // Staying on nose or sweeping onto eyes within 2.0s does not spam
  assert.equal(intent.update(0.1, { active: true, empty: true, moved: true, target: nose }), null);
  assert.equal(intent.update(0.1, { active: true, empty: true, moved: true, target: leftEye }), null);
  assert.equal(intent.update(0.1, { active: true, empty: true, moved: true, target: rightEye }), null);

  // Lifting finger (reset) does not clear faceUntil cooldown; at 1.99s elapsed since poke, still blocked
  intent.reset();
  stepMany(intent, 16, 0.1, { active: false, empty: true, moved: false, target: null }); // +1.6s (total 1.9s)
  assert.equal(intent.update(0.09, { active: true, empty: true, moved: true, target: leftEye }), null); // 1.99s

  // Leave and re-enter at 2.00s elapsed since first poke -> succeeds on eye
  intent.update(0.01, { active: true, empty: true, moved: true, target: null }); // 2.00s
  assert.deepEqual(
    intent.update(0.05, { active: true, empty: true, moved: true, target: leftEye }),
    { type: 'poke', target: leftEye }
  );
});
