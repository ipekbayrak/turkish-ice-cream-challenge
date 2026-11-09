import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SoundEngine, synthesizeVendorVocal, VENDOR_VOICE_LIMITS } from '../src/audio.js';

class Param {
  value = 1;
  calls = [];
  setValueAtTime(v, t) { this.value = v; this.calls.push(['set', v, t]); }
  linearRampToValueAtTime(v, t) { this.value = v; this.calls.push(['linear', v, t]); }
  exponentialRampToValueAtTime(v, t) { this.value = v; this.calls.push(['exponential', v, t]); }
  cancelScheduledValues(t) { this.calls.push(['cancel', t]); }
}
class Node {
  constructor(context, kind) {
    this.context = context; this.kind = kind; this.connections = [];
    for (const key of ['gain', 'frequency', 'Q', 'pan']) this[key] = new Param();
    context.nodes.push(this);
  }
  connect(to) { this.connections.push(to); }
  disconnect() { this.connections = []; }
  addEventListener(event, cb) { if (event === 'ended') (this.endListeners ||= []).push(cb); }
  start(at = 0) { this.started = true; this.startAt = at; }
  stop(at = 0) { if (at <= this.context.currentTime) this.cancelled = true; this.stopAt = at; }
  finish() { this.endListeners?.forEach(fn => fn()); }
}
class Context {
  constructor() { this.currentTime = 0; this.sampleRate = 16000; this.state = 'suspended'; this.nodes = []; this.destination = {}; this.resumes = 0; }
  createGain() { return new Node(this, 'gain'); }
  createOscillator() { return new Node(this, 'oscillator'); }
  createBufferSource() { return new Node(this, 'buffer'); }
  createStereoPanner() { return new Node(this, 'panner'); }
  createBiquadFilter() { return new Node(this, 'filter'); }
  createBuffer(channels, len) { const samples = new Float32Array(len); return { getChannelData: () => samples }; }
  resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); }
}
let originalWindow;
const sounds = [];
function sound() { const s = new SoundEngine(); sounds.push(s); s.init(); return s; }
beforeEach(() => { originalWindow = globalThis.window; globalThis.window = { AudioContext: Context }; });
afterEach(() => { sounds.splice(0).forEach(s => s.setMuted(true)); if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; });

test('gesture init resumes the context and creates exactly one audio mixer', () => {
  const s = sound(); const master = s.masterGain;
  assert.equal(s.ctx.state, 'running'); assert.equal(s.ctx.resumes, 1);
  assert.ok(s.voiceGain.gain.value >= .8 && s.voiceGain.gain.value <= 1.6);
  s.init(); assert.equal(s.masterGain, master); assert.equal(s.ctx.resumes, 1);
  s.ctx.state = 'interrupted'; s.unlockFromGesture(); assert.equal(s.ctx.resumes, 2);
});

test('hmm, hirr and hoppa cue names produce audible nonverbal buffers with mouth envelopes', () => {
  for (const phrase of ['hmm', 'hirr', 'hoppa']) {
    const s = sound(); s.speakVendor(phrase, 1, 0);
    const vocal = s.ctx.nodes.filter(n => n.kind === 'buffer' && n.started && n.buffer.getChannelData(0).length > 1);
    assert.ok(vocal.length >= 1);
    assert.ok(vocal.every(n => n.buffer.getChannelData(0).some(value => Math.abs(value) > .01)));
    assert.ok(s.voiceSyllables.length >= 1);
    assert.equal(s.ctx.nodes.filter(n => n.kind === 'oscillator').length, 0, 'vendor avoids the old sawtooth speech path');
    s.ctx.currentTime = .07; assert.ok(s.getVoiceMouthOpen() > 0);
    s.ctx.currentTime = 2; assert.equal(s.getVoiceMouthOpen(), 0);
  }
});

