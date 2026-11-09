import { isResearchedService } from './researched-service.js';
import { Vector3, MathUtils } from 'three';

/**
 * Choreographed service shows composed from the existing, playable TrickDirector
 * actions. These are GAME names/sequences, not 36 separately documented customs.
 * The base actions retain their original physics, input windows and ownership.
 */
export const ROUTINE_SOURCES = Object.freeze({
  goturkiye: {
    title: 'GoTürkiye — Traditional Maraş Ice Cream and Its History',
    url: 'https://goturkiye.com/blog/traditional-maras-ice-cream-and-its-history',
    kind: 'official-tourism',
    evidence: 'Describes serving on a pole, pulling the cone away as the customer reaches, and the dangling bell.',
  },
  gopro: {
    title: 'GoPro Awards: Turkish Ice Cream Tricks — Vedat Dumanli',
    url: 'https://www.youtube.com/watch?v=Jx_NjpeBqQw',
    kind: 'original-creator-demonstration',
    evidence: 'Original first-person vendor performance published by GoPro, 6 July 2019. Movement reference, not evidence for every game sequence.',
  },
  daydream: {
    title: 'Christina / Daydream Tourist — Istanbul Ice Cream Show',
    url: 'https://daydreamtourist.com/2012/07/05/istanbul-ice-cream-show/',
    kind: 'first-person-observation-and-photos',
    evidence: 'The author describes transfer between two cones, flips, and an offer of extra ice cream used to recover the customer’s cone onto the stick.',
  },
  winny: {
    title: 'Travel With Winny — What to eat in Istanbul?',
    url: 'https://travelwithwinny.com/what-to-eat-in-istanbul/amp/',
    kind: 'first-person-observation-and-photos',
    evidence: 'The author describes a long paddle and upside-down teasing during their own Istanbul visit.',
  },
  gould: {
    title: 'Peter Gould — Grow comfortable with ambiguity',
    url: 'https://petergouldart.substack.com/p/grow-comfortable-with-ambiguity',
    kind: 'personal-account',
    evidence: 'Describes receiving an empty cone or napkin and a whole tub-sized mass offered over a cone. This supports the vocabulary, not exact game timing.',
  },
});

