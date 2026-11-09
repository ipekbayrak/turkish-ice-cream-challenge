import {paperReturnHandTarget} from './napkin-return.js';
import * as THREE from 'three';
import { isControlActive, canUseMouseHover, controlPointerType } from './pointer-controls.js';
import { GameWorld } from './world.js';
import { SoundEngine } from './audio.js';
import {
  CAMPAIGN_LEVELS,
  ICE_CREAM_FLAVORS,
  TrickDirector,
} from './tricks.js';
import { SaveManager } from './storage.js';
import { LoreJournal } from './lore-journal.js';
import { OrderFlow } from './order-flow.js';
import { TubOrderView, ORDER_COPY, orderAcknowledgement } from './order-view.js';
import { VendorRelationships } from './vendor-relationships.js';
import { MAX_SCOOPS, VENUES, getVenueForStage, getVenueProgress, getStageOrderOptions } from './venues.js';
import { loadStoryWins } from './lore-progress.js';
import { venueIllustration } from './venue-cards.js';
import { DiscoveryUI } from './discovery-ui.js';
import { TouchReach } from './touch-reach.js';
import { RelativeTouchController } from './relative-touch.js';
import { encounterHudLayout } from './hud-layout.js';
import { CounterInteractions,customerHandEmpty } from './counter-interactions.js';
import {GameAnalytics} from './game-analytics.js';
import { OrderPatience } from './order-patience.js';
import { PointerTipView, drawPointerTip } from './touch-arm-view.js';
import { ConeIntroduction } from './cone-introduction.js';
import { poleGripRenderTarget } from './cone-grip.js';
import { drawFigureEightGuide } from './gesture-guide-view.js';
import { resizeOverlay } from './render-size.js';
import { EncounterCamera } from './encounter-camera.js';

const gameContainer = document.getElementById('game-container');
const gameCanvas = document.getElementById('game-canvas');
const trailCanvas = document.getElementById('trail-canvas');
const trailCtx = trailCanvas.getContext('2d');
// Only the development iframe opts into mouse-as-touch; normal desktop play is unchanged.
const touchPreview = import.meta.env.DEV && new URLSearchParams(location.search).get('touch-preview') === '1';

const startOverlay = document.getElementById('start-overlay');
const startTitle = document.getElementById('start-title');
const playerRankBadge = document.getElementById('player-rank-badge');
const stageSelector = document.getElementById('stage-selector');

const legReach = document.getElementById('leg-reach');
const legPull = document.getElementById('leg-pull');
const legFlick = document.getElementById('leg-flick');
const btnStartGame = document.getElementById('btn-start-game');
const btnAudio = document.getElementById('btn-audio');
const btnFullscreenTop = document.getElementById('btn-fullscreen-top');
const btnLang = document.getElementById('btn-lang');

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
const scoopDotEls = Array.from({length:MAX_SCOOPS},(_,i)=>document.getElementById(`dot-${i+1}`));
const scoopSummary = document.getElementById('hud-scoop-count');


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

// Browser activation must be handled synchronously in the actual input event,
// including clicks on menus and the release event used by mobile Safari.
function unlockGameAudio(event){
  if(!event.isTrusted||!sound.enabled)return;
  if(event.type==='keydown'&&(event.repeat||event.ctrlKey||event.metaKey||event.altKey))return;
  sound.unlockFromGesture?.();
}
for(const event of ['pointerdown','pointerup','touchend','keydown'])document.addEventListener(event,unlockGameAudio,{capture:true,passive:true});

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
    if (!e.target.closest('dialog, .discovery-card')) {
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

const gameAnalytics=new GameAnalytics();
const saveManager = new SaveManager();
saveManager.reconcileCompletedStages(loadStoryWins());
const lore = new LoreJournal(saveManager);
const sound = new SoundEngine();
const world = new GameWorld(gameCanvas, (surface) => {
  if (surface === 'cart') {
    sound.playPaddleClank();
  } else {
    sound.playWhoosh(0.6);
  }
});

let discovery = null;
let discoveryHomeWasVisible=false;
let coneIntro = null;
let orderFlow = null;
const tubOrderView = new TubOrderView(world);
const orderHandTarget = new THREE.Vector3();
let relationships = null;
let orderGreeting = '';
let lastOrderFlavor = null;
let previousOrderVenue = null;
let lastAdvanceUnlocked = false;
let selectedStage = saveManager.data.unlockedStage || 1;
if(import.meta.env.DEV){const previewStage=Number(new URLSearchParams(location.search).get('stage-check'));if(Number.isSafeInteger(previewStage)&&previewStage>0)selectedStage=previewStage;}
let selectedScoopCount = saveManager.data.preferredScoopCount || 3;
let selectedFlavors = (saveManager.data.preferredFlavors || [0, 1, 2, 3]).slice();

const VENDOR_ICONS = ['🧢', '🏮', '🧔‍♂️👓', '👑'];

function refreshOrderHUD() {
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
    director.setOrderConfig(selectedScoopCount, selectedFlavors, selectedStage);
    if (!director.active && !orderFlow?.active) {
      world.updateIceCreamScoops(0, false);
    }
  }
}

function renderVenueSelector() {
  if (!stageSelector) return;
  stageSelector.innerHTML = '';
  const lang=saveManager.lang==='tr'?'tr':'en';
  for (const venue of VENUES) {
    const progress=getVenueProgress(venue,saveManager.data);
    const options=getStageOrderOptions(venue.lastStage);
    const selected=getVenueForStage(selectedStage).id===venue.id;
    const card=document.createElement('button');
    card.type='button';card.className=`venue-card${selected?' selected':''}`;card.disabled=!progress.unlocked;
    card.setAttribute('aria-pressed',String(selected));
    card.style.setProperty('--venue-accent',`#${venue.palette.accent.toString(16).padStart(6,'0')}`);
    card.innerHTML=`<span class="venue-art">${venueIllustration(venue.propTheme)}</span><span class="venue-card-head"><strong>${venue.name[lang]}</strong><span>${progress.unlocked?'':'⌑'}</span></span><small>${venue.subtitle[lang]}</small><span class="venue-card-foot"><span class="venue-stamps" aria-label="${progress.completed}/${progress.total}">${Array.from({length:progress.total},(_,i)=>`<i class="${saveManager.data.completedStages.includes(venue.firstStage+i)?'done':''}"></i>`).join('')}</span><span>${options.min}–${options.max} ${lang==='tr'?'top':'scoops'}</span></span>`;
    card.title=progress.unlocked?`${venue.name[lang]} · ${progress.completed}/${progress.total}`:lang==='tr'?'Önce önceki mekândaki gösterileri tamamla.':'Finish the previous venue first.';
    card.addEventListener('click',()=>{
      selectedStage=progress.cleared&&venue===VENUES.at(-1)?saveManager.data.unlockedStage:Math.min(saveManager.data.unlockedStage,progress.nextStage);
      director.resetRound(selectedStage,false);
      world.setVenue?.(venue);
      coneIntro?.reset();
      selectedScoopCount=getStageOrderOptions(selectedStage).default;
      renderVenueSelector();refreshOrderHUD();closeTopLayer(document.getElementById('dialog-stages'));
    });
    stageSelector.appendChild(card);
  }
  playerRankBadge.textContent=`${saveManager.getPlayerRankTitle()} · ${saveManager.getTotalStars()} ★`;
  const currentVenue=getVenueForStage(selectedStage);
  world.setVenue?.(currentVenue);
  document.getElementById('home-venue-label').textContent=currentVenue.name[lang];
  lore.update(selectedStage);
  discovery?.refresh();
}

