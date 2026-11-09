import { normalizeStage } from './progression.js';

const EVENT_NAME_RE = /^[a-zA-Z0-9_.:-]{1,64}$/;
const SAFE_TOKEN_RE = /^[a-zA-Z0-9_:.-]{1,60}$/;
const DEFAULT_RELEASE = 'web-v43';
const MAX_STAGE_CHARS = 60;
const MAX_DURATION_MS = 3_600_000;
const MAX_QUEUE_LENGTH = 32;
const MAX_RETRIES = 30;
const RETRY_INTERVAL_MS = 500;
const ENGAGEMENT_THRESHOLD_MS = 15_000;

const ALLOWED_SUBPATH_PREFIXES = ['/dondurma', '/maras', '/turkish-ice-cream'];

function isAllowedLocation(location) {
  if (!location || typeof location.hostname !== 'string') {
    return false;
  }

  const host = location.hostname.trim().toLowerCase();
  if (host === 'dondurma.ipekbayrak.com.tr') {
    return true;
  }

  if (host === 'ipekbayrak.com.tr') {
    const pathname = typeof location.pathname === 'string' ? location.pathname : '';
    return ALLOWED_SUBPATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
  }

  return false;
}

function isPrivacyBlocked(navigator) {
  if (!navigator || typeof navigator !== 'object') {
    return false;
  }

  if (navigator.globalPrivacyControl === true) {
    return true;
  }

  const dnt = navigator.doNotTrack ?? navigator.DNT ?? navigator.msDoNotTrack;
  if (dnt === '1' || dnt === 1) {
    return true;
  }
  if (typeof dnt === 'string' && dnt.trim().toLowerCase() === 'yes') {
    return true;
  }

  return false;
}

function sanitizeMetadata(props) {
  const input = props !== null && typeof props === 'object' ? props : {};
  const metadata = {
    release:
      typeof input.release === 'string' && SAFE_TOKEN_RE.test(input.release)
        ? input.release
        : DEFAULT_RELEASE,
  };

  if (typeof input.operation === 'string' && SAFE_TOKEN_RE.test(input.operation)) {
    metadata.operation = input.operation;
  }

  if (typeof input.stage === 'number' && Number.isFinite(input.stage) && input.stage > 0) {
    const stageStr = String(input.stage);
    if (stageStr.length <= MAX_STAGE_CHARS) {
      metadata.stage = stageStr;
    }
  }

  if (
    typeof input.durationMs === 'number' &&
    Number.isFinite(input.durationMs) &&
    input.durationMs >= 0 &&
    input.durationMs <= MAX_DURATION_MS
  ) {
    metadata.durationMs = input.durationMs;
  }

  return metadata;
}

export class GameAnalytics {
  constructor({
    getTracker = () => globalThis.window?.havenProject,
    location = globalThis.location,
    navigator = globalThis.navigator,
    now = () => Date.now(),
    schedule = (fn, ms) => setTimeout(fn, ms),
    cancel = (id) => clearTimeout(id),
  } = {}) {
    this.getTracker = getTracker;
    this.location = location;
    this.navigator = navigator;
    this.now = now;
    this.schedule = schedule;
    this.cancel = cancel;

    this.queue = [];
    this.timerId = null;
    this.retryCount = 0;
    this.disposed = false;

    this.begun = false;
    this.roundActive = false;
    this.currentStage = 1;
    this.activeMs = 0;
    this.engagedMs = 0;
    this.engagedEmitted = false;
  }

  isEnabled() {
    if (this.disposed) {
      return false;
    }
    if (!isAllowedLocation(this.location)) {
      return false;
    }
    if (isPrivacyBlocked(this.navigator)) {
      return false;
    }
    return true;
  }

  _safeGetTracker() {
    try {
      return typeof this.getTracker === 'function' ? this.getTracker() : null;
    } catch {
      return null;
    }
  }

  _cancelTimer() {
    if (this.timerId !== null) {
      try {
        this.cancel(this.timerId);
      } catch {
        // Ignore timer cancellation errors
      }
      this.timerId = null;
    }
  }