/** Trace descriptions omit IDs and direction-only variants on purpose. */
export const BASE_SERVICE_ACTIONS = Object.freeze({
  DOUBLE_CONE_SLIDE: { label: ['Çift külah', 'Nested cones'], motion: 'nest-and-separate-wafer', responses: ['reach', 'return-or-discard'], ownership: 'outer-wafer:pole>hand>return', seconds: 3.0, sources: ['gopro', 'daydream'] },
  GIANT_BLOCK_TEASE: { label: ['Kalıbı kaldır', 'Lift the mold'], motion: 'tub-extraction-presentation-return', responses: ['withdraw-or-wait', 'reach'], ownership: 'mold:tub>pole>tub', seconds: 2.5, sources: ['gould', 'gopro'] },
  MIDAIR_BLOCK_SOMERSAULT: { label: ['Kalıp dönüşü', 'Mold turn'], motion: 'mold-lift-full-aerial-turn-lower', responses: ['wait', 'reach'], ownership: 'mold:tub>air>tub', seconds: 2.0, sources: ['gopro', 'gould'] },
  SHAFT_SPIN_360: { label: ['Çubuk çevirme', 'Axial paddle spin'], motion: 'two-axial-grip-releases', responses: ['reach-hold', 'fresh-reach-hold'], ownership: 'cone:pole-grip>pole-grip', seconds: 1.8, sources: ['gopro', 'goturkiye'] },
  VERTICAL_WINDMILL: { label: ['Dikey savurma', 'Vertical windmill'], motion: 'vertical-orbit-then-chest-offer', responses: ['wait', 'reach'], ownership: 'cone:pole', seconds: 2.0, sources: ['gopro', 'winny'] },
  UPSIDE_DOWN_GRAVITY: { label: ['Ters külah', 'Inverted cone'], motion: 'inverted-hold-upright-offer', responses: ['withdraw-or-wait', 'reach'], ownership: 'cone:pole-inverted>pole-upright', seconds: 1.9, sources: ['winny', 'gopro'] },
  FAKE_DROP_PANIC: { label: ['Düşürme şakası', 'False drop'], motion: 'downward-plunge-recovery', responses: ['withdraw-or-wait', 'reach'], ownership: 'cone:pole-plunge>pole-recovered', seconds: 1.8, sources: ['gopro', 'goturkiye'] },
  MEGA_TAFFY_SLICE: { label: ['Sünen dondurmayı kes', 'Cut the stretched ice'], motion: 'tub-to-pole-strand-sever-recoil', responses: ['horizontal-slice'], ownership: 'ice:connected-strand>two-ends-and-scrap', seconds: 1.2, sources: ['daydream', 'gopro'] },
  NAPKIN_CONE_FAKEOUT: { label: ['Peçeteli servis', 'Serving-paper tease'], motion: 'wrapped-offer-pinch-peel-retract', responses: ['pinch-or-wait', 'discard-if-held', 'fresh-reach'], ownership: 'paper:cone>hand>air;cone:pole', seconds: 2.8, sources: ['gould', 'gopro'] },
  SHELL_SWAP_DUEL: { label: ['İki elde şaşırtma', 'Two-hand shell game'], motion: 'two-cones-circular-exchange-and-reveal', responses: ['watch', 'pick-real-cone'], ownership: 'real:pole;decoy:left-hand>customer-if-wrong', seconds: 1.8, sources: ['daydream', 'gopro'] },
  FIGURE_EIGHT_WEAVE: { label: ['Sekiz çiz', 'Figure-eight weave'], motion: 'continuous-three-axis-figure-eight', responses: ['trace-both-lobes-and-close'], ownership: 'cone:pole', seconds: 2.0, sources: ['gopro', 'goturkiye'] },
  BELL_RHYTHM_FEINT: { label: ['Çanla iki yanıltma', 'Two bell feints'], motion: 'two-physical-bell-contacts-real-third-offer', responses: ['wait-two-feints', 'reach-third'], ownership: 'cone:left-hand>pole', seconds: 2.2, sources: ['goturkiye', 'gopro'] },
  OVERHEAD_CROWN_DANGLE: { label: ['Tepeden uzat', 'Overhead dangle'], motion: 'overhead-inverted-lower-to-hand', responses: ['withdraw-or-wait', 'reach-low'], ownership: 'cone:pole-high>pole-low', seconds: 1.8, sources: ['winny', 'gopro'] },
  COMBO_DOUBLE_PUMP: { label: ['Çift uzat-çek', 'Double offer'], motion: 'first-thrust-retract-second-thrust', responses: ['withdraw-first', 'reach-second'], ownership: 'cone:pole-feint>pole-offer', seconds: 1.6, sources: ['goturkiye', 'gopro'] },
  EYE_LOCK_RHYTHM_CHASE: { label: ['Göz göze ritim', 'Eye-contact chase'], motion: 'midpoint-hold-three-displaced-beat-targets', responses: ['reach-midpoint', 'follow-three-targets'], ownership: 'cone:pole;hand:free-tracking', seconds: 2.5, sources: ['goturkiye', 'gopro'] },
  WHOLE_MOLD_ON_CONE: { label: ['Külahta koca kalıp', 'Whole mold on the cone'], motion: 'tub-mold-mount-on-real-cone-return', responses: ['withdraw-or-wait', 'fresh-reach'], ownership: 'mold:tub>cone>tub;cone:left-hand>pole', seconds: 3.4, sources: ['gould', 'gopro'] },
  SCOOP_LIFT_BACK: { label: ['Boşalan külah', 'Scoops lift away'], motion: 'lift-actual-scoops-off-cone-reunite', responses: ['avoid-empty-or-return-it', 'fresh-reach'], ownership: 'scoops:cone>scene>cone;bare-cone:hand-if-grabbed', seconds: 3.4, sources: ['daydream', 'gould', 'gopro'] },
  BONUS_SCOOP_TAKEBACK: { label: ['Bir top daha?', 'One more scoop?'], motion: 'real-handoff-extra-bait-takeback-tub-return', responses: ['take-cone', 'bring-under-extra', 'fresh-reach'], ownership: 'cone:pole>customer>pole>vendor-hand>pole', seconds: 2.5, sources: ['daydream'] },
});