function applyLanguageUI() {
  const meta = saveManager.getLangMeta();
  btnLang.textContent = `${meta.flag} ${meta.code.toUpperCase()} ⚙️`;
  startTitle.textContent = `🍦 ${saveManager.t('gameTitle')}`;
  legReach.textContent = saveManager.t('legReach');
  legPull.textContent = saveManager.t('legPull');
  legFlick.textContent = saveManager.t('legFlick');

  btnStartGame.textContent = saveManager.t('playBtn');
  if (btnMenuRound) {
    btnMenuRound.textContent = saveManager.t('menuBtn');
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

  renderVenueSelector();
  refreshOrderHUD();
}

const uiCallbacks = {
  onPrompt() {},
  onTrickStart(event) { relationships?.onTrickStart(event); },
  onReaction(event) { relationships?.onReaction(event); },

  onRoundEnd(data) {
    gameAnalytics.finish(director.currentStage,{won:data.outcomeType==='MASTER_CATCH',outcome:data.outcomeType});
    endPointerInteraction();
    renderVenueSelector();
    resultBadge.textContent = data.badge;
    resultIcon.textContent = data.icon;
    resultTitle.textContent = data.title;
    resultDesc.textContent = data.desc;
    lore.recordResult(director.currentStage, data.outcomeType === 'MASTER_CATCH', director.targetScoopCount);
    const earnedMemory = relationships?.finish(data.outcomeType === 'MASTER_CATCH');
    if (earnedMemory) document.getElementById('result-story').textContent = earnedMemory;
    resultStars.textContent = data.stars;
    resScore.textContent = saveManager.formatNumber(data.score);
    resBest.textContent = saveManager.formatNumber(
      data.bestScore || data.score
    );
    resScoops.textContent = data.scoopsText;

    lastAdvanceUnlocked = data.canAdvance && director.currentStage<Number.MAX_SAFE_INTEGER;
    const continuation = {
      tr:['Gösteriye devam','Yeni mekâna geç'], en:['Continue the show','Next place'], ar:['متابعة العرض','المكان التالي'],
      ru:['Продолжить','Следующее место'], de:['Weiter zur Show','Nächster Ort'], ja:['ショーを続ける','次の場所へ'],
    }[saveManager.lang] || ['Continue the show','Next place'];
    const nextPlace = getVenueForStage(director.currentStage + 1).id !== getVenueForStage(director.currentStage).id;
    btnNextRound.textContent = lastAdvanceUnlocked ? continuation[nextPlace ? 1 : 0] : saveManager.t('retryBtn');
    if (data.outcomeType === 'MASTER_CATCH') {
      const place=getVenueForStage(director.currentStage);
      resultBadge.textContent=`${place.name[saveManager.lang==='tr'?'tr':'en']} · ${director.currentStage>30?(saveManager.lang==='tr'?'Ustalık serisi':'Master streak'):`${director.currentStage-place.firstStage+1}/5`}`;
    }

    if (!dialogResult.open) {
      dialogResult.showModal();
    }
  },
};

const director = new TrickDirector(world, sound, saveManager, uiCallbacks);
relationships = new VendorRelationships({save:saveManager,lore,world,director});
orderFlow = new OrderFlow({
  onSingle(){director.sayLine(saveManager.lang==='tr'?'Sadece bir mi?':'Just one?','hmm',.9);},
  onPhase(snapshot) {
    const words = ORDER_COPY[saveManager.lang] || ORDER_COPY.en;
    if (snapshot.phase === 'order') {
      director.sayLine?.(words.ask,'hmm',1.4);
      tubOrderView.settleCamera();
      // A finger held during the introductory camera move keeps its contact;
      // rebase its visual aim without creating a new gesture or pointer epoch.
      if (pointerPresentationActive()) {
        touchReach.begin(world.camera, viewportWidth, viewportHeight);
        updatePointerAim();
      }
    } else {
      if (snapshot.phase === 'confirm') {
        // Bring the customer's same cone back from the chosen tub before the
        // ordering camera returns and the mold is mounted onto it.
        carryHandRest.set(.04,1.20,.26);
      }
      const text = snapshot.phase === 'greeting' ? words.ask : words.confirm(snapshot.count);
      if (director.sayLine) director.sayLine(text, 'hmm', snapshot.phase === 'greeting' ? 1.6 : 1.2);
      else { director.vendorBubbleText = text; director.vendorBubbleTimer = 1.6; }
    }
    document.body.dataset.orderPhase = snapshot.phase;
    document.querySelector('.hud-bottom').setAttribute('aria-hidden', 'true');
  },
  onChoice(choice) {
    lastOrderFlavor = choice.value;
    tubOrderView.acknowledge(choice.value);
    director.sayLine?.(orderAcknowledgement(choice, saveManager.lang), 'eeeh', 1.3);
    sound.playConePop(0);
    if (saveManager.hapticsEnabled) navigator.vibrate?.(18);
  },
  onComplete(order) {
    tubOrderView.end();
    selectedScoopCount = order.count;
    selectedFlavors = order.flavors;
    while(selectedFlavors.length < MAX_SCOOPS) selectedFlavors.push(selectedFlavors[selectedFlavors.length - 1] ?? 0);
    gestureState.trailPoints.length = 0;
    trailCtx.clearRect(0,0,viewportWidth,viewportHeight);
    document.body.classList.remove('ordering');
    document.body.removeAttribute('data-order-phase');
    document.querySelector('.hud-bottom').setAttribute('aria-hidden', 'false');
    world.cancelVendorReaction?.();
    director.setOrderConfig(selectedScoopCount, selectedFlavors, selectedStage);
    refreshOrderHUD();
    director.resetRound(selectedStage, false, {preserveCustomerCone:true});
    director.startRound({customerCone:true});
    gameAnalytics.startRound(director.currentStage);
    encounterCamera.setPhase('play');
  },
});
discovery = new DiscoveryUI({
  world, save:saveManager, sound, getStage:()=>selectedStage,
  onInspect:detail=>relationships.discoverObject(detail),
  getMemory:(id,venueId)=>relationships.discoveryMemory(id,venueId),
  canOpen:()=>!orderFlow.active && !dialogResult.open && coneIntro?.phase !== 'take' && customerHandEmpty(world,director),
  onEnter(){
    discoveryHomeWasVisible=!startOverlay.classList.contains('hidden');
    dialogSettings.close();
    endPointerInteraction();gestureState.trailPoints.length=0;
    counterInteractions.reset();
    trailCtx.clearRect(0,0,viewportWidth,viewportHeight);
    // The frame loop pauses the encounter. Keep every serving owner, trick
    // timer and introduction phase so inspection can resume the same moment.
    startOverlay.classList.add('hidden');
  },
  onExit(){world.resetExploration();startOverlay.classList.toggle('hidden',!discoveryHomeWasVisible);},
});
relationships.setDiscoveredObjects(discovery.progress.ids);
applyLanguageUI();

// Settings & Language Modal Controls
btnLang.addEventListener('click', () => {
  endPointerInteraction();
  applyLanguageUI();
  const atCounter = !director.active && !orderFlow.active && coneIntro?.ready;
  document.getElementById('btn-stages-panel').disabled = !atCounter;
  document.getElementById('btn-discover').disabled = !atCounter;
  btnStartGame.hidden = !atCounter;
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
let trailSize=null;

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
  trailSize=resizeOverlay(trailCanvas,trailCtx,viewportWidth,viewportHeight,dpr,trailSize);
}
window.addEventListener('resize', resizeTrailCanvas);
window.addEventListener('orientationchange', () =>
  setTimeout(resizeTrailCanvas, 80)
);
window.visualViewport?.addEventListener('resize', resizeTrailCanvas);
resizeTrailCanvas();

const gestureState = {
  isPointerDown: false,
  isMouseHover: false,
  pointerType: null,
  aimNormX: null,
  aimNormY: null,
  pointerX: 0,
  pointerY: 0,
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
  // Raw finger intention stays independent of the visually gripped/snapped hand.
  intentWorldPos: new THREE.Vector3(0.22, 1.08, 0.62),
  pointerEpoch: 0,
  cancelEpoch: 0,
  trailPoints: [],
};

const touchReach = new TouchReach(world);
const touchArmView = new PointerTipView(world);
const counterInteractions=new CounterInteractions(world,sound,{
  canInspect:id=>discovery.progress.canInspect(id,getVenueForStage(selectedStage).id,saveManager.data.unlockedStage),
  onInspect(id){
    const contact=gestureState.isPointerDown?{pointerId:activePointerId,clientX:gestureState.pointerX,clientY:gestureState.pointerY,button:0,isPrimary:true,currentTarget:gameContainer,timeStamp:performance.now()}:null;
    if(discovery.openItem(id)&&contact){
      discovery.pointerDown(contact);
      // Releasing the dwell that opened the object is not a second tap on the
      // now-moving camera. Keep inspection open, while allowing drag-to-rotate.
      if(discovery.pointer)discovery.pointer.moved=true;
    }
  },
  onPoke(part){
    const tr=saveManager.lang==='tr';
    director.sayLine(tr?(part==='eye'?'Gözüm orada, dondurma burada!':part==='nose'?'Burnumdan dondurma çıkmaz!':'Hop! Dondurmaya bakalım.'):(part==='eye'?'Easy on the eyes!':part==='nose'?'No ice cream in my nose!':'The ice cream is over here!'),'hmm',1.5);
  }
});
const orderPatience=new OrderPatience(world,sound,()=>{
  director.sayLine(saveManager.lang==='tr'?'Hadi bakalım, hangi lezzetten?':'Come on, which flavor?','afk_table',1.6);
});
const relativeTouch = new RelativeTouchController();
const relativeSeed = new THREE.Vector3();
const relativePresented = () => relativeTouch.initialized && gestureState.pointerType !== 'mouse';
const pointerHandActive = () => isControlActive(gestureState) && Boolean(touchReach.camera);
const pointerPresentationActive = () => (isControlActive(gestureState) || relativePresented()) && Boolean(touchReach.camera);

function updatePointerAim(begin = false) {
  if (begin || !touchReach.camera) touchReach.begin(world.camera, viewportWidth, viewportHeight);
  const reach = THREE.MathUtils.clamp((gestureState.normY + .48) / .52, 0, 1);
  const depth = gestureState.pointerType === 'mouse' && !orderFlow.active && !coneIntro?.active && !director.heldItem
    ? THREE.MathUtils.lerp(.48, .26, reach) : .26;
  if (relativePresented()) touchReach.updateAim(relativeTouch.x,relativeTouch.y,depth);
  else touchReach.update(gestureState.pointerX, gestureState.pointerY, depth,gestureState.pointerType);
  gestureState.aimNormX = touchReach.aimX; gestureState.aimNormY = touchReach.aimY;
}

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

function updateNormalizedPointer(clientX, clientY, dt = 0.016, begin = false) {
  let aimX=clientX,aimY=clientY;
  if (gestureState.pointerType !== 'mouse') {
    relativeTouch.configure(viewportWidth,viewportHeight);
    if (begin) {
      // Read the displayed fingertip only on a real new contact. Camera, pose
      // and return animation must never generate continuous gesture evidence.
      world.playerAimAnchor.getWorldPosition(relativeSeed).project(world.camera);
      relativeTouch.press(clientX,clientY,{x:(relativeSeed.x+1)*viewportWidth*.5,y:(1-relativeSeed.y)*viewportHeight*.5});
    } else relativeTouch.move(clientX,clientY);
    aimX=relativeTouch.x;aimY=relativeTouch.y;
  } else relativeTouch.reset();
  const newX = (aimX / viewportWidth) * 2 - 1;
  const newY = 1 - (aimY / viewportHeight) * 2;

  const dx = begin ? 0 : newX - gestureState.normX;
  const dy = begin ? 0 : newY - gestureState.normY;
  gestureState.vx = dx / Math.max(0.008, dt);
  gestureState.vy = dy / Math.max(0.008, dt);
  gestureState.speed = Math.hypot(dx, dy) / Math.max(0.008, dt);

  gestureState.normX = newX;
  gestureState.normY = newY;
  gestureState.pointerX = clientX; gestureState.pointerY = clientY;
  updatePointerAim(begin);
  gameContainer.classList.add('hand-pointer');
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
    x: (gestureState.aimNormX+1)*viewportWidth*.5,
    y: (1-gestureState.aimNormY)*viewportHeight*.5,
    life: 1.0,
    theme: isTrapActive ? 'red' : 'green',
  });
  if (gestureState.trailPoints.length > 26) {
    gestureState.trailPoints.shift();
  }
}

