import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLAVOR_FEINT_ID,
  createFlavorFeintPlan,
  displayedFlavorIndex,
} from '../src/flavor-feint-plan.js';
import { ICE_CREAM_FLAVORS } from '../src/flavors.js';

function sequenceRandom(values) {
  let cursor = 0;
  return () => {
    const value = values[Math.min(cursor, values.length - 1)];
    cursor += 1;
    return value;
  };
}

test('chance 0 and 1 are deterministic and default chance is bounded in 0..1', () => {
  const routine = ['SCRAPE_FLAVOR_SCOOP', 'FINAL_SERVE'];

  assert.equal(
    createFlavorFeintPlan(routine, [1], 1, { chance: 0, random: () => 0 }),
    null,
  );
  assert.equal(
    createFlavorFeintPlan(routine, [1], 1, { chance: -0.5, random: () => 0 }),
    null,
  );

  const forcedPlan = createFlavorFeintPlan(routine, [1], 1, {
    chance: 1,
    random: sequenceRandom([0.99, 0]),
  });
  assert.ok(forcedPlan);
  assert.equal(forcedPlan.status, 'planned');

  const clampedHighChancePlan = createFlavorFeintPlan(routine, [1], 1, {
    chance: 4,
    random: sequenceRandom([1, 0]),
  });
  assert.ok(clampedHighChancePlan);

  const belowDefaultChance = createFlavorFeintPlan(routine, [1], 1, {
    random: sequenceRandom([0.34, 0]),
  });
  assert.ok(belowDefaultChance);

  const atDefaultChance = createFlavorFeintPlan(routine, [1], 1, {
    random: sequenceRandom([0.35, 0]),
  });
  assert.equal(atDefaultChance, null);
});

test('1 vs 2 vs 8 scoops finds real last preparation slot including CUSTOMER_SCOOP_SHOW opening and splices before final', () => {
  const oneScoopRoutine = ['CUSTOMER_SCOOP_SHOW', 'FAKE_PASS', 'FINAL_SERVE'];
  const oneScoopPlan = createFlavorFeintPlan(oneScoopRoutine, [2], 1, {
    chance: 1,
    random: sequenceRandom([0.1, 0]),
  });
  assert.ok(oneScoopPlan);
  assert.equal(oneScoopPlan.index, 0);
  assert.equal(oneScoopPlan.requested, 2);
  assert.equal(oneScoopPlan.prepareAt, 0);
  assert.deepEqual(oneScoopPlan.routine, [
    'CUSTOMER_SCOOP_SHOW',
    FLAVOR_FEINT_ID,
    'FAKE_PASS',
    'FINAL_SERVE',
  ]);

  const twoScoopOpeningRoutine = ['CUSTOMER_SCOOP_SHOW', 'CONE_SPIN', 'FINAL_SERVE'];
  const twoScoopPlan = createFlavorFeintPlan(twoScoopOpeningRoutine, [0, 3], 2, {
    chance: 1,
    random: sequenceRandom([0.1, 0]),
  });
  assert.ok(twoScoopPlan);
  assert.equal(twoScoopPlan.index, 1);
  assert.equal(twoScoopPlan.requested, 3);
  assert.equal(twoScoopPlan.prepareAt, 0);
  assert.deepEqual(twoScoopPlan.routine, [
    'CUSTOMER_SCOOP_SHOW',
    FLAVOR_FEINT_ID,
    'CONE_SPIN',
    'FINAL_SERVE',
  ]);

  const eightScoopRoutine = [
    'CUSTOMER_SCOOP_SHOW',
    'SCRAPE_FLAVOR_SCOOP',
    'FAKE_PASS',
    'SCRAPE_FLAVOR_SCOOP',
    'SCRAPE_FLAVOR_SCOOP',
    'CONE_FLIP',
    'SCRAPE_FLAVOR_SCOOP',
    'SCRAPE_FLAVOR_SCOOP',
    'SCRAPE_FLAVOR_SCOOP',
    'BELL_RING',
    'FINAL_SERVE',
  ];
  const eightScoopPlan = createFlavorFeintPlan(eightScoopRoutine, [1, 2], 8, {
    chance: 1,
    random: sequenceRandom([0.05, 0.75]),
  });
  assert.ok(eightScoopPlan);
  assert.equal(eightScoopPlan.index, 7);
  assert.equal(eightScoopPlan.requested, 2);
  assert.equal(eightScoopPlan.prepareAt, 8);
  assert.equal(eightScoopPlan.routine[9], FLAVOR_FEINT_ID);
  assert.equal(
    eightScoopPlan.routine.indexOf(FLAVOR_FEINT_ID) <
      eightScoopPlan.routine.indexOf('FINAL_SERVE'),
    true,
  );
});