/** Authored anticipation connectors, not additional canonical tricks. */
export const BRIDGE_FAMILIES = Object.freeze({
  underhandArc: { duration: .40, beats: [.46], motion: 'dip-forward-arc-and-rise', hand: 'both-on-pole' },
  crossedOffer: { duration: .46, beats: [.28, .70], motion: 'cross-front-offer-then-recenter', hand: 'supporting-free-hand' },
  pauseWrist: { duration: .49, beats: [.32, .76], motion: 'hold-still-then-quarter-wrist-turn', hand: 'both-on-pole' },
  lowReturn: { duration: .45, beats: [.55], motion: 'protected-return-above-front-rail', hand: 'both-on-pole' },
  lateralRoll: { duration: .48, beats: [.22, .66], motion: 'side-sweep-with-full-axial-roll', hand: 'both-on-pole' },
  guardedLift: { duration: .52, beats: [.38, .78], motion: 'lift-serving-with-free-hand-support', hand: 'supporting-free-hand' },
});
const BRIDGE_KEYS = Object.keys(BRIDGE_FAMILIES);

const rows = [
  // Six early shows use only the original first-venue vocabulary.
  ['CIFT_FIRILDAK', 'Çifte Fırıldak', 'Double Whirl', 1, ['DOUBLE_CONE_SLIDE', 'SHAFT_SPIN_360']],
  ['CUBUKTAN_IPE', 'Çubuktan İpe', 'From Spin to Stretch', 1, ['SHAFT_SPIN_360', 'MEGA_TAFFY_SLICE']],
  ['GOZDEN_KULAHA', 'Gözden Külaha', 'Eyes on the Wafer', 1, ['EYE_LOCK_RHYTHM_CHASE', 'DOUBLE_CONE_SLIDE']],
  ['KALIBIN_PESINDE', 'Kalıbın Peşinde', 'Follow the Mold', 1, ['WHOLE_MOLD_ON_CONE', 'EYE_LOCK_RHYTHM_CHASE']],
  ['IKI_KULAH_BIR_IP', 'İki Külah, Bir İp', 'Two Cones, One Strand', 1, ['DOUBLE_CONE_SLIDE', 'MEGA_TAFFY_SLICE']],
  ['BAK_DON_KES', 'Bak, Dön, Kes', 'Follow, Turn, Cut', 1, ['EYE_LOCK_RHYTHM_CHASE', 'SHAFT_SPIN_360', 'MEGA_TAFFY_SLICE']],
  ['PECETEDEN_FIRILDAGA', 'Peçeteden Fırıldağa', 'Paper into a Whirl', 2, ['NAPKIN_CONE_FAKEOUT', 'SHAFT_SPIN_360']],
  ['BOS_KULAHIN_RITMI', 'Boş Külahın Ritmi', 'The Empty Cone Rhythm', 2, ['SCOOP_LIFT_BACK', 'EYE_LOCK_RHYTHM_CHASE']],
  ['CANLI_YEL_DEGIRMENI', 'Çanlı Yel Değirmeni', 'The Bell Windmill', 2, ['BELL_RHYTHM_FEINT', 'VERTICAL_WINDMILL']],
  ['SEKIZDEN_TERSE', 'Sekizden Terse', 'Eight into Upside Down', 2, ['FIGURE_EIGHT_WEAVE', 'UPSIDE_DOWN_GRAVITY']],
  ['TAKLADAN_KESIGE', 'Takladan Kesiğe', 'Tumble into a Cut', 2, ['MIDAIR_BLOCK_SOMERSAULT', 'MEGA_TAFFY_SLICE']],
  ['ELDEN_ELE_TERS', 'Elden Ele Ters', 'Swap, Then Invert', 2, ['SHELL_SWAP_DUEL', 'UPSIDE_DOWN_GRAVITY']],
  ['FAZLASI_SUNDU', 'Fazlası Sündü', 'The Extra Stretches', 3, ['BONUS_SCOOP_TAKEBACK', 'MEGA_TAFFY_SLICE']],
  ['KOCAMAN_PECETE_SAKASI', 'Kocaman Bir Şaka', 'A Mold and a Napkin', 3, ['WHOLE_MOLD_ON_CONE', 'NAPKIN_CONE_FAKEOUT']],
  ['DUSTU_DERKEN_BOS', 'Düştü Derken Boş!', 'A Drop, Then Nothing', 3, ['FAKE_DROP_PANIC', 'SCOOP_LIFT_BACK']],
  ['TEPEDEN_IKI_ELE', 'Tepeden İki Ele', 'From Above to Both Hands', 3, ['OVERHEAD_CROWN_DANGLE', 'SHELL_SWAP_DUEL']],
  ['DON_CAN_TAKIP', 'Dön, Çal, Takip Et', 'Spin, Ring, Follow', 3, ['SHAFT_SPIN_360', 'BELL_RHYTHM_FEINT', 'EYE_LOCK_RHYTHM_CHASE']],
  ['CIFTTEN_YELE_IPE', 'Çiftten Yele, İpe', 'Double, Windmill, Strand', 3, ['DOUBLE_CONE_SLIDE', 'VERTICAL_WINDMILL', 'MEGA_TAFFY_SLICE']],
  ['PECETEYE_BIR_TOP_DAHA', 'Peçeteye Bir Top Daha', 'Paper and One More Scoop', 4, ['NAPKIN_CONE_FAKEOUT', 'BONUS_SCOOP_TAKEBACK']],
  ['BOSLUKTA_SEKIZ', 'Boşlukta Sekiz', 'An Empty Figure Eight', 4, ['SCOOP_LIFT_BACK', 'FIGURE_EIGHT_WEAVE']],
  ['KALIPTAN_TEPEYE', 'Kalıptan Tepeye', 'From Tub to Overhead', 4, ['GIANT_BLOCK_TEASE', 'OVERHEAD_CROWN_DANGLE']],
  ['RITIMDEN_TAKLAYA', 'Ritimden Taklaya', 'Rhythm into a Tumble', 4, ['EYE_LOCK_RHYTHM_CHASE', 'MIDAIR_BLOCK_SOMERSAULT']],
  ['CAN_EL_IP', 'Çan, El, İp', 'Bell, Hands, Strand', 4, ['BELL_RHYTHM_FEINT', 'SHELL_SWAP_DUEL', 'MEGA_TAFFY_SLICE']],
  ['IKI_HOP_IKI_KULAH', 'İki Hop, İki Külah', 'Two Feints, Two Cones', 4, ['COMBO_DOUBLE_PUMP', 'DOUBLE_CONE_SLIDE', 'UPSIDE_DOWN_GRAVITY']],
  ['FAZLA_DERKEN_EKSIK', 'Fazla Derken Eksik', 'Extra, Then Empty', 5, ['BONUS_SCOOP_TAKEBACK', 'SCOOP_LIFT_BACK']],
  ['KALIP_RITIM_KESIK', 'Kalıp, Ritim, Kesik', 'Mold, Rhythm, Cut', 5, ['WHOLE_MOLD_ON_CONE', 'EYE_LOCK_RHYTHM_CHASE', 'MEGA_TAFFY_SLICE']],
  ['PECETE_TEPE_EL', 'Peçete, Tepe, El', 'Paper, Overhead, Hands', 5, ['NAPKIN_CONE_FAKEOUT', 'OVERHEAD_CROWN_DANGLE', 'SHELL_SWAP_DUEL']],
  ['TAKLA_HOP_CAN', 'Takla, Hop, Çan', 'Tumble, Feint, Bell', 5, ['MIDAIR_BLOCK_SOMERSAULT', 'COMBO_DOUBLE_PUMP', 'BELL_RHYTHM_FEINT']],
  ['YEL_SEKIZ_BOSLUK', 'Yel, Sekiz, Boşluk', 'Windmill, Eight, Empty', 5, ['VERTICAL_WINDMILL', 'FIGURE_EIGHT_WEAVE', 'SCOOP_LIFT_BACK']],
  ['CIFT_FAZLA_IP', 'Çift, Fazla, İp', 'Double, Extra, Strand', 5, ['DOUBLE_CONE_SLIDE', 'BONUS_SCOOP_TAKEBACK', 'MEGA_TAFFY_SLICE']],
  ['KALIP_BOS_FAZLA', 'Kalıp, Boş, Fazla', 'Mold, Empty, Extra', 6, ['WHOLE_MOLD_ON_CONE', 'SCOOP_LIFT_BACK', 'BONUS_SCOOP_TAKEBACK']],
  ['PECETE_GOZ_TAKLA', 'Peçete, Göz, Takla', 'Paper, Eyes, Tumble', 6, ['NAPKIN_CONE_FAKEOUT', 'EYE_LOCK_RHYTHM_CHASE', 'MIDAIR_BLOCK_SOMERSAULT']],
  ['CAN_CIFT_EL', 'Çan, Çift, El', 'Bell, Double, Hands', 6, ['BELL_RHYTHM_FEINT', 'DOUBLE_CONE_SLIDE', 'SHELL_SWAP_DUEL']],
  ['TERS_SEKIZ_KES', 'Ters, Sekiz, Kes', 'Invert, Weave, Cut', 6, ['UPSIDE_DOWN_GRAVITY', 'FIGURE_EIGHT_WEAVE', 'MEGA_TAFFY_SLICE']],
  ['KUTLE_YEL_FAZLA', 'Kütle, Yel, Fazla', 'Mass, Windmill, Extra', 6, ['GIANT_BLOCK_TEASE', 'VERTICAL_WINDMILL', 'BONUS_SCOOP_TAKEBACK']],
  ['DUS_PECETE_HOP', 'Düş, Peçete, Hop', 'Drop, Paper, Feint', 6, ['FAKE_DROP_PANIC', 'NAPKIN_CONE_FAKEOUT', 'COMBO_DOUBLE_PUMP']],
];

