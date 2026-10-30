import * as THREE from 'three';

export const VENDOR_LEVELS = [
  {
    level: 1,
    name: 'Çırak Kadir',
    speedMult: 0.85,
    finalWindowSec: 3.2,
    passiveLimitSec: 9.5,
    routine: [
      'EMPTY_CONE_AND_SCRAPE_FIRST',
      'SCRAPE_SECOND_AND_EMPTY_TRAP',
      'WRIST_ROLL',
      'SCRAPE_THIRD_AND_SLICE',
      'NAPKIN_CONE_FAKEOUT',
      'FINAL_CATCH',
    ],
  },
  {
    level: 2,
    name: 'Pala Usta',
    speedMult: 1.0,
    finalWindowSec: 2.6,
    passiveLimitSec: 8.5,
    routine: [
      'EMPTY_CONE_AND_SCRAPE_FIRST',
      'SCRAPE_SECOND_AND_EMPTY_TRAP',
      'SHELL_SWAP',
      'SCRAPE_THIRD_AND_SLICE',
      'UPSIDE_DOWN_FAKE',
      'FINAL_CATCH',
    ],
  },
  {
    level: 3,
    name: 'Cezmi Dede',
    speedMult: 1.14,
    finalWindowSec: 2.2,
    passiveLimitSec: 8.0,
    routine: [
      'EMPTY_CONE_AND_SCRAPE_FIRST',
      'SCRAPE_SECOND_AND_EMPTY_TRAP',
      'WRIST_ROLL',
      'SHELL_SWAP',
      'NAPKIN_CONE_FAKEOUT',
      'SCRAPE_THIRD_AND_SLICE',
      'UPSIDE_DOWN_FAKE',
      'FINAL_CATCH',
    ],
  },
];

function buildCurvedScreenPath(p0, p1, bendY = -28, segments = 18) {
  const pts = [];
  const midX = (p0.x + p1.x) * 0.5;
  const midY = (p0.y + p1.y) * 0.5 + bendY;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const inv = 1 - t;
    pts.push({
      x: inv * inv * p0.x + 2 * inv * t * midX + t * t * p1.x,
      y: inv * inv * p0.y + 2 * inv * t * midY + t * t * p1.y,
    });
  }
  return pts;
}

export class TrickDirector {
  constructor(world, sound, saveManager, uiCallbacks) {
    this.world = world;
    this.sound = sound;
    this.save = saveManager;
    this.ui = uiCallbacks;

    this.levelIndex = 0;
    this.floatingPopups = [];
    this.vignetteFlash = { color: 'green', alpha: 0 };
    this.resetRound(0);
  }

