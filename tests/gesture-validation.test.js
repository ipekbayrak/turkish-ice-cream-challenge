import test from 'node:test';
import assert from 'node:assert/strict';
import { GestureValidation } from '../src/gesture-validation.js';

function fixture() {
  const check = new GestureValidation();
  const state = { isPointerDown: false, pointerEpoch: 0, cancelEpoch: 0, normX: 0, normY: 0, intentWorldPos: { x: 0, y: 1.22, z: 0.27 } };
  let scope = 'offer:0';
  return {
    check, state,
    tick(n = 1) { for (let i = 0; i < n; i++) check.update(state, 1 / 60, scope); },
    scope(value) { scope = value; this.tick(); },
    down() { state.isPointerDown = true; state.pointerEpoch++; this.tick(); },
    move(x, y = state.normY) { state.normX = x; state.normY = y; state.intentWorldPos = { x: x * 0.54, y: 1.22 + y * 0.36, z: 0.27 }; this.tick(); },
    holdReach(n = 8) { let valid = false; for (let i = 0; i < n; i++) { this.tick(); valid ||= check.reach('reach', 0.1, 0.28, 1 / 60); } return valid; },
  };
}

test('fresh deliberate reach works once but a stationary held hand cannot win the next offer', () => {
  const f = fixture(); f.tick(); f.down();
  assert.equal(f.holdReach(), true);
  f.scope('offer:1');
  assert.equal(f.holdReach(120), false);
  f.move(0.14);
  assert.equal(f.holdReach(), true);
});

test('tiny repeated jitter never accumulates into a reach or a cut', () => {
  const f = fixture(); f.tick(); f.down(); f.scope('offer:1');
  for (let i = 0; i < 600; i++) {
    f.move(i % 2 ? 0.012 : -0.012);
    assert.equal(f.check.reach('reach', 0.1, 0.28, 1 / 60), false);
    assert.equal(f.check.slice('cut'), false);
  }
});

test('hover and a cone-snapped visual hand provide no valid raw input', () => {
  const f = fixture(); f.tick();
  f.state.handWorldPos = { x: 0, y: 1.22, z: 0.27 };
  assert.equal(f.holdReach(), false);
  delete f.state.intentWorldPos;
  f.down();
  assert.equal(f.holdReach(), false);
});

test('horizontal cuts need real signed displacement, not stale velocity or diagonal/downward travel', () => {
  const f = fixture(); f.tick(); f.down();
  f.state.vx = 500; f.state.speed = 900;
  f.tick(8);
  assert.equal(f.check.slice('cut'), false);
  f.move(0.02, -0.30); f.tick(3);
  assert.equal(f.check.slice('cut'), false);
  f.move(0.27, -0.30);
  assert.equal(f.check.slice('cut'), true);
});

test('pull requires downward movement and does not accept release or sideways swipes', () => {
  const f = fixture(); f.tick(); f.down(); f.tick(3); f.move(0.3, 0);
  assert.equal(f.check.pull('pull'), false);
  f.state.isPointerDown = false; f.tick();
  assert.equal(f.check.pull('pull'), false);
  f.down(); f.tick(3); f.move(0.3, -0.24);
  assert.equal(f.check.pull('pull'), true);
});

test('a completed pull survives its animation wait but cancellation invalidates it', () => {
  const f = fixture(); f.tick(); f.down(); f.tick(3); f.move(0, -0.25);
  assert.equal(f.check.pull('pull'), true);
  f.tick(120);
  assert.equal(f.check.pull('pull'), true);
  f.state.isPointerDown = false; f.state.cancelEpoch++; f.tick();
  assert.equal(f.check.pull('pull'), false);
});

test('stationary center and subthreshold jitter cannot follow either left or right rhythm target', () => {
  const f = fixture(); f.tick(); f.down();
  for (const [index, side] of [-1, 1, -1].entries()) {
    f.scope(`beat:${index}:${side}`);
    const target = { x: side * 0.27, y: 1.22, z: 0.27 };
    for (let i = 0; i < 80; i++) {
      f.move(i % 2 ? 0.01 : -0.01);
      assert.equal(f.check.follow('beat', target, 1 / 60), false);
    }
  }
});

test('three genuine alternating beat follows require separate movement and stable arrival', () => {
  const f = fixture(); f.tick(); f.down();
  for (const [i, side] of [-1, 1, -1].entries()) {
    f.scope(`beat:${i}`);
    const target = { x: side * 0.27, y: 1.22, z: 0.27 };
    assert.equal(f.check.follow('beat', target, 1 / 60), false);
    f.move(side * 0.5);
    let accepted = false;
    for (let j = 0; j < 8; j++) { f.tick(); accepted ||= f.check.follow('beat', target, 1 / 60); }
    assert.equal(accepted, true);
    assert.equal(f.check.follow('beat', target, 1 / 60), false);
  }
});

test('rerouted target cannot reuse travel from an earlier request even when near the hand', () => {
  const f = fixture(); f.tick(); f.down(); f.scope('beat:1'); f.move(0.5); f.tick(6);
  f.scope('reroute:1');
  const nearHand = { x: 0.29, y: 1.22, z: 0.27 };
  for (let i = 0; i < 90; i++) { f.tick(); assert.equal(f.check.follow('beat', nearHand, 1 / 60), false); }
});

test('held prop needs a new deliberate return or discard, not the motion that acquired it', () => {
  const f = fixture(); f.tick(); f.down(); f.move(0.25); f.tick(8);
  assert.equal(f.holdReach(), true);
  f.scope('held:empty');
  assert.equal(f.holdReach(40), false);
  assert.equal(f.check.slice('discard'), false);
  f.tick(3); f.move(-0.10);
  assert.equal(f.check.slice('discard'), true);
});

test('canceled contact cannot complete a stored reach or a held-prop throw', () => {
  const f = fixture(); f.tick(); f.down(); f.tick(3); f.move(0.3);
  f.state.isPointerDown = false; f.state.cancelEpoch++; f.tick();
  assert.equal(f.check.slice('discard'), false);
  assert.equal(f.holdReach(), false);
});


test('many changing scopes never grant another fresh reach to one held contact', () => {
  const f = fixture(); f.tick(); f.down();
  assert.equal(f.holdReach(), true);
  for (let step = 1; step < 30; step++) {
    f.scope(`opportunity:${step}`);
    assert.equal(f.holdReach(30), false);
  }
});

test('hold interruption detects capture cancellation and replacement contacts', () => {
  const f = fixture(); f.tick(); f.down(); f.tick();
  assert.equal(f.check.interrupted, false);
  f.state.cancelEpoch++; f.state.pointerEpoch++; f.tick();
  assert.equal(f.check.interrupted, true);
});
