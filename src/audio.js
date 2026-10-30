// Procedural Web Audio Synthesizer + Formant Vendor Voice Engine for Turkish Ice Cream Challenge

const VOWEL_FORMANTS = {
  A: [750, 1220, 2550],
  O: [480, 880, 2450],
  U: [340, 720, 2350],
  E: [540, 1820, 2580],
  I: [310, 2150, 2750],
};

// Base fundamental voice pitch (Hz) for each of the 3 Ustas:
// 0: Çırak Kadir (Young tenor), 1: Pala Usta (Resonant baritone), 2: Cezmi Dede (Deep raspy bass-baritone)
const USTA_BASE_PITCH = [156, 118, 98];

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.beatStep = 0;
    this.tempoMultiplier = 1.0;

    // Live lip-sync envelope state for 3D vendor mouth & mustache animation
    this.voiceSyllables = [];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _connectWithPan(node, panX = 0) {
    if (!this.ctx) return;
    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(
        Math.max(-1, Math.min(1, panX * 1.4)),
        this.ctx.currentTime
      );
      node.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      node.connect(this.ctx.destination);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopMusic();
    } else {
      this.init();
      this.startMusic();
    }
    return this.enabled;
  }

  /**
   * Returns 0..1 live jaw/mouth openness for 3D Vendor Lip-Sync animation
   */
  getVoiceMouthOpen() {
    if (!this.ctx || this.voiceSyllables.length === 0) return 0;
    const now = this.ctx.currentTime;
    let openness = 0;
    for (let i = this.voiceSyllables.length - 1; i >= 0; i--) {
      const s = this.voiceSyllables[i];
      if (now > s.end) {
        this.voiceSyllables.splice(i, 1);
      } else if (now >= s.start) {
        const p = (now - s.start) / Math.max(0.01, s.end - s.start);
        const env = Math.sin(p * Math.PI) * s.intensity;
        if (env > openness) openness = env;
      }
    }
    return Math.min(1, openness);
  }

  /**
   * Synthesizes a single vocal syllable through a 3-formant human vocal tract filter bank
   */
  _playVocalSyllable(startTime, duration, f0Start, f0End, vowelKey = 'A', volume = 0.24, panX = 0, breathy = true) {
    if (!this.ctx) return;

    this.voiceSyllables.push({
      start: startTime,
      end: startTime + duration,
      intensity: Math.min(1, volume * 3.8),
    });

    const formants = VOWEL_FORMANTS[vowelKey] || VOWEL_FORMANTS.A;

    // Glottal cord source (sawtooth + sub-octave triangle for warm human chest resonance)
    const glottal = this.ctx.createOscillator();
    glottal.type = 'sawtooth';
    glottal.frequency.setValueAtTime(f0Start, startTime);
    glottal.frequency.exponentialRampToValueAtTime(Math.max(55, f0End), startTime + duration);

    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(f0Start * 0.5, startTime);
    subOsc.frequency.exponentialRampToValueAtTime(Math.max(30, f0End * 0.5), startTime + duration);

    // Subtle vocal vibrato
    const vib = this.ctx.createOscillator();
    const vibGain = this.ctx.createGain();
    vib.frequency.setValueAtTime(5.8, startTime);
    vibGain.gain.setValueAtTime(4.5, startTime);
    vib.connect(vibGain);
    vibGain.connect(glottal.frequency);

    const sourceMix = this.ctx.createGain();
    sourceMix.gain.setValueAtTime(0.7, startTime);
    glottal.connect(sourceMix);
    subOsc.connect(sourceMix);

    // Optional consonant breath burst ("H" / "P") at syllable onset
    if (breathy) {
      const bufLen = Math.floor(this.ctx.sampleRate * 0.045);
      const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(volume * 0.5, startTime);
      nGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.045);
      noise.connect(nGain);
      nGain.connect(sourceMix);
      noise.start(startTime);
    }

    // 3 Parallel Vocal Tract Formant Filters (F1, F2, F3)
    const masterEnv = this.ctx.createGain();
    masterEnv.gain.setValueAtTime(0.001, startTime);
    masterEnv.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.025, duration * 0.25));
    masterEnv.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    const formantWeights = [1.0, 0.65, 0.28];
    const formantQs = [6.5, 8.0, 10.0];

    formants.forEach((freq, idx) => {
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(freq, startTime);
      bp.Q.setValueAtTime(formantQs[idx], startTime);

      const fGain = this.ctx.createGain();
      fGain.gain.setValueAtTime(formantWeights[idx], startTime);

      sourceMix.connect(bp);
      bp.connect(fGain);
      fGain.connect(masterEnv);
    });

    this._connectWithPan(masterEnv, panX);

    glottal.start(startTime);
    subOsc.start(startTime);
    vib.start(startTime);

    glottal.stop(startTime + duration + 0.01);
    subOsc.stop(startTime + duration + 0.01);
    vib.stop(startTime + duration + 0.01);
  }

  /**
   * Expressive Turkish Ice Cream Vendor Voice Reactions:
   * - 'hoppa': Energetic "Hop-paaa!" when twisting or dodging the cone
   * - 'laugh': Hearty "Ha-ha-ha-haa!" belly laugh when tricking the tourist with a fake cone/napkin
   * - 'taunt': Playful "Oooo-hop!" when swapping or flipping upside-down
   * - 'cheer': Warm "He-laaal!" when tourist slices or catches the full cone
   * - 'shock': Surprised "Haaay-da!" on early snatch
   */
  speakVendor(type = 'hoppa', ustaIdx = 1, panX = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const baseF0 = USTA_BASE_PITCH[ustaIdx % 3] || 118;

    if (type === 'hoppa') {
      // "HOP - PAAA!"
      this._playVocalSyllable(now, 0.11, baseF0 * 1.05, baseF0 * 1.25, 'O', 0.25, panX, true);
      this._playVocalSyllable(now + 0.13, 0.24, baseF0 * 1.38, baseF0 * 0.92, 'A', 0.28, panX, true);
    } else if (type === 'laugh') {
      // "HA - HA - HA - HAAA!"
      const syllables = [0, 0.13, 0.26, 0.40];
      syllables.forEach((offset, i) => {
        const dur = i === 3 ? 0.24 : 0.10;
        const pitchMult = 1.32 - i * 0.09;
        const vowel = i % 2 === 0 ? 'A' : 'O';
        this._playVocalSyllable(
          now + offset,
          dur,
          baseF0 * pitchMult,
          baseF0 * (pitchMult - 0.12),
          vowel,
          0.26,
          panX,
          true
        );
      });
    } else if (type === 'taunt') {
      // "OOOO - HOP!"
      this._playVocalSyllable(now, 0.18, baseF0 * 0.95, baseF0 * 1.3, 'O', 0.24, panX, false);
      this._playVocalSyllable(now + 0.2, 0.16, baseF0 * 1.35, baseF0 * 1.0, 'A', 0.26, panX, true);
    } else if (type === 'cheer') {
      // "HE - LAAAL!"
      this._playVocalSyllable(now, 0.12, baseF0 * 1.15, baseF0 * 1.25, 'E', 0.24, panX, true);
      this._playVocalSyllable(now + 0.14, 0.30, baseF0 * 1.45, baseF0 * 1.1, 'A', 0.28, panX, false);
    } else if (type === 'shock') {
      // "HAAAY - DA!"
      this._playVocalSyllable(now, 0.20, baseF0 * 1.45, baseF0 * 0.95, 'A', 0.27, panX, true);
      this._playVocalSyllable(now + 0.22, 0.18, baseF0 * 0.95, baseF0 * 0.78, 'O', 0.24, panX, true);
    }
  }

  // Tactile physical sound when tourist's fingers wrap & tug on the cone or prop
  playGripTug(panX = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.08);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    this._connectWithPan(gain, panX);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Suction pop when outer empty cone or napkin cone detaches into tourist's hand
  playConePop(panX = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(590, now + 0.065);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    this._connectWithPan(gain, panX);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playBell(intensity = 1.0, panX = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [1180, 1790, 2540, 3420];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f * (0.98 + Math.random() * 0.04), now);

      const peak = (0.13 / (idx + 1)) * intensity;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52 - idx * 0.08);

      osc.connect(gain);
      this._connectWithPan(gain, panX);
      osc.start(now);
      osc.stop(now + 0.56);
    });
  }

  playBellBurst() {
    this.playBell(1.0, -0.4);
    setTimeout(() => this.playBell(0.95, 0.4), 110);
    setTimeout(() => this.playBell(1.15, 0), 230);
  }

  playPaddleClank(panX = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(155, now + 0.09);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    this._connectWithPan(gain, panX);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playWhoosh(pitch = 1.0, panX = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.16);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320 * pitch, now);
    filter.frequency.exponentialRampToValueAtTime(920 * pitch, now + 0.12);
    filter.Q.value = 2.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    noise.connect(filter);
    filter.connect(gain);
    this._connectWithPan(gain, panX);
    noise.start(now);
  }

  playBoop(panX = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(410, now + 0.16);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    this._connectWithPan(gain, panX);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  playShowBoost(combo = 1, panX = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const base = 440 + Math.min(combo * 35, 350);
    [base, base * 1.25].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.13, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
      osc.connect(gain);
      this._connectWithPan(gain, panX);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.19);
    });
  }

  playScoopAdded() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [293.66, 311.13, 369.99, 392.0, 440.0];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * 2, now + i * 0.055);
      gain.gain.setValueAtTime(0.14, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.24);
    });
  }

  playPenalty() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [235, 190].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.11);
      gain.gain.setValueAtTime(0.13, now + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.22);
    });
  }

  playWinFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [440, 466.16, 554.37, 587.33, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.16, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.36);
    });
    this.playBell(0.85, 0);
  }

  startMusic() {
    if (!this.enabled || this.musicPlaying) return;
    this.init();
    if (!this.ctx) return;
    this.musicPlaying = true;
    this.beatStep = 0;

    const hijaz = [293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25, 587.33];
    const melodyPattern = [0, 2, 3, 4, 3, 2, 1, 0, 4, 5, 4, 3, 2, 3, 2, 0];

    const tick = () => {
      if (!this.musicPlaying || !this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const step = this.beatStep % 8;

      if (step === 0 || step === 4) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(112, now);
        osc.frequency.exponentialRampToValueAtTime(56, now + 0.11);
        g.gain.setValueAtTime(0.075, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (step === 2 || step === 6 || step === 7) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(185, now + 0.05);
        g.gain.setValueAtTime(0.04, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      }

      if (step % 2 === 0 || step === 5) {
        const noteIdx = melodyPattern[this.beatStep % melodyPattern.length];
        const freq = hijaz[noteIdx];
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.028, now);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.19);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }

      this.beatStep++;
      const intervalMs = Math.max(135, 220 / this.tempoMultiplier);
      this.musicTimer = setTimeout(tick, intervalMs);
    };

    tick();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
