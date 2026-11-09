import { Vector3 } from 'three';
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a.clone().lerp(b, ease(t));

/** Presentation paths only. Durations, rewards, input windows and routines stay in TrickDirector. */
export function scoopPath(p, start, tub, deposit) {
  const above = tub.clone().add(new Vector3(0, .10, 0));
  const dip = tub.clone().add(new Vector3(0, -.045, 0));
  const lift = tub.clone().add(new Vector3(0, .24, 0));
  if (p < .18) return mix(start, above, p / .18);
  if (p < .30) return mix(above, dip, (p - .18) / .12);
  if (p < .51) {
    const t = (p - .30) / .21;
    const envelope = Math.sin(t * Math.PI);
    return dip.clone().add(new Vector3(Math.sin(t * Math.PI * 3) * .045 * envelope, -.012 * envelope, Math.cos(t * Math.PI * 3) * .036 * envelope));
  }
  if (p < .69) return mix(dip, lift, (p - .51) / .18);
  if (p < .91) {
    const t = (p - .69) / .22;
    const point = mix(lift, deposit, t);
    point.y += Math.sin(t * Math.PI) * .035;
    return point;
  }
  return deposit.clone();
}

/** The mold begins and ends below the same bucket rim; it never disappears in midair. */
export function moldPath(p, tub, flip = false, seat = null) {
  const buried = seat?.clone() || tub.clone().add(new Vector3(0, -.14, 0));
  const lifted = tub.clone().add(new Vector3(0, .29, .08));
  const show = new Vector3(Math.max(-.32, Math.min(.32, tub.x * .45)), 1.26, .06);
  if (p < .14) return { position: buried, rotation: 0, visible: p >= .08, tubFill: p>=.08?0:1 };
  if (p < .37) {
    const t = (p - .14) / .23;
    return { position: mix(buried, lifted, t), rotation: 0, visible: true, tubFill: 0 };
  }
  if (p < .71) {
    const t = (p - .37) / .34;
    const point = mix(lifted, show, Math.sin(t * Math.PI));
    point.y += Math.sin(t * Math.PI) * (flip ? .25 : .045);
    return { position: point, rotation: flip ? ease(t) * Math.PI * 2 : Math.sin(t * Math.PI * 2) * .25, visible: true, tubFill: 0 };
  }
  if (p < .95) {
    const t = (p - .71) / .24;
    return { position: mix(lifted, buried, t), rotation: flip ? Math.PI * 2 : 0, visible: true, tubFill: 0 };
  }
  return { position: buried, rotation: flip ? Math.PI * 2 : 0, visible: false, tubFill: 1 };
}

/** Anticipation, actual rim contact, rebound, then the existing offered-cone feint. */
export function bellPath(phase, rest, contact) {
  if (phase < .28) return mix(rest, contact, phase / .28);
  if (phase < .43) return contact.clone();
  if (phase < .78) return mix(contact, rest, (phase - .43) / .35);
  return rest.clone();
}

/** A protected, continuous strike: lift before traversing, touch, then rebound. */
export function surfaceStrikePath(phase, start, contact, clearance = 0.13) {
  const p = clamp(phase);
  const above = contact.clone().add(new Vector3(0, clearance, 0));
  const safeStart = start.clone(); safeStart.y = Math.max(start.y, above.y);
  if (p < .14) return mix(start, safeStart, p / .14);
  if (p < .32) return mix(safeStart, above, (p - .14) / .18);
  if (p < .48) return mix(above, contact, (p - .32) / .16);
  if (p < .68) return contact.clone();
  if (p < .92) return mix(contact, above, (p - .68) / .24);
  return above;
}
