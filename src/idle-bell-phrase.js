const BEAT_SECONDS = 0.36;
const DEFAULT_BELL_COUNT = 7;
const SWEEP_PROBABILITY = 0.25;

function sampleUnit(random) {
  const fn = typeof random === 'function' ? random : Math.random;
  const raw = Number(fn());
  if (!Number.isFinite(raw) || raw < 0) return 0;
  if (raw >= 1) return 1 - Number.EPSILON;
  return raw;
}

/**
 * Build a one-shot idle bell phrase:
 * - 'short' (75%): 2 or 3 distinct bells (not necessarily adjacent)
 * - 'sweep' (25%): all bells in ascending or descending order
 * Does not loop.
 */
export function createIdleBellPhrase(bellCount = DEFAULT_BELL_COUNT, { random = Math.random } = {}) {
  const count = Number.isFinite(bellCount)
    ? Math.max(1, Math.floor(bellCount))
    : DEFAULT_BELL_COUNT;

  const modeRoll = sampleUnit(random);
  if (count > 3 && modeRoll < SWEEP_PROBABILITY) {
    const step = sampleUnit(random) < 0.5 ? 1 : -1;
    const start = step > 0 ? 0 : count - 1;
    const indices = [];
    for (let i = 0; i < count; i++) {
      indices.push(start + i * step);
    }
    return {
      kind: 'sweep',
      indices,
      beatSeconds: BEAT_SECONDS,
      duration: indices.length * BEAT_SECONDS,
    };
  }

  const desiredLength = sampleUnit(random) < 0.5 ? 2 : 3;
  const length = Math.min(count, desiredLength);
  const pool = Array.from({ length: count }, (_, i) => i);
  const indices = [];
  for (let i = 0; i < length; i++) {
    const pick = Math.floor(sampleUnit(random) * pool.length);
    indices.push(pool.splice(pick, 1)[0]);
  }

  return {
    kind: 'short',
    indices,
    beatSeconds: BEAT_SECONDS,
    duration: indices.length * BEAT_SECONDS,
  };
}

/**
 * Evaluate the strike state of an idle bell phrase at the given elapsed age in seconds.
 * Holds the final bell at phase 1 with striking=false once duration has elapsed.
 */
export function idleBellPhraseAt(phrase, age) {
  const indices = Array.isArray(phrase?.indices) && phrase.indices.length > 0
    ? phrase.indices
    : [0];
  const beatSeconds = Number.isFinite(phrase?.beatSeconds) && phrase.beatSeconds > 0
    ? phrase.beatSeconds
    : BEAT_SECONDS;
  const count = indices.length;
  const duration = Number.isFinite(phrase?.duration) && phrase.duration > 0
    ? phrase.duration
    : count * beatSeconds;

  const safeAge = age === Infinity
    ? duration
    : (Number.isFinite(age) ? Math.max(0, age) : 0);

  if (safeAge >= duration) {
    const lastBeat = count - 1;
    return {
      striking: false,
      beat: lastBeat,
      index: indices[lastBeat],
      phase: 1,
    };
  }

  const beat = Math.min(count - 1, Math.floor(safeAge / beatSeconds));
  const phase = Math.max(0, Math.min(1, (safeAge - beat * beatSeconds) / beatSeconds));

  return {
    striking: true,
    beat,
    index: indices[beat],
    phase,
  };
}
