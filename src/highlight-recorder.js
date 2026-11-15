/**
 * Zero-In-Game-Lag Highlight Ring Buffer + Post-Round 6s Vertical `720x1280` Clip Exporter.
 * Records lightweight 15 Hz state snapshots (~150 objects max, zero GPU readback during play)
 * and renders an animated 9:16 vertical video clip (`video/webm` / `video/mp4` with PNG fallback)
 * when the player taps "🎬 6 sn Klip".
 */

const SAMPLE_INTERVAL = 1 / 15;
const MAX_SAMPLES = 165; // ~11 seconds ring buffer

export class HighlightRingBuffer {
  constructor() {
    this.samples = [];
    this.moments = [];
    this.elapsed = 0;
    this._accum = 0;
  }

  reset() {
    this.samples.length = 0;
    this.moments.length = 0;
    this.elapsed = 0;
    this._accum = 0;
  }

  markMoment(kind = 'highlight', weight = 1, label = '') {
    this.moments.push({
      t: this.elapsed,
      kind,
      weight: Math.max(0.1, Number(weight) || 1),
      label: String(label || ''),
    });
    if (this.moments.length > 40) {
      this.moments.shift();
    }
  }

  recordTick(dt, snapshot = {}) {
    const safeDt = Math.max(0, Math.min(0.1, Number(dt) || 0));
    this.elapsed += safeDt;
    this._accum += safeDt;
    if (this.samples.length > 0 && this._accum < SAMPLE_INTERVAL) return false;
    this._accum = 0;

    this.samples.push({
      t: this.elapsed,
      coneX: Number.isFinite(snapshot.coneX) ? snapshot.coneX : 0.5,
      coneY: Number.isFinite(snapshot.coneY) ? snapshot.coneY : 0.45,
      handX: Number.isFinite(snapshot.handX) ? snapshot.handX : 0.55,
      handY: Number.isFinite(snapshot.handY) ? snapshot.handY : 0.72,
      grabCurl: Number.isFinite(snapshot.grabCurl) ? snapshot.grabCurl : 0.2,
      scoops: Math.max(0, Math.round(snapshot.scoops || 0)),
      flavorColors: Array.isArray(snapshot.flavorColors)
        ? snapshot.flavorColors.slice(0, 4)
        : ['#fff8eb', '#fbcfe8', '#bef264'],
      vendorMood: snapshot.vendorMood || 'smile',
      bubbleText: String(snapshot.bubbleText || '').slice(0, 48),
      badgeText: String(snapshot.badgeText || '').slice(0, 36),
      theme: snapshot.theme || 'green',
      score: Math.max(0, Math.round(snapshot.score || 0)),
      bamboozled: Math.max(0, Math.round(snapshot.bamboozled || 0)),
      smudgeAlpha: Math.max(0, Math.min(1, Number(snapshot.smudgeAlpha) || 0)),
      biteActive: Boolean(snapshot.biteActive),
    });

    if (this.samples.length > MAX_SAMPLES) {
      this.samples.shift();
    }
    return true;
  }

  selectBestWindow(durationSec = 6.0) {
    if (this.samples.length === 0) return [];
    const firstT = this.samples[0].t;
    const lastT = this.samples[this.samples.length - 1].t;
    if (lastT - firstT <= durationSec) {
      return this.samples.slice();
    }

    // Score candidate 6s windows by summed excitement moments + slight preference for round climax
    let bestStart = Math.max(firstT, lastT - durationSec);
    let bestScore = -1;

    for (let s = firstT; s <= lastT - durationSec + 0.05; s += 0.35) {
      const end = s + durationSec;
      let score = ((s - firstT) / Math.max(1, lastT - firstT)) * 0.6;
      for (const m of this.moments) {
        if (m.t >= s && m.t <= end) {
          score += m.weight;
        }
      }
      if (score >= bestScore) {
        bestScore = score;
        bestStart = s;
      }
    }

    const bestEnd = bestStart + durationSec;
    return this.samples.filter((sp) => sp.t >= bestStart && sp.t <= bestEnd + 0.08);
  }
}

