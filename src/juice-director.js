import * as THREE from 'three';

/**
 * Consistent Vendor Tells & Micro-Juice Controller (Slow-Mo + Catch FOV Zoom).
 *
 * Rules:
 *  - Every trick exposes a readable tell (`'feint'` vs `'true_offer'`) via
 *    subtle vendor brow asymmetry & head tilt so skilled players read the
 *    vendor rather than guessing blindly.
 *  - Near-miss yank-aways trigger a brief 140ms visual time-dilation (0.38x)
 *    without altering `RhythmClock` or `AudioContext` beat transport.
 *  - Successful catches trigger a crisp -2.4° FOV punch that springs back.
 */

const TRAP_SUBSTEPS = new Set([
  'GIANT_BLOCK_TEASE:0',
  'GIANT_BLOCK_TEASE:1',
  'UPSIDE_DOWN_GRAVITY:0',
  'FAKE_DROP_PANIC:0',
  'COMBO_DOUBLE_PUMP:0',
  'BELL_RHYTHM_FEINT:0',
  'SYNCOPATED_BELL_FAKE:0',
  'OVERHEAD_CROWN_DANGLE:0',
  'WHOLE_MOLD_ON_CONE:0',
  'WHOLE_MOLD_ON_CONE:1',
  'ELASTIC_BUNGEE_YO_YO:0',
  'MOLD_PENDULUM_HEIST:0',
  'DOUBLE_PUMP_CROSSOVER:0',
  'MAGNETIC_PULL_ESCAPE:0',
]);

const TRUE_OFFER_SUBSTEPS = new Set([
  'GIANT_BLOCK_TEASE:2',
  'UPSIDE_DOWN_GRAVITY:1',
  'FAKE_DROP_PANIC:1',
  'COMBO_DOUBLE_PUMP:1',
  'BELL_RHYTHM_FEINT:1',
  'SYNCOPATED_BELL_FAKE:1',
  'OVERHEAD_CROWN_DANGLE:1',
  'WHOLE_MOLD_ON_CONE:2',
  'ELASTIC_BUNGEE_YO_YO:1',
  'MOLD_PENDULUM_HEIST:1',
  'DOUBLE_PUMP_CROSSOVER:1',
  'MAGNETIC_PULL_ESCAPE:1',
  'FINAL_PISTACHIO_CATCH:0',
]);

export function classifyVendorTell(mechanic, subStep = 0) {
  const key = `${mechanic}:${subStep}`;
  if (TRAP_SUBSTEPS.has(key)) return 'feint';
  if (TRUE_OFFER_SUBSTEPS.has(key)) return 'true_offer';
  return 'neutral';
}

export class JuiceDirector {
  constructor() {
    this.slowMoRemaining = 0;
    this.slowMoDuration = 0.14;
    this.slowMoMinScale = 0.38;
    this.nearMissCooldown = 0;

    this.zoomTimer = 0;
    this.zoomDuration = 0.22;
    this.zoomPeakDegrees = -2.4;

    this.currentTell = 'neutral';
  }

  reset() {
    this.slowMoRemaining = 0;
    this.nearMissCooldown = 0;
    this.zoomTimer = 0;
    this.currentTell = 'neutral';
  }

  triggerNearMiss() {
    if (this.nearMissCooldown > 0) return false;
    this.slowMoRemaining = this.slowMoDuration;
    this.nearMissCooldown = 1.1;
    return true;
  }

  triggerCatchZoom() {
    this.zoomTimer = this.zoomDuration;
    return true;
  }

  /**
   * Advances juice timers using unscaled real dt and returns visual time scale
   * and camera FOV offset. Audio/RhythmClock always uses rawDt!
   */
  step(rawDt, { mechanic = '', subStep = 0 } = {}) {
    const dt = Math.min(0.1, Math.max(0, Number(rawDt) || 0));
    if (this.nearMissCooldown > 0) {
      this.nearMissCooldown = Math.max(0, this.nearMissCooldown - dt);
    }

    let timeScale = 1;
    if (this.slowMoRemaining > 0) {
      this.slowMoRemaining = Math.max(0, this.slowMoRemaining - dt);
      const progress = 1 - this.slowMoRemaining / this.slowMoDuration;
      timeScale = THREE.MathUtils.lerp(
        this.slowMoMinScale,
        1,
        THREE.MathUtils.smoothstep(progress, 0, 1)
      );
    }

    let fovOffset = 0;
    if (this.zoomTimer > 0) {
      this.zoomTimer = Math.max(0, this.zoomTimer - dt);
      const p = 1 - this.zoomTimer / this.zoomDuration;
      fovOffset = Math.sin(p * Math.PI) * this.zoomPeakDegrees;
    }

    this.currentTell = classifyVendorTell(mechanic, subStep);
    return {
      visualDt: dt * timeScale,
      timeScale,
      fovOffset,
      slowMoActive: this.slowMoRemaining > 0,
      tell: this.currentTell,
    };
  }
}