  _enqueue(entry) {
    this.queue.push(entry);
    while (this.queue.length > MAX_QUEUE_LENGTH) {
      this.queue.shift();
    }
    this._scheduleRetry();
  }

  _scheduleRetry() {
    if (
      this.disposed ||
      this.timerId !== null ||
      this.queue.length === 0 ||
      this.retryCount >= MAX_RETRIES
    ) {
      return;
    }

    this.retryCount += 1;
    try {
      this.timerId = this.schedule(() => {
        this.timerId = null;
        this.flush();
      }, RETRY_INTERVAL_MS);
    } catch {
      this.timerId = null;
    }
  }

  track(name, props = {}) {
    if (!this.isEnabled()) {
      return false;
    }
    if (typeof name !== 'string' || !EVENT_NAME_RE.test(name)) {
      return false;
    }

    const metadata = sanitizeMetadata(props);
    const tracker = this._safeGetTracker();

    if (tracker && typeof tracker.track === 'function') {
      if (this.queue.length > 0) {
        const flushed = this.flush();
        if (!flushed) {
          this._enqueue({ name, metadata });
          return false;
        }
      }

      try {
        tracker.track(name, metadata);
        return true;
      } catch {
        return false;
      }
    }

    this._enqueue({ name, metadata });
    return false;
  }

  flush() {
    if (!this.isEnabled()) {
      this._cancelTimer();
      this.queue.length = 0;
      return false;
    }

    if (this.queue.length === 0) {
      this._cancelTimer();
      return true;
    }

    const tracker = this._safeGetTracker();
    if (!tracker || typeof tracker.track !== 'function') {
      this._scheduleRetry();
      return false;
    }

    while (this.queue.length > 0) {
      const item = this.queue[0];
      try {
        tracker.track(item.name, item.metadata);
        this.queue.shift();
      } catch {
        this._scheduleRetry();
        return false;
      }
    }

    this._cancelTimer();
    this.retryCount = 0;
    return true;
  }

  dispose() {
    this.disposed = true;
    this.roundActive = false;
    this._cancelTimer();
    this.queue.length = 0;
  }

  begin(stage = 1) {
    if (this.begun) {
      return false;
    }
    this.begun = true;
    const normalized = normalizeStage(stage);
    this.currentStage = normalized;
    return this.track('game_started', { stage: normalized });
  }

  startRound(stage = this.currentStage) {
    const normalized = normalizeStage(stage);
    if(this.roundActive&&this.currentStage===normalized)return false;
    this.currentStage = normalized;
    this.roundActive = true;
    this.activeMs = 0;
    return this.track('round_started', { stage: normalized });
  }

  tick(dt, { visible = true, playing = true } = {}) {
    if (!this.roundActive || !visible || !playing) {
      return false;
    }
    if (typeof dt !== 'number' || !Number.isFinite(dt) || dt <= 0) {
      return false;
    }

    const deltaMs = dt * 1000;
    this.activeMs += deltaMs;
    this.engagedMs += deltaMs;

    if (!this.engagedEmitted && this.engagedMs >= ENGAGEMENT_THRESHOLD_MS) {
      this.engagedEmitted = true;
      return this.track('game_engaged', {
        stage: this.currentStage,
        durationMs: Math.min(MAX_DURATION_MS, Math.max(0, Math.round(this.engagedMs))),
      });
    }

    return false;
  }

  finish(stage = this.currentStage, { won = false, outcome = 'unknown' } = {}) {
    if (!this.roundActive) {
      return false;
    }
    this.roundActive = false;

    const normalized = stage !== undefined ? normalizeStage(stage) : this.currentStage;
    this.currentStage = normalized;
    const safeOutcome =
      typeof outcome === 'string' && SAFE_TOKEN_RE.test(outcome) ? outcome : 'unknown';
    const durationMs = Math.min(MAX_DURATION_MS, Math.max(0, Math.round(this.activeMs)));
    const eventName = won ? 'round_completed' : 'round_failed';

    return this.track(eventName, {
      stage: normalized,
      operation: safeOutcome,
      durationMs,
    });
  }
}