export const CHOREOGRAPHED_ROUTINES = Object.freeze(rows.map(([slug, tr, en, tier, componentIds], rowIndex) => {
  const components = componentIds.map(id => BASE_SERVICE_ACTIONS[id]);
  const sourceRefs = [...new Set(components.flatMap(action => action.sources))];
  const bridges = componentIds.slice(1).map((_, index) => {
    const family = BRIDGE_KEYS[(rowIndex + index * 2) % BRIDGE_KEYS.length];
    return Object.freeze({ family, ...BRIDGE_FAMILIES[family], beats: Object.freeze([...BRIDGE_FAMILIES[family].beats]) });
  });
  return Object.freeze({
    id: `SHOW_${slug}`, tier, unlockStage: (tier - 1) * 5 + 1,
    componentIds: Object.freeze(componentIds), bridges: Object.freeze(bridges), names: Object.freeze({ tr, en }),
    sourceRefs: Object.freeze(sourceRefs),
    estimatedSeconds: Number((components.reduce((sum, action) => sum + action.seconds, 0) + bridges.reduce((sum, bridge) => sum + bridge.duration, 0)).toFixed(2)),
    provenance: 'choreographed-combination',
    evidence: 'Component gestures are referenced; their order, name, timing and touch responses are authored for this game.',
  });
}));
const BY_ID = new Map(CHOREOGRAPHED_ROUTINES.map(routine => [routine.id, routine]));
export const ROUTINE_CATALOG = Object.freeze(CHOREOGRAPHED_ROUTINES.map(routine => ({
  ...routine, icon: '🎭', difficulty: Math.min(5, routine.tier + 1), category: 'choreographed_show',
  descs: {
    tr: `Kurgulanmış gösteri: ${routine.componentIds.map(id => BASE_SERVICE_ACTIONS[id].label[0]).join(' → ')}. Gerçek servis hareketlerinden oyun için birleştirildi.`,
    en: `Choreographed show: ${routine.componentIds.map(id => BASE_SERVICE_ACTIONS[id].label[1]).join(' → ')}. Service gestures combined for the game.`,
  },
})));
export function isChoreographedRoutine(id) { return BY_ID.has(id); }
export function getChoreographedRoutine(id) { return BY_ID.get(id) || null; }
export function routineSignature(routine) {
  return JSON.stringify(routine.componentIds.map(id => {
    const action = BASE_SERVICE_ACTIONS[id];
    const index = routine.componentIds.indexOf(id);
    const bridge = routine.bridges[index];
    return [action.motion, action.responses, action.ownership, action.seconds, bridge ? [bridge.motion, bridge.hand, bridge.duration, bridge.beats] : null];
  }));
}
export function routineIdsForStage(stage) { return CHOREOGRAPHED_ROUTINES.filter(routine => routine.unlockStage <= stage).map(routine => routine.id); }
export function compoundLimitForStage(stage) { return stage <= 10 ? 1 : stage <= 20 ? 2 : 3; }

