import { isControlActive } from './pointer-controls.js';

const DEFAULT_WIDTH = 390;
const MIN_THRESHOLD = 14;
const MAX_THRESHOLD = 28;
const THRESHOLD_RATIO = 0.045;
const MIN_DURATION = 0.12;
const MAX_DURATION = 1.2;
const MAX_SAMPLE_DT = 0.1;
const JITTER_DEADZONE = 3.5;
const SUBTHRESHOLD_STALL_RESET = 0.25;

function computeThreshold(width) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : DEFAULT_WIDTH;
  return Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, safeWidth * THRESHOLD_RATIO));
}

export class FlavorRefusalGesture {
  constructor() {
    this.progress = 0;
    this.completed = false;
    this.clock = 0;
    this._resetStroke();
  }

  reset() {
    this.progress = 0;
    this.completed = false;
    this.clock = 0;
    this._resetStroke();
  }

  _resetStroke() {
    this.hasAnchor = false;
    this.pointerEpoch = 0;
    this.cancelEpoch = 0;
    this.originX = 0;
    this.originY = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.minX = 0;
    this.maxX = 0;
    this.minY = 0;
    this.maxY = 0;
    this.rightMinY = 0;
    this.rightMaxY = 0;
    this.leftMinY = 0;
    this.leftMaxY = 0;
    this.leg2MinY = 0;
    this.leg2MaxY = 0;
    this.rightStartClock = null;
    this.leftStartClock = null;
    this.lastRightAdvanceClock = 0;
    this.lastLeftAdvanceClock = 0;
    this.strokeStartClock = 0;
    this.stage = 0;
    this.dir = 0;
    this.extremumX = 0;
    if (!this.completed) {
      this.progress = 0;
    }
  }

  _anchor(x, y, pointerEpoch, cancelEpoch) {
    this.hasAnchor = true;
    this.pointerEpoch = pointerEpoch;
    this.cancelEpoch = cancelEpoch;
    this.originX = x;
    this.originY = y;
    this.prevX = x;
    this.prevY = y;
    this.minX = x;
    this.maxX = x;
    this.minY = y;
    this.maxY = y;
    this.rightMinY = y;
    this.rightMaxY = y;
    this.leftMinY = y;
    this.leftMaxY = y;
    this.leg2MinY = y;
    this.leg2MaxY = y;
    this.rightStartClock = null;
    this.leftStartClock = null;
    this.lastRightAdvanceClock = this.clock;
    this.lastLeftAdvanceClock = this.clock;
    this.strokeStartClock = this.clock;
    this.stage = 0;
    this.dir = 0;
    this.extremumX = x;
    if (!this.completed) {
      this.progress = 0;
    }
  }

