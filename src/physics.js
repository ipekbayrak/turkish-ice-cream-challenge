import * as THREE from 'three';
import {createDeformingTube,updateDeformingTube} from './deforming-tube.js';

/**
 * 2nd-Order Underdamped Spring-Damper Solver for 3D Vectors
 * Simulates mass, inertia, velocity overshoot, and elastic restoration.
 */
export class SpringVec3 {
  constructor(x = 0, y = 0, z = 0, stiffness = 180, damping = 16) {
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.target = new THREE.Vector3(x, y, z);
    this.stiffness = stiffness;
    this.damping = damping;
  }

  impulse(ix, iy, iz) {
    this.vel.x += ix;
    this.vel.y += iy;
    this.vel.z += iz;
  }

  step(dt) {
    const steps = 2;
    const h = Math.min(dt, 0.033) / steps;
    for (let i = 0; i < steps; i++) {
      const fx =
        -this.stiffness * (this.pos.x - this.target.x) -
        this.damping * this.vel.x;
      const fy =
        -this.stiffness * (this.pos.y - this.target.y) -
        this.damping * this.vel.y;
      const fz =
        -this.stiffness * (this.pos.z - this.target.z) -
        this.damping * this.vel.z;

      this.vel.x += fx * h;
      this.vel.y += fy * h;
      this.vel.z += fz * h;

      this.pos.x += this.vel.x * h;
      this.pos.y += this.vel.y * h;
      this.pos.z += this.vel.z * h;
    }
    return this.pos;
  }
}

/**
 * Multi-Strand Viscoelastic Verlet Rope / Taffy Solver
 * Simulates the famous super-stretchy Kahramanmaraş Dövme Dondurma (salep + mastic)
 * with a thick primary ribbon + two satellite elastic strands when pulling giant blocks!
 */
export class StretchyDondurmaStrand {
  constructor(scene, nodeCount = 14) {
    this.scene = scene;
    this.nodeCount = nodeCount;
    this.nodes = [];
    this.prevNodes = [];
    this.active = false;
    this.multiStrandMode = false;
    this.twistPhase = 0;
    this.handPressure = null;
    this.pressureOffset = new THREE.Vector3();
    this.pressureZero = new THREE.Vector3();
    this.pressureAt = .5;
    this.appliedPressure = Array.from({ length: nodeCount }, () => new THREE.Vector3());

    for (let i = 0; i < nodeCount; i++) {
      this.nodes.push(new THREE.Vector3(0, 1.1, 0));
      this.prevNodes.push(new THREE.Vector3(0, 1.1, 0));
    }

    this.material = new THREE.MeshStandardMaterial({
      color: 0xfff8eb,
      roughness: 0.28,
      metalness: 0.04,
    });

    this.curve = new THREE.CatmullRomCurve3(this.nodes);
    this.mesh = new THREE.Mesh(
      createDeformingTube(this.curve, 24, 0.038, 10),
      this.material
    );
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    this.scene.add(this.mesh);

    // Secondary satellite strands for Giant 5-Kilo Block extraction
    this.subMeshes = [];
    this.subNodes=Array.from({length:2},()=>this.nodes.map(node=>node.clone()));
    this.subCurves=this.subNodes.map(nodes=>new THREE.CatmullRomCurve3(nodes));
    for (let s = 0; s < 2; s++) {
      const sm = new THREE.Mesh(
        createDeformingTube(this.subCurves[s], 16, 0.018, 6),
        this.material
      );
      sm.visible = false;
      this.scene.add(sm);
      this.subMeshes.push(sm);
    }
  }

  attach(startPos, endPos, hexColor = null, multiStrand = false) {
    if (hexColor !== null) {
      this.material.color.setHex(hexColor);
    }
    this.multiStrandMode = Boolean(multiStrand);
    if (!this.active) {
      this.active = true;
      this.mesh.visible = true;
      for (let i = 0; i < this.nodeCount; i++) {
        const t = i / (this.nodeCount - 1);
        this.nodes[i].lerpVectors(startPos, endPos, t);
        this.prevNodes[i].copy(this.nodes[i]);
      }
    }
    this.subMeshes.forEach((sm) => {
      sm.visible = this.active && this.multiStrandMode;
    });
  }

  setColor(hexColor) {
    this.material.color.setHex(hexColor);
  }

  detach() {
    this.active = false;
    this.multiStrandMode = false;
    this.mesh.visible = false;
    this.subMeshes.forEach((sm) => {
      sm.visible = false;
    });
    this.handPressure = null;
    this.pressureOffset.set(0, 0, 0);
    this.appliedPressure.forEach(offset => offset.set(0, 0, 0));
  }

