import test from 'node:test';
import assert from 'node:assert/strict';
import { GestureValidation } from '../src/gesture-validation.js';

import {
  RelativeTouchController,
  TOUCH_GAIN,
  RETURN_DELAY_SECONDS,
  RETURN_DURATION_SECONDS,
} from '../src/relative-touch.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ~= ${expected}`);
const nearDelta = (actual, expected) => { near(actual.dx, expected.dx); near(actual.dy, expected.dy); };

test('constructor initializes expected default state and constants', () => {
  assert.equal(TOUCH_GAIN, 1.5);
  assert.equal(RETURN_DELAY_SECONDS, 0.04);
  assert.equal(RETURN_DURATION_SECONDS, 0.26);
  assert.equal(RelativeTouchController.TOUCH_GAIN, 1.5);
  assert.equal(RelativeTouchController.RETURN_DELAY_SECONDS, 0.04);
  assert.equal(RelativeTouchController.RETURN_DURATION_SECONDS, 0.26);

  const ctrl = new RelativeTouchController();
  assert.equal(ctrl.width, 1);
  assert.equal(ctrl.height, 1);
  assert.equal(ctrl.initialized, false);
  assert.equal(ctrl.active, false);
  near(ctrl.x, 0);
  near(ctrl.y, 0);
  assert.equal(ctrl.homeX, 0);
  assert.equal(ctrl.homeY, 0);
  assert.equal(ctrl.returning, false);
  assert.equal(ctrl.atHome, true);
});

test('first press far away from seed never jumps to raw finger and sets home from clamped seed', () => {
  const ctrl = new RelativeTouchController();
  ctrl.configure(400, 800);

  // Raw finger is at bottom-right (360, 740), while rendered fingertip seed is at center (200, 420)
  ctrl.press(360, 740, { x: 200, y: 420 });

  assert.equal(ctrl.initialized, true);
  assert.equal(ctrl.active, true);
  assert.equal(ctrl.returning, false);
  assert.equal(ctrl.atHome, false);
  near(ctrl.x, 200);
  near(ctrl.y, 420);
  assert.equal(ctrl.homeX, 200);
  assert.equal(ctrl.homeY, 420);

  // Moving finger by (-15, +10) applies TOUCH_GAIN (1.5) on both axes relative to seed
  const delta = ctrl.move(345, 750);
  nearDelta(delta, { dx: -22.5, dy: 15 });
  near(ctrl.x, 177.5);
  near(ctrl.y, 435);
  assert.equal(ctrl.homeX, 200);
  assert.equal(ctrl.homeY, 420);
});

test('multiple leftward drags with lifts and different raw press origins accumulate cursor movement', () => {
  const ctrl = new RelativeTouchController();
  ctrl.configure(400, 800);

  // Stroke 1: press at raw (300, 500) with seed (220, 400), drag left by 60px raw (-90px scaled)
  ctrl.press(300, 500, { x: 220, y: 400 });
  nearDelta(ctrl.move(240, 500), { dx: -90, dy: 0 });
  near(ctrl.x, 130);
  ctrl.release();

  // Lift & reposition finger back to right side (320, 510) before 0.04s return delay expires;
  // parent passes current visual fingertip position as seed
  ctrl.tick(0.02);
  ctrl.press(320, 510, { x: ctrl.x, y: ctrl.y });
  near(ctrl.x, 130);
  near(ctrl.y, 400);
  assert.equal(ctrl.homeX, 220);
  assert.equal(ctrl.homeY, 400);

  // Stroke 2: drag left by another 48px raw (-72px scaled)
  nearDelta(ctrl.move(272, 510), { dx: -72, dy: 0 });
  near(ctrl.x, 58);
  ctrl.release();

  // Stroke 3 requests another 60px; the cursor stops at the 12px boundary.
  ctrl.press(350, 490, { x: ctrl.x, y: ctrl.y });
  nearDelta(ctrl.move(310, 490), { dx: -46, dy: 0 });
  near(ctrl.x, 12);
  assert.equal(ctrl.homeX, 220);
});

