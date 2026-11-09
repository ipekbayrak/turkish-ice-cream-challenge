export const TOUCH_GAIN = 1.5;
export const RETURN_DELAY_SECONDS = 0.04;
export const RETURN_DURATION_SECONDS = 0.26;

const COMPLETION_EPSILON = 1e-9;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function normalizeZero(value) {
  return value === 0 ? 0 : value;
}

export class RelativeTouchController {
  static TOUCH_GAIN = TOUCH_GAIN;
  static RETURN_DELAY_SECONDS = RETURN_DELAY_SECONDS;
  static RETURN_DURATION_SECONDS = RETURN_DURATION_SECONDS;

  constructor() {
    this.width = 1;
    this.height = 1;
    this.initialized = false;
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.homeX = 0;
    this.homeY = 0;
    this.returning = false;
    this.atHome = true;

    this.returnStartX = 0;
    this.returnStartY = 0;
    this.rawX = 0;
    this.rawY = 0;
    this.idleTime = 0;
    this.travel = 0;
  }

  _marginX() {
    return Math.min(12, this.width * 0.05);
  }

  _marginY() {
    return Math.min(12, this.height * 0.05);
  }

  _clampX(x) {
    const margin = this._marginX();
    return clamp(x, margin, Math.max(margin, this.width - margin));
  }

  _clampY(y) {
    const margin = this._marginY();
    return clamp(y, margin, Math.max(margin, this.height - margin));
  }

  configure(width, height) {
    if (!isFiniteNumber(width) || width <= 0 || !isFiniteNumber(height) || height <= 0) {
      return;
    }
    if (width === this.width && height === this.height) return;

    const prevWidth = this.width;
    const prevHeight = this.height;
    this.width = width;
    this.height = height;

    if (this.initialized) {
      const scaleX = width / prevWidth;
      const scaleY = height / prevHeight;
      this.x = this._clampX(this.x * scaleX);
      this.y = this._clampY(this.y * scaleY);
      this.homeX = this._clampX(this.homeX * scaleX);
      this.homeY = this._clampY(this.homeY * scaleY);
      this.returnStartX = this._clampX(this.returnStartX * scaleX);
      this.returnStartY = this._clampY(this.returnStartY * scaleY);
    }
  }

  press(rawX, rawY, seed) {
    if (
      !isFiniteNumber(rawX) ||
      !isFiniteNumber(rawY) ||
      seed === null ||
      typeof seed !== 'object' ||
      !isFiniteNumber(seed.x) ||
      !isFiniteNumber(seed.y)
    ) {
      return;
    }

    const clampedX = this._clampX(seed.x);
    const clampedY = this._clampY(seed.y);

    this.x = clampedX;
    this.y = clampedY;

    if (!this.initialized) {
      this.homeX = clampedX;
      this.homeY = clampedY;
    }

    this.returnStartX = clampedX;
    this.returnStartY = clampedY;
    this.rawX = rawX;
    this.rawY = rawY;
    this.idleTime = 0;
    this.travel = 0;
    this.initialized = true;
    this.active = true;
    this.returning = false;
    this.atHome = false;
  }

  move(rawX, rawY) {
    if (!this.active || !isFiniteNumber(rawX) || !isFiniteNumber(rawY)) {
      return { dx: 0, dy: 0 };
    }

    const rawDx = rawX - this.rawX;
    const rawDy = rawY - this.rawY;
    this.travel += Math.hypot(rawDx, rawDy);
    this.rawX = rawX;
    this.rawY = rawY;

    const prevX = this.x;
    const prevY = this.y;
    this.x = this._clampX(prevX + rawDx * TOUCH_GAIN);
    this.y = this._clampY(prevY + rawDy * TOUCH_GAIN);

    return {
      dx: normalizeZero(this.x - prevX),
      dy: normalizeZero(this.y - prevY),
    };
  }

  release() {
    if (!this.active) {
      return;
    }

    this.active = false;
    this.returning = false;
    this.idleTime = 0;
    this.returnStartX = this.x;
    this.returnStartY = this.y;
  }

  tick(dt) {
    if (!isFiniteNumber(dt) || dt <= 0) {
      return;
    }

    if (!this.initialized || this.active || this.atHome) {
      return;
    }

    this.idleTime += dt;

    if (this.idleTime <= RETURN_DELAY_SECONDS) {
      this.returning = false;
      this.atHome = false;
      return;
    }

    const elapsedReturn = this.idleTime - RETURN_DELAY_SECONDS;
    if (elapsedReturn >= RETURN_DURATION_SECONDS - COMPLETION_EPSILON) {
      this.x = this.homeX;
      this.y = this.homeY;
      this.returning = false;
      this.atHome = true;
      return;
    }

    const t = elapsedReturn / RETURN_DURATION_SECONDS;
    const alpha = t * t * (3 - 2 * t);
    this.x = this.returnStartX + (this.homeX - this.returnStartX) * alpha;
    this.y = this.returnStartY + (this.homeY - this.returnStartY) * alpha;
    this.returning = true;
    this.atHome = false;
  }

  reset() {
    this.initialized = false;
    this.active = false;
    this.returning = false;
    this.atHome = true;
    this.x = 0;
    this.y = 0;
    this.homeX = 0;
    this.homeY = 0;
    this.returnStartX = 0;
    this.returnStartY = 0;
    this.rawX = 0;
    this.rawY = 0;
    this.idleTime = 0;
    this.travel = 0;
  }
}
