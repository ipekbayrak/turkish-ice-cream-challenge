const SMUDGE_TRICK_IDS = new Set([
  'CROWN_TAP_KISS_TEASE',
  'GRAND_FINALE_BOW_TEASE',
  'UPSIDE_DOWN_GRAVITY',
  'BONUS_SCOOP_TAKEBACK',
  'FAKE_DROP_PANIC',
]);

/**
 * First-Person Ice Cream Nose/Screen Smudge ("Ekrana Dondurma Sürme")
 * + Elastic Snatch-Back helper.
 * Draws a creamy Maraş ice cream splat on the 2D overlay canvas when the vendor
 * boops the camera; players wipe it clean with their thumb!
 */
export class ScreenSmudge {
  constructor({ sound = null, onSmudge = () => {}, onWipedClean = () => {} } = {}) {
    this.sound = sound;
    this.onSmudge = onSmudge;
    this.onWipedClean = onWipedClean;

    this.opacity = 0;
    this.age = 0;
    this.cooldown = 0;
    this.colorCss = '#fff8eb';
    this.centerX = 0.5;
    this.centerY = 0.44;
    this.blobs = [];
    this.crumbs = [];
    this._wipedDistance = 0;
  }

  get isActive() {
    return this.opacity > 0.08;
  }

  get needsWipeCue() {
    return this.opacity > 0.35;
  }

  reset() {
    this.opacity = 0;
    this.age = 0;
    this.cooldown = 0;
    this.blobs = [];
    this.crumbs = [];
    this._wipedDistance = 0;
  }

  shouldTriggerForMistake(mechanicId = '') {
    return this.cooldown <= 0 && !this.isActive && SMUDGE_TRICK_IDS.has(mechanicId);
  }

  trigger({ colorCss = '#fff5e4', centerX = 0.5, centerY = 0.43, rand = Math.random } = {}) {
    if (this.cooldown > 0) return false;
    this.opacity = 0.94;
    this.age = 0;
    this.cooldown = 9.5;
    this.colorCss = colorCss || '#fff5e4';
    this.centerX = centerX;
    this.centerY = centerY;
    this._wipedDistance = 0;

    this.blobs = [
      { dx: 0, dy: 0, rx: 68, ry: 56, rot: 0.15 },
      { dx: -44, dy: 14, rx: 38, ry: 30, rot: -0.3 },
      { dx: 48, dy: -10, rx: 34, ry: 28, rot: 0.42 },
      { dx: 12, dy: 44, rx: 28, ry: 36, rot: 0.08 },
      { dx: -22, dy: -38, rx: 26, ry: 22, rot: -0.2 },
    ].map((b) => ({
      ...b,
      dx: b.dx + (rand() - 0.5) * 14,
      dy: b.dy + (rand() - 0.5) * 14,
    }));

    this.crumbs = Array.from({ length: 8 }, (_, i) => {
      const ang = (i / 8) * Math.PI * 2 + rand() * 0.4;
      const dist = 22 + rand() * 48;
      return {
        dx: Math.cos(ang) * dist,
        dy: Math.sin(ang) * dist,
        r: 3.5 + rand() * 3.5,
      };
    });

    this.sound?.playSmudgeSplat?.(0);
    this.onSmudge({ colorCss: this.colorCss });
    return true;
  }

  wipe(pointerX, pointerY, prevX, prevY, width, height) {
    if (!this.isActive || width <= 0 || height <= 0) return false;
    const cx = this.centerX * width;
    const cy = this.centerY * height;
    const distToSplat = Math.hypot(pointerX - cx, pointerY - cy);
    const radius = Math.max(115, Math.min(width, height) * 0.28);
    if (distToSplat > radius) return false;

    const delta = Number.isFinite(prevX) && Number.isFinite(prevY)
      ? Math.hypot(pointerX - prevX, pointerY - prevY)
      : 14;
    if (delta < 1.5) return false;

    this._wipedDistance += delta;
    this.opacity = Math.max(0, this.opacity - (delta / 210));
    if (this.opacity <= 0.08) {
      this.opacity = 0;
      this.onWipedClean();
    }
    return true;
  }

  update(dt) {
    const safeDt = Math.max(0, Math.min(0.1, Number(dt) || 0));
    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - safeDt);
    }
    if (!this.isActive) return;

    this.age += safeDt;
    // Gentle downward drip & automatic clear after 3.6s so nobody gets stuck
    this.centerY = Math.min(0.56, this.centerY + safeDt * 0.012);
    if (this.age > 2.4) {
      this.opacity = Math.max(0, this.opacity - safeDt * 0.55);
      if (this.opacity <= 0.08) {
        this.opacity = 0;
      }
    }
  }

  draw(ctx, width, height) {
    if (!this.isActive || !ctx) return;
    const cx = this.centerX * width;
    const cy = this.centerY * height;
    const scale = Math.max(0.75, Math.min(1.35, Math.min(width, height) / 420));

    ctx.save();
    ctx.globalAlpha = Math.min(0.92, this.opacity);

    // Soft shadow under cream splat
    ctx.fillStyle = 'rgba(30, 12, 8, 0.26)';
    for (const b of this.blobs) {
      ctx.beginPath();
      ctx.ellipse(
        cx + b.dx * scale,
        cy + (b.dy + 6) * scale,
        b.rx * scale,
        b.ry * scale,
        b.rot,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Creamy Maraş dondurma body
    ctx.fillStyle = this.colorCss;
    for (const b of this.blobs) {
      ctx.beginPath();
      ctx.ellipse(
        cx + b.dx * scale,
        cy + b.dy * scale,
        b.rx * scale,
        b.ry * scale,
        b.rot,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Glossy highlight sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.beginPath();
    ctx.ellipse(cx - 18 * scale, cy - 16 * scale, 26 * scale, 15 * scale, -0.35, 0, Math.PI * 2);
    ctx.fill();

    // Antep pistachio crumbs embedded in the cream
    ctx.fillStyle = '#65a30d';
    for (const c of this.crumbs) {
      ctx.beginPath();
      ctx.arc(cx + c.dx * scale, cy + c.dy * scale, c.r * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * Sticky Elastic Snatch-Back visual tension tracker for taffy tricks.
 */
export class ElasticSnatchBack {
  constructor() {
    this.tension = 0;
  }

  reset() {
    this.tension = 0;
  }

  update(dt, { stretching = false, handSpeed = 0 } = {}) {
    const safeDt = Math.max(0, Math.min(0.1, Number(dt) || 0));
    if (stretching) {
      this.tension = Math.min(1, this.tension + safeDt * 1.8);
      if (handSpeed > 2.2 && this.tension > 0.25) {
        // Sliced cleanly!
        const released = this.tension;
        this.tension = 0;
        return { slicedFree: true, power: released };
      }
    } else {
      this.tension = Math.max(0, this.tension - safeDt * 4.5);
    }
    return { slicedFree: false, power: this.tension };
  }
}
