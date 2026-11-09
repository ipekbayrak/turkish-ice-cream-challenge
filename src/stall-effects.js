import * as THREE from 'three';
import { ICE_CREAM_FLAVORS } from './protocol.js';

/** Reusable presentation meshes. No score, gesture or routine state belongs here. */
export class StallEffects {
  constructor(world) {
    this.w = world;
    this.sliceAge = 1;
    this.sliceDuration = .60;
    this.cut = new THREE.Vector3();
    this.anchors = [new THREE.Vector3(), new THREE.Vector3()];
    this.cutPaths = [[], []];
    this.sliceVector = new THREE.Vector3(1, 0, 0);
    this.scratchA = new THREE.Vector3(); this.scratchB = new THREE.Vector3();
    this.axis = new THREE.Vector3(0, 1, 0); this.direction = new THREE.Vector3();
    this.sliceGroup = new THREE.Group(); this.sliceGroup.name = 'severed-dondurma'; this.sliceGroup.visible = false;
    world.scene.add(this.sliceGroup);
    this.sliceMaterial = new THREE.MeshStandardMaterial({ color: 0xfff8eb, roughness: .42, transparent: true, opacity: 1, depthWrite: false });
    const strandGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
    this.strands = Array.from({ length: 2 }, () => Array.from({ length: 6 }, () => {
      const mesh = new THREE.Mesh(strandGeo, this.sliceMaterial); this.sliceGroup.add(mesh); return mesh;
    }));
    const scrapGeo = new THREE.SphereGeometry(.023, 10, 8);
    this.scraps = Array.from({ length: 3 }, () => { const mesh = new THREE.Mesh(scrapGeo, this.sliceMaterial); this.sliceGroup.add(mesh); return mesh; });
    this.cutTips = Array.from({ length: 2 }, () => { const mesh = new THREE.Mesh(new THREE.SphereGeometry(.019, 10, 8), this.sliceMaterial); this.sliceGroup.add(mesh); return mesh; });

    this.bucket = new THREE.Group(); this.bucket.name = 'lifted-steel-canister'; this.bucket.visible = false; world.scene.add(this.bucket);
    const steel = new THREE.MeshStandardMaterial({ color: 0xd8e1e6, metalness: .88, roughness: .22, side: THREE.DoubleSide });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(.105, .095, .34, 24, 1, true), steel); this.bucket.add(wall);
    for (const y of [-.17, .17]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(y > 0 ? .105 : .095, .008, 8, 24), steel); rim.rotation.x = Math.PI / 2; rim.position.y = y; this.bucket.add(rim);
    }
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.TorusGeometry(.025, .005, 6, 12, Math.PI), steel); ear.position.set(side * .113, .12, 0); ear.rotation.z = side * Math.PI / 2; this.bucket.add(ear);
    }

    this.sleeve = new THREE.Group(); this.sleeve.name = 'paper-cone-sleeve'; this.sleeve.visible = false;
    const paper = new THREE.MeshStandardMaterial({ color: 0xf8f0df, roughness: .9, side: THREE.DoubleSide });
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(.063, .034, .13, 20, 1, true), paper); this.sleeve.add(wrap);
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(.058, .003, 6, 20), new THREE.MeshStandardMaterial({ color: 0x9b3035, roughness: .8 })); stripe.rotation.x = Math.PI / 2; stripe.position.y = .045; this.sleeve.add(stripe);
    world.conePivot.add(this.sleeve);
    world.paperSleeve = this.sleeve;
    this.sleeveRest = new THREE.Vector3(0, -.04, 0);
    this.scoopRest = new THREE.Vector3();
    this.identity = new THREE.Quaternion();
    this.sleeveOwner = 'vendor'; this.sleeveMoving = false; this.scoopMoving = false; this.mode = null;
    this.coneMoving = false; this.coneRest = new THREE.Vector3();
    this.outerOwner = 'nested'; this.outerMoving = false;
    this.outerRest = new THREE.Vector3(0, -.052, .008);
    this.outerRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, .045));
    this.parentScale = new THREE.Vector3(1, 1, 1);

    // One sheet wraps below the real cone, then unfolds from the player's pinch.
    this.napkin = new THREE.Group(); this.napkin.name = 'serving-napkin'; this.napkin.visible = false;
    this.napkinGeometry = new THREE.PlaneGeometry(.19, .15, 12, 8);
    this.napkinGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), .25);
    this.napkinMaterial = new THREE.MeshStandardMaterial({ color: 0xf7f0e1, roughness: .95, side: THREE.DoubleSide, transparent: true, opacity: 1, depthWrite: false });
    this.napkinMesh = new THREE.Mesh(this.napkinGeometry, this.napkinMaterial);
    this.napkinMesh.castShadow = true; this.napkin.add(this.napkinMesh);
    world.conePivot.add(this.napkin); this.napkin.position.set(0, -.065, 0);
    world.servingNapkin = this.napkin;
    this.napkinRest = new THREE.Vector3(0, -.065, 0);
    this.napkinVelocity = new THREE.Vector3();
    this.napkinPeel = 0; this.napkinPeelTarget = 0; this.napkinAge = 0; this.napkinOwner = 'vendor'; this.napkinMoving = false; this.napkinFlight = false;
    this.updateNapkinSurface();

    this.impactAge = 1; this.impactPower = 1; this.impactPoint = new THREE.Vector3();
    this.impactGroup = new THREE.Group(); this.impactGroup.name = 'counter-contact'; this.impactGroup.visible = false; world.scene.add(this.impactGroup);
    this.impactMaterial = new THREE.MeshBasicMaterial({ color: 0xded5c4, transparent: true, opacity: .2, depthWrite: false });
    const impactGeometry = new THREE.SphereGeometry(.004, 6, 4);
    this.impactMotes = Array.from({ length: 4 }, () => { const mesh = new THREE.Mesh(impactGeometry, this.impactMaterial); this.impactGroup.add(mesh); return mesh; });
  }

  triggerSlice(point, color = 0xfff8eb, direction = 1) {
    this.cut.copy(point); this.sliceDirection = typeof direction === 'number' ? Math.sign(direction) || 1 : Math.sign(direction.x) || 1;
    if (typeof direction === 'number') this.sliceVector.set(this.sliceDirection, 0, 0);
    else this.sliceVector.copy(direction).normalize();
    const strand = this.w.stretchyStrand;
    if (strand?.active && strand.nodes?.length > 1) {
      this.anchors[0].copy(strand.nodes[0]); this.anchors[1].copy(strand.nodes[strand.nodes.length - 1]);
      // Split the visible ice itself, even when the forgiving gesture guide is in front of it.
      let closest = Infinity, cutIndex = 1;
      for (let i = 1; i < strand.nodes.length; i++) {
        const a = strand.nodes[i - 1], b = strand.nodes[i];
        this.direction.subVectors(b, a);
        const lengthSq = this.direction.lengthSq();
        const t = lengthSq ? THREE.MathUtils.clamp(this.scratchA.copy(point).sub(a).dot(this.direction) / lengthSq, 0, 1) : 0;
        this.scratchB.copy(a).addScaledVector(this.direction, t);
        const distance = this.scratchB.distanceToSquared(point);
        if (distance < closest) { closest = distance; cutIndex = i; this.cut.copy(this.scratchB); }
      }
      this.cutPaths[0] = [...strand.nodes.slice(0, cutIndex).map(p => p.clone()), this.cut.clone()];
      this.cutPaths[1] = [...strand.nodes.slice(cutIndex).reverse().map(p => p.clone()), this.cut.clone()];
    } else {
      this.anchors[0].copy(point).x -= .19; this.anchors[1].copy(point).x += .19;
      this.cutPaths = this.anchors.map(anchor => [anchor.clone(), this.cut.clone()]);
    }
    this.sliceMaterial.color.set(color); this.sliceMaterial.opacity = 1;
    this.sliceAge = 0; this.sliceGroup.visible = true;
    this.updateSlice(0);
  }

  updateSlice(dt) {
    if (!this.sliceGroup.visible) return;
    this.sliceAge += Math.max(0, dt);
    const p = Math.min(1, this.sliceAge / this.sliceDuration);
    if (p >= 1) { this.sliceGroup.visible = false; return; }
    const recoil = 1 - Math.pow(1 - p, 2.4);
    this.sliceMaterial.opacity = p < .65 ? 1 : (1 - p) / .35;
    for (let side = 0; side < 2; side++) {
      const anchor = this.anchors[side];
      for (let i = 0; i < 6; i++) {
        const t0 = i / 6, t1 = (i + 1) / 6;
        const length = Math.max(.035, 1 - recoil);
        this.sampleCutPath(side, t0 * length, this.scratchA);
        this.sampleCutPath(side, t1 * length, this.scratchB);
        this.scratchA.y -= Math.sin(t0 * Math.PI) * .09 * Math.sin(p * Math.PI);
        this.scratchB.y -= Math.sin(t1 * Math.PI) * .09 * Math.sin(p * Math.PI);
        const mesh = this.strands[side][i];
        mesh.position.copy(this.scratchA).add(this.scratchB).multiplyScalar(.5);
        this.direction.subVectors(this.scratchB, this.scratchA);
        const distance = this.direction.length();
        if (distance > .00001) mesh.quaternion.setFromUnitVectors(this.axis, this.direction.multiplyScalar(1 / distance));
        const radius = .014 + .007 * recoil;
        mesh.scale.set(radius, Math.max(.002, distance + .008), radius);
      }
      this.sampleCutPath(side, Math.max(.035, 1 - recoil), this.cutTips[side].position);
      this.cutTips[side].scale.setScalar(1 + recoil * .25);
    }
    this.scraps.forEach((mesh, i) => {
      const t = this.sliceAge;
      mesh.position.copy(this.cut).addScaledVector(this.sliceVector, (.35 + i * .16) * t);
      mesh.position.y += (.20 + i * .09) * t - 1.9 * t * t;
      mesh.position.z += (i - 1) * .18 * t;
      mesh.rotation.set(t * (6 + i), t * 4, t * this.sliceDirection * 7);
      mesh.scale.set(1 - i * .16, 1.25, .8);
    });
  }

  sampleCutPath(side, t, out) {
    const path = this.cutPaths[side];
    if (path.length < 2) return out.copy(this.anchors[side]).lerp(this.cut, t);
    const index = Math.min(path.length - 2, Math.floor(t * (path.length - 1)));
    return out.copy(path[index]).lerp(path[index + 1], t * (path.length - 1) - index);
  }

  setMold({ mode = null, tubIndex = 0, position, rotation, scale = 1 } = {}) {
    const w = this.w;
    if (!mode) { this.clearMold(); return; }
    w.beginTubMold?.(tubIndex);
    const parent = mode === 'cone-cap' ? w.conePivot : mode === 'bucket' ? this.bucket : w.scene;
    if (w.giantBlockGroup.parent !== parent) { w.scene.updateMatrixWorld(true); parent.attach(w.giantBlockGroup); }
    this.mode = mode; this.bucket.visible = mode === 'bucket'; w.giantBlockGroup.visible = true;
    w.setGiantBlockColor(ICE_CREAM_FLAVORS[Math.abs(tubIndex) % ICE_CREAM_FLAVORS.length]?.colorHex ?? 0xfff8e7);
    const object = mode === 'bucket' ? this.bucket : w.giantBlockGroup;
    if (mode === 'cone-cap') {
      parent.getWorldScale(this.parentScale);
      object.position.set(0, .035 + w.giantBlockHeight * .5 * scale / this.parentScale.y, 0);
    }
    else if (position) object.position.copy(position);
    if (mode === 'bucket') { w.giantBlockGroup.position.set(0, 0, 0); w.giantBlockGroup.rotation.set(0, 0, 0); }
    if (rotation) object.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    else if (mode === 'cone-cap') object.rotation.set(0, 0, 0);
    if (mode === 'cone-cap') {
      object.scale.set(scale / this.parentScale.x, scale / this.parentScale.y, scale / this.parentScale.z);
    } else object.scale.setScalar(scale);
    w.tubMoldTransfer?.align();
  }

  clearMold() {
    const w = this.w;
    w.tubMoldTransfer?.dock();
    if (w.giantBlockGroup.parent !== w.scene) { w.scene.updateMatrixWorld(true); w.scene.attach(w.giantBlockGroup); }
    w.giantBlockGroup.visible = false; w.giantBlockGroup.scale.setScalar(1); this.bucket.visible = false; this.bucket.scale.setScalar(1); this.mode = null;
  }

  handoffCone(owner) {
    const parent = owner === 'player' ? this.w.heldSocket : owner === 'vendor' ? this.w.lArmRig.handGroup : this.w.paddleGroup;
    this.w.scene.updateMatrixWorld(true);
    parent.attach(this.w.conePivot);
    this.coneOwner = owner;
    this.w.coneHeldByVendor = owner === 'vendor';
    this.coneRest.set(0, owner === 'player' ? .05 : owner === 'vendor' ? .11 : .02, owner === 'vendor' ? .035 : 0);
    this.coneMoving = true;
  }

  /** The same hollow outer wafer is nested, pinched by the player, or retrieved. */
  handoffOuterCone(owner = 'nested', visible = true) {
    const w = this.w, outer = w.outerConeGroup;
    if (!outer) return;
    const parent = owner === 'player' ? w.heldSocket : owner === 'vendor' ? w.lArmRig.handGroup : owner === 'paddle' ? w.paddleGroup : w.conePivot;
    if (outer.parent !== parent) { w.scene.updateMatrixWorld(true); parent.attach(outer); this.outerMoving = true; }
    this.outerOwner = owner; outer.visible = visible;
    this.outerRest.set(0, owner === 'nested' ? -.052 : owner === 'player' ? .05 : owner === 'paddle' ? .02 : .11, owner === 'nested' ? .008 : owner === 'vendor' ? .035 : 0);
    this.outerRotation.setFromEuler(new THREE.Euler(0, 0, owner === 'nested' ? .045 : 0));
    if(owner==='paddle')this.outerRotation.copy(parent.getWorldQuaternion(new THREE.Quaternion())).invert();
    if (!this.outerMoving) { outer.position.copy(this.outerRest); outer.quaternion.copy(this.outerRotation); }
    if (w.heldEmptyCone) w.heldEmptyCone.visible = false;
  }

  setScoop(mode = 'cone', worldPosition) {
    const w = this.w;
    // Keep food outside the rendered shaft, which follows its crown. Parenting
    // both to one corrected transform would create a circular attachment.
    const parent = mode === 'outer' ? w.outerConeGroup : mode === 'paddle' ? (worldPosition ? w.scene : w.paddleGroup) : w.conePivot;
    this.scoopOwner = mode;
    if (w.scoopStackGroup.parent !== parent) { w.scene.updateMatrixWorld(true); parent.attach(w.scoopStackGroup); this.scoopMoving = true; }
    this.scoopRest.set(0, mode === 'paddle' ? .020 : 0, 0);
    if (worldPosition) { parent.updateWorldMatrix(true, false); w.scoopStackGroup.position.copy(worldPosition); parent.worldToLocal(w.scoopStackGroup.position); this.scoopMoving = false; }
  }

  showSleeve({ visible = true, owner = 'vendor', position } = {}) {
    const parent = owner === 'player' ? this.w.heldSocket : this.w.conePivot;
    if (this.sleeve.parent !== parent) { this.w.scene.updateMatrixWorld(true); parent.attach(this.sleeve); this.sleeveMoving = true; }
    this.sleeveOwner = owner; this.sleeve.visible = visible;
    this.sleeveRest.set(0, owner === 'player' ? .07 : -.04, owner === 'player' ? -.015 : 0);
    if (position) { parent.updateWorldMatrix(true, false); this.sleeve.position.copy(position); parent.worldToLocal(this.sleeve.position); this.sleeveMoving = false; }
    else if (!this.sleeveMoving) this.sleeve.position.copy(this.sleeveRest);
  }

  setServingNapkin({ owner = 'vendor', peel = 0, visible = true, offset = null } = {}) {
    const w = this.w;
    // A wrapped serving is paper → outer wafer → inner wafer → ice.
    if(owner==='vendor'&&w.outerConeGroup?.visible&&w.outerConeGroup.parent===w.conePivot)owner='outer';
    const parent = owner === 'player' ? w.heldSocket : owner === 'outer' ? w.outerConeGroup : owner === 'vendor-hand' ? w.lArmRig.handGroup : w.conePivot;
    if (this.napkin.parent !== parent) {
      w.scene.updateMatrixWorld(true); parent.attach(this.napkin); this.napkinMoving = true;
    }
    if (this.napkinFlight) this.napkinFlight = false;
    this.napkinOwner = owner; this.napkin.visible = visible; this.napkinMaterial.opacity = 1;
    this.napkinPeelTarget = THREE.MathUtils.clamp(Number(peel) || 0, 0, 1);
    this.napkinRest.set(0, owner === 'player' ? .06 : owner === 'vendor-hand' ? .07 : owner === 'outer' ? -.045 : -.065, owner === 'player' ? -.018 : 0);
    if (offset) this.napkinRest.add(offset);
    if (!this.napkinMoving) this.napkin.position.copy(this.napkinRest);
    for (const old of [w.napkinConeProp, w.heldNapkinCone, w.napkinProp, w.heldNapkin]) if (old) old.visible = false;
  }

  clearServingNapkin({ discardDirection } = {}) {
    if (Number.isFinite(discardDirection) && this.napkin.visible) {
      this.w.scene.updateMatrixWorld(true); this.w.scene.attach(this.napkin);
      this.napkinVelocity.set((Math.sign(discardDirection) || 1) * .95, .52, -.12);
      this.napkinFlight = true; this.napkinMoving = false; this.napkinAge = 0; this.napkinPeelTarget = 1;
      return;
    }
    this.napkinRecovered=false;
    this.napkinFlight = false; this.napkinMoving = false; this.napkinAge = 0;
    this.w.conePivot.add(this.napkin); this.napkin.position.set(0, -.065, 0); this.napkin.rotation.set(0, 0, 0); this.napkin.scale.setScalar(1);
    this.napkin.visible = false; this.napkinOwner = 'vendor'; this.napkinPeel = this.napkinPeelTarget = 0; this.napkinMaterial.opacity = 1;
    this.updateNapkinSurface();
  }

  updateNapkinSurface() {
    const vertices = this.napkinGeometry.attributes.position, uv = this.napkinGeometry.attributes.uv;
    const p = this.napkinPeel;
    for (let i = 0; i < vertices.count; i++) {
      const u = uv.getX(i), v = uv.getY(i), theta = (u * 2 - 1) * Math.PI * .82;
      const wrapY = (v - .5) * .12;
      const cone=this.napkinOwner==='outer'?this.w.outerConeMesh:this.w.mainConeMesh;
      const geometry=cone?.geometry?.parameters;
      const height=geometry?.height*Math.abs(cone?.scale?.y??1);
      const coneRadius=geometry?.radius*Math.max(Math.abs(cone?.scale?.x??1),Math.abs(cone?.scale?.z??1));
      const y=this.napkinRest.y+wrapY,tip=(cone?.position?.y??-.06)-height*.5;
      // The old fixed sleeve was narrower than the outer wafer and disappeared
      // inside it. Follow the actual taper with a small physical clearance.
      const radius=height>0?Math.max(.004,coneRadius*(y-tip)/height+.003):.012+.038*v;
      const wrapX = Math.sin(theta) * radius, wrapZ = Math.cos(theta) * radius;
      const flutter = Math.sin(this.napkinAge * 11 + u * 8 + v * 5) * .005 * (1 - v) * p;
      const flatX = (u - .82) * .19;
      const flatY = (v - .92) * .15 - .022 * (1 - v) ** 2;
      const flatZ = Math.sin(u * Math.PI * 3) * .005 * (1 - v) + flutter;
      vertices.setXYZ(i, THREE.MathUtils.lerp(wrapX, flatX, p), THREE.MathUtils.lerp(wrapY, flatY, p), THREE.MathUtils.lerp(wrapZ, flatZ, p));
    }
    vertices.needsUpdate = true; this.napkinGeometry.computeVertexNormals();
  }

  updateServingNapkin(dt, blend) {
    if (!this.napkin.visible) return;
    this.napkinAge += Math.max(0, dt);
    this.napkinPeel += (this.napkinPeelTarget - this.napkinPeel) * (1 - Math.exp(-Math.max(0, dt) * 12));
    if (this.napkinFlight) {
      this.napkinVelocity.y -= 1.6 * dt;
      this.napkin.position.addScaledVector(this.napkinVelocity, dt);
      this.napkin.rotation.z += Math.sign(this.napkinVelocity.x) * dt * 2.3;
      this.napkin.rotation.x += dt * 1.7;
      this.napkinMaterial.opacity = this.napkinAge < .55 ? 1 : Math.max(0, (.9 - this.napkinAge) / .35);
      if (this.napkinAge >= .9) { this.clearServingNapkin(); return; }
    } else if (this.napkinMoving) {
      this.napkin.position.lerp(this.napkinRest, blend);
      this.napkin.quaternion.slerp(this.identity, blend);
      if (this.napkin.position.distanceToSquared(this.napkinRest) < .000001) this.napkinMoving = false;
    }
    this.updateNapkinSurface();
  }

  triggerCounterImpact(point, power = 1) {
    this.impactPoint.copy(point); this.impactPower = THREE.MathUtils.clamp(power, .2, 1.5); this.impactAge = 0; this.impactGroup.visible = true;
  }

  updateCounterImpact(dt) {
    if (!this.impactGroup.visible) return;
    this.impactAge += Math.max(0, dt);
    const p = Math.min(1, this.impactAge / .24);
    this.impactMaterial.opacity = (1 - p) * .22 * this.impactPower;
    for (let i = 0; i < this.impactMotes.length; i++) {
      const angle = i * Math.PI * .5;
      this.impactMotes[i].position.set(this.impactPoint.x + Math.cos(angle) * p * .018, this.impactPoint.y + .004 + Math.sin(p * Math.PI) * .012, this.impactPoint.z + Math.sin(angle) * p * .018);
      this.impactMotes[i].scale.setScalar(1 + p * .8);
    }
    if (this.w.basinDeckGroup) this.w.basinDeckGroup.position.y = .94 + Math.sin(this.impactAge * 95) * .0012 * this.impactPower * (1 - p);
    if (p >= 1) { this.impactGroup.visible = false; if (this.w.basinDeckGroup) this.w.basinDeckGroup.position.y = .94; }
  }

  clearSlice() { this.sliceAge = this.sliceDuration; this.sliceGroup.visible = false; }

  resetTransient() {
    this.clearServingNapkin();
    this.clearSlice();
    this.clear();
    this.impactAge = 1; this.impactGroup.visible = false;
    if (this.w.basinDeckGroup) this.w.basinDeckGroup.position.y = .94;
  }

  clear() {
    this.w.scoopInFlight = false;
    this.w.vendorPoleFree = false;
    this.w.vendorConeReceiveProgress = null;
    this.w.vendorConeReceiveFrom = null;
    this.scoopOwner = 'cone';
    this.coneMoving = false;
    this.outerMoving = false; this.outerOwner = 'nested';
    this.clearMold();
    const w = this.w;
    if (w.outerConeGroup) {
      w.conePivot.add(w.outerConeGroup); w.outerConeGroup.position.set(0, -.052, .008); w.outerConeGroup.rotation.set(0, 0, .045); w.outerConeGroup.scale.setScalar(1); w.outerConeGroup.visible = false;
    }
    w.conePivot.add(w.scoopStackGroup); w.scoopStackGroup.position.set(0, 0, 0); w.scoopStackGroup.rotation.set(0, 0, 0); this.scoopMoving = false;
    w.scoopStackGroup.scale.setScalar(1);
    w.conePivot.add(this.sleeve); this.sleeve.position.set(0, -.04, 0); this.sleeve.rotation.set(0, 0, 0); this.sleeve.visible = false; this.sleeveOwner = 'vendor'; this.sleeveMoving = false;
    if (!this.napkinFlight && !(this.napkinRecovered && this.napkinOwner==='vendor' && this.napkin.visible)) this.clearServingNapkin();
  }

  update(dt) {
    this.updateSlice(dt);
    const blend = 1 - Math.exp(-Math.max(0, dt) * 16);
    this.updateServingNapkin(dt, blend);
    this.updateCounterImpact(dt);
    if (this.coneMoving) {
      const parent = this.coneOwner === 'player' ? this.w.heldSocket : this.coneOwner === 'vendor' ? this.w.lArmRig.handGroup : this.w.paddleGroup;
      if (this.w.conePivot.parent !== parent) this.coneMoving = false;
      else {
        this.w.conePivot.position.lerp(this.coneRest, blend);
        if (this.coneOwner === 'player') this.w.conePivot.quaternion.slerp(this.identity, blend);
        if (this.w.conePivot.position.distanceToSquared(this.coneRest) < .000001) this.coneMoving = false;
      }
    }
    if (this.outerMoving || (this.outerOwner==='paddle'&&this.w.outerConeGroup.parent===this.w.paddleGroup)) {
      const outer = this.w.outerConeGroup;
      if(this.outerOwner==='paddle')this.outerRotation.copy(outer.parent.getWorldQuaternion(new THREE.Quaternion())).invert();
      outer.position.lerp(this.outerRest, blend); outer.quaternion.slerp(this.outerRotation, blend);
      if (outer.position.distanceToSquared(this.outerRest) < .000001) this.outerMoving = false;
    }
    if (this.scoopMoving) {
      this.w.scoopStackGroup.position.lerp(this.scoopRest, blend);
      this.w.scoopStackGroup.quaternion.slerp(this.identity, blend);
      if (this.w.scoopStackGroup.position.distanceToSquared(this.scoopRest) < .000001) this.scoopMoving = false;
    }
    if (this.sleeveMoving) {
      this.sleeve.position.lerp(this.sleeveRest, blend); this.sleeve.quaternion.slerp(this.identity, blend);
      if (this.sleeve.position.distanceToSquared(this.sleeveRest) < .000001) this.sleeveMoving = false;
    }
  }
}
