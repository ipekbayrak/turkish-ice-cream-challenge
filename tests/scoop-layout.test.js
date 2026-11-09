import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SCOOPS } from '../src/venues.js';
import { CLASSIC_SCOOP_LAYOUT, LARGE_SCOOP_LAYOUT } from '../src/scoop-layout.js';

const EXPECTED_CLASSIC = [
  [0, .045, 0, .066],
  [.012, .115, .008, .062],
  [-.010, .175, -.006, .058],
  [.006, .228, .004, .053],
];

const EXPECTED_FIRST_EIGHT_LARGE = [
  [0, .045, 0, .066],
  [-.044, .107, .014, .062],
  [.044, .107, .014, .060],
  [0, .122, -.045, .057],
  [-.036, .178, .013, .057],
  [.036, .178, .013, .057],
  [0, .192, -.043, .054],
  [0, .245, .010, .052],
];

test('classic scoop layout and first eight large scoop entries remain unchanged', () => {
  assert.deepEqual(CLASSIC_SCOOP_LAYOUT, EXPECTED_CLASSIC);
  assert.equal(LARGE_SCOOP_LAYOUT.length, MAX_SCOOPS);
  assert.equal(LARGE_SCOOP_LAYOUT.length, 12);
  assert.deepEqual(LARGE_SCOOP_LAYOUT.slice(0, 8), EXPECTED_FIRST_EIGHT_LARGE);
});

test('all twelve large scoop layout entries are finite and stay within compact cluster bounds', () => {
  for (const [index, entry] of LARGE_SCOOP_LAYOUT.entries()) {
    assert.equal(entry.length, 4, `scoop ${index + 1} tuple length`);
    for (const value of entry) {
      assert.equal(typeof value, 'number');
      assert.ok(Number.isFinite(value), `scoop ${index + 1} finite coordinate`);
    }
    const [x, y, z, radius] = entry;
    assert.ok(radius > 0.03 && radius < 0.08, `scoop ${index + 1} radius in range`);
    const footprintRadius = Math.hypot(x, z) + radius;
    const crownHeight = y + radius;
    assert.ok(footprintRadius < 0.14, `scoop ${index + 1} footprint ${footprintRadius} < 0.14m`);
    assert.ok(crownHeight <= 0.36, `scoop ${index + 1} crown ${crownHeight} <= 0.36m`);
  }

  for (let i = 0; i < LARGE_SCOOP_LAYOUT.length; i++) {
    for (let j = i + 1; j < LARGE_SCOOP_LAYOUT.length; j++) {
      const [ax, ay, az] = LARGE_SCOOP_LAYOUT[i];
      const [bx, by, bz] = LARGE_SCOOP_LAYOUT[j];
      const dist = Math.hypot(ax - bx, ay - by, az - bz);
      assert.ok(dist > 0.03, `scoops ${i + 1} and ${j + 1} have distinct positions`);
    }
  }
});