/** Receives an already shuffled pool; keep the original round slot budget. */
export function selectRoutineSlots(pool, count, stage) {
  const unique = [...new Set(pool)];
  const compounds = unique.filter(id => BY_ID.has(id) && BY_ID.get(id).unlockStage <= stage).slice(0, compoundLimitForStage(stage));
  let researchChosen = false;
  const base = unique.filter(id => !BY_ID.has(id)).filter(id => {
    if (!isResearchedService(id)) return true;
    if (researchChosen) return false;
    researchChosen = true; return true;
  });
  return [...compounds, ...base.slice(0, Math.max(0, count - compounds.length))].slice(0, count);
}

/** Start/resume a component using the normal director entry and update paths. */
export function enterChoreography(director, showId, componentId = null) {
  if (componentId && director.choreography) return componentId;
  const routine = BY_ID.get(showId);
  director.currentShowId = showId;
  director.choreography = routine ? { routine, index: 0, bridge: null, completed: [], scoreAtStart: director.score } : null;
  return routine ? routine.componentIds[0] : showId;
}
const V = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);
const ease = (x) => { const p = MathUtils.clamp(x, 0, 1); return p * p * (3 - 2 * p); };
function entryPose(componentId) {
  if (componentId === 'MEGA_TAFFY_SLICE') return V(.18, 1.39, .14);
  if (componentId === 'NAPKIN_CONE_FAKEOUT') return V(.08, 1.24, .12);
  if (componentId === 'SHELL_SWAP_DUEL') return V(0, 1.25, .20);
  if (componentId === 'OVERHEAD_CROWN_DANGLE') return V(0, 1.45, .20);
  return V(.04, 1.24, .25);
}

