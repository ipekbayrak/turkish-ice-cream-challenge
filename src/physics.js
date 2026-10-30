import * as THREE from 'three';

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
    // Sub-step for numerical stability at high stiffness
    const steps = 2;
    const h = Math.min(dt, 0.033) / steps;
    for (let i = 0; i < steps; i++) {
      const fx = -this.stiffness * (this.pos.x - this.target.x) - this.damping * this.vel.x;
      const fy = -this.stiffness * (this.pos.y - this.target.y) - this.damping * this.vel.y;
      const fz = -this.stiffness * (this.pos.z - this.target.z) - this.damping * this.vel.z;

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
 * Viscoelastic Verlet Rope / Ribbon Solver
 * Simulates the famous stretchy Kahramanmaraş Dövme Dondurma strand between two 3D anchors!
 */
export class StretchyDondurmaStrand {
  constructor(scene, nodeCount = 10) {
    this.scene = scene;
    this.nodeCount = nodeCount;
    this.nodes = [];
    this.prevNodes = [];
    this.active = false;

    for (let i = 0; i < nodeCount; i++) {
      this.nodes.push(new THREE.Vector3(0, 1.1, 0));
      this.prevNodes.push(new THREE.Vector3(0, 1.1, 0));
    }

    this.curve = new THREE.CatmullRomCurve3(this.nodes);
    this.mesh = new THREE.Mesh(
      new THREE.TubeGeometry(this.curve, 20, 0.032, 8, false),
      new THREE.MeshStandardMaterial({
        color: 0xfff8eb,
        roughness: 0.32,
        metalness: 0.05,
      })
    );
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    this.scene.add(this.mesh);
  }

  attach(startPos, endPos, hexColor = null) {
    if (hexColor !== null) {
      this.mesh.material.color.setHex(hexColor);
    }
    if (!this.active) {
      this.active = true;
      this.mesh.visible = true;
      for (let i = 0; i < this.nodeCount; i++) {
        const t = i / (this.nodeCount - 1);
        this.nodes[i].lerpVectors(startPos, endPos, t);
        this.prevNodes[i].copy(this.nodes[i]);
      }
    }
  }

  setColor(hexColor) {
    this.mesh.material.color.setHex(hexColor);
  }

  detach() {
    this.active = false;
    this.mesh.visible = false;
  }

  update(dt, startAnchor, endAnchor, thicknessScale = 1.0) {
    if (!this.active) return;

    const h = Math.min(dt, 0.025);
    const gravity = -6.5;
    const totalDist = startAnchor.distanceTo(endAnchor);
    const segLen = Math.max(0.02, (totalDist * 0.92) / (this.nodeCount - 1));

    // Verlet integration for interior nodes
    for (let i = 1; i < this.nodeCount - 1; i++) {
      const cur = this.nodes[i];
      const prev = this.prevNodes[i];
      const vx = (cur.x - prev.x) * 0.92;
      const vy = (cur.y - prev.y) * 0.92;
      const vz = (cur.z - prev.z) * 0.92;

      prev.copy(cur);
      cur.x += vx;
      cur.y += vy + gravity * h * h;
      cur.z += vz;
    }

    // Pin endpoints
    this.nodes[0].copy(startAnchor);
    this.nodes[this.nodeCount - 1].copy(endAnchor);

    // Distance constraints relaxation (6 iterations for tight viscoelastic feel)
    for (let iter = 0; iter < 6; iter++) {
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

    // Rebuild smooth viscoelastic tube geometry
    const radius = Math.max(0.012, (0.036 * thicknessScale) / Math.max(1, totalDist * 1.35));
    this.mesh.geometry.dispose();
    this.curve = new THREE.CatmullRomCurve3(this.nodes);
    this.mesh.geometry = new THREE.TubeGeometry(this.curve, 18, radius, 8, false);
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

  // Ballistic scoop flight from copper tub onto the cone tip!
  spawnFlyingScoop(color, startPos, getTargetPosFn, onLandCallback) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.062, 18, 14),
      new THREE.MeshStandardMaterial({ color, roughness: 0.38 })
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
      duration: 0.42,
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
          if (b.onLandCallback) b.onLandCallback();
          continue;
        }
        const target = b.getTargetPosFn();
        b.mesh.position.lerpVectors(b.startPos, target, b.t);
        // Parabolic arc height
        b.mesh.position.y += Math.sin(b.t * Math.PI) * 0.36;
        // Squash & stretch in flight
        const stretch = 1 + Math.cos(b.t * Math.PI) * 0.22;
        b.mesh.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
        continue;
      }

      // Standard Rigid Body with Gravity, Air Drag & Cart/Floor Collision
      b.life -= dt;
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        this.bodies.splice(i, 1);
        continue;
      }

      b.vel.y += gravity * dt;
      b.vel.multiplyScalar(0.992); // Air drag
      b.mesh.position.addScaledVector(b.vel, dt);

      b.mesh.rotation.x += b.angVel.x * dt;
      b.mesh.rotation.y += b.angVel.y * dt;
      b.mesh.rotation.z += b.angVel.z * dt;

      // Check collision with Copper Cart Countertop (y = 0.97, x in [-0.9, 0.9], z in [-0.75, 0])
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

      // Check collision with Cobblestone Floor (y = 0)
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
