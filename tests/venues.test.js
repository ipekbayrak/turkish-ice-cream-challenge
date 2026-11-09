import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SCOOPS,
  CAMPAIGN_STAGE_COUNT,
  VENUES,
  getVenueForStage,
  getStageOrderOptions,
  getVenueProgress,
} from '../src/venues.js';

test('venues preserve 6 stalls and 30 campaign stages with MAX_SCOOPS = 12 and neutral courtyard subtitle', () => {
  assert.equal(MAX_SCOOPS, 12);
  assert.equal(CAMPAIGN_STAGE_COUNT, 30);
  assert.equal(VENUES.length, 6);
  assert.deepEqual(
    VENUES.map(v => [v.id, v.firstStage, v.lastStage]),
    [
      ['istiklal', 1, 5],
      ['galata', 6, 10],
      ['karakoy', 11, 15],
      ['kadikoy', 16, 20],
      ['uskudar', 21, 25],
      ['ustalar-avlusu', 26, 30],
    ]
  );

  const courtyard = VENUES[5];
  assert.doesNotMatch(courtyard.subtitle.tr, /sekiz|8/i);
  assert.doesNotMatch(courtyard.subtitle.en, /eight|8/i);
  assert.match(courtyard.subtitle.tr, /sipariş|ustal/i);
  assert.match(courtyard.subtitle.en, /order|master/i);
});

test('stages 1 through 30 preserve exact order choices, maxima, defaults, and venue mappings', () => {
  const expectedMaxByStage = [
    4, 4, 4, 4, 4,
    4, 4, 4, 4, 4,
    5, 5, 5, 5, 5,
    6, 6, 6, 6, 6,
    7, 7, 7, 7, 7,
    8, 8, 8, 8, 8,
  ];
  const expectedDefaultByStage = [
    2, 2, 3, 3, 3,
    3, 4, 4, 4, 4,
    4, 4, 5, 5, 5,
    5, 5, 6, 6, 6,
    6, 6, 7, 7, 7,
    7, 7, 8, 8, 8,
  ];

  for (let stage = 1; stage <= 30; stage++) {
    const order = getStageOrderOptions(stage);
    const expectedMax = expectedMaxByStage[stage - 1];
    const expectedVenue = VENUES[Math.floor((stage - 1) / 5)];
    assert.equal(order.min, 1);
    assert.equal(order.max, expectedMax);
    assert.equal(order.default, expectedDefaultByStage[stage - 1]);
    assert.deepEqual(order.choices, Array.from({ length: expectedMax }, (_, i) => i + 1));
    assert.equal(order.venueId, expectedVenue.id);
    assert.equal(order.scoopScale, expectedVenue.scoopScale);
  }
});

test('post-30 endless stages unlock 9 at 31, 10 at 36, 11 at 41, 12 at 46 and cap at 12', () => {
  const milestones = [
    [30, 8],
    [31, 9],
    [35, 9],
    [36, 10],
    [40, 10],
    [41, 11],
    [45, 11],
    [46, 12],
    [50, 12],
    [51, 12],
    [100, 12],
    [1000000, 12],
  ];

  for (const [stage, expectedMax] of milestones) {
    const order = getStageOrderOptions(stage);
    assert.equal(order.min, 1);
    assert.equal(order.max, expectedMax, `stage ${stage} max`);
    assert.deepEqual(order.choices, Array.from({ length: expectedMax }, (_, i) => i + 1));
    assert.ok(order.default >= order.min && order.default <= order.max);
    assert.equal(order.venueId, 'ustalar-avlusu');
    assert.equal(getVenueForStage(stage).id, 'ustalar-avlusu');
  }
});

test('invalid and non-positive stages safely normalize to stage 1', () => {
  for (const invalid of [0, -1, -50, NaN, undefined, null, '', 'invalid', Infinity, -Infinity]) {
    const order = getStageOrderOptions(invalid);
    assert.equal(order.min, 1);
    assert.equal(order.max, 4);
    assert.equal(order.default, 2);
    assert.deepEqual(order.choices, [1, 2, 3, 4]);
    assert.equal(order.venueId, 'istiklal');
    assert.equal(getVenueForStage(invalid).id, 'istiklal');
  }

  const progress = getVenueProgress('ustalar-avlusu', {
    unlockedStage: 46,
    completedStages: [26, 27, 28, 29, 30],
    stageStars: Array(30).fill(3),
  });
  assert.equal(progress.unlocked, true);
  assert.equal(progress.cleared, true);
  assert.equal(progress.stars, 15);
});
