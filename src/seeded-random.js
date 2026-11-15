import { TRICK_CATALOG } from './protocol.js';
import { MAX_SCOOPS } from './venues.js';

/**
 * Deterministic 32-bit PRNG (`mulberry32`) + Serverless URL Challenge Codec.
 * Powers both "Günün Ustası" (Daily Master) and "?c=<token>" Friend Trap Links.
 */

export function hashStringSeed(input = '') {
  const str = String(input);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createSeededRandom(seed) {
  let state = (typeof seed === 'string' ? hashStringSeed(seed) : Number(seed)) >>> 0;
  if (state === 0) state = 0x6d2b79f5;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getDailyDateKey(date = new Date()) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDailyChallengeSpec(date = new Date()) {
  const dateKey = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : getDailyDateKey(date);
  const seed = hashStringSeed(`maras-daily-v1:${dateKey}`);
  const rng = createSeededRandom(seed);
  // Stages 4..18 give rich visual variety without overwhelming speed
  const stage = 4 + Math.floor(rng() * 15);
  const scoopCount = 2 + Math.floor(rng() * 3); // 2..4 scoops
  const flavors = Array.from({ length: scoopCount }, () => Math.floor(rng() * 4));
  return {
    kind: 'daily',
    dateKey,
    seed,
    stage,
    scoopCount,
    flavors,
  };
}

const VALID_TRICK_IDS = TRICK_CATALOG.map((t) => t.id);
const TRICK_ID_TO_IDX = new Map(VALID_TRICK_IDS.map((id, idx) => [id, idx]));

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(token) {
  const clean = String(token || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = clean + '==='.slice((clean.length + 3) % 4);
  if (typeof atob === 'function') {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(padded, 'base64').toString('utf8');
}

function sanitizeNick(name) {
  if (typeof name !== 'string') return '';
  return name.replace(/[<>"'`\\]/g, '').trim().slice(0, 14);
}

/**
 * Encodes a custom challenge into a short URL-safe token (`?c=...`).
 */
export function encodeChallengePayload({
  seed = Date.now() >>> 0,
  stage = 5,
  scoopCount = 3,
  flavors = [0, 1, 2],
  tricks = [],
  senderScore = null,
  senderBamboozled = null,
  senderName = '',
} = {}) {
  const cleanStage = Math.max(1, Math.min(30, Math.round(Number(stage) || 5)));
  const cleanScoops = Math.max(1, Math.min(MAX_SCOOPS, Math.round(Number(scoopCount) || 3)));
  const cleanFlavors = Array.isArray(flavors) && flavors.length > 0
    ? flavors.slice(0, cleanScoops).map((f) => Math.max(0, Math.min(3, Math.round(Number(f) || 0))))
    : [0, 1, 2].slice(0, cleanScoops);
  const trickIndices = Array.isArray(tricks)
    ? tricks
        .map((id) => TRICK_ID_TO_IDX.get(id))
        .filter((idx) => Number.isInteger(idx) && VALID_TRICK_IDS[idx] !== 'FINAL_PISTACHIO_CATCH')
        .slice(0, 6)
    : [];

  const compact = [
    1,
    (Number(seed) >>> 0) || 1,
    cleanStage,
    cleanScoops,
    cleanFlavors,
    trickIndices,
    Number.isFinite(senderScore) ? Math.max(0, Math.round(senderScore)) : -1,
    Number.isFinite(senderBamboozled) ? Math.max(0, Math.round(senderBamboozled)) : -1,
    sanitizeNick(senderName),
  ];
  return toBase64Url(JSON.stringify(compact));
}

/**
 * Decodes and validates a `?c=` challenge token. Returns `null` on invalid input.
 */
export function decodeChallengePayload(token) {
  if (typeof token !== 'string' || token.length < 4 || token.length > 512) {
    return null;
  }
  try {
    const raw = JSON.parse(fromBase64Url(token));
    if (!Array.isArray(raw) || raw[0] !== 1) return null;
    const seed = (Number(raw[1]) >>> 0) || 1;
    const stage = Math.max(1, Math.min(30, Math.round(Number(raw[2]) || 5)));
    const scoopCount = Math.max(1, Math.min(MAX_SCOOPS, Math.round(Number(raw[3]) || 3)));
    const flavors = Array.isArray(raw[4]) && raw[4].length > 0
      ? raw[4].slice(0, scoopCount).map((f) => Math.max(0, Math.min(3, Math.round(Number(f) || 0))))
      : [0, 1, 2].slice(0, scoopCount);
    const tricks = Array.isArray(raw[5])
      ? raw[5]
          .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < VALID_TRICK_IDS.length)
          .map((idx) => VALID_TRICK_IDS[idx])
          .filter((id) => id && id !== 'FINAL_PISTACHIO_CATCH')
          .slice(0, 6)
      : [];
    const senderScore = Number.isFinite(raw[6]) && raw[6] >= 0 ? Math.round(raw[6]) : null;
    const senderBamboozled = Number.isFinite(raw[7]) && raw[7] >= 0 ? Math.round(raw[7]) : null;
    const senderName = sanitizeNick(raw[8]);

    return {
      kind: 'challenge',
      seed,
      stage,
      scoopCount,
      flavors,
      tricks,
      senderScore,
      senderBamboozled,
      senderName,
    };
  } catch {
    return null;
  }
}

export function buildShareUrl(baseHref = 'https://dondurma.ipekbayrak.com.tr/', params = {}) {
  let base = 'https://dondurma.ipekbayrak.com.tr/';
  try {
    const parsed = new URL(baseHref);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      // Capacitor Android runs on https://localhost — rewrite shares to public web playable URL!
      if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        base = `${parsed.origin}${parsed.pathname}`;
      }
    }
  } catch {
    // Keep canonical web URL
  }
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}
