import { Vector3, MathUtils } from 'three';
import { customerHandEmpty } from './counter-interactions.js';

const BELL_STEAL_MECHANICS = new Set([
  'BELL_RHYTHM_FEINT',
  'PENDULUM_BELL_SWING',
  'TRIPLE_BELL_CRESCENDO',
  'SYNCOPATED_BELL_FAKE',
  'OVERHEAD_CROWN_DANGLE',
]);

function segmentDist2D(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq > 1e-6 ? MathUtils.clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/**
 * Active-Round "Troll the Master" ("Ustayı Trolle") Detector & Hat Physics.
 * Gives skilled players signature clip-worthy reversals without altering cone ownership:
 *  1) Fez / Apprentice Cap Tap-Tilt (+300 👑)
 *  2) Early Overhead Bell Steal (+200 🔔)
 *  3) Empty Outer-Cone Counter-Flick (+250 🪃)
 */
export class CounterTroll {
  constructor({ world, director, sound, save, onTroll = () => {} } = {}) {
    this.world = world;
    this.director = director;
    this.sound = sound;
    this.save = save;
    this.onTroll = onTroll;

    this._proj = new Vector3();
    this._prevPointer = null;
    this._prevEpoch = null;
    this._usedThisRound = new Set();
    this._hatTilt = 0;
    this._hatTiltVel = 0;
    this._emptyConeHeldSeconds = 0;
  }

  resetRound() {
    this._usedThisRound.clear();
    this._prevPointer = null;
    this._prevEpoch = null;
    this._emptyConeHeldSeconds = 0;
    this._resetHatPose();
  }

  _applyHatPose() {
    const liftY = Math.max(0, Math.abs(this._hatTilt) * 0.06);
    if (this.world?.fezGroup) {
      this.world.fezGroup.rotation.z = this._hatTilt;
      this.world.fezGroup.position.y = liftY;
    }
    if (this.world?.apprenticeCapGroup) {
      this.world.apprenticeCapGroup.rotation.z = this._hatTilt;
      this.world.apprenticeCapGroup.position.y = liftY;
    }
  }

  _resetHatPose() {
    this._hatTilt = 0;
    this._hatTiltVel = 0;
    this._applyHatPose();
  }

  _projectWorld(worldVec, width, height) {
    this._proj.copy(worldVec).project(this.world.camera);
    return {
      x: (this._proj.x + 1) * width * 0.5,
      y: (1 - this._proj.y) * height * 0.5,
      visible: this._proj.z > -1 && this._proj.z < 1,
    };
  }

  _awardTroll(kind, points, badgeIcon, worldPos) {
    if (this._usedThisRound.has(kind)) return false;
    this._usedThisRound.add(kind);

    this.director.score += points;
    this.director._spawnScorePopup?.(points, worldPos, badgeIcon);
    this.world.setVendorMood?.('shock');
    this.world.ringBells?.(0.95);
    this.sound?.playBell?.(0.9, 0);
    this.sound?.playCrowdReaction?.('cheer');
    this.director._triggerVendorSpeech?.('trolled');

    if (this.save?.data) {
      this.save.data.trollCount = (this.save.data.trollCount || 0) + 1;
      this.save.save?.();
    }
    this.onTroll({ kind, points, badgeIcon, stage: this.director.currentStage });
    return true;
  }

  update(dt, {
    active = false,
    pointerDown = false,
    x = 0,
    y = 0,
    epoch = 0,
    width = 1,
    height = 1,
    gestureState = null,
  } = {}) {
    const safeDt = Math.max(0, Math.min(0.1, Number(dt) || 0));

    // Spring-damper decay for hat tilt visual
    if (Math.abs(this._hatTilt) > 0.001 || Math.abs(this._hatTiltVel) > 0.001) {
      const springK = 38;
      const damping = 7.5;
      this._hatTiltVel += (-springK * this._hatTilt - damping * this._hatTiltVel) * safeDt;
      this._hatTilt += this._hatTiltVel * safeDt;
      this._applyHatPose();
    }

    if (!active || !this.director?.active || this.director.roundEnded || this.director.isAfkShowActive) {
      this._prevPointer = null;
      return;
    }

    // Track quick counter-flick window when holding vendor's bait outer cone
    if (this.director.heldItem === 'EMPTY_CONE') {
      this._emptyConeHeldSeconds += safeDt;
      if (
        !this._usedThisRound.has('cone_flick_counter') &&
        this._emptyConeHeldSeconds <= 0.55 &&
        gestureState &&
        gestureState.vy > 2.1 &&
        gestureState.normY > 0.04
      ) {
        this._hatTiltVel += 3.2;
        this._awardTroll('cone_flick_counter', 250, '🪃', this.director.coneWorldPos);
      }
    } else {
      this._emptyConeHeldSeconds = 0;
    }

    if (!pointerDown || !customerHandEmpty(this.world, this.director)) {
      this._prevPointer = null;
      return;
    }

    const prev = this._prevEpoch === epoch ? this._prevPointer : null;
    this._prevPointer = { x, y };
    this._prevEpoch = epoch;

    const movedDist = prev ? Math.hypot(x - prev.x, y - prev.y) : 0;

    // 1. Hat Tap ("Fes / Kep Tıklatma") — intentional tap only, never upward cone swipes
    if (!this._usedThisRound.has('hat_tilt') && this.world?.vendorHead) {
      this.world.vendorHead.updateWorldMatrix(true, false);
      const hatWorld = this._proj.set(0, 0.22, 0.04).applyMatrix4(this.world.vendorHead.matrixWorld).clone();
      const hatScreen = this._projectWorld(hatWorld, width, height);
      const coneScreen = this.director.coneWorldPos
        ? this._projectWorld(this.director.coneWorldPos, width, height)
        : { x: -999, y: -999 };
      const coneAwayFromHat = Math.hypot(coneScreen.x - hatScreen.x, coneScreen.y - hatScreen.y) > 72;
      const hitRadius = Math.max(24, Math.min(40, width * 0.065));
      const directTap =
        hatScreen.visible &&
        coneAwayFromHat &&
        movedDist <= 8 &&
        Math.hypot(x - hatScreen.x, y - hatScreen.y) <= hitRadius;

      if (directTap) {
        const swipeSign = prev && x < prev.x ? -1 : 1;
        this._hatTilt = swipeSign * 0.36;
        this._hatTiltVel = swipeSign * 2.8;
        this._applyHatPose();
        this._awardTroll('hat_tilt', 300, '👑', hatWorld);
        return;
      }
    }

    // 2. Early Overhead Bell Steal ("Çanı Ustadan Önce Çal!") — horizontal swipe across bell only
    if (
      !this._usedThisRound.has('bell_steal') &&
      BELL_STEAL_MECHANICS.has(this.director.currentMechanic) &&
      this.world?.bells?.[3]
    ) {
      const bellWorld = this.world.getBellBodyCenter(3, new Vector3());
      const bellScreen = this._projectWorld(bellWorld, width, height);
      const bellRadius = Math.max(22, Math.min(36, width * 0.055));
      const horizontalSwipe = prev ? Math.abs(x - prev.x) > Math.abs(y - prev.y) * 1.15 : false;
      const crossedBell =
        bellScreen.visible &&
        prev &&
        horizontalSwipe &&
        movedDist > 8 &&
        segmentDist2D(bellScreen.x, bellScreen.y, prev.x, prev.y, x, y) <= bellRadius;
      if (crossedBell) {
        this.world.strikeBell?.(3, 0.95);
        this.sound?.playBellNote?.(3, 0.9, 0);
        this._awardTroll('bell_steal', 200, '🔔', bellWorld);
      }
    }
  }
}