export function advanceChoreography(director) {
  const state = director.choreography;
  if (!state) return false;
  state.completed.push({ componentId: state.routine.componentIds[state.index], actualMechanic: director.currentMechanic, score: director.score, holding: director.heldItem || null });
  const nextId = state.routine.componentIds[state.index + 1];
  if (!nextId) { state.index++; return false; }
  const spec = state.routine.bridges[state.index];
  const rail = director.world.getCounterStrikeTarget?.(0) || V(0, 1.02, .28);
  state.bridge = { ...spec, elapsed: 0, pulse: 0, beatIndex: 0, ready: false,
    start: director.coneWorldPos.clone(), end: entryPose(nextId),
    startRoll: Math.atan2(Math.sin(director.shaftRoll || 0), Math.cos(director.shaftRoll || 0)),
    startPitch: director.conePitchX || 0, rail: rail.clone().add(V(0, .22, -.025)), nextId };
  director.isGraspingPaddleCone = false;
  director.protocol?.emitCommand('VENDOR', 'SHOW_BRIDGE_BEGIN', { showId: state.routine.id, family: spec.family, from: state.routine.componentIds[state.index], to: nextId, duration: spec.duration });
  return true;
}

/** The same serving follows one continuous connector; there is no prop reset here. */
export function sampleBridgePose(bridge, progress) {
  const p = MathUtils.clamp(progress, 0, 1), t = ease(p), arc = Math.sin(p * Math.PI);
  let position = bridge.start.clone().lerp(bridge.end, t);
  let roll = bridge.startRoll * (1 - t), pitch = bridge.startPitch * (1 - t);
  if (bridge.family === 'underhandArc') { position.y -= arc * .055; position.z += arc * .07; pitch += arc * .22; }
  else if (bridge.family === 'crossedOffer') { position.x += Math.sin(p * Math.PI * 2) * .15; position.z += arc * .10; roll += arc * .85; }
  else if (bridge.family === 'pauseWrist') {
    const afterPause = ease((p - .32) / .68); position = bridge.start.clone().lerp(bridge.end, afterPause);
    roll = bridge.startRoll * (1 - afterPause) + Math.sin(afterPause * Math.PI) * Math.PI * .5;
    pitch += Math.sin(afterPause * Math.PI) * .18;
  } else if (bridge.family === 'lowReturn') {
    position = p < .5 ? bridge.start.clone().lerp(bridge.rail, ease(p * 2)) : bridge.rail.clone().lerp(bridge.end, ease((p - .5) * 2));
    pitch += arc * .24;
  } else if (bridge.family === 'lateralRoll') { position.x += arc * .14; roll += Math.PI * 2 * t; pitch += Math.sin(p * Math.PI * 2) * .10; }
  else if (bridge.family === 'guardedLift') { position.y += arc * .14; position.z -= arc * .04; pitch -= arc * .12; }
  return { position, roll, pitch, support: bridge.hand === 'supporting-free-hand' };
}