test('0.04s release holds, later smooth return interpolates, and reaches exact completion at 0.30s total', () => {
  const ctrl = new RelativeTouchController();
  ctrl.configure(400, 800);

  ctrl.press(200, 400, { x: 200, y: 400 });
  ctrl.move(120, 320); // -80 raw * 1.5 = -120 -> moves to (80, 280), home remains (200, 400)
  ctrl.release();

  assert.equal(ctrl.active, false);
  assert.equal(ctrl.returning, false);
  assert.equal(ctrl.atHome, false);

  // Repeated release must not restart inactivity timer
  ctrl.tick(0.02);
  ctrl.release();
  ctrl.tick(0.02); // total 0.04s <= 0.04s hold delay

  near(ctrl.x, 80);
  near(ctrl.y, 280);
  assert.equal(ctrl.returning, false);
  assert.equal(ctrl.atHome, false);

  // Advance past 0.04s delay to midpoint of 0.26s return (0.04 + 0.13 = 0.17s total)
  ctrl.tick(0.13);
  assert.equal(ctrl.returning, true);
  assert.equal(ctrl.atHome, false);
  // At t = 0.5, cubic smoothstep alpha = 0.5
  assert.ok(Math.abs(ctrl.x - 140) < 1e-6);
  assert.ok(Math.abs(ctrl.y - 340) < 1e-6);

  // Complete remaining 0.13s of return duration (0.30s total after release)
  ctrl.tick(0.13);
  assert.equal(ctrl.returning, false);
  assert.equal(ctrl.atHome, true);
  near(ctrl.x, 200);
  near(ctrl.y, 400);

  // Large dt from another release also snaps directly to exact home
  ctrl.press(200, 400, { x: ctrl.x, y: ctrl.y });
  ctrl.move(140, 360);
  ctrl.release();
  ctrl.tick(10);
  assert.equal(ctrl.returning, false);
  assert.equal(ctrl.atHome, true);
  near(ctrl.x, 200);
  near(ctrl.y, 400);
});

test('regrab midway from supplied current visual seed cancels return and continues seamlessly', () => {
  const ctrl = new RelativeTouchController();
  ctrl.configure(400, 800);

  ctrl.press(200, 400, { x: 200, y: 400 });
  ctrl.move(120, 320); // moves to (80, 280)
  ctrl.release();

  // Enter return transit midway (0.04s delay + 0.13s transit = 0.17s)
  ctrl.tick(0.17);
  assert.equal(ctrl.returning, true);
  const midX = ctrl.x;
  const midY = ctrl.y;
  assert.ok(midX > 80 && midX < 200);
  assert.ok(midY > 280 && midY < 400);

  // Regrab at a completely different physical location using current visual position as seed
  ctrl.press(330, 620, { x: midX, y: midY });
  assert.equal(ctrl.active, true);
  assert.equal(ctrl.returning, false);
  assert.equal(ctrl.atHome, false);
  near(ctrl.x, midX);
  near(ctrl.y, midY);
  assert.equal(ctrl.homeX, 200);
  assert.equal(ctrl.homeY, 400);

  // Continue dragging from regrabbed visual seed with 1.5 gain
  const delta = ctrl.move(310, 636);
  nearDelta(delta, { dx: -30, dy: 24 });
  assert.ok(Math.abs(ctrl.x - (midX - 30)) < 1e-6);
  assert.ok(Math.abs(ctrl.y - (midY + 24)) < 1e-6);
});

