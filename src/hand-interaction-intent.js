export const MAX_DT_SECONDS = 0.1;
export const INSPECT_DURATION_SECONDS = 1.5;
export const BELL_COOLDOWN_SECONDS = 0.3;
export const FACE_COOLDOWN_SECONDS = 2.0;

const TIME_EPSILON = 1e-9;

function clampDt(dt) {
  if (typeof dt !== 'number' || !Number.isFinite(dt) || dt <= 0) {
    return 0;
  }
  return dt > MAX_DT_SECONDS ? MAX_DT_SECONDS : dt;
}

export class HandInteractionIntent {
  static MAX_DT_SECONDS = MAX_DT_SECONDS;
  static INSPECT_DURATION_SECONDS = INSPECT_DURATION_SECONDS;
  static BELL_COOLDOWN_SECONDS = BELL_COOLDOWN_SECONDS;
  static FACE_COOLDOWN_SECONDS = FACE_COOLDOWN_SECONDS;

  constructor() {
    this.time = 0;
    this.targetId = null;
    this.progress = 0;
    this.hover = null;
    this.previousContact = null;
    this.fired = false;
    this.bellCooldown = new Map();
    this.faceUntil = 0;
    this.elapsed = 0;
  }

  update(dt, input = {}) {
    const { active = false, empty = false, moved = false, target = null } = input ?? {};
    const step = clampDt(dt);
    this.time += step;

    if (
      !active ||
      !empty ||
      target === null ||
      typeof target !== 'object' ||
      target.id === null ||
      target.id === undefined ||
      target.id === ''
    ) {
      this.reset();
      return null;
    }

    let event = null;

    if (target.kind === 'detail') {
      if (this.targetId !== target.id) {
        this.targetId = target.id;
        this.elapsed = 0;
        this.fired = false;
      }
      this.elapsed += step;
      this.hover = target;
      const reached = this.elapsed + TIME_EPSILON >= INSPECT_DURATION_SECONDS;
      this.progress = reached ? 1 : Math.min(1, this.elapsed / INSPECT_DURATION_SECONDS);
      if (!this.fired && reached) {
        this.fired = true;
        event = { type: 'inspect', target };
      }
    } else if (target.kind === 'bell') {
      this.targetId = target.id;
      this.elapsed = 0;
      this.progress = 0;
      this.fired = false;
      this.hover = target;
      const cooldownUntil = this.bellCooldown.get(target.id) ?? 0;
      if (
        Boolean(moved) &&
        target.id !== this.previousContact &&
        this.time + TIME_EPSILON >= cooldownUntil
      ) {
        this.bellCooldown.set(target.id, this.time + BELL_COOLDOWN_SECONDS);
        event = { type: 'bell', target };
      }
    } else if (target.kind === 'face') {
      this.targetId = target.id;
      this.elapsed = 0;
      this.progress = 0;
      this.fired = false;
      this.hover = target;
      if (
        Boolean(moved) &&
        target.id !== this.previousContact &&
        this.time + TIME_EPSILON >= this.faceUntil
      ) {
        this.faceUntil = this.time + FACE_COOLDOWN_SECONDS;
        event = { type: 'poke', target };
      }
    } else {
      this.reset();
      return null;
    }

    this.previousContact = target.id;
    return event;
  }

  reset() {
    this.targetId = null;
    this.progress = 0;
    this.hover = null;
    this.previousContact = null;
    this.fired = false;
    this.elapsed = 0;
  }

  clear() {
    this.reset();
    this.time = 0;
    this.bellCooldown.clear();
    this.faceUntil = 0;
  }
}
