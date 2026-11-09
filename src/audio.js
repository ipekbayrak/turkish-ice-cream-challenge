// Existing music/effects with sparse, light game-character reactions.

import { USTA_BASE_PITCH, VENDOR_REACTIONS, synthesizeVendorVocal, musicStepEvents, musicStepSeconds, synthesizeMusicNote } from './sound-palette.js';
import {MusicTransport} from './music-transport.js';
export { synthesizeVendorVocal } from './sound-palette.js';
export const VENDOR_VOICE_LIMITS = Object.freeze({ minGap: 3.2, repeatGap: 7, maxPerRound: 6 });
const CUE_GROUPS = { hmm: 'curious', taunt: 'curious', hirr: 'effort', hoppa: 'effort', eeeh: 'amused', laugh: 'amused', cik: 'small', cheer: 'happy', shock: 'surprise' };

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.beatStep = 0;
    this.tempoMultiplier = 1.0;
    this._iosUnlocked = false;
    this._unlockTokenContext=null;this._resumePending=null;this._musicRequested=false;
    this._observedContext = null;
    this.masterGain = null;
    this.musicGain = null;
    this.voiceGain = null;
    this.activeSources = new Set();
    this.sourceNodes = new WeakMap();
    this.pendingSounds = new Set();
    this.voiceUntil = 0;
    this.voiceVariation = 0;
    this.vendorSources = new Set();
    this.musicSources = new Map();
    this.musicBuffers = new Map();
    this.voiceCount = 0;
    this.lastVoiceAt = -Infinity;
    this.lastVoiceByGroup = new Map();

    // Live lip-sync envelope state for 3D vendor mouth, jaw, beard & mustache animation
    this.voiceSyllables = [];
  }

  init({resume=true}={}) {
    if(!this.enabled)return;
    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try {
        navigator.audioSession.type = 'playback';
      } catch {
        // Ignore on unsupported browsers
      }
    }
    if (!this.ctx) {
      const AudioCtx = globalThis.window?.AudioContext || globalThis.window?.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx) {
      this._setupMixer();
      if (this._observedContext !== this.ctx) {
        this._observedContext = this.ctx;
        const context=this.ctx;
        context.addEventListener?.('statechange',()=>{
          if(context!==this.ctx)return;
          if(!this._isOfflineContext()&&context.state!=='running'){this._iosUnlocked=false;this._unlockTokenContext=null;this._cancelScheduledSources();}
          if(context.state==='running'){
            // Suspension cancelled the lookahead sources. Requeue unheard beats
            // at their original grid positions, without moving the song clock.
            this.musicTransport?.resume();this._finishUnlock(context);
          }
          if(context.state==='closed'){const requested=this._musicRequested||this.musicPlaying;this.stopMusic();this._musicRequested=requested;}
        });
      }
    }
    if(resume&&this.ctx&&!this._isOfflineContext()&&['suspended','interrupted'].includes(this.ctx.state)&&!this._resumePending){
      const context=this.ctx;
      try{this._resumePending=Promise.resolve(context.resume()).then(()=>this._finishUnlock(context),()=>false).finally(()=>{if(this.ctx===context)this._resumePending=null;});}catch{/* Retry from a real gesture. */}
    }
    if(this._canScheduleAudio()&&!this._isOfflineContext()&&!this._iosUnlocked){this._primeUnlock(this.ctx);this._finishUnlock(this.ctx);}
  }

  _primeUnlock(context){
    if(this._unlockTokenContext===context)return;
    try{
      const token=this._trackSource(context.createBufferSource());token.buffer=context.createBuffer(1,1,22050);token.connect(context.destination);token.start(0);
      this._unlockToken=token;this._unlockTokenContext=context;
    }catch{this._unlockTokenContext=null;}
  }
  _discardUnlockToken(context){
    if(context!==this.ctx||context.state==='running')return;
    const token=this._unlockToken;
    if(token&&this.activeSources.has(token)){try{token.stop();}catch{}this._releaseSource(token);}
    this._unlockToken=null;this._unlockTokenContext=null;
  }
  _finishUnlock(context){
    if(context!==this.ctx||context.state!=='running'||!this.enabled)return false;
    this._iosUnlocked=this._unlockTokenContext===context;
    this.masterGain?.gain.setValueAtTime(1,context.currentTime);
    if(this._musicRequested&&!this.musicPlaying)this.startMusic();
    return true;
  }
  /** Called synchronously by the browser's actual click/touch/key event. The
   * silent activation token is the only source allowed before resume completes. */
  unlockFromGesture(){
    if(!this.enabled)return Promise.resolve(false);
    if(this.ctx?.state==='closed'){
      const elapsed=this.ctx.currentTime||0;this.lastVoiceAt-=elapsed;
      for(const[group,at]of this.lastVoiceByGroup)this.lastVoiceByGroup.set(group,at-elapsed);
      this._cancelScheduledSources();
      for(const mixer of[this.masterGain,this.musicGain,this.voiceGain])mixer?.disconnect?.();
      this.ctx=this.masterGain=this.musicGain=this.voiceGain=this._observedContext=null;
      this._iosUnlocked=false;this._unlockTokenContext=null;this._resumePending=null;this.musicBuffers.clear();
    }
    this.init({resume:false});const context=this.ctx;
    if(!context||this._isOfflineContext())return Promise.resolve(false);
    if(context.state==='running'&&this._iosUnlocked)return Promise.resolve(true);
    this._primeUnlock(context);
    try{
      // Resume is invoked now, not in a promise continuation after activation.
      const result=context.state==='running'?null:context.resume();
      return Promise.resolve(result).then(()=>this._finishUnlock(context),()=>{this._discardUnlockToken(context);return false;});
    }catch{this._discardUnlockToken(context);return Promise.resolve(false);}
  }

  _isOfflineContext() {
    return Boolean(this.ctx && typeof this.ctx.startRendering === 'function');
  }

  /** Suspended real contexts freeze currentTime; scheduling there would queue
   * old cues at one timestamp and release a burst on the next user gesture. */
  _canScheduleAudio() {
    return Boolean(this.enabled && this.ctx && this.ctx.state !== 'closed' &&
      (this.ctx.state === 'running' || this._isOfflineContext()));
  }

  _cancelScheduledSources() {
    this.pendingSounds.forEach(clearTimeout); this.pendingSounds.clear();
    for (const source of this.activeSources) {
      try { source.stop(); } catch { /* Ended or closed context. */ }
      this._releaseSource(source);
    }
    this.activeSources.clear(); this.vendorSources.clear(); this.musicSources.clear();
    this.voiceSyllables.length = 0; this.voiceUntil = 0;
  }

  /** Independent music and restrained character-reaction buses. */
  _setupMixer() {
    if (!this.ctx || this.masterGain) return;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.enabled ? 1 : 0;
    this.masterGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);
    this.voiceGain = this.ctx.createGain();
    // Character and music levels are independent; reactions stay understated.
    this.voiceGain.gain.value = 1.45;
    this.voiceGain.connect(this.masterGain);
  }

  _trackSource(source) {
    this.activeSources.add(source);
    this.sourceNodes.set(source, []);
    source.addEventListener('ended', () => this._releaseSource(source), { once: true });
    return source;
  }

  _trackTransientNodes(source, ...nodes) {
    const owned = this.sourceNodes.get(source);
    if (!owned) return;
    for (const node of nodes) {
      if (node !== source && node !== this.masterGain && node !== this.musicGain && node !== this.voiceGain) owned.push(node);
    }
  }

  _releaseSource(source) {
    source.disconnect();
    for (const node of this.sourceNodes.get(source) || []) node.disconnect();
    this.sourceNodes.delete(source);
    this.activeSources.delete(source);
  }

  _connectWithPan(node, panX = 0, bus = this.masterGain, source = node) {
    if (!this.ctx) return;
    this._trackTransientNodes(source, node);
    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      this._trackTransientNodes(source, panner);
      panner.pan.setValueAtTime(
        Math.max(-1, Math.min(1, panX * 1.4)),
        this.ctx.currentTime
      );
      node.connect(panner);
      panner.connect(bus || this.ctx.destination);
    } else {
      node.connect(bus || this.ctx.destination);
    }
  }

  setMuted(muted) {
    this.enabled = !muted;
    if (muted) {
      this.stopMusic();
      this._cancelScheduledSources();
    } else {
      this.unlockFromGesture();
    }
    if (this.masterGain) this.masterGain.gain.setValueAtTime(this.enabled ? 1 : 0, this.ctx.currentTime);
    return this.enabled;
  }

  toggle() {
    const enabled = this.setMuted(this.enabled);
    if (enabled) this.startMusic();
    return enabled;
  }

  /**
   * Returns 0..1 live jaw/mouth openness for 3D Vendor Lip-Sync animation
   */
  getVoiceMouthOpen() {
    if (!this._canScheduleAudio() || this.voiceSyllables.length === 0) return 0;
    const now = this.ctx.currentTime;
    let openness = 0;
    for (let i = this.voiceSyllables.length - 1; i >= 0; i--) {
      const s = this.voiceSyllables[i];
      if (now > s.end) {
        this.voiceSyllables.splice(i, 1);
      } else if (now >= s.start) {
        const p = (now - s.start) / Math.max(0.01, s.end - s.start);
        const trilled = s.trill
          ? 0.65 + 0.35 * Math.sin((now - s.start) * Math.PI * 2 * 26)
          : 1.0;
        const env = Math.sin(p * Math.PI) * s.intensity * trilled;
        if (env > openness) openness = env;
      }
    }
    return Math.min(1, openness);
  }

  /** Start once per round/order, never once per trick. No reactions are queued. */
  beginRound() {
    this.vendorSources.forEach(source => {
      try { source.stop(); } catch { /* Already finished. */ }
      this._releaseSource(source);
    });
    this.vendorSources.clear();
    this.voiceSyllables.length = 0;
    this.voiceUntil = 0;
    this.voiceCount = 0;
    this.lastVoiceAt = -Infinity;
    this.lastVoiceByGroup.clear();
    if (this.musicGain) {
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(1, this.ctx.currentTime);
    }
  }

  /** Play one short wordless hum/chuckle at the usta's position. */
  _playVendorGesture(gesture, basePitch, panX, seed) {
    if (!this._canScheduleAudio()) return false;
    const now = this.ctx.currentTime + (gesture.offset || 0);
    const samples = synthesizeVendorVocal(this.ctx.sampleRate, basePitch, gesture, seed);
    const buffer = this.ctx.createBuffer(1, samples.length, this.ctx.sampleRate);
    buffer.getChannelData(0).set(samples);
    const source = this._trackSource(this.ctx.createBufferSource());
    source.buffer = buffer;
    this.vendorSources.add(source);
    source.addEventListener('ended', () => this.vendorSources.delete(source), { once: true });
    // The source already contains its short, soft attack/release envelope.
    this._connectWithPan(source, panX, this.voiceGain);
    source.start(now);
    source.stop(now + gesture.duration + .01);
    this.voiceSyllables.push({
      start: now, end: now + gesture.duration,
      intensity: gesture.mouth || .25,
      trill: false,
    });
  }

  /**
   * Returns true only when a reaction was accepted. Most micro-events stay quiet:
   * at least 3.2 s apart, 7 s per semantic group, and at most 6 per round.
   */
  speakVendor(type = 'hoppa', ustaIdx = 1, panX = 0) {
    if (!this.enabled) return false;
    this.init();
    if (!this._canScheduleAudio()) return false;
    const now = this.ctx.currentTime;
    const key = VENDOR_REACTIONS[type] ? type : 'hoppa';
    const group = CUE_GROUPS[key];
    if (this.voiceCount >= VENDOR_VOICE_LIMITS.maxPerRound ||
        now - this.lastVoiceAt < VENDOR_VOICE_LIMITS.minGap ||
        now - (this.lastVoiceByGroup.get(group) ?? -Infinity) < VENDOR_VOICE_LIMITS.repeatGap) return false;
    const vendor = Math.abs(Math.round(ustaIdx)) % USTA_BASE_PITCH.length;
    const variation = ++this.voiceVariation;
    const gestures = VENDOR_REACTIONS[key];
    gestures.forEach((gesture, index) => this._playVendorGesture(gesture, USTA_BASE_PITCH[vendor], panX, variation * 83 + index * 17 + vendor * 971));
    const phraseEnd = now + Math.max(...gestures.map(gesture => (gesture.offset || 0) + gesture.duration));
    this.voiceUntil = phraseEnd;
    this.voiceCount++;
    this.lastVoiceAt = now;
    this.lastVoiceByGroup.set(group, now);
    // A small dip, not a dramatic interruption of the original accompaniment.
    const music = this.musicGain.gain;
    music.cancelScheduledValues(now);
    music.setValueAtTime(music.value, now);
    music.linearRampToValueAtTime(.68, now + .025);
    music.setValueAtTime(.68, phraseEnd);
    music.linearRampToValueAtTime(1, phraseEnd + .12);
    return true;
  }

  /**
   * Subtle bazaar spectator reactions (applause claps, gasps, chuckles)
   */
  playCrowdReaction(kind = 'cheer') {
    if (!this.enabled) return;
    this.init();
    if (!this._canScheduleAudio()) return;
    const now = this.ctx.currentTime;

    if (kind === 'cheer') {
      // Rhythmic bazaar hand-claps from left & right spectators
      for (let i = 0; i < 5; i++) {
        const offset = i * 0.075 + Math.random() * 0.02;
        const bufLen = Math.floor(this.ctx.sampleRate * 0.04);
        const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let k = 0; k < bufLen; k++) {
          data[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / bufLen, 2);
        }
        const src = this._trackSource(this.ctx.createBufferSource());
        src.buffer = buf;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1100 + (i % 2) * 350, now + offset);
        bp.Q.value = 3.0;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.09, now + offset);
        g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.04);
        src.connect(bp);
        bp.connect(g);
        this._connectWithPan(g, i % 2 === 0 ? -0.65 : 0.65, this.masterGain, src);
        src.start(now + offset);
      }
    } else if (kind === 'gasp' || kind === 'chuckle') {
      // A discreet wooden/plucked response replaces the old ghostly crowd vowels.
      const osc = this._trackSource(this.ctx.createOscillator());
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(kind === 'gasp' ? 370 : 440, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + .08);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.linearRampToValueAtTime(.022, now + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .085);
      osc.connect(gain);
      this._connectWithPan(gain, kind === 'gasp' ? -.35 : .35, this.masterGain, osc);
      osc.start(now);
      osc.stop(now + .09);
    }
  }

  // Crisp wafer slide & nest sound when double cones lock or separate
  playWaferSlide(panX = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this._canScheduleAudio()) return;

    const now = this.ctx.currentTime;
    const osc = this._trackSource(this.ctx.createOscillator());
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.11);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g);
    this._connectWithPan(g, panX, this.masterGain, osc);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  // Tactile physical sound when tourist's fingers wrap & tug on the cone or prop
  playGripTug(panX = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this._canScheduleAudio()) return;

    const now = this.ctx.currentTime;
    const osc = this._trackSource(this.ctx.createOscillator());
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.08);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    this._connectWithPan(gain, panX, this.masterGain, osc);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Suction pop when outer empty cone or napkin cone detaches into tourist's hand
  playConePop(panX = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this._canScheduleAudio()) return;

    const now = this.ctx.currentTime;
    const osc = this._trackSource(this.ctx.createOscillator());
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(590, now + 0.065);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    this._connectWithPan(gain, panX, this.masterGain, osc);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playBell(intensity = 1.0, panX = 0) {
    this.playBellNote(3, intensity, panX);
  }

  playBellNote(bellIdx = 3, intensity = 1.0, panX = 0) {
    this.syncMusicBeat();
    if (!this.enabled) return;
    this.init();
    if (!this._canScheduleAudio()) return;

    // Same metallic bell voice in the intro, normal play and melody replies.
    // Only the physical bell's size changes its pitch.
    const bellScale = [0.82, 0.9, 1.0, 1.12, 1.22, 1.35, 1.5];
    const pitchScale = bellScale[Math.abs(bellIdx) % bellScale.length] || 1.0;

    const now = this.ctx.currentTime;
    const freqs=[1180,1790,2540,3420];
    freqs.forEach((f, idx) => {
      const osc = this._trackSource(this.ctx.createOscillator());
      const gain = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(
        f * pitchScale * (0.99 + Math.random() * 0.02),
        now
      );

      const peak = (0.14 / (idx + 1)) * intensity;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.56 - idx * 0.08);

      osc.connect(gain);
      this._connectWithPan(gain, panX, this.masterGain, osc);
      osc.start(now);
      osc.stop(now + 0.6);
    });
  }

  // A short contact transient plus damped resonances, rather than a pitched swoop.
  _playSurfaceImpact(panX = 0, pitchMult = 1, metal = false) {
    if (!this.enabled) return;
    this.init(); if (!this._canScheduleAudio()) return;
    const now=this.ctx.currentTime;
    if (!this.surfaceNoise || this.surfaceNoiseRate!==this.ctx.sampleRate) {
      this.surfaceNoiseRate=this.ctx.sampleRate;
      this.surfaceNoise=this.ctx.createBuffer(1,Math.ceil(this.ctx.sampleRate*.026),this.ctx.sampleRate);
      const samples=this.surfaceNoise.getChannelData(0);
      for(let i=0;i<samples.length;i++) samples[i]=(Math.random()*2-1)*Math.pow(1-i/samples.length,3);
    }
    const noise=this._trackSource(this.ctx.createBufferSource()); noise.buffer=this.surfaceNoise;
    const filter=this.ctx.createBiquadFilter(); filter.type='bandpass'; filter.frequency.value=metal?3800:1900; filter.Q.value=.65;
    const strike=this.ctx.createGain(); strike.gain.setValueAtTime(metal?.10:.085,now);strike.gain.exponentialRampToValueAtTime(.0001,now+.025);
    noise.connect(filter);filter.connect(strike);this._connectWithPan(strike,panX,this.masterGain,noise);noise.start(now);noise.stop(now+.028);
    const modes=metal?[[710,.055,.13],[1580,.028,.08],[2670,.013,.045]]:[[185,.075,.065],[427,.026,.040],[735,.012,.025]];
    for(const [hz,level,decay] of modes){
      const osc=this._trackSource(this.ctx.createOscillator()),gain=this.ctx.createGain();osc.type='sine';
      osc.frequency.setValueAtTime(hz*pitchMult,now);gain.gain.setValueAtTime(level,now);gain.gain.exponentialRampToValueAtTime(.0001,now+decay);
      osc.connect(gain);this._connectWithPan(gain,panX,this.masterGain,osc);osc.start(now);osc.stop(now+decay+.01);
    }
  }

  playCounterRap(panX = 0, pitchMult = 1) { this.syncMusicBeat();this._playSurfaceImpact(panX, pitchMult, false); }

  playBellBurst() {
    if (!this.enabled) return;
    this.init(); if (!this._canScheduleAudio()) return;
    this.playBell(1.0, -0.4);
    [[110, 0.95, 0.4], [230, 1.15, 0]].forEach(([delay, intensity, pan]) => {
      const timer = setTimeout(() => {
        this.pendingSounds.delete(timer);
        if (this.enabled) this.playBell(intensity, pan);
      }, delay);
      this.pendingSounds.add(timer);
    });
  }

  playPaddleClank(panX = 0) { this._playSurfaceImpact(panX, 1, true); }

  playWhoosh(pitch = 1.0, panX = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this._canScheduleAudio()) return;

    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.16);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const noise = this._trackSource(this.ctx.createBufferSource());
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
    this._connectWithPan(gain, panX, this.masterGain, noise);
    noise.start(now);
  }

  playBoop(panX = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this._canScheduleAudio()) return;

    const now = this.ctx.currentTime;
    const osc = this._trackSource(this.ctx.createOscillator());
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(410, now + 0.16);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    this._connectWithPan(gain, panX, this.masterGain, osc);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  playShowBoost(combo = 1, panX = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this._canScheduleAudio()) return;

    const now = this.ctx.currentTime;
    const base = 440 + Math.min(combo * 35, 350);
    [base, base * 1.25].forEach((freq, i) => {
      const osc = this._trackSource(this.ctx.createOscillator());
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.13, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
      osc.connect(gain);
      this._connectWithPan(gain, panX, this.masterGain, osc);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.19);
    });
  }

  playScoopAdded() {
    if (!this.enabled) return;
    this.init();
    if (!this._canScheduleAudio()) return;

    const now = this.ctx.currentTime;
    const notes = [293.66, 311.13, 369.99, 392.0, 440.0];
    notes.forEach((freq, i) => {
      const osc = this._trackSource(this.ctx.createOscillator());
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * 2, now + i * 0.055);
      gain.gain.setValueAtTime(0.14, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      this._trackTransientNodes(osc, gain);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.24);
    });
  }

  playPenalty() {
    if (!this.enabled) return;
    this.init();
    if (!this._canScheduleAudio()) return;

    const now = this.ctx.currentTime;
    [235, 190].forEach((freq, i) => {
      const osc = this._trackSource(this.ctx.createOscillator());
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.11);
      gain.gain.setValueAtTime(0.13, now + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      this._trackTransientNodes(osc, gain);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.22);
    });
  }

  playWinFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this._canScheduleAudio()) return;

    const now = this.ctx.currentTime;
    const notes = [440, 466.16, 554.37, 587.33, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = this._trackSource(this.ctx.createOscillator());
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.16, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      this._trackTransientNodes(osc, gain);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.36);
    });
    this.playBell(0.85, 0);
    this.playCrowdReaction('cheer');
  }

  _playMusicStep(step, at) {
    if (!this._canScheduleAudio()) return false;
    at ??= this.ctx.currentTime;
    for (const event of musicStepEvents(step)) {
      const key = `${this.ctx.sampleRate}:${event.kind}:${event.frequency}:${event.peak}`;
      let buffer = this.musicBuffers.get(key);
      if (!buffer) {
        const pcm = synthesizeMusicNote(this.ctx.sampleRate, event);
        buffer = this.ctx.createBuffer(1, pcm.length, this.ctx.sampleRate);
        buffer.getChannelData(0).set(pcm);
        this.musicBuffers.set(key, buffer);
      }
      const source = this._trackSource(this.ctx.createBufferSource());
      const gain = this.ctx.createGain();
      source.buffer = buffer; source.connect(gain);
      this._connectWithPan(gain, event.pan, this.musicGain, source);
      this.musicSources.set(source, gain);
      source.addEventListener('ended', () => this.musicSources.delete(source), {once:true});
      source.start(at); source.stop(at + event.duration + .01);
    }
  }

  /** The song owns the grid; gameplay samples its audio transport. */
  bindRhythmClock(clock) {
    const resume=this.musicPlaying;this.stopMusic();
    this.rhythmClock=clock;
    this.musicTransport=this.ctx&&clock?.bindTimeSource?new MusicTransport(clock,()=>this.ctx):null;
    if(resume)this.startMusic();
  }

  playRhythmNotes(notes=[]) {
    if(this.musicTransport)return; // Already scheduled ahead on the audio clock.
    if(!this.musicPlaying||!this.enabled||!this._canScheduleAudio())return;
    for(const note of notes)this._playMusicStep(note.step);
  }

  syncMusicBeat() {
    // Legacy effect hooks deliberately cannot rephase the accompaniment.
  }

  setBackgroundPaused(paused){
    if(paused===this._backgroundPaused)return;
    this._backgroundPaused=paused;this.musicTransport?.setPaused(paused);
    if(paused){this._backgroundMusicRequested=this._musicRequested||this.musicPlaying;this.stopMusic();}
    else if(this._backgroundMusicRequested){this._backgroundMusicRequested=false;this.startMusic();}
  }

  startMusic() {
    if(this.enabled)this._musicRequested=true;
    if (!this.enabled || this.musicPlaying) return;
    this.musicPlaying=true;
    this.init();
    if (!this.ctx) {this.musicPlaying=false;return;}
    this.beatStep = 0;
    if(!this.musicTransport&&this.rhythmClock?.bindTimeSource)this.musicTransport=new MusicTransport(this.rhythmClock,()=>this.ctx);
    if(this.musicTransport){
      this.musicTransport.resume();
      const tick=()=>{
        if(!this.musicPlaying||!this.enabled)return;
        if(this._canScheduleAudio())this.musicTransport.schedule((step,at)=>this._playMusicStep(step,at));
        this.musicTimer=setTimeout(tick,25);
      };
      tick();return;
    }
    if(this.rhythmClock)return;
    const tick = () => {
      if (!this.musicPlaying || !this.enabled || !this.ctx) return;
      if (!this._canScheduleAudio()) {
        if (this.ctx.state === 'closed') { this.stopMusic(); return; }
        // Keep the music request, not missed notes. No source or beat advances.
        this.musicTimer = setTimeout(tick, 200);
        return;
      }
      this._playMusicStep(this.beatStep);
      const seconds = musicStepSeconds(this.beatStep, this.tempoMultiplier);
      this.beatStep++;
      this.musicTimer = setTimeout(tick, seconds * 1000);
    };
    tick();
  }

  stopMusic() {
    this._musicRequested=false;
    this.musicPlaying = false;
    if (this.musicTimer !== null) { clearTimeout(this.musicTimer); this.musicTimer = null; }
    // Only accompaniment tails are stopped; gameplay cues and the vendor remain.
    const now = this.ctx?.currentTime || 0;
    for (const [source, gain] of this.musicSources) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + .018);
      try { source.stop(now + .02); } catch { /* Already ended. */ }
    }
    this.musicSources.clear();
  }

}