test('stationary held contact never auto-returns', () => {
  const ctrl = new RelativeTouchController();
  ctrl.configure(400, 800);

  ctrl.press(250, 500, { x: 200, y: 400 });
  ctrl.move(140, 330);

  // Hold stationary for several seconds while active
  ctrl.tick(0.5);
  ctrl.tick(1.0);
  ctrl.tick(5.0);

  assert.equal(ctrl.active, true);
  assert.equal(ctrl.returning, false);
  assert.equal(ctrl.atHome, false);
  near(ctrl.x, 35); // 200 + (140 - 250) * 1.5
  near(ctrl.y, 145); // 400 + (330 - 500) * 1.5
});

test('edge clamps with immediate reversal when dragging back', () => {
  const ctrl = new RelativeTouchController();
  ctrl.configure(400, 800); // margin is min(12, 20) = 12 -> bounds [12, 388] x [12, 788]

  ctrl.press(200, 400, { x: 50, y: 50 });

  // Drag 100px left past the left margin (50 - 150 = -100 -> clamped to 12, applied dx = -38)
  const intoWall = ctrl.move(100, 400);
  assert.deepEqual(intoWall, { dx: -38, dy: 0 });
  near(ctrl.x, 12);

  // Dragging further past wall produces 0 applied delta but updates raw anchor to 60
  const deeperIntoWall = ctrl.move(60, 400);
  assert.deepEqual(deeperIntoWall, { dx: 0, dy: 0 });
  near(ctrl.x, 12);

  // Reversing right by +16px raw ( +24px scaled) from raw=60 to raw=76 responds immediately without deadzone
  const reverse = ctrl.move(76, 400);
  nearDelta(reverse, { dx: 24, dy: 0 });
  near(ctrl.x, 36);

  // Small viewport uses 5% margin when smaller than 12
  const smallCtrl = new RelativeTouchController();
  smallCtrl.configure(100, 80); // margins: x = 5, y = 4 -> bounds [5, 95] x [4, 76]
  smallCtrl.press(50, 40, { x: 0, y: 100 });
  assert.equal(smallCtrl.x, 5);
  assert.equal(smallCtrl.y, 76);
});

test('invalid coordinates and non-positive/non-finite dt are ignored without state corruption', () => {
  const ctrl = new RelativeTouchController();
  ctrl.configure(400, 800);
  ctrl.configure(NaN, 500);
  ctrl.configure(0, 500);
  ctrl.configure(300, -10);
  assert.equal(ctrl.width, 400);
  assert.equal(ctrl.height, 800);

  // Move while inactive returns zeros
  nearDelta(ctrl.move(100, 100), { dx: 0, dy: 0 });

  // Invalid initial press is ignored
  ctrl.press(NaN, 100, { x: 200, y: 400 });
  ctrl.press(100, 100, { x: Infinity, y: 400 });
  ctrl.press(100, 100, null);
  assert.equal(ctrl.initialized, false);
  assert.equal(ctrl.active, false);

  // Valid press
  ctrl.press(200, 400, { x: 200, y: 400 });
  nearDelta(ctrl.move(180, 370), { dx: -30, dy: -45 });

  // Invalid move while active does not corrupt coordinates or raw anchor
  nearDelta(ctrl.move(NaN, 370), { dx: 0, dy: 0 });
  nearDelta(ctrl.move(180, undefined), { dx: 0, dy: 0 });
  near(ctrl.x, 170);
  near(ctrl.y, 355);

  // Subsequent valid move computes delta from last valid raw anchor (180, 370)
  nearDelta(ctrl.move(170, 360), { dx: -15, dy: -15 });
  near(ctrl.x, 155);
  near(ctrl.y, 340);

  // Release and test invalid dt values
  ctrl.release();
  ctrl.tick(0);
  ctrl.tick(-0.5);
  ctrl.tick(NaN);
  ctrl.tick(Infinity);
  near(ctrl.x, 155);
  near(ctrl.y, 340);
  assert.equal(ctrl.returning, false);
  assert.equal(ctrl.atHome, false);
});