let lastMoveTime = performance.now();
let activePointerId = null;
let touchStartedAt=0,lastTouchTapUp=-Infinity;

gameContainer.addEventListener('pointerdown', (event) => {
  if (discovery?.active) {
    discovery.pointerDown(event);
    return;
  }
  if (
    event.button !== 0 ||
    activePointerId !== null ||
    (!startOverlay.classList.contains('hidden') && !coneIntro?.active) ||
    event.target.closest('button, dialog, a, input, .start-sheet-card')
  ) {
    return;
  }

  sound.init();

  const now = performance.now();
  gestureState.pointerType = controlPointerType(event, touchPreview);
  updateNormalizedPointer(event.clientX, event.clientY, 0.016, true);

  try {
    gameContainer.setPointerCapture(event.pointerId);
  } catch {
    // Ignore
  }
  gameContainer.classList.add('dragging');

  const isDoubleTap = now - (gestureState.pointerType==='mouse'?gestureState.lastTapTime:lastTouchTapUp) < 280;
  touchStartedAt=now;
  lastTouchTapUp=-Infinity;
  gestureState.lastTapTime = now;

  activePointerId = event.pointerId;
  gestureState.pointerEpoch++;
  gestureState.isPointerDown = true;
  gestureState.isMouseHover = gestureState.pointerType === 'mouse';
  gestureState.isReaching = true;
  lastMoveTime = now;

  const tapWorld = new THREE.Vector3(
    THREE.MathUtils.clamp(gestureState.normX * 0.56, -0.52, 0.52),
    THREE.MathUtils.clamp(1.22 + gestureState.normY * 0.38, 0.92, 1.75),
    0.24
  );

  tapWorld.copy(touchReach.target);

  if (isDoubleTap && director.active && !orderFlow.active && !coneIntro?.active) {
    gestureState.lungeBoost = 1.0;
    gestureState.grabCurl = 1.0;
    director.attemptSnatch(tapWorld);
  }
});

