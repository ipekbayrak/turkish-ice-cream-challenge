import * as THREE from 'three';
import { GameWorld } from './world.js';
import { SoundEngine } from './audio.js';
import {
  CAMPAIGN_LEVELS,
  ICE_CREAM_FLAVORS,
  TRICK_CATALOG,
  TrickDirector,
} from './tricks.js';
import { SaveManager } from './storage.js';

const gameContainer = document.getElementById('game-container');
const gameCanvas = document.getElementById('game-canvas');
const trailCanvas = document.getElementById('trail-canvas');
const trailCtx = trailCanvas.getContext('2d');

const startOverlay = document.getElementById('start-overlay');
const startTitle = document.getElementById('start-title');
const playerRankBadge = document.getElementById('player-rank-badge');
const stageSelector = document.getElementById('stage-selector');
const scoopCntBtns = document.querySelectorAll('.scoop-cnt-btn');
const flavorOrbBtns = document.querySelectorAll('.flavor-orb-btn[data-flavor]');
const btnRandomFlavors = document.getElementById('btn-random-flavors');
const previewScoopsStack = document.getElementById('preview-scoops-stack');

const legReach = document.getElementById('leg-reach');
const legPull = document.getElementById('leg-pull');
const legFlick = document.getElementById('leg-flick');
const btnStartGame = document.getElementById('btn-start-game');
const btnStartTutorial = document.getElementById('btn-start-tutorial');
const btnOpenTricks = document.getElementById('btn-open-tricks');
const btnTricksTop = document.getElementById('btn-tricks-top');
const btnAudio = document.getElementById('btn-audio');
const btnFullscreenTop = document.getElementById('btn-fullscreen-top');
const btnLang = document.getElementById('btn-lang');
const btnSwitchUsta = document.getElementById('btn-switch-usta');

const hudLevel = document.getElementById('hud-level');
const hudHearts = document.getElementById('hud-hearts');
const hudScore = document.getElementById('hud-score');
const hudCard = document.getElementById('hud-card');
const hudGestureIcon = document.getElementById('hud-gesture-icon');
const hudActionBadge = document.getElementById('hud-action-badge');
const hudTrickTitle = document.getElementById('hud-trick-title');
const hudRoutineFill = document.getElementById('hud-routine-fill');
const hudStageFill = document.getElementById('hud-stage-fill');

const dot1 = document.getElementById('dot-1');
const dot2 = document.getElementById('dot-2');
const dot3 = document.getElementById('dot-3');
const dot4 = document.getElementById('dot-4');
const dotCrown = document.getElementById('dot-crown');
const scoopDotEls = [dot1, dot2, dot3, dot4];

const dialogTricks = document.getElementById('dialog-tricks');
const tricksCountBadge = document.getElementById('tricks-count-badge');
const tricksModalTitle = document.getElementById('tricks-modal-title');
const tricksCatalogList = document.getElementById('tricks-catalog-list');
const btnCloseTricks = document.getElementById('btn-close-tricks');

const dialogSettings = document.getElementById('dialog-settings');
const settingsTitle = document.getElementById('settings-title');
const langCardBtns = document.querySelectorAll('.lang-card-btn');
const btnToggleSound = document.getElementById('btn-toggle-sound');
const lblSound = document.getElementById('lbl-sound');
const valSound = document.getElementById('val-sound');
const btnToggleHaptics = document.getElementById('btn-toggle-haptics');
const lblHaptics = document.getElementById('lbl-haptics');
const valHaptics = document.getElementById('val-haptics');
const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
const lblFullscreen = document.getElementById('lbl-fullscreen');
const valFullscreen = document.getElementById('val-fullscreen');
const btnCloseSettings = document.getElementById('btn-close-settings');

const dialogIosFullscreen = document.getElementById('dialog-ios-fullscreen');
const iosFsTitle = document.getElementById('ios-fs-title');
const iosFsDesc = document.getElementById('ios-fs-desc');
const iosFsStep1 = document.getElementById('ios-fs-step1');
const iosFsStep2 = document.getElementById('ios-fs-step2');
const btnCloseIosFs = document.getElementById('btn-close-ios-fs');

const dialogResult = document.getElementById('dialog-result');
const resultBadge = document.getElementById('result-badge');
const resultIcon = document.getElementById('result-icon');
const resultTitle = document.getElementById('result-title');
const resultDesc = document.getElementById('result-desc');
const resultStars = document.getElementById('result-stars');
const lblScore = document.getElementById('lbl-score');
const lblBest = document.getElementById('lbl-best');
const lblCone = document.getElementById('lbl-cone');
const resScore = document.getElementById('res-score');
const resBest = document.getElementById('res-best');
const resScoops = document.getElementById('res-scoops');
const btnMenuRound = document.getElementById('btn-menu-round');
const btnNextRound = document.getElementById('btn-next-round');
const btnRetryRound = document.getElementById('btn-retry-round');

