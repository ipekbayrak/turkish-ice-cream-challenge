import * as THREE from 'three';
import { getShellTargets } from '../src/shell-targeting.js';
import { TouchReach, TOUCH_DOT_RADIUS } from '../src/touch-reach.js';
import { stretchCutGuide } from '../src/stretch-cut.js';
import { figureEightWorldPoint } from '../src/figure-eight.js';
import { layeredServiceCue, LAYERED_SERVICE_ID } from '../src/serving-sequence.js';
import { customerServiceCue, CUSTOMER_SERVICE_IDS } from '../src/customer-service.js';

/** Development-only valid-input driver. Never imports saves or skips director steps. */
export class RoutinePreviewDriver {
  constructor(director, world) {
    this.director = director; this.world = world;
    this.touchEnabled = false; this.touchReach = new TouchReach(world); this.reset();
  }
  setTouchMode(enabled) { this.touchEnabled = Boolean(enabled); this.reset(); }
  reset() {
    this.touchReach.end();
    this.time = 0; this.actionKey = ''; this.actionStart = 0; this.mode = 'wait';
    this.input = {
      isPointerDown: false, isMouseHover: false, isReaching: false, isMoving: false,
      pointerEpoch: 0, cancelEpoch: 0, normX: 0, normY: -1, vx: 0, vy: 0, speed: 0,
      pointerType: null, pointerX: 0, pointerY: 0, aimNormX: null, aimNormY: null,
      grabCurl: .14, lungeBoost: 0, handWorldPos: new THREE.Vector3(.22,1.04,.64),
      intentWorldPos: new THREE.Vector3(.22,1.04,.64), trailPoints: [],
    };
  }
  move(point, dt) {
    const s = this.input, previousX = s.normX, previousY = s.normY;
    if (this.touchEnabled) {
      // Inverse only the intended palm point. Actual director input still runs
      // through the same raw-finger -> TouchReach conversion as production.
      const reach = this.touchReach, desired = point.clone(); desired.z = .26;
      const projected = desired.clone().project(reach.camera);
      const inset = TOUCH_DOT_RADIUS + 1;
      s.pointerX = THREE.MathUtils.clamp((projected.x + 1) * .5 * reach.width, inset, reach.width - inset);
      s.pointerY = THREE.MathUtils.clamp(reach.contactAt(desired).y, inset, reach.height - inset);
      s.normX = s.pointerX / reach.width * 2 - 1;
      s.normY = 1 - s.pointerY / reach.height * 2;
      s.intentWorldPos.copy(reach.update(s.pointerX, s.pointerY));
      s.aimNormX = reach.aimX; s.aimNormY = reach.aimY;
    } else {
      s.normX = THREE.MathUtils.clamp(point.x / .54, -1, 1);
      s.normY = THREE.MathUtils.clamp((point.y - 1.22) / .36, -1, 1);
      s.intentWorldPos.set(THREE.MathUtils.clamp(s.normX * .54, -.5, .5), THREE.MathUtils.clamp(1.22 + s.normY * .36, .92, 1.72), THREE.MathUtils.lerp(.48, .26, THREE.MathUtils.clamp((s.normY + .48) / .52, 0, 1)));
    }
    s.vx = (s.normX - previousX) / dt; s.vy = (s.normY - previousY) / dt;
    s.speed = Math.hypot(s.vx, s.vy); s.isMoving = s.speed > .03;
  }
  begin(key) {
    if (this.actionKey !== key) {
      this.actionKey = key; this.actionStart = this.time; this.input.pointerEpoch++;
      if (this.touchEnabled) {
        const rect = this.world.canvas.getBoundingClientRect();
        this.touchReach.begin(this.world.camera, rect.width, rect.height);
      }
    }
    this.input.pointerType = this.touchEnabled ? 'touch' : null;
    this.input.isPointerDown = this.input.isReaching = true;
  }
  reachScreen(key, screen, viewport, dt) {
    this.begin(key); this.mode = 'pick-real';
    const ray = new THREE.Vector3(screen.x / viewport.width * 2 - 1, 1 - screen.y / viewport.height * 2, .5)
      .unproject(this.touchReach.camera).sub(this.touchReach.camera.position).normalize();
    this.move(this.touchReach.camera.position.clone().addScaledVector(ray, (.26 - this.touchReach.camera.position.z) / ray.z), dt);
  }
  reach(key, point, dt, mode = 'reach') { this.begin(key); this.mode = mode; this.move(point, dt); }
  release() {
    const s = this.input;
    s.isPointerDown = s.isReaching = s.isMoving = false; s.vx = s.vy = s.speed = 0;
    s.intentWorldPos.set(.22,1.04,.64); this.actionKey = ''; this.mode = 'wait';
    s.pointerType = null; s.aimNormX = s.aimNormY = null; this.touchReach.end();
  }
  slice(key, dt) {
    this.begin(key);
    this.mode = 'slice';
    this.move(new THREE.Vector3(this.time - this.actionStart > .08 ? .22 : -.22, 1.22, .27), dt);
  }
  pull(key, dt, anchor = this.director.coneWorldPos) {
    if (this.actionKey !== key) this.pullX = THREE.MathUtils.clamp(anchor?.x ?? 0, -.32, .32);
    this.begin(key);
    this.mode = 'pull';
    const y = this.time - this.actionStart > .05 ? 1.18 : 1.35;
    this.move(new THREE.Vector3(this.pullX ?? 0, y, .26), dt);
  }
  cutAcross(key, dt) {
    if (this.director.stageTimer < .40) { this.release(); return; }
    if (this.actionKey !== key) this.cutPath = stretchCutGuide(this.world);
    this.begin(key);
    const path = this.cutPath;
    if (!path) return;
    const progress = THREE.MathUtils.clamp((this.time - this.actionStart - .18) / .18, 0, 1);
    const screen = { x: path.center.x + path.normal.x * path.span * progress, y: path.center.y + path.normal.y * path.span * progress };
    if (this.touchEnabled) this.reachScreen(key, screen, path.viewport, dt);
    else this.reach(key, new THREE.Vector3((screen.x / path.viewport.width * 2 - 1) * .54, 1.22 + (1 - screen.y / path.viewport.height * 2) * .36, .27), dt);
    this.mode = progress === 0 ? 'push-strand' : 'cut-across';
  }
  update(dt) {
    this.time += dt;
    const d = this.director, world = this.world;
    const key = `${d.currentMechanic}:${d.choreography?.index}:${d.subStep}:${d.heldItem || ''}:${d.bellBeatsDone}`;
    if (!d.active || d.roundEnded || d.trickTransition || d.pendingTrickEntry || d.servingHandoff || d.entryPaperPreparation || d.pendingEntryPaper || d.pendingTrickAdvance > 0 || d.choreography?.bridge) { this.release(); return this.input; }
    if (d.currentMechanic === 'DOUBLE_CONE_SLIDE') {
      if (d.subStep === 0 && d.stageTimer > .56) this.reach(`${key}:catch`, world.outerConeGroup.getWorldPosition(new THREE.Vector3()), dt);
      else if (d.subStep === 1 && !d.nestedService?.pulled) this.pull(`${key}:pull`, dt, d.coneWorldPos);
      else if (d.subStep === 1 && d.stageTimer > .52) this.reach(`${key}:return`, d.coneWorldPos, dt, 'return');
      else this.release();
      return this.input;
    }
    if (d.heldItem === 'EMPTY_CONE') { this.reach(key, d.coneWorldPos, dt, 'return'); return this.input; }
    if (d.heldItem === 'NAPKIN_CONE') { this.slice(key, dt); return this.input; }
    if (d.currentMechanic === 'NAPKIN_CONE_FAKEOUT') {
      if (d.subStep === 0 && d.stageTimer > .4) this.reach(key, world.servingNapkin.getWorldPosition(new THREE.Vector3()), dt, 'pinch');
      else if (d.subStep === 1 && !d.servingNapkinState?.pulled) this.pull(`${key}:pull`, dt, world.servingNapkin.getWorldPosition(new THREE.Vector3()));
      else if (d.subStep === 3 && d.stageTimer > .41) this.reach(key, d.coneWorldPos, dt);
      else this.release();
    } else if (d.currentMechanic === LAYERED_SERVICE_ID || CUSTOMER_SERVICE_IDS.includes(d.currentMechanic)) {
      const cue = d.currentMechanic === LAYERED_SERVICE_ID ? layeredServiceCue(d) : customerServiceCue(d);
      if (!cue || cue.kind === 'wait') this.release();
      else if (cue.kind === 'pull') this.pull(`${key}:pull`, dt, cue.target);
      else if (this.touchEnabled && cue.screen && cue.viewport) this.reachScreen(`${key}:${cue.kind}`, cue.screen, cue.viewport, dt);
      else this.reach(`${key}:${cue.kind}`, cue.target, dt, cue.kind);
    } else if (d.currentMechanic === 'MEGA_TAFFY_SLICE') this.cutAcross(key, dt);
    else if (d.currentMechanic === 'FIGURE_EIGHT_WEAVE') {
      this.begin(key);const progress=Math.min(1,(this.time-this.actionStart)/1.8),frame=d.figureEight.frame;
      this.move(figureEightWorldPoint(frame,progress),dt);
      const screen={x:frame.center.x+Math.sin(progress*Math.PI*2)*frame.rx,y:frame.center.y-Math.sin(progress*Math.PI*4)*frame.ry};
      this.input.aimNormX=screen.x/frame.viewport.width*2-1;this.input.aimNormY=1-screen.y/frame.viewport.height*2;this.mode='draw-eight';
    } else if (d.currentMechanic === 'EYE_LOCK_RHYTHM_CHASE') {
      if (d.subStep === 0) this.reach(key, new THREE.Vector3(d.coneWorldPos.x * .5, 1.15, .41), dt, 'midpoint');
      else this.reach(`${key}:${d.rhythmBeatsCompleted}:${d.rhythmTargetPos.x.toFixed(3)}`, d.rhythmTargetPos, dt, 'follow');
    } else if (['GIANT_BLOCK_TEASE','MIDAIR_BLOCK_SOMERSAULT','VERTICAL_WINDMILL','UPSIDE_DOWN_GRAVITY','FAKE_DROP_PANIC','OVERHEAD_CROWN_DANGLE','COMBO_DOUBLE_PUMP','WHOLE_MOLD_ON_CONE'].includes(d.currentMechanic)) {
      if (d.subStep === 0) this.release(); else this.reach(key, d.coneWorldPos, dt);
    } else if (d.currentMechanic === 'BELL_RHYTHM_FEINT') {
      if (d.bellBeatsDone < 2) this.release(); else this.reach(key, d.coneWorldPos, dt);
    } else if (d.currentMechanic === 'SHELL_SWAP_DUEL') {
      if (d.stageTimer < 1.25) this.release();
      else {
        const targets = getShellTargets(world);
        if (!targets.real.visible) this.release();
        else if (this.touchEnabled) this.reachScreen(key, targets.real.screen, targets.viewport, dt);
        else {
          const nx = targets.real.screen.x / targets.viewport.width * 2 - 1;
          const ny = 1 - targets.real.screen.y / targets.viewport.height * 2;
          this.reach(key, new THREE.Vector3(nx * .54, 1.22 + ny * .36, .27), dt, 'pick-real');
        }
      }
    } else if (d.currentMechanic === 'SCOOP_LIFT_BACK') {
      if (d.subStep === 0 && !d.extraTrick?.fullCaught) {
        if (d.stageTimer > .36) this.reach(`${key}:catch`, world.conePivot.getWorldPosition(new THREE.Vector3()), dt, 'take-full');
        else this.release();
      } else if (d.subStep === 0 && !d.extraTrick?.liftPulled) this.pull(`${key}:pull`, dt, world.conePivot.getWorldPosition(new THREE.Vector3()));
      else if (d.subStep === 1) this.reach(`${key}:return`, d.coneWorldPos, dt, 'return');
      else if (d.subStep === 2 && d.stageTimer > .56) this.reach(key, d.coneWorldPos, dt);
      else this.release();
    } else if (d.currentMechanic === 'BONUS_SCOOP_TAKEBACK') {
      if (d.subStep === 0 && d.stageTimer > .41) this.reach(key, d.coneWorldPos, dt, 'take-cone');
      else if (d.subStep === 1&&d.stageTimer>=1.10) this.reach(key, d.coneWorldPos, dt, 'return');
      else if (d.subStep === 3) this.reach(key, d.coneWorldPos, dt);
      else this.release();
    } else this.reach(key, d.coneWorldPos, dt, 'reach-hold');
    return this.input;
  }
}

export function seededPreviewRandom(seed = 71931) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let x = Math.imul(state ^ state >>> 15, state | 1);
    x ^= x + Math.imul(x ^ x >>> 7, x | 61);
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
}