  _vibrate(pattern) {
    if (!this.save || !this.save.hapticsEnabled) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore
      }
    }
  }

  _spawnScorePopup(delta, worldPos = this.coneWorldPos, suffix = '') {
    const screen = this.world.projectToScreen(worldPos);
    const isPos = delta >= 0;
    this.floatingPopups.push({
      x: screen.x,
      y: screen.y - 26,
      text: `${isPos ? '+' : ''}${delta}${suffix ? ' ' + suffix : ''}`,
      color: isPos ? 'green' : 'red',
      life: 1.0,
    });
    this.vignetteFlash = {
      color: isPos ? 'green' : 'red',
      alpha: isPos ? 0.28 : 0.45,
    };
  }

  resetRound(levelIdx = this.levelIndex) {
    this.levelIndex = levelIdx % VENDOR_LEVELS.length;
    this.config = VENDOR_LEVELS[this.levelIndex];

    this.world.setVendorCharacter(this.levelIndex);

    this.active = false;
    this.roundEnded = false;

    this.scoopCount = 0;
    this.score = 0;
    this.tricksSurvived = 0;
    this.penaltiesTaken = 0;
    this.overtimeMisses = 0;
    this.idleSeconds = 0;

    this.heldItem = null;
    this.tugTimer = 0;
    this.isGraspingPaddleCone = false;
    this.vendorBubbleText = '';
    this.vendorBubbleTimer = 0;
    this.lastScrapeClankTime = 0;
    this.floatingPopups = [];
    this.vignetteFlash = { color: 'green', alpha: 0 };

    this.coneWorldPos = new THREE.Vector3(0, 1.24, 0.22);
    this.coneTargetPos = new THREE.Vector3(0, 1.24, 0.22);
    this.world.coneSpring.pos.copy(this.coneWorldPos);
    this.world.coneSpring.target.copy(this.coneTargetPos);
    this.world.coneSpring.vel.set(0, 0, 0);
    this.shaftRoll = 0;
    this.coneFlipZ = 0;
    this.leftHandCustomTarget = null;

    this._hideAllProps();
    this._reattachConeToPaddle();

    this.world.updateIceCreamScoops(this.scoopCount);
    this._enterRoutineStep(0);
  }

  _reattachConeToPaddle() {
    if (this.world.conePivot.parent !== this.world.paddleGroup) {
      this.world.paddleGroup.add(this.world.conePivot);
      this.world.conePivot.position.set(0, 0.02, 0);
      this.world.conePivot.rotation.set(0, 0, 0);
    }
  }

  _hideAllProps() {
    this.world.mainConeMesh.visible = true;
    this.world.conePivot.visible = true;
    this.world.decoyConeOnPaddle.visible = false;
    this.world.leftHandConeProp.visible = false;
    this.world.napkinConeProp.visible = false;
    this.world.napkinProp.visible = false;
    this.world.sliceCueGroup.visible = false;
    this.world.stretchyStrand.detach();
    this.world.heldEmptyCone.visible = false;
    this.world.heldNapkin.visible = false;
    if (this.world.heldNapkinCone) {
      this.world.heldNapkinCone.visible = false;
    }
  }

  _triggerVendorSpeech(type = 'hoppa') {
    const soundType =
      type === 'scrape'
        ? 'hoppa'
        : type === 'empty_trap'
          ? 'taunt'
          : type;
    this.sound.speakVendor(soundType, this.levelIndex, this.coneWorldPos.x);
    const keyMap = {
      hoppa: 'speech_hoppa',
      laugh: 'speech_laugh',
      taunt: 'speech_taunt',
      cheer: 'speech_cheer',
      shock: 'speech_shock',
      scrape: 'speech_scrape',
      empty_trap: 'speech_empty_trap',
    };
    this.vendorBubbleText = this.save.t(keyMap[type] || 'speech_hoppa');
    this.vendorBubbleTimer = 1.1;
  }

  startRound() {
    this.active = true;
    this.roundEnded = false;
    this.idleSeconds = 0;
    this.sound.tempoMultiplier = this.config.speedMult;
    this.sound.startMusic();
    this.sound.playBell(0.75, 0);
    this.world.ringBells(0.5);
    this._vibrate(25);
    this._enterRoutineStep(0);
  }

  refreshPromptForLanguage() {
    // Visual cues update dynamically every frame via getGestureGuide()
  }

  _enterRoutineStep(stepIndex) {
    this.routineIndex = stepIndex;
    this.currentMechanic =
      this.config.routine[stepIndex] || 'FINAL_CATCH';
    this.stageTimer = 0;
    this.subStep = 0;
    this.stepCooldown = 0;
    this.tugTimer = 0;
    this.isGraspingPaddleCone = false;
    this.leftHandCustomTarget = null;
    this.shaftRoll = 0;
    this.coneFlipZ = 0;
    this.lastScrapeClankTime = 0;

    this._hideAllProps();
    this._reattachConeToPaddle();
    this.heldItem = null;
    this.world.setVendorMood('smile');

    switch (this.currentMechanic) {
      case 'EMPTY_CONE_AND_SCRAPE_FIRST':
        this.scoopCount = 0;
        this.world.updateIceCreamScoops(0);
        this.coneTargetPos.set(0, 1.24, 0.24);
        break;

      case 'SCRAPE_SECOND_AND_EMPTY_TRAP':
        this.world.setVendorMood('mischief');
        this._triggerVendorSpeech('scrape');
        break;

      case 'WRIST_ROLL':
        this.coneTargetPos.set(0, 1.22, 0.25);
        break;

      case 'SCRAPE_THIRD_AND_SLICE':
        this.scoopCount = 3;
        this.world.updateIceCreamScoops(3);
        this.world.triggerScoopJiggle(1.2);
        this.sound.playPaddleClank(0.1);
        this.sound.playScoopAdded();
        this.coneTargetPos.set(0, 1.48, 0.14);
        this.world.sliceCueGroup.visible = true;
        this.world.stretchyStrand.attach(
          new THREE.Vector3(0.13, 0.98, -0.22),
          this.coneWorldPos,
          0x5c2c16
        );
        break;

      case 'SHELL_SWAP':
        this.world.napkinConeProp.visible = true;
        this.swapSide = Math.random() < 0.5 ? -1 : 1;
        this.coneTargetPos.set(this.swapSide * 0.28, 1.25, 0.2);
        this.leftHandCustomTarget = new THREE.Vector3(
          -this.swapSide * 0.28,
          1.25,
          0.2
        );
        this.world.setVendorMood('mischief');
        this._triggerVendorSpeech('taunt');
        break;

      case 'NAPKIN_CONE_FAKEOUT':
        this.world.napkinConeProp.visible = true;
        this.coneTargetPos.set(-0.38, 1.44, -0.14);
        this.leftHandCustomTarget = new THREE.Vector3(0, 1.22, 0.27);
        this.world.setVendorMood('laugh');
        this._triggerVendorSpeech('taunt');
        break;

      case 'UPSIDE_DOWN_FAKE':
        this.sound.playBell(0.95, 0);
        this.world.ringBells(0.85);
        this.coneFlipZ = Math.PI;
        this.coneTargetPos.set(0, 1.32, 0.24);
        this.world.setVendorMood('mischief');
        this._triggerVendorSpeech('hoppa');
        break;

      case 'FINAL_CATCH':
        this.scoopCount = 4;
        this.world.updateIceCreamScoops(4);
        this.world.triggerScoopJiggle(1.2);
        this.sound.playBell(0.85, 0.2);
        this.world.ringBells(0.7);
        this.coneTargetPos.set(0, 1.22, 0.26);
        this.leftHandCustomTarget = new THREE.Vector3(0.24, 1.92, -0.12);
        break;
    }
  }

  _advanceRoutineStep() {
    this.tricksSurvived++;
    this.sound.playShowBoost(2, this.coneWorldPos.x);
    this.world.spawnBurst(this.coneWorldPos, 0xf5b942, 12);
    this._enterRoutineStep(this.routineIndex + 1);
  }

  _putNapkinConeInTouristHand() {
    this.heldItem = 'NAPKIN_CONE';
    this.world.napkinConeProp.visible = false;
    if (this.world.heldNapkinCone) {
      this.world.heldNapkinCone.visible = true;
    }
    this.penaltiesTaken++;
    this.score = Math.max(0, this.score - 150);
    this._spawnScorePopup(-150, this.world.touristHand.position, '🧻');
    this.sound.playConePop(0);
    this.sound.playPenalty();
    this.world.ringBells(0.75);
    this.world.setVendorMood('laugh');
    this._triggerVendorSpeech('laugh');
    this._vibrate([50, 40, 60]);
  }

  _putEmptyConeTrapInTouristHand() {
    this.heldItem = 'EMPTY_CONE';
    this.world.leftHandConeProp.visible = false;
    this.world.mainConeMesh.visible = false;
    this.world.heldEmptyCone.visible = true;

    this.penaltiesTaken++;
    this.score = Math.max(0, this.score - 180);
    this._spawnScorePopup(-180, this.world.touristHand.position, '🍦');
    this.sound.playConePop(0);
    this.sound.playPenalty();
    this.sound.playBell(0.95, 0);
    this.world.ringBells(0.95);
    this.world.setVendorMood('laugh');
    this._triggerVendorSpeech('laugh');
    this._vibrate([60, 40, 70]);
  }

  attemptSnatch(handWorldPos) {
    if (!this.active || this.roundEnded) return;
    if (this.heldItem === 'NAPKIN_CONE' || this.heldItem === 'EMPTY_CONE') return;
    this.idleSeconds = 0;

    const distToCone = handWorldPos.distanceTo(this.coneWorldPos);

    if (
      this.currentMechanic === 'EMPTY_CONE_AND_SCRAPE_FIRST' &&
      this.subStep === 2 &&
      distToCone < 0.34
    ) {
      this._triggerVendorSpeech('shock');
      this._endRound('EARLY_HALF_CONE');
      return;
    }
  }

  update(dt, time, gestureState) {
    if (this.vendorBubbleTimer > 0) {
      this.vendorBubbleTimer = Math.max(0, this.vendorBubbleTimer - dt);
    }
    if (this.vignetteFlash.alpha > 0) {
      this.vignetteFlash.alpha = Math.max(0, this.vignetteFlash.alpha - dt * 1.4);
    }
    for (let i = this.floatingPopups.length - 1; i >= 0; i--) {
      const fp = this.floatingPopups[i];
      fp.life -= dt * 1.3;
      fp.y -= dt * 48;
      if (fp.life <= 0) this.floatingPopups.splice(i, 1);
    }

    if (!this.active || this.roundEnded) {
      if (!this.roundEnded) {
        this.coneTargetPos.set(
          Math.sin(time * 1.1) * 0.16,
          1.25 + Math.cos(time * 1.5) * 0.04,
          0.2
        );
        this.shaftRoll = Math.sin(time * 1.1) * 0.35;
      }
      this._applyKinematics(dt, time, gestureState);
      return;
    }

    this.stageTimer += dt;
    if (this.stepCooldown > 0) {
      this.stepCooldown = Math.max(0, this.stepCooldown - dt);
    }

    const handPos = gestureState.handWorldPos;
    const distToCone = handPos.distanceTo(this.coneWorldPos);

    if (this.heldItem === 'NAPKIN_CONE') {
      this.isGraspingPaddleCone = false;
      if (
        this.stepCooldown <= 0 &&
        (Math.abs(gestureState.vx) > 1.25 || gestureState.speed > 1.45)
      ) {
        this.world.throwHeldProp('NAPKIN_CONE', gestureState.vx || 1);
        if (this.world.heldNapkinCone) {
          this.world.heldNapkinCone.visible = false;
        }
        this.heldItem = null;
        this.sound.playWhoosh(1.25, 0);
        this._vibrate(25);
        this.score += 140;
        this._spawnScorePopup(140, this.world.touristHand.position);

        if (this.currentMechanic === 'NAPKIN_CONE_FAKEOUT') {
          this._advanceRoutineStep();
        } else if (this.currentMechanic === 'SHELL_SWAP') {
          this.world.napkinConeProp.visible = true;
          this.swapSide *= -1;
          this.stageTimer = 0;
        }
      }
      this._applyKinematics(dt, time, gestureState);
      return;
    }

    if (this.heldItem === 'EMPTY_CONE') {
      this.isGraspingPaddleCone = false;
      this.coneTargetPos.set(0.18, 1.34, 0.22);
      const flickedSideways =
        this.stepCooldown <= 0 &&
        (Math.abs(gestureState.vx) > 1.35 || gestureState.speed > 1.55);
      const attachedUnderScoops =
        this.stepCooldown <= 0 &&
        gestureState.isReaching &&
        distToCone < 0.28;

      if (attachedUnderScoops || flickedSideways) {
        if (flickedSideways && !attachedUnderScoops) {
          this.world.throwHeldProp('EMPTY_CONE', gestureState.vx || 1);
          this.sound.playWhoosh(1.2, 0);
        } else {
          this.sound.playConePop(0);
        }
        this.heldItem = null;
        this.world.heldEmptyCone.visible = false;
        this.world.mainConeMesh.visible = true;
        this.world.triggerScoopJiggle(1.0);
        this._triggerVendorSpeech('hoppa');
        this._vibrate(25);
        this.score += 180;
        this._spawnScorePopup(180, this.coneWorldPos);
        this._advanceRoutineStep();
      }
      this._applyKinematics(dt, time, gestureState);
      return;
    }

    const isScrapingOrTrap =
      (this.currentMechanic === 'EMPTY_CONE_AND_SCRAPE_FIRST' && this.subStep < 2) ||
      this.currentMechanic === 'SCRAPE_SECOND_AND_EMPTY_TRAP' ||
      (this.currentMechanic === 'NAPKIN_CONE_FAKEOUT' && this.subStep === 0) ||
      (this.currentMechanic === 'UPSIDE_DOWN_FAKE' && this.subStep === 0);

    if (!isScrapingOrTrap) {
      if (gestureState.isMoving || gestureState.isPointerDown) {
        this.idleSeconds = 0;
      } else {
        this.idleSeconds += dt;
        if (this.idleSeconds >= this.config.passiveLimitSec) {
          this._endRound('PASSIVE_BORING');
          return;
        }
      }
    }

    switch (this.currentMechanic) {
      case 'EMPTY_CONE_AND_SCRAPE_FIRST': {
        const vanillaTubPos = new THREE.Vector3(-0.39, 1.0, -0.34);

        if (this.subStep === 0) {
          this.coneTargetPos.set(
            Math.sin(this.stageTimer * 4) * 0.08,
            1.24,
            0.25
          );
          if (this.stageTimer >= 0.85) {
            this.subStep = 1;
            this.stageTimer = 0;
            this.world.leftHandConeProp.visible = true;
            this.leftHandCustomTarget = new THREE.Vector3(-0.22, 1.22, 0.16);
            this.world.mainConeMesh.visible = false;
            this.world.scoop1.visible = true;
            this.world.scoop1.scale.set(0.3, 0.3, 0.3);
            this.world.stretchyStrand.attach(
              vanillaTubPos,
              this.coneWorldPos,
              0xfff8e7
            );
            this._triggerVendorSpeech('scrape');
          }
        } else if (this.subStep === 1) {
          const p = Math.min(1, this.stageTimer / 1.65);
          const churnX = -0.39 + Math.sin(this.stageTimer * 10) * 0.07;
          const churnY = 1.04 + Math.abs(Math.sin(this.stageTimer * 7)) * 0.22 + p * 0.14;
          const churnZ = -0.3 + Math.cos(this.stageTimer * 8) * 0.06;

          this.coneTargetPos.set(churnX, churnY, churnZ);
          this.shaftRoll = Math.sin(this.stageTimer * 9) * 0.9;

          const s = 0.35 + p * 0.65;
          this.world.scoop1.scale.set(s, s, s);
          this.world.stretchyStrand.update(
            dt,
            vanillaTubPos,
            this.coneWorldPos,
            1.2
          );

          if (this.stageTimer - this.lastScrapeClankTime > 0.42) {
            this.lastScrapeClankTime = this.stageTimer;
            this.sound.playPaddleClank(-0.35);
          }

          if (this.stageTimer >= 1.65) {
            this.subStep = 2;
            this.stageTimer = 0;
            this.scoopCount = 1;
            this.world.updateIceCreamScoops(1);
            this.world.mainConeMesh.visible = true;
            this.world.leftHandConeProp.visible = false;
            this.leftHandCustomTarget = null;
            this.world.stretchyStrand.detach();
            this.world.triggerScoopJiggle(1.35);
            this.world.spawnBurst(this.coneWorldPos, 0xfff8e7, 14);
            this.sound.playScoopAdded();
            this.coneTargetPos.set(0, 1.22, 0.26);
            this.shaftRoll = 0;
          }
        } else if (this.subStep === 2) {
          if (this.tugTimer > 0) {
            this.tugTimer -= dt;
            this.isGraspingPaddleCone = true;
            this.world.stretchyStrand.update(
              dt,
              this.coneWorldPos,
              handPos,
              0.9
            );
            if (this.tugTimer <= 0) {
              this.isGraspingPaddleCone = false;
              this.world.stretchyStrand.detach();
              this.sound.playWhoosh(1.15, 0);
              this._triggerVendorSpeech('hoppa');
              this._vibrate([20, 30]);
              this.score += 220;
              this._spawnScorePopup(220, this.coneWorldPos);
              this._advanceRoutineStep();
            }
          } else if (gestureState.isReaching && distToCone < 0.28) {
            this.tugTimer = 0.2;
            this.isGraspingPaddleCone = true;
            this.sound.playGripTug(0);
            this.world.stretchyStrand.attach(
              this.coneWorldPos,
              handPos,
              0xfff8e7
            );
            this._vibrate(25);
          }
        }
        break;
      }

      case 'SCRAPE_SECOND_AND_EMPTY_TRAP': {
        const pistachioTubPos = new THREE.Vector3(-0.13, 1.0, -0.34);

        if (this.subStep === 0) {
          const p = Math.min(1, this.stageTimer / 1.6);
          const churnX = -0.13 + Math.sin(this.stageTimer * 10) * 0.07;
          const churnY = 1.05 + Math.abs(Math.cos(this.stageTimer * 7)) * 0.22 + p * 0.15;
          const churnZ = -0.28 + Math.sin(this.stageTimer * 8) * 0.06;

          this.coneTargetPos.set(churnX, churnY, churnZ);
          this.shaftRoll = Math.cos(this.stageTimer * 9) * 0.85;

          this.world.stretchyStrand.attach(
            pistachioTubPos,
            this.coneWorldPos,
            0x76c84d
          );
          this.world.stretchyStrand.update(
            dt,
            pistachioTubPos,
            this.coneWorldPos,
            1.2
          );

          if (this.stageTimer - this.lastScrapeClankTime > 0.42) {
            this.lastScrapeClankTime = this.stageTimer;
            this.sound.playPaddleClank(-0.1);
          }

          if (this.stageTimer >= 1.6) {
            this.subStep = 1;
            this.stageTimer = 0;
            this.scoopCount = 2;
            this.world.updateIceCreamScoops(2);
            this.world.stretchyStrand.detach();
            this.world.triggerScoopJiggle(1.4);
            this.world.spawnBurst(this.coneWorldPos, 0x76c84d, 16);
            this.sound.playScoopAdded();

            this.world.mainConeMesh.visible = false;
            this.world.leftHandConeProp.visible = true;
            this.coneTargetPos.set(0.24, 1.44, 0.06);
            this.leftHandCustomTarget = new THREE.Vector3(0, 1.2, 0.28);
            this.shaftRoll = -0.3;
            this.world.setVendorMood('laugh');
            this._triggerVendorSpeech('empty_trap');
          }
        } else if (this.subStep === 1) {
          const emptyConePos = this.leftHandCustomTarget;
          const distToEmptyCone = handPos.distanceTo(emptyConePos);

          if (
            this.stepCooldown <= 0 &&
            gestureState.isReaching &&
            distToEmptyCone < 0.29
          ) {
            this.stepCooldown = 0.5;
            this._putEmptyConeTrapInTouristHand();
          } else if (this.stageTimer >= 2.15) {
            this.world.mainConeMesh.visible = true;
            this.world.leftHandConeProp.visible = false;
            this.leftHandCustomTarget = null;
            this.sound.playConePop(0);
            this._triggerVendorSpeech('hoppa');
            this._vibrate(25);
            this.score += 360;
            this._spawnScorePopup(360, this.coneWorldPos);
            this._advanceRoutineStep();
          }
        }
        break;
      }

      case 'WRIST_ROLL': {
        if (this.tugTimer > 0) {
          this.tugTimer -= dt;
          this.isGraspingPaddleCone = true;
          this.world.stretchyStrand.update(
            dt,
            this.coneWorldPos,
            handPos.clone().add(new THREE.Vector3(0, 0.03, -0.02)),
            0.9
          );

          if (this.tugTimer <= 0) {
            this.isGraspingPaddleCone = false;
            this.world.stretchyStrand.detach();
            this.subStep++;
            this.stepCooldown = 0.5;
            this.sound.playWhoosh(1.1, this.coneWorldPos.x);
            this._triggerVendorSpeech('hoppa');
            this._vibrate([20, 30]);

            if (this.subStep === 1) {
              this.coneTargetPos.set(-0.28, 1.26, 0.2);
              this.shaftRoll = Math.PI;
              this.score += 150;
              this._spawnScorePopup(150, this.coneWorldPos);
            } else if (this.subStep === 2) {
              this.coneTargetPos.set(0.28, 1.28, 0.2);
              this.shaftRoll = Math.PI * 2;
              this.score += 170;
              this._spawnScorePopup(170, this.coneWorldPos);
            } else {
              this.score += 240;
              this._spawnScorePopup(240, this.coneWorldPos);
              this._advanceRoutineStep();
            }
          }
        } else if (
          this.stepCooldown <= 0 &&
          gestureState.isReaching &&
          distToCone < 0.27
        ) {
          this.tugTimer = 0.22;
          this.isGraspingPaddleCone = true;
          this.sound.playGripTug(this.coneWorldPos.x);
          this.world.stretchyStrand.attach(
            this.coneWorldPos,
            handPos,
            0x76c84d
          );
          this._vibrate(25);
        }
        break;
      }

      case 'SCRAPE_THIRD_AND_SLICE': {
        const chocoTubAnchor = new THREE.Vector3(0.13, 0.98, -0.18);
        this.world.stretchyStrand.update(
          dt,
          chocoTubAnchor,
          this.coneWorldPos,
          1.25
        );

        const strandMid = new THREE.Vector3(0, 1.22, 0.18);
        const distToStrand = handPos.distanceTo(strandMid);

        if (
          gestureState.isReaching &&
          distToStrand < 0.34 &&
          Math.abs(gestureState.vx) > 1.0
        ) {
          this.world.stretchyStrand.detach();
          this.world.sliceCueGroup.visible = false;
          this.sound.playWhoosh(1.3, 0);
          this._triggerVendorSpeech('cheer');
          this._vibrate([20, 30]);
          this.score += 350;
          this._spawnScorePopup(350, strandMid, '✂️');
          this._advanceRoutineStep();
        }
        break;
      }

      case 'SHELL_SWAP': {
        if (this.stageTimer < 1.15) {
          const p = this.stageTimer / 1.15;
          const angle = p * Math.PI;
          const rx = Math.cos(angle) * 0.28 * this.swapSide;
          const rz = 0.18 + Math.sin(angle) * 0.08;
          this.coneTargetPos.set(rx, 1.24, rz);
          this.leftHandCustomTarget.set(-rx, 1.24, 0.36 - rz);
        } else {
          const realX = -0.28 * this.swapSide;
          this.coneTargetPos.set(realX, 1.24, 0.22);
          this.leftHandCustomTarget.set(-realX, 1.24, 0.22);

          if (this.stepCooldown <= 0 && gestureState.isReaching) {
            const distReal = handPos.distanceTo(this.coneWorldPos);
            const distFake = handPos.distanceTo(this.leftHandCustomTarget);

            if (distReal < 0.26) {
              this.sound.playGripTug(this.coneWorldPos.x);
              this._triggerVendorSpeech('cheer');
              this._vibrate(25);
              this.score += 380;
              this._spawnScorePopup(380, this.coneWorldPos);
              this._advanceRoutineStep();
            } else if (distFake < 0.28) {
              this.stepCooldown = 0.45;
              this._putNapkinConeInTouristHand();
            }
          }
        }
        break;
      }

      case 'NAPKIN_CONE_FAKEOUT': {
        const fakeWorldPos = this.leftHandCustomTarget;
        const distToFake = handPos.distanceTo(fakeWorldPos);

        if (
          this.stepCooldown <= 0 &&
          gestureState.isReaching &&
          distToFake < 0.29
        ) {
          this.stepCooldown = 0.45;
          this._putNapkinConeInTouristHand();
        } else if (this.stageTimer >= 1.95) {
          this._triggerVendorSpeech('hoppa');
          this._vibrate(25);
          this.score += 380;
          this._spawnScorePopup(380, this.coneWorldPos);
          this._advanceRoutineStep();
        }
        break;
      }

      case 'UPSIDE_DOWN_FAKE': {
        if (this.subStep === 0) {
          this.coneFlipZ = Math.PI;
          this.coneTargetPos.set(Math.sin(this.stageTimer * 5) * 0.12, 1.28, 0.25);

          if (
            this.stepCooldown <= 0 &&
            gestureState.isReaching &&
            distToCone < 0.26
          ) {
            this.stepCooldown = 0.7;
            this.stageTimer = 0.2;
            this.penaltiesTaken++;
            this.score = Math.max(0, this.score - 120);
            this._spawnScorePopup(-120, this.coneWorldPos, '🙃');
            this.sound.playPenalty();
            this.world.setVendorMood('laugh');
            this._triggerVendorSpeech('laugh');
            this._vibrate([40, 40]);
          } else if (this.stageTimer >= 1.3) {
            this.subStep = 1;
            this.coneFlipZ = 0;
            this.coneTargetPos.set(-0.2, 1.15, 0.25);
            this.sound.playBell(0.8, -0.2);
            this.world.setVendorMood('smile');
            this._triggerVendorSpeech('hoppa');
          }
        } else {
          this.coneFlipZ = 0;
          this.coneTargetPos.set(-0.2, 1.15, 0.25);
          if (gestureState.isReaching && distToCone < 0.27) {
            this.sound.playGripTug(-0.2);
            this._vibrate(22);
            this.score += 340;
            this._spawnScorePopup(340, this.coneWorldPos);
            this._advanceRoutineStep();
          }
        }
        break;
      }

      case 'FINAL_CATCH': {
        if (this.subStep === 0) {
          this.coneTargetPos.set(Math.sin(time * 1.8) * 0.1, 1.22, 0.26);

          if (gestureState.isReaching && distToCone < 0.29) {
            this.subStep = 1;
            this.tugTimer = 0.36;
            this.heldItem = 'FULL_CONE_TUG';
            this.world.heldSocket.add(this.world.conePivot);
            this.world.conePivot.position.set(0, 0.05, 0);
            this.world.conePivot.rotation.set(0, 0, 0);
            this.world.stretchyStrand.attach(
              this.coneWorldPos,
              handPos,
              0xfff8e7
            );
            this.sound.playGripTug(0);
            this._vibrate(35);
            return;
          }

          if (this.stageTimer >= this.config.finalWindowSec) {
            this.stageTimer = 0;
            this.overtimeMisses++;
            this.penaltiesTaken++;
            this.score = Math.max(0, this.score - 200);
            this._spawnScorePopup(-200, this.coneWorldPos, '⏳');
            this.sound.playBell(1.0, 0);
            this.world.ringBells(1.0);
            this.world.setVendorMood('laugh');
            this._triggerVendorSpeech('laugh');
            this._vibrate([50, 30, 50]);

            if (this.overtimeMisses >= 3) {
              this._endRound('BAMBOOZLED_OVERTIME');
              return;
            }
          }
        } else if (this.subStep === 1) {
          this.tugTimer -= dt;
          const handWorld = new THREE.Vector3();
          this.world.touristHand.getWorldPosition(handWorld);
          this.world.stretchyStrand.update(
            dt,
            this.coneWorldPos,
            handWorld.clone().add(new THREE.Vector3(0, 0.08, 0)),
            1.15
          );

          if (this.tugTimer <= 0 || handWorld.distanceTo(this.coneWorldPos) > 0.28) {
            this.world.stretchyStrand.detach();
            this._triggerVendorSpeech('cheer');
            this._endRound('MASTER_CATCH');
            return;
          }
        }
        break;
      }
    }

    this._applyKinematics(dt, time, gestureState);
  }

  getGestureGuide() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const handScreen = this.world.projectToScreen(this.world.touristHand.position);
    const coneScreen = this.world.projectToScreen(
      this.coneWorldPos.clone().add(new THREE.Vector3(0, 0.04, 0))
    );
    const vendorHeadScreen = this.world.projectToScreen(
      new THREE.Vector3(0, 1.72, -0.58)
    );
    const safePullScreen = { x: w * 0.56, y: h * 0.84 };

    const routineProgress = Math.min(
      1,
      this.routineIndex / Math.max(1, this.config.routine.length - 1)
    );

    const guide = {
      active: this.active && !this.roundEnded,
      theme: 'green',
      icon: '🤚⬆️',
      badgeText: this.save.t('cue_reach'),
      routineProgress,
      stageProgress: 0.5,
      comets: [],
      rings: [],
      floatingPopups: this.floatingPopups,
      vignetteFlash: this.vignetteFlash,
      vendorBubble:
        this.vendorBubbleTimer > 0
          ? {
              x: vendorHeadScreen.x + 68,
              y: Math.max(76, vendorHeadScreen.y - 18),
              text: this.vendorBubbleText,
              alpha: Math.min(1, this.vendorBubbleTimer * 2.2),
            }
          : null,
    };

    if (!guide.active) return guide;

    if (this.heldItem === 'NAPKIN_CONE') {
      guide.theme = 'red';
      guide.icon = '🤚💨';
      guide.badgeText = this.save.t('cue_toss_fake');
      const tossTarget = {
        x: handScreen.x > w * 0.5 ? Math.max(60, handScreen.x - 180) : Math.min(w - 60, handScreen.x + 180),
        y: handScreen.y - 35,
      };
      guide.comets.push({
        color: 'red',
        points: buildCurvedScreenPath(handScreen, tossTarget, -28),
      });
      guide.rings.push({
        x: tossTarget.x,
        y: tossTarget.y,
        radius: 36,
        color: 'red',
        label: '🤚💨',
      });
      return guide;
    }

    if (this.heldItem === 'EMPTY_CONE') {
      guide.theme = 'amber';
      guide.icon = '🍦⬆️';
      guide.badgeText = this.save.t('cue_return_cone');
      guide.comets.push({
        color: 'green',
        points: buildCurvedScreenPath(handScreen, coneScreen, -28),
      });
      guide.rings.push({
        x: coneScreen.x,
        y: coneScreen.y,
        radius: 38,
        color: 'green',
        label: '🍦⬆️',
      });
      return guide;
    }

    if (this.isGraspingPaddleCone || this.heldItem === 'FULL_CONE_TUG') {
      guide.theme = 'green';
      guide.icon = '✊⬇️';
      guide.badgeText = this.save.t('cue_tug');
      guide.comets.push({
        color: 'green',
        points: buildCurvedScreenPath(coneScreen, safePullScreen, 16),
      });
      guide.rings.push({
        x: coneScreen.x,
        y: coneScreen.y,
        radius: 42,
        color: 'green',
        label: '✊',
      });
      return guide;
    }

    switch (this.currentMechanic) {
      case 'EMPTY_CONE_AND_SCRAPE_FIRST': {
        if (this.subStep < 2) {
          guide.theme = 'amber';
          guide.icon = '🥄🍦';
          guide.badgeText = this.save.t('cue_scraping');
          guide.stageProgress =
            this.subStep === 0 ? 0.25 : 0.25 + (this.stageTimer / 1.65) * 0.75;
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 34,
            color: 'amber',
            label:
              this.subStep === 0
                ? this.save.t('tag_empty')
                : this.save.t('tag_scraping'),
          });
        } else {
          guide.theme = 'green';
          guide.icon = '🤚⬆️';
          guide.badgeText = this.save.t('cue_reach');
          guide.comets.push({
            color: 'green',
            points: buildCurvedScreenPath(handScreen, coneScreen, -24),
          });
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 38,
            color: 'green',
            label: this.save.t('tag_grab'),
          });
        }
        break;
      }

      case 'SCRAPE_SECOND_AND_EMPTY_TRAP': {
        if (this.subStep === 0) {
          guide.theme = 'amber';
          guide.icon = '🥄🟢';
          guide.badgeText = this.save.t('cue_scraping');
          guide.stageProgress = this.stageTimer / 1.6;
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 34,
            color: 'amber',
            label: this.save.t('tag_scoop2'),
          });
        } else {
          const emptyConeScreen = this.leftHandCustomTarget
            ? this.world.projectToScreen(this.leftHandCustomTarget)
            : { x: w * 0.5, y: h * 0.5 };

          guide.theme = 'red';
          guide.icon = '🤚⬇️';
          guide.badgeText = this.save.t('cue_empty_trap');
          guide.stageProgress = Math.min(1, this.stageTimer / 2.15);
          guide.comets.push({
            color: 'red',
            points: buildCurvedScreenPath(emptyConeScreen, safePullScreen, 18),
          });
          guide.rings.push({
            x: emptyConeScreen.x,
            y: emptyConeScreen.y,
            radius: 42,
            color: 'red',
            label: this.save.t('tag_empty_trap'),
          });
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 32,
            color: 'amber',
            label: this.save.t('tag_on_paddle'),
          });
        }
        break;
      }

      case 'WRIST_ROLL': {
        guide.theme = 'green';
        guide.icon = '🤚⬆️';
        guide.badgeText = this.save.t('cue_reach');
        guide.stageProgress = (this.subStep + 0.3) / 3;
        guide.comets.push({
          color: 'green',
          points: buildCurvedScreenPath(handScreen, coneScreen, -24),
        });
        guide.rings.push({
          x: coneScreen.x,
          y: coneScreen.y,
          radius: 36,
          color: 'green',
          label: '🤚',
        });
        break;
      }

      case 'SCRAPE_THIRD_AND_SLICE': {
        guide.theme = 'green';
        guide.icon = '✂️↔️';
        guide.badgeText = this.save.t('cue_slice');
        const leftCut = this.world.projectToScreen(new THREE.Vector3(-0.26, 1.22, 0.18));
        const rightCut = this.world.projectToScreen(new THREE.Vector3(0.26, 1.22, 0.18));
        guide.comets.push({
          color: 'green',
          points: buildCurvedScreenPath(leftCut, rightCut, -8),
        });
        guide.rings.push({
          x: (leftCut.x + rightCut.x) * 0.5,
          y: (leftCut.y + rightCut.y) * 0.5,
          radius: 30,
          color: 'green',
          label: '✂️',
        });
        break;
      }

      case 'SHELL_SWAP': {
        const fakeScreen = this.leftHandCustomTarget
          ? this.world.projectToScreen(this.leftHandCustomTarget)
          : { x: w * 0.35, y: h * 0.48 };

        if (this.stageTimer < 1.15) {
          guide.theme = 'amber';
          guide.icon = '👀🔄';
          guide.badgeText = this.save.t('cue_swap_watch');
          guide.stageProgress = this.stageTimer / 1.15;
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 30,
            color: 'green',
            label: '🍦',
          });
          guide.rings.push({
            x: fakeScreen.x,
            y: fakeScreen.y,
            radius: 30,
            color: 'red',
            label: '🧻',
          });
        } else {
          guide.theme = 'green';
          guide.icon = '🤚🍦';
          guide.badgeText = this.save.t('cue_swap_pick');
          guide.comets.push({
            color: 'green',
            points: buildCurvedScreenPath(handScreen, coneScreen, -24),
          });
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 38,
            color: 'green',
            label: '✓ 🍦',
          });
          guide.rings.push({
            x: fakeScreen.x,
            y: fakeScreen.y,
            radius: 34,
            color: 'red',
            label: '✕ 🧻',
          });
        }
        break;
      }

      case 'NAPKIN_CONE_FAKEOUT': {
        const fakeScreen = this.leftHandCustomTarget
          ? this.world.projectToScreen(this.leftHandCustomTarget)
          : { x: w * 0.5, y: h * 0.48 };

        guide.theme = 'red';
        guide.icon = '🤚⬇️';
        guide.badgeText = this.save.t('cue_pull_back');
        guide.stageProgress = Math.min(1, this.stageTimer / 1.95);
        guide.comets.push({
          color: 'red',
          points: buildCurvedScreenPath(fakeScreen, safePullScreen, 18),
        });
        guide.rings.push({
          x: fakeScreen.x,
          y: fakeScreen.y,
          radius: 42,
          color: 'red',
          label: '✕ 🧻',
        });
        guide.rings.push({
          x: safePullScreen.x,
          y: safePullScreen.y,
          radius: 32,
          color: 'red',
          label: '🤚⬇️',
        });
        break;
      }

      case 'UPSIDE_DOWN_FAKE': {
        if (this.subStep === 0) {
          guide.theme = 'red';
          guide.icon = '🤚⬇️';
          guide.badgeText = this.save.t('cue_pull_back');
          guide.stageProgress = Math.min(1, this.stageTimer / 1.3);
          guide.comets.push({
            color: 'red',
            points: buildCurvedScreenPath(coneScreen, safePullScreen, 15),
          });
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 40,
            color: 'red',
            label: '✕ 🙃',
          });
        } else {
          guide.theme = 'green';
          guide.icon = '🤚⬆️';
          guide.badgeText = this.save.t('cue_reach');
          guide.comets.push({
            color: 'green',
            points: buildCurvedScreenPath(handScreen, coneScreen, -20),
          });
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 38,
            color: 'green',
            label: '✓ 🤚',
          });
        }
        break;
      }

      case 'FINAL_CATCH': {
        guide.theme = 'green';
        guide.icon = '✊👑';
        guide.badgeText = this.save.t('cue_final_grab');
        guide.stageProgress = Math.max(
          0,
          1 - this.stageTimer / Math.max(0.5, this.config.finalWindowSec)
        );
        guide.comets.push({
          color: 'green',
          points: buildCurvedScreenPath(handScreen, coneScreen, -24),
        });
        guide.rings.push({
          x: coneScreen.x,
          y: coneScreen.y,
          radius: 46,
          color: 'green',
          label: '👑 ✊',
        });
        break;
      }
    }

    return guide;
  }

  _applyKinematics(dt, time, gestureState) {
    if (this.isGraspingPaddleCone && gestureState) {
      const coupledTarget = this.coneTargetPos
        .clone()
        .lerp(gestureState.handWorldPos, 0.45);
      this.world.coneSpring.target.copy(coupledTarget);
    } else {
      this.world.coneSpring.target.copy(this.coneTargetPos);
    }

    this.coneWorldPos.copy(this.world.coneSpring.step(dt));
    this.world.paddleGroup.position.copy(this.coneWorldPos);

    this.world.vendorTorso.rotation.y = THREE.MathUtils.clamp(
      this.coneWorldPos.x * 0.36,
      -0.32,
      0.32
    );
    this.world.vendorTorso.rotation.x = THREE.MathUtils.clamp(
      (1.32 - this.coneWorldPos.y) * 0.16 + (this.isGraspingPaddleCone ? 0.08 : 0),
      -0.18,
      0.24
    );
    this.world.vendorHead.rotation.y = this.coneWorldPos.x * 0.28;
    this.world.fezTassel.rotation.z =
      -0.35 - this.coneWorldPos.x * 0.35 + Math.sin(time * 3.5) * 0.05;

    this.world.orientPaddleAndHands(
      this.shaftRoll,
      this.leftHandCustomTarget,
      dt,
      this.coneFlipZ
    );
  }

  _endRound(outcomeType) {
    if (this.roundEnded) return;
    this.roundEnded = true;
    this.active = false;
    this.isGraspingPaddleCone = false;
    this.world.napkinProp.visible = false;
    this.world.napkinConeProp.visible = false;
    this.world.leftHandConeProp.visible = false;
    this.world.sliceCueGroup.visible = false;
    this.world.stretchyStrand.detach();

    const ustaDisplayName = this.save.getUstaName(this.levelIndex);
    let resultData = {};

    if (outcomeType === 'EARLY_HALF_CONE') {
      this.world.heldSocket.add(this.world.conePivot);
      this.world.conePivot.position.set(0, 0.05, 0);
      this.world.conePivot.rotation.set(0, 0, 0);
      this.world.setVendorMood('shock');

      this.sound.playPenalty();
      this._vibrate([40, 60]);
      const finalScore = Math.max(100, Math.round(this.score + 100));
      this.save.recordResult(this.levelIndex, finalScore, 1, false);

      resultData = {
        outcomeType,
        badge: this.save.t('end_early_badge'),
        icon: '🍦',
        title: this.save.t('end_early_title'),
        desc: this.save.t('end_early_desc'),
        stars: '⭐☆☆',
        score: finalScore,
        bestScore: this.save.getBestScore(this.levelIndex),
        scoopsText: this.save.t('end_early_scoop'),
        canAdvance: false,
      };
    } else if (outcomeType === 'PASSIVE_BORING') {
      this.world.heldSocket.add(this.world.conePivot);
      this.world.conePivot.position.set(0, 0.05, 0);
      this.world.conePivot.rotation.set(0, 0, 0);

      this.sound.playPenalty();
      this._vibrate(80);
      this.save.recordResult(this.levelIndex, 0, 0, false);

      resultData = {
        outcomeType,
        badge: this.save.t('end_passive_badge'),
        icon: '😴',
        title: this.save.t('end_passive_title'),
        desc: this.save.t('end_passive_desc'),
        stars: '☆☆☆',
        score: 0,
        bestScore: this.save.getBestScore(this.levelIndex),
        scoopsText: this.save.t('end_passive_scoop'),
        canAdvance: false,
      };
    } else if (outcomeType === 'BAMBOOZLED_OVERTIME') {
      this.sound.playBellBurst();
      this.world.ringBells(1.3);
      if (this.world.heldNapkinCone) {
        this.world.heldNapkinCone.visible = true;
      } else {
        this.world.heldNapkin.visible = true;
      }
      this.world.setVendorMood('laugh');
      this._triggerVendorSpeech('laugh');
      this._vibrate([80, 40, 80, 40, 120]);
      const penalizedScore = Math.max(0, Math.round(this.score * 0.4));
      this.save.recordResult(this.levelIndex, penalizedScore, 1, false);

      resultData = {
        outcomeType,
        badge: this.save.t('end_overtime_badge'),
        icon: '🧻',
        title: this.save.t('end_overtime_title'),
        desc: this.save.t('end_overtime_desc'),
        stars: '⭐☆☆',
        score: penalizedScore,
        bestScore: this.save.getBestScore(this.levelIndex),
        scoopsText: this.save.t('end_overtime_scoop'),
        canAdvance: false,
      };
    } else if (outcomeType === 'MASTER_CATCH') {
      this.world.heldSocket.add(this.world.conePivot);
      this.world.conePivot.position.set(0, 0.05, 0);
      this.world.conePivot.rotation.set(0, 0, 0);
      this.world.setVendorMood('laugh');

      this.sound.playWinFanfare();
      this.world.ringBells(1.0);
      this._vibrate([40, 30, 80]);
      this.world.spawnBurst(this.coneWorldPos, 0xf5b942, 28);
      this.world.spawnBurst(this.coneWorldPos, 0x70e000, 20);

      const finalScore = Math.round(this.score + 800);
      const starNum = this.penaltiesTaken === 0 ? 3 : 2;
      this.save.recordResult(this.levelIndex, finalScore, starNum, true);

      resultData = {
        outcomeType,
        badge: `${ustaDisplayName} • ${this.save.t('end_win_badge')}`,
        icon: '🏆',
        title: this.save.t('end_win_title'),
        desc: this.save.t('end_win_desc'),
        stars: starNum === 3 ? '⭐⭐⭐' : '⭐⭐☆',
        score: finalScore,
        bestScore: this.save.getBestScore(this.levelIndex),
        scoopsText: this.save.t('end_win_scoop'),
        canAdvance: true,
      };
    }

    setTimeout(() => {
      this.ui.onRoundEnd(resultData);
    }, 850);
  }
}
