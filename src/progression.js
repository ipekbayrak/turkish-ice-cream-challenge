export const BASE_GAME_SPEED = 0.78;
export const BASE_MUSIC_TEMPO = 0.85;

export function isStageNumber(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

export function normalizeStage(value) {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN;

  if (!Number.isFinite(numeric)) {
    return 1;
  }

  const floored = Math.floor(numeric);
  if (floored < 1) {
    return 1;
  }

  return Math.min(floored, Number.MAX_SAFE_INTEGER);
}

export function tempoForStage(stage) {
  const normalized = normalizeStage(stage);
  return 1 + 0.30 * Math.log1p(normalized - 1);
}
