import * as THREE from 'three';

/**
 * Celebratory POV "Eat the Ice Cream" payoff at the end of a victorious round.
 *
 * Brings the caught cone in `world.heldSocket` toward the player's mouth POV,
 * lets the player tap/click (or auto-bites after 1.35s so passive viewers also
 * get the payoff), plays crisp wafer/pistachio crunch + crumb bursts, indents
 * the top scoop, dips the camera in a satisfied nod, and invokes `onComplete`.
 */
export class ConeBiteFinale {
  constructor({ world, sound, onBite = null, onComplete = null } = {}) {
    this.world = world;
    this.sound = sound;
    this.onBite = typeof onBite === 'function' ? onBite : null;
    this.onComplete = typeof onComplete === 'function' ? onComplete : null;

    this.active = false;
    this.resultData = null;
    this.elapsed = 0;
    this.bitesTaken = 0;
    this.maxBites = 2;
    this.finishTimer = 0;
    this.finishing = false;
    this.nodEnergy = 0;
    this._savedHandPos = new THREE.Vector3();
    this._savedConePos = new THREE.Vector3();
    this._savedConeRot = new THREE.Euler();
    this._bittenMeshes = [];
  }

  start(resultData, { scoopCount = 2 } = {}) {
    if (!this.world) {
      this.onComplete?.(resultData);
      return false;
    }
    this.active = true;
    this.resultData = resultData;
    this.elapsed = 0;
    this.bitesTaken = 0;
    this.maxBites = scoopCount >= 2 ? 2 : 1;
    this.finishTimer = 0;
    this.finishing = false;
    this.nodEnergy = 0;
    this._bittenMeshes = [];

    if (this.world.touristHand) {
      this._savedHandPos.copy(this.world.touristHand.position);
    }
    if (this.world.conePivot) {
      this._savedConePos.copy(this.world.conePivot.position);
      this._savedConeRot.copy(this.world.conePivot.rotation);
    }
    this.world.setVendorMood?.('smile');
    return true;
  }

  triggerBite() {
    if (!this.active || this.finishing) return false;
    this.bitesTaken++;
    this.nodEnergy = 1.0;
    this.sound?.playConeBite?.(0);

    // Find topmost unbitten visible scoop mesh to indent like a real bite!
    const meshes = this.world?.scoopMeshes || [];
    let targetMesh = null;
    for (let i = meshes.length - 1; i >= 0; i--) {
      const m = meshes[i];
      if (m && m.visible && !this._bittenMeshes.some((entry) => entry.mesh === m)) {
        targetMesh = m;
        break;
      }
    }
    if (!targetMesh && meshes[0]?.visible) {
      targetMesh = meshes[0];
    }

    const burstPos = new THREE.Vector3(0, 1.34, 0.42);
    if (targetMesh) {
      this._bittenMeshes.push({
        mesh: targetMesh,
        origScale: targetMesh.scale.clone(),
      });
      targetMesh.scale.set(
        targetMesh.scale.x * 0.64,
        targetMesh.scale.y * 0.52,
        targetMesh.scale.z * 0.62
      );
      if (typeof targetMesh.getWorldPosition === 'function') {
        targetMesh.getWorldPosition(burstPos);
      }
    } else if (this.world?.conePivot?.getWorldPosition) {
      this.world.conePivot.getWorldPosition(burstPos);
    }

    // Pistachio green + waffle golden crumbs
    this.world?.spawnBurst?.(burstPos, 0x80ed99, 12);
    this.world?.spawnBurst?.(burstPos, 0xf4c97a, 10);
    this.onBite?.(this.bitesTaken);

    if (this.bitesTaken >= this.maxBites) {
      this.finishing = true;
      this.finishTimer = 0.52;
    }
    return true;
  }

  update(dt) {
    if (!this.active) return false;
    const stepDt = Math.min(0.1, Math.max(0, Number(dt) || 0));
    this.elapsed += stepDt;

    // Smoothly bring the caught cone toward the player's mouth in POV
    const approach = THREE.MathUtils.smoothstep(Math.min(1, this.elapsed / 0.38), 0, 1);
    if (this.world?.touristHand) {
      const targetX = THREE.MathUtils.lerp(this._savedHandPos.x, 0.03, approach);
      const targetY = THREE.MathUtils.lerp(this._savedHandPos.y, 1.24, approach);
      const targetZ = THREE.MathUtils.lerp(this._savedHandPos.z, 0.46, approach);
      this.world.touristHand.position.set(targetX, targetY, targetZ);
    }
    if (this.world?.conePivot) {
      this.world.conePivot.rotation.x = THREE.MathUtils.lerp(0, 0.28, approach);
    }

    if (this.nodEnergy > 0) {
      this.nodEnergy = Math.max(0, this.nodEnergy - stepDt * 3.6);
    }

    // Crisp celebratory bite without stalling the win modal or bouncing the camera
    if (!this.finishing && this.bitesTaken === 0 && this.elapsed >= 0.52) {
      this.triggerBite();
    } else if (!this.finishing && this.bitesTaken > 0 && this.elapsed >= 0.88) {
      this.finishing = true;
      this.finishTimer = 0.22;
    }

    if (this.finishing) {
      this.finishTimer -= stepDt;
      if (this.finishTimer <= 0) {
        const payload = this.resultData;
        this.cancel({ restoreScoops: true });
        this.onComplete?.(payload);
        return false;
      }
    }
    return true;
  }

  cancel({ restoreScoops = true } = {}) {
    if (!this.active) return;
    this.active = false;
    this.finishing = false;
    if (restoreScoops) {
      for (const { mesh, origScale } of this._bittenMeshes) {
        mesh.scale.copy(origScale);
      }
    }
    this._bittenMeshes.length = 0;
    if (this.world?.conePivot) {
      this.world.conePivot.position.copy(this._savedConePos);
      this.world.conePivot.rotation.copy(this._savedConeRot);
    }
  }
}
