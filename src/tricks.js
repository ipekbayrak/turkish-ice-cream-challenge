import * as THREE from 'three';
import {
  CAMPAIGN_LEVELS,
  GAME_MODES,
  GameSessionProtocol,
  ICE_CREAM_FLAVORS,
  PLAYER_ROLES,
  TRICK_CATALOG,
} from './protocol.js';

export { CAMPAIGN_LEVELS, ICE_CREAM_FLAVORS, TRICK_CATALOG };

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

function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export class TrickDirector {
  constructor(world, sound, saveManager, uiCallbacks) {
    this.world = world;
    this.sound = sound;
    this.save = saveManager;
    this.ui = uiCallbacks;

    // Multiplayer & Play-As-Vendor ready protocol bus
    this.protocol = new GameSessionProtocol(
      GAME_MODES.SINGLEPLAYER_CUSTOMER,
      PLAYER_ROLES.CUSTOMER
    );

    this.currentStage = this.save?.data?.unlockedStage || 1;
    this.levelIndex = 0;
    this.targetScoopCount = this.save?.data?.preferredScoopCount || 3;
    this.selectedFlavors = (this.save?.data?.preferredFlavors || [0, 1, 2, 3]).slice();
    this.forceTutorialNext = false;

    this.floatingPopups = [];
    this.vignetteFlash = { color: 'green', alpha: 0 };

    this.resetRound(this.currentStage);
  }

  setOrderConfig(scoopCount, flavorIndices) {
    this.targetScoopCount = Math.max(2, Math.min(4, Number(scoopCount) || 3));
    if (Array.isArray(flavorIndices) && flavorIndices.length > 0) {
      this.selectedFlavors = flavorIndices.slice(0, 4);
      while (this.selectedFlavors.length < 4) {
        this.selectedFlavors.push(
          this.selectedFlavors[this.selectedFlavors.length - 1] ?? 0
        );
      }
    }
    this.save.setOrderPreferences(this.targetScoopCount, this.selectedFlavors);
    this.world.applySelectedFlavorColors(this.selectedFlavors);
  }

  _getFlavorForScoop(scoopIdxZeroBased) {
    const fIdx =
      this.selectedFlavors[scoopIdxZeroBased % this.selectedFlavors.length] ?? 0;
    return (
      ICE_CREAM_FLAVORS[fIdx % ICE_CREAM_FLAVORS.length] || ICE_CREAM_FLAVORS[0]
    );
  }

  _getTubWorldPosForScoop(scoopIdxZeroBased) {
    const flav = this._getFlavorForScoop(scoopIdxZeroBased);
    const tub =
      this.world.tubPositions[flav.index % this.world.tubPositions.length] ||
      this.world.tubPositions[0];
    return tub
      ? tub.worldPos.clone()
      : new THREE.Vector3(flav.xOffset || 0, 1.0, -0.34);
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
      alpha: isPos ? 0.28 : 0.48,
    };
  }

  _loseHeart(worldPos = this.coneWorldPos, icon = '💔') {
    this.penaltiesTaken++;
    this.hearts = Math.max(0, this.hearts - 1);
    this.score = Math.max(0, this.score - 160);
    this._spawnScorePopup(-160, worldPos, icon);
    this.sound.playPenalty();
    this.sound.playCrowdReaction('gasp');
    this.world.triggerSpectatorReaction('gasp');
    this.world.ringBells(0.85);
    this.world.setVendorMood('laugh');
    this._vibrate([60, 40, 75]);

    if (this.hearts <= 0) {
      this._triggerVendorSpeech('laugh');
      this._endRound('OUT_OF_HEARTS');
      return true;
    }
    return false;
  }

  /**
   * Builds a dynamic, semi-randomized & progressive routine for the given stage (1..10)
   * so no two rounds play identically!
   */
  _buildDynamicRoutineForStage(stageCfg, includeTutorial = false) {
    const seq = [];
    if (includeTutorial) {
      seq.push('TUTORIAL_WARMUP');
    }

    // Always start by scraping the 1st chosen flavor & introducing the signature Double Cone or Giant Block
    seq.push('SCRAPE_FLAVOR_SCOOP');

    const pool = shuffleArray(stageCfg.trickPool || []);
    const count = Math.max(3, stageCfg.trickCount || 4);
    const chosenTricks = [];

    // Ensure high variety by picking from the shuffled pool
    for (let i = 0; i < count; i++) {
      const candidate = pool[i % pool.length];
      if (
        chosenTricks.length > 0 &&
        chosenTricks[chosenTricks.length - 1] === candidate
      ) {
        const alt = pool[(i + 1) % pool.length];
        chosenTricks.push(alt);
      } else {
        chosenTricks.push(candidate);
      }
    }

    // Interleave scoop additions across the routine until reaching targetScoopCount
    let scoopsScheduled = 1;
    const interval = Math.max(
      1,
      Math.floor(chosenTricks.length / Math.max(1, this.targetScoopCount - 1))
    );

    chosenTricks.forEach((trickId, idx) => {
      seq.push(trickId);
      if (
        scoopsScheduled < this.targetScoopCount &&
        (idx + 1) % interval === 0 &&
        trickId !== 'GIANT_BLOCK_TEASE' &&
        trickId !== 'MEGA_TAFFY_SLICE'
      ) {
        seq.push('SCRAPE_FLAVOR_SCOOP');
        scoopsScheduled++;
      }
    });

    while (scoopsScheduled < this.targetScoopCount) {
      seq.push('SCRAPE_FLAVOR_SCOOP');
      scoopsScheduled++;
    }

    seq.push('FINAL_PISTACHIO_CATCH');
    return seq;
  }

  resetRound(stageNumber = this.currentStage, runTutorial = false) {
    const clampedStage = Math.max(
      1,
      Math.min(CAMPAIGN_LEVELS.length, Number(stageNumber) || 1)
    );
    this.currentStage = clampedStage;
    this.config = CAMPAIGN_LEVELS[clampedStage - 1] || CAMPAIGN_LEVELS[0];
    this.levelIndex = this.config.vendorIdx;

    this.world.setVendorCharacter(this.levelIndex);
    this.world.applySelectedFlavorColors(this.selectedFlavors);

    this.active = false;
    this.roundEnded = false;

    this.maxHearts = this.config.hearts || 3;
    this.hearts = this.maxHearts;
    this.scoopCount = 0;
    this.score = 0;
    this.tricksSurvived = 0;
    this.penaltiesTaken = 0;
    this.overtimeMisses = 0;
    this.idleSeconds = 0;
    this.passiveLimitSec = 10.5;

    this.heldItem = null;
    this.tugTimer = 0;
    this.isGraspingPaddleCone = false;
    this.vendorBubbleText = '';
    this.vendorBubbleTimer = 0;
    this.lastScrapeClankTime = 0;
    this.bellBeatsDone = 0;
    this.floatingPopups = [];
    this.vignetteFlash = { color: 'green', alpha: 0 };

    this.coneWorldPos = new THREE.Vector3(0, 1.24, 0.22);
    this.coneTargetPos = new THREE.Vector3(0, 1.24, 0.22);
    this.world.coneSpring.pos.copy(this.coneWorldPos);
    this.world.coneSpring.target.copy(this.coneTargetPos);
    this.world.coneSpring.vel.set(0, 0, 0);

    this.shaftRoll = 0;
    this.coneFlipZ = 0;
    this.conePitchX = 0;
    this.leftHandCustomTarget = null;

    const shouldRunTutorial =
      runTutorial ||
      this.forceTutorialNext ||
      (this.currentStage === 1 && !this.save.data.tutorialCompleted);
    this.forceTutorialNext = false;

    this.routine = this._buildDynamicRoutineForStage(
      this.config,
      shouldRunTutorial
    );

    this._hideAllProps();
    this._reattachConeToPaddle();
    this.world.updateIceCreamScoops(0, false);
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
    this.world.outerConeGroup.visible = false;
    this.world.outerConeGroup.position.set(0, -0.052, 0.008);
    this.world.outerConeGroup.rotation.set(0, 0, 0.09);
    this.world.leftHandConeProp.visible = false;
    this.world.napkinConeProp.visible = false;
    this.world.napkinProp.visible = false;
    this.world.sliceCueGroup.visible = false;
    this.world.giantBlockGroup.visible = false;
    this.world.giantBlockGroup.rotation.set(0, 0, 0);
    this.world.stretchyStrand.detach();
    this.world.heldEmptyCone.visible = false;
    this.world.heldNapkin.visible = false;
    if (this.world.heldNapkinCone) {
      this.world.heldNapkinCone.visible = false;
    }
  }

  _triggerVendorSpeech(type = 'hoppa') {
    const soundMap = {
      scrape: 'hmm',
      double_cone: 'eeeh',
      giant: 'hmm',
      flip: 'hirr',
      empty_trap: 'cik',
      hmm: 'hmm',
      hirr: 'hirr',
      eeeh: 'eeeh',
      cik: 'cik',
      hoppa: 'hoppa',
      laugh: 'laugh',
      taunt: 'taunt',
      cheer: 'cheer',
      shock: 'shock',
    };
    const soundType = soundMap[type] || 'hoppa';
    this.sound.speakVendor(soundType, this.levelIndex, this.coneWorldPos.x);

    const keyMap = {
      hmm: 'speech_hmm',
      hirr: 'speech_hirr',
      eeeh: 'speech_eeeh',
      cik: 'speech_cik',
      hoppa: 'speech_hoppa',
      laugh: 'speech_laugh',
      taunt: 'speech_taunt',
      cheer: 'speech_cheer',
      shock: 'speech_shock',
      scrape: 'speech_scrape',
      double_cone: 'speech_double_cone',
      giant: 'speech_giant',
      flip: 'speech_flip',
      empty_trap: 'speech_cik',
    };
    this.vendorBubbleText = this.save.t(keyMap[type] || 'speech_hoppa');
    this.vendorBubbleTimer = 1.25;
  }

  startRound() {
    this.active = true;
    this.roundEnded = false;
    this.idleSeconds = 0;
    this.sound.tempoMultiplier = this.config.speedMult;
    this.sound.startMusic();
    this.sound.playBell(0.75, 0);
    this.world.ringBells(0.55);
    this._vibrate(25);
    this.protocol.emitCommand(PLAYER_ROLES.VENDOR, 'ROUND_START', {
      stage: this.currentStage,
      routine: this.routine,
    });
    this._enterRoutineStep(0);
  }

  refreshPromptForLanguage() {
    // Dynamic every frame via getGestureGuide()
  }

  _enterRoutineStep(stepIndex) {
    this.routineIndex = stepIndex;
    this.currentMechanic =
      this.routine[stepIndex] || 'FINAL_PISTACHIO_CATCH';
    this.stageTimer = 0;
    this.subStep = 0;
    this.stepCooldown = 0;
    this.tugTimer = 0;
    this.bellBeatsDone = 0;
    this.isGraspingPaddleCone = false;
    this.leftHandCustomTarget = null;
    this.shaftRoll = 0;
    this.coneFlipZ = 0;
    this.conePitchX = 0;
    this.lastScrapeClankTime = 0;

    this._hideAllProps();
    this._reattachConeToPaddle();
    this.heldItem = null;
    this.world.setVendorMood('smile');

    // Discover trick in the 15-Trick Encyclopedia if it's in TRICK_CATALOG
    if (TRICK_CATALOG.some((t) => t.id === this.currentMechanic)) {
      this.save.discoverTrick(this.currentMechanic);
    }

    this.protocol.emitCommand(PLAYER_ROLES.VENDOR, 'ENTER_TRICK', {
      trickId: this.currentMechanic,
      stepIndex,
    });

    const currentFlavor = this._getFlavorForScoop(Math.max(0, this.scoopCount));
    const currentTubPos = this._getTubWorldPosForScoop(
      Math.max(0, this.scoopCount)
    );

    switch (this.currentMechanic) {
      case 'TUTORIAL_WARMUP': {
        this.scoopCount = 1;
        this.world.updateIceCreamScoops(1, false);
        this.coneTargetPos.set(0, 1.22, 0.27);
        this._triggerVendorSpeech('hmm');
        break;
      }

      case 'SCRAPE_FLAVOR_SCOOP': {
        const nextScoopIdx = Math.min(3, this.scoopCount);
        const flav = this._getFlavorForScoop(nextScoopIdx);
        const tubPos = this._getTubWorldPosForScoop(nextScoopIdx);
        this.world.stretchyStrand.attach(
          tubPos,
          this.coneWorldPos,
          flav.colorHex,
          false
        );
        this.world.setVendorMood('smile');
        this._triggerVendorSpeech('scrape');
        break;
      }

      case 'DOUBLE_CONE_SLIDE': {
        // Show VISIBLY NESTED 2 CONES (inner mainConeMesh + outerConeGroup with golden separation rim)
        if (this.scoopCount < 1) {
          this.scoopCount = 1;
          this.world.updateIceCreamScoops(1, false);
        }
        this.world.outerConeGroup.visible = true;
        this.world.outerConeGroup.position.set(0, -0.052, 0.008);
        this.world.outerConeGroup.rotation.set(0, 0, 0.09);
        this.leftHandCustomTarget = new THREE.Vector3(-0.12, 1.18, 0.24);
        this.coneTargetPos.set(0, 1.22, 0.28);
        this.world.setVendorMood('mischief');
        this._triggerVendorSpeech('double_cone');
        break;
      }

      case 'GIANT_BLOCK_TEASE': {
        // Lift the entire 5-KILO GIANT ICE CREAM BLOCK out of the selected flavor tub!
        const flav = this._getFlavorForScoop(Math.min(3, this.scoopCount));
        const tubPos = this._getTubWorldPosForScoop(
          Math.min(3, this.scoopCount)
        );
        this.world.setGiantBlockColor(flav.colorHex);
        this.world.giantBlockGroup.visible = true;
        this.world.giantBlockGroup.position.copy(tubPos);
        this.world.stretchyStrand.attach(
          tubPos,
          this.coneWorldPos,
          flav.colorHex,
          true
        );
        this.world.setVendorMood('mischief');
        this._triggerVendorSpeech('giant');
        break;
      }

      case 'MIDAIR_BLOCK_SOMERSAULT': {
        // Launch the giant ice cream mass into mid-air and flip it 360°!
        const flav = this._getFlavorForScoop(Math.max(0, this.scoopCount - 1));
        this.world.setGiantBlockColor(flav.colorHex);
        this.world.giantBlockGroup.visible = true;
        this.world.giantBlockGroup.position.copy(this.coneWorldPos);
        this.world.stretchyStrand.attach(
          this.coneWorldPos,
          this.world.giantBlockGroup.position,
          flav.colorHex,
          true
        );
        this.sound.playWhoosh(1.35, 0);
        this.world.setVendorMood('laugh');
        this._triggerVendorSpeech('flip');
        break;
      }

      case 'SHAFT_SPIN_360': {
        this.coneTargetPos.set(0, 1.24, 0.25);
        this.world.setVendorMood('mischief');
        this._triggerVendorSpeech('hirr');
        break;
      }

      case 'VERTICAL_WINDMILL': {
        this.coneTargetPos.set(0, 1.48, 0.18);
        this.world.setVendorMood('mischief');
        this._triggerVendorSpeech('hoppa');
        break;
      }

      case 'UPSIDE_DOWN_GRAVITY': {
        this.sound.playBell(0.95, 0);
        this.world.ringBells(0.85);
        this.coneFlipZ = Math.PI;
        this.conePitchX = 0.35;
        this.coneTargetPos.set(0, 1.32, 0.25);
        this.world.setVendorMood('mischief');
        this._triggerVendorSpeech('cik');
        break;
      }

      case 'FAKE_DROP_PANIC': {
        this.coneTargetPos.set(0, 1.36, 0.24);
        this.world.setVendorMood('shock');
        this._triggerVendorSpeech('eeeh');
        break;
      }

      case 'MEGA_TAFFY_SLICE': {
        if (this.scoopCount < this.targetScoopCount) {
          this.scoopCount++;
          this.world.updateIceCreamScoops(this.scoopCount, false);
        }
        this.world.triggerScoopJiggle(1.25);
        this.sound.playPaddleClank(0.1);
        this.sound.playScoopAdded();
        this.coneTargetPos.set(0, 1.5, 0.14);
        this.conePitchX = -0.28;
        this.world.sliceCueGroup.visible = true;
        this.world.stretchyStrand.attach(
          currentTubPos,
          this.coneWorldPos,
          currentFlavor.colorHex,
          true
        );
        this._triggerVendorSpeech('scrape');
        break;
      }

      case 'NAPKIN_CONE_FAKEOUT': {
        this.world.napkinConeProp.visible = true;
        this.coneTargetPos.set(-0.38, 1.44, -0.12);
        this.conePitchX = -0.35;
        this.leftHandCustomTarget = new THREE.Vector3(0, 1.22, 0.28);
        this.world.setVendorMood('laugh');
        this._triggerVendorSpeech('eeeh');
        break;
      }

      case 'SHELL_SWAP_DUEL': {
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
      }

      case 'FIGURE_EIGHT_WEAVE': {
        this.coneTargetPos.set(0, 1.25, 0.24);
        this.world.setVendorMood('mischief');
        this._triggerVendorSpeech('hirr');
        break;
      }

      case 'BELL_RHYTHM_FEINT': {
        this.bellBeatsDone = 0;
        this.coneTargetPos.set(-0.24, 1.56, 0.08);
        this.world.setVendorMood('smile');
        this._triggerVendorSpeech('cik');
        break;
      }

      case 'OVERHEAD_CROWN_DANGLE': {
        this.coneTargetPos.set(0, 1.66, 0.22);
        this.coneFlipZ = Math.PI;
        this.conePitchX = 0.42;
        this.world.setVendorMood('mischief');
        this._triggerVendorSpeech('hoppa');
        break;
      }

      case 'COMBO_DOUBLE_PUMP': {
        this.coneTargetPos.set(0, 1.21, 0.31);
        this.world.setVendorMood('mischief');
        this._triggerVendorSpeech('hirr');
        break;
      }

      case 'FINAL_PISTACHIO_CATCH': {
        this.scoopCount = this.targetScoopCount;
        this.world.updateIceCreamScoops(this.scoopCount, true);
        this.world.triggerScoopJiggle(1.3);
        this.sound.playBell(0.88, 0.2);
        this.world.ringBells(0.75);
        this.coneTargetPos.set(0, 1.22, 0.26);
        this.leftHandCustomTarget = new THREE.Vector3(0.24, 1.92, -0.12);
        this._triggerVendorSpeech('hoppa');
        break;
      }
    }
  }

  _advanceRoutineStep() {
    this.tricksSurvived++;
    this.sound.playShowBoost(2, this.coneWorldPos.x);
    this.sound.playCrowdReaction('cheer');
    this.world.triggerSpectatorReaction('cheer');
    this.world.spawnBurst(this.coneWorldPos, 0xf5b942, 12);
    this._enterRoutineStep(this.routineIndex + 1);
  }

  _putNapkinConeInTouristHand() {
    this.heldItem = 'NAPKIN_CONE';
    this.world.napkinConeProp.visible = false;
    if (this.world.heldNapkinCone) {
      this.world.heldNapkinCone.visible = true;
    }
    this.sound.playConePop(0);
    this._triggerVendorSpeech('laugh');
    this._loseHeart(this.world.touristHand.position, '🧻');
  }

  /**
   * When the player grabs the outer cone in `DOUBLE_CONE_SLIDE`, the outer cone stays
   * in the player's hand while the vendor pulls the inner cone + ice cream out!
   */
  _triggerOuterConeSeparation() {
    this.heldItem = 'EMPTY_CONE';
    this.world.outerConeGroup.visible = false;
    this.world.leftHandConeProp.visible = false;
    this.world.mainConeMesh.visible = true;
    this.world.heldEmptyCone.visible = true;

    this.sound.playWaferSlide(0);
    this.sound.playBell(0.85, 0.15);
    this.sound.playCrowdReaction('chuckle');
    this.world.triggerSpectatorReaction('cheer');
    this.world.ringBells(0.7);
    this.world.setVendorMood('laugh');
    this._triggerVendorSpeech('eeeh');
    this._vibrate([35, 30, 45]);
  }

  attemptSnatch(handWorldPos) {
    if (!this.active || this.roundEnded) return;
    if (this.heldItem === 'NAPKIN_CONE' || this.heldItem === 'EMPTY_CONE') return;
    this.idleSeconds = 0;

    this.protocol.emitCommand(PLAYER_ROLES.CUSTOMER, 'ATTEMPT_SNATCH', {
      pos: handWorldPos.toArray(),
    });
  }

  update(dt, time, gestureState) {
    if (this.vendorBubbleTimer > 0) {
      this.vendorBubbleTimer = Math.max(0, this.vendorBubbleTimer - dt);
    }
    if (this.vignetteFlash.alpha > 0) {
      this.vignetteFlash.alpha = Math.max(
        0,
        this.vignetteFlash.alpha - dt * 1.4
      );
    }
    for (let i = this.floatingPopups.length - 1; i >= 0; i--) {
      const fp = this.floatingPopups[i];
      fp.life -= dt * 1.3;
      fp.y -= dt * 48;
      if (fp.life <= 0) this.floatingPopups.splice(i, 1);
    }

    if (!this.active || this.roundEnded) {
      if (!this.roundEnded) {
        // Expressive idle 3D motion: vendor gently tilts up/down and spins the cone around the shaft
        this.coneTargetPos.set(
          Math.sin(time * 1.2) * 0.18,
          1.25 + Math.cos(time * 1.7) * 0.06,
          0.21
        );
        this.shaftRoll = time * 1.4;
        this.conePitchX = Math.sin(time * 1.7) * 0.22;
      }
      this._applyKinematics(dt, time, gestureState);
      return;
    }

    const speedMult = this.config.speedMult || 1.0;
    this.stageTimer += dt * speedMult;
    if (this.stepCooldown > 0) {
      this.stepCooldown = Math.max(0, this.stepCooldown - dt);
    }

    const handPos = gestureState.handWorldPos;
    const distToCone = handPos.distanceTo(this.coneWorldPos);

    // 1. Holding the Fake Napkin Cone -> Swipe sideways to toss it away!
    if (this.heldItem === 'NAPKIN_CONE') {
      this.isGraspingPaddleCone = false;
      if (
        this.stepCooldown <= 0 &&
        (Math.abs(gestureState.vx) > 1.15 || gestureState.speed > 1.35)
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
        } else if (this.currentMechanic === 'SHELL_SWAP_DUEL') {
          this.world.napkinConeProp.visible = true;
          this.swapSide *= -1;
          this.stageTimer = 0;
        }
      }
      this._applyKinematics(dt, time, gestureState);
      return;
    }

    // 2. Holding the Outer Empty Cone from `DOUBLE_CONE_SLIDE` -> Fit it back under the inner cone or flick it away!
    if (this.heldItem === 'EMPTY_CONE') {
      this.isGraspingPaddleCone = false;
      this.coneTargetPos.set(
        0.18 + Math.sin(time * 3.2) * 0.06,
        1.35 + Math.cos(time * 2.5) * 0.04,
        0.22
      );
      this.shaftRoll += dt * 4.5;
      this.conePitchX = Math.sin(time * 3) * 0.25;

      const flickedSideways =
        this.stepCooldown <= 0 &&
        (Math.abs(gestureState.vx) > 1.25 || gestureState.speed > 1.45);
      const attachedUnderScoops =
        this.stepCooldown <= 0 &&
        gestureState.isReaching &&
        distToCone < 0.29;

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
        this.world.triggerScoopJiggle(1.1);
        this._triggerVendorSpeech('hoppa');
        this._vibrate(25);
        this.score += 240;
        this._spawnScorePopup(240, this.coneWorldPos, '🍦');
        this._advanceRoutineStep();
      }
      this._applyKinematics(dt, time, gestureState);
      return;
    }

    // Passive timeout check
    if (gestureState.isMoving || gestureState.isPointerDown) {
      this.idleSeconds = 0;
    } else if (this.currentMechanic !== 'SCRAPE_FLAVOR_SCOOP') {
      this.idleSeconds += dt;
      if (this.idleSeconds >= this.passiveLimitSec) {
        this._endRound('PASSIVE_BORING');
        return;
      }
    }

    switch (this.currentMechanic) {
      // =========================================================================
      // 0. 10-SECOND INTERACTIVE 3-STEP TUTORIAL (`TUTORIAL_WARMUP`)
      // =========================================================================
      case 'TUTORIAL_WARMUP': {
        if (this.subStep === 0) {
          // Step 1 (~3.3s): Reach & hold green cone
          this.coneTargetPos.set(
            Math.sin(time * 2.2) * 0.08,
            1.22,
            0.27
          );
          this.shaftRoll = Math.sin(time * 2) * 0.3;
          this.conePitchX = 0.1;

          if (gestureState.isReaching && distToCone < 0.29) {
            this.tugTimer += dt * 2.2;
            this.isGraspingPaddleCone = true;
            if (this.tugTimer >= 0.45) {
              this.isGraspingPaddleCone = false;
              this.subStep = 1;
              this.stageTimer = 0;
              this.tugTimer = 0;
              this.coneFlipZ = Math.PI;
              this.conePitchX = 0.35;
              this.sound.playBell(0.85, 0);
              this.world.ringBells(0.7);
              this.score += 150;
              this._spawnScorePopup(150, this.coneWorldPos, '✓ 1/3');
              this._triggerVendorSpeech('cik');
              this._vibrate(25);
            }
          } else {
            this.isGraspingPaddleCone = false;
          }
        } else if (this.subStep === 1) {
          // Step 2 (~3.3s): Red upside-down trap — keep hand pulled back!
          this.coneFlipZ = Math.PI;
          this.conePitchX = 0.35 + Math.sin(time * 6) * 0.18;
          this.coneTargetPos.set(
            Math.sin(time * 4.5) * 0.14,
            1.28,
            0.25
          );

          if (gestureState.isReaching && distToCone < 0.25) {
            this.stageTimer = Math.max(0, this.stageTimer - 0.5);
            this._triggerVendorSpeech('cik');
            this._vibrate(35);
          } else if (this.stageTimer >= 2.1) {
            this.subStep = 2;
            this.stageTimer = 0;
            this.coneFlipZ = 0;
            this.conePitchX = -0.25;
            this.coneTargetPos.set(0, 1.48, 0.15);
            this.world.sliceCueGroup.visible = true;
            const flav = this._getFlavorForScoop(0);
            const tubPos = this._getTubWorldPosForScoop(0);
            this.world.stretchyStrand.attach(
              tubPos,
              this.coneWorldPos,
              flav.colorHex,
              true
            );
            this.score += 180;
            this._spawnScorePopup(180, this.coneWorldPos, '✓ 2/3');
            this._triggerVendorSpeech('scrape');
            this._vibrate(25);
          }
        } else if (this.subStep === 2) {
          // Step 3 (~3.4s): Swipe across golden line to slice the stretchy Maraş ice cream!
          const tubPos = this._getTubWorldPosForScoop(0);
          this.world.stretchyStrand.update(
            dt,
            tubPos,
            this.coneWorldPos,
            1.25
          );
          const strandMid = new THREE.Vector3(0, 1.22, 0.18);
          const distToStrand = handPos.distanceTo(strandMid);

          if (
            (gestureState.isReaching &&
              distToStrand < 0.36 &&
              Math.abs(gestureState.vx) > 0.85) ||
            this.stageTimer >= 3.8
          ) {
            this.world.stretchyStrand.detach();
            this.world.sliceCueGroup.visible = false;
            this.save.markTutorialCompleted();
            this.sound.playWhoosh(1.25, 0);
            this.score += 220;
            this._spawnScorePopup(220, strandMid, '🎓 3/3');
            this._triggerVendorSpeech('cheer');
            this._vibrate([25, 35]);
            this._advanceRoutineStep();
          }
        }
        break;
      }

      // =========================================================================
      // 1. SCRAPING & CHURNING PLAYER'S CHOSEN FLAVOR FROM ITS COPPER TUB
      // =========================================================================
      case 'SCRAPE_FLAVOR_SCOOP': {
        const nextScoopIdx = Math.min(3, this.scoopCount);
        const flav = this._getFlavorForScoop(nextScoopIdx);
        const tubPos = this._getTubWorldPosForScoop(nextScoopIdx);

        const p = Math.min(1, this.stageTimer / 1.45);
        const churnX = tubPos.x + Math.sin(this.stageTimer * 11) * 0.08;
        const churnY =
          1.03 +
          Math.abs(Math.sin(this.stageTimer * 8)) * 0.24 +
          p * 0.18;
        const churnZ = -0.28 + Math.cos(this.stageTimer * 9) * 0.07;

        this.coneTargetPos.set(churnX, churnY, churnZ);
        // Active 3D shaft spinning and up-down pitching while churning!
        this.shaftRoll += dt * 11;
        this.conePitchX = Math.sin(this.stageTimer * 10) * 0.45;

        this.world.stretchyStrand.update(
          dt,
          tubPos,
          this.coneWorldPos,
          1.35
        );

        if (this.stageTimer - this.lastScrapeClankTime > 0.38) {
          this.lastScrapeClankTime = this.stageTimer;
          this.sound.playPaddleClank(tubPos.x);
        }

        if (this.stageTimer >= 1.45) {
          this.scoopCount = Math.min(4, this.scoopCount + 1);
          this.world.updateIceCreamScoops(this.scoopCount, false);
          this.world.stretchyStrand.detach();
          this.world.triggerScoopJiggle(1.4);
          this.world.spawnBurst(this.coneWorldPos, flav.colorHex, 16);
          this.sound.playScoopAdded();
          this.conePitchX = 0;
          this._advanceRoutineStep();
        }
        break;
      }

      // =========================================================================
      // 2. VISIBLY NESTED DOUBLE CONE (`DOUBLE_CONE_SLIDE` - Çift Külah Tuzağı)
      // =========================================================================
      case 'DOUBLE_CONE_SLIDE': {
        if (this.subStep === 0) {
          // Vendor visibly slides the outer cone onto the inner cone with left hand, then extends both
          const introT = Math.min(1, this.stageTimer / 0.7);
          this.world.outerConeGroup.visible = true;
          // Animate the outer cone sliding up from -0.095 to -0.052 so the nesting is crystal clear!
          this.world.outerConeGroup.position.y = THREE.MathUtils.lerp(
            -0.098,
            -0.052,
            introT
          );
          this.world.outerConeGroup.rotation.z =
            0.11 + Math.sin(time * 6) * 0.03;

          if (introT < 0.85) {
            this.leftHandCustomTarget = this.coneWorldPos
              .clone()
              .add(new THREE.Vector3(-0.04, -0.08, 0.02));
          } else {
            this.leftHandCustomTarget = null;
          }

          this.coneTargetPos.set(
            Math.sin(this.stageTimer * 3.5) * 0.1,
            1.21 + Math.cos(this.stageTimer * 4) * 0.04,
            0.29
          );
          this.conePitchX = 0.22 + Math.sin(this.stageTimer * 5) * 0.12;
          this.shaftRoll = Math.sin(this.stageTimer * 3) * 0.4;

          // When player reaches for the nested double cone, trigger the inner-cone extraction!
          if (
            this.stageTimer > 0.45 &&
            gestureState.isReaching &&
            distToCone < 0.29
          ) {
            this.subStep = 1;
            this.stageTimer = 0;
            this.stepCooldown = 0.45;
            // Paddle pulls the inner cone + ice cream high up and back while leaving outer cone in player's hand!
            this.coneTargetPos.set(0.22, 1.46, 0.08);
            this.conePitchX = -0.32;
            this.shaftRoll = Math.PI;
            this._triggerOuterConeSeparation();
          } else if (this.stageTimer >= 2.7) {
            // If player waited out the bait without touching, vendor spins & moves on
            this.world.outerConeGroup.visible = false;
            this.score += 200;
            this._spawnScorePopup(200, this.coneWorldPos);
            this._advanceRoutineStep();
          }
        }
        break;
      }

      // =========================================================================
      // 3. GIANT 5-KILO BLOCK EXTRACTION (`GIANT_BLOCK_TEASE` - Kalıptan Kocaman Dondurma)
      // =========================================================================
      case 'GIANT_BLOCK_TEASE': {
        const scoopIdx = Math.min(3, this.scoopCount);
        const flav = this._getFlavorForScoop(scoopIdx);
        const tubPos = this._getTubWorldPosForScoop(scoopIdx);

        if (this.subStep === 0) {
          // Lift the giant 5-kilo block out of the copper tub and thrust it toward the player's face!
          const p = Math.min(1, this.stageTimer / 0.85);
          const bx = THREE.MathUtils.lerp(
            tubPos.x,
            Math.sin(this.stageTimer * 4) * 0.12,
            p
          );
          const by = THREE.MathUtils.lerp(1.05, 1.32, p);
          const bz = THREE.MathUtils.lerp(-0.28, 0.31, p);

          this.coneTargetPos.set(bx, by, bz);
          this.conePitchX = 0.28 * p;
          this.shaftRoll = Math.sin(this.stageTimer * 5) * 0.55;

          this.world.giantBlockGroup.visible = true;
          this.world.giantBlockGroup.position.copy(this.coneWorldPos).add(
            new THREE.Vector3(0, 0.06, 0.04)
          );
          this.world.giantBlockGroup.rotation.set(
            Math.sin(time * 5) * 0.2,
            time * 1.8,
            Math.cos(time * 4) * 0.18
          );

          // Multi-strand viscoelastic taffy stretches from the tub all the way to the giant block!
          this.world.stretchyStrand.update(
            dt,
            tubPos,
            this.world.giantBlockGroup.position,
            1.65
          );

          if (
            this.stageTimer > 0.5 &&
            this.stepCooldown <= 0 &&
            gestureState.isReaching &&
            distToCone < 0.31
          ) {
            // Player got greedy and tried to grab the 5-kilo block -> Vendor yanks it back!
            this.stepCooldown = 0.65;
            this.coneTargetPos.set(tubPos.x, 1.56, -0.18);
            this.sound.playWhoosh(1.4, tubPos.x);
            this._triggerVendorSpeech('hirr');
            if (this._loseHeart(this.coneWorldPos, '🧊')) return;
          }

          if (this.stageTimer >= 2.05) {
            // Vendor drops the 5-kilo block back into the tub, carves a scoop onto the cone, and presents it!
            this.subStep = 1;
            this.stageTimer = 0;
            this.world.giantBlockGroup.visible = false;
            this.world.stretchyStrand.detach();
            if (this.scoopCount < this.targetScoopCount) {
              this.scoopCount++;
              this.world.updateIceCreamScoops(this.scoopCount, false);
            }
            this.world.triggerScoopJiggle(1.45);
            this.world.spawnBurst(this.coneWorldPos, flav.colorHex, 18);
            this.sound.playScoopAdded();
            this.coneTargetPos.set(0, 1.22, 0.27);
            this.conePitchX = 0.12;
            this._triggerVendorSpeech('hoppa');
          }
        } else {
          // SubStep 1: Grab the freshly carved cone!
          this.coneTargetPos.set(
            Math.sin(time * 3) * 0.09,
            1.22,
            0.27
          );
          this.conePitchX = 0.1;
          if (gestureState.isReaching && distToCone < 0.28) {
            this.sound.playGripTug(0);
            this._vibrate(25);
            this.score += 340;
            this._spawnScorePopup(340, this.coneWorldPos, '🧊');
            this._advanceRoutineStep();
          }
        }
        break;
      }

      // =========================================================================
      // 4. MID-AIR GIANT ICE CREAM SOMERSAULT (`MIDAIR_BLOCK_SOMERSAULT` - Havada Takla)
      // =========================================================================
      case 'MIDAIR_BLOCK_SOMERSAULT': {
        if (this.subStep === 0) {
          // Launch the giant ice cream mass in a high parabolic arc with a 720° mid-air somersault!
          const duration = 1.45;
          const p = Math.min(1, this.stageTimer / duration);
          const arcY = 1.24 + Math.sin(p * Math.PI) * 0.64;
          const arcX = Math.sin(p * Math.PI * 2) * 0.22;
          const arcZ = 0.16 + Math.sin(p * Math.PI) * 0.12;

          // Paddle dips down and then rises to catch the somersaulting block
          this.coneTargetPos.set(
            arcX * 0.6,
            1.16 + Math.sin(p * Math.PI) * 0.22,
            0.2
          );
          this.conePitchX = Math.sin(p * Math.PI * 2) * 0.55;
          this.shaftRoll = p * Math.PI * 2;

          this.world.giantBlockGroup.visible = true;
          this.world.giantBlockGroup.position.set(arcX, arcY, arcZ);
          // Full mid-air somersault rotation (X and Z)!
          this.world.giantBlockGroup.rotation.x = p * Math.PI * 4;
          this.world.giantBlockGroup.rotation.z = p * Math.PI * 2;

          this.world.stretchyStrand.update(
            dt,
            this.coneWorldPos,
            this.world.giantBlockGroup.position,
            1.5
          );

          if (p >= 1) {
            this.subStep = 1;
            this.stageTimer = 0;
            this.world.giantBlockGroup.visible = false;
            this.world.stretchyStrand.detach();
            this.world.triggerScoopJiggle(1.55);
            this.sound.playPaddleClank(0);
            this.sound.playBell(0.9, 0);
            this.sound.playCrowdReaction('cheer');
            this.world.triggerSpectatorReaction('cheer');
            this.world.ringBells(0.8);
            this.coneTargetPos.set(0.16, 1.21, 0.27);
            this.conePitchX = 0.08;
            this.coneFlipZ = 0;
            this._triggerVendorSpeech('hoppa');
          }
        } else {
          // Catch the cone after the mid-air somersault lands!
          this.coneTargetPos.set(
            0.16 * Math.cos(this.stageTimer * 2.5),
            1.21,
            0.27
          );
          if (gestureState.isReaching && distToCone < 0.28) {
            this.sound.playGripTug(this.coneWorldPos.x);
            this._vibrate(25);
            this.score += 380;
            this._spawnScorePopup(380, this.coneWorldPos, '🤸');
            this._advanceRoutineStep();
          }
        }
        break;
      }

      // =========================================================================
      // 5. 360° AXIAL SHAFT SPIN (`SHAFT_SPIN_360` - Kendi Etrafında Çevirme)
      // =========================================================================
      case 'SHAFT_SPIN_360': {
        // Rapidly rolls the metal rod between his palms so the cone spins 360° around its own shaft
        this.shaftRoll += dt * 15.0;
        this.conePitchX = Math.sin(this.stageTimer * 7) * 0.35;

        if (this.tugTimer > 0) {
          this.tugTimer -= dt;
          this.isGraspingPaddleCone = true;
          const flav = this._getFlavorForScoop(Math.max(0, this.scoopCount - 1));
          this.world.stretchyStrand.update(
            dt,
            this.coneWorldPos,
            handPos.clone().add(new THREE.Vector3(0, 0.03, -0.02)),
            0.95
          );

          if (this.tugTimer <= 0) {
            this.isGraspingPaddleCone = false;
            this.world.stretchyStrand.detach();
            this.subStep++;
            this.stepCooldown = 0.45;
            this.sound.playWhoosh(1.15, this.coneWorldPos.x);
            this._triggerVendorSpeech(this.subStep === 1 ? 'hirr' : 'hoppa');
            this._vibrate([20, 30]);

            if (this.subStep === 1) {
              this.coneTargetPos.set(-0.28, 1.28, 0.22);
              this.score += 170;
              this._spawnScorePopup(170, this.coneWorldPos, '🌀');
            } else {
              this.conePitchX = 0;
              this.score += 250;
              this._spawnScorePopup(250, this.coneWorldPos, '🌀');
              this._advanceRoutineStep();
            }
          }
        } else {
          const targetX =
            this.subStep === 0
              ? Math.sin(this.stageTimer * 3.5) * 0.22
              : -0.26 + Math.cos(this.stageTimer * 4) * 0.14;
          const targetY = 1.24 + Math.sin(this.stageTimer * 5) * 0.08;
          this.coneTargetPos.set(targetX, targetY, 0.25);

          if (
            this.stepCooldown <= 0 &&
            gestureState.isReaching &&
            distToCone < 0.28
          ) {
            this.tugTimer = 0.22;
            this.isGraspingPaddleCone = true;
            this.sound.playGripTug(this.coneWorldPos.x);
            const flav = this._getFlavorForScoop(
              Math.max(0, this.scoopCount - 1)
            );
            this.world.stretchyStrand.attach(
              this.coneWorldPos,
              handPos,
              flav.colorHex,
              false
            );
            this._vibrate(25);
          }
        }
        break;
      }

      // =========================================================================
      // 6. UP-DOWN VERTICAL WINDMILL (`VERTICAL_WINDMILL` - Yukarı Aşağı Çevirme)
      // =========================================================================
      case 'VERTICAL_WINDMILL': {
        // Vendor swings the paddle in huge vertical up-and-down loops with full pitch & flip!
        if (this.subStep === 0) {
          const wAngle = this.stageTimer * 5.2;
          const wy = 1.32 + Math.cos(wAngle) * 0.28;
          const wz = 0.18 + Math.sin(wAngle) * 0.11;
          const wx = Math.sin(wAngle * 0.5) * 0.22;

          this.coneTargetPos.set(wx, wy, wz);
          this.conePitchX = Math.sin(wAngle) * 0.85;
          this.coneFlipZ = Math.cos(wAngle) * 0.65;
          this.shaftRoll = wAngle * 1.3;

          if (this.stageTimer >= 1.55) {
            this.subStep = 1;
            this.stageTimer = 0;
            this.conePitchX = 0.15;
            this.coneFlipZ = 0;
            this.coneTargetPos.set(0, 1.2, 0.28);
            this.sound.playWhoosh(1.2, 0);
            this._triggerVendorSpeech('hoppa');
          }
        } else {
          // Window at chest height to grab the cone!
          this.coneTargetPos.set(
            Math.sin(this.stageTimer * 3) * 0.12,
            1.2,
            0.28
          );
          this.conePitchX = 0.12;
          this.coneFlipZ = 0;

          if (gestureState.isReaching && distToCone < 0.28) {
            this.sound.playGripTug(0);
            this._vibrate(25);
            this.score += 320;
            this._spawnScorePopup(320, this.coneWorldPos, '🎡');
            this._advanceRoutineStep();
          } else if (this.stageTimer >= 2.2) {
            this.subStep = 0;
            this.stageTimer = 0;
          }
        }
        break;
      }

      // =========================================================================
      // 7. UPSIDE-DOWN GRAVITY TEASE (`UPSIDE_DOWN_GRAVITY` - Ters Külah Şakası)
      // =========================================================================
      case 'UPSIDE_DOWN_GRAVITY': {
        if (this.subStep === 0) {
          this.coneFlipZ = Math.PI + Math.sin(this.stageTimer * 10) * 0.15;
          this.conePitchX = 0.35 + Math.cos(this.stageTimer * 8) * 0.2;
          this.coneTargetPos.set(
            Math.sin(this.stageTimer * 5) * 0.15,
            1.28 + Math.sin(this.stageTimer * 7) * 0.05,
            0.26
          );

          if (
            this.stepCooldown <= 0 &&
            gestureState.isReaching &&
            distToCone < 0.27
          ) {
            this.stepCooldown = 0.7;
            this.stageTimer = 0.2;
            this._triggerVendorSpeech('laugh');
            if (this._loseHeart(this.coneWorldPos, '🙃')) return;
          } else if (this.stageTimer >= 1.45) {
            this.subStep = 1;
            this.stageTimer = 0;
            this.coneFlipZ = 0;
            this.conePitchX = 0.08;
            this.coneTargetPos.set(-0.18, 1.18, 0.27);
            this.sound.playBell(0.8, -0.2);
            this.world.setVendorMood('smile');
            this._triggerVendorSpeech('hoppa');
          }
        } else {
          this.coneFlipZ = 0;
          this.conePitchX = 0.08;
          this.coneTargetPos.set(-0.18, 1.18, 0.27);
          if (gestureState.isReaching && distToCone < 0.28) {
            this.sound.playGripTug(-0.18);
            this._vibrate(25);
            this.score += 340;
            this._spawnScorePopup(340, this.coneWorldPos, '🙃');
            this._advanceRoutineStep();
          }
        }
        break;
      }

      // =========================================================================
      // 8. FAKE DROP PANIC (`FAKE_DROP_PANIC` - Yalancı Düşürme Paniği)
      // =========================================================================
      case 'FAKE_DROP_PANIC': {
        if (this.subStep === 0) {
          // Suddenly plunges the cone downward and tilts it forward as if it's falling!
          const dropP = Math.min(1, this.stageTimer / 0.65);
          this.coneTargetPos.set(
            0,
            THREE.MathUtils.lerp(1.42, 0.96, dropP),
            THREE.MathUtils.lerp(0.18, 0.34, dropP)
          );
          this.conePitchX = THREE.MathUtils.lerp(0, 0.95, dropP);
          this.coneFlipZ = THREE.MathUtils.lerp(0, Math.PI * 0.75, dropP);

          if (
            this.stepCooldown <= 0 &&
            this.stageTimer > 0.25 &&
            gestureState.isReaching &&
            distToCone < 0.29
          ) {
            this.stepCooldown = 0.65;
            this.coneTargetPos.set(0, 1.54, 0.12);
            this.sound.playWhoosh(1.3, 0);
            this._triggerVendorSpeech('laugh');
            if (this._loseHeart(this.coneWorldPos, '😱')) return;
          }

          if (this.stageTimer >= 1.35) {
            this.subStep = 1;
            this.stageTimer = 0;
            this.conePitchX = 0.05;
            this.coneFlipZ = 0;
            this.coneTargetPos.set(0.15, 1.22, 0.27);
            this.sound.playWhoosh(1.15, 0);
            this._triggerVendorSpeech('hoppa');
          }
        } else {
          this.coneTargetPos.set(0.15, 1.22, 0.27);
          if (gestureState.isReaching && distToCone < 0.28) {
            this.sound.playGripTug(0.15);
            this._vibrate(25);
            this.score += 330;
            this._spawnScorePopup(330, this.coneWorldPos);
            this._advanceRoutineStep();
          }
        }
        break;
      }

      // =========================================================================
      // 9. METER-LONG TAFFY STRETCH & SLICE (`MEGA_TAFFY_SLICE`)
      // =========================================================================
      case 'MEGA_TAFFY_SLICE': {
        const tubPos = this._getTubWorldPosForScoop(
          Math.max(0, this.scoopCount - 1)
        );
        this.coneTargetPos.set(
          Math.sin(time * 2.4) * 0.14,
          1.5 + Math.cos(time * 3) * 0.04,
          0.14
        );
        this.conePitchX = -0.25;
        this.shaftRoll = Math.sin(time * 3) * 0.35;

        this.world.stretchyStrand.update(
          dt,
          tubPos,
          this.coneWorldPos,
          1.45
        );

        const strandMid = new THREE.Vector3(
          this.coneWorldPos.x * 0.5,
          1.22,
          0.18
        );
        const distToStrand = handPos.distanceTo(strandMid);

        if (
          gestureState.isReaching &&
          distToStrand < 0.36 &&
          Math.abs(gestureState.vx) > 0.9
        ) {
          this.world.stretchyStrand.detach();
          this.world.sliceCueGroup.visible = false;
          this.conePitchX = 0;
          this.sound.playWhoosh(1.3, 0);
          this._triggerVendorSpeech('cheer');
          this._vibrate([20, 30]);
          this.score += 360;
          this._spawnScorePopup(360, strandMid, '✂️');
          this._advanceRoutineStep();
        }
        break;
      }

      // =========================================================================
      // 10. STUFFED NAPKIN CONE PRANK (`NAPKIN_CONE_FAKEOUT`)
      // =========================================================================
      case 'NAPKIN_CONE_FAKEOUT': {
        const fakeWorldPos = this.leftHandCustomTarget;
        const distToFake = handPos.distanceTo(fakeWorldPos);
        this.shaftRoll += dt * 4.0;
        this.conePitchX = Math.sin(time * 4) * 0.25;

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
          this.score += 360;
          this._spawnScorePopup(360, this.coneWorldPos);
          this._advanceRoutineStep();
        }
        break;
      }

      // =========================================================================
      // 11. TWO-HAND CONE SHELL GAME (`SHELL_SWAP_DUEL`)
      // =========================================================================
      case 'SHELL_SWAP_DUEL': {
        if (this.stageTimer < 1.2) {
          const p = this.stageTimer / 1.2;
          const angle = p * Math.PI * 2;
          const rx = Math.cos(angle) * 0.28 * this.swapSide;
          const rz = 0.18 + Math.sin(angle) * 0.09;
          const ry = 1.24 + Math.sin(angle * 2) * 0.08;
          this.coneTargetPos.set(rx, ry, rz);
          this.leftHandCustomTarget.set(-rx, 2.48 - ry, 0.36 - rz);
          this.shaftRoll = angle;
          this.conePitchX = Math.sin(angle) * 0.3;
        } else {
          const realX = -0.28 * this.swapSide;
          this.coneTargetPos.set(realX, 1.24, 0.24);
          this.leftHandCustomTarget.set(-realX, 1.24, 0.24);
          this.conePitchX = 0.08;

          if (this.stepCooldown <= 0 && gestureState.isReaching) {
            const distReal = handPos.distanceTo(this.coneWorldPos);
            const distFake = handPos.distanceTo(this.leftHandCustomTarget);

            if (distReal < 0.27) {
              this.sound.playGripTug(this.coneWorldPos.x);
              this._triggerVendorSpeech('cheer');
              this._vibrate(25);
              this.score += 400;
              this._spawnScorePopup(400, this.coneWorldPos, '👐');
              this._advanceRoutineStep();
            } else if (distFake < 0.28) {
              this.stepCooldown = 0.45;
              this._putNapkinConeInTouristHand();
            }
          }
        }
        break;
      }

      // =========================================================================
      // 12. 3D FIGURE-EIGHT WRIST WEAVE (`FIGURE_EIGHT_WEAVE` - Sekiz Çizme)
      // =========================================================================
      case 'FIGURE_EIGHT_WEAVE': {
        const t8 = this.stageTimer * 3.8;
        const figX = Math.sin(t8) * 0.32;
        const figY = 1.26 + Math.sin(t8 * 2) * 0.16;
        const figZ = 0.22 + Math.cos(t8) * 0.06;

        this.coneTargetPos.set(figX, figY, figZ);
        this.shaftRoll = t8 * 1.8;
        this.conePitchX = Math.cos(t8 * 2) * 0.42;
        this.coneFlipZ = Math.sin(t8) * 0.35;

        if (this.tugTimer > 0) {
          this.tugTimer -= dt;
          this.isGraspingPaddleCone = true;
          if (this.tugTimer <= 0) {
            this.isGraspingPaddleCone = false;
            this.conePitchX = 0;
            this.coneFlipZ = 0;
            this.sound.playGripTug(this.coneWorldPos.x);
            this._triggerVendorSpeech('cheer');
            this._vibrate([25, 30]);
            this.score += 360;
            this._spawnScorePopup(360, this.coneWorldPos, '♾️');
            this._advanceRoutineStep();
          }
        } else if (gestureState.isReaching && distToCone < 0.28) {
          this.tugTimer = 0.2;
          this.isGraspingPaddleCone = true;
          this.sound.playGripTug(this.coneWorldPos.x);
          this._vibrate(25);
        }
        break;
      }

      // =========================================================================
      // 13. BRASS BELL RHYTHM FEINT (`BELL_RHYTHM_FEINT` - 1-2 Sahte, 3'te Kap!)
      // =========================================================================
      case 'BELL_RHYTHM_FEINT': {
        if (this.bellBeatsDone < 2) {
          // Beats 1 and 2: Vendor strikes the brass bells and dips the cone as a feint!
          const beatPhase = (this.stageTimer % 0.85) / 0.85;
          const bx = (this.bellBeatsDone === 0 ? -0.26 : 0.26) * (1 - beatPhase * 0.5);
          const by = beatPhase < 0.35 ? 1.62 : 1.22;
          const bz = beatPhase < 0.35 ? 0.05 : 0.27;

          this.coneTargetPos.set(bx, by, bz);
          this.conePitchX = beatPhase < 0.35 ? -0.45 : 0.28;
          this.shaftRoll = beatPhase * Math.PI * 2;

          if (
            this.stepCooldown <= 0 &&
            beatPhase >= 0.35 &&
            gestureState.isReaching &&
            distToCone < 0.27
          ) {
            this.stepCooldown = 0.55;
            this._triggerVendorSpeech('cik');
            if (this._loseHeart(this.coneWorldPos, '🔔')) return;
          }

          if (this.stageTimer >= (this.bellBeatsDone + 1) * 0.85) {
            this.bellBeatsDone++;
            this.sound.playBell(0.95, bx);
            this.world.ringBells(0.85);
            if (this.bellBeatsDone === 2) {
              this.stageTimer = 0;
              this._triggerVendorSpeech('hoppa');
            }
          }
        } else {
          // Beat 3: Real window!
          this.coneTargetPos.set(0, 1.21, 0.28);
          this.conePitchX = 0.08;
          if (gestureState.isReaching && distToCone < 0.29) {
            this.sound.playBell(1.0, 0);
            this.sound.playGripTug(0);
            this._vibrate(30);
            this.score += 420;
            this._spawnScorePopup(420, this.coneWorldPos, '🔔');
            this._advanceRoutineStep();
          } else if (this.stageTimer >= 2.2) {
            this.bellBeatsDone = 0;
            this.stageTimer = 0;
          }
        }
        break;
      }

      // =========================================================================
      // 14. OVERHEAD CROWN DANGLE (`OVERHEAD_CROWN_DANGLE` - Tepeden Sarkıtma)
      // =========================================================================
      case 'OVERHEAD_CROWN_DANGLE': {
        if (this.subStep === 0) {
          // Dangles high above the player's head inverted
          this.coneTargetPos.set(
            Math.sin(this.stageTimer * 5) * 0.16,
            1.64,
            0.22
          );
          this.coneFlipZ = Math.PI;
          this.conePitchX = 0.45;
          this.shaftRoll = Math.sin(this.stageTimer * 6) * 0.5;

          if (
            this.stepCooldown <= 0 &&
            gestureState.isReaching &&
            distToCone < 0.27
          ) {
            this.stepCooldown = 0.6;
            this._triggerVendorSpeech('cik');
            if (this._loseHeart(this.coneWorldPos, '👑')) return;
          }

          if (this.stageTimer >= 1.35) {
            this.subStep = 1;
            this.stageTimer = 0;
            this.coneFlipZ = 0;
            this.conePitchX = 0.08;
            this.coneTargetPos.set(0, 1.18, 0.28);
            this.sound.playWhoosh(1.25, 0);
            this._triggerVendorSpeech('hoppa');
          }
        } else {
          this.coneTargetPos.set(0, 1.18, 0.28);
          this.coneFlipZ = 0;
          this.conePitchX = 0.08;
          if (gestureState.isReaching && distToCone < 0.29) {
            this.sound.playGripTug(0);
            this._vibrate(25);
            this.score += 390;
            this._spawnScorePopup(390, this.coneWorldPos, '👑');
            this._advanceRoutineStep();
          }
        }
        break;
      }

      // =========================================================================
      // 15. DOUBLE-PUMP RAPID FEINT (`COMBO_DOUBLE_PUMP` - İkili Uzat-Çek)
      // =========================================================================
      case 'COMBO_DOUBLE_PUMP': {
        if (this.subStep === 0) {
          // 1st Thrust: Fake pump right toward palm, then yanks back with 360° spin!
          const p = Math.min(1, this.stageTimer / 1.15);
          if (p < 0.55) {
            this.coneTargetPos.set(0, 1.2, 0.31);
            this.conePitchX = 0.25;
            if (
              this.stepCooldown <= 0 &&
              gestureState.isReaching &&
              distToCone < 0.27
            ) {
              this.stepCooldown = 0.6;
              this.coneTargetPos.set(0, 1.52, -0.05);
              this.sound.playWhoosh(1.35, 0);
              this._triggerVendorSpeech('hirr');
              if (this._loseHeart(this.coneWorldPos, '⚡')) return;
            }
          } else {
            this.coneTargetPos.set(0, 1.46, 0.04);
            this.conePitchX = -0.35;
            this.shaftRoll = (p - 0.55) * Math.PI * 4.4;
          }

          if (this.stageTimer >= 1.15) {
            this.subStep = 1;
            this.stageTimer = 0;
            this.conePitchX = 0.1;
            this.shaftRoll = 0;
            this.coneTargetPos.set(0, 1.21, 0.28);
            this._triggerVendorSpeech('hoppa');
          }
        } else {
          // 2nd Thrust: Real catch!
          this.coneTargetPos.set(
            Math.sin(this.stageTimer * 3) * 0.1,
            1.21,
            0.28
          );
          if (gestureState.isReaching && distToCone < 0.29) {
            this.sound.playGripTug(0);
            this._vibrate(25);
            this.score += 410;
            this._spawnScorePopup(410, this.coneWorldPos, '⚡');
            this._advanceRoutineStep();
          }
        }
        break;
      }

      // =========================================================================
      // 16. PISTACHIO CROWN FINALE SNATCH (`FINAL_PISTACHIO_CATCH`)
      // =========================================================================
      case 'FINAL_PISTACHIO_CATCH': {
        if (this.subStep === 0) {
          this.coneTargetPos.set(
            Math.sin(time * 2.2) * 0.14,
            1.22 + Math.cos(time * 2.8) * 0.04,
            0.26
          );
          this.conePitchX = Math.sin(time * 3) * 0.15;
          this.shaftRoll = Math.sin(time * 2.5) * 0.4;

          if (gestureState.isReaching && distToCone < 0.29) {
            this.subStep = 1;
            this.tugTimer = 0.36;
            this.heldItem = 'FULL_CONE_TUG';
            this.world.heldSocket.add(this.world.conePivot);
            this.world.conePivot.position.set(0, 0.05, 0);
            this.world.conePivot.rotation.set(0, 0, 0);
            const topFlav = this._getFlavorForScoop(
              Math.max(0, this.scoopCount - 1)
            );
            this.world.stretchyStrand.attach(
              this.coneWorldPos,
              handPos,
              topFlav.colorHex,
              true
            );
            this.sound.playGripTug(0);
            this._vibrate(35);
            return;
          }

          if (this.stageTimer >= (this.config.finalWindowSec || 2.8)) {
            this.stageTimer = 0;
            this.overtimeMisses++;
            this.sound.playBell(1.0, 0);
            this._triggerVendorSpeech('laugh');
            if (this._loseHeart(this.coneWorldPos, '⏳')) return;

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
            1.25
          );

          if (
            this.tugTimer <= 0 ||
            handWorld.distanceTo(this.coneWorldPos) > 0.28
          ) {
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
    const w = Math.max(1, window.visualViewport?.width || window.innerWidth);
    const h = Math.max(1, window.visualViewport?.height || window.innerHeight);
    const handScreen = this.world.projectToScreen(
      this.world.touristHand.position
    );
    const coneScreen = this.world.projectToScreen(
      this.coneWorldPos.clone().add(new THREE.Vector3(0, 0.04, 0))
    );
    const vendorHeadScreen = this.world.projectToScreen(
      new THREE.Vector3(0, 1.72, -0.58)
    );
    const safePullScreen = { x: w * 0.56, y: h * 0.84 };

    const routineProgress = Math.min(
      1,
      this.routineIndex / Math.max(1, this.routine.length - 1)
    );

    const trickInfo = this.save.getTrickInfo(this.currentMechanic);

    const guide = {
      active: this.active && !this.roundEnded,
      theme: 'green',
      icon: '🤚⬆️',
      badgeText: this.save.t('cue_reach'),
      trickTitle: trickInfo.name || '',
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
        x:
          handScreen.x > w * 0.5
            ? Math.max(60, handScreen.x - 180)
            : Math.min(w - 60, handScreen.x + 180),
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
        label: this.save.t('tag_on_paddle'),
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
      case 'TUTORIAL_WARMUP': {
        if (this.subStep === 0) {
          guide.theme = 'green';
          guide.icon = '🎓🤚⬆️';
          guide.badgeText = this.save.t('tut_step1');
          guide.stageProgress = 0.33;
          guide.comets.push({
            color: 'green',
            points: buildCurvedScreenPath(handScreen, coneScreen, -24),
          });
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 40,
            color: 'green',
            label: this.save.t('tag_grab'),
          });
        } else if (this.subStep === 1) {
          guide.theme = 'red';
          guide.icon = '🎓🤚⬇️';
          guide.badgeText = this.save.t('tut_step2');
          guide.stageProgress = 0.66;
          guide.comets.push({
            color: 'red',
            points: buildCurvedScreenPath(coneScreen, safePullScreen, 18),
          });
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 40,
            color: 'red',
            label: this.save.t('tag_trap'),
          });
        } else {
          guide.theme = 'green';
          guide.icon = '🎓✂️↔️';
          guide.badgeText = this.save.t('tut_step3');
          guide.stageProgress = 1.0;
          const leftCut = this.world.projectToScreen(
            new THREE.Vector3(-0.26, 1.22, 0.18)
          );
          const rightCut = this.world.projectToScreen(
            new THREE.Vector3(0.26, 1.22, 0.18)
          );
          guide.comets.push({
            color: 'green',
            points: buildCurvedScreenPath(leftCut, rightCut, -8),
          });
          guide.rings.push({
            x: (leftCut.x + rightCut.x) * 0.5,
            y: (leftCut.y + rightCut.y) * 0.5,
            radius: 32,
            color: 'green',
            label: this.save.t('tag_slice'),
          });
        }
        break;
      }

      case 'SCRAPE_FLAVOR_SCOOP': {
        guide.theme = 'amber';
        guide.icon = '🥄🍦';
        guide.badgeText = this.save.t('cue_scraping');
        guide.stageProgress = Math.min(1, this.stageTimer / 1.45);
        guide.rings.push({
          x: coneScreen.x,
          y: coneScreen.y,
          radius: 34,
          color: 'amber',
          label: this.save.t('tag_scraping'),
        });
        break;
      }

      case 'DOUBLE_CONE_SLIDE': {
        guide.theme = 'green';
        guide.icon = '🍦🍦';
        guide.badgeText = this.save.t('cue_double_cone_bait');
        guide.stageProgress = Math.min(1, this.stageTimer / 2.7);
        guide.comets.push({
          color: 'green',
          points: buildCurvedScreenPath(handScreen, coneScreen, -24),
        });
        guide.rings.push({
          x: coneScreen.x,
          y: coneScreen.y,
          radius: 42,
          color: 'amber',
          label: this.save.t('tag_double_cone'),
        });
        break;
      }

      case 'GIANT_BLOCK_TEASE': {
        if (this.subStep === 0) {
          guide.theme = 'red';
          guide.icon = '🧊⬇️';
          guide.badgeText = this.save.t('cue_giant_block');
          guide.stageProgress = Math.min(1, this.stageTimer / 2.05);
          guide.comets.push({
            color: 'red',
            points: buildCurvedScreenPath(coneScreen, safePullScreen, 18),
          });
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 46,
            color: 'red',
            label: this.save.t('tag_giant_block'),
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

      case 'MIDAIR_BLOCK_SOMERSAULT': {
        if (this.subStep === 0) {
          const blockScreen = this.world.projectToScreen(
            this.world.giantBlockGroup.position
          );
          guide.theme = 'amber';
          guide.icon = '🤸🍦';
          guide.badgeText = this.save.t('cue_somersault');
          guide.stageProgress = Math.min(1, this.stageTimer / 1.45);
          guide.rings.push({
            x: blockScreen.x,
            y: blockScreen.y,
            radius: 44,
            color: 'amber',
            label: this.save.t('tag_somersault'),
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

      case 'SHAFT_SPIN_360':
      case 'FIGURE_EIGHT_WEAVE': {
        guide.theme = 'green';
        guide.icon =
          this.currentMechanic === 'SHAFT_SPIN_360' ? '🌀🤚' : '♾️🤚';
        guide.badgeText = this.save.t('cue_reach');
        guide.stageProgress = (this.subStep + 0.4) / 2;
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
        break;
      }

      case 'VERTICAL_WINDMILL': {
        if (this.subStep === 0) {
          guide.theme = 'amber';
          guide.icon = '🎡👀';
          guide.badgeText = this.save.t('cue_windmill');
          guide.stageProgress = Math.min(1, this.stageTimer / 1.55);
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 36,
            color: 'amber',
            label: '🎡',
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

      case 'UPSIDE_DOWN_GRAVITY':
      case 'FAKE_DROP_PANIC':
      case 'OVERHEAD_CROWN_DANGLE':
      case 'COMBO_DOUBLE_PUMP': {
        if (this.subStep === 0) {
          guide.theme = 'red';
          guide.icon = '🤚⬇️';
          const cueMap = {
            UPSIDE_DOWN_GRAVITY: 'cue_upside_down',
            FAKE_DROP_PANIC: 'cue_fake_drop',
            OVERHEAD_CROWN_DANGLE: 'cue_overhead',
            COMBO_DOUBLE_PUMP: 'cue_double_pump',
          };
          guide.badgeText = this.save.t(cueMap[this.currentMechanic]);
          guide.stageProgress = Math.min(1, this.stageTimer / 1.35);
          guide.comets.push({
            color: 'red',
            points: buildCurvedScreenPath(coneScreen, safePullScreen, 16),
          });
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 40,
            color: 'red',
            label: this.save.t('tag_trap'),
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
            label: this.save.t('tag_grab'),
          });
        }
        break;
      }

      case 'BELL_RHYTHM_FEINT': {
        if (this.bellBeatsDone < 2) {
          guide.theme = 'red';
          guide.icon = `🔔 ${this.bellBeatsDone + 1}/3`;
          guide.badgeText = this.save.t('cue_bell_feint');
          guide.stageProgress = (this.bellBeatsDone + 0.5) / 3;
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 38,
            color: 'red',
            label: `🔔 ${this.bellBeatsDone + 1}/3 (✕)`,
          });
        } else {
          guide.theme = 'green';
          guide.icon = '🔔 3/3 🤚';
          guide.badgeText = this.save.t('cue_reach');
          guide.stageProgress = 1.0;
          guide.comets.push({
            color: 'green',
            points: buildCurvedScreenPath(handScreen, coneScreen, -22),
          });
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 42,
            color: 'green',
            label: '🔔 3/3 ✓',
          });
        }
        break;
      }

      case 'MEGA_TAFFY_SLICE': {
        guide.theme = 'green';
        guide.icon = '✂️↔️';
        guide.badgeText = this.save.t('cue_slice');
        const leftCut = this.world.projectToScreen(
          new THREE.Vector3(-0.26, 1.22, 0.18)
        );
        const rightCut = this.world.projectToScreen(
          new THREE.Vector3(0.26, 1.22, 0.18)
        );
        guide.comets.push({
          color: 'green',
          points: buildCurvedScreenPath(leftCut, rightCut, -8),
        });
        guide.rings.push({
          x: (leftCut.x + rightCut.x) * 0.5,
          y: (leftCut.y + rightCut.y) * 0.5,
          radius: 32,
          color: 'green',
          label: this.save.t('tag_slice'),
        });
        break;
      }

      case 'SHELL_SWAP_DUEL': {
        const fakeScreen = this.leftHandCustomTarget
          ? this.world.projectToScreen(this.leftHandCustomTarget)
          : { x: w * 0.35, y: h * 0.48 };

        if (this.stageTimer < 1.2) {
          guide.theme = 'amber';
          guide.icon = '👀🔄';
          guide.badgeText = this.save.t('cue_swap_watch');
          guide.stageProgress = this.stageTimer / 1.2;
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
        break;
      }

      case 'FINAL_PISTACHIO_CATCH': {
        guide.theme = 'green';
        guide.icon = '✊👑';
        guide.badgeText = this.save.t('cue_final_grab');
        guide.stageProgress = Math.max(
          0,
          1 - this.stageTimer / Math.max(0.5, this.config.finalWindowSec || 2.8)
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

    this.world.vendorHead.rotation.y = this.coneWorldPos.x * 0.28;
    this.world.fezTassel.rotation.z =
      -0.35 - this.coneWorldPos.x * 0.35 + Math.sin(time * 3.5) * 0.05;

    this.world.orientPaddleAndHands(
      this.shaftRoll,
      this.leftHandCustomTarget,
      dt,
      this.coneFlipZ,
      this.conePitchX
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
    this.world.outerConeGroup.visible = false;
    this.world.giantBlockGroup.visible = false;
    this.world.sliceCueGroup.visible = false;
    this.world.stretchyStrand.detach();

    const ustaDisplayName = this.save.getUstaName(this.levelIndex);
    let resultData = {};

    if (outcomeType === 'OUT_OF_HEARTS') {
      this.world.heldEmptyCone.visible = true;
      this.world.mainConeMesh.visible = false;
      this.world.setVendorMood('laugh');
      this.sound.playBellBurst();
      this.world.ringBells(1.2);
      this._vibrate([80, 40, 80, 40, 120]);

      const penalizedScore = Math.max(0, Math.round(this.score * 0.5));
      this.save.recordStageResult(this.currentStage, penalizedScore, 0, false);

      resultData = {
        outcomeType,
        badge: this.save.t('end_hearts_badge'),
        icon: '💔',
        title: this.save.t('end_hearts_title'),
        desc: this.save.t('end_hearts_desc'),
        stars: '☆☆☆',
        score: penalizedScore,
        bestScore: this.save.getStageBestScore(this.currentStage),
        scoopsText: this.save.t('end_hearts_scoop'),
        canAdvance: false,
      };
    } else if (outcomeType === 'PASSIVE_BORING') {
      this.world.heldSocket.add(this.world.conePivot);
      this.world.conePivot.position.set(0, 0.05, 0);
      this.world.conePivot.rotation.set(0, 0, 0);

      this.sound.playPenalty();
      this._vibrate(80);
      this.save.recordStageResult(this.currentStage, 0, 0, false);

      resultData = {
        outcomeType,
        badge: this.save.t('end_passive_badge'),
        icon: '😴',
        title: this.save.t('end_passive_title'),
        desc: this.save.t('end_passive_desc'),
        stars: '☆☆☆',
        score: 0,
        bestScore: this.save.getStageBestScore(this.currentStage),
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
      this.save.recordStageResult(this.currentStage, penalizedScore, 1, false);

      resultData = {
        outcomeType,
        badge: this.save.t('end_overtime_badge'),
        icon: '🧻',
        title: this.save.t('end_overtime_title'),
        desc: this.save.t('end_overtime_desc'),
        stars: '⭐☆☆',
        score: penalizedScore,
        bestScore: this.save.getStageBestScore(this.currentStage),
        scoopsText: this.save.t('end_overtime_scoop'),
        canAdvance: false,
      };
    } else if (outcomeType === 'MASTER_CATCH') {
      this.world.heldSocket.add(this.world.conePivot);
      this.world.conePivot.position.set(0, 0.05, 0);
      this.world.conePivot.rotation.set(0, 0, 0);
      this.world.setVendorMood('laugh');

      this.sound.playWinFanfare();
      this.sound.playCrowdReaction('cheer');
      this.world.triggerSpectatorReaction('cheer');
      this.world.ringBells(1.0);
      this._vibrate([40, 30, 80]);
      this.world.spawnBurst(this.coneWorldPos, 0xf5b942, 28);
      this.world.spawnBurst(this.coneWorldPos, 0x70e000, 20);

      const finalScore = Math.round(
        this.score + 750 + this.hearts * 150 + this.targetScoopCount * 100
      );
      const starNum =
        this.hearts >= 3 ? 3 : this.hearts === 2 ? 2 : 1;
      this.save.recordStageResult(
        this.currentStage,
        finalScore,
        starNum,
        true
      );

      resultData = {
        outcomeType,
        badge: `${this.save.t('stageLabel')} ${this.currentStage} • ${ustaDisplayName}`,
        icon: '🏆',
        title: this.save.t('end_win_title'),
        desc: this.save.t('end_win_desc'),
        stars:
          starNum === 3
            ? '⭐⭐⭐'
            : starNum === 2
              ? '⭐⭐☆'
              : '⭐☆☆',
        score: finalScore,
        bestScore: this.save.getStageBestScore(this.currentStage),
        scoopsText: `${this.targetScoopCount} 🍦 + 🥜`,
        canAdvance: true,
      };
    }

    setTimeout(() => {
      this.ui.onRoundEnd(resultData);
    }, 850);
  }
}
