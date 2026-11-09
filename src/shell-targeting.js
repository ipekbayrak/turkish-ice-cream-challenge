import { Vector3 } from 'three';

/** Shell-game picking uses the displayed props, not future arm/rod targets. */
export function shellViewport(world) {
  const rect = world.canvas?.getBoundingClientRect?.();
  return {
    width: Math.max(1, rect?.width || world.canvas?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1)),
    height: Math.max(1, rect?.height || world.canvas?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1)),
  };
}
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function projectShellTarget(world, object, viewport) {
  const position = object.getWorldPosition(new Vector3());
  const projected = world.projectToScreen(position);
  const scale = object.getWorldScale(new Vector3()).x;
  const edge = world.projectToScreen(position.clone().add(new Vector3(.07 * scale, 0, 0)));
  const visibleRadius = Math.max(12, Math.hypot(edge.x - projected.x, edge.y - projected.y));
  const visible = projected.x + visibleRadius >= 0 && projected.x - visibleRadius <= viewport.width && projected.y + visibleRadius >= 0 && projected.y - visibleRadius <= viewport.height;
  // On portrait screens a cone may straddle an edge. Keep its grab marker on
  // the visible portion instead of requiring an impossible off-screen touch.
  return { position, projected, visible, screen: { x: clamp(projected.x, 8, viewport.width - 8), y: clamp(projected.y, 8, viewport.height - 8) } };
}

export function getShellTargets(world) {
  const viewport = shellViewport(world);
  return {
    viewport, radius: clamp(Math.min(viewport.width, viewport.height) * .10, 26, 44),
    real: projectShellTarget(world, world.conePivot, viewport),
    fake: projectShellTarget(world, world.napkinConeProp, viewport),
  };
}

/** Ambiguous overlapping target regions cannot fall through into a penalty. */
export function classifyShellPick(normX, normY, targets) {
  const x = (normX + 1) * targets.viewport.width * .5;
  const y = (1 - normY) * targets.viewport.height * .5;
  const realDistance = targets.real.visible ? Math.hypot(x - targets.real.screen.x, y - targets.real.screen.y) : Infinity;
  const fakeDistance = targets.fake.visible ? Math.hypot(x - targets.fake.screen.x, y - targets.fake.screen.y) : Infinity;
  const margin = Math.min(8, targets.radius * .2);
  const candidate = realDistance < targets.radius && realDistance + margin < fakeDistance ? 'real'
    : fakeDistance < targets.radius && fakeDistance + margin < realDistance ? 'fake' : null;
  return { candidate, realDistance, fakeDistance, radius: targets.radius };
}