// Top-layer discrete display transition probe & smooth exit helper per `animate-to-from-top-layer`
let supportsDisplayTransition;
function canTransitionDisplay() {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (
    !window.CSS?.supports?.('transition-behavior', 'allow-discrete') ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText =
    'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransition;
}

function supportsTopLayerExit() {
  return window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay();
}

async function closeTopLayer(dialogEl) {
  if (!dialogEl || !dialogEl.open) return;
  if (!supportsTopLayerExit()) {
    dialogEl.setAttribute('data-closing', '');
    const animations = dialogEl.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((r) => setTimeout(r, 400)),
      ]);
    }
    if (!dialogEl.hasAttribute('data-closing')) return;
    dialogEl.removeAttribute('data-closing');
  }
  dialogEl.close();
}

document.querySelectorAll('dialog').forEach((dlg) => {
  dlg.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeTopLayer(dlg);
  });
  dlg.addEventListener('close', () => {
    dlg.returnValue = '';
  });
});

// Screen WakeLock for uninterrupted mobile gameplay
let wakeLockSentinel = null;
async function requestScreenWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLockSentinel) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
    }
  } catch {
    // Ignore on unsupported browsers
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (sound?.enabled) {
      sound.init();
    }
    if (director?.active) {
      requestScreenWakeLock();
    }
  }
});

// Prevent iOS Safari pinch-to-zoom & rubber-band bounce outside dialogs
['gesturestart', 'gesturechange', 'gestureend'].forEach((evtName) => {
  window.addEventListener(evtName, (e) => e.preventDefault(), {
    passive: false,
  });
});
document.addEventListener(
  'touchmove',
  (e) => {
    if (!e.target.closest('dialog')) {
      e.preventDefault();
    }
  },
  { passive: false }
);

// Register PWA Service Worker in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

const saveManager = new SaveManager();
const sound = new SoundEngine();
const world = new GameWorld(gameCanvas, (surface) => {
  if (surface === 'cart') {
    sound.playPaddleClank();
  } else {
    sound.playWhoosh(0.6);
  }
});

let lastAdvanceUnlocked = false;
let selectedStage = saveManager.data.unlockedStage || 1;
let selectedScoopCount = saveManager.data.preferredScoopCount || 3;
let selectedFlavors = (saveManager.data.preferredFlavors || [0, 1, 2, 3]).slice();
let nextFlavorSlot = 0;

const VENDOR_ICONS = ['🧢', '🏮', '🧔‍♂️👓', '👑'];

function renderVisualOrderPreview() {
  scoopCntBtns.forEach((btn) => {
    btn.classList.toggle(
      'active',
      Number(btn.dataset.scoops) === selectedScoopCount
    );
  });

  if (previewScoopsStack) {
    previewScoopsStack.innerHTML = '';
    for (let i = 0; i < selectedScoopCount; i++) {
      const fIdx = selectedFlavors[i % selectedFlavors.length] ?? i;
      const flav =
        ICE_CREAM_FLAVORS[fIdx % ICE_CREAM_FLAVORS.length] ||
        ICE_CREAM_FLAVORS[0];
      const ball = document.createElement('span');
      ball.className = 'prev-ball';
      ball.style.background = flav.cssColor;
      previewScoopsStack.appendChild(ball);
    }
  }

  flavorOrbBtns.forEach((btn) => {
    const fIdx = Number(btn.dataset.flavor);
    const activeInCone = selectedFlavors
      .slice(0, selectedScoopCount)
      .includes(fIdx);
    btn.classList.toggle('selected', activeInCone);
    btn.title = saveManager.getFlavorName(fIdx);
  });

  // Update Top HUD scoop dot visibility and colors
  scoopDotEls.forEach((dotEl, idx) => {
    if (!dotEl) return;
    const fIdx = selectedFlavors[idx % selectedFlavors.length] ?? idx;
    const flav =
      ICE_CREAM_FLAVORS[fIdx % ICE_CREAM_FLAVORS.length] ||
      ICE_CREAM_FLAVORS[0];
    dotEl.style.setProperty('--dot-color', flav.cssColor);
    dotEl.classList.toggle('hidden', idx >= selectedScoopCount);
  });

  if (director) {
    director.setOrderConfig(selectedScoopCount, selectedFlavors);
    if (!director.active) {
      world.updateIceCreamScoops(selectedScoopCount, true);
    }
  }
}