gameContainer.addEventListener('pointermove', (event) => {
  if (discovery?.active) { discovery.pointerMove(event); return; }
  const blocked = Boolean(event.target.closest('button, dialog, a, input, .start-sheet-card')) ||
    Boolean(document.querySelector('dialog[open]'));
  const hovering = canUseMouseHover(event, {
    active: coneIntro?.active || orderFlow?.active || (director.active && !director.roundEnded),
    blocked,
    capturedPointer: activePointerId,
    touchPreview,
  });
  if (!hovering && (!gestureState.isPointerDown || event.pointerId !== activePointerId)) {
    if (gestureState.isMouseHover && controlPointerType(event, touchPreview) === 'mouse') endPointerInteraction();
    return;
  }
  const now = performance.now();
  const begin = !isControlActive(gestureState);
  const dt = Math.max(0.004, (now - lastMoveTime) / 1000);
  lastMoveTime = now;
  gestureState.isMouseHover = hovering;
  gestureState.pointerType = controlPointerType(event, touchPreview);
  updateNormalizedPointer(event.clientX, event.clientY, dt, begin);
  // Restore the original desktop reach: move up to extend, down to withdraw.
  gestureState.isReaching = gestureState.isPointerDown || gestureState.normY > -0.68;
});
gameContainer.addEventListener('pointerleave', (event) => {
  if (controlPointerType(event, touchPreview) === 'mouse' && activePointerId === null) endPointerInteraction();
});

function endPointerInteraction(event = null) {
  if (event && activePointerId !== event.pointerId) return;
  const pointerType = gestureState.pointerType;
  const cancelled = !event || event.type !== 'pointerup';
  const wasDown = isControlActive(gestureState);
  if (world.conePivot.parent === world.heldSocket || director.heldItem) carryHandRest.copy(gestureState.handWorldPos);
  activePointerId = null;
  gameContainer.classList.remove('dragging');
  gameContainer.classList.remove('hand-pointer');
  gestureState.isPointerDown = false;
  gestureState.isMouseHover = false;
  gestureState.isReaching = false;
  gestureState.isMoving = false;
  gestureState.vx = 0;
  gestureState.vy = 0;
  gestureState.speed = 0;
  gestureState.aimNormX = null; gestureState.aimNormY = null;
  gestureState.trailPoints.length = 0;
  trailCtx.clearRect(0, 0, viewportWidth, viewportHeight);
  const retainTouch = !cancelled && pointerType !== 'mouse' && relativeTouch.initialized;
  if (retainTouch && relativeTouch.travel<8 && performance.now()-touchStartedAt<220) lastTouchTapUp=performance.now();
  else lastTouchTapUp=-Infinity;
  if (retainTouch) relativeTouch.release();
  else { relativeTouch.reset(); touchReach.end(); }
  gestureState.pointerType = null;
  touchArmView.setActive(false);
  if (wasDown && cancelled) gestureState.cancelEpoch++;
  if (!cancelled && pointerType === 'mouse' && (coneIntro?.active || orderFlow?.active || (director.active && !director.roundEnded)) &&
      event.clientX >= 0 && event.clientX <= viewportWidth && event.clientY >= 0 && event.clientY <= viewportHeight &&
      !event.target.closest('button, dialog, a, input') && !document.querySelector('dialog[open]')) {
    gestureState.isMouseHover = true;
    gestureState.pointerType = 'mouse';
    gestureState.isReaching = gestureState.normY > -0.68;
    updatePointerAim(true);
    gameContainer.classList.add('hand-pointer');
  }
}