test('offered excludes ordered colors when possible and differs from last requested when all 4 colors are used', () => {
  const threeScoopRoutine = [
    'CUSTOMER_SCOOP_SHOW',
    'SCRAPE_FLAVOR_SCOOP',
    'FINAL_SERVE',
  ];
  const threeColorPlan = createFlavorFeintPlan(
    threeScoopRoutine,
    [0, 1, 2],
    3,
    {
      chance: 1,
      random: sequenceRandom([0.1, 0.9]),
    },
  );
  assert.ok(threeColorPlan);
  assert.equal(threeColorPlan.requested, 2);
  assert.equal(threeColorPlan.offered, 3);

  const twoScoopRoutine = ['CUSTOMER_SCOOP_SHOW', 'FINAL_SERVE'];
  const firstUnusedChoice = createFlavorFeintPlan(twoScoopRoutine, [0, 2], 2, {
    chance: 1,
    random: sequenceRandom([0.1, 0.1]),
  });
  const secondUnusedChoice = createFlavorFeintPlan(twoScoopRoutine, [0, 2], 2, {
    chance: 1,
    random: sequenceRandom([0.1, 0.8]),
  });
  assert.equal(firstUnusedChoice.offered, 1);
  assert.equal(secondUnusedChoice.offered, 3);

  const fourScoopRoutine = [
    'CUSTOMER_SCOOP_SHOW',
    'SCRAPE_FLAVOR_SCOOP',
    'SCRAPE_FLAVOR_SCOOP',
    'FINAL_SERVE',
  ];
  const sampledWhenAllUsed = [0, 0.4, 0.95].map((draw) => {
    const plan = createFlavorFeintPlan(fourScoopRoutine, [0, 1, 2, 3], 4, {
      chance: 1,
      random: sequenceRandom([0.1, draw]),
    });
    assert.ok(plan);
    assert.notEqual(plan.offered, plan.requested);
    return plan.offered;
  });
  assert.deepEqual(sampledWhenAllUsed, [0, 1, 2]);
});

test('preserves input routine and selectedFlavors immutability', () => {
  const routine = Object.freeze(['CUSTOMER_SCOOP_SHOW', 'FINAL_SERVE']);
  const selectedFlavors = Object.freeze([1, 2]);

  const plan = createFlavorFeintPlan(routine, selectedFlavors, 2, {
    chance: 1,
    random: sequenceRandom([0.1, 0]),
  });
  assert.ok(plan);
  assert.deepEqual(routine, ['CUSTOMER_SCOOP_SHOW', 'FINAL_SERVE']);
  assert.deepEqual(selectedFlavors, [1, 2]);
  assert.notEqual(plan.routine, routine);

  plan.routine.push('MUTATED');
  assert.equal(routine.length, 2);
});

test('handles no-prep, insufficient preps, non-array routine, and duplicate feint IDs by returning null', () => {
  const opts = { chance: 1, random: () => 0 };

  assert.equal(createFlavorFeintPlan(null, [0], 1, opts), null);
  assert.equal(
    createFlavorFeintPlan(['CONE_FLIP', 'FINAL_SERVE'], [0], 1, opts),
    null,
  );
  assert.equal(
    createFlavorFeintPlan(['SCRAPE_FLAVOR_SCOOP', 'FINAL_SERVE'], [0, 1], 2, opts),
    null,
  );
  assert.equal(
    createFlavorFeintPlan(['CUSTOMER_SCOOP_SHOW', 'FINAL_SERVE'], [0, 1, 2], 3, opts),
    null,
  );
  assert.equal(
    createFlavorFeintPlan(
      ['CUSTOMER_SCOOP_SHOW', FLAVOR_FEINT_ID, 'FINAL_SERVE'],
      [0, 1],
      2,
      opts,
    ),
    null,
  );
});

test('displayedFlavorIndex overrides only when plan is active and only at plan.index', () => {
  const plan = {
    index: 1,
    requested: 2,
    offered: 3,
    prepareAt: 0,
    status: 'planned',
    routine: ['CUSTOMER_SCOOP_SHOW', FLAVOR_FEINT_ID, 'FINAL_SERVE'],
  };

  assert.equal(displayedFlavorIndex(plan, 1, 2), 2);
  assert.equal(displayedFlavorIndex(null, 1, 2), 2);

  const activePlan = { ...plan, status: 'active' };
  assert.equal(displayedFlavorIndex(activePlan, 1, 2), 3);
  assert.equal(displayedFlavorIndex(activePlan, 0, 1), 1);
  assert.equal(displayedFlavorIndex(activePlan, 2, 99), 0);

  const resolvedPlan = { ...plan, status: 'resolved' };
  assert.equal(displayedFlavorIndex(resolvedPlan, 1, 2), 2);
});

test('random returning Infinity, NaN, or out-of-range values never produces an invalid flavor', () => {
  const routine = ['CUSTOMER_SCOOP_SHOW', 'FINAL_SERVE'];
  const weirdDraws = [
    Infinity,
    -Infinity,
    Number.NaN,
    -10,
    0,
    1,
    42,
  ];

  for (const draw of weirdDraws) {
    const plan = createFlavorFeintPlan(routine, [2, 1], 2, {
      chance: 1,
      random: sequenceRandom([draw, draw]),
    });
    assert.ok(plan);
    assert.equal(Number.isInteger(plan.offered), true);
    assert.equal(plan.offered >= 0 && plan.offered < ICE_CREAM_FLAVORS.length, true);
    assert.notEqual(plan.offered, plan.requested);
  }
});

test('unselected future preference slots do not restrict the wrong-color choice',()=>{
 const draws=[0,0];const plan=createFlavorFeintPlan(['SCRAPE_FLAVOR_SCOOP','SCRAPE_FLAVOR_SCOOP','FINAL_PISTACHIO_CATCH'],[0,1,2,3],2,{chance:1,random:()=>draws.shift()??0});
 assert.ok([2,3].includes(plan.offered));
});
