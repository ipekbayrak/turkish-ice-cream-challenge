/**
 * Adaptive GPU Quality Governor for mobile & desktop devices.
 *
 * Modes:
 *  - 'auto': Starts at 'high' (maxDpr=2, shadows=true) and monitors real active
 *    frame times over a rolling 90-frame window. If average frame time exceeds
 *    24 ms (< ~41.6 FPS), steps down once to 'low' (maxDpr=1.25, shadows=false,
 *    particleScale=0.5) to protect GPU fill-rate on 2–3 GB RAM Android phones.
 *  - 'high': Locks maxDpr=2, shadows=true, particleScale=1.
 *  - 'low':  Locks maxDpr=1.25, shadows=false, particleScale=0.5.
 */

export const QUALITY_MODES = Object.freeze(['auto', 'high', 'low']);

export const QUALITY_SPECS = Object.freeze({
  high: Object.freeze({
    tier: 'high',
    maxDpr: 2,
    shadows: true,
    particleScale: 1,
  }),
  low: Object.freeze({
    tier: 'low',
    maxDpr: 1.25,
    shadows: false,
    particleScale: 0.5,
  }),
});

export function normalizeQualityMode(mode) {
  return QUALITY_MODES.includes(mode) ? mode : 'auto';
}

export function getQualitySpec(tier = 'high') {
  return tier === 'low' ? QUALITY_SPECS.low : QUALITY_SPECS.high;
}

const WINDOW_SIZE = 90;
const DOWNGRADE_AVG_DT_SEC = 0.024; // >24ms average (~<41.6 FPS)
const MAX_VALID_FRAME_SEC = 0.25;   // Ignore tab switches / background pauses

export class QualityGovernor {
  constructor({ mode = 'auto', onChange = null } = {}) {
    this.mode = normalizeQualityMode(mode);
    this.onChange = typeof onChange === 'function' ? onChange : null;
    this.activeTier = this.mode === 'low' ? 'low' : 'high';
    this.autoDowngraded = false;
    this._samples = new Float32Array(WINDOW_SIZE);
    this._index = 0;
    this._count = 0;
    this._sum = 0;
  }

  getSpec() {
    return getQualitySpec(this.activeTier);
  }

  setMode(nextMode) {
    const normalized = normalizeQualityMode(nextMode);
    const prevTier = this.activeTier;
    this.mode = normalized;
    this._resetWindow();
    if (normalized === 'low') {
      this.activeTier = 'low';
      this.autoDowngraded = false;
    } else if (normalized === 'high') {
      this.activeTier = 'high';
      this.autoDowngraded = false;
    } else {
      // Returning to 'auto' starts fresh at 'high' unless downgraded again
      this.activeTier = 'high';
      this.autoDowngraded = false;
    }
    if (this.activeTier !== prevTier) {
      this.onChange?.(this.getSpec());
    }
    return this.getSpec();
  }

  _resetWindow() {
    this._samples.fill(0);
    this._index = 0;
    this._count = 0;
    this._sum = 0;
  }

  /**
   * Records a real RAF delta (in seconds) while gameplay is visible and active.
   * Returns true if an automatic tier step-down occurred on this frame.
   */
  sampleFrame(rawDtSeconds, { visible = true, active = true } = {}) {
    if (this.mode !== 'auto' || this.autoDowngraded || this.activeTier === 'low') {
      return false;
    }
    if (!visible || !active) {
      return false;
    }
    if (
      typeof rawDtSeconds !== 'number' ||
      !Number.isFinite(rawDtSeconds) ||
      rawDtSeconds <= 0 ||
      rawDtSeconds >= MAX_VALID_FRAME_SEC
    ) {
      return false;
    }

    if (this._count === WINDOW_SIZE) {
      this._sum -= this._samples[this._index];
    } else {
      this._count++;
    }
    this._samples[this._index] = rawDtSeconds;
    this._sum += rawDtSeconds;
    this._index = (this._index + 1) % WINDOW_SIZE;

    if (this._count === WINDOW_SIZE) {
      const avg = this._sum / WINDOW_SIZE;
      if (avg > DOWNGRADE_AVG_DT_SEC) {
        this.activeTier = 'low';
        this.autoDowngraded = true;
        this._resetWindow();
        this.onChange?.(this.getSpec());
        return true;
      }
    }
    return false;
  }
}