gameContainer.addEventListener('pointerup', event => discovery?.active ? discovery.pointerUp(event) : endPointerInteraction(event));
gameContainer.addEventListener('pointercancel', event => { discovery?.pointerCancel(event);endPointerInteraction(event); });
gameContainer.addEventListener('lostpointercapture', event => { discovery?.pointerCancel(event);endPointerInteraction(event); });
window.addEventListener('blur', () => {discovery?.pointerCancel();endPointerInteraction();});
const cancelTouchOnResize = () => {
  if (!pointerPresentationActive()) return;
  endPointerInteraction(); gestureState.trailPoints.length = 0;
};
window.addEventListener('resize', cancelTouchOnResize);
window.addEventListener('orientationchange', cancelTouchOnResize);
window.visualViewport?.addEventListener('resize', cancelTouchOnResize);
document.addEventListener('visibilitychange', () => {
  sound.setBackgroundPaused(document.hidden);
  if (document.hidden) {discovery?.pointerCancel();endPointerInteraction();}
});

function beginOrderFlow() {
  discovery?.exit(true);
  world.resetExploration?.();
  gestureState.trailPoints.length = 0;
  trailCtx.clearRect(0,0,viewportWidth,viewportHeight);
  sound.init();
  sound.stopMusic();
  requestScreenWakeLock();
  document.body.classList.add('ios-immersive', 'ordering');
  // Do not scroll/hide browser chrome during a held pickup: a viewport resize
  // can cancel the same pointer just as the flavor selection becomes active.
  startOverlay.classList.add('hidden');
  director.heldItem = 'CUSTOMER_CONE';
  sound.beginRound?.();
  world.updateIceCreamScoops(0, false);
  lastOrderFlavor = null;
  orderGreeting = relationships.begin(selectedStage, director.levelIndex);
  const orderOptions=getStageOrderOptions(selectedStage);
  if(previousOrderVenue!==orderOptions.venueId)selectedScoopCount=orderOptions.default;
  previousOrderVenue=orderOptions.venueId;
  selectedScoopCount=Math.max(orderOptions.min,Math.min(orderOptions.max,selectedScoopCount));
  tubOrderView.begin();
  orderFlow.start({flavors:selectedFlavors,greetingSeconds:0,maxScoops:orderOptions.max,initialPointer:coneIntro?.orderIntentAnchor});
}

function prepareCounter() {
  endPointerInteraction();orderFlow.cancel();tubOrderView.end();
  counterInteractions.reset();orderPatience.reset();
  document.body.classList.remove('ordering');document.body.removeAttribute('data-order-phase');
  world.resetTransientPresentation?.();director.resetRound(selectedStage,false);
  world.updateIceCreamScoops(0,false);startOverlay.classList.remove('hidden');
  coneIntro.reset();
  encounterCamera.setPhase('offer',true);
}
function launchStageRound() {
  dialogSettings.close();
  prepareCounter();
}
btnStartGame.addEventListener('click', launchStageRound);

if (btnMenuRound) {
  btnMenuRound.addEventListener('click', () => {
    closeTopLayer(dialogResult);
    startOverlay.classList.remove('hidden');
    orderFlow.cancel();
    tubOrderView.end();
    relationships.active = false;
    document.body.classList.remove('ordering');
    document.body.removeAttribute('data-order-phase');
    world.cancelVendorReaction?.();
    director.resetRound(selectedStage, false);
    renderVenueSelector();
    refreshOrderHUD();
    prepareCounter();
  });
}

btnNextRound.addEventListener('click', () => {
  closeTopLayer(dialogResult);
  requestScreenWakeLock();
  if (lastAdvanceUnlocked && director.currentStage < Number.MAX_SAFE_INTEGER) {
    selectedStage = director.currentStage + 1;
  } else {
    selectedStage = director.currentStage;
  }
  renderVenueSelector();
  prepareCounter();
});

btnRetryRound.addEventListener('click', () => {
  closeTopLayer(dialogResult);
  requestScreenWakeLock();
  selectedStage = director.currentStage;
  prepareCounter();
});

btnAudio.addEventListener('click', () => {
  const on = sound.toggle();
  btnAudio.textContent = on ? '🔊' : '🔇';
  applyLanguageUI();
});

const hudCache = {
  levelText: '',
  scoreText: '',
  hearts: -1,
  scoopCount: -1,
  scoopText: '',
  crownActive: false,
  cardClass: '',
  iconText: '',
  badgeText: '',
  trickTitle: '',
  routineWidth: '',
  stageWidth: '',
};
const heartSpanEls = hudHearts
  ? Array.from(hudHearts.querySelectorAll('.h-icon'))
  : [];
const hudBellPoint=new THREE.Vector3();
const hudBottom=document.querySelector('.hud-bottom');
const hudTop=document.querySelector('.hud-top');
let infoTopInset=parseFloat(getComputedStyle(hudTop).top)||8;
window.addEventListener('resize',()=>{infoTopInset=parseFloat(getComputedStyle(hudTop).top)||8;});
function projectBellRest(down=0){
  const pivot=world.bells[3].pivot;
  // Include the cart's placement, but not ringing oscillation: labels must not
  // bob with the bell. The central bell has the longest tassel.
  hudBellPoint.copy(pivot.position);hudBellPoint.y-=down*pivot.scale.y;
  pivot.parent.localToWorld(hudBellPoint);return hudBellPoint.project(world.camera);
}

