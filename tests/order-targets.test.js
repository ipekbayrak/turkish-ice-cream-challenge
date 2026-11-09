import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ICE_CREAM_FLAVORS } from '../src/flavors.js';
import { TubOrderView } from '../src/order-view.js';

const VIEWPORTS = [
  [320, 568],
  [390, 844],
  [844, 390],
  [1280, 720],
];

function fixture(width, height) {
  const aspect = width / height;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    aspect < 0.75 ? Math.max(64, Math.min(72, 62 + (0.65 - aspect) * 28)) : 54,
    aspect,
    0.05,
    100
  );
  const baseCamPos = new THREE.Vector3(0, aspect < 0.75 ? 1.5 : 1.52, aspect < 0.75 ? 1.12 : 1.05);
  camera.position.copy(baseCamPos);
  camera.lookAt(0, 1.28, -0.55);
  camera.updateMatrixWorld(true);

  const basin = new THREE.Group();
  basin.position.set(0, 0.94, -0.34);
  basin.rotation.x = 0.22;
  scene.add(basin);

  const canvas = { clientWidth: width, clientHeight: height };
  const world = { scene, camera, baseCamPos, canvas, tubMeshes: [], tubIceGroups: [] };

  for (const [index, x] of ICE_CREAM_FLAVORS.map((f) => f.xOffset).entries()) {
    const group = new THREE.Group();
    group.position.set(x, 0.018, 0.01);
    basin.add(group);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.089, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    mesh.position.y = 0.01;
    mesh.scale.set(1, 0.72, 1);
    mesh.userData.flavorIndex = index;
    group.add(mesh);

    world.tubMeshes.push(mesh);
    world.tubIceGroups.push({ group });
  }

  scene.updateMatrixWorld(true);
  const view = new TubOrderView(world);
  return { world, view, width, height };
}

test('projected tub centers and lower label region (y+25px) map to each flavor across all viewports', () => {
  for (const [width, height] of VIEWPORTS) {
    const f = fixture(width, height);
    f.view.begin();
    f.view.settleCamera();

    for (let index = 0; index < ICE_CREAM_FLAVORS.length; index++) {
      const target = f.view.projectedTub(index, width, height);
      assert.ok(target, `projectedTub(${index}) exists at ${width}x${height}`);

      // Projected tub center
      assert.equal(
        f.view.pick(target.x / width, target.y / height),
        index,
        `center pick for tub ${index} at ${width}x${height}`
      );

      // Lower label region y + 25px
      assert.equal(
        f.view.pick(target.x / width, (target.y + 25) / height),
        index,
        `label region (y+25px) pick for tub ${index} at ${width}x${height}`
      );
    }
  }
});

test('vendor face/upper air and air far below tubs return null across all viewports', () => {
  for (const [width, height] of VIEWPORTS) {
    const f = fixture(width, height);
    f.view.begin();
    f.view.settleCamera();

    for (let index = 0; index < ICE_CREAM_FLAVORS.length; index++) {
      const target = f.view.projectedTub(index, width, height);
      // Vendor face / upper air
      assert.equal(f.view.pick(target.x / width, 0.05), null, `upper air at ${width}x${height}`);
      // Air far below the tub and label band
      const farBelowY = Math.min(height - 2, target.y + target.radius * 0.52 + 60);
      assert.equal(
        f.view.pick(target.x / width, farBelowY / height),
        null,
        `air far below tub ${index} at ${width}x${height}`
      );
      assert.equal(f.view.pick(0.5, 0.96), null, `bottom air at ${width}x${height}`);
    }
  }
});

test('5px sticky boundary buffer absorbs slight jiggle but switches reliably beyond 5px', () => {
  for (const [width, height] of VIEWPORTS) {
    const f = fixture(width, height);
    f.view.begin();
    f.view.settleCamera();

    for (let i = 0; i < ICE_CREAM_FLAVORS.length - 1; i++) {
      const leftTub = f.view.projectedTub(i, width, height);
      const rightTub = f.view.projectedTub(i + 1, width, height);
      const boundaryX = (leftTub.x + rightTub.x) / 2;
      const yNorm = leftTub.y / height;

      // Focus left tub
      assert.equal(f.view.pick(leftTub.x / width, yNorm), i);

      // Jiggle up to +4.5px past the midpoint into right neighbor: stays on i
      assert.equal(
        f.view.pick((boundaryX + 4.5) / width, yNorm),
        i,
        `sticky +4.5px holds tub ${i} at ${width}x${height}`
      );

      // Cross beyond +5px (+5.5px) into right neighbor: switches to i + 1
      assert.equal(
        f.view.pick((boundaryX + 5.5) / width, yNorm),
        i + 1,
        `crossing +5.5px switches to tub ${i + 1} at ${width}x${height}`
      );

      // Jiggle back -4.5px toward left neighbor: stays on i + 1
      assert.equal(
        f.view.pick((boundaryX - 4.5) / width, yNorm),
        i + 1,
        `sticky -4.5px holds tub ${i + 1} at ${width}x${height}`
      );

      // Cross beyond -5px (-5.5px) toward left neighbor: switches back to i
      assert.equal(
        f.view.pick((boundaryX - 5.5) / width, yNorm),
        i,
        `crossing -5.5px switches back to tub ${i} at ${width}x${height}`
      );
    }
  }
});

test('begin resets previous pickIndex focus and pick alone creates no pending selections or flash', () => {
  for (const [width, height] of VIEWPORTS) {
    const f = fixture(width, height);
    let churnCalls = 0;
    f.world.churnTubIceCream = () => {
      churnCalls++;
    };

    // Inactive view never picks
    assert.equal(f.view.pick(0.5, 0.5), null);

    f.view.begin();
    f.view.settleCamera();

    const t1 = f.view.projectedTub(1, width, height);
    const t2 = f.view.projectedTub(2, width, height);
    const boundaryX = (t1.x + t2.x) / 2;
    const yNorm = t1.y / height;

    // Select tub 1 so pickIndex === 1
    assert.equal(f.view.pick(t1.x / width, yNorm), 1);
    assert.equal(f.view.pickIndex, 1);

    // No pending selections, flash, or side effects created just by view.pick
    assert.equal(f.view.flash, null);
    assert.equal(churnCalls, 0);
    assert.equal(f.world.selections, undefined);
    assert.equal(f.world.pendingSelection, undefined);

    // Restarting order view via begin() clears old pickIndex
    f.view.begin();
    f.view.settleCamera();
    assert.equal(f.view.pickIndex, null);

    // Point at boundaryX + 3px (inside tub 2's lane, which previously stuck to tub 1 only when pickIndex===1)
    assert.equal(f.view.pick((boundaryX + 3) / width, yNorm), 2);
  }
});