  update(input, dt, { enabled = false, width = DEFAULT_WIDTH } = {}) {
    if (!enabled) {
      this.reset();
      return false;
    }

    if (
      !input ||
      typeof input !== 'object' ||
      !isControlActive(input) ||
      !Number.isFinite(input.pointerX) ||
      !Number.isFinite(input.pointerY)
    ) {
      this._resetStroke();
      return false;
    }

    if (!Number.isFinite(dt) || dt <= 0) {
      this._resetStroke();
      return false;
    }

    if (this.completed) {
      this.progress = 1;
      return false;
    }

    const x = input.pointerX;
    const y = input.pointerY;
    const pointerEpoch = input.pointerEpoch ?? 0;
    const cancelEpoch = input.cancelEpoch ?? 0;
    const stepDt = Math.min(dt, MAX_SAMPLE_DT);
    const frameStartClock = this.clock;
    this.clock += stepDt;

    if (
      !this.hasAnchor ||
      pointerEpoch !== this.pointerEpoch ||
      cancelEpoch !== this.cancelEpoch
    ) {
      this._anchor(x, y, pointerEpoch, cancelEpoch);
      return false;
    }

    const threshold = computeThreshold(width);
    const maxVertical = Math.max(20, threshold * 1.3);

    this.minY = Math.min(this.minY, y);
    this.maxY = Math.max(this.maxY, y);

    if (
      Math.abs(y - this.originY) > maxVertical ||
      this.maxY - this.minY > maxVertical
    ) {
      this._anchor(x, y, pointerEpoch, cancelEpoch);
      return false;
    }

    if (this.stage === 0) {
      if (x <= this.minX) {
        this.minX = x;
        this.rightStartClock = null;
        this.rightMinY = y;
        this.rightMaxY = y;
        this.lastRightAdvanceClock = this.clock;
      } else if (
        (x < this.prevX && x - this.minX <= JITTER_DEADZONE) ||
        (x <= this.prevX && this.clock - this.lastRightAdvanceClock > SUBTHRESHOLD_STALL_RESET)
      ) {
        this.minX = x;
        this.rightStartClock = null;
        this.rightMinY = y;
        this.rightMaxY = y;
        this.lastRightAdvanceClock = this.clock;
      } else {
        this.rightMinY = Math.min(this.rightMinY, y);
        this.rightMaxY = Math.max(this.rightMaxY, y);
        if (x > this.prevX) {
          this.lastRightAdvanceClock = this.clock;
        }
        if (this.rightStartClock === null && x - this.minX > 0.5) {
          this.rightStartClock = frameStartClock;
        }
      }

      if (x >= this.maxX) {
        this.maxX = x;
        this.leftStartClock = null;
        this.leftMinY = y;
        this.leftMaxY = y;
        this.lastLeftAdvanceClock = this.clock;
      } else if (
        (x > this.prevX && this.maxX - x <= JITTER_DEADZONE) ||
        (x >= this.prevX && this.clock - this.lastLeftAdvanceClock > SUBTHRESHOLD_STALL_RESET)
      ) {
        this.maxX = x;
        this.leftStartClock = null;
        this.leftMinY = y;
        this.leftMaxY = y;
        this.lastLeftAdvanceClock = this.clock;
      } else {
        this.leftMinY = Math.min(this.leftMinY, y);
        this.leftMaxY = Math.max(this.leftMaxY, y);
        if (x < this.prevX) {
          this.lastLeftAdvanceClock = this.clock;
        }
        if (this.leftStartClock === null && this.maxX - x > 0.5) {
          this.leftStartClock = frameStartClock;
        }
      }

      const rightSweep = x - this.minX;
      const leftSweep = this.maxX - x;

      if (rightSweep >= threshold || leftSweep >= threshold) {
        const isRight = rightSweep >= leftSweep;
        const startClock = isRight
          ? (this.rightStartClock ?? frameStartClock)
          : (this.leftStartClock ?? frameStartClock);
        const legVertSpan = isRight
          ? this.rightMaxY - this.rightMinY
          : this.leftMaxY - this.leftMinY;
        const legSweep = isRight ? rightSweep : leftSweep;
        const elapsed = this.clock - startClock;

        if (elapsed > MAX_DURATION || legVertSpan > legSweep * 0.85) {
          this._anchor(x, y, pointerEpoch, cancelEpoch);
          return false;
        }

        this.stage = 1;
        this.dir = isRight ? 1 : -1;
        this.extremumX = x;
        this.strokeStartClock = startClock;
        this.originY = isRight ? this.rightMinY : this.leftMinY;
        this.minY = isRight ? Math.min(this.rightMinY, y) : Math.min(this.leftMinY, y);
        this.maxY = isRight ? Math.max(this.rightMaxY, y) : Math.max(this.leftMaxY, y);
        this.leg2MinY = y;
        this.leg2MaxY = y;
        this.progress = 0.5;
        this.prevX = x;
        this.prevY = y;
        return false;
      }

      const bestSweep = Math.max(rightSweep, leftSweep);
      this.progress = bestSweep <= JITTER_DEADZONE
        ? 0
        : Math.min(0.5, (bestSweep / threshold) * 0.5);
      this.prevX = x;
      this.prevY = y;
      return false;
    }

    const elapsed = this.clock - this.strokeStartClock;
    if (elapsed > MAX_DURATION) {
      this._anchor(x, y, pointerEpoch, cancelEpoch);
      return false;
    }

    if (this.dir === 1) {
      if (x > this.extremumX) {
        this.extremumX = x;
        this.leg2MinY = y;
        this.leg2MaxY = y;
      }
    } else if (x < this.extremumX) {
      this.extremumX = x;
      this.leg2MinY = y;
      this.leg2MaxY = y;
    }

    this.leg2MinY = Math.min(this.leg2MinY, y);
    this.leg2MaxY = Math.max(this.leg2MaxY, y);

    const reversal = this.dir === 1 ? this.extremumX - x : x - this.extremumX;
    this.progress = Math.min(0.99, 0.5 + 0.5 * Math.max(0, Math.min(1, reversal / threshold)));
    this.prevX = x;
    this.prevY = y;

    if (reversal >= threshold) {
      const leg2VertSpan = this.leg2MaxY - this.leg2MinY;
      if (elapsed < MIN_DURATION || leg2VertSpan > reversal * 0.85) {
        this._anchor(x, y, pointerEpoch, cancelEpoch);
        return false;
      }

      this.completed = true;
      this.progress = 1;
      return true;
    }

    return false;
  }
}
