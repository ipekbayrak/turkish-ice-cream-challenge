import {scrapeServing,scrapeBladePoint} from './scrape-serving.js';
import {beginTrickEntry,finishTrickEntry,updateTrickTransition,joinAuthoredPose,finishAuthoredPose,clearTrickTransition} from './trick-transition.js';
import {createIdleBellPhrase,idleBellPhraseAt} from './idle-bell-phrase.js';
import {updateFlavorRefusal} from './flavor-refusal.js';
import {FLAVOR_FEINT_ID,createFlavorFeintPlan,displayedFlavorIndex} from './flavor-feint-plan.js';
import {activateFlavorFeint,enterFlavorFeint,updateFlavorFeint,flavorFeintCue,clearFlavorFeint} from './flavor-feint-show.js';
import {RhythmClock} from './rhythm-clock.js';
import {normalizeStage} from './progression.js';
import {getStageConfig} from './protocol.js';
import {normalizeFlavorIndex} from './flavors.js';
import {poleHasFood} from './pole-hygiene.js';
import { researchedServicePlaying } from './researched-service.js';
import * as THREE from 'three';
import { CUSTOMER_SERVICE_IDS, CUSTOMER_MOLD, CUSTOMER_SCOOP, customerServicePlaying, customerOpeningRoutine } from './customer-service.js';
import { getShellTargets, classifyShellPick } from './shell-targeting.js';
import { StretchCutGesture, stretchCutGuide, STRETCH_CUT_COPY } from './stretch-cut.js';
import { enterChoreography, advanceChoreography, updateChoreographyBridge, clearChoreography, choreographyGuide, selectRoutineSlots, isChoreographedRoutine } from './trick-routines.js';
import { axialReachX } from './reach-offer.js';
import { scoopPath, moldPath, bellPath, surfaceStrikePath } from './trick-motion.js';
import { MAX_SCOOPS, getStageOrderOptions } from './venues.js';
import { GestureValidation } from './gesture-validation.js';
import { FigureEightGesture, createFigureEightPath, figureEightWorldPoint, figureEightViewportChanged } from './figure-eight.js';
import { VendorFlourish, VendorPoleRejoin, VENDOR_FLOURISH_SECONDS, canRejoinVendorCone, finishVendorRejoin, setFlourishPose, clearVendorFlourish } from './vendor-flourish.js';
import { isTimedVendorShow, isIdleVendorAction, isQuietVendorPresentation, markIdleSettling, tickIdleGuide, suppressIdleScene } from './idle-presentation.js';
import { enterExtraTrick, updateExtraTrick, extraTrickCue, enterServingNapkin, updateServingNapkin, servingNapkinCue } from './trick-extensions.js';
import { enterNestedService, separateNestedCone, updateNestedService, nestedServiceCue, servicePresentationPlaying } from './serving-sequence.js';
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

  setOrderConfig(scoopCount, flavorIndices, stageNumber = this.currentStage) {
    const bounds = getStageOrderOptions(stageNumber);
    this.targetScoopCount = Math.max(bounds.min, Math.min(bounds.max, Math.round(Number(scoopCount) || bounds.default)));
    if (Array.isArray(flavorIndices) && flavorIndices.length > 0) {
      this.selectedFlavors = flavorIndices.slice(0, MAX_SCOOPS).map(normalizeFlavorIndex);
      while (this.selectedFlavors.length < MAX_SCOOPS) {
        this.selectedFlavors.push(
          this.selectedFlavors[this.selectedFlavors.length - 1] ?? 0
        );
      }
    }
    this.save.setOrderPreferences(this.targetScoopCount, this.selectedFlavors);
    this.world.applySelectedFlavorColors(this.selectedFlavors);
  }

  _getFlavorForScoop(scoopIdxZeroBased) {
    const ordered=this.selectedFlavors[scoopIdxZeroBased % this.selectedFlavors.length]??0;
    const fIdx=displayedFlavorIndex(this.flavorFeint,scoopIdxZeroBased,ordered);
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
    if (!isPos) {
      this.vignetteFlash = {
        color: 'red',
        alpha: 0.16,
      };
    }
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
    this.ui?.onReaction?.({ kind: 'mistake', trickId: this.currentShowId || this.currentMechanic, componentId: this.currentMechanic, stage: this.currentStage, vendorIndex: this.levelIndex, index: this.routineIndex, score: this.score });

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
  _buildDynamicRoutineForStage(stageCfg) {
    const seq = []; // Start directly at the cart; no automatic tutorial step.

    // Always start by scraping the 1st chosen flavor & introducing the signature Double Cone or Giant Block
    seq.push('SCRAPE_FLAVOR_SCOOP');

    const pool = shuffleArray(stageCfg.trickPool || []);
    const count = Math.max(3, stageCfg.trickCount || 4);
    // Compound shows occupy the original slot budget, with at most 1/2/3 per
    // early/middle/late round so a larger repertoire does not lengthen every turn.
    const chosenTricks = shuffleArray(selectRoutineSlots(pool, count, stageCfg.stage || this.currentStage || 1));

    // Guarantee EYE_LOCK_RHYTHM_CHASE appears in the routine so the eye-contact & green-line rhythm mechanic is always experienced
    if (!chosenTricks.includes('EYE_LOCK_RHYTHM_CHASE')) {
      const baseSlot = chosenTricks.findIndex((id, index) => index > 0 && !isChoreographedRoutine(id));
      chosenTricks[baseSlot >= 0 ? baseSlot : 0] = 'EYE_LOCK_RHYTHM_CHASE';
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

    // The layered paper/wafer sequence resolves directly into the final service,
    // after every ordered scoop has been prepared. It still occupies one slot.
    const layeredIndex = seq.indexOf('LAYERED_SERVICE_TEASE');
    if (layeredIndex >= 0) seq.push(...seq.splice(layeredIndex, 1));
    seq.push('FINAL_PISTACHIO_CATCH');
    return seq;
  }

  resetRound(stageNumber = this.currentStage, runTutorial = false, { preserveCustomerCone = false } = {}) {
    clearFlavorFeint(this);
    const keepCustomerCone = preserveCustomerCone && this.world.conePivot.parent === this.world.heldSocket;
    const clampedStage = normalizeStage(stageNumber);
    this.currentStage = clampedStage;
    this.config = getStageConfig(clampedStage);
    this.rhythmClock=null;
    this.world.vendorBeatPhase=null;
    this.levelIndex = this.config.vendorIdx;
    const orderBounds = getStageOrderOptions(this.currentStage);
    this.targetScoopCount = Math.max(orderBounds.min, Math.min(orderBounds.max, Math.round(this.targetScoopCount) || orderBounds.default));
    this.selectedFlavors = Array.from({ length: MAX_SCOOPS }, (_, index) => this.selectedFlavors[index] ?? this.selectedFlavors[this.selectedFlavors.length - 1] ?? 0);

    this.world.setVendorCharacter(this.levelIndex);
    this.world.setServingScale?.(this.config.scoopScale ?? 1);
    this.world.applySelectedFlavorColors(this.selectedFlavors);

    this.active = false;
    this.roundEnded = false;
    clearChoreography(this);
    this.gestureValidation = new GestureValidation();

    this.maxHearts = this.config.hearts || 3;
    this.hearts = this.maxHearts;
    this.scoopCount = 0;
    this.score = 0;
    this.tricksSurvived = 0;
    this.penaltiesTaken = 0;
    this.overtimeMisses = 0;
    this.idleSeconds = 0;
    this.passiveLimitSec = 22.0;
    this.isAfkShowActive = false;
    clearVendorFlourish(this);
    this.afkPromptTimer=null;
    this.afkScenario = 0;
    this.afkTimer = 0;
    this.lastAfkBeatTime = 0;

    this.eyeLockHoldTimer = 0;
    this.rhythmBeatsCompleted = 0;
    this.rhythmBeatTimer = 0;
    this.rhythmSide = 1;
    this.rhythmTargetPos = new THREE.Vector3(0, 1.22, 0.27);
    this.midpointHoverTimer = 0;

    this.heldItem = null;
    this.tugTimer = 0;
    this.isGraspingPaddleCone = false;
    this.vendorBubbleText = '';
    this.vendorBubbleTimer = 0;
    this.lastScrapeClankTime = 0;
    this.bellBeatsDone = 0;
    this.floatingPopups = [];
    this.vignetteFlash = { color: 'green', alpha: 0 };

    this.coneWorldPos = keepCustomerCone
      ? this.world.paddleGroup.position.clone()
      : new THREE.Vector3(0, 1.24, 0.22);
    this.coneTargetPos = this.coneWorldPos.clone();
    this.world.coneSpring.pos.copy(this.coneWorldPos);
    this.world.coneSpring.target.copy(this.coneTargetPos);
    this.world.coneSpring.vel.set(0, 0, 0);

    this.shaftRoll = 0;
    this.coneFlipZ = 0;
    this.conePitchX = 0;
    this.leftHandCustomTarget = null;

    this.forceTutorialNext = false;
    this.pendingTrickAdvance = 0;
    clearTrickTransition(this);
    this.world.collectedCones?.reset();
    this.world.clearSlicePresentation?.();
    this.world.clearServingNapkin?.();
    this.servingNapkinState = null;
    this.paperReturnPose=null;
    this.nestedService = null; this.layeredService = null;
    this.lastAfkSurfaceKey = null;
    this.lastAfkContactKey = null;
    this.extraTrick = null;
    this.researchedService = null;
    this.customerService = null; this.customerConeStart = keepCustomerCone;
    this.carryScoopOffsetY = null; this.world.coneHandTiltZ = 0;
    this.speechClock = 0;
    this.lastSpeechAt = -Infinity;
    this.lastSpeechContext = '';
    this.lastSpeechType = '';
    this.captionLockUntil = 0;
    this.routine = this._buildDynamicRoutineForStage(this.config);

    this._hideAllProps();
    if (!keepCustomerCone) this._reattachConeToPaddle();
    this.world.updateIceCreamScoops(0, false);
    // A reset prepares data only. Inactive menus/order greetings must not build
    // active trick props, stretch ribbons or speech before startRound().
    this.routineIndex = 0;
    this.currentMechanic = this.routine[0] || 'SCRAPE_FLAVOR_SCOOP';
    this.currentShowId = this.currentMechanic;
    this.subStep = 0;
    this.stageTimer = 0;
    this.stepCooldown = 0;
  }

  _reattachConeToPaddle() {
    if (this.world.conePivot.parent !== this.world.paddleGroup) {
      if(this.active&&this.world.stallEffects)this.world.handoffCone('paddle');
      else{this.world.paddleGroup.add(this.world.conePivot);this.world.conePivot.position.set(0,.02,0);this.world.conePivot.rotation.set(0,0,0);}
    }
  }

  _hideAllProps() {
    this.idleStrandWasActive = false;
    this.world.clearTrickPresentations?.();
    this.world.setConeInVendorHand(false);
    this.world.carryScoop.visible = false;
    this.world.tubIceGroups.forEach(tub => { tub.fill = 1; });
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

  /** Optional in-world story caption; it never changes game state or timing. */
  sayLine(text, type = 'hmm', seconds = 2.4) {
    if (typeof text !== 'string' || !text.trim()) return;
    this.vendorBubbleText = text.trim();
    this.vendorBubbleTimer = Math.max(0.6, Math.min(6, seconds));
    this.captionLockUntil = (this.speechClock || 0) + this.vendorBubbleTimer;
    const voiceOrigin = this.world.vendorGroup.getWorldPosition(new THREE.Vector3());
    this.sound.speakVendor(type, this.levelIndex, voiceOrigin.x);
  }

  _triggerVendorSpeech(type = 'hoppa') {
    const now = this.speechClock || 0;
    const context = `${this.routineIndex}:${this.currentMechanic}:${this.subStep}`;
    const sameContext = context === this.lastSpeechContext;
    const elapsed = now - (this.lastSpeechAt ?? -Infinity);
    if (sameContext && (elapsed < 0.5 || (type === this.lastSpeechType && elapsed < 1.4))) return;
    this.lastSpeechAt = now;
    this.lastSpeechContext = context;
    this.lastSpeechType = type;
    const soundMap = {
      scrape: 'hmm',
      double_cone: 'eeeh',
      giant: 'hmm',
      flip: 'hirr',
      empty_trap: 'cik',
      hophop: 'hoppa',
      afk_table: 'taunt',
      afk_bells: 'eeeh',
      afk_wave: 'taunt',
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
    // Voice belongs to the vendor, not to the moving ice cream/paddle.
    const voiceOrigin = this.world.vendorGroup.getWorldPosition(new THREE.Vector3());
    const voiceAccepted = this.sound.speakVendor(soundType, this.levelIndex, voiceOrigin.x);
    if (voiceAccepted === false) return;

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
      hophop: 'speech_hophop',
      afk_table: 'speech_afk_table',
      afk_bells: 'speech_afk_bells',
      afk_wave: 'speech_afk_wave',
    };
    if (now >= (this.captionLockUntil || 0)) {
      this.vendorBubbleText = this.save.t(keyMap[type] || 'speech_hoppa');
      this.vendorBubbleTimer = 1.25;
    }
  }

  startRound({ customerCone = this.customerConeStart || false } = {}) {
    if (customerCone && this.world.conePivot.parent === this.world.heldSocket) {
      this.routine = customerOpeningRoutine(this.routine, this.targetScoopCount);
    }
    this.flavorFeint=createFlavorFeintPlan(this.routine,this.selectedFlavors.slice(0,this.targetScoopCount),this.targetScoopCount,{random:this.flavorFeintRandom||Math.random});
    if(this.flavorFeint)this.routine=this.flavorFeint.routine;
    this.customerConeStart = false;
    this.active = true;
    this.roundEnded = false;
    this.idleSeconds = 0;
    this.rhythmClock=new RhythmClock(this.config.tempoFactor||1);
    this.sound.bindRhythmClock?.(this.rhythmClock);
    this.sound.rhythmClock=this.rhythmClock;
    this.sound.tempoMultiplier = this.config.musicTempo||this.config.speedMult;
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

  _enterRoutineStep(stepIndex,componentId=null){
    const entry=this.active&&this.world.scene&&this.world.lArmRig?.handRig?beginTrickEntry(this):null;
    // A new request begins at the currently rendered pose, including when an
    // earlier presentation was interrupted. Never finish an obsolete lead-in.
    this.trickTransition=this.pendingTrickEntry=this.servingHandoff=this.pendingServingOwner=null;
    this.pendingEntryPaper=this.entryPaperPreparation=this.afterEntryPaperPose=null;
    this._initializeRoutineStep(stepIndex,componentId);
    if(entry)finishTrickEntry(this,entry);
  }

  _initializeRoutineStep(stepIndex, componentId = null) {
    this.sound.syncMusicBeat?.();
    clearVendorFlourish(this);
    this.afkPromptTimer=null;
    this.pendingTrickAdvance = 0;
    this.extraTrick = null;
    this.researchedService = null;
    this.customerService = null; this.carryScoopOffsetY = null; this.world.coneHandTiltZ = 0;
    this.servingNapkinState = null;
    this.paperReturnPose=null;
    this.nestedService = null; this.layeredService = null;
    this.presentationStartPos = this.coneWorldPos.clone();
    this.scrapeBladeStart=null;
    this.lastBellContact = -1;
    this.routineIndex = stepIndex;
    if(this.routine[stepIndex]==='FINAL_PISTACHIO_CATCH'&&this.flavorFeint?.status==='active')this.routine.splice(stepIndex,0,FLAVOR_FEINT_ID);
    const showId = this.routine[stepIndex] || 'FINAL_PISTACHIO_CATCH';
    this.currentMechanic = enterChoreography(this, showId, componentId);
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
    this.eyeLockHoldTimer = 0;
    this.rhythmBeatsCompleted = 0;
    this.rhythmBeatTimer = 0;
    this.rhythmSide = Math.random() < 0.5 ? -1 : 1;
    this.rhythmTargetPos = new THREE.Vector3(0, 1.22, 0.27);
    this.midpointHoverTimer = 0;
    this.isAfkShowActive = false;

    const keepCustomerServing = CUSTOMER_SERVICE_IDS.includes(this.currentMechanic) &&
      (this.world.conePivot.parent === this.world.heldSocket || this.world.conePivot.parent === this.world.lArmRig.handGroup);
    this._hideAllProps();
    if (!keepCustomerServing) this._reattachConeToPaddle();
    this.heldItem = null;
    this.world.setVendorMood('smile');

    for (const id of new Set([this.currentShowId, this.currentMechanic])) {
      if (TRICK_CATALOG.some((t) => t.id === id)) this.save.discoverTrick(id);
    }

    this.protocol.emitCommand(PLAYER_ROLES.VENDOR, 'ENTER_TRICK', {
      trickId: this.currentShowId || this.currentMechanic,
      componentId: this.currentMechanic,
      componentIndex: this.choreography?.index ?? 0,
      stepIndex,
    });

    activateFlavorFeint(this,stepIndex);
    if(enterFlavorFeint(this))return;
    if(this.currentMechanic==='FINAL_PISTACHIO_CATCH')this.world.applySelectedFlavorColors(this.selectedFlavors);
    const currentFlavor = this._getFlavorForScoop(Math.max(0, this.scoopCount));
    const currentTubPos = this._getTubWorldPosForScoop(
      Math.max(0, this.scoopCount)
    );

    if (!enterExtraTrick(this)) switch (this.currentMechanic) {
      case 'TUTORIAL_WARMUP': {
        this.scoopCount = 1;
        this.world.updateIceCreamScoops(1, false);
        this.coneTargetPos.set(0, 1.22, 0.27);
        this._triggerVendorSpeech('hmm');
        break;
      }

      case 'SCRAPE_FLAVOR_SCOOP': {
        const nextScoopIdx = Math.min(MAX_SCOOPS - 1, this.scoopCount);
        const flav = this._getFlavorForScoop(nextScoopIdx);
        const tubPos = this._getTubWorldPosForScoop(nextScoopIdx);
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
        enterNestedService(this);
        this.world.setVendorMood('mischief');
        this._triggerVendorSpeech('double_cone');
        break;
      }

      case 'GIANT_BLOCK_TEASE': {
        // Lift the entire 5-KILO GIANT ICE CREAM BLOCK out of the selected flavor tub!
        const flav = this._getFlavorForScoop(Math.min(MAX_SCOOPS - 1, this.scoopCount));
        const tubPos = this._getTubWorldPosForScoop(
          Math.min(MAX_SCOOPS - 1, this.scoopCount)
        );
        this.world.setGiantBlockColor(flav.colorHex);
        this.world.giantBlockGroup.visible = false;
        this.world.giantBlockGroup.position.copy(tubPos);
        this.world.setVendorMood('mischief');
        this._triggerVendorSpeech('giant');
        break;
      }

      case 'MIDAIR_BLOCK_SOMERSAULT': {
        // Launch the giant ice cream mass into mid-air and flip it 360°!
        const flav = this._getFlavorForScoop(Math.max(0, this.scoopCount - 1));
        this.world.setGiantBlockColor(flav.colorHex);
        this.world.giantBlockGroup.visible = false;
        this.world.giantBlockGroup.position.copy(this.coneWorldPos);
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
        this.cutGesture = new StretchCutGesture();
        if (this.scoopCount < this.targetScoopCount) {
          this.scoopCount++;
          this.world.updateIceCreamScoops(this.scoopCount, false);
        }
        this.world.triggerScoopJiggle(1.25);
        this.sound.playPaddleClank(0.1);
        this.sound.playScoopAdded();
        this.coneTargetPos.set(0.18, 1.39, 0.14);
        this.conePitchX = -0.28;
        this.world.sliceCueGroup.visible = false; // One projected guide follows the real strand.
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
        enterServingNapkin(this);
        break;
      }

      case 'SHELL_SWAP_DUEL': {
        this.world.napkinConeProp.visible = true;this.world.reuseEmptyCone?.(this.world.napkinConeProp);
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
        this.figureEight = new FigureEightGesture(createFigureEightPath(this.world));
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

      case 'EYE_LOCK_RHYTHM_CHASE': {
        if (this.scoopCount < 1) {
          this.scoopCount = 1;
          this.world.updateIceCreamScoops(1, false);
        }
        this.eyeLockHoldTimer = 0;
        this.rhythmBeatsCompleted = 0;
        this.rhythmBeatTimer = 0;
        this.rhythmSide = Math.random() < 0.5 ? -1 : 1;
        this.rhythmTargetPos.set(0, 1.22, 0.27);
        this.coneTargetPos.copy(this.rhythmTargetPos);
        this.world.setVendorMood('mischief');
        this._triggerVendorSpeech('hmm');
        break;
      }

      case 'FINAL_PISTACHIO_CATCH': {
        this.scoopCount = this.targetScoopCount;
        this.world.updateIceCreamScoops(this.scoopCount, true);
        this.world.setServingNapkin?.({ owner: 'vendor', peel: 0, visible: true });
        this.world.triggerScoopJiggle(1.3);
        this.sound.playBell(0.88, 0.2);
        this.world.ringBells(0.75);
        this.coneTargetPos.set(0, 1.22, 0.26);
        this.leftHandCustomTarget = new THREE.Vector3(0.24, 1.92, -0.12);
        this._triggerVendorSpeech('hoppa');
        break;
      }
    }
    if (this.active) this.ui?.onTrickStart?.({ trickId: this.currentShowId || this.currentMechanic, componentId: this.currentMechanic, componentIndex: this.choreography?.index ?? 0, stage: this.currentStage, vendorIndex: this.levelIndex, index: this.routineIndex });
  }

  _advanceRoutineStep() {
    const componentId = this.currentMechanic;
    const pendingBridge = advanceChoreography(this);
    this.ui?.onReaction?.({ kind: 'success', trickId: this.currentShowId || componentId, componentId, componentIndex: this.choreography ? Math.max(0, this.choreography.completed.length - 1) : 0, componentCount: this.choreography?.routine.componentIds.length || 1, showComplete: !pendingBridge, stage: this.currentStage, vendorIndex: this.levelIndex, index: this.routineIndex, score: this.score });
    if (pendingBridge) {
      this.sound.playShowBoost(1, this.coneWorldPos.x);
      return; // Connector animation owns the interval before the next component.
    }
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
    separateNestedCone(this);
  }

  attemptSnatch(handWorldPos) {
    if (!this.active || this.roundEnded) return;
    if (['NAPKIN_CONE', 'NAPKIN', 'EMPTY_CONE'].includes(this.heldItem)) return;
    this.idleSeconds = 0;

    this.protocol.emitCommand(PLAYER_ROLES.CUSTOMER, 'ATTEMPT_SNATCH', {
      pos: handWorldPos.toArray(),
    });
  }

  tickSpeech(dt) {
    this.speechClock = (this.speechClock || 0) + Math.max(0, dt);
    this.vendorBubbleTimer = Math.max(0, this.vendorBubbleTimer - Math.max(0, dt));
  }

  update(dt, time, gestureState) {
    this._updateSerial=(this._updateSerial||0)+1;
    if(this.active&&this.world.lArmRig?.handRig&&!this.servingHandoff){this.world.scene.updateMatrixWorld(true);this._servingFrame={parent:this.world.conePivot.parent,matrix:this.world.conePivot.matrixWorld.clone()};}
    this._motionStepKey=`${this.routineIndex}:${this.currentMechanic}:${this.subStep}:${this.choreography?.index??0}`;
    this.tickSpeech(dt);
    let gameDt=dt*(this.config?.tempoFactor||1);
    if(this.active&&!this.roundEnded&&this.rhythmClock){
      const previous=this.rhythmClock.time;
      const notes=this.rhythmClock.advance(dt);
      gameDt=this.rhythmClock.time-previous;
      this.sound.playRhythmNotes?.(notes);
      time=this.rhythmClock.time;
      this.world.vendorBeatPhase=((this.rhythmClock.step-1+this.rhythmClock.phase)/8)%1;
    }
    tickIdleGuide(this);
    if (isIdleVendorAction(this)) suppressIdleScene(this);
    this.contactPathOwnsMotion=false;
    this.presentationExact = false;
    this.presentationBell = null;
    this.presentationSurface = null;
    this.presentationStrikeTip = null;
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
          Math.sin(time * 0.7) * 0.055,
          1.22 + Math.cos(time * 1.1) * 0.018,
          0.16
        );
        this.shaftRoll = Math.sin(time * 0.7) * 0.08;
        this.conePitchX = 0.06;
      }
      this._applyKinematics(dt, time, gestureState);
      return;
    }

    // A player may interrupt the back sweep at any point. Return around the
    // same outside hip before restoring the prompt; do not cut through the
    // torso or spend the player's catch window during this short recovery.
    if(updateTrickTransition(this,dt,gestureState)){this._applyKinematics(dt,time,gestureState);return;}
    updateFlavorRefusal(this,dt,gestureState);
    if(updateFlavorFeint(this,dt,gestureState)){this._applyKinematics(dt,time,gestureState);return;}
    if(this.flourishPreparation && !this.vendorFlourish && !this.afkRejoin &&
      (gestureState.isMoving || gestureState.isPointerDown)){
      this.flourishPreparation.abort=true;
      this._updateAfkShow(dt,time);this._applyKinematics(dt,time,gestureState);
      return;
    }
    if(this.afkRejoin || (!this.vendorFlourish && this.isAfkShowActive &&
      (gestureState.isMoving || gestureState.isPointerDown) && canRejoinVendorCone(this.world))){
      this.afkRejoin ||= new VendorPoleRejoin(this.world,this.afkPromptTimer??this.stageTimer);
      setFlourishPose(this,this.afkRejoin.step(dt));this._applyKinematics(dt,time,gestureState);
      if(this.afkRejoin.inContact){finishVendorRejoin(this);this._triggerVendorSpeech('hoppa');}
      return;
    }
    if (this.vendorFlourish && (this.vendorFlourish.returning || gestureState.isMoving || gestureState.isPointerDown)) {
      this.vendorFlourish.beginReturn();
      setFlourishPose(this,this.vendorFlourish.step(dt));
      this._applyKinematics(dt,time,gestureState);
      if(this.vendorFlourish.done){
        const savedTimer=this.vendorFlourish.stageTimer;
        this.vendorFlourish=null;this.flourishPreparation=null;
        if(canRejoinVendorCone(this.world))this.afkRejoin=new VendorPoleRejoin(this.world,savedTimer);
        else{clearVendorFlourish(this);this.isAfkShowActive=false;this.idleSeconds=0;this.stageTimer=savedTimer;markIdleSettling(this);}
      }
      return;
    }

    if (updateChoreographyBridge(this, gameDt, gestureState)) {
      this._applyKinematics(dt, time, gestureState);
      return;
    }

    const speedMult = this.config.speedMult || 1.0;
    // Give the show its snap back without taking time away from a catch, pull,
    // trace or rhythm response. Only authored preparation/return phases hurry.
    const preparing = this.currentMechanic === 'SCRAPE_FLAVOR_SCOOP' ||
      researchedServicePlaying(this) || customerServicePlaying(this) || servicePresentationPlaying(this);
    this.stageTimer += gameDt / (this.config?.tempoFactor||1) * speedMult * (preparing ? 1.22 : 1);
    if (this.stepCooldown > 0) {
      this.stepCooldown = Math.max(0, this.stepCooldown - dt);
    }

    // Validate raw intent, never the hand that presentation may snap to the cone.
    const handPos = gestureState.handWorldPos;
    const intentPos = gestureState.intentWorldPos || handPos;
    const distToCone = intentPos.distanceTo(this.coneWorldPos);
    const rhythmRequest = this.currentMechanic === 'EYE_LOCK_RHYTHM_CHASE' && this.subStep === 1
      ? this.rhythmTargetPos.toArray().map((n) => n.toFixed(3)).join(':') : '';
    const shellWindow = this.currentMechanic === 'SHELL_SWAP_DUEL' ? (this.stageTimer >= 1.2 ? 'choice' : 'shuffle') : '';
    const opportunity = `${this.routineIndex}:${this.currentMechanic}:${this.subStep}:${this.heldItem || ''}:${this.bellBeatsDone}:${this.rhythmBeatsCompleted}:${rhythmRequest}:${shellWindow}`;
    this.gestureValidation.update(gestureState, dt, opportunity);
    const validReach = (radius = 0.28) => this.gestureValidation.reach('reach', distToCone, radius, dt);
    const validSlice = (near = true) => this.gestureValidation.slice('slice', near);
    const validPull = () => this.gestureValidation.pull('pull');

    if (this.pendingTrickAdvance > 0) {
      this.pendingTrickAdvance = Math.max(0, this.pendingTrickAdvance - dt);
      this._applyKinematics(dt, time, gestureState);
      if (this.pendingTrickAdvance === 0) this._advanceRoutineStep();
      return;
    }

    // 1. Holding the Fake Napkin Cone -> Swipe sideways to toss it away!
    if (this.heldItem === 'NAPKIN_CONE') {
      this.isGraspingPaddleCone = false;
      if (
        this.stepCooldown <= 0 &&
        validSlice()
      ) {
        this.world.collectEmptyCone?.(this.world.heldNapkinCone,`shell:${this.routineIndex}:${this.swapSide}`);
        if (this.world.heldNapkinCone) {
          this.world.heldNapkinCone.visible = false;
        }
        this.heldItem = null;
        this.sound.playWhoosh(1.25, 0);
        this._vibrate(25);
        this.score += 140;
        this._spawnScorePopup(140, this.world.touristHand.position);

        if (this.currentMechanic === 'SHELL_SWAP_DUEL') {
          this.world.napkinConeProp.visible = true;
          this.swapSide *= -1;
          this.stageTimer = 0;
        }
      }
      this._applyKinematics(dt, time, gestureState);
      return;
    }

    // 2. Holding the Outer Empty Cone from `DOUBLE_CONE_SLIDE` -> Fit it back under the inner cone or flick it away!
    if (this.heldItem === 'EMPTY_CONE' && this.currentMechanic !== 'DOUBLE_CONE_SLIDE') {
      this.isGraspingPaddleCone = false;
      this.coneTargetPos.set(
        0.18 + Math.sin(time * 3.2) * 0.06,
        1.35 + Math.cos(time * 2.5) * 0.04,
        0.22
      );
      this.shaftRoll += gameDt * 4.5;
      this.conePitchX = Math.sin(time * 3) * 0.25;

      const flickedSideways =
        this.stepCooldown <= 0 &&
        validSlice();
      const attachedUnderScoops =
        this.stepCooldown <= 0 &&
        validReach(0.29);

      if (attachedUnderScoops || flickedSideways) {
        if (flickedSideways && !attachedUnderScoops) {
          this.world.collectEmptyCone?.(this.world.heldEmptyCone,`empty:${this.routineIndex}`);
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

    // Check if the player is holding their hand at the MIDPOINT of the green line (Eye-Lock trigger!)
    const greenLineMidpoint = new THREE.Vector3(
      this.coneWorldPos.x * 0.5,
      1.15,
      0.41
    );
    const distToMidpoint = intentPos.distanceTo(greenLineMidpoint);
    const isAtGreenMidpoint =
      (gestureState.isPointerDown || gestureState.isMouseHover) && distToMidpoint < 0.24 && distToCone >= 0.26 && intentPos.z < 0.51;

    if (
      isAtGreenMidpoint &&
      this.gestureValidation.reach('midpoint', distToMidpoint, 0.24, dt) &&
      (this.currentMechanic === 'SHAFT_SPIN_360' ||
        (this.currentMechanic === 'DOUBLE_CONE_SLIDE' && this.subStep === 0 && !this.heldItem))
    ) {
      this.midpointHoverTimer += dt;
      this.idleSeconds = 0;
      if (this.midpointHoverTimer >= 0.35) {
        // Player paused at the middle of the green line locking eyes with the vendor!
        this.midpointHoverTimer = 0;
        this._hideAllProps();
        this.currentMechanic = 'EYE_LOCK_RHYTHM_CHASE';
        this.save.discoverTrick('EYE_LOCK_RHYTHM_CHASE');
        this.subStep = 1; // Jump directly into eye-locked rhythmic left/right follow!
        this.stageTimer = 0;
        this.rhythmBeatsCompleted = 0;
        this.rhythmBeatTimer = 0;
        this.rhythmSide = Math.random() < 0.5 ? -1 : 1;
        this.rhythmTargetPos.set(this.rhythmSide * 0.27, 1.22, 0.27);
        this.coneTargetPos.copy(this.rhythmTargetPos);
        this.world.setVendorMood('mischief');
        this.sound.playBellNote(3, 0.85, 0);
        this.world.strikeBell(3, 0.8);
        this._triggerVendorSpeech('hmm');
        this._spawnScorePopup(120, greenLineMidpoint, '👀');
      }
    } else {
      this.midpointHoverTimer = Math.max(0, this.midpointHoverTimer - dt * 1.5);
    }

    // Passive timeout & Multi-Scenario AFK Show Director check
    const watchingNewPresentation = isTimedVendorShow(this) || researchedServicePlaying(this) || customerServicePlaying(this) || servicePresentationPlaying(this) || (this.currentMechanic === 'WHOLE_MOLD_ON_CONE' && this.subStep === 0) ||
      (this.currentMechanic === 'SCOOP_LIFT_BACK' && (this.subStep === 0 || (this.subStep === 2 && this.stageTimer < 0.55)));
    if (
      watchingNewPresentation ||
      gestureState.isMoving ||
      gestureState.isPointerDown ||
      (this.currentMechanic === 'EYE_LOCK_RHYTHM_CHASE' &&
        this.subStep === 0 &&
        isAtGreenMidpoint)
    ) {
      if (this.isAfkShowActive) {
        this.isAfkShowActive = false;
        clearVendorFlourish(this);
        // This branch already resumes the mechanic below in this same frame.
        this.world.setConeInVendorHand(false);
        this.leftHandCustomTarget = null;
        this.conePitchX = 0;
        this.coneFlipZ = 0;
        this._triggerVendorSpeech('hoppa');
      }
      this.idleSeconds = 0;
    } else if (
      this.currentMechanic !== 'SCRAPE_FLAVOR_SCOOP' &&
      this.currentMechanic !== 'TUTORIAL_WARMUP'
    ) {
      this.idleSeconds += dt;
      if (this.idleSeconds >= this.passiveLimitSec) {
        this._endRound('PASSIVE_BORING');
        return;
      }
      if (this.idleSeconds >= 2.15) {
        this._updateAfkShow(dt, time);
        this._applyKinematics(dt, time, gestureState);
        return;
      }
    }

    if (updateExtraTrick(this, gameDt, time, { intentPos, handPos, gestureState, validReach, validSlice, validPull, realDt:dt })) {
      this._applyKinematics(dt, time, gestureState);
      return;
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

          if (validReach(0.29)) {
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
            this.tugTimer = Math.max(0, this.tugTimer - dt * 2.2);
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

          const pulledBack = validPull();
          if (gestureState.isReaching && distToCone < 0.25) {
            this.stageTimer = Math.max(0, this.stageTimer - 0.5);
            this._triggerVendorSpeech('cik');
            this._vibrate(35);
          } else if (this.stageTimer >= 2.1 && pulledBack) {
            this.subStep = 2;
            this.stageTimer = 0;
            this.coneFlipZ = 0;
            this.conePitchX = -0.25;
            this.coneTargetPos.set(0.18, 1.39, 0.15);
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
            0.72
          );
          const strandMid = new THREE.Vector3(0, 1.22, 0.18);
          const distToStrand = intentPos.distanceTo(strandMid);

          if (
            validSlice(distToStrand < 0.36)
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
        if(this.scoopCount>=this.targetScoopCount){this._advanceRoutineStep();break;}
        const nextScoopIdx = Math.min(MAX_SCOOPS - 1, this.scoopCount);
        const flav = this._getFlavorForScoop(nextScoopIdx);
        const tubPos = this._getTubWorldPosForScoop(nextScoopIdx);

        const p = Math.min(1, this.stageTimer / 1.45);
        // Keep the existing cone in the left hand while the free spatula scrapes.
        this.world.setConeInVendorHand(true);
        this.leftHandCustomTarget = new THREE.Vector3(0.20, 1.17, -0.22);
        this.world.scene.updateMatrixWorld(true);
        const deposit = this.world.getScoopAnchor(nextScoopIdx);
        this.scrapeBladeStart ||= scrapeBladePoint(this.world);
        scrapeServing(this,{progress:p,start:this.scrapeBladeStart,tub:tubPos,deposit,color:flav.colorHex,radius:this.world.scoopMeshes[nextScoopIdx].geometry?.parameters.radius*this.world.scoopMeshes[nextScoopIdx].scale.y||.064});
        if(p>=.92)this.world.updateIceCreamScoops(Math.min(this.targetScoopCount,this.scoopCount+1),false);
        if(p>=.30&&p<=.69)this.world.churnTubIceCream(flav.index,dt*3.8);
        if (p >= 0.30 && p < 0.51 && this.stageTimer - this.lastScrapeClankTime > 0.16) {
          this.lastScrapeClankTime = this.stageTimer;
          this.sound.playPaddleClank(tubPos.x);
        }

        if (this.stageTimer >= 1.45) {
          this.scoopCount = Math.min(this.targetScoopCount, this.scoopCount + 1);
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
        updateNestedService(this, gameDt, time, { intentPos, validReach, validSlice });
        break;
      }

      // =========================================================================
      // 3. GIANT 5-KILO BLOCK EXTRACTION (`GIANT_BLOCK_TEASE` - Kalıptan Kocaman Dondurma)
      // =========================================================================
      case 'GIANT_BLOCK_TEASE': {
        const scoopIdx = Math.min(MAX_SCOOPS - 1, this.scoopCount);
        const flav = this._getFlavorForScoop(scoopIdx);
        const tubPos = this._getTubWorldPosForScoop(scoopIdx);

        if (this.subStep === 0) {
          // Extract the selected mold, present it, then lower it into the same tub.
          const pose = moldPath(Math.min(1, this.stageTimer / 2.05), tubPos, false, this.world.getTubMoldSeat(flav.index));
          this.world.setConeInVendorHand(true);
          this.leftHandCustomTarget = new THREE.Vector3(.32,this.scoopCount>4?1.18:1.25,-.12);
          this.coneTargetPos.copy(pose.position).y -= this.world.giantBlockHeight * 0.40;
          this.presentationExact = true;
          this.shaftRoll = 0;
          this.conePitchX = 0;
          this.world.giantBlockGroup.visible = pose.visible;
          if(pose.visible)this.world.beginTubMold(flav.index);
          else if(this.stageTimer/2.05>=.95)this.world.returnTubMold(flav.index);
          this.world.giantBlockGroup.position.copy(pose.position);
          this.world.giantBlockGroup.rotation.set(0, pose.rotation, 0);
          this.world.tubMoldTransfer?.align();
          if (pose.visible && this.stageTimer < 0.78) {
            if(!this.world.stretchyStrand.active)this.world.stretchyStrand.attach(tubPos,pose.position,flav.colorHex,true);
            this.world.stretchyStrand.update(dt, tubPos, pose.position, 0.70);
          } else this.world.stretchyStrand.detach();

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
            // The block is already submerged; return the prepared cone to the paddle.
            this.world.setConeInVendorHand(false);
            this.world.tubIceGroups[flav.index].fill = 1;
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
          if (validReach(0.28)) {
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
          // The same block leaves its bucket, turns in the air and returns visibly.
          const duration = 1.45;
          const p = Math.min(1, this.stageTimer / duration);
          const flavorIndex = Math.max(0, this.scoopCount - 1);
          const tubPos = this._getTubWorldPosForScoop(flavorIndex);
          const flav = this._getFlavorForScoop(flavorIndex);
          const pose = moldPath(p, tubPos, true, this.world.getTubMoldSeat(flav.index));
          this.world.setConeInVendorHand(true);
          this.leftHandCustomTarget = new THREE.Vector3(.32,this.scoopCount>4?1.18:1.25,-.12);
          this.coneTargetPos.copy(pose.position).y -= this.world.giantBlockHeight * 0.42;
          this.presentationExact = true;
          this.shaftRoll = 0;
          this.conePitchX = 0;
          this.world.giantBlockGroup.visible = pose.visible;
          if(pose.visible)this.world.beginTubMold(flav.index);
          else if(p>=.95)this.world.returnTubMold(flav.index);
          this.world.giantBlockGroup.position.copy(pose.position);
          this.world.giantBlockGroup.rotation.set(pose.rotation, 0, Math.sin(pose.rotation) * 0.22);
          this.world.tubMoldTransfer?.align();
          this.world.stretchyStrand.detach();

          if (p >= 1) {
            this.world.setConeInVendorHand(false);
            this.world.tubIceGroups[flav.index].fill = 1;
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
          if (validReach(0.28)) {
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
        // A rapid own-axis turn and small wrist tilt keep the serving clear
        // of the torso; the lateral rhythm/catch windows are unchanged.
        this.shaftRoll += gameDt * 15.0;
        this.conePitchX = Math.sin(this.stageTimer * 7) * .15;

        if (this.tugTimer > 0) {
          if (this.gestureValidation.interrupted || distToCone > 0.38) {
            this.tugTimer = 0;
            this.isGraspingPaddleCone = false;
            this.world.stretchyStrand.detach();
            break;
          }
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
              this.coneTargetPos.set(axialReachX(this.world,-0.28,1), 1.28, 0.22);
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
          this.coneTargetPos.set(axialReachX(this.world,targetX,this.subStep), targetY, 0.25);

          if (
            this.stepCooldown <= 0 &&
            validReach(0.28)
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

          if (validReach(0.28)) {
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
          if (validReach(0.28)) {
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
          if (validReach(0.28)) {
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
        if (this.idleStrandWasActive) {
          this.world.stretchyStrand.attach(tubPos,this.coneWorldPos,this._getFlavorForScoop(Math.max(0,this.scoopCount-1)).colorHex,true);
          this.cutGesture = new StretchCutGesture();
          this.idleStrandWasActive = false;
        }
        this.coneTargetPos.set(
          0.18 + Math.sin(time * 2.4) * 0.035,
          1.39 + Math.cos(time * 3) * 0.025,
          0.14
        );
        this.conePitchX = -0.25;
        this.shaftRoll = Math.sin(time * 3) * 0.35;

        this.cutGesture ??= new StretchCutGesture();
        const cutting = this.cutGesture.update(gestureState, dt, stretchCutGuide(this.world));
        this.world.stretchyStrand.setHandPressure?.(cutting.push ? { t: cutting.parameter, offset: cutting.push } : null);
        this.world.setStretchCutPresentation?.(cutting);
        this.world.stretchyStrand.update(
          dt,
          tubPos,
          this.coneWorldPos,
          0.80
        );

        if (cutting.cut) {
          this.world.triggerSlice?.(cutting.point, this._getFlavorForScoop(Math.max(0, this.scoopCount - 1)).colorHex, cutting.direction);
          this.world.stretchyStrand.detach();
          this.world.sliceCueGroup.visible = false;
          this.conePitchX = 0;
          this.sound.playWhoosh(1.3, 0);
          this._triggerVendorSpeech('cheer');
          this._vibrate([20, 30]);
          this.score += 360;
          this._spawnScorePopup(360, cutting.point, '✂️');
          this.pendingTrickAdvance = 0.42;
        }
        break;
      }

      // =========================================================================
      // 10. REAL SERVING PAPER HANDOFF (`NAPKIN_CONE_FAKEOUT`)
      // =========================================================================
      case 'NAPKIN_CONE_FAKEOUT': {
        updateServingNapkin(this, gameDt, time, { intentPos, gestureState, validReach, validSlice, realDt:dt });
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
            const pick = classifyShellPick(gestureState.aimNormX ?? gestureState.normX, gestureState.aimNormY ?? gestureState.normY, getShellTargets(this.world));
            // Both choices require the same fresh deliberate reach and dwell.
            // A real grab still settling must never fall through to the decoy.
            const grabbedReal = this.gestureValidation.reach('shell-real', pick.candidate === 'real' ? pick.realDistance : Infinity, pick.radius, dt);
            const grabbedFake = this.gestureValidation.reach('shell-fake', pick.candidate === 'fake' ? pick.fakeDistance : Infinity, pick.radius, dt);

            if (grabbedReal) {
              this.sound.playGripTug(this.coneWorldPos.x);
              this._triggerVendorSpeech('cheer');
              this._vibrate(25);
              this.score += 400;
              this._spawnScorePopup(400, this.coneWorldPos, '👐');
              this._advanceRoutineStep();
            } else if (grabbedFake) {
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
        this.figureEight ||= new FigureEightGesture(createFigureEightPath(this.world));
        if(figureEightViewportChanged(this.figureEight.frame,this.world))this.figureEight=new FigureEightGesture(createFigureEightPath(this.world));
        const trace = this.figureEight;
        const completed = trace.update(gestureState, dt);
        // The cone joins the player's completed stroke; there is no snapped
        // player grip or timed hold that can masquerade as drawing an eight.
        const phase = trace.started ? trace.phase : this.stageTimer / 1.85;
        figureEightWorldPoint(trace.frame, phase, this.coneTargetPos);
        this.shaftRoll = Math.sin(phase * Math.PI * 2) * .65;
        this.conePitchX = Math.cos(phase * Math.PI * 4) * .24;
        this.coneFlipZ = Math.sin(phase * Math.PI * 2) * .2;
        this.isGraspingPaddleCone = false;
        if (completed) {
          this.conePitchX = this.coneFlipZ = 0;
          this.sound.playGripTug(this.coneWorldPos.x);
          this._triggerVendorSpeech('cheer');
          this._vibrate([25, 30]);
          this.score += 360;
          this._spawnScorePopup(360, this.coneWorldPos, '♾️');
          this._advanceRoutineStep();
        }
        break;
      }

      // =========================================================================
      // 13. BRASS BELL RHYTHM FEINT (`BELL_RHYTHM_FEINT` - 1-2 Sahte, 3'te Kap!)
      // =========================================================================
      case 'BELL_RHYTHM_FEINT': {
        if (this.bellBeatsDone < 2) {
          // Beats 1 and 2: Vendor raises paddle to strike the overhead brass bells and dips the cone as a feint!
          const beatPhase = (this.stageTimer % 0.85) / 0.85;
          const bellIdx = this.bellBeatsDone === 0 ? 1 : 5;
          const contact = this.world.getBellStrikeTarget(bellIdx);
          const bx = contact.x;
          const rest = new THREE.Vector3(this.bellBeatsDone === 0 ? -0.20 : 0.20, 1.22, 0.27);
          this.world.setConeInVendorHand(beatPhase < 0.52);
          this.leftHandCustomTarget = beatPhase < 0.52 ? new THREE.Vector3(0.22, 1.18, -0.24) : null;
          this.coneTargetPos.copy(bellPath(beatPhase, rest, contact));
          this.presentationExact = true;
          this.conePitchX = 0;
          this.shaftRoll = 0;
          if (beatPhase >= 0.28 && beatPhase < 0.43 && this.lastBellContact !== this.bellBeatsDone) {
            this.presentationBell = { index: bellIdx, beat: this.bellBeatsDone, power: 1.0 };
          }

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
            const bellIdx = this.bellBeatsDone === 0 ? 1 : 5;
            this.bellBeatsDone++;

            if (this.bellBeatsDone === 2) {
              this.stageTimer = 0;
              this.world.setConeInVendorHand(false);
              this._triggerVendorSpeech('hoppa');
            }
          }
        } else {
          // Beat 3: Real window!
          this.coneTargetPos.set(0, 1.21, 0.28);
          this.conePitchX = 0.08;
          if (validReach(0.29)) {
            this.sound.playBellNote(3, 1.0, 0);
            this.world.strikeBell(3, 1.0);
            this.sound.playGripTug(0);
            this._vibrate(30);
            this.score += 420;
            this._spawnScorePopup(420, this.coneWorldPos, '🔔');
            this._advanceRoutineStep();
          } else if (this.stageTimer >= 2.2) {
            this.bellBeatsDone = 0;
            this.lastBellContact = -1;
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
          if (validReach(0.29)) {
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
          if (validReach(0.29)) {
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
      // 16. EYE-LOCK MIDPOINT & RHYTHMIC GREEN-LINE CHASE (`EYE_LOCK_RHYTHM_CHASE`)
      // =========================================================================
      case 'EYE_LOCK_RHYTHM_CHASE': {
        this.rhythmBeatTimer += dt * speedMult;

        if (this.subStep === 0) {
          // SubStep 0: Bring hand to the MIDDLE of the green line and hold while locking eyes with the vendor!
          this.coneTargetPos.set(
            this.rhythmTargetPos.x + Math.sin(time * 2.6) * 0.03,
            this.rhythmTargetPos.y + Math.cos(time * 3.1) * 0.02,
            this.rhythmTargetPos.z
          );
          // Vendor locks eyes with the player
          this.world.setVendorMood('mischief');

          const midWorld = new THREE.Vector3(
            this.coneWorldPos.x * 0.5,
            1.15,
            0.41
          );
          const dMid = intentPos.distanceTo(midWorld);
          const holdingAtMid = this.gestureValidation.reach('eye-lock', dMid, 0.26, dt);

          if (holdingAtMid) {
            this.eyeLockHoldTimer += dt * 1.35;
            this.rhythmBeatTimer = Math.max(0, this.rhythmBeatTimer - dt * 0.8);
            if (this.eyeLockHoldTimer >= 0.32) {
              // Eye-contact locked! Now vendor shifts cone + green line left/right in rhythm!
              this.subStep = 1;
              this.stageTimer = 0;
              this.rhythmBeatTimer = 0;
              this.rhythmBeatsCompleted = 0;
              this.stepCooldown = 0.28;
              this.rhythmSide = Math.random() < 0.5 ? -1 : 1;
              this.rhythmTargetPos.set(this.rhythmSide * 0.27, 1.22, 0.27);
              this.coneTargetPos.copy(this.rhythmTargetPos);
              this.shaftRoll += Math.PI * 0.5 * this.rhythmSide;
              this.conePitchX = 0.14;
              this.coneFlipZ = 0;
              this.sound.playBellNote(3, 0.9, 0);
              this.world.strikeBell(3, 0.85);
              this._triggerVendorSpeech('hmm');
              this._vibrate(25);
              this.score += 140;
              this._spawnScorePopup(140, midWorld, '👀');
            }
          } else {
            this.eyeLockHoldTimer = Math.max(
              0,
              this.eyeLockHoldTimer - dt * 1.2
            );
            // If player doesn't bring hand to the midpoint in time -> "Hop! Hop!" random direction + rod flip!
            if (this.rhythmBeatTimer >= 1.25) {
              this.rhythmBeatTimer = 0;
              this.rhythmSide *= -1;
              const randX =
                this.rhythmSide * (0.16 + Math.random() * 0.16);
              const randY = 1.16 + Math.random() * 0.24;
              const randZ = 0.23 + Math.random() * 0.06;
              this.rhythmTargetPos.set(randX, randY, randZ);
              this.coneTargetPos.copy(this.rhythmTargetPos);
              // Flip the metal rod orientation ("hop hop diye çubuğun yönünü değiştirecek")
              this.shaftRoll += Math.PI * (Math.random() < 0.5 ? 1 : -1);
              this.conePitchX = (Math.random() - 0.5) * 0.65;
              this.coneFlipZ = (Math.random() - 0.5) * 0.5;
              this.sound.playWhoosh(1.25, randX);
                this._triggerVendorSpeech('hophop');
            }
          }
        } else {
          // SubStep 1: Vendor moves the ice cream left & right; green line shifts with it!
          // Player must move their finger in rhythm with the shifting green line!
          this.coneTargetPos.set(
            this.rhythmTargetPos.x + Math.sin(time * 5.2) * 0.03,
            this.rhythmTargetPos.y + Math.cos(time * 4.4) * 0.02,
            this.rhythmTargetPos.z
          );

          const matchedRhythm =
            this.stepCooldown <= 0 &&
            this.gestureValidation.follow(`beat:${this.rhythmTargetPos.x.toFixed(3)}:${this.rhythmTargetPos.y.toFixed(3)}`, this.rhythmTargetPos, dt);

          if (matchedRhythm) {
            this.rhythmBeatsCompleted++;
            this.rhythmBeatTimer = 0;
            this.stepCooldown = 0.32;

            const bellIdx = Math.min(6, 1 + this.rhythmBeatsCompleted * 2);
            this.sound.playBellNote(bellIdx, 0.92, this.coneWorldPos.x);
            this.world.strikeBell(bellIdx, 0.9);
            this.sound.playGripTug(this.coneWorldPos.x);
            this._vibrate(25);

            if (this.rhythmBeatsCompleted >= 3) {
              this.conePitchX = 0;
              this.coneFlipZ = 0;
              this.score += 380;
              this._spawnScorePopup(380, this.coneWorldPos, '🎯 3/3');
              this._triggerVendorSpeech('cheer');
              this._advanceRoutineStep();
            } else {
              // Shift cone and green line to the opposite side for the next rhythmic beat!
              this.rhythmSide *= -1;
              const nextX = this.rhythmSide * (0.24 + Math.random() * 0.07);
              const nextY = 1.2 + (Math.random() - 0.5) * 0.08;
              this.rhythmTargetPos.set(nextX, nextY, 0.27);
              this.coneTargetPos.copy(this.rhythmTargetPos);
              this.shaftRoll += Math.PI * 0.65 * this.rhythmSide;
              this.conePitchX = 0.12 * this.rhythmSide;
              this.coneFlipZ = 0;
              this.score += 120;
              this._spawnScorePopup(
                120,
                this.coneWorldPos,
                `🎵 ${this.rhythmBeatsCompleted}/3`
              );
              this._triggerVendorSpeech('hoppa');
            }
          } else if (this.rhythmBeatTimer >= 1.15) {
            // Player didn't move to the target in time -> Vendor shouts "Hop! Hop!", flips the rod direction, and darts to a random direction!
            this.rhythmBeatTimer = 0;
            const randDir = Math.random() < 0.5 ? -1 : 1;
            const randX =
              randDir * (0.15 + Math.random() * 0.18) *
              (Math.sign(this.rhythmTargetPos.x) === randDir ? -1 : 1);
            const randY = 1.15 + Math.random() * 0.28;
            const randZ = 0.22 + Math.random() * 0.07;
            this.rhythmTargetPos.set(randX, randY, randZ);
            this.coneTargetPos.copy(this.rhythmTargetPos);
            // Flip the metal rod direction ("hop hop diye çubuğun yönünü değiştirecek")
            this.shaftRoll += Math.PI;
            this.conePitchX = (Math.random() - 0.5) * 0.72;
            this.coneFlipZ = (Math.random() - 0.5) * 0.6;
            this.sound.playWhoosh(1.3, randX);
            this.world.setVendorMood('laugh');
            this._triggerVendorSpeech('hophop');
          }
        }
        break;
      }

      // =========================================================================
      // 17. PISTACHIO CROWN FINALE SNATCH (`FINAL_PISTACHIO_CATCH`)
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

          if (validReach(0.29)) {
            this.subStep = 1;
            this.tugTimer = 0.36;
            this.heldItem = 'FULL_CONE_TUG';
            this.world.handoffCone('player');
            // The filled cone is already in the customer's hand. The empty
            // paddle releases it; no chocolate-colored rope joins it to the man.
            this.world.stretchyStrand.detach();
            this.finalReleaseStart = this.coneWorldPos.clone();
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
          const pulledFree = validPull();
          this.world.stretchyStrand.detach();
          const releaseProgress = THREE.MathUtils.clamp((.36 - this.tugTimer) / .36, 0, 1);
          this.finalReleaseStart ||= this.coneWorldPos.clone();
          this.coneTargetPos.copy(this.finalReleaseStart).lerp(new THREE.Vector3(.24, 1.35, -.15), releaseProgress);
          this.leftHandCustomTarget = null;

          if (
            this.tugTimer <= 0 && pulledFree
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

  /**
   * Multi-Scenario Detailed AFK / Idle Show Director:
   * Triggered when the player does not move their hand for > 2.15s.
   * Cycles through five noninteractive vendor presentations:
   *  0: Pulls paddle back & rhythmically raps the steel tip on the front counter table ("Tak! Tak-tak!")
   *  1: Raises paddle high and strikes the 7 overhead hanging brass bells one by one ("Çıngır çıngır!")
   *  2: Drums the paddle across the shiny stainless-steel ice cream bucket rims inside the cooling basin
   *  3: Pulls the paddle back to his shoulder and waves/beckons the player with his left hand ("Huooop!")
   *  4: Keeps the serving in front while the bare pole travels outside the hip/back.
   */
  _poseAfkSurfaceStrike(kind, beatIndex, phase, contact, power = 0.75) {
    const key = `${kind}:${beatIndex}`;
    if (this.lastAfkSurfaceKey !== key) {
      this.lastAfkSurfaceKey = key;
      this.afkSurfaceStart = this.world.getPaddleStrikePoint(new THREE.Vector3());
    }
    this.world.setConeInVendorHand(true);
    this.leftHandCustomTarget = new THREE.Vector3(0.24, 1.20, -0.24);
    if(poleHasFood(this.world)){
      this.world.vendorPoleFree=false;this.presentationStrikeTip=null;this.presentationSurface=null;
      this.coneTargetPos.y=Math.max(1.28,this.coneTargetPos.y);return;
    }
    this.world.vendorPoleFree=true;
    const tip = surfaceStrikePath(phase, this.afkSurfaceStart, contact, 0.14);
    const noseOffset = this.world.getPaddleStrikePoint(new THREE.Vector3()).sub(this.world.paddleGroup.position);
    this.coneTargetPos.copy(tip).sub(noseOffset);
    this.presentationStrikeTip = tip;
    this.presentationExact = true;
    this.shaftRoll = 0;
    this.conePitchX = 0;
    this.coneFlipZ = 0;
    if (phase >= 0.48 && phase < 0.68 && this.lastAfkContactKey !== key) {
      this.presentationSurface = { kind, point: contact.clone(), key, beat: beatIndex, power };
    }
  }

  _updateAfkShow(dt, time) {
    this.world.vendorBellLook=null;
    suppressIdleScene(this);
    if (!this.isAfkShowActive) {
      clearTrickTransition(this);
      this.isAfkShowActive = true;
      this.afkPromptTimer=this.stageTimer;
      this.ui?.onReaction?.({ kind: 'afk', trickId: this.currentShowId || this.currentMechanic, componentId: this.currentMechanic, stage: this.currentStage, vendorIndex: this.levelIndex, index: this.routineIndex });
      this.afkTimer = 0;
      this.lastAfkBeatTime = -1;
      this.lastAfkSurfaceKey = null;
      this.lastAfkBellKey = null;
      this.afkBellPhrase=null;
      this.lastAfkContactKey = null;
      const enoughIdleTime=!Number.isFinite(this.passiveLimitSec)||this.passiveLimitSec-(this.idleSeconds||0)>VENDOR_FLOURISH_SECONDS+1;
      const foodOnCone=this.world.scoopStackGroup?.parent===this.world.conePivot&&Boolean(this.world.paddleContact?.highestVisible(this.world));
      const canSweep = foodOnCone && enoughIdleTime && !this.heldItem && !this.world.carryScoop?.visible &&
        (this.world.conePivot.parent===this.world.paddleGroup || this.world.coneHeldByVendor);
      const starts=canSweep?[0,1,4]:[0,1];
      this.afkScenario = starts[Math.floor(Math.random()*starts.length)];
      this.world.setVendorMood('mischief');
      this._triggerVendorSpeech(
        this.afkScenario === 0 ? 'afk_table' : this.afkScenario===1?'afk_bells':'afk_wave'
      );
    }

    if (this.afkScenario === 3) this.world.setConeInVendorHand(false);
    // Receive the actual serving before drumming. The same prepared hand pose
    // used by the back flourish prevents a one-frame wrist/food ownership snap.
    if(this.afkScenario!==4&&this.afkScenario!==3&&this.world.lArmRig?.handRig&&
       (this.flourishPreparation||this.world.conePivot.parent===this.world.paddleGroup)&&
       !this.world.carryScoop?.visible&&!this.world.giantBlockGroup?.visible){
      if(!this.flourishPreparation?.release){
        if(!this._prepareIdleServing(dt))return;
        const tip=this.world.getPaddleStrikePoint(new THREE.Vector3());
        const target=this.afkScenario===0?this.world.getCounterStrikeTarget(0).add(new THREE.Vector3(0,.14,0)):
          this.afkScenario===1?this.world.getBellStrikeTarget((this.afkBellPhrase ||= createIdleBellPhrase(this.world.bells.length)).indices[0]).add(new THREE.Vector3(0,-.16,0)):
          this.world.tubPositions[0].worldPos.clone().add(new THREE.Vector3(0,.24,.02));
        this.flourishPreparation.release={age:0,tip,start:tip.clone(),target,forward:this.world.paddleRollGroup.getWorldDirection(new THREE.Vector3()),rear:this.world._rearGripDistance??.6};
      }
      const release=this.flourishPreparation.release;release.age+=dt;
      const u=THREE.MathUtils.smoothstep(release.age,0,.45);release.tip.lerpVectors(release.start,release.target,u);
      const goal=release.tip.clone().sub(new THREE.Vector3(-.26,1.40,-.45)).normalize();
      this.world.vendorPoleFree=true;
      this.world.vendorPoleForwardHint=release.forward.clone().lerp(goal,u).normalize();
      this.world.vendorRearGripHint=THREE.MathUtils.lerp(release.rear,.60,u);
      this.leftHandCustomTarget=new THREE.Vector3(.25,1.20,-.235);
      const offset=this.world.getPaddleStrikePoint(new THREE.Vector3()).sub(this.world.paddleGroup.position);
      this.coneTargetPos.copy(release.tip).sub(offset);this.presentationStrikeTip=release.tip;
      this.presentationExact=true;this.shaftRoll=this.conePitchX=this.coneFlipZ=0;
      if(release.age<.45)return;
      const saved=this.flourishPreparation.stageTimer,abort=this.flourishPreparation.abort;
      this.flourishPreparation=null;this.world.vendorPoleFree=true;
      this.world.vendorPoleForwardHint=null;this.world.vendorRearGripHint=null;
      if(abort){this.afkRejoin=new VendorPoleRejoin(this.world,saved);return;}
    }
    this.afkTimer += dt;
    if (this.afkTimer >= (this.afkScenario===4?VENDOR_FLOURISH_SECONDS:3.2) && (!this.vendorFlourish || this.vendorFlourish.done) &&
        !(this.afkScenario===4 && this.flourishPreparation && !this.vendorFlourish)) {
      this.afkTimer = 0;
      this.lastAfkBeatTime = -1;
      this.lastAfkBellKey=null;this.afkBellPhrase=null;
      clearVendorFlourish(this);
      this.afkScenario = (this.afkScenario + 1) % 5;
      if(this.afkScenario===4 && (this.heldItem || this.world.carryScoop?.visible ||
        this.world.scoopStackGroup?.parent!==this.world.conePivot || !this.world.paddleContact?.highestVisible(this.world) ||
        (Number.isFinite(this.passiveLimitSec)&&this.passiveLimitSec-(this.idleSeconds||0)<=VENDOR_FLOURISH_SECONDS+1) ||
        (this.world.conePivot.parent!==this.world.paddleGroup && !this.world.coneHeldByVendor)))this.afkScenario=0;
      const speechKeys = ['afk_table', 'afk_bells', 'hmm', 'afk_wave', 'afk_wave'];
      this._triggerVendorSpeech(speechKeys[this.afkScenario]);
    }

    if (this.afkScenario === 0) {
      const beatIndex = Math.floor(this.afkTimer * 2.6);
      const phase = (this.afkTimer * 2.6) % 1;
      // Select a fixed rail point per beat; the contact cannot slide under the tip.
      const x = Math.sin(beatIndex * 0.92) * 0.24;
      const contact = this.world.getCounterStrikeTarget(x);
      this._poseAfkSurfaceStrike('counter', beatIndex, phase, contact, 0.74);
    } else if (this.afkScenario === 1) {
      // Pole-to-rim contact, then sound and bell swing on that contact frame.
      const phrase=this.afkBellPhrase ||= createIdleBellPhrase(this.world.bells.length);
      const pulse=idleBellPhraseAt(phrase,this.afkTimer);
      const beatIndex=pulse.beat,bellIdx=pulse.index,phase=pulse.phase;this.world.vendorBellLook=pulse.striking?bellIdx:null;
      const contact = this.world.getBellStrikeTarget(bellIdx);
      this.world.setConeInVendorHand(true);
      this.leftHandCustomTarget = new THREE.Vector3(0.22, 1.18, -0.24);
      this.world.vendorPoleFree=!poleHasFood(this.world);
      if(poleHasFood(this.world)){this.coneTargetPos.y=Math.max(1.28,this.coneTargetPos.y);return;}
      if(this.lastAfkBellKey!==beatIndex){this.lastAfkBellKey=beatIndex;this.afkBellRest=this.world.getPaddleStrikePoint(new THREE.Vector3());}
      const tip=bellPath(phase,this.afkBellRest,contact);
      const offset=this.world.getPaddleStrikePoint(new THREE.Vector3()).sub(this.world.paddleGroup.position);
      this.coneTargetPos.copy(tip).sub(offset);this.presentationStrikeTip=tip;
      this.presentationExact = true;
      this.conePitchX = 0;
      this.coneFlipZ = 0;
      this.shaftRoll = 0;
      if (pulse.striking && phase >= .28 && phase < .43 && this.lastAfkBeatTime !== beatIndex) {
        this.presentationBell = { index: bellIdx, beat: beatIndex, power: .9, afk: true };
      }
    } else if (this.afkScenario === 2) {
      const beatIndex = Math.floor(this.afkTimer * .9);
      const phase = (this.afkTimer * .9) % 1;
      const tubIndex = beatIndex % this.world.tubPositions.length;
      this.world.setConeInVendorHand(true);
      this.leftHandCustomTarget=new THREE.Vector3(.24,1.24,-.24);
      if(poleHasFood(this.world)){this.coneTargetPos.y=Math.max(1.28,this.coneTargetPos.y);return;}
      this.world.vendorPoleFree=true;
      const tub=this.world.tubPositions[tubIndex].worldPos;
      const dip=tub.clone().add(new THREE.Vector3(0,.025,0)),above=tub.clone().add(new THREE.Vector3(0,.24,.02));
      const tip=above.clone();
      if(phase<.25)tip.lerp(dip,THREE.MathUtils.smoothstep(phase,0,.25));
      else if(phase<.65){const t=(phase-.25)/.40;tip.copy(dip).add(new THREE.Vector3(Math.sin(t*Math.PI*4)*.025,Math.sin(t*Math.PI)*.008,Math.cos(t*Math.PI*4)*.02));this.world.churnTubIceCream(tubIndex,dt*.7);}
      else tip.copy(dip).lerp(above,THREE.MathUtils.smoothstep(phase,.65,.9));
      const offset=this.world.getPaddleStrikePoint(new THREE.Vector3()).sub(this.world.paddleGroup.position);
      this.coneTargetPos.copy(tip).sub(offset);this.presentationStrikeTip=tip;this.presentationExact=true;
      this.shaftRoll=this.conePitchX=this.coneFlipZ=0;
    } else if (this.afkScenario===3) {
      // SCENARIO 3: Pull the paddle all the way back to his shoulder & wave/beckon with left hand!
      this.coneTargetPos.set(
        0.28 + Math.sin(time * 2.5) * 0.04,
        1.38 + Math.cos(time * 3) * 0.03,
        -0.16
      );
      this.conePitchX = -0.35;
      this.coneFlipZ = 0;
      this.shaftRoll = Math.sin(time * 4) * 0.5;
      // Left hand waves "come here" ("gel-gel") toward the player
      this.leftHandCustomTarget = new THREE.Vector3(
        -0.14 + Math.sin(time * 6.5) * 0.12,
        1.28 + Math.cos(time * 6.5) * 0.05,
        0.22 + Math.sin(time * 6.5) * 0.06
      );
    } else {
      // Only the bare pole goes behind the master. The same cone remains in
      // his front hand and a tangent shaft avoids cutting across the torso.
      if(!this.vendorFlourish){
        if(!this._prepareIdleServing(dt))return;
        const prep=this.flourishPreparation;
        if(prep.abort){this.afkRejoin=new VendorPoleRejoin(this.world,prep.stageTimer);return;}
        this.vendorFlourish=new VendorFlourish(this.world,prep.stageTimer);
      }
      setFlourishPose(this,this.vendorFlourish.step(dt));
    }
  }

  _prepareIdleServing(dt){
    const w=this.world;
    if(!this.flourishPreparation){w.beginVendorConeReceive?.();this.flourishPreparation={age:0,from:this.coneWorldPos.clone(),stageTimer:this.stageTimer};}
    const prep=this.flourishPreparation;prep.age+=dt;w.vendorConeReceiveProgress=Math.min(1,prep.age/.25);
    this.leftHandCustomTarget=new THREE.Vector3(.25,1.20,-.235);
    const u=THREE.MathUtils.clamp(prep.age/.44,0,1),blend=u*u*(3-2*u);
    this.coneTargetPos.copy(prep.from).lerp(new THREE.Vector3(.25,1.31,-.20),blend);
    this.presentationExact=true;this.shaftRoll=this.conePitchX=this.coneFlipZ=0;
    w.scene.updateMatrixWorld(true);
    const grip=w.lArmRig.handGroup.localToWorld(new THREE.Vector3(0,.11,.035)),cone=w.conePivot.getWorldPosition(new THREE.Vector3());
    if(prep.age<.44||grip.distanceTo(cone)>.04)return false;
    w.setConeInVendorHand(true);w.vendorConeReceiveProgress=null;w.vendorConeReceiveFrom=null;return true;
  }

  getGestureGuide() {
    const w = Math.max(1, window.visualViewport?.width || window.innerWidth);
    const h = Math.max(1, window.visualViewport?.height || window.innerHeight);
    const handScreen = this.world.projectToScreen(
      this.world.playerAimAnchor
        ? this.world.playerAimAnchor.getWorldPosition(this.guideHandPoint ||= new THREE.Vector3())
        : this.world.touristHand.position
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

    const trickInfo = this.save.getTrickInfo(this.currentShowId || this.currentMechanic);

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

    if (isQuietVendorPresentation(this)) {
      guide.quiet = true;
      guide.theme = 'amber';
      const afkIcons = ['🥄🪵', '🔔🎵', '🥄🪣', '👋😄', '🥄'];
      const afkCueKeys = [
        'cue_afk_table',
        'cue_afk_bells',
        'cue_afk_stir',
        'cue_afk_wave',
        'cue_afk_wave',
      ];
      guide.icon = afkIcons[this.afkScenario % 5] || '🔔🎵';
      guide.badgeText = this.save.t(afkCueKeys[this.afkScenario % 5]);
      guide.stageProgress = Math.max(
        0.1,
        1 - this.idleSeconds / this.passiveLimitSec
      );
      // These are the vendor's idle gestures, not a request to grab the pole.
      // Return before held-item/grip cues or the choreography decorator can add targets.
      return guide;
    }

    if (!guide.active) return choreographyGuide(this, guide);

    if(this.trickTransition||this.pendingTrickEntry||this.pendingEntryPaper||this.entryPaperPreparation||this.servingHandoff){guide.quiet=true;guide.icon='👀';guide.badgeText=this.save.lang==='tr'?'USTAYI İZLE':'WATCH THE VENDOR';guide.comets=[];guide.rings=[];return guide;}
    if (this.choreography?.bridge) return choreographyGuide(this, guide);

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
      return choreographyGuide(this, guide);
    }

    if (this.heldItem === 'EMPTY_CONE' && !(this.currentMechanic==='DOUBLE_CONE_SLIDE'&&this.subStep===1&&!this.nestedService?.pulled)) {
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
      return choreographyGuide(this, guide);
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
      return choreographyGuide(this, guide);
    }


    if (this.pendingTrickAdvance > 0) {
      guide.theme = 'amber';
      guide.icon = this.currentMechanic === 'MEGA_TAFFY_SLICE' ? '✂️' : '🍦';
      guide.badgeText = '✓';
      return choreographyGuide(this, guide);
    }
    const flavorCue=flavorFeintCue(this);
    if(flavorCue){
      const refusing=flavorCue.kind==='reject';guide.quiet=!refusing;guide.theme='amber';guide.icon=refusing?'🤚↔':'👀';guide.badgeText=flavorCue.text;guide.stageProgress=flavorCue.progress;
      if(refusing){
        const x=THREE.MathUtils.clamp(handScreen.x,w*.2,w*.8),y=THREE.MathUtils.clamp(handScreen.y-30,h*.45,h-100);
        const left={x:x-38,y},right={x:x+38,y};
        guide.comets.push({color:'amber',points:buildCurvedScreenPath(left,right,0)},{color:'amber',points:buildCurvedScreenPath(right,left,0)});
      }
      return guide;
    }
    const extraCue = extraTrickCue(this) || servingNapkinCue(this) || nestedServiceCue(this);
    if (extraCue) {
      const target = extraCue.screen || this.world.projectToScreen(extraCue.target);
      const pull = extraCue.kind === 'pull';
      const waiting = extraCue.kind === 'wait';
      guide.theme = pull ? 'red' : waiting ? 'amber' : 'green';
      guide.icon = pull ? '🤚⬇️' : waiting ? '👀' : extraCue.kind === 'return' ? '🍦⬆️' : '✊';
      guide.badgeText = extraCue.badgeText || this.save.t(pull ? 'cue_pull_back' : waiting ? 'cue_swap_watch' : extraCue.kind === 'return' ? 'cue_return_cone' : 'cue_reach');
      guide.stageProgress = THREE.MathUtils.clamp(extraCue.progress, 0, 1);
      if (!waiting) guide.comets.push({ color: guide.theme, points: buildCurvedScreenPath(pull ? target : handScreen, pull ? safePullScreen : target, pull ? 18 : -24) });
      if (!extraCue.quiet) guide.rings.push({ x: target.x, y: target.y, radius: extraCue.radius||38, color: guide.theme, label: waiting ? '👀' : pull ? '↓' : extraCue.kind==='return'?'↑':'✊' });
      return choreographyGuide(this, guide);
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

      case 'FIGURE_EIGHT_WEAVE': {
        guide.theme = 'green'; guide.icon = '♾️';
        guide.figureEight = this.figureEight?.guide();
        guide.badgeText = this.save.lang === 'tr' ? 'SEKİZİ TAMAMLA' : 'COMPLETE THE EIGHT';
        guide.stageProgress = this.figureEight?.progress || 0;
        if (guide.figureEight) {
          const target = guide.figureEight.started ? guide.figureEight.next : guide.figureEight.start;
          guide.rings.push({ x: target.x, y: target.y, radius: guide.figureEight.radius, color: 'green', label: guide.figureEight.started ? '·' : '∞' });
        }
        break;
      }

      case 'SHAFT_SPIN_360': {
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
        guide.icon = '✋';
        guide.badgeText = STRETCH_CUT_COPY[this.save.lang] || STRETCH_CUT_COPY.en;
        const cutGuide = stretchCutGuide(this.world);
        if (!cutGuide) break;
        guide.comets.push({
          color: 'green',
          points: buildCurvedScreenPath(cutGuide.from, cutGuide.to, 0),
        });
        guide.rings.push({
          x: cutGuide.center.x,
          y: cutGuide.center.y,
          radius: 25,
          color: 'green',
          label: this.save.t('tag_slice'),
        });
        break;
      }

      case 'SHELL_SWAP_DUEL': {
        const targets = getShellTargets(this.world);
        const realScreen = targets.real.screen;
        const fakeScreen = targets.fake.screen;

        if (this.stageTimer < 1.2) {
          guide.theme = 'amber';
          guide.icon = '👀🔄';
          guide.badgeText = this.save.t('cue_swap_watch');
          guide.stageProgress = this.stageTimer / 1.2;
          guide.rings.push({
            x: realScreen.x,
            y: realScreen.y,
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
            points: buildCurvedScreenPath(handScreen, realScreen, -24),
          });
          guide.rings.push({
            x: realScreen.x,
            y: realScreen.y,
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
        guide.rings = guide.rings.filter(ring => ring.color === 'red' ? targets.fake.visible : targets.real.visible);
        if (!targets.real.visible) { guide.comets = []; guide.theme = 'amber'; guide.badgeText = this.save.t('cue_swap_watch'); }
        break;
      }

      case 'EYE_LOCK_RHYTHM_CHASE': {
        const greenPath = buildCurvedScreenPath(handScreen, coneScreen, -22);
        const midPt =
          greenPath[Math.floor(greenPath.length * 0.5)] || coneScreen;

        if (this.subStep === 0) {
          guide.theme = 'green';
          guide.icon = '👀🤚';
          guide.badgeText = this.save.t('cue_eyelock_hold');
          guide.stageProgress = Math.min(1, this.eyeLockHoldTimer / 0.32);
          guide.comets.push({
            color: 'green',
            points: greenPath,
          });
          // Highlight the midpoint of the green line where the player holds & locks eyes!
          guide.rings.push({
            x: midPt.x,
            y: midPt.y,
            radius: 36,
            color: 'amber',
            label: this.save.t('tag_eyelock'),
          });
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 30,
            color: 'green',
            label: '🍦',
          });
        } else {
          guide.theme = 'green';
          guide.icon = '👀↔️';
          guide.badgeText = this.save.t('cue_eyelock_rhythm');
          guide.stageProgress = Math.min(
            1,
            (this.rhythmBeatsCompleted + 0.35) / 3
          );
          guide.comets.push({
            color: 'green',
            points: greenPath,
          });
          guide.rings.push({
            x: coneScreen.x,
            y: coneScreen.y,
            radius: 42,
            color: 'green',
            label: `${this.save.t('tag_rhythm_go')} (${this.rhythmBeatsCompleted + 1}/3)`,
          });
        }
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

    return choreographyGuide(this, guide);
  }

  _applyKinematics(dt, time, gestureState) {
    joinAuthoredPose(this,dt);
    this.world.beginPoseFrame?.();
    this.world.presentationAxialSpin=this.active&&!this.isAfkShowActive&&this.currentMechanic==='SHAFT_SPIN_360';
    const servingTarget = (this.servingPoseTarget ||= new THREE.Vector3()).copy(this.coneTargetPos);
    if((this.presentationStrikeTip||this.presentationSurface)&&poleHasFood(this.world)){
      this.presentationStrikeTip=null;this.presentationSurface=null;this.presentationExact=false;
      servingTarget.y=Math.max(servingTarget.y,1.28);
    }
    // Bigger orders stay big, but an ordinary offer sits lower so the master remains visible.
    // Exact scraping/impact trajectories and customer-owned cones retain their physical anchors.
    if (this.active && !this.isAfkShowActive && !this.presentationExact && this.scoopCount > 4 &&
        this.world.conePivot.parent === this.world.paddleGroup && servingTarget.y >= 1.12 && servingTarget.y <= 1.36) {
      const near = THREE.MathUtils.clamp((servingTarget.z - .04) / .16, 0, 1);
      const drop = .06 + Math.min(3, this.scoopCount - 5) * .04;
      // The napkin is pinched below the rim: keep it above the lower gesture HUD,
      // and offer slightly beside the face instead of pushing the paper offscreen.
      if (this.currentMechanic === 'NAPKIN_CONE_FAKEOUT') {
        servingTarget.x += .12 * near;
        servingTarget.y -= Math.min(.06, drop) * near;
      } else if(this.currentMechanic!=='SHAFT_SPIN_360') servingTarget.y -= drop * near;
      // Axial offers already reserve room for the cluster horizontally. Keep
      // their authored height: lowering them hides the wafer on short phones.
    }
    if (this.isGraspingPaddleCone && gestureState) {
      const coupledTarget = servingTarget
        .clone()
        .lerp(gestureState.handWorldPos, 0.45);
      this.world.coneSpring.target.copy(coupledTarget);
    } else {
      this.world.coneSpring.target.copy(servingTarget);
    }

    if (this.presentationExact) {
      // Authored contact paths must reach the bucket/rim, not lag behind them.
      this.world.coneSpring.pos.copy(this.coneTargetPos);
      this.world.coneSpring.vel.set(0, 0, 0);
      this.coneWorldPos.copy(this.coneTargetPos);
    } else this.coneWorldPos.copy(this.world.coneSpring.step(dt));
    this.world.paddleGroup.position.copy(this.coneWorldPos);

    this.world.vendorHead.rotation.y = this.coneWorldPos.x * 0.28;
    this.world.fezTassel.rotation.z =
      -0.35 - this.coneWorldPos.x * 0.35 + Math.sin(time * 3.5) * 0.05;

    this.world.paddleCarryOffsetY = this.carryScoopOffsetY ?? 0.035;
    this.world.orientPaddleAndHands(
      this.shaftRoll,
      this.leftHandCustomTarget,
      dt,
      this.coneFlipZ,
      this.conePitchX,
      this.isAfkShowActive&&this.afkScenario===3?'wave':null
    );
    this.coneWorldPos.copy(this.world.paddleGroup.position);
    if (this.presentationStrikeTip) {
      const correction = this.presentationStrikeTip.clone().sub(this.world.getPaddleStrikePoint(new THREE.Vector3()));
      this.world.paddleGroup.position.add(correction);
      this.coneWorldPos.copy(this.world.paddleGroup.position);
      this.coneTargetPos.copy(this.coneWorldPos);
      this.world.coneSpring.pos.copy(this.coneWorldPos);
      this.world.coneSpring.target.copy(this.coneWorldPos);
      this.world.orientPaddleAndHands(0, this.leftHandCustomTarget, dt, 0, 0);
    }
    if (this.world.carryScoop.visible) {
      this.world.carryScoop.position.copy(this.coneWorldPos).y += this.carryScoopOffsetY ?? 0.035;
    }
    if (this.presentationSurface && !poleHasFood(this.world)) {
      const hit = this.presentationSurface;
      const actual = this.world.getPaddleStrikePoint(new THREE.Vector3());
      if (this.lastAfkContactKey !== hit.key && actual.distanceTo(hit.point) <= 0.02) {
        this.world.triggerCounterImpact?.(hit.point, hit.power);
        if (hit.kind === 'counter') this.sound.playCounterRap(hit.point.x, 0.94 + (hit.beat % 3) * 0.08);
        else this.sound.playPaddleClank(hit.point.x);
        this.lastAfkContactKey = hit.key;
        this.lastAfkBeatTime = hit.beat;
      }
    }
    if (this.presentationBell && !poleHasFood(this.world)) {
      const hit = this.presentationBell;
      const contact = this.world.getBellStrikeTarget(hit.index);
      if (this.world.getPaddleStrikePoint().distanceTo(contact) < 0.07) {
        this.world.strikeBell(hit.index, hit.power);
        this.sound.playBellNote(hit.index, hit.power, contact.x);
        if (hit.afk) this.lastAfkBeatTime = hit.beat;
        else this.lastBellContact = hit.beat;
      }
    }
    finishAuthoredPose(this);
  }

  _endRound(outcomeType) {
    clearTrickTransition(this);
    clearFlavorFeint(this);
    this.rhythmClock?.stop();this.world.vendorBeatPhase=null;this.sound.stopMusic?.();
    if (this.roundEnded) return;
    this.roundEnded = true;
    this.active = false;
    clearVendorFlourish(this);
    clearChoreography(this);
    this.isGraspingPaddleCone = false;
    this.pendingTrickAdvance = 0;
    this.world.clearTrickPresentations?.();
    this.world.clearServingNapkin?.();
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
      this.world.setServingNapkin?.({ owner: 'vendor', peel: 0, visible: true });

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
      this.world.setServingNapkin?.({ owner: 'vendor', peel: 0, visible: true });
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
