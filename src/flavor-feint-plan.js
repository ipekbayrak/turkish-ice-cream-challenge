import { normalizeFlavorIndex, ICE_CREAM_FLAVORS } from './flavors.js';

export const FLAVOR_FEINT_ID = 'FLAVOR_FEINT_RETURN';

const DEFAULT_FEINT_CHANCE = 0.35;
const MIN_SCOOP_COUNT = 1;
import { MAX_SCOOPS as MAX_SCOOP_COUNT } from './venues.js';

function normalizeScoopCount(count) {
  const numeric = Math.floor(Number(count));
  if (!Number.isFinite(numeric)) return MIN_SCOOP_COUNT;
  return Math.min(MAX_SCOOP_COUNT, Math.max(MIN_SCOOP_COUNT, numeric));
}

function normalizeChance(chance) {
  if (chance === undefined) return DEFAULT_FEINT_CHANCE;
  const numeric = Number(chance);
  if (!Number.isFinite(numeric)) return DEFAULT_FEINT_CHANCE;
  return Math.min(1, Math.max(0, numeric));
}

function sampleUnitRandom(random) {
  const raw = typeof random === 'function' ? Number(random()) : Math.random();
  if (Number.isNaN(raw) || raw <= 0) return 0;
  if (raw >= 1) return 1;
  return raw;
}

function resolveOrderedFlavor(selectedFlavors, slotIndex) {
  if (!Array.isArray(selectedFlavors) || selectedFlavors.length === 0) {
    return 0;
  }
  return normalizeFlavorIndex(selectedFlavors[slotIndex % selectedFlavors.length]);
}

export function createFlavorFeintPlan(routine, selectedFlavors, count, options = {}) {
  if (!Array.isArray(routine) || routine.includes(FLAVOR_FEINT_ID)) {
    return null;
  }

  const { random = Math.random, chance = DEFAULT_FEINT_CHANCE } = options ?? {};
  const scoopCount = normalizeScoopCount(count);
  let totalPreps = 0;
  let lastPrepIndex = -1;

  for (let i = 0; i < routine.length; i += 1) {
    const stepId = routine[i];
    if (stepId === 'SCRAPE_FLAVOR_SCOOP') {
      totalPreps += 1;
      lastPrepIndex = i;
    } else if (stepId === 'CUSTOMER_SCOOP_SHOW') {
      totalPreps += Math.min(2, scoopCount);
      lastPrepIndex = i;
    }
  }

  if (lastPrepIndex < 0 || totalPreps < scoopCount) {
    return null;
  }

  const boundedChance = normalizeChance(chance);
  if (boundedChance <= 0) {
    return null;
  }

  const triggerRoll = sampleUnitRandom(random);
  if (boundedChance < 1 && triggerRoll >= boundedChance) {
    return null;
  }

  const index = scoopCount - 1;
  const requested = resolveOrderedFlavor(selectedFlavors, index);

  const orderedColors = new Set();
  for (let slot = 0; slot < scoopCount; slot += 1) {
    orderedColors.add(resolveOrderedFlavor(selectedFlavors, slot));
  }


  const allColors = ICE_CREAM_FLAVORS.map((_, flavorIdx) => flavorIdx);
  const unusedColors = allColors.filter(
    (colorIdx) => colorIdx !== requested && !orderedColors.has(colorIdx),
  );
  const candidates =
    unusedColors.length > 0
      ? unusedColors
      : allColors.filter((colorIdx) => colorIdx !== requested);

  const colorRoll = sampleUnitRandom(random);
  const candidateIndex = Math.min(
    candidates.length - 1,
    Math.floor(colorRoll * candidates.length),
  );
  const offered = normalizeFlavorIndex(candidates[candidateIndex]);

  const nextRoutine = routine.slice();
  nextRoutine.splice(lastPrepIndex + 1, 0, FLAVOR_FEINT_ID);

  return {
    index,
    requested,
    offered,
    prepareAt: lastPrepIndex,
    status: 'planned',
    routine: nextRoutine,
  };
}

export function displayedFlavorIndex(plan, index, orderedIndex) {
  if (plan?.status === 'active' && index === plan.index) {
    return normalizeFlavorIndex(plan.offered);
  }
  return normalizeFlavorIndex(orderedIndex);
}
