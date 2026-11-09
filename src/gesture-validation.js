import { isControlActive } from './pointer-controls.js';
/**
 * Validates deliberate pointer intent, independently of the rendered hand.
 * normX/normY are -1..1 (positive Y is up). A posed/snapped hand, stale velocity,
 * or accumulated tiny jitter must never stand in for an actual gesture.
 */
const hypot = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const worldDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const point = (v) => ({ x: v?.x || 0, y: v?.y || 0, z: v?.z || 0 });

export class GestureValidation {
  constructor() { this.reset(); }

  reset() {
    this.time = 0;
    this.current = null;
    this.previous = null;
    this.scope = null;
    this.scopeStart = null;
    this.windows = new Map();
    this.history = [];
  }

  update(state, dt, scope) {
    this.time += Math.max(0, Math.min(dt, 0.1));
    this.previous = this.current;
    this.current = {
      time: this.time,
      x: Number.isFinite(state.normX) ? state.normX : 0,
      y: Number.isFinite(state.normY) ? state.normY : 0,
      world: point(state.intentWorldPos),
      down: isControlActive(state),
      epoch: state.pointerEpoch || 0,
      cancel: state.cancelEpoch || 0,
      valid: Boolean(state.intentWorldPos),
    };
    const canceled = this.previous && this.current.cancel !== this.previous.cancel;
    if (scope !== this.scope || canceled) {
      this.scope = scope;
      this.scopeStart = { ...(this.previous || this.current) };
      this.scopeStart.time = this.time;
      if (!this.previous) this.scopeStart.epoch = -1;
      this.windows.clear();
    }
    if (canceled) {
      this.scopeStart = { ...this.current };
      this.history = [];
    }
    this.history.push(this.current);
    this.history = this.history.filter((s) => this.time - s.time <= 0.85);
  }

  _window(key) {
    if (!this.windows.has(key)) {
      this.windows.set(key, { start: this.scopeStart || this.current, dwell: 0, done: false });
    }
    return this.windows.get(key);
  }

  _held() { return this.current?.valid && this.current.down; }

  get interrupted() {
    return !this.current?.down || Boolean(this.previous &&
      (this.current.epoch !== this.previous.epoch || this.current.cancel !== this.previous.cancel));
  }

  /** New contact or meaningful net motion, then a brief stable hold near target. */
  reach(key, distance, radius, dt) {
    const w = this._window(key);
    const s = this.current;
    if (!this._held() || distance >= radius) { w.dwell = 0; return false; }
    const fresh = s.epoch > w.start.epoch || hypot(s, w.start) >= 0.10;
    if (!fresh) { w.dwell = 0; return false; }
    w.dwell += Math.max(0, dt);
    return w.dwell >= 0.075;
  }

  /** A deliberate horizontal cut/throw; no instantaneous-velocity thresholds. */
  slice(key, near = true) { return this._directional(key, 'horizontal', near); }

  /** A real downward drag (toward the player), never an auto-retracted 3D hand. */
  pull(key) { return this._directional(key, 'down', true); }

  _directional(key, direction, near) {
    const w = this._window(key);
    if (w.done) return true;
    if (!this._held() || !near) return false;
    const s = this.current;
    for (const start of this.history) {
      if (start.time < w.start.time || !start.down || start.epoch !== s.epoch || start.cancel !== s.cancel) continue;
      const elapsed = s.time - start.time;
      if (elapsed < 0.035 || elapsed > 0.8) continue;
      const dx = s.x - start.x;
      const dy = s.y - start.y;
      const deliberate = direction === 'horizontal'
        ? Math.abs(dx) >= 0.20 && Math.abs(dx) > Math.abs(dy) * 1.4
        : -dy >= 0.18 && -dy > Math.abs(dx) * 1.15;
      if (deliberate) { w.done = true; return true; }
    }
    return false;
  }

  /** Follow a newly requested beat target, move toward it, and settle on it. */
  follow(key, target, dt) {
    const w = this._window(key);
    if (w.done) return false;
    if (!this._held()) { w.dwell = 0; return false; }
    const current = this.current.world;
    const start = w.start.world;
    const desiredX = target.x - start.x;
    const movedX = current.x - start.x;
    const travel = worldDistance(current, start);
    const inDirection = Math.abs(desiredX) < 0.045
      ? travel >= 0.07
      : Math.sign(movedX) === Math.sign(desiredX) && Math.abs(movedX) >= Math.min(0.075, Math.abs(desiredX) * 0.4);
    const near = Math.abs(current.x - target.x) < 0.12 && Math.abs(current.y - target.y) < 0.17 && Math.abs(current.z - target.z) < 0.16;
    if (travel < 0.07 || !inDirection || !near) { w.dwell = 0; return false; }
    w.dwell += Math.max(0, dt);
    if (w.dwell < 0.09) return false;
    w.done = true;
    return true;
  }
}
