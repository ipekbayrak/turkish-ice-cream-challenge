import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GameWorld } from '../src/world.js';
import { SpringVec3 } from '../src/physics.js';
import { AngularMotion } from '../src/angular-motion.js';

function handFixture() {
  const world = Object.create(GameWorld.prototype);
  world.scene = new THREE.Scene();
  world.waffleTexture = world.outerWaffleTexture = new THREE.Texture();
  world.conePivot = new THREE.Group();
  world.handSpring = new SpringVec3(0.22, 1.08, 0.62, 135, 18);
  world._buildTouristPOVHand();
  return world;
}
const position = (object) => object.getWorldPosition(new THREE.Vector3());
const segmentEnd = (mesh, length) => mesh.localToWorld(new THREE.Vector3(0, length / 2, 0));
const presentationChannels = () => {
  const world = Object.create(GameWorld.prototype);
  world.resetPaddleOrientation();
  return world.paddleAngularMotion;
};

test('tourist wrist, forearm and rounded palm stay connected at extreme reach and full curl', () => {
  const w = handFixture();
  for (const target of [new THREE.Vector3(-0.5, 1.7, 0.2), new THREE.Vector3(0.5, 0.9, 0.64), new THREE.Vector3(0, 1.24, 0.3)]) {
    for (const curl of [0, 0.5, 1]) {
      for (let i = 0; i < 24; i++) w.updateTouristHand(target, curl, 1, 1 / 60);
      w.scene.updateMatrixWorld(true);
      const wrist = position(w.touristWrist);
      assert.ok(wrist.distanceTo(position(w.palmGroup)) < 1e-10, 'wrist and palm must share their pivot');
      const insidePalm = w.touristPalm.worldToLocal(wrist.clone());
      assert.ok(insidePalm.length() < 0.052, 'wrist center remains inside palm surface');
      const armTop = w.touristForearm.localToWorld(new THREE.Vector3(0, w.touristForearm.geometry.parameters.height / 2, 0));
      assert.ok(armTop.distanceTo(wrist) < 0.036, 'forearm terminates inside wrist');
      assert.equal(w.touristPalm.material, w.touristWrist.material);
      assert.equal(w.touristPalm.material, w.touristForearm.material);
    }
  }
});

test('all finger and thumb joints remain joined through open, partial and closed poses', () => {
  const w = handFixture();
  for (const fps of [30, 60, 120]) {
    for (const curl of [0, 0.4, 1]) {
      for (let i = 0; i < fps / 2; i++) w.updateTouristHand(new THREE.Vector3(0.3, 1.5, 0.24), curl, 0.5, 1 / fps);
      w.scene.updateMatrixWorld(true);
      for (const finger of w.fingers) {
        assert.ok(segmentEnd(finger.proximal, finger.lengths[0]).distanceTo(position(finger.middle)) < 1e-9);
        assert.ok(segmentEnd(finger.intermediate, finger.lengths[1]).distanceTo(position(finger.tip)) < 1e-9);
        const baseInPalm = w.touristPalm.worldToLocal(position(finger.base));
        if (baseInPalm.length() > 0.052) {
          const surface = w.touristPalm.localToWorld(baseInPalm.clone().setLength(0.052));
          assert.ok(surface.distanceTo(position(finger.base)) < 0.012, 'finger knuckle overlaps palm');
        }
        assert.equal(finger.proximal.material, w.touristPalm.material);
      }
      assert.ok(segmentEnd(w.thumbProximal, 0.032).distanceTo(position(w.thumbJoint)) < 1e-9);
      assert.equal(w.thumbDistal.material, w.touristPalm.material);
    }
  }
});

test('continuous shaft revolutions retain authored turns identically at 30/60/120 Hz', () => {
  const results = [30, 60, 120].map((fps) => {
    const channel = new AngularMotion();
    channel.step(0, 1 / fps);
    for (let i = 1; i <= fps * 2; i++) channel.step(15 * i / fps, 1 / fps);
    return channel.value;
  });
  assert.ok(results[0] > Math.PI * 8, 'four complete displayed revolutions must survive');
  assert.ok(Math.max(...results) - Math.min(...results) < 1e-9);
});