test('character level is separate and music ducks mildly only during the reaction', () => {
  const s = sound(); s.speakVendor('hoppa');
  assert.ok(s.voiceGain.connections.includes(s.masterGain));
  assert.ok(s.musicGain.connections.includes(s.masterGain));
  assert.ok(s.musicGain.gain.calls.some(([kind, value]) => kind === 'linear' && value > .5 && value < 1));
  const recovery = s.musicGain.gain.calls.at(-1);
  assert.equal(recovery[0], 'linear'); assert.equal(recovery[1], 1);
  assert.ok(recovery[2] > s.voiceUntil);
});

test('voice cooldown prevents overlapping phrases without suppressing later reactions', () => {
  const s = sound(); s.speakVendor('hoppa');
  const count = s.voiceSyllables.length;
  s.speakVendor('laugh'); assert.equal(s.voiceSyllables.length, count);
  s.ctx.currentTime = VENDOR_VOICE_LIMITS.minGap + .01;
  s.speakVendor('laugh'); assert.ok(s.voiceSyllables.length > count);
});

test('muting cancels active and future voice/effects, lip sync, music and pending bells', () => {
  const s = sound(); s.startMusic(); s.speakVendor('laugh'); s.playBellBurst();
  const sources = [...s.activeSources];
  assert.ok(sources.some(n => n.startAt > 0)); assert.equal(s.pendingSounds.size, 2);
  s.setMuted(true);
  assert.equal(s.masterGain.gain.value, 0); assert.equal(s.activeSources.size, 0);
  assert.ok(sources.every(n => n.cancelled));
  assert.equal(s.getVoiceMouthOpen(), 0); assert.equal(s.musicPlaying, false);
  assert.equal(s.musicTimer, null); assert.equal(s.pendingSounds.size, 0);
  const nodes = s.ctx.nodes.length; s.speakVendor(); s.playBell(); s.startMusic();
  assert.equal(s.ctx.nodes.length, nodes);
});

test('unmute preserves music without bypassing reaction limits; a new round resets them', () => {
  const s = sound(); s.speakVendor('hmm'); s.toggle();
  assert.equal(s.enabled, false);
  s.toggle(); assert.equal(s.enabled, true); assert.equal(s.musicPlaying, true);
  assert.equal(s.masterGain.gain.value, 1);
  assert.equal(s.speakVendor('hoppa'), false);
  s.beginRound(); assert.equal(s.speakVendor('hoppa'), true); assert.equal(s.voiceSyllables.length, 1);
  s.stopMusic(); assert.equal(s.musicPlaying, false); assert.equal(s.musicTimer, null);
});

test('finished sources leave the active cancellation registry', () => {
  const s = sound(); s.playConePop();
  const source = [...s.activeSources].at(-1), count = s.activeSources.size;
  source.finish(); assert.equal(s.activeSources.size, count - 1);
  assert.deepEqual(source.connections, []);
});

const transientMixNodes=s=>s.ctx.nodes.filter(node=>
 ['gain','panner'].includes(node.kind)&&![s.masterGain,s.musicGain,s.voiceGain].includes(node));
const assertMixerConnected=s=>{
 assert.deepEqual(s.masterGain.connections,[s.ctx.destination]);
 assert.deepEqual(s.musicGain.connections,[s.masterGain]);
 assert.deepEqual(s.voiceGain.connections,[s.masterGain]);
};

test('finished notes and effects release their own gain/pan connections on every cycle',()=>{
 const s=sound();
 const effects=['playWaferSlide','playGripTug','playConePop','playBellNote','playCounterRap','playPaddleClank','playWhoosh','playBoop','playShowBoost','playScoopAdded','playPenalty','playWinFanfare'];
 for(let cycle=0;cycle<8;cycle++){
  s.beginRound();s.speakVendor('laugh');s._playMusicStep(cycle);
  effects.forEach(effect=>s[effect]());
  [...s.activeSources].forEach(source=>source.finish());
  assert.equal(s.activeSources.size,0);assert.equal(s.musicSources.size,0);assert.equal(s.vendorSources.size,0);
  assert.ok(transientMixNodes(s).every(node=>node.connections.length===0),`cycle ${cycle}`);
  assertMixerConnected(s);
 }
});