function renderStageSelector() {
  if (!stageSelector) return;
  stageSelector.innerHTML = '';
  const unlocked = saveManager.data.unlockedStage || 1;

  CAMPAIGN_LEVELS.forEach((lvl) => {
    const isLocked = lvl.stage > unlocked;
    const stars = saveManager.getStageStars(lvl.stage);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `stage-chip${lvl.stage === selectedStage ? ' active' : ''}${isLocked ? ' locked' : ''}`;
    chip.title = `${saveManager.t('stageLabel')} ${lvl.stage} — ${saveManager.getUstaName(lvl.vendorIdx)}`;

    const topSpan = document.createElement('span');
    topSpan.className = 'st-top';
    topSpan.textContent = isLocked
      ? `🔒 ${lvl.stage}`
      : `${VENDOR_ICONS[lvl.vendorIdx % VENDOR_ICONS.length]} ${lvl.stage}`;

    const starSpan = document.createElement('small');
    starSpan.className = 'st-stars';
    starSpan.textContent =
      stars > 0 ? '⭐'.repeat(stars) : isLocked ? '' : '☆☆☆';

    chip.appendChild(topSpan);
    chip.appendChild(starSpan);

    chip.addEventListener('click', () => {
      if (isLocked) {
        sound.init();
        sound.playPenalty();
        return;
      }
      sound.init();
      sound.playConePop(0);
      selectedStage = lvl.stage;
      director.resetRound(selectedStage, false);
      renderStageSelector();
      renderVisualOrderPreview();
    });

    stageSelector.appendChild(chip);
  });

  if (playerRankBadge) {
    const totalStars = saveManager.getTotalStars();
    const maxStars = CAMPAIGN_LEVELS.length * 3;
    const foundTricks = saveManager.data.discoveredTricks.length;
    playerRankBadge.textContent = `🏅 ${saveManager.getPlayerRankTitle()} • ⭐ ${totalStars}/${maxStars} • 🎪 ${foundTricks}/${TRICK_CATALOG.length}`;
  }
}

function renderTricksCatalogModal() {
  if (!tricksCatalogList) return;
  tricksCatalogList.innerHTML = '';
  const foundCount = saveManager.data.discoveredTricks.length;
  if (tricksCountBadge) {
    tricksCountBadge.textContent = `🎪 ${foundCount} / ${TRICK_CATALOG.length} ${saveManager.t('tricksFoundLabel')}`;
  }
  if (tricksModalTitle) {
    tricksModalTitle.textContent = saveManager.t('tricksModalTitle');
  }

  TRICK_CATALOG.forEach((trick, idx) => {
    const info = saveManager.getTrickInfo(trick.id);
    const isFound = saveManager.isTrickDiscovered(trick.id);

    const row = document.createElement('div');
    row.className = `trick-item-row${isFound ? '' : ' undiscovered'}`;

    const iconEl = document.createElement('div');
    iconEl.className = 'trick-item-icon';
    iconEl.textContent = info.icon;

    const bodyEl = document.createElement('div');
    bodyEl.className = 'trick-item-body';

    const headEl = document.createElement('div');
    headEl.className = 'trick-item-head';

    const titleEl = document.createElement('span');
    titleEl.className = 'trick-item-title';
    titleEl.textContent = `${idx + 1}. ${info.name} ${isFound ? '✓' : ''}`;

    const diffEl = document.createElement('span');
    diffEl.className = 'trick-item-diff';
    diffEl.textContent = '🔥'.repeat(info.difficulty || 1);

    headEl.appendChild(titleEl);
    headEl.appendChild(diffEl);

    const descEl = document.createElement('p');
    descEl.className = 'trick-item-desc';
    descEl.textContent = info.desc;

    bodyEl.appendChild(headEl);
    bodyEl.appendChild(descEl);

    row.appendChild(iconEl);
    row.appendChild(bodyEl);
    tricksCatalogList.appendChild(row);
  });
}

function applyLanguageUI() {
  const meta = saveManager.getLangMeta();
  btnLang.textContent = `${meta.flag} ${meta.code.toUpperCase()} ⚙️`;
  startTitle.textContent = `🍦 ${saveManager.t('gameTitle')}`;
  legReach.textContent = saveManager.t('legReach');
  legPull.textContent = saveManager.t('legPull');
  legFlick.textContent = saveManager.t('legFlick');

  btnStartGame.textContent = saveManager.t('playBtn');
  if (btnStartTutorial) {
    btnStartTutorial.textContent = saveManager.t('tutorialBtn');
  }
  if (btnOpenTricks) {
    btnOpenTricks.textContent = saveManager.t('tricksBtn');
  }
  if (btnMenuRound) {
    btnMenuRound.textContent = saveManager.t('menuBtn');
  }
  if (btnCloseTricks) {
    btnCloseTricks.textContent = saveManager.t('closeBtn');
  }

  lblScore.textContent = saveManager.t('scoreLabel');
  lblBest.textContent = saveManager.t('bestLabel');
  lblCone.textContent = saveManager.t('coneLabel');
  btnRetryRound.textContent = saveManager.t('retryBtn');

  settingsTitle.textContent = saveManager.t('settingsTitle');
  lblSound.textContent = `🔊 ${saveManager.t('soundLabel')}`;
  lblHaptics.textContent = `📳 ${saveManager.t('hapticsLabel')}`;
  lblFullscreen.textContent = `⛶ ${saveManager.t('fullscreenLabel')}`;
  btnCloseSettings.textContent = saveManager.t('closeBtn');

  if (iosFsTitle) iosFsTitle.textContent = saveManager.t('iosFsTitle');
  if (iosFsDesc) iosFsDesc.textContent = saveManager.t('iosFsDesc');
  if (iosFsStep1) iosFsStep1.textContent = `1️⃣ ${saveManager.t('iosFsStep1')}`;
  if (iosFsStep2) iosFsStep2.textContent = `2️⃣ ${saveManager.t('iosFsStep2')}`;
  if (btnCloseIosFs) btnCloseIosFs.textContent = saveManager.t('iosFsPlay');

  langCardBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === saveManager.lang);
  });

  valSound.textContent = sound.enabled ? 'ON' : 'OFF';
  valSound.classList.toggle('on', sound.enabled);
  valHaptics.textContent = saveManager.hapticsEnabled ? 'ON' : 'OFF';
  valHaptics.classList.toggle('on', saveManager.hapticsEnabled);
  const isFsActive = Boolean(
    document.fullscreenElement ||
      document.webkitFullscreenElement ||
      window.navigator.standalone ||
      document.body.classList.contains('ios-immersive')
  );
  if (valFullscreen) {
    valFullscreen.textContent = isFsActive ? 'ON' : '⛶';
    valFullscreen.classList.toggle('on', isFsActive);
  }

  renderStageSelector();
  renderVisualOrderPreview();
}