function updateHUD(guide) {
  // Project the canopy's real position, leaving the whole bell and face clear.
  projectBellRest();
  const {cueTop}=encounterHudLayout(viewportWidth,viewportHeight,infoTopInset,(1-hudBellPoint.y)*viewportHeight*.5);
  if(hudCache.cueTop!==cueTop){hudCache.cueTop=cueTop;hudBottom.style.top=`${cueTop}px`;}
  tubOrderView.headerInset=cueTop;
  const speaking=Boolean(guide?.vendorBubble?.text)&&!orderFlow.active;
  if(hudCache.speaking!==speaking){hudCache.speaking=speaking;document.body.classList.toggle('vendor-speaking',speaking);}
  const ustaName = saveManager.getUstaName(director.levelIndex);
  const scoopText=orderFlow?.active?`${orderFlow.count} ${saveManager.lang==='tr'?'top':'scoops'}`:`${director.scoopCount}/${director.targetScoopCount}`;
  if(scoopSummary&&hudCache.scoopText!==scoopText){hudCache.scoopText=scoopText;scoopSummary.textContent=scoopText;}
  const venue=getVenueForStage(director.currentStage);
  const levelText = `${venue.name[saveManager.lang==='tr'?'tr':'en']} · ${ustaName}`;
  if (hudCache.levelText !== levelText) {
    hudCache.levelText = levelText;
    hudLevel.textContent = levelText;
  }

  const scoreText = saveManager.formatNumber(director.score);
  if (hudCache.scoreText !== scoreText) {
    hudCache.scoreText = scoreText;
    hudScore.textContent = scoreText;
  }

  if (hudCache.hearts !== director.hearts) {
    hudCache.hearts = director.hearts;
    heartSpanEls.forEach((hEl, idx) => {
      hEl.classList.toggle('lost', idx >= director.hearts);
    });
  }

  if (hudCache.scoopCount !== director.scoopCount) {
    hudCache.scoopCount = director.scoopCount;
    scoopDotEls.forEach((dotEl, idx) => {
      if (!dotEl) return;
      dotEl.classList.toggle('active', director.scoopCount >= idx + 1);
    });
  }

  const crownActive =
    director.scoopCount >= director.targetScoopCount &&
    director.currentMechanic === 'FINAL_PISTACHIO_CATCH';
  if (dotCrown && hudCache.crownActive !== crownActive) {
    hudCache.crownActive = crownActive;
    dotCrown.classList.toggle('active', crownActive);
  }

  if (guide) {
    const nextCardClass = `gesture-hud-card theme-${guide.theme}`;
    if (hudCache.cardClass !== nextCardClass) {
      hudCache.cardClass = nextCardClass;
      hudCard.className = nextCardClass;
    }

    const nextIcon = guide.icon || '🤚⬆️';
    if (hudGestureIcon && hudCache.iconText !== nextIcon) {
      hudCache.iconText = nextIcon;
      hudGestureIcon.textContent = nextIcon;
    }

    if (hudCache.badgeText !== guide.badgeText) {
      hudCache.badgeText = guide.badgeText;
      hudActionBadge.textContent = guide.badgeText;
    }

    const nextTrickTitle = guide.trickTitle || '';
    if (hudTrickTitle && hudCache.trickTitle !== nextTrickTitle) {
      hudCache.trickTitle = nextTrickTitle;
      hudTrickTitle.textContent = nextTrickTitle;
    }

    const nextRoutineWidth = `${Math.round(
      Math.max(12, guide.routineProgress * 100)
    )}%`;
    if (hudCache.routineWidth !== nextRoutineWidth) {
      hudCache.routineWidth = nextRoutineWidth;
      hudRoutineFill.style.width = nextRoutineWidth;
    }

    const nextStageWidth = `${Math.round(
      THREE.MathUtils.clamp(guide.stageProgress * 100, 8, 100)
    )}%`;
    if (hudCache.stageWidth !== nextStageWidth) {
      hudCache.stageWidth = nextStageWidth;
      hudStageFill.style.width = nextStageWidth;
    }
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
  if (!bubble || !bubble.text || orderFlow.active) return;
  ctx.save();
  ctx.globalAlpha = bubble.alpha;
  const landscape=viewportWidth>viewportHeight;
  const maxWidth = landscape?Math.min(236,viewportWidth*.30-24):Math.min(330, viewportWidth - 48);
  projectBellRest();
  const layout=encounterHudLayout(viewportWidth,viewportHeight,infoTopInset,(1-hudBellPoint.y)*viewportHeight*.5);
  const availableHeight=layout.captionMaxHeight;
  let lines=[],font=12,lineHeight=16;
  for(;font>=10;font--){
    ctx.font=`600 ${font}px system-ui, -apple-system, sans-serif`;lines=[];let line='';lineHeight=font+4;
    for(const word of bubble.text.split(' ')){
      const next=line?`${line} ${word}`:word;
      if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;
    }
    if(line)lines.push(line);
    if(lines.length*lineHeight+14<=availableHeight)break;
  }
  const bw = Math.min(maxWidth, Math.max(...lines.map(text => ctx.measureText(text).width))) + 24;
  const bh = lineHeight * lines.length + 14;
  // Speech shares the information area instead of following the vendor's head
  // through the bell row. In landscape the whole area uses the left margin.
  const bx = 12;
  const by = layout.cueTop;
  ctx.fillStyle = 'rgba(255, 248, 235, 0.96)';
  ctx.strokeStyle = '#dbb66b'; ctx.lineWidth = 1;
  ctx.beginPath();ctx.roundRect(bx, by, bw, bh, 12);ctx.fill();ctx.stroke();
  ctx.fillStyle = '#342116';ctx.textAlign = 'center';ctx.textBaseline = 'middle';
  lines.forEach((text,i) => ctx.fillText(text,bx+bw*.5,by+7+lineHeight*.5+i*lineHeight));
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

function drawTouchContact() {
  counterInteractions.draw(trailCtx);
}

function renderVisualCometsAndTrails(dt, elapsed, guide) {
  trailCtx.clearRect(0, 0, viewportWidth, viewportHeight);
  if (orderFlow?.active) {
    tubOrderView.draw(trailCtx,orderFlow.snapshot,viewportWidth,viewportHeight,saveManager.lang);
    drawVendorSpeechBubble(trailCtx, guide?.vendorBubble);
    drawTouchContact();
    return;
  }

  tubOrderView.drawLabels(trailCtx,viewportWidth,viewportHeight,saveManager.lang);
  if (guide?.quiet) {
    gestureState.trailPoints.length = 0;
    drawVendorSpeechBubble(trailCtx, guide.vendorBubble);
    drawTouchContact();
    return;
  }

  if (guide && guide.active) {
    drawFloatingPopupsAndVignette(trailCtx, guide);
    if (guide.figureEight) drawFigureEightGuide(trailCtx, guide.figureEight);
    else guide.comets.forEach((c) => {
      drawFadingToBrightComet(trailCtx, c.points, c.color, elapsed, true);
    });
    drawTargetRings(trailCtx, guide.rings, elapsed);
    drawVendorSpeechBubble(trailCtx, guide.vendorBubble);
  } else drawVendorSpeechBubble(trailCtx,guide?.vendorBubble);

  const pts = gestureState.trailPoints;
  for (let i = pts.length - 1; i >= 0; i--) {
    pts[i].life -= dt * 4.2;
    if (pts[i].life <= 0) {
      pts.splice(i, 1);
    }
  }

  if (pts.length >= 2) {
    const activeTheme = pts[pts.length - 1].theme || 'green';
    trailCtx.save();
    drawFadingToBrightComet(trailCtx, pts, activeTheme, elapsed, false);
    trailCtx.restore();
  }
  drawTouchContact();
}

const targetHandWorldPos = new THREE.Vector3(0.26, 1.00, 0.42);
const carryHandRest = new THREE.Vector3(.04,1.20,.26);
const renderedGripTarget = new THREE.Vector3();
const encounterCamera=new EncounterCamera(world,()=>{
  if(pointerPresentationActive()){touchReach.begin(world.camera,viewportWidth,viewportHeight);updatePointerAim();}
});
world.encounterCamera=encounterCamera;
coneIntro = new ConeIntroduction(world, {
  onTake(){ gameAnalytics.begin(selectedStage);sound.init(); sound.playWaferSlide?.(0); requestScreenWakeLock(); },
  onTransfer(){encounterCamera.setPhase('order');},
  onComplete(){
    carryHandRest.copy(world.touristHand.position);
    director.heldItem = 'CUSTOMER_CONE';
    beginOrderFlow();
  },
});
prepareCounter();
let prevTime = performance.now();
let performanceProbe=null;
if(import.meta.env.DEV && new URLSearchParams(location.search).get('perf')==='1') {
  import('../tests/performance-probe.js').then(({attachPerformanceProbe})=>{performanceProbe=attachPerformanceProbe({world,director});});
}
if(import.meta.env.DEV && new URLSearchParams(location.search).get('flow-check')==='1') {
 const probePoint=new THREE.Vector3();
 const screenPoint=node=>{node.getWorldPosition(probePoint).project(world.camera);return[(probePoint.x+1)*viewportWidth*.5,(1-probePoint.y)*viewportHeight*.5];};
 const projectPoint=p=>{probePoint.copy(p).project(world.camera);return[(probePoint.x+1)*viewportWidth*.5,(1-probePoint.y)*viewportHeight*.5];};
 let detailKey='',detailTargets=[];
 const visibleDetails=()=>{
  const key=`${viewportWidth}:${viewportHeight}:${world.camera.position.z.toFixed(2)}:${selectedStage}`;
  if(key!==detailKey&&!discovery.active){detailKey=key;detailTargets=[];
   for(const record of world.culturalScene.records.values()){
    if(record.item.venueId!==world.culturalScene.venueId)continue;
    const p=record.root.localToWorld(record.center.clone()),[x,y]=projectPoint(p);
    if(x<0||x>viewportWidth||y<0||y>viewportHeight)continue;
    if(world.culturalScene.pickFromCounter(x/viewportWidth,y/viewportHeight)?.id===record.item.id)detailTargets.push({id:record.item.id,x,y});
   }
  }return detailTargets;
 };
 import('../tests/performance-probe.js').then(({attachEncounterProbe})=>{performanceProbe=attachEncounterProbe(()=>({
  progression:{stage:director.currentStage,tempo:director.config.tempoFactor,speed:director.config.speedMult,time:director.rhythmClock?.time,beat:director.rhythmClock?.phase,musicTimer:sound.musicTimer,sharedClock:sound.rhythmClock===director.rhythmClock},
  intro:coneIntro.phase,order:orderFlow.active?orderFlow.phase:'inactive',playing:director.active,down:gestureState.isPointerDown,
  epoch:gestureState.pointerEpoch,cancel:gestureState.cancelEpoch,aim:[touchArmView.x,touchArmView.y],cameraZ:world.camera.position.z,
  tip:screenPoint(world.playerAimAnchor),cone:screenPoint(world.mainConeMesh),raw:[gestureState.pointerX,gestureState.pointerY],
  cursor:relativeTouch.initialized?{x:relativeTouch.x,y:relativeTouch.y,homeX:relativeTouch.homeX,homeY:relativeTouch.homeY,returning:relativeTouch.returning,atHome:relativeTouch.atHome}:null,
  tubs:world.tubPositions.map((_,i)=>{const p=tubOrderView.projectedTub(i,viewportWidth,viewportHeight);return[p.x,p.y];}),
  bells:world.bells.map(b=>projectPoint(world.getBellBodyCenter(b.index))),face:projectPoint(world.vendorHead.localToWorld(new THREE.Vector3(0,.002,.194))),details:visibleDetails(),
  interactions:{bellHits:counterInteractions.bellHits,faceTouches:counterInteractions.faceTouches,focus:counterInteractions.focus?.id,progress:counterInteractions.intent.progress,empty:customerHandEmpty(world,director)},
  discovery:{active:discovery.active,selected:discovery.selected},patience:{active:orderPatience.active,hits:orderPatience.hits,cycle:orderPatience.cycle},
  audio:{enabled:sound.enabled,state:sound.ctx?.state||'not-created',unlocked:sound._iosUnlocked,music:sound.musicPlaying},
  arm:world.playerArmState?{shoulder:world.camera.worldToLocal(world.playerArmState.shoulder.clone()).toArray(),upper:world.playerArmState.shoulder.distanceTo(world.playerArmState.elbow),forearm:world.playerArmState.elbow.distanceTo(world.playerArmState.wrist),collar:Boolean(world.playerArmState.collar?.visible)}:null,
  orderSelection:orderFlow.active?orderFlow.snapshot:{phase:'idle',count:0,flavors:[]},handDepth:world.handSpring.target.z,
  scoops:director.targetScoopCount,owner:world.conePivot.parent===world.heldSocket?'player':world.conePivot.parent===world.lArmRig.handGroup?'vendor':'pole'
 }));});
}

function animate(now) {
  requestAnimationFrame(animate);
  performanceProbe?.beginFrame(now);

  const dt = Math.max(0, Math.min(0.05, (now - prevTime) / 1000));
  prevTime = now;
  const elapsed = now / 1000;
  gestureState.frameTime=elapsed;
  gameAnalytics.tick(dt,{visible:!document.hidden&&!discovery?.active&&!document.querySelector('dialog[open]'),playing:director.active&&!director.roundEnded});
  if (discovery?.active) {
    world.updateEnvironmentAnimations(elapsed,dt,0,0,null,0);
    world.render();trailCtx.clearRect(0,0,viewportWidth,viewportHeight);
    discovery.update();performanceProbe?.endFrame();return;
  }

  if (pointerPresentationActive() && document.querySelector('dialog[open]')) endPointerInteraction();
  relativeTouch.tick(dt);
  // Released fingers keep their last cursor briefly; the return is visual only.
  if (relativePresented() && !isControlActive(gestureState)) updatePointerAim();
  counterInteractions.update(dt,{
    melodyEnabled:coneIntro?.ready&&!document.hidden&&!document.querySelector('dialog[open]'),
    active:isControlActive(gestureState)&&!orderFlow.active&&coneIntro?.phase!=='take'&&!director.roundEnded&&!document.hidden&&!document.querySelector('dialog[open]'),
    empty:customerHandEmpty(world,director),x:((gestureState.aimNormX??gestureState.normX)+1)*viewportWidth*.5,y:(1-(gestureState.aimNormY??gestureState.normY))*viewportHeight*.5,
    epoch:gestureState.pointerEpoch,width:viewportWidth,height:viewportHeight
  });
  if(discovery.active){world.render();return;}
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
  const velocityDecay = Math.exp(-dt * 18);
  gestureState.vx *= velocityDecay;
  gestureState.vy *= velocityDecay;
  gestureState.speed *= velocityDecay;
  gestureState.isMoving = isControlActive(gestureState) && gestureState.speed > 0.05;

  // Judge user motion before the visual hand is attracted to a grabbed cone.
  // The wrist-anchored aim is shared by mouse and touch; raw motion is separate.
  const intentReach = THREE.MathUtils.clamp((gestureState.normY + 0.48) / 0.52, 0, 1);
  if (pointerHandActive()) {
    gestureState.intentWorldPos.copy(touchReach.target);
  } else if (isControlActive(gestureState)) {
    gestureState.intentWorldPos.set(
      THREE.MathUtils.clamp(gestureState.normX * 0.54, -0.5, 0.5),
      THREE.MathUtils.clamp(1.22 + gestureState.normY * 0.36, 0.92, 1.72),
      THREE.MathUtils.lerp(0.48, 0.26, intentReach)
    );
  } else {
    gestureState.intentWorldPos.set(0.22, 1.04, 0.64);
  }

  const introTaking = coneIntro?.phase === 'take';
  const directTouchHand = (pointerPresentationActive() || introTaking) && !director.roundEnded && !director.isGraspingPaddleCone;
  if (introTaking) {
    coneIntro.handTarget(targetHandWorldPos,gestureState);
  } else if (directTouchHand) {
    targetHandWorldPos.copy(touchReach.target);
  } else if ((orderFlow.active || coneIntro?.active) && isControlActive(gestureState)) {
    const ray = new THREE.Vector3(gestureState.normX,gestureState.normY,.5).unproject(world.camera).sub(world.camera.position).normalize();
    const distance = (.30-world.camera.position.z)/ray.z;
    targetHandWorldPos.copy(world.camera.position).addScaledVector(ray,distance).y -= .10;
  } else if (director.roundEnded) {
    targetHandWorldPos.set(0.05, 1.24, 0.58);
    gestureState.grabCurl = 0.92;
  } else if (!isControlActive(gestureState) && (world.conePivot.parent === world.heldSocket || director.heldItem)) {
    targetHandWorldPos.copy(carryHandRest);
  } else if (director.isGraspingPaddleCone) {
    targetHandWorldPos.set(
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
    targetHandWorldPos.set(
      THREE.MathUtils.clamp(gestureState.normX * 0.54, -0.5, 0.5),
      THREE.MathUtils.clamp(1.22 + gestureState.normY * 0.36, 0.92, 1.72),
      dynamicZ
    );
  } else {
    targetHandWorldPos.set(0.26, 1.00, 0.42);
  }

  if (directTouchHand) gestureState.handWorldPos.copy(targetHandWorldPos);
  else gestureState.handWorldPos.lerp(
    targetHandWorldPos,
    Math.min(1, dt * 18)
  );

  world.setPlayerConeGrip(introTaking || director.isGraspingPaddleCone);
  const renderedHandTarget = director.isGraspingPaddleCone && world.conePivot.parent === world.paddleGroup
    ? poleGripRenderTarget(world, gestureState.handWorldPos, director.coneWorldPos, renderedGripTarget)
    : gestureState.handWorldPos;
  // Ordering uses the same hand target as play; acknowledgement never pulls
  // the hand off its joystick cursor or changes its reach depth.
  paperReturnHandTarget(director,renderedHandTarget,orderHandTarget);
  if(counterInteractions.reach>0&&customerHandEmpty(world,director))orderHandTarget.z-=counterInteractions.reach;
  world.playerPointerActive=isControlActive(gestureState);
  world.playerPointerResting=relativePresented() && relativeTouch.atHome && !isControlActive(gestureState);
  world.updateTouristHand(
    orderHandTarget,
    gestureState.grabCurl,
    gestureState.lungeBoost,
    dt,
    directTouchHand,
    elapsed
  );

  if (coneIntro.active) {
    if(!document.hidden&&!document.querySelector('dialog[open]'))director.tickSpeech(dt);
    coneIntro.update(dt,elapsed,gestureState,document.hidden || Boolean(document.querySelector('dialog[open]')));
  } else if (orderFlow.active) {
    if (!document.hidden && !document.querySelector('dialog[open]')) director.tickSpeech(dt);
  } else if(!document.hidden)director.update(dt, elapsed, gestureState);
  relationships.update(dt);
  if (orderFlow.active && !document.hidden && !document.querySelector('dialog[open]')) {
    const orderInputActive = isControlActive(gestureState);
    const orderX = ((gestureState.aimNormX ?? gestureState.normX) + 1) * .5;
    const orderY = (1 - (gestureState.aimNormY ?? gestureState.normY)) * .5;
    orderFlow.update(dt, {
      active:orderInputActive,
      flavor:orderInputActive?tubOrderView.pickCone(orderX,orderY):null,
      epoch:gestureState.pointerEpoch,
      pointerX:gestureState.pointerX,
      pointerY:gestureState.pointerY,
    });
    if (orderFlow.active) {
      const nudging=orderPatience.update(dt,elapsed,orderFlow.snapshot);
      tubOrderView.attentionText=nudging?(saveManager.lang==='tr'?'Bir lezzet seç':'Choose a flavor'):null;
      if(!nudging)world.updateOrderPresentation?.({...orderFlow.snapshot,phase:orderFlow.phase==='order'?'flavor':orderFlow.phase,flavorIndex:orderFlow.hover>=0?orderFlow.hover:lastOrderFlavor,recognized:relationships.recognized},dt,elapsed);
      tubOrderView.update(orderFlow.snapshot,dt);
    }
  }

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
  encounterCamera.update(dt);
  touchArmView.update(pointerHandActive(), gestureState.pointerX, gestureState.pointerY, viewportWidth, viewportHeight,gestureState.pointerType,!introTaking&&!director.isGraspingPaddleCone&&!director.roundEnded&&!director.paperReturnPose,relativePresented()?relativeTouch:null);
  world.render();

  const guide = director.getGestureGuide();
  updateHUD(guide);
  renderVisualCometsAndTrails(dt, elapsed, guide);
  performanceProbe?.endFrame();
}

requestAnimationFrame(animate);