  /** A hand bows the same visible rope; endpoints stay in their real sockets. */
  setHandPressure(contact) {
    if (contact) this.pressureAt = THREE.MathUtils.clamp(contact.t ?? .5, .12, .88);
    this.handPressure = contact ? {
      t: THREE.MathUtils.clamp(contact.t ?? .5, .12, .88),
      offset: contact.offset.clone().clampLength(0, .14),
    } : null;
  }

  update(dt, startAnchor, endAnchor, thicknessScale = 1.0, swirlAmount = 0) {
    if (!this.active) return;

    this.twistPhase += dt * (4.5 + swirlAmount * 6);
    const h = Math.min(dt, 0.025);
    const gravity = -5.8;
    const totalDist = startAnchor.distanceTo(endAnchor);
    const segLen = Math.max(0.018, (totalDist * 0.88) / (this.nodeCount - 1));

    // Remove last frame's authored pressure before integrating, so holding a
    // finger still cannot add energy or inflate the strand indefinitely.
    for (let i = 1; i < this.nodeCount - 1; i++) {
      this.nodes[i].sub(this.appliedPressure[i]);
      this.prevNodes[i].sub(this.appliedPressure[i]);
      this.appliedPressure[i].set(0, 0, 0);
    }

    // Verlet integration for interior nodes with elastic whip & swirl
    for (let i = 1; i < this.nodeCount - 1; i++) {
      const cur = this.nodes[i];
      const prev = this.prevNodes[i];
      const vx = (cur.x - prev.x) * 0.93;
      const vy = (cur.y - prev.y) * 0.93;
      const vz = (cur.z - prev.z) * 0.93;

      prev.copy(cur);
      const midWeight = Math.sin((i / (this.nodeCount - 1)) * Math.PI);
      cur.x += vx + Math.cos(this.twistPhase + i * 0.5) * swirlAmount * 0.008 * midWeight;
      cur.y += vy + gravity * h * h;
      cur.z += vz + Math.sin(this.twistPhase + i * 0.5) * swirlAmount * 0.008 * midWeight;
    }

    this.nodes[0].copy(startAnchor);
    this.nodes[this.nodeCount - 1].copy(endAnchor);

    // 7 constraint iterations for authentic dense Maraş salep tension
    for (let iter = 0; iter < 7; iter++) {
      this.nodes[0].copy(startAnchor);
      this.nodes[this.nodeCount - 1].copy(endAnchor);

      for (let i = 0; i < this.nodeCount - 1; i++) {
        const n1 = this.nodes[i];
        const n2 = this.nodes[i + 1];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dz = n2.z - n1.z;
        const d = Math.hypot(dx, dy, dz) || 0.0001;
        const diff = (d - segLen) / d;

        if (i === 0) {
          n2.x -= dx * diff;
          n2.y -= dy * diff;
          n2.z -= dz * diff;
        } else if (i + 1 === this.nodeCount - 1) {
          n1.x += dx * diff;
          n1.y += dy * diff;
          n1.z += dz * diff;
        } else {
          n1.x += dx * diff * 0.5;
          n1.y += dy * diff * 0.5;
          n1.z += dz * diff * 0.5;
          n2.x -= dx * diff * 0.5;
          n2.y -= dy * diff * 0.5;
          n2.z -= dz * diff * 0.5;
        }
      }
    }

    const pressureTarget = this.handPressure?.offset || this.pressureZero;
    this.pressureOffset.lerp(pressureTarget, 1 - Math.exp(-dt * 18));
    const pressureAt = this.pressureAt;
    for (let i = 1; i < this.nodeCount - 1; i++) {
      const t = i / (this.nodeCount - 1);
      const weight = Math.exp(-(((t - pressureAt) / .19) ** 2)) * Math.sin(t * Math.PI);
      this.appliedPressure[i].copy(this.pressureOffset).multiplyScalar(weight);
      this.nodes[i].add(this.appliedPressure[i]);
      this.prevNodes[i].add(this.appliedPressure[i]);
    }
    let bowedLength = 0;
    for (let i = 1; i < this.nodeCount; i++) bowedLength += this.nodes[i].distanceTo(this.nodes[i - 1]);
    const radius = Math.max(
      0.015,
      (0.044 * thicknessScale) / (Math.max(1, bowedLength * 1.15) * (1 + this.pressureOffset.length() * 3))
    );
    updateDeformingTube(this.mesh.geometry,this.curve,radius);

    if (this.multiStrandMode) {
      this.subMeshes.forEach((sm, idx) => {
        sm.visible = true;
        const sign = idx === 0 ? -1 : 1;
        this.nodes.forEach((pt, ni) => {
          const env = Math.sin((ni / (this.nodeCount - 1)) * Math.PI);
          const angle = this.twistPhase * 1.3 + ni * 0.45 + idx * Math.PI;
          this.subNodes[idx][ni].set(
            pt.x + (sign * 0.055 + Math.cos(angle) * 0.025) * env,
            pt.y - 0.025 * env,
            pt.z + Math.sin(angle) * 0.025 * env
          );
        });
        updateDeformingTube(sm.geometry,this.subCurves[idx],radius*.52);
      });
    } else {
      this.subMeshes.forEach((sm) => {
        sm.visible = false;
      });
    }
  }
}