const uiCallbacks = {
  onPrompt() {},

  onRoundEnd(data) {
    renderStageSelector();
    resultBadge.textContent = data.badge;
    resultIcon.textContent = data.icon;
    resultTitle.textContent = data.title;
    resultDesc.textContent = data.desc;
    resultStars.textContent = data.stars;
    resScore.textContent = saveManager.formatNumber(data.score);
    resBest.textContent = saveManager.formatNumber(
      data.bestScore || data.score
    );
    resScoops.textContent = data.scoopsText;

    lastAdvanceUnlocked = data.canAdvance;
    btnNextRound.textContent = data.canAdvance
      ? saveManager.t('nextUsta')
      : saveManager.t('retryBtn');

    if (!dialogResult.open) {
      dialogResult.showModal();
    }
  },
};

const director = new TrickDirector(world, sound, saveManager, uiCallbacks);
applyLanguageUI();

// Non-Textual Visual Order Picker Events
scoopCntBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    sound.init();
    sound.playConePop(0);
    selectedScoopCount = Number(btn.dataset.scoops) || 3;
    renderVisualOrderPreview();
  });
});

function pickFlavorIndex(fIdx) {
  sound.init();
  sound.playScoopAdded();
  selectedFlavors[nextFlavorSlot % selectedScoopCount] = fIdx;
  nextFlavorSlot = (nextFlavorSlot + 1) % selectedScoopCount;
  renderVisualOrderPreview();
  world.triggerScoopJiggle(1.1);
}

flavorOrbBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    pickFlavorIndex(Number(btn.dataset.flavor) || 0);
  });
});

if (btnRandomFlavors) {
  btnRandomFlavors.addEventListener('click', () => {
    sound.init();
    sound.playBell(0.75, 0);
    const counts = [2, 3, 4];
    selectedScoopCount = counts[Math.floor(Math.random() * counts.length)];
    selectedFlavors = [
      Math.floor(Math.random() * ICE_CREAM_FLAVORS.length),
      Math.floor(Math.random() * ICE_CREAM_FLAVORS.length),
      Math.floor(Math.random() * ICE_CREAM_FLAVORS.length),
      Math.floor(Math.random() * ICE_CREAM_FLAVORS.length),
    ];
    renderVisualOrderPreview();
    world.triggerScoopJiggle(1.3);
  });
}

btnSwitchUsta.addEventListener('click', () => {
  const maxUnlocked = saveManager.data.unlockedStage || 1;
  selectedStage = (director.currentStage % maxUnlocked) + 1;
  director.resetRound(selectedStage, false);
  renderStageSelector();
  if (startOverlay.classList.contains('hidden')) {
    director.startRound();
  } else {
    renderVisualOrderPreview();
  }
});

// 15 Tricks Catalog Modal
function openTricksModal() {
  renderTricksCatalogModal();
  if (dialogTricks && !dialogTricks.open) {
    dialogTricks.showModal();
  }
}
if (btnOpenTricks) btnOpenTricks.addEventListener('click', openTricksModal);
if (btnTricksTop) btnTricksTop.addEventListener('click', openTricksModal);
if (btnCloseTricks) {
  btnCloseTricks.addEventListener('click', () => {
    closeTopLayer(dialogTricks);
  });
}

// Settings & Language Modal Controls
btnLang.addEventListener('click', () => {
  applyLanguageUI();
  if (!dialogSettings.open) {
    dialogSettings.showModal();
  }
});

langCardBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    saveManager.setLang(btn.dataset.lang);
    applyLanguageUI();
    director.refreshPromptForLanguage();
  });
});

btnToggleSound.addEventListener('click', () => {
  const on = sound.toggle();
  btnAudio.textContent = on ? '🔊' : '🔇';
  applyLanguageUI();
});

btnToggleHaptics.addEventListener('click', () => {
  const on = saveManager.toggleHaptics();
  if (on && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(25);
    } catch {}
  }
  applyLanguageUI();
});

function toggleFullscreenExperience() {
  const docEl = document.documentElement;
  const reqFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
  const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
  const activeFs =
    document.fullscreenElement || document.webkitFullscreenElement;

  if (reqFs) {
    if (!activeFs) {
      reqFs.call(docEl).catch(() => {});
      document.body.classList.add('ios-immersive');
    } else if (exitFs) {
      exitFs.call(document).catch(() => {});
      document.body.classList.remove('ios-immersive');
    }
  } else {
    document.body.classList.add('ios-immersive');
    window.scrollTo(0, 1);
    world.onResize();
    resizeTrailCanvas();
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia?.(
        '(display-mode: standalone), (display-mode: fullscreen)'
      ).matches;
    if (!isStandalone && dialogIosFullscreen && !dialogIosFullscreen.open) {
      applyLanguageUI();
      if (dialogSettings?.open) {
        closeTopLayer(dialogSettings);
      }
      dialogIosFullscreen.showModal();
    }
  }
  applyLanguageUI();
}

btnToggleFullscreen.addEventListener('click', toggleFullscreenExperience);
if (btnFullscreenTop) {
  btnFullscreenTop.addEventListener('click', toggleFullscreenExperience);
}
if (btnCloseIosFs) {
  btnCloseIosFs.addEventListener('click', () => {
    closeTopLayer(dialogIosFullscreen);
  });
}

btnCloseSettings.addEventListener('click', () => {
  closeTopLayer(dialogSettings);
});

let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;

function resizeTrailCanvas() {
  viewportWidth = Math.max(
    1,
    window.visualViewport?.width || window.innerWidth
  );
  viewportHeight = Math.max(
    1,
    window.visualViewport?.height || window.innerHeight
  );
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  trailCanvas.width = Math.round(viewportWidth * dpr);
  trailCanvas.height = Math.round(viewportHeight * dpr);
  trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeTrailCanvas);
window.addEventListener('orientationchange', () =>
  setTimeout(resizeTrailCanvas, 80)
);
window.visualViewport?.addEventListener('resize', resizeTrailCanvas);
resizeTrailCanvas();

const gestureState = {
  isPointerDown: false,
  isReaching: false,
  isMoving: false,
  normX: 0.2,
  normY: -0.3,
  vx: 0,
  vy: 0,
  speed: 0,
  grabCurl: 0.16,
  lungeBoost: 0,
  lastTapTime: 0,
  handWorldPos: new THREE.Vector3(0.22, 1.08, 0.62),
  trailPoints: [],
};

const PALETTE = {
  green: {
    glow: '#10b981',
    bright: '#4ade80',
    core: '#ecfdf5',
    badgeBg: 'rgba(16, 185, 129, 0.9)',
  },
  red: {
    glow: '#ef4444',
    bright: '#f87171',
    core: '#fef2f2',
    badgeBg: 'rgba(220, 38, 38, 0.92)',
  },
  amber: {
    glow: '#f59e0b',
    bright: '#fbbf24',
    core: '#fffbeb',
    badgeBg: 'rgba(217, 119, 6, 0.9)',
  },
};

function updateNormalizedPointer(clientX, clientY, dt = 0.016) {
  const newX = (clientX / viewportWidth) * 2 - 1;
  const newY = -((clientY / viewportHeight) * 2 - 1);

  const dx = newX - gestureState.normX;
  const dy = newY - gestureState.normY;
  gestureState.vx = dx / Math.max(0.008, dt);
  gestureState.vy = dy / Math.max(0.008, dt);
  gestureState.speed = Math.hypot(dx, dy) / Math.max(0.008, dt);

  gestureState.normX = newX;
  gestureState.normY = newY;
  gestureState.isMoving = gestureState.speed > 0.06;

  const isTrapActive =
    director.heldItem === 'NAPKIN_CONE' ||
    (director.currentMechanic === 'GIANT_BLOCK_TEASE' &&
      director.subStep === 0) ||
    (director.currentMechanic === 'NAPKIN_CONE_FAKEOUT' &&
      director.subStep === 0) ||
    (director.currentMechanic === 'UPSIDE_DOWN_GRAVITY' &&
      director.subStep === 0) ||
    (director.currentMechanic === 'FAKE_DROP_PANIC' &&
      director.subStep === 0) ||
    (director.currentMechanic === 'OVERHEAD_CROWN_DANGLE' &&
      director.subStep === 0) ||
    (director.currentMechanic === 'COMBO_DOUBLE_PUMP' &&
      director.subStep === 0);

  gestureState.trailPoints.push({
    x: clientX,
    y: clientY,
    life: 1.0,
    theme: isTrapActive ? 'red' : 'green',
  });
  if (gestureState.trailPoints.length > 26) {
    gestureState.trailPoints.shift();
  }
}

