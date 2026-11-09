/** The whole vendor-only action, including its ownership rendezvous. */
const TIMED_SHOWS=new Set(['GIANT_BLOCK_TEASE','MIDAIR_BLOCK_SOMERSAULT','VERTICAL_WINDMILL','UPSIDE_DOWN_GRAVITY','FAKE_DROP_PANIC','OVERHEAD_CROWN_DANGLE','COMBO_DOUBLE_PUMP','DOUBLE_CONE_SLIDE','NAPKIN_CONE_FAKEOUT']);
/** Watching an authored show is not being AFK. In particular the slow opening
 * mold show lasts longer than the idle threshold; interrupting it there used
 * to prevent it from ever returning the mold and opening the catch window. */
export function isTimedVendorShow(d){
 return TIMED_SHOWS.has(d.currentMechanic)&&d.subStep===0||
   d.currentMechanic==='BELL_RHYTHM_FEINT'&&d.bellBeatsDone<2||
   d.currentMechanic==='SHELL_SWAP_DUEL'&&d.stageTimer<1.2;
}

export function isIdleVendorAction(director) {
  return Boolean(director.isAfkShowActive || director.flourishPreparation ||
    director.vendorFlourish || director.afkRejoin);
}

export function isQuietVendorPresentation(director) {
  return isIdleVendorAction(director) || (director.idleGuideSettle || 0) > 0;
}

export function markIdleSettling(director) {
  // Latch only the ownership-transfer frame, whose update returns before play.
  director.idleGuideSettle = 1;
}

export function tickIdleGuide(director) {
  // The first resumed update must expose its cue for the whole response window.
  if (director.active && !director.roundEnded && !isIdleVendorAction(director)) {
    director.idleGuideSettle = 0;
  }
}

/** A previous cut/drag must not become a rope to a moving idle pole.
 * Real held tugs are never detached by presentation cleanup. */
export function suppressIdleScene(director) {
  if (director.isGraspingPaddleCone || director.heldItem === 'FULL_CONE_TUG') return;
  const world = director.world, strand = world.stretchyStrand;
  if (strand?.active || strand?.mesh?.visible) {
    director.idleStrandWasActive = true;
    strand.detach?.();
  }
  if (world.sliceCueGroup) world.sliceCueGroup.visible = false;
  world.stretchCutView?.reset?.();
}
