import { buildShareUrl } from './seeded-random.js';

/**
 * Daily Master ("Günün Ustası") & Vertical Share Card Renderer (`720x960`).
 * Produces both Wordle-style emoji strips and instant Story/WhatsApp PNG cards.
 */

export function formatEmojiStrip(stepOutcomes = []) {
  if (!Array.isArray(stepOutcomes) || stepOutcomes.length === 0) {
    return '✅✅🍦';
  }
  return stepOutcomes.slice(0, 12).join('');
}

export function formatShareText({
  lang = 'tr',
  mode = 'stage',
  dateKey = '',
  stage = 1,
  emojiStrip = '✅✅🍦',
  bamboozled = 0,
  score = 0,
  url = 'https://dondurma.ipekbayrak.com.tr/',
} = {}) {
  const tr = lang === 'tr';
  const header = mode === 'daily'
    ? (tr ? `🍦 Maraş Dondurmacısı — Günün Ustası (${dateKey})` : `🍦 Turkish Ice Cream — Daily Master (${dateKey})`)
    : mode === 'challenge'
      ? (tr ? '🍦 Maraş Dondurmacısı — Tuzak Meydan Okuması!' : '🍦 Turkish Ice Cream — Trap Challenge!')
      : (tr ? `🍦 Maraş Dondurmacısı 3D — Seviye ${stage}` : `🍦 Turkish Ice Cream 3D — Stage ${stage}`);

  const statsLine = tr
    ? `${emojiStrip} • 🎣 ${bamboozled} Sazanlanma • ⭐ ${score}`
    : `${emojiStrip} • 🎣 ${bamboozled}x Tricked • ⭐ ${score}`;
  const cta = tr ? 'Ustayı benden daha az sazanlanarak geçebilir misin? 👇' : 'Can you catch the cone with fewer tricks fallen for? 👇';
  return `${header}\n${statsLine}\n${cta}\n${url}`;
}

export function renderShareCardCanvas({
  gameTitle = 'Maraş Dondurmacısı 3D',
  badge = 'GÜNÜN USTASI',
  title = 'DONDURMAYI KAPTIN!',
  stars = '⭐⭐⭐',
  scoreText = '1,850',
  bamboozled = 0,
  bamboozledLabel = 'Sazanlanma',
  emojiStrip = '✅✅✅🍦',
  footerUrl = 'dondurma.ipekbayrak.com.tr',
  canvasFactory = null,
} = {}) {
  const width = 720;
  const height = 960;
  const canvas = canvasFactory
    ? canvasFactory(width, height)
    : typeof document !== 'undefined'
      ? Object.assign(document.createElement('canvas'), { width, height })
      : null;
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Rich Ottoman crimson-to-espresso radial background
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#3b1014');
  bg.addColorStop(0.52, '#1f0a09');
  bg.addColorStop(1, '#120605');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Ornamental gold border frame
  ctx.strokeStyle = '#dbb66b';
  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, width - 56, height - 56);
  ctx.strokeStyle = 'rgba(219, 182, 107, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  // 2. Top Game Header & Badge Pill
  ctx.fillStyle = '#fde68a';
  ctx.font = '800 28px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`🍦 ${gameTitle}`, width * 0.5, 108);

  ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(width * 0.5 - 190, 136, 380, 48, 24);
  } else {
    ctx.rect(width * 0.5 - 190, 136, 380, 48);
  }
  ctx.fill();
  ctx.fillStyle = '#fbbf24';
  ctx.font = '700 21px system-ui, -apple-system, sans-serif';
  ctx.fillText(String(badge).toUpperCase(), width * 0.5, 168);

  // 3. Center Trophy / Cone Emblem + Title + Stars
  ctx.font = '96px system-ui, -apple-system, sans-serif';
  ctx.fillText('🍦', width * 0.5, 310);

  ctx.fillStyle = '#fffbeb';
  ctx.font = '900 40px system-ui, -apple-system, sans-serif';
  ctx.fillText(String(title).slice(0, 28), width * 0.5, 392);

  ctx.font = '48px system-ui, -apple-system, sans-serif';
  ctx.fillText(stars || '⭐⭐⭐', width * 0.5, 462);

  // 4. Emoji Strip Card
  ctx.fillStyle = 'rgba(255, 248, 235, 0.08)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(76, 510, width - 152, 108, 22);
  } else {
    ctx.rect(76, 510, width - 152, 108);
  }
  ctx.fill();
  ctx.font = '42px system-ui, -apple-system, sans-serif';
  ctx.fillText(emojiStrip, width * 0.5, 578);

  // 5. Bamboozled & Score Boxes
  ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(76, 650, 270, 140, 20);
    ctx.roundRect(width - 346, 650, 270, 140, 20);
  } else {
    ctx.rect(76, 650, 270, 140);
    ctx.rect(width - 346, 650, 270, 140);
  }
  ctx.fill();

  ctx.fillStyle = '#fcd34d';
  ctx.font = '700 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(`🎣 ${bamboozledLabel}`, 211, 696);
  ctx.fillText('⭐ SCORE', width - 211, 696);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.fillText(String(bamboozled), 211, 758);
  ctx.fillText(String(scoreText), width - 211, 758);

  // 6. Footer Watermark
  ctx.fillStyle = '#dbb66b';
  ctx.font = '700 24px system-ui, -apple-system, sans-serif';
  ctx.fillText(footerUrl, width * 0.5, 882);

  return canvas;
}

export function canvasToPngBlob(canvas) {
  return new Promise((resolve) => {
    if (!canvas || typeof canvas.toBlob !== 'function') {
      resolve(null);
      return;
    }
    canvas.toBlob((blob) => resolve(blob || null), 'image/png');
  });
}

export async function shareResultCard({
  canvas = null,
  text = '',
  url = buildShareUrl(),
  title = 'Maraş Dondurmacısı 3D',
} = {}) {
  const pngBlob = await canvasToPngBlob(canvas);
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (pngBlob && typeof File === 'function') {
        const file = new File([pngBlob], 'maras-dondurma-sonuc.png', { type: 'image/png' });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({ title, text, files: [file] });
          return { method: 'web-share-file', ok: true };
        }
      }
      await navigator.share({ title, text, url });
      return { method: 'web-share-text', ok: true };
    } catch (err) {
      if (err?.name === 'AbortError') return { method: 'cancelled', ok: false };
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text || url);
      return { method: 'clipboard', ok: true };
    } catch {
      // Fall through
    }
  }

  if (pngBlob && typeof document !== 'undefined' && typeof URL?.createObjectURL === 'function') {
    const objUrl = URL.createObjectURL(pngBlob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = 'maras-dondurma-sonuc.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(objUrl), 3000);
    return { method: 'download', ok: true };
  }
  return { method: 'none', ok: false };
}