let lastMoveTime = performance.now();

gameContainer.addEventListener('pointerdown', (event) => {
  if (
    event.button !== 0 ||
    event.target.closest('button, dialog, a, input, .start-sheet-card')
  ) {
    return;
  }

  sound.init();

  const now = performance.now();
  updateNormalizedPointer(event.clientX, event.clientY, 0.016);

  // If the start overlay is open, allow tapping directly on the 6 3D copper tubs in the cart to pick flavors!
  if (!startOverlay.classList.contains('hidden')) {
    const clickedTubIdx = world.getTubIndexAtRay(
      gestureState.normX,
      gestureState.normY
    );
    if (clickedTubIdx >= 0) {
      pickFlavorIndex(clickedTubIdx);
      return;
    }
  }

  try {
    gameContainer.setPointerCapture(event.pointerId);
  } catch {
    // Ignore
  }
  gameContainer.classList.add('dragging');

  const isDoubleTap = now - gestureState.lastTapTime < 280;
  gestureState.lastTapTime = now;

  gestureState.isPointerDown = true;
  gestureState.isReaching = true;
  lastMoveTime = now;

  const tapWorld = new THREE.Vector3(
    THREE.MathUtils.clamp(gestureState.normX * 0.56, -0.52, 0.52),
    THREE.MathUtils.clamp(1.22 + gestureState.normY * 0.38, 0.92, 1.75),
    0.24
  );

  if (isDoubleTap) {
    gestureState.lungeBoost = 1.0;
    gestureState.grabCurl = 1.0;
    director.attemptSnatch(tapWorld);
  }
});

gameContainer.addEventListener('pointermove', (event) => {
  const now = performance.now();
  const dt = Math.max(0.004, (now - lastMoveTime) / 1000);
  lastMoveTime = now;

  if (
    gestureState.isPointerDown ||
    gameContainer.hasPointerCapture?.(event.pointerId) ||
    director.active
  ) {
    gestureState.isReaching =
      gestureState.isPointerDown ||
      gameContainer.hasPointerCapture?.(event.pointerId) ||
      gestureState.normY > -0.45;
    updateNormalizedPointer(event.clientX, event.clientY, dt);
  }
});

function endPointerInteraction() {
  gameContainer.classList.remove('dragging');
  gestureState.isPointerDown = false;
  gestureState.isReaching = false;
}

gameContainer.addEventListener('pointerup', endPointerInteraction);
gameContainer.addEventListener('pointercancel', endPointerInteraction);
gameContainer.addEventListener('lostpointercapture', endPointerInteraction);

function launchStageRound(runTutorial = false) {
  sound.init();
  requestScreenWakeLock();
  document.body.classList.add('ios-immersive');
  window.scrollTo(0, 1);
  startOverlay.classList.add('hidden');
  director.setOrderConfig(selectedScoopCount, selectedFlavors);
  director.resetRound(selectedStage, runTutorial);
  director.startRound();
}

btnStartGame.addEventListener('click', () => {
  launchStageRound(false);
});

if (btnStartTutorial) {
  btnStartTutorial.addEventListener('click', () => {
    launchStageRound(true);
  });
}

if (btnMenuRound) {
  btnMenuRound.addEventListener('click', () => {
    closeTopLayer(dialogResult);
    startOverlay.classList.remove('hidden');
    director.resetRound(selectedStage, false);
    renderStageSelector();
    renderVisualOrderPreview();
  });
}

btnNextRound.addEventListener('click', () => {
  closeTopLayer(dialogResult);
  requestScreenWakeLock();
  if (lastAdvanceUnlocked && director.currentStage < CAMPAIGN_LEVELS.length) {
    selectedStage = director.currentStage + 1;
  } else {
    selectedStage = director.currentStage;
  }
  renderStageSelector();
  director.resetRound(selectedStage, false);
  director.startRound();
});

btnRetryRound.addEventListener('click', () => {
  closeTopLayer(dialogResult);
  requestScreenWakeLock();
  director.resetRound(director.currentStage, false);
  director.startRound();
});

btnAudio.addEventListener('click', () => {
  const on = sound.toggle();
  btnAudio.textContent = on ? '🔊' : '🔇';
  applyLanguageUI();
});

