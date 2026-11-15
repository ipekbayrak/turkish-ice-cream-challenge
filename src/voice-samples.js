/**
 * Hybrid Human Voice Sample Bank (`VoiceSampleBank`).
 * Supports real Turkish Maraş vendor audio clips (`hoppa`, `laugh`, `shock`, `cheer`, `taunt`, `cik`)
 * with RMS lip-sync envelope extraction and instant zero-latency fallback to procedural
 * `synthesizeVendorVocal` whenever a clip is absent or still loading.
 */

export const SUPPORTED_VOICE_CUES = Object.freeze([
  'hoppa',
  'laugh',
  'shock',
  'cheer',
  'taunt',
  'cik',
  'hmm',
  'eeeh',
  'hirr',
]);

export function extractRmsSyllables(audioBuffer, sliceSeconds = 0.06) {
  if (!audioBuffer || typeof audioBuffer.getChannelData !== 'function') {
    return [{ offset: 0, duration: 0.25, intensity: 0.55 }];
  }
  const sampleRate = Math.max(8000, Number(audioBuffer.sampleRate) || 22050);
  const channel = audioBuffer.getChannelData(0);
  const totalSamples = channel.length;
  if (totalSamples <= 0) {
    return [{ offset: 0, duration: 0.2, intensity: 0.4 }];
  }

  const windowSize = Math.max(256, Math.floor(sampleRate * sliceSeconds));
  const syllables = [];
  for (let start = 0; start < totalSamples; start += windowSize) {
    const end = Math.min(totalSamples, start + windowSize);
    let sumSq = 0;
    for (let i = start; i < end; i++) {
      sumSq += channel[i] * channel[i];
    }
    const rms = Math.sqrt(sumSq / Math.max(1, end - start));
    const intensity = Math.min(1, rms * 3.4);
    if (intensity > 0.04) {
      syllables.push({
        offset: start / sampleRate,
        duration: (end - start) / sampleRate,
        intensity,
      });
    }
  }
  if (syllables.length === 0) {
    syllables.push({
      offset: 0,
      duration: Math.max(0.12, totalSamples / sampleRate),
      intensity: 0.45,
    });
  }
  return syllables;
}

export class VoiceSampleBank {
  constructor() {
    this.samples = new Map();
    this._loading = new Set();
  }

  hasSample(cueKey) {
    const list = this.samples.get(cueKey);
    return Array.isArray(list) && list.length > 0;
  }

  registerSample(cueKey, audioBuffer) {
    if (!cueKey || !audioBuffer) return false;
    const duration = Number(audioBuffer.duration) ||
      (audioBuffer.getChannelData?.(0)?.length || 0) / (Number(audioBuffer.sampleRate) || 22050);
    const entry = {
      buffer: audioBuffer,
      duration: Math.max(0.08, duration),
      syllables: extractRmsSyllables(audioBuffer),
    };
    const list = this.samples.get(cueKey) || [];
    list.push(entry);
    this.samples.set(cueKey, list);
    return true;
  }

  pickSample(cueKey, variation = 0) {
    const list = this.samples.get(cueKey);
    if (!Array.isArray(list) || list.length === 0) return null;
    const idx = Math.abs(Math.round(variation)) % list.length;
    return list[idx];
  }

  async preloadFromManifest(audioCtx, manifest = null, fetchImpl = globalThis.fetch) {
    const map = manifest || globalThis.window?.__MARAS_VOICE_MANIFEST__;
    if (!audioCtx || !map || typeof map !== 'object' || typeof fetchImpl !== 'function') {
      return 0;
    }
    let loaded = 0;
    const entries = Object.entries(map);
    await Promise.all(
      entries.map(async ([cueKey, urls]) => {
        const urlList = Array.isArray(urls) ? urls : [urls];
        for (const url of urlList) {
          if (typeof url !== 'string' || !url || this._loading.has(url)) continue;
          this._loading.add(url);
          try {
            const res = await fetchImpl(url);
            if (!res.ok) continue;
            const arr = await res.arrayBuffer();
            const decoded = await audioCtx.decodeAudioData(arr);
            if (this.registerSample(cueKey, decoded)) loaded++;
          } catch {
            // Silently fall back to procedural vocal synthesis
          } finally {
            this._loading.delete(url);
          }
        }
      })
    );
    return loaded;
  }
}
