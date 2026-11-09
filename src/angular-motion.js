const TAU = Math.PI * 2;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const nearestDelta = (angle) => {
  const wrapped = ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return wrapped === -Math.PI && angle > 0 ? Math.PI : wrapped;
};

/**
 * Presentation-only angular tracking. Small authored deltas retain every turn.
 * Timer/routine jumps reconcile to an equivalent nearby orientation, rather than
 * winding through hundreds of stale turns. Linear-input integration gives the
 * same motion at 30/60/120 Hz; the speed bound limits a discrete half-turn cue.
 */
export class AngularMotion {
  constructor({ response = 18, maxSpeed = 26, resetJump = Math.PI * 1.2 } = {}) {
    this.response = response;
    this.maxSpeed = maxSpeed;
    this.resetJump = resetJump;
    this.value = 0;
    this.target = 0;
    this.previousRaw = null;
  }

  step(raw, dt) {
    if (!Number.isFinite(raw) || !Number.isFinite(dt) || dt <= 0) return this.value;
    const previousTarget = this.target;
    const delta = raw - (this.previousRaw ?? 0);
    const discontinuity = Math.abs(delta) > Math.max(this.resetJump, dt * this.maxSpeed * 2);
    if (discontinuity) this.target = this.value + nearestDelta(raw - this.value);
    else this.target += delta;
    this.previousRaw = raw;

    const k = this.response;
    const abrupt = discontinuity || Math.abs(delta) > dt * this.maxSpeed * 1.5;
    if (abrupt || this.target === previousTarget) {
      const error = this.target - this.value;
      const sign = Math.sign(error);
      const boundary = this.maxSpeed / k;
      const travelTime = Math.max(0, (Math.abs(error) - boundary) / this.maxSpeed);
      if (dt <= travelTime) this.value += sign * this.maxSpeed * dt;
      else {
        const remainingError = Math.abs(error) - this.maxSpeed * travelTime;
        this.value = this.target - sign * remainingError * Math.exp(-k * (dt - travelTime));
      }
      return this.value;
    }
    const decay = Math.exp(-k * dt);
    const slope = (this.target - previousTarget) / dt;
    const next = this.target - slope / k + (this.value - previousTarget + slope / k) * decay;
    this.value += clamp(next - this.value, -this.maxSpeed * dt, this.maxSpeed * dt);
    return this.value;
  }

  /** Keep the displayed pose, but discard an obsolete authored timer offset. */
  reset(raw = 0) {
    this.target = this.value + nearestDelta(raw - this.value);
    this.previousRaw = raw;
  }
}