function updateHUD(guide) {
  const ustaName = saveManager.getUstaName(director.levelIndex);
  hudLevel.textContent = `${director.currentStage} • ${ustaName}`;
  hudScore.textContent = saveManager.formatNumber(director.score);

  if (hudHearts) {
    const heartSpans = hudHearts.querySelectorAll('.h-icon');
    heartSpans.forEach((hEl, idx) => {
      hEl.classList.toggle('lost', idx >= director.hearts);
    });
  }

  scoopDotEls.forEach((dotEl, idx) => {
    if (!dotEl) return;
    dotEl.classList.toggle('active', director.scoopCount >= idx + 1);
  });
  if (dotCrown) {
    dotCrown.classList.toggle(
      'active',
      director.scoopCount >= director.targetScoopCount &&
        director.currentMechanic === 'FINAL_PISTACHIO_CATCH'
    );
  }

  if (guide) {
    hudCard.className = `gesture-hud-card theme-${guide.theme}`;
    if (hudGestureIcon) hudGestureIcon.textContent = guide.icon || '🤚⬆️';
    hudActionBadge.textContent = guide.badgeText;
    if (hudTrickTitle) {
      hudTrickTitle.textContent = guide.trickTitle || '';
    }
    hudRoutineFill.style.width = `${Math.round(
      Math.max(12, guide.routineProgress * 100)
    )}%`;
    hudStageFill.style.width = `${Math.round(
      THREE.MathUtils.clamp(guide.stageProgress * 100, 8, 100)
    )}%`;
  }
}

function drawFadingToBrightComet(
  ctx,
  points,
  colorKey,
  elapsed,
  isGuide = true
) {
  if (!points || points.length < 2) return;
  const pal = PALETTE[colorKey] || PALETTE.green;
  const n = points.length;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < n; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const t = i / (n - 1);

    const alpha = 0.06 + Math.pow(t, 1.45) * (isGuide ? 0.82 : 0.88);
    const width =
      (isGuide ? 2.5 : 2.0) + Math.pow(t, 1.35) * (isGuide ? 14.0 : 12.0);

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.strokeStyle = pal.glow;
    ctx.globalAlpha = alpha * 0.45;
    ctx.lineWidth = width * 1.65;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.strokeStyle = t > 0.78 ? pal.core : pal.bright;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width * 0.75;
    ctx.stroke();
  }

  if (isGuide && n >= 4) {
    const pulseT = (elapsed * 1.55) % 1;
    const floatIdx = pulseT * (n - 1);
    const idx0 = Math.floor(floatIdx);
    const idx1 = Math.min(n - 1, idx0 + 1);
    const frac = floatIdx - idx0;
    const px = THREE.MathUtils.lerp(points[idx0].x, points[idx1].x, frac);
    const py = THREE.MathUtils.lerp(points[idx0].y, points[idx1].y, frac);

    ctx.globalAlpha = 0.95;
    ctx.fillStyle = pal.core;
    ctx.beginPath();
    ctx.arc(px, py, 4 + pulseT * 6, 0, Math.PI * 2);
    ctx.fill();

    const tip = points[n - 1];
    const prev = points[Math.max(0, n - 3)];
    const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x);
    const headLen = 16;

    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = pal.core;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(
      tip.x - headLen * Math.cos(angle - Math.PI / 6),
      tip.y - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(
      tip.x - headLen * Math.cos(angle + Math.PI / 6),
      tip.y - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawTargetRings(ctx, rings, elapsed) {
  if (!rings || !rings.length) return;
  ctx.save();

  rings.forEach((ring) => {
    const pal = PALETTE[ring.color] || PALETTE.green;
    const pulse = 1 + Math.sin(elapsed * 6.5) * 0.1;
    const r = ring.radius * pulse;

    ctx.beginPath();
    ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = pal.bright;
    ctx.lineWidth = 3.5;
    ctx.globalAlpha = 0.85;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ring.x, ring.y, r * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = pal.glow;
    ctx.globalAlpha = 0.14;
    ctx.fill();

    if (ring.label) {
      ctx.font = '800 13px system-ui, -apple-system, sans-serif';
      const textWidth = ctx.measureText(ring.label).width;
      const padX = 8;
      const boxW = textWidth + padX * 2;
      const boxH = 22;
      const bx = ring.x - boxW * 0.5;
      const by = ring.y + r + 5;

      ctx.globalAlpha = 0.92;
      ctx.fillStyle = pal.badgeBg;
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 11);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ring.label, ring.x, by + boxH * 0.5 + 0.5);
    }
  });

  ctx.restore();
}

function drawVendorSpeechBubble(ctx, bubble) {
  if (!bubble || !bubble.text) return;
  ctx.save();
  ctx.globalAlpha = bubble.alpha;
  ctx.font = '900 13px system-ui, -apple-system, sans-serif';
  const tw = ctx.measureText(bubble.text).width;
  const padX = 11;
  const bw = tw + padX * 2;
  const bh = 28;
  const bx = THREE.MathUtils.clamp(
    bubble.x - bw * 0.5,
    12,
    viewportWidth - bw - 12
  );
  const by = Math.max(58, bubble.y - bh * 0.5);

  ctx.fillStyle = 'rgba(255, 248, 235, 0.95)';
  ctx.strokeStyle = '#f5b942';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1b0a04';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(bubble.text, bx + bw * 0.5, by + bh * 0.5 + 0.5);
  ctx.restore();
}