test('reset and resize preserve and rescale state appropriately', () => {
  const ctrl = new RelativeTouchController();
  ctrl.configure(400, 800);

  ctrl.press(200, 400, { x: 200, y: 400 });
  ctrl.move(120, 240); // moves by (-120, -240) to (80, 160)
  ctrl.release();

  // Resize while initialized rescales x, y, homeX, homeY, and returnStartX/Y proportionally
  ctrl.configure(800, 400);
  assert.equal(ctrl.width, 800);
  assert.equal(ctrl.height, 400);
  near(ctrl.x, 160);
  near(ctrl.y, 80);
  assert.equal(ctrl.homeX, 400);
  assert.equal(ctrl.homeY, 200);

  // Return transit after resize uses rescaled return origin and home
  ctrl.tick(0.04 + 0.13);
  assert.equal(ctrl.returning, true);
  assert.ok(Math.abs(ctrl.x - 280) < 1e-6);
  assert.ok(Math.abs(ctrl.y - 140) < 1e-6);

  // Reset clears initialized/active/return flags and timers while preserving configured dimensions
  ctrl.reset();
  assert.equal(ctrl.width, 800);
  assert.equal(ctrl.height, 400);
  assert.equal(ctrl.initialized, false);
  assert.equal(ctrl.active, false);
  assert.equal(ctrl.returning, false);
  assert.equal(ctrl.atHome, true);
  near(ctrl.x, 0);
  near(ctrl.y, 0);
  assert.equal(ctrl.homeX, 0);
  assert.equal(ctrl.homeY, 0);

  // Next press after reset chooses a new home
  ctrl.press(100, 100, { x: 520, y: 260 });
  assert.equal(ctrl.initialized, true);
  assert.equal(ctrl.active, true);
  assert.equal(ctrl.homeX, 520);
  assert.equal(ctrl.homeY, 260);
  near(ctrl.x, 520);
  near(ctrl.y, 260);
});

test('return animation and a repositioned finger cannot manufacture a cut gesture',()=>{
  const control=new RelativeTouchController();control.configure(400,800);
  const validation=new GestureValidation();
  const state={isPointerDown:false,pointerEpoch:0,cancelEpoch:0,normX:0,normY:0,intentWorldPos:{x:0,y:1.2,z:.26}};
  const sample=()=>{validation.update(state,.02,'cut');return validation.slice('cut');};
  const userSample=()=>{state.normX=control.x/200-1;state.normY=1-control.y/400;return sample();};
  control.press(380,750,{x:200,y:400});state.isPointerDown=true;state.pointerEpoch++;assert.equal(userSample(),false);
  control.move(380-36/TOUCH_GAIN,750);assert.equal(userSample(),false); // A 36px virtual drag stays below the 40px cut threshold at the configured sensitivity.
  control.release();state.isPointerDown=false;
  for(let i=0;i<75;i++){control.tick(.02);assert.equal(sample(),false);}
  assert.equal(control.atHome,true);
  control.press(10,760,{x:control.x,y:control.y});state.isPointerDown=true;state.pointerEpoch++;
  assert.equal(userSample(),false,'new raw position is not a swipe');
  for(let i=0;i<20;i++)assert.equal(sample(),false,'stationary press remains stationary');
  control.move(70,760);assert.equal(userSample(),true,'a real deliberate drag still cuts');
});

test('physical drag distance is separate from cursor gain, return, and new-contact placement',()=>{
  const control=new RelativeTouchController();control.configure(400,800);
  control.press(350,750,{x:200,y:400});
  const delta=control.move(310,720); // raw (-40, -30) -> physical 50px, virtual (-60, -45) -> 75px
  nearDelta(delta,{dx:-60,dy:-45});
  assert.equal(control.travel,50,'travel records physical raw distance rather than gain-amplified cursor delta');
  control.release();control.tick(2);assert.equal(control.travel,50,'automatic return adds no tap/drag evidence');
  control.press(20,700,{x:control.x,y:control.y});assert.equal(control.travel,0,'repositioning starts a new contact');
  control.reset();assert.equal(control.travel,0);
});
