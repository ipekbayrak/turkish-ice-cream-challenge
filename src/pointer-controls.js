/** Desktop hover is an input mode, never a simulated touch on phones/tablets. */
export function isControlActive(state) {
  return Boolean(state.isPointerDown || state.isMouseHover);
}
/** A development touch preview must exercise the same path for real mouse drags. */
export function controlPointerType(event, touchPreview = false) {
  return touchPreview && event?.pointerType === 'mouse' ? 'touch' : event?.pointerType;
}
export function canUseMouseHover(event, { active = true, blocked = false, capturedPointer = null, touchPreview = false } = {}) {
  return active && !blocked && controlPointerType(event, touchPreview) === 'mouse' &&
    (capturedPointer === null || capturedPointer === event.pointerId);
}

/** End/cancel must not leave a fading contact dot over the restored long arm. */
export function clearTouchTrace(state, pointerType = state.pointerType) {
  if (pointerType !== 'touch') return false;
  state.trailPoints.length = 0;
  return true;
}
