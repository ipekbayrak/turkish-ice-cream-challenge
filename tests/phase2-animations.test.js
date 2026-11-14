import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { perfSceneFixture } from './perf-scene-stats.mjs';
import { SHOP_FLOOR_Y } from '../src/shop-interior.js';

test('vendor eye blink follows a smooth close-and-open curve instead of a 1-frame binary snap', () => {
  const w = perfSceneFixture();
  w.isBlinking = false;
  w.blinkTimer = 0.001;

  // Trigger blink start with a small frame step
  w.updateEnvironmentAnimations(1.0, 1 / 120, 0, 0, null, 0);
  assert.equal(w.isBlinking, true);
  const firstFrameY = w.eyes[0].scale.y;
  assert.ok(firstFrameY > 0.25 && firstFrameY < 0.99, `expected intermediate eyelid scale on first blink frame, got ${firstFrameY}`);

  let minScaleY = firstFrameY;
  const samples = [firstFrameY];
  for (let i = 0; i < 20 && w.isBlinking; i++) {
    w.updateEnvironmentAnimations(1.0 + (i + 2) / 120, 1 / 120, 0, 0, null, 0);
    samples.push(w.eyes[0].scale.y);
    minScaleY = Math.min(minScaleY, w.eyes[0].scale.y);
  }
  assert.ok(minScaleY <= 0.16, `expected blink closure to reach <= 0.16, got ${minScaleY}`);
  assert.equal(w.isBlinking, false);
  assert.equal(w.eyes[0].scale.y, 1);
});

test('vendor lip-sync jaw and mustache damp smoothly when voiceMouthOpen drops to zero', () => {
  const w = perfSceneFixture();
  for (let i = 0; i < 10; i++) {
    w.updateEnvironmentAnimations(i / 60, 1 / 60, 0, 0, null, 0.85);
  }
  const openJawY = w.jawGroup.position.y;
  assert.ok(openJawY < -0.08, `expected open jaw < -0.08, got ${openJawY}`);

  // Speech stops abruptly: jaw should damp rather than snap to -0.068 in 1 frame
  w.updateEnvironmentAnimations(0.2, 1 / 60, 0, 0, null, 0);
  const dampedJawY = w.jawGroup.position.y;
  assert.ok(dampedJawY < -0.070 && dampedJawY > openJawY, `expected smooth jaw damping on first silent frame, got ${dampedJawY}`);

  for (let i = 0; i < 30; i++) {
    w.updateEnvironmentAnimations(0.25 + i / 60, 1 / 60, 0, 0, null, 0);
  }
  assert.ok(Math.abs(w.jawGroup.position.y - -0.068) < 0.001, 'jaw settles back to rest');
});

test('vendor head rotation.y decays smoothly after vendorBellLook clears', () => {
  const w = perfSceneFixture();
  w.vendorBellLook = 0; // leftmost bell
  for (let i = 0; i < 25; i++) {
    w.updateEnvironmentAnimations(i / 60, 1 / 60, 0, 0, null, 0);
  }
  assert.ok(Math.abs(w.vendorHead.rotation.y) > 0.12, 'head turns toward outer bell');

  w.vendorBellLook = null;
  for (let i = 0; i < 45; i++) {
    w.updateEnvironmentAnimations(0.5 + i / 60, 1 / 60, 0, 0, null, 0);
  }
  assert.ok(Math.abs(w.vendorHead.rotation.y) < 0.01, `expected head rotation.y to decay near 0, got ${w.vendorHead.rotation.y}`);
});

test('spectators blend hands smoothly and differentiate gasp vs cheer reactions', () => {
  const w = perfSceneFixture();
  const sp = w.spectators[0];
  w.updateEnvironmentAnimations(0, 1 / 60, 0, 0, null, 0);
  const restLeft = sp.leftHand.position.clone();

  w.triggerSpectatorReaction('cheer');
  w.updateEnvironmentAnimations(1 / 60, 1 / 60, 0, 0, null, 0);
  const firstStepDist = sp.leftHand.position.distanceTo(restLeft);
  assert.ok(firstStepDist < 0.06, `spectator hand should blend smoothly, not teleport ${firstStepDist}m in 1 frame`);

  for (let i = 0; i < 20; i++) w.updateEnvironmentAnimations((i + 2) / 60, 1 / 60, 0, 0, null, 0);
  const cheerY = sp.leftHand.position.y;
  const cheerMouthY = sp.mouth.scale.y;

  w.triggerSpectatorReaction('gasp');
  for (let i = 0; i < 25; i++) w.updateEnvironmentAnimations(0.5 + i / 60, 1 / 60, 0, 0, null, 0);
  const gaspY = sp.leftHand.position.y;
  const gaspMouthY = sp.mouth.scale.y;

  assert.ok(gaspY > cheerY + 0.05, `expected gasp hands higher than cheer (${gaspY} vs ${cheerY})`);
  assert.ok(gaspMouthY > cheerMouthY + 0.1, `expected gasp O-mouth taller than cheer (${gaspMouthY} vs ${cheerMouthY})`);
});

test('forward-backward Z-axis paddle lunges induce pitch wobble on scoopStackGroup', () => {
  const w = perfSceneFixture();
  w.updateIceCreamScoops(3);
  w.prevConePos.copy(w.paddleGroup.position);
  for (let i = 0; i < 4; i++) {
    w.paddleGroup.position.z += 0.08;
    w.updateEnvironmentAnimations(0.1 + i / 60, 1 / 60, 0, 0, null, 0);
  }

  assert.ok(Math.abs(w.scoopStackGroup.rotation.x) > 0.01, `expected Z lunge to pitch scoopStackGroup, got ${w.scoopStackGroup.rotation.x}`);
});

test('VendorBody foot stepping adds smooth foot pitch and hip tilt while keeping soles above floor', () => {
  const w = perfSceneFixture();
  const body = w.vendorBody;
  let observedFootPitch = false;
  let observedHipTilt = false;

  for (let frame = 0; frame < 120; frame++) {
    const time = frame / 60;
    w.vendorTorso.position.x = Math.sin(time * 2.0) * 0.22;
    body.update(time, 1 / 60);
    for (const leg of body.legs) {
      if (Math.abs(leg.foot.rotation.x) > 0.01) observedFootPitch = true;
      const sole = new THREE.Box3().setFromObject(leg.foot.children[0]);
      assert.ok(sole.min.y >= SHOP_FLOOR_Y - 1e-8, `sole dipped below floor: ${sole.min.y}`);
    }
    if (Math.abs(body.hips.rotation.z) > 0.003) observedHipTilt = true;
  }

  assert.equal(observedFootPitch, true, 'stepping foot should pitch smoothly mid-step');
  assert.equal(observedHipTilt, true, 'hips should tilt subtly during step weight transfer');
});
