/** Ownership, rather than last frame's rendered pole rotation, decides whether
 * steel is bare. A cone in the vendor's other hand is not a pole load. */
export function poleHasFood(world){
 if(world.carryScoop?.visible||world.giantBlockGroup?.visible)return true;
 if(world.conePivot?.parent===world.paddleGroup&&world.conePivot.visible&&world.mainConeMesh?.visible)return true;
 if(world.outerConeGroup?.parent===world.paddleGroup&&world.outerConeGroup.visible)return true;
 const stack=world.scoopStackGroup;if(!stack||stack.visible===false)return false;
 const visible=(world.scoopMeshes||[]).some(m=>m.visible);if(!visible||world.scoopInFlight)return false;
 const parent=stack.parent,pole=world.paddleGroup;
 return parent===pole||(parent===world.conePivot&&parent.parent===pole)||
  (parent===world.outerConeGroup&&parent.parent===pole)||(parent===world.scene&&world.stallEffects?.scoopOwner==='paddle');
}
