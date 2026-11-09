const BELL_COUNT = 7;
const INPUT_TIMEOUT_SECONDS = 2;
const COOLDOWN_SECONDS = 4;
const MAX_IDENTICAL_RUN = 2;

export const BELL_MELODIES = Object.freeze([
  Object.freeze({
    id: 'ode-to-joy',
    intro: Object.freeze([2, 2, 3, 4, 4, 3, 2, 1]),
    continuation: Object.freeze([0, 0, 1, 2, 2, 1, 1, 2, 2, 3, 4, 4, 3, 2, 1, 0, 0, 1, 2, 1, 0, 0]),
    beat: 0.30,
    beatSeconds: 0.30,
  }),
  Object.freeze({
    id: 'twinkle',
    intro: Object.freeze([0, 0, 4, 4, 5, 5, 4]),
    continuation: Object.freeze([3, 3, 2, 2, 1, 1, 0, 4, 4, 3, 3, 2, 2, 1, 4, 4, 3, 3, 2, 2, 1, 0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0]),
    beat: 0.32,
    beatSeconds: 0.32,
  }),
  Object.freeze({
    id: 'usta-answer',
    intro: Object.freeze([0, 0, 1, 2, 2, 1, 0, 1, 2, 0]),
    continuation: Object.freeze([2, 3, 4, 4, 3, 2, 1, 0, 1, 2, 1, 0]),
    beat: 0.28,
    beatSeconds: 0.28,
  }),
]);

function matchesPrefix(intro, candidate) {
  if (candidate.length > intro.length) return false;
  for (let i = 0; i < candidate.length; i++) {
    if (intro[i] !== candidate[i]) return false;
  }
  return true;
}

function longestViableSuffix(sequence, melodies) {
  for (let start = 0; start < sequence.length; start++) {
    const suffix = sequence.slice(start);
    if (melodies.some(m => matchesPrefix(m.intro, suffix))) {
      return suffix;
    }
  }
  return [];
}

export class BellMelodies {
  constructor({
    onNote = () => {},
    onRecognized = () => {},
    melodies = BELL_MELODIES,
    inputTimeout = INPUT_TIMEOUT_SECONDS,
    cooldownSeconds = COOLDOWN_SECONDS,
  } = {}) {
    this.onNote = onNote;
    this.onRecognized = onRecognized;
    this.melodies = melodies;
    this.inputTimeout = inputTimeout;
    this.cooldownSeconds = cooldownSeconds;
    this.maxBufferLength = Math.max(1, ...this.melodies.map(m => m.intro.length));
    this.enabled = true;
    this.buffer = [];
    this.inputAge = 0;
    this.lastInputNote = null;
    this.repeatCount = 0;
    this.playing = null;
    this.cooldown = 0;
    this._emittingAutoNote = false;
  }

  get isPlaying() {
    return this.playing !== null;
  }

  reset() {
    this.buffer.length = 0;
    this.inputAge = 0;
    this.lastInputNote = null;
    this.repeatCount = 0;
    this.playing = null;
    this.cooldown = 0;
    this._emittingAutoNote = false;
  }

  note(index) {
    if (
      !this.enabled ||
      this._emittingAutoNote ||
      this.playing !== null ||
      this.cooldown > 0 ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= BELL_COUNT
    ) {
      return false;
    }

    if (index === this.lastInputNote) {
      this.repeatCount++;
    } else {
      this.lastInputNote = index;
      this.repeatCount = 1;
    }

    if (this.repeatCount > MAX_IDENTICAL_RUN) {
      this.buffer.length = 0;
      this.inputAge = 0;
      return false;
    }

    this.buffer.push(index);
    if (this.buffer.length > this.maxBufferLength) {
      this.buffer.splice(0, this.buffer.length - this.maxBufferLength);
    }

    const viable = longestViableSuffix(this.buffer, this.melodies);
    this.buffer = viable;
    this.inputAge = 0;

    const matched = this.melodies.find(
      m => m.intro.length === this.buffer.length && matchesPrefix(m.intro, this.buffer)
    );
    if (!matched) return false;

    const beatSeconds = matched.beatSeconds ?? matched.beat ?? 0.30;
    this.buffer.length = 0;
    this.inputAge = 0;
    this.lastInputNote = null;
    this.repeatCount = 0;
    this.playing = {
      id: matched.id,
      notes: matched.continuation,
      beatSeconds,
      index: 0,
      timer: beatSeconds,
    };
    this.onRecognized(matched.id);
    return true;
  }

  _emitNote(noteIndex) {
    this._emittingAutoNote = true;
    try {
      this.onNote(noteIndex);
    } finally {
      this._emittingAutoNote = false;
    }
  }

  update(dt, enabled = true) {
    if (!enabled) {
      this.enabled = false;
      this.reset();
      return;
    }
    this.enabled = true;
    if (!Number.isFinite(dt) || dt <= 0) return;

    if (this.playing) {
      this.playing.timer -= dt;
      if (this.playing.timer <= 1e-9) {
        const noteIndex = this.playing.notes[this.playing.index++];
        const done = this.playing.index >= this.playing.notes.length;
        if (!done) {
          const nextTimer = this.playing.timer + this.playing.beatSeconds;
          this.playing.timer = nextTimer > 0 ? nextTimer : this.playing.beatSeconds;
        }
        this._emitNote(noteIndex);
        if (done && this.playing) {
          this.playing = null;
          this.cooldown = this.cooldownSeconds;
        }
      }
      return;
    }

    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - dt);
    }

    if (this.buffer.length > 0) {
      this.inputAge += dt;
      if (this.inputAge >= this.inputTimeout) {
        this.buffer.length = 0;
        this.inputAge = 0;
        this.lastInputNote = null;
        this.repeatCount = 0;
      }
    }
  }
}
