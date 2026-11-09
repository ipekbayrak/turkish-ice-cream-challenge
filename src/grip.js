/** Select a contact point on the shaft inside an arm's reachable sphere. */
export function resolveShaftGrip(tip, backward, shoulder, min, max, preferred, reach = 0.65) {
  const dx = shoulder.x - tip.x;
  const dy = shoulder.y - tip.y;
  const dz = shoulder.z - tip.z;
  const projection = dx * backward.x + dy * backward.y + dz * backward.z;
  const perpendicularSq = Math.max(0, dx * dx + dy * dy + dz * dz - projection * projection);
  const halfInterval = Math.sqrt(Math.max(0, reach * reach - perpendicularSq));
  const low = Math.max(min, projection - halfInterval);
  const high = Math.min(max, projection + halfInterval);
  const reachable = perpendicularSq <= reach * reach && low <= high;
  const distance = reachable
    ? Math.max(low, Math.min(high, preferred))
    : Math.max(min, Math.min(max, projection));
  return { distance, reachable };
}

/** Swept contact keeps a fast pole from passing through a small bell between frames. */
export function distanceToSegment(point, start, end) {
  const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z;
  const lengthSq = dx * dx + dy * dy + dz * dz;
  const t = lengthSq > 0
    ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy + (point.z - start.z) * dz) / lengthSq))
    : 0;
  return Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy, point.z - start.z - t * dz);
}