export function renderReplayFrame(ctx, width, height, frame, meta = {}) {
  if (!ctx || !frame) return;

  // 1. Warm Ottoman Bazaar Night Gradient
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#3a1115');
  bg.addColorStop(0.55, '#1d0a09');
  bg.addColorStop(1, '#110504');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Brass canopy arch & stage counter
  ctx.strokeStyle = '#dbb66b';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Top Header Watermark + Stage Badge
  ctx.fillStyle = '#fde68a';
  ctx.font = '800 30px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`🍦 ${meta.gameTitle || 'Maraş Dondurmacısı 3D'}`, width * 0.5, 82);

  ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
  ctx.fillRect(60, 108, width - 120, 48);
  ctx.fillStyle = '#fbbf24';
  ctx.font = '700 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    `🎣 ${frame.bamboozled} ${meta.bamboozledLabel || 'Sazanlanma'}   •   ⭐ ${frame.score}`,
    width * 0.5,
    140
  );

  // 2. Stylized Usta Avatar at Counter Top
  const vendorX = width * 0.5;
  const vendorY = height * 0.30;
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.arc(vendorX, vendorY + 95, 92, Math.PI, 0);
  ctx.fill();

  // Head + Ottoman Fez
  ctx.fillStyle = '#f1c29b';
  ctx.beginPath();
  ctx.arc(vendorX, vendorY, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a81018';
  ctx.fillRect(vendorX - 42, vendorY - 86, 84, 46);

  const moodFace =
    frame.vendorMood === 'shock'
      ? '😲'
      : frame.vendorMood === 'laugh'
        ? '😆'
        : frame.vendorMood === 'mischief'
          ? '😏'
          : '😄';
  ctx.font = '56px system-ui, -apple-system, sans-serif';
  ctx.fillText(moodFace, vendorX, vendorY + 20);

  // Vendor Speech Bubble
  if (frame.bubbleText) {
    ctx.fillStyle = 'rgba(255, 251, 235, 0.94)';
    ctx.fillRect(80, vendorY - 148, width - 160, 48);
    ctx.fillStyle = '#3b1014';
    ctx.font = '800 21px system-ui, -apple-system, sans-serif';
    ctx.fillText(frame.bubbleText, width * 0.5, vendorY - 117);
  }

  // 3. Long Metal Maraş Paddle + Moving Ice Cream Cone
  const conePx = Math.max(90, Math.min(width - 90, frame.coneX * width));
  const conePy = Math.max(290, Math.min(height - 290, frame.coneY * height));

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(vendorX + 58, vendorY + 62);
  ctx.lineTo(conePx, conePy - 8);
  ctx.stroke();

  // Wafer cone
  ctx.fillStyle = '#d99b52';
  ctx.beginPath();
  ctx.moveTo(conePx - 28, conePy);
  ctx.lineTo(conePx + 28, conePy);
  ctx.lineTo(conePx, conePy + 78);
  ctx.closePath();
  ctx.fill();

  // Stacked flavor scoops
  const colors = frame.flavorColors || ['#fff8eb'];
  const scoopDrawCount = Math.max(1, Math.min(4, frame.scoops || 1));
  for (let i = 0; i < scoopDrawCount; i++) {
    ctx.fillStyle = colors[i % colors.length] || '#fff8eb';
    ctx.beginPath();
    ctx.arc(conePx, conePy - 12 - i * 26, 26 - i * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. First-Person Customer Hand Reaching Toward Cone
  const handPx = Math.max(80, Math.min(width - 80, frame.handX * width));
  const handPy = Math.max(320, Math.min(height - 220, frame.handY * height));
  ctx.strokeStyle = frame.theme === 'red' ? '#f87171' : '#4ade80';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(handPx, handPy, 38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = '54px system-ui, -apple-system, sans-serif';
  ctx.fillText(frame.biteActive ? '😋' : frame.grabCurl > 0.65 ? '✊' : '🤚', handPx, handPy + 18);

  // Optional POV Screen Smudge Splat inside Replay
  if (frame.smudgeAlpha > 0.1) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.85, frame.smudgeAlpha);
    ctx.fillStyle = '#fff5e4';
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 0.48, 95, 76, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. Action Cue Pill + Emoji Strip + Viral Watermark
  if (frame.badgeText) {
    ctx.fillStyle = frame.theme === 'red' ? 'rgba(220, 38, 38, 0.85)' : 'rgba(22, 163, 74, 0.85)';
    ctx.fillRect(90, height - 246, width - 180, 56);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(frame.badgeText, width * 0.5, height - 210);
  }

  if (meta.emojiStrip) {
    ctx.font = '36px system-ui, -apple-system, sans-serif';
    ctx.fillText(meta.emojiStrip, width * 0.5, height - 134);
  }

  ctx.fillStyle = '#dbb66b';
  ctx.font = '700 23px system-ui, -apple-system, sans-serif';
  ctx.fillText(meta.footerUrl || 'dondurma.ipekbayrak.com.tr', width * 0.5, height - 62);
}

export function pickSupportedVideoMime(recorderClass = globalThis.MediaRecorder) {
  if (!recorderClass || typeof recorderClass.isTypeSupported !== 'function') return '';
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  return candidates.find((m) => recorderClass.isTypeSupported(m)) || '';
}

export async function exportHighlightClip({
  ringBuffer,
  meta = {},
  durationMs = 4500,
  fps = 24,
  canvasFactory = null,
} = {}) {
  const windowSamples = ringBuffer?.selectBestWindow?.(6.0) || [];
  if (windowSamples.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  const width = 720;
  const height = 1280;
  const canvas = canvasFactory
    ? canvasFactory(width, height)
    : typeof document !== 'undefined'
      ? Object.assign(document.createElement('canvas'), { width, height })
      : null;
  if (!canvas) return { ok: false, reason: 'no-canvas' };
  const ctx = canvas.getContext('2d');
  if (!ctx) return { ok: false, reason: 'no-ctx' };

  const mimeType = pickSupportedVideoMime();
  if (
    mimeType &&
    typeof canvas.captureStream === 'function' &&
    typeof globalThis.MediaRecorder === 'function'
  ) {
    const stream = canvas.captureStream(fps);
    const chunks = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 2_200_000,
    });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const stoppedPromise = new Promise((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start(200);
    const totalFrames = Math.max(12, Math.round((durationMs / 1000) * fps));
    const stepDelay = Math.max(16, Math.round(1000 / fps));

    for (let f = 0; f < totalFrames; f++) {
      const idx = Math.min(
        windowSamples.length - 1,
        Math.floor((f / Math.max(1, totalFrames - 1)) * windowSamples.length)
      );
      renderReplayFrame(ctx, width, height, windowSamples[idx], meta);
      await new Promise((r) => setTimeout(r, stepDelay));
    }

    recorder.stop();
    stream.getTracks?.().forEach((t) => t.stop?.());
    await stoppedPromise;

    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type: mimeType });
    return { ok: blob.size > 0, kind: 'video', blob, mimeType, ext };
  }

  // Fallback on WebViews without MediaRecorder: render climax poster frame as PNG
  const climaxIdx = Math.max(0, windowSamples.length - 2);
  renderReplayFrame(ctx, width, height, windowSamples[climaxIdx], meta);
  const pngBlob = await new Promise((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((b) => resolve(b || null), 'image/png');
    } else {
      resolve(null);
    }
  });
  return {
    ok: Boolean(pngBlob),
    kind: 'poster-png',
    blob: pngBlob,
    mimeType: 'image/png',
    ext: 'png',
  };
}