function drawFloatingPopupsAndVignette(ctx, guide) {
  if (!guide) return;

  if (guide.vignetteFlash && guide.vignetteFlash.alpha > 0.01) {
    const w = viewportWidth;
    const h = viewportHeight;
    const pal = PALETTE[guide.vignetteFlash.color] || PALETTE.green;
    const grad = ctx.createRadialGradient(
      w * 0.5,
      h * 0.5,
      Math.min(w, h) * 0.25,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.65
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, pal.glow);

    ctx.save();
    ctx.globalAlpha = guide.vignetteFlash.alpha * 0.55;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  if (guide.floatingPopups && guide.floatingPopups.length > 0) {
    ctx.save();
    ctx.font = '900 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    guide.floatingPopups.forEach((fp) => {
      const pal = PALETTE[fp.color] || PALETTE.green;
      ctx.globalAlpha = Math.min(1, fp.life * 1.4);
      ctx.strokeStyle = 'rgba(14, 7, 4, 0.9)';
      ctx.lineWidth = 4;
      ctx.strokeText(fp.text, fp.x, fp.y);
      ctx.fillStyle = pal.bright;
      ctx.fillText(fp.text, fp.x, fp.y);
    });
    ctx.restore();
  }
}

function renderVisualCometsAndTrails(dt, elapsed, guide) {
  trailCtx.clearRect(0, 0, viewportWidth, viewportHeight);

  if (guide && guide.active) {
    drawFloatingPopupsAndVignette(trailCtx, guide);
    guide.comets.forEach((c) => {
      drawFadingToBrightComet(trailCtx, c.points, c.color, elapsed, true);
    });
    drawTargetRings(trailCtx, guide.rings, elapsed);
    drawVendorSpeechBubble(trailCtx, guide.vendorBubble);
  }

  const pts = gestureState.trailPoints;
  for (let i = pts.length - 1; i >= 0; i--) {
    pts[i].life -= dt * 4.2;
    if (pts[i].life <= 0) {
      pts.splice(i, 1);
    }
  }

  if (pts.length >= 2) {
    const activeTheme = pts[pts.length - 1].theme || 'green';
    drawFadingToBrightComet(trailCtx, pts, activeTheme, elapsed, false);
  }
}

let prevTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min(0.05, (now - prevTime) / 1000);
  prevTime = now;
  const elapsed = now / 1000;

  gestureState.lungeBoost = Math.max(0, gestureState.lungeBoost - dt * 3.5);

  const targetGrab =
    director.isGraspingPaddleCone || director.heldItem
      ? 0.98
      : gestureState.isPointerDown
        ? 0.36
        : 0.14;

  gestureState.grabCurl = THREE.MathUtils.lerp(
    gestureState.grabCurl,
    targetGrab,
    dt * 14
  );
  gestureState.speed *= 0.85;
  gestureState.isMoving = gestureState.speed > 0.05;

  if (director.roundEnded) {
    gestureState.handWorldPos.set(0.05, 1.24, 0.58);
    gestureState.grabCurl = 0.92;
  } else if (director.isGraspingPaddleCone) {
    gestureState.handWorldPos.set(
      director.coneWorldPos.x,
      director.coneWorldPos.y - 0.03,
      director.coneWorldPos.z + 0.04
    );
  } else if (gestureState.isReaching || director.heldItem) {
    const reachDepthT = THREE.MathUtils.clamp(
      (gestureState.normY + 0.48) / 0.52,
      0,
      1
    );
    const dynamicZ = director.heldItem
      ? 0.26
      : THREE.MathUtils.lerp(0.48, 0.26, reachDepthT);
    gestureState.handWorldPos.set(
      THREE.MathUtils.clamp(gestureState.normX * 0.54, -0.5, 0.5),
      THREE.MathUtils.clamp(1.22 + gestureState.normY * 0.36, 0.92, 1.72),
      dynamicZ
    );
  } else {
    gestureState.handWorldPos.set(0.22, 1.04, 0.64);
  }

  world.updateTouristHand(
    gestureState.handWorldPos,
    gestureState.grabCurl,
    gestureState.lungeBoost,
    dt
  );

  director.update(dt, elapsed, gestureState);

  const voiceMouthOpen = sound.getVoiceMouthOpen();
  world.updateEnvironmentAnimations(
    elapsed,
    dt,
    0,
    0,
    (bellIntensity, panX, bellIdx) =>
      sound.playBellNote(bellIdx ?? 3, bellIntensity, panX),
    voiceMouthOpen
  );
  world.render();

  const guide = director.getGestureGuide();
  updateHUD(guide);
  renderVisualCometsAndTrails(dt, elapsed, guide);
}

requestAnimationFrame(animate);
