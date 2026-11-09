import { Matrix4, Quaternion, Vector3 } from 'three';

const Y = new Vector3(0, 1, 0), Z = new Vector3(0,0,1);
// The underside of the steel blade, not the cone rim or the shaft origin.
export const BLADE_CONTACT = Object.freeze({ x: 0, y: -.007, z: -.04 });

/** A presentation constraint. The logical paddle/cone pose and all gesture
 * targets remain unchanged; only the real steel shaft follows the ice crown. */
export class PoleContact {
  constructor() {
    this.point = new Vector3(); this.normal = new Vector3();
    this.forward = new Vector3(); this.right = new Vector3(); this.up = new Vector3();
    this.chest = new Vector3(); this.local = new Vector3(); this.offset = new Vector3();
    this.matrix = new Matrix4(); this.rotation = new Quaternion(); this.parentRotation = new Quaternion();
    this.bareGoal=new Quaternion();
    this.active = false; this.scoop = null;
    this.bareSeconds=0;
  }

  beginPoseFrame(world,dt){
    this.frameScoop=this.active?this.scoop:null;
    world.paddleRollGroup.getWorldQuaternion(this.frameRotation ||= new Quaternion());
    this.turnBudget=world.vendorPoleForwardHint?Infinity:Math.max(0,dt)*5;
    this.bareSeconds=Math.max(0,this.bareSeconds-Math.max(0,dt));
  }

  bare(world,shaftRoll){
    const root=world.paddleGroup,shaft=world.paddleRollGroup;
    if(this.wasAttached)this.bareSeconds=.35;
    if(this.bareSeconds>0&&this.frameRotation&&Number.isFinite(this.turnBudget)){
      root.getWorldQuaternion(this.parentRotation);
      this.bareGoal.setFromAxisAngle(Z,shaftRoll).premultiply(this.parentRotation);
      this.rotation.copy(this.frameRotation).rotateTowards(this.bareGoal,this.turnBudget);
      shaft.quaternion.copy(this.parentRotation.invert()).multiply(this.rotation);
    }
    shaft.updateWorldMatrix(true,true);return false;
  }

  highestVisible(world) {
    let highest = null, height = -Infinity;
    if (world.scoopStackGroup?.visible === false) return null;
    for (const mesh of world.scoopMeshes || []) {
      const radius = mesh.geometry?.parameters?.radius;
      if (!mesh.visible || !(radius > 0)) continue;
      const crown = mesh.position.y + radius * mesh.scale.y;
      if (crown > height) { height = crown; highest = mesh; }
    }
    return highest;
  }

  crown(mesh) {
    mesh.updateWorldMatrix(true, false);
    this.point.set(0, mesh.geometry.parameters.radius, 0).applyMatrix4(mesh.matrixWorld);
    this.normal.copy(Y).transformDirection(mesh.matrixWorld);
  }

  update(world, shaftRoll = 0) {
    const root = world.paddleGroup, shaft = world.paddleRollGroup;
    this.wasAttached=this.active;
    // All held food is deliberately parented outside this rendered shaft.
    shaft.position.set(0, 0, 0); shaft.rotation.set(0, 0, shaftRoll);
    this.active = false; this.scoop = null;
    if(world.vendorPoleFree)return this.bare(world,shaftRoll);
    if (world.carryScoop?.visible) this.scoop = world.carryScoop;
    else {
      const top = this.highestVisible(world), stack = world.scoopStackGroup;
      if (top && !world.scoopInFlight) {
        const holder = stack.parent;
        const poleOwned = holder === root ||
          (holder === world.conePivot && holder.parent === root) ||
          (holder === world.outerConeGroup && holder.parent === root) ||
          (holder === world.scene && world.stallEffects?.scoopOwner === 'paddle');
        this.crown(top);
        // A hand-held cone is touched only when the authored pole approaches it.
        // Otherwise a bare pole can still drum, ring bells and return to a tub.
        const handHeld = holder === world.conePivot &&
          (holder.parent === world.heldSocket || holder.parent === world.lArmRig?.handGroup);
        // Older takeback paths approach the cone's logical grip socket rather
        // than a scoop center. That socket stays unchanged for eight scoops;
        // its distance to the crown does not. Accept that explicit approach,
        // without following a hand-held cone while the pole is withdrawn.
        // Separate enter/leave thresholds. The same moving hand must not
        // attach/detach on alternating frames at the contact boundary.
        const retaining=this.frameScoop===top;
        const nearSocket = handHeld && holder.getWorldPosition(this.local).distanceTo(root.position) < (retaining?.13:.09);
        const nearHand = handHeld && !world.vendorPoleFree && (nearSocket || this.point.distanceTo(root.position) < (retaining?.19:.14));
        if (poleOwned || nearHand) this.scoop = top;
      }
    }
    if (!this.scoop?.geometry?.parameters?.radius) return this.bare(world,shaftRoll);
    this.poseForScoop(world,this.scoop);
    root.updateWorldMatrix(true, false);
    root.getWorldQuaternion(this.parentRotation).invert();
    shaft.quaternion.copy(this.parentRotation).multiply(this.rotation);
    this.offset.set(BLADE_CONTACT.x, BLADE_CONTACT.y, BLADE_CONTACT.z).applyQuaternion(this.rotation);
    this.local.copy(this.point).sub(this.offset);
    shaft.position.copy(root.worldToLocal(this.local));
    shaft.updateWorldMatrix(true, true);
    this.active = true;
    return true;
  }

  /** Shared by an approaching bare pole and an attached pole. Computing this
   * pose does not change ownership or the shaft, avoiding a handoff-heading pop. */
  poseForScoop(world,mesh) {
    this.crown(mesh);
    if (world.rightShoulderAnchor && world.leftShoulderAnchor) {
      world.rightShoulderAnchor.getWorldPosition(this.chest);
      // The handle sits outside the right shoulder/front of the vest. Aiming
      // at the chest midpoint used to drive a low pole straight through it.
      this.local.set(-.10,0,.28);
      if(world.vendorTorso)this.local.applyQuaternion(world.vendorTorso.getWorldQuaternion(this.parentRotation));
      this.chest.add(this.local);
    } else this.chest.set(-.06, 1.22, -.64);
    // A blade sits tangent to the crown, so its shaft cannot run through the
    // scoops or the wafer when the same cone turns upside down.
    this.forward.copy(this.point).sub(this.chest);
    this.forward.addScaledVector(this.normal, -this.forward.dot(this.normal));
    if (this.forward.lengthSq() < 1e-6) {
      this.forward.set(0, 0, 1).addScaledVector(this.normal, -this.normal.z);
      if (this.forward.lengthSq() < 1e-6) this.forward.set(1, 0, 0);
    }
    this.forward.normalize();
    if(world.paddleTangentOffset)this.forward.applyAxisAngle(this.normal,world.paddleTangentOffset);
    this.right.crossVectors(this.normal, this.forward).normalize();
    this.up.crossVectors(this.forward, this.right).normalize();
    this.matrix.makeBasis(this.right, this.up, this.forward);
    this.rotation.setFromRotationMatrix(this.matrix);
    return this;
  }

  bladePoint(world, out = new Vector3()) {
    return world.paddleRollGroup.localToWorld(out.set(BLADE_CONTACT.x, BLADE_CONTACT.y, BLADE_CONTACT.z));
  }
}
