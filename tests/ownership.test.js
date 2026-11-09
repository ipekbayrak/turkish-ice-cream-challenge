import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GameWorld } from '../src/world.js';
import { TrickDirector } from '../src/tricks.js';

test('AFK vendor handoff cannot steal a player-owned cone, but explicit round reset can restore it', () => {
  const world = Object.create(GameWorld.prototype);
  world.scene = new THREE.Scene();
  world.heldSocket = new THREE.Group();
  world.paddleGroup = new THREE.Group();
  world.lArmRig = { handGroup: new THREE.Group() };
  world.conePivot = new THREE.Group();
  world.scene.add(world.heldSocket, world.paddleGroup, world.lArmRig.handGroup);
  world.heldSocket.add(world.conePivot);
  world.conePivot.position.set(0, 0.05, 0);
  const original = world.conePivot;
  for (const enabled of [false, true, false, true]) {
    world.setConeInVendorHand(enabled);
    assert.equal(original.parent, world.heldSocket);
    assert.equal(world.conePivot, original);
  }
  TrickDirector.prototype._reattachConeToPaddle.call({ world });
  assert.equal(original.parent, world.paddleGroup);
  assert.deepEqual(original.position.toArray(), [0, 0.02, 0]);
  world.setConeInVendorHand(true);
  assert.equal(original.parent, world.lArmRig.handGroup);
});