test('half-turn cue has visible intermediate poses and bounded, frame-independent speed', () => {
  const results = [30, 60, 120].map((fps) => {
    const channel = presentationChannels().flip;
    channel.step(0, 1 / fps);
    let previous = channel.value;
    let intermediateCount = 0;
    for (let i = 0; i < fps / 2; i++) {
      const value = channel.step(Math.PI, 1 / fps);
      assert.ok(Math.abs(value - previous) <= 8 / fps + 1e-9);
      if (value > 0.15 && value < Math.PI - 0.15) intermediateCount++;
      if (i + 1 === fps / 5) assert.ok(value < Math.PI * 0.6, 'half-turn remains visibly in progress at 200 ms');
      previous = value;
    }
    assert.ok(intermediateCount >= 8);
    assert.ok(channel.value > Math.PI - 0.05, 'half-turn settles near its authored pose by 500 ms');
    return channel.value;
  });
  assert.ok(Math.max(...results) - Math.min(...results) < 1e-9);
});

test('production shaft cap preserves normal authored revolutions and clears long fast-spin lag on reset', () => {
  const normal = [30, 60, 120].map((fps) => {
    const channel = presentationChannels().shaft;
    channel.step(0, 1 / fps);
    for (let i = 1; i <= fps * 2; i++) channel.step(9 * i / fps, 1 / fps);
    return channel.value;
  });
  assert.ok(normal[0] > Math.PI * 4, 'normal 9 rad/s motion retains complete turns');
  assert.ok(Math.max(...normal) - Math.min(...normal) < 1e-9);

  for (const fps of [30, 60, 120]) {
    const channel = presentationChannels().shaft;
    let previous = 0;
    for (let i = 0; i <= fps * 40; i++) {
      const value = channel.step(15 * i / fps, 1 / fps);
      assert.ok(Math.abs(value - previous) <= 14 / fps + 1e-9);
      previous = value;
    }
    const beforeReset = channel.value;
    channel.step(0, 1 / fps);
    assert.ok(Math.abs(channel.value - beforeReset) <= 14 / fps + 1e-9);
    assert.ok(Math.abs(channel.target - channel.value) <= Math.PI);
    for (let i = 0; i < fps * 0.6; i++) channel.step(0, 1 / fps);
    assert.ok(Math.abs(Math.sin(channel.value)) < 0.002, 'reset settles within 600 ms despite long authored timer');
  }
});

test('production pitch presentation cannot skip intermediate tilt poses', () => {
  const channel = presentationChannels().pitch;
  channel.step(0, 1 / 60);
  let previous = 0;
  for (let i = 0; i < 30; i++) {
    const value = channel.step(0.95, 1 / 60);
    assert.ok(Math.abs(value - previous) <= 6 / 60 + 1e-9);
    previous = value;
  }
  assert.ok(Math.abs(channel.value - 0.95) < 0.001);
});

test('large absolute timer values and resets never cause many-turn catch-up or a visual jump', () => {
  const channel = new AngularMotion();
  let previous = channel.value;
  for (let i = 0; i < 60; i++) {
    const value = channel.step(12000 + i / 60 * 1.4, 1 / 60);
    assert.ok(Math.abs(value - previous) <= 26 / 60 + 1e-9);
    previous = value;
  }
  const before = channel.value;
  channel.step(0, 1 / 60);
  assert.ok(Math.abs(channel.value - before) <= 26 / 60 + 1e-9);
  for (let i = 0; i < 30; i++) channel.step(0, 1 / 60);
  assert.ok(Math.abs(Math.sin(channel.value)) < 0.002);
  assert.ok(Math.abs(channel.value) < Math.PI * 2, 'no stale revolution backlog');
});
