const BASE_STEP_SECONDS = 0.22 / 0.85;
const MAX_STEPS_PER_FRAME = 16;
const EPSILON = 1e-9;

function intervalForStep(step) {
  return BASE_STEP_SECONDS * (step % 2 ? 0.97 : 1.03);
}

export function rhythmStepTime(step,tempo=1){
  return (Math.floor(step/2)*2+(step%2?1.03:0))*BASE_STEP_SECONDS/tempo;
}
export function rhythmStepAt(time,tempo=1){
  const logical=Math.max(0,time)*tempo,pair=Math.floor(logical/(2*BASE_STEP_SECONDS));
  return pair*2+(logical-pair*2*BASE_STEP_SECONDS>=BASE_STEP_SECONDS*1.03-EPSILON?1:0);
}

function normalizeTempo(tempo) {
  return typeof tempo === 'number' && Number.isFinite(tempo) && tempo >= 1 ? tempo : 1;
}

export class RhythmClock {
  constructor(tempo = 1) {
    this.tempo = 1;
    this.reset(tempo);
  }

  reset(tempo = this.tempo) {
    this.tempo = normalizeTempo(tempo);
    this.time = 0;
    this.realTime = 0;
    this.step = 0;
    this.nextAt = 0;
    this.lastNoteReal = -Infinity;
    this.running = true;
    this._interval = intervalForStep(0);
    this.timeSource=null;
  }

  bindTimeSource(source){this.timeSource=source;}

  advance(dt) {
    if (!this.running || typeof dt !== 'number' || !Number.isFinite(dt) || dt < 0) {
      return [];
    }

    const sampled=this.timeSource?.();
    this.realTime = Number.isFinite(sampled)?Math.max(this.realTime,sampled):this.realTime+dt;
    this.time = this.realTime*this.tempo;

    const due = [];
    while (this.nextAt <= this.time + EPSILON && due.length < MAX_STEPS_PER_FRAME) {
      const emittedStep = this.step;
      const at = this.nextAt;
      due.push({ step: emittedStep, at });
      this.step += 1;
      const interval = intervalForStep(emittedStep);
      this._interval = interval;
      this.nextAt += interval;
      this.lastNoteReal = this.realTime;
    }

    if (this.nextAt <= this.time + EPSILON) {
      this.step=rhythmStepAt(this.time)+1;
      this._interval=intervalForStep(this.step-1);
      this.nextAt=rhythmStepTime(this.step);
    }

    return due;
  }

  accent() {
    // Physical impacts are effects over the song; they cannot move its grid.
    return null;
  }

  stop() {
    this.running = false;
  }

  get phase() {
    const interval = this._interval || intervalForStep(Math.max(0, this.step - 1));
    const startAt = this.nextAt - interval;
    const raw = (this.time - startAt) / interval;
    if (!Number.isFinite(raw)) {
      return 0;
    }
    return Math.max(0, Math.min(1, raw));
  }
}