/**
 * 3D Rigid-Body Projectile & Ballistic Manager
 * Handles thrown empty cones, tossed napkins, and flying ice cream scoops with gravity & cart/floor bounce!
 */
export class RigidBodyManager {
  constructor(scene, onBounceCallback = null) {
    this.scene = scene;
    this.bodies = [];
    this.onBounce = onBounceCallback;
  }

  spawnThrownObject(meshClone, startPos, linearVel, angularVel, radius = 0.06) {
    meshClone.position.copy(startPos);
    meshClone.visible = true;
    this.scene.add(meshClone);

    this.bodies.push({
      mesh: meshClone,
      vel: linearVel.clone(),
      angVel: angularVel.clone(),
      radius,
      life: 2.6,
      bounces: 0,
      type: 'debris',
    });
  }

  spawnFlyingScoop(color, startPos, getTargetPosFn, onLandCallback) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.064, 18, 14),
      new THREE.MeshStandardMaterial({ color, roughness: 0.35 })
    );
    mesh.position.copy(startPos);
    mesh.castShadow = true;
    this.scene.add(mesh);

    this.bodies.push({
      mesh,
      startPos: startPos.clone(),
      getTargetPosFn,
      onLandCallback,
      t: 0,
      duration: 0.44,
      type: 'scoop_arc',
    });
  }

  update(dt) {
    const gravity = -9.81;

    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i];

      if (b.type === 'scoop_arc') {
        b.t += dt / b.duration;
        if (b.t >= 1) {
          this.scene.remove(b.mesh);
          this.bodies.splice(i, 1);
          // This temporary scoop owns its buffers; thrown prop clones do not.
          b.mesh.geometry.dispose();b.mesh.material.dispose();
          const onLand=b.onLandCallback;b.onLandCallback=null;b.getTargetPosFn=null;
          if (onLand) onLand();
          continue;
        }
        const target = b.getTargetPosFn();
        b.mesh.position.lerpVectors(b.startPos, target, b.t);
        b.mesh.position.y += Math.sin(b.t * Math.PI) * 0.38;
        b.mesh.rotation.x += dt * 12;
        const stretch = 1 + Math.cos(b.t * Math.PI) * 0.22;
        b.mesh.scale.set(
          1 / Math.sqrt(stretch),
          stretch,
          1 / Math.sqrt(stretch)
        );
        continue;
      }

      b.life -= dt;
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        this.bodies.splice(i, 1);
        continue;
      }

      b.vel.y += gravity * dt;
      b.vel.multiplyScalar(0.992);
      b.mesh.position.addScaledVector(b.vel, dt);

      b.mesh.rotation.x += b.angVel.x * dt;
      b.mesh.rotation.y += b.angVel.y * dt;
      b.mesh.rotation.z += b.angVel.z * dt;

      const pos = b.mesh.position;
      if (
        pos.y - b.radius < 0.97 &&
        pos.y > 0.82 &&
        Math.abs(pos.x) < 0.9 &&
        pos.z > -0.75 &&
        pos.z < 0.02 &&
        b.vel.y < 0
      ) {
        pos.y = 0.97 + b.radius;
        b.vel.y = -b.vel.y * 0.55;
        b.vel.x *= 0.78;
        b.vel.z += 0.6;
        b.bounces++;
        if (b.bounces <= 2 && this.onBounce) this.onBounce('cart');
      }

      if (pos.y - b.radius < 0 && b.vel.y < 0) {
        pos.y = b.radius;
        b.vel.y = -b.vel.y * 0.45;
        b.vel.x *= 0.72;
        b.vel.z *= 0.72;
        b.angVel.multiplyScalar(0.65);
        b.bounces++;
        if (b.bounces === 1 && this.onBounce) this.onBounce('floor');
      }

      if (b.life < 0.4) {
        b.mesh.scale.setScalar(Math.max(0.01, b.life / 0.4));
      }
    }
  }
}
