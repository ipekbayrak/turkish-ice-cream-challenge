import { Vector3, MathUtils } from 'three';
import { isControlActive } from './pointer-controls.js';

const TAU = Math.PI * 2;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const segmentDistance = (p, a, b) => {
  const dx=b.x-a.x,dy=b.y-a.y,squared=dx*dx+dy*dy;
  const t=squared?MathUtils.clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/squared,0,1):0;
  return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
};
const pointAt = (frame, phase) => ({
  x: frame.center.x + Math.sin(phase * TAU) * frame.rx,
  y: frame.center.y - Math.sin(phase * TAU * 2) * frame.ry,
});

/** A screen-stable drawing lane: camera bob and held-cone poses cannot draw it. */
export function createFigureEightPath(world) {
  const rect = world.canvas?.getBoundingClientRect?.();
  const width = rect?.width || world.canvas?.clientWidth || globalThis.window?.innerWidth || 400;
  const height = rect?.height || world.canvas?.clientHeight || globalThis.window?.innerHeight || 800;
  const frame = { viewport: { width, height }, center: { x: width * .5, y: height * .49 },
    rx: Math.min(width * .30, 160), ry: Math.min(height * .105, 80),
    radius: MathUtils.clamp(Math.min(width, height) * .045, 15, 25), camera: world.camera?.clone() };
  frame.camera?.updateMatrixWorld(true);
  frame.points = Array.from({ length: 97 }, (_, i) => pointAt(frame, i / 96));
  return frame;
}

export function figureEightViewportChanged(frame, world) {
  const width=world.canvas?.clientWidth||globalThis.window?.innerWidth||400;
  const height=world.canvas?.clientHeight||globalThis.window?.innerHeight||800;
  return Math.abs(frame.viewport.width-width)>1||Math.abs(frame.viewport.height-height)>1;
}

export function figureEightWorldPoint(frame, phase, out = new Vector3()) {
  const screen = pointAt(frame, phase), { width, height } = frame.viewport;
  if (!frame.camera) return out.set((screen.x / width * 2 - 1) * .54, 1.22 + (1 - screen.y / height * 2) * .36, .26);
  const ray = out.set(screen.x / width * 2 - 1, 1 - screen.y / height * 2, .5)
    .unproject(frame.camera).sub(frame.camera.position).normalize();
  return ray.multiplyScalar((.26 - frame.camera.position.z) / ray.z).add(frame.camera.position);
}

/** Ordered gates require both lobes and the final crossing in one stroke.
 * Four legal traversals let the player start in either direction at the middle.
 * Only raw pointer movement advances gates; aim offset is used solely to locate
 * the hand over the lane. Tiny jitter, a posed hand and camera motion do not count.
 */
export class FigureEightGesture {
  constructor(frame) { this.frame = frame; this.reset(); }
  reset() { this.candidates = []; this.previous = null; this.elapsed = 0; this.offPath = 0; this.progress = 0; this.phase = 0; this.started = false; this.complete = false; this.rawTravel = 0; }
  update(input, dt) {
    if (this.complete) return true;
    const frame = this.frame, { width, height } = frame.viewport;
    const raw = { x: input.normX || 0, y: input.normY || 0 };
    const aim = { x: ((input.aimNormX ?? input.normX ?? 0) + 1) * width * .5, y: (1 - (input.aimNormY ?? input.normY ?? 0)) * height * .5 };
    const current = { raw, aim, epoch: input.pointerEpoch || 0, cancel: input.cancelEpoch || 0 };
    const interrupted = !isControlActive(input) || (this.previous && current.cancel !== this.previous.cancel);
    if (interrupted) { this.reset(); this.previous = current; return false; }
    // A new contact clears the old stroke but still samples its first point.
    // Discarding the initial center touch lost the first lobe at 30Hz.
    if(this.previous&&current.epoch!==this.previous.epoch)this.reset();
    const rawDelta = this.previous ? distance(raw, this.previous.raw) : 0;
    const pixelDelta = this.previous ? distance(aim, this.previous.aim) : 0;
    if (!this.started) {
      if (distance(aim, frame.center) < frame.radius) {
        this.started = true;
        this.candidates = [0, .5].flatMap(start => [1, -1].map(direction => ({ start, direction, gate: 1 })));
      }
      this.previous = current; return false;
    }
    this.elapsed += Math.max(0, Math.min(dt, .1));
    // A discontinuous jump is not a drawn stroke. Keep the previous completed
    // lane visible until the player returns to the middle to begin again.
    if (pixelDelta > Math.max(75, width * .25)) { this.reset(); this.previous = current; return false; }
    if (rawDelta > .0008) {
      this.rawTravel += rawDelta;
      for (const candidate of this.candidates) {
        // A real fast stroke can cross several gates between 30Hz samples. The
        // swept segment must visit each gate in order; it cannot skip a lobe.
        for(let crossed=0;crossed<4&&candidate.gate<=32;crossed++) {
          const target = pointAt(frame, candidate.start + candidate.direction * candidate.gate / 32);
          if (segmentDistance(target,this.previous.aim,aim)>=frame.radius)break;
          candidate.gate++;
        }
      }
      const best = this.candidates.reduce((a, b) => a.gate > b.gate ? a : b);
      this.progress = Math.min(1, (best.gate - 1) / 32);
      this.phase = best.start + best.direction * this.progress;
    }
    // A fast but complete stroke may arrive before the tiny settle interval.
    // Holding its closing crossing must finish it without an extra jiggle.
    this.complete = this.progress === 1 && this.elapsed >= .65 && this.rawTravel > .9;
    const nearLane = frame.points.some(p => distance(p, aim) < frame.radius * 2.2);
    this.offPath = nearLane ? 0 : this.offPath + dt;
    if (this.offPath > .32) { this.reset(); this.previous = current; return false; }
    this.previous = current;
    return this.complete;
  }
  guide() {
    const best = this.candidates.length ? this.candidates.reduce((a, b) => a.gate > b.gate ? a : b) : { start: 0, direction: 1, gate: 1 };
    const completedPoints = Array.from({ length: Math.floor(this.progress * 96) + 1 }, (_, i) => pointAt(this.frame, best.start + best.direction * i / 96));
    return { points: this.frame.points, completedPoints, progress: this.progress, started: this.started,
      start: this.frame.center, next: pointAt(this.frame, best.start + best.direction * Math.min(32, best.gate) / 32), radius: this.frame.radius };
  }
}