test('cancel and round reset clean only owned nodes while music keeps its existing fade',()=>{
 const s=sound();s.startMusic();
 const music=[...s.musicSources.keys()],musicNodes=transientMixNodes(s);
 s.playConePop();const effects=[...s.activeSources].filter(source=>!music.includes(source));
 const voiceStart=s.ctx.nodes.length;s.speakVendor('laugh');
 const voiceNodes=s.ctx.nodes.slice(voiceStart).filter(node=>node.kind==='panner');
 s.beginRound();assert.ok(voiceNodes.every(node=>node.connections.length===0));
 assert.ok(effects.every(source=>!source.cancelled));assertMixerConnected(s);
 s.stopMusic();
 assert.ok(music.every(source=>source.stopAt===.02));
 assert.ok(musicNodes.every(node=>node.connections.length>0),'the existing fade must finish before disconnect');
 music.forEach(source=>source.finish());
 assert.ok(musicNodes.every(node=>node.connections.length===0));
 for(let cycle=0;cycle<8;cycle++){
  s.setMuted(false);s.playBellBurst();s.playWhoosh();s.setMuted(true);
  assert.equal(s.activeSources.size,0);assert.equal(s.pendingSounds.size,0);
  assert.ok(transientMixNodes(s).every(node=>node.connections.length===0));assertMixerConnected(s);
 }
});

test('the direct mixer fallback also releases per-note gains without a stereo panner',()=>{
 const s=sound();s.ctx.createStereoPanner=undefined;s.playConePop();s._playMusicStep(0);
 [...s.activeSources].forEach(source=>source.finish());
 assert.ok(transientMixNodes(s).every(node=>node.connections.length===0));assertMixerConnected(s);
});