export function updateChoreographyBridge(director, dt, gestureState) {
  const state = director.choreography, bridge = state?.bridge;
  if (!bridge) return false;
  if (bridge.ready) {
    state.index++; state.bridge = null;
    director._enterRoutineStep(director.routineIndex, bridge.nextId);
    return false;
  }
  director.gestureValidation.update(gestureState, dt, `${director.routineIndex}:bridge:${state.routine.id}:${state.index}`);
  bridge.elapsed += dt;
  const progress = Math.min(1, bridge.elapsed / bridge.duration);
  const pose = sampleBridgePose(bridge, progress);
  director.coneTargetPos.copy(pose.position); director.shaftRoll = pose.roll; director.conePitchX = pose.pitch; director.coneFlipZ = 0;
  // The pole keeps ownership; the free hand supports the same cone underneath.
  director.leftHandCustomTarget = pose.support ? director.coneWorldPos.clone().add(V(0, -.075, .015)) : null;
  bridge.pulse = Math.max(0, bridge.pulse - dt * 5);
  if (bridge.beatIndex < bridge.beats.length && progress >= bridge.beats[bridge.beatIndex]) {
    bridge.pulse = 1; bridge.beatIndex++;
    director._vibrate?.(12);
    director.protocol?.emitCommand('VENDOR', 'SHOW_BRIDGE_BEAT', { showId: state.routine.id, family: bridge.family, beat: bridge.beatIndex });
  }
  if (progress >= 1) bridge.ready = true;
  return true;
}

export function clearChoreography(director) {
  if (director.choreography?.bridge) director.leftHandCustomTarget = null;
  director.choreography = null;
  director.currentShowId = null;
}
export function choreographyGuide(director, guide) {
  const state = director.choreography;
  if (!state) return guide;
  const lang = director.save?.lang === 'tr' ? 'tr' : 'en';
  guide.trickTitle = state.routine.names[lang];
  guide.showId = state.routine.id;
  guide.componentId = director.currentMechanic;
  guide.componentIndex = state.index;
  guide.componentCount = state.routine.componentIds.length;
  if (state.bridge) {
    const bridge = state.bridge, target = director.world.projectToScreen(director.coneWorldPos);
    guide.theme = 'amber'; guide.icon = '👀'; guide.badgeText = director.save.t('cue_swap_watch');
    guide.comets = []; guide.rings = [{ x: target.x, y: target.y, radius: 32 + bridge.pulse * 7, color: 'amber', label: '·' }];
    guide.bridgeFamily = bridge.family;
    guide.stageProgress = (state.index + .82 + .18 * Math.min(1, bridge.elapsed / bridge.duration)) / state.routine.componentIds.length;
  } else guide.stageProgress = Math.max(0, Math.min(1, (state.index + (guide.stageProgress || 0)) / state.routine.componentIds.length));
  return guide;
}