test('soft toy source stays quiet, bright and free of subharmonic growls', () => {
  const gesture = { duration: .16, pitch: [1.02, 1.2, 1.12], volume: .72 };
  const sampleRate = 16000;
  const samples = synthesizeVendorVocal(sampleRate, 320, gesture, 83);
  let squareSum = 0, peak = 0;
  for (const sample of samples) { assert.ok(Number.isFinite(sample)); squareSum += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
  const rms = Math.sqrt(squareSum / sampleRate); // One-second mix, including the silence.
  assert.ok(rms > .002 && rms < .012, `one-second RMS ${rms}`);
  assert.ok(peak < .04 && peak > .015, `Peak ${peak}`);
  assert.equal(samples[0], 0); assert.equal(samples.at(-1), 0);
  assert.deepEqual(samples, synthesizeVendorVocal(sampleRate, 320, gesture, 83));
  assert.notDeepEqual(samples, synthesizeVendorVocal(sampleRate, 320, gesture, 84));
  assert.notDeepEqual(samples, synthesizeVendorVocal(sampleRate, 285, gesture, 83));
  const energyAt = frequency => {
    let real = 0, imaginary = 0;
    for (let i = 0; i < samples.length; i++) { const phase = 2 * Math.PI * frequency * i / sampleRate; real += samples[i] * Math.cos(phase); imaginary += samples[i] * Math.sin(phase); }
    return real * real + imaginary * imaginary;
  };
  let bass = 0, bright = 0;
  for (let f = 40; f <= 180; f += 20) bass += energyAt(f);
  for (let f = 240; f <= 1400; f += 20) bright += energyAt(f);
  assert.ok(bass / bright < .01, `bass/bright ${bass / bright}`);
});

test('all existing vendor reaction keys retain generated audio and spatial panning', () => {
  for (const key of ['hmm', 'hirr', 'hoppa', 'eeeh', 'cik', 'laugh', 'taunt', 'cheer', 'shock']) {
    const s = sound(); s.speakVendor(key, 2, -.3);
    assert.ok(s.voiceSyllables.length > 0, key);
    assert.ok(s.ctx.nodes.some(n => n.kind === 'panner' && n.pan.calls.some(call => call[1] < 0)), key);
  }
});


test('global spacing and semantic dedup reject micro-events without queuing audio', () => {
  const s = sound(); s.beginRound();
  assert.equal(s.speakVendor('hoppa'), true);
  const count = s.ctx.nodes.length;
  s.ctx.currentTime = 1; assert.equal(s.speakVendor('laugh'), false);
  s.ctx.currentTime = 3.3; assert.equal(s.speakVendor('hirr'), false, 'same effort group');
  assert.equal(s.ctx.nodes.length, count);
  s.ctx.currentTime = 7.1; assert.equal(s.speakVendor('hirr'), true);
  assert.equal(s.voiceCount, 2);
});

test('round cap stays bounded even after a long wait and resets only on beginRound', () => {
  const s = sound(); s.beginRound();
  for (let i = 0; i < VENDOR_VOICE_LIMITS.maxPerRound; i++) { s.ctx.currentTime = i * 8; assert.equal(s.speakVendor('hmm'), true); }
  s.ctx.currentTime = 1000; assert.equal(s.speakVendor('cheer'), false);
  assert.equal(s.voiceCount, VENDOR_VOICE_LIMITS.maxPerRound);
  s.beginRound(); assert.equal(s.voiceCount, 0); assert.equal(s.speakVendor('hmm'), true);
});

test('beginRound cancels only pending character reactions and closes old lip envelopes', () => {
  const s = sound(); s.playBell(); const effects = [...s.activeSources];
  s.speakVendor('laugh'); const voices = [...s.vendorSources];
  assert.ok(voices.length > 1);
  s.beginRound();
  assert.ok(voices.every(source => source.cancelled));
  assert.ok(effects.every(source => !source.cancelled));
  assert.equal(s.voiceSyllables.length, 0);
  assert.equal(s.vendorSources.size, 0);
});

test('crowd mistake reactions are soft tactile tones with no vendor lip motion', () => {
  const s = sound(); s.playCrowdReaction('gasp'); s.playCrowdReaction('chuckle');
  assert.equal(s.voiceSyllables.length, 0);
  assert.equal(s.voiceCount, 0);
  const oscillators = s.ctx.nodes.filter(node => node.kind === 'oscillator');
  assert.equal(oscillators.length, 2);
  assert.ok(oscillators.every(node => node.type === 'sine'));
});

test('music stop fades only accompaniment tails and leaves reaction/cue sources alone',()=>{
 const s=sound();s.startMusic();const music=[...s.musicSources.keys()];
 s.playBell();s.speakVendor('hmm');const protectedSources=[...s.activeSources].filter(source=>!music.includes(source));
 assert.ok(music.length>=2);s.stopMusic();
 assert.equal(s.musicPlaying,false);assert.equal(s.musicTimer,null);assert.equal(s.musicSources.size,0);
 assert.ok(music.every(source=>source.stopAt<=.021));
 assert.ok(protectedSources.every(source=>!source.cancelled));
});

test('music restart cannot duplicate timers and reuses the bounded note buffer cache',()=>{
 const s=sound();s.startMusic();const timer=s.musicTimer,size=s.musicSources.size;
 s.startMusic();assert.equal(s.musicTimer,timer);assert.equal(s.musicSources.size,size);
 for(let i=0;i<64;i++)s._playMusicStep(i,i*.22);
 assert.ok(s.musicBuffers.size<32,`${s.musicBuffers.size} PCM notes`);
 const count=s.musicBuffers.size;s.stopMusic();s.startMusic();assert.equal(s.musicBuffers.size,count);
 s.setMuted(true);assert.equal(s.musicSources.size,0);assert.equal(s.activeSources.size,0);
});
