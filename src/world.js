import {PLAYER_UPPER_ARM_LENGTH,PLAYER_FOREARM_LENGTH,constrainPlayerArmDepth} from './player-arm.js';
import {VendorHandBlend} from './vendor-hand-blend.js';
import {CollectedCones} from './collected-cones.js';
import {poleHasFood} from './pole-hygiene.js';
import { createIceBumpTexture } from './ice-surface.js';
import * as THREE from 'three';
import {
  SpringVec3,
  StretchyDondurmaStrand,
  RigidBodyManager,
} from './physics.js';
import { ICE_CREAM_FLAVORS } from './protocol.js';
import { distanceToSegment } from './grip.js';
import { AngularMotion } from './angular-motion.js';
import { buildStallDecor } from './stall-decor.js';
import { StallEffects } from './stall-effects.js';
import { MAX_SCOOPS, VENUES } from './venues.js';
import { CulturalScene } from './cultural-scene.js';
import { CULTURAL_DETAILS } from './cultural-details.js';
import { StretchCutView } from './stretch-cut-view.js';
import { buildConeRack } from './cone-rack.js';
import { HandRig, HAND_GRIP_CENTER, handGripCenter, fitPlayerForearm } from './hand-rig.js';
import { canonicalPoleHandRotation, poleContactRotation, restHandRotation, playerFreeHandRotation } from './hand-orientation.js';
import { applyPlayerConeGrip, playerOwnsCone, playerConeGripTarget, applyVendorConeGrip, applyVendorPaperGrip, captureVendorHandPose, applyVendorReceivingGrip, orientVendorHeldCone } from './cone-grip.js';
import { VendorArmSolver } from './vendor-arm-solver.js';
import { VendorSupportReach } from './vendor-support-reach.js';
import { PoleContact } from './pole-contact.js';
import { buildOpenCounterBase, buildShopInterior, shopCameraProfile } from './shop-interior.js';
import { VendorBody } from './vendor-body.js';
import { resizeRenderer } from './render-size.js';
import { batchIceCreamCart } from './static-batch.js';
import { ServingClearance } from './serving-clearance.js';
import { ServingOrientation } from './serving-orientation.js';
import { TubMoldTransfer, tubMoldSeat, createBucketDeckGeometry } from './tub-mold.js';

import { CLASSIC_SCOOP_LAYOUT, LARGE_SCOOP_LAYOUT } from './scoop-layout.js';

// Polyfill CanvasRenderingContext2D.prototype.roundRect for older iOS Safari (< 16.0)
if (
  typeof CanvasRenderingContext2D !== 'undefined' &&
  !CanvasRenderingContext2D.prototype.roundRect
) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    const r = Math.min(
      typeof radii === 'number'
        ? radii
        : Array.isArray(radii)
          ? radii[0] || 0
          : 0,
      w * 0.5,
      h * 0.5
    );
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

export class GameWorld {
  constructor(canvas, onPhysicsBounce = null) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x140805);
    this.scene.fog = new THREE.FogExp2(0x140805, 0.072);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.05,
      40
    );
    const framing=shopCameraProfile(window.innerWidth,window.innerHeight);
    this.baseCamPos = new THREE.Vector3(...framing.position);
    this.baseCamTarget = new THREE.Vector3(...framing.target);
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(this.baseCamTarget);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this._renderSize=resizeRenderer(this.renderer,window.innerWidth,window.innerHeight,Math.min(window.devicePixelRatio||1,2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.bells = [];
    this.lanterns = [];
    this.particles = [];
    this.frostMotes = [];
    this.spectators = [];
    this.tubMeshes = [];

    // Smooth, natural-weight 3D Physics Solvers
    this.handSpring = new SpringVec3(0.22, 1.08, 0.62, 135, 18);
    this.coneSpring = new SpringVec3(0, 1.24, 0.22, 72, 15);
    this.scoopJiggleSpring = new SpringVec3(0, 0, 0, 220, 14);
    this.leftPropSpring = new SpringVec3(0.24, 1.22, -0.25, 88, 16);
    this.prevConePos = new THREE.Vector3(0, 1.24, 0.22);

    this.blinkTimer = 2.5;
    this.isBlinking = false;
    this.vendorMood = 'smile';
    this.spectatorReactionTimer = 0;
    this.spectatorReactionType = 'idle';

    this._createTextures();
    this._setupLights();
    this._buildBazaarEnvironment();
    this._buildIceCreamCart();
    this._buildPaddleAndCones();
    this._buildVendor();
    this._buildBazaarSpectators();
    this._buildTouristPOVHand();
    this._buildDiegetic3DCues();

    this.stretchyStrand = new StretchyDondurmaStrand(this.scene, 14);
    this.rigidBodies = new RigidBodyManager(this.scene, onPhysicsBounce);
    this.stallDecor = buildStallDecor(this.scene);
    this.stallEffects = new StallEffects(this);
    this.culturalScene = new CulturalScene(this, CULTURAL_DETAILS);
    this.setNarrativeState({});
    this.setVenue(VENUES[0]);

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.onResize(), 80);
    });
    window.visualViewport?.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  _createTextures() {
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 1024;
    signCanvas.height = 512;
    const sctx = signCanvas.getContext('2d');

    const grad = sctx.createLinearGradient(0, 0, 1024, 512);
    grad.addColorStop(0, '#7c3219');
    grad.addColorStop(0.5, '#b8572a');
    grad.addColorStop(1, '#6e2a14');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 1024, 512);

    for (let i = 0; i < 520; i++) {
      sctx.fillStyle =
        i % 2 === 0 ? 'rgba(255,210,150,0.06)' : 'rgba(30,10,4,0.08)';
      sctx.beginPath();
      sctx.arc(
        Math.random() * 1024,
        Math.random() * 512,
        6 + Math.random() * 14,
        0,
        Math.PI * 2
      );
      sctx.fill();
    }

    sctx.strokeStyle = '#f5b942';
    sctx.lineWidth = 14;
    sctx.strokeRect(24, 24, 976, 464);

    sctx.fillStyle = '#6e0d14';
    sctx.beginPath();
    sctx.roundRect(90, 80, 844, 352, 36);
    sctx.fill();
    sctx.strokeStyle = '#f5b942';
    sctx.lineWidth = 8;
    sctx.stroke();

    sctx.fillStyle = '#ffd97d';
    sctx.font = '900 52px Georgia, serif';
    sctx.textAlign = 'center';
    sctx.fillText('MEŞHUR KAHRAMANMARAŞ', 512, 195);

    sctx.fillStyle = '#ffffff';
    sctx.font = '900 72px Georgia, serif';
    sctx.fillText('DÖVME DONDURMA', 512, 305);

    this.cartSignTexture = new THREE.CanvasTexture(signCanvas);
    this.cartSignTexture.colorSpace = THREE.SRGBColorSpace;

    const coneCanvas = document.createElement('canvas');
    coneCanvas.width = 256;
    coneCanvas.height = 256;
    const cctx = coneCanvas.getContext('2d');
    cctx.fillStyle = '#d48c46';
    cctx.fillRect(0, 0, 256, 256);
    cctx.strokeStyle = '#9e5d21';
    cctx.lineWidth = 5;
    for (let i = -256; i < 512; i += 24) {
      cctx.beginPath();
      cctx.moveTo(i, 0);
      cctx.lineTo(i + 256, 256);
      cctx.stroke();
      cctx.beginPath();
      cctx.moveTo(i + 256, 0);
      cctx.lineTo(i, 256);
      cctx.stroke();
    }
    this.waffleTexture = new THREE.CanvasTexture(coneCanvas);
    this.waffleTexture.wrapS = THREE.RepeatWrapping;
    this.waffleTexture.wrapT = THREE.RepeatWrapping;
    this.waffleTexture.colorSpace = THREE.SRGBColorSpace;

    // Darker crispy waffle texture for the OUTER cone so double-cones are unmistakably distinct!
    const outerConeCanvas = document.createElement('canvas');
    outerConeCanvas.width = 256;
    outerConeCanvas.height = 256;
    const octx = outerConeCanvas.getContext('2d');
    octx.fillStyle = '#e5a45b';
    octx.fillRect(0, 0, 256, 256);
    octx.strokeStyle = '#7c4212';
    octx.lineWidth = 6;
    for (let i = -256; i < 512; i += 22) {
      octx.beginPath();
      octx.moveTo(i, 0);
      octx.lineTo(i + 256, 256);
      octx.stroke();
      octx.beginPath();
      octx.moveTo(i + 256, 0);
      octx.lineTo(i, 256);
      octx.stroke();
    }
    // Bright gold band at top rim of outer cone
    octx.fillStyle = '#ffd166';
    octx.fillRect(0, 0, 256, 22);
    this.outerWaffleTexture = new THREE.CanvasTexture(outerConeCanvas);
    this.outerWaffleTexture.wrapS = THREE.RepeatWrapping;
    this.outerWaffleTexture.wrapT = THREE.RepeatWrapping;
    this.outerWaffleTexture.colorSpace = THREE.SRGBColorSpace;

    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fctx = floorCanvas.getContext('2d');
    fctx.fillStyle = '#1f130e';
    fctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 32) {
      const offset = (y / 32) % 2 === 0 ? 0 : 24;
      for (let x = -32; x < 512; x += 48) {
        fctx.fillStyle = `hsl(20, 22%, ${14 + Math.random() * 8}%)`;
        fctx.strokeStyle = '#0e0705';
        fctx.lineWidth = 3;
        fctx.beginPath();
        fctx.roundRect(x + offset + 2, y + 2, 44, 28, 6);
        fctx.fill();
        fctx.stroke();
      }
    }
    this.floorTexture = new THREE.CanvasTexture(floorCanvas);
    this.floorTexture.wrapS = THREE.RepeatWrapping;
    this.floorTexture.wrapT = THREE.RepeatWrapping;
    this.floorTexture.repeat.set(8, 8);
    this.floorTexture.colorSpace = THREE.SRGBColorSpace;
  }

  _setupLights() {
    const ambient = new THREE.AmbientLight(0xffe4c4, 0.92);
    this.scene.add(ambient);

    const keyLight = new THREE.SpotLight(0xffe1ad, 4.3);
    keyLight.position.set(0.8, 3.6, 1.9);
    keyLight.angle = Math.PI / 2.6;
    keyLight.penumbra = 0.55;
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0008;
    keyLight.shadow.normalBias = 0.025;
    this.scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xff7b29, 2.4, 8);
    rimLight.position.set(-1.6, 2.3, -1.8);
    this.scene.add(rimLight);

    const cyanLight = new THREE.PointLight(0x2ec4b6, 1.5, 7);
    cyanLight.position.set(1.7, 2.2, -1.5);
    this.scene.add(cyanLight);

    // A small warm fill below the canopy keeps eyes readable without changing the stall palette.
    const faceFill = new THREE.PointLight(0xffe2c6, 0.42, 2.8);
    faceFill.position.set(0, 1.72, 0.65);
    this.scene.add(faceFill);
  }

  _buildBazaarEnvironment() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshStandardMaterial({
        map: this.floorTexture,
        roughness: 0.75,
        metalness: 0.1,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.shopInterior=buildShopInterior();
    this.scene.add(this.shopInterior);

    // Traditional Anatolian Carpet Runner in front of the Ice Cream Cart (spaced & polygonOffset to prevent Z-fighting)
    const rugGroup = new THREE.Group();
    rugGroup.position.set(0, 0.008, 0.35);
    const rugOuter = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.15),
      new THREE.MeshStandardMaterial({
        color: 0x7f1d1d,
        roughness: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    rugOuter.rotation.x = -Math.PI / 2;
    rugGroup.add(rugOuter);
    const rugBorder = new THREE.Mesh(
      new THREE.PlaneGeometry(1.98, 0.95),
      new THREE.MeshStandardMaterial({
        color: 0xf5b942,
        roughness: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    rugBorder.rotation.x = -Math.PI / 2;
    rugBorder.position.y = 0.006;
    rugGroup.add(rugBorder);
    const rugInner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.82, 0.8),
      new THREE.MeshStandardMaterial({
        color: 0x4a0e17,
        roughness: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      })
    );
    rugInner.rotation.x = -Math.PI / 2;
    rugInner.position.y = 0.012;
    rugGroup.add(rugInner);
    this.scene.add(rugGroup);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x3b2318,
      roughness: 0.88,
    });
    for (let i = -2; i <= 2; i++) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 3.8, 0.45),
        stoneMat
      );
      pillar.position.set(i * 1.9, 1.9, -3.2);
      this.scene.add(pillar);
    }
    const headerBeam = new THREE.Mesh(
      new THREE.BoxGeometry(9.5, 0.55, 0.55),
      stoneMat
    );
    headerBeam.position.set(0, 3.6, -3.2);
    this.scene.add(headerBeam);

    // Warm Bazaar Hanging Mosaic Lanterns
    const lanternColors = [0xff595e, 0xffca3a, 0x2ec4b6, 0xff924c, 0x8ac926, 0xc77dff];
    lanternColors.forEach((col, idx) => {
      const lx = (idx - 2.5) * 1.02;
      const ly = 2.68 + (idx % 2) * 0.16;
      const lz = -1.72 - (idx % 2) * 0.38;

      const lGroup = new THREE.Group();
      lGroup.position.set(lx, ly, lz);

      const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.7),
        new THREE.MeshBasicMaterial({ color: 0x222222 })
      );
      cord.position.y = 0.35;
      lGroup.add(cord);

      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.06, 12),
        new THREE.MeshStandardMaterial({ color: 0xf5b942, metalness: 0.8, roughness: 0.25 })
      );
      cap.position.y = 0.13;
      lGroup.add(cap);

      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.135, 16, 12),
        new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 0.88,
          roughness: 0.2,
        })
      );
      lGroup.add(globe);

      this.scene.add(lGroup);
      this.lanterns.push({ group: lGroup, phase: idx * 1.15 });
    });
  }

  _buildIceCreamCart({batchGeometry=true}={}) {
    this.cartGroup = new THREE.Group();
    this.cartGroup.position.set(0, 0, -0.38);
    this.scene.add(this.cartGroup);

    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xb85d2e,
      metalness: 0.74,
      roughness: 0.3,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf5b942,
      metalness: 0.86,
      roughness: 0.2,
    });
    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x3b1c0e,
      roughness: 0.7,
    });

    // Open service frame exposes the grounded legs and the shop floor.
    // The upper basin and every scoop/contact anchor keep their original pose.
    this.counterBase=buildOpenCounterBase(copperMat,brassMat,darkWoodMat);
    this.cartGroup.add(this.counterBase);

    const backUpperSkirt = new THREE.Mesh(
      new THREE.BoxGeometry(1.08, 0.155, 0.05),
      copperMat
    );
    backUpperSkirt.position.set(0, 0.8625, -0.14);
    backUpperSkirt.name='counter-rear-skirt';
    this.cartGroup.add(backUpperSkirt);

    [-0.54, 0.54].forEach((sx) => {
      const sideUpperSkirt = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.16, 0.48),
        copperMat
      );
      sideUpperSkirt.position.set(sx, 0.86, 0.10);
      this.cartGroup.add(sideUpperSkirt);
    });

    // =========================================================================
    // RECESSED COOLING BASIN ("Masanın İçindeki Soğutmalı Hazne") &
    // 4 SHINY STAINLESS-STEEL ICE CREAM BUCKETS ("Parlak Çelik Dondurma Kovaları")
    // =========================================================================
    const chromeSteelMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.94,
      roughness: 0.11,
      side: THREE.DoubleSide,
    });
    const brushedSteelMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.86,
      roughness: 0.22,
    });
    const darkBasinWellMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.65,
      roughness: 0.45,
      side: THREE.DoubleSide,
    });
    const frostRimMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.18,
      roughness: 0.65,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    // Forward-tilted showcase basin deck so the player clearly sees inside the counter well and steel buckets!
    this.basinDeckGroup = new THREE.Group();
    this.basinDeckGroup.position.set(0, 0.94, 0.04);
    this.basinDeckGroup.rotation.x = 0.22; // Tilted toward the customer POV camera
    this.cartGroup.add(this.basinDeckGroup);

    // Outer hammered brass/copper counter frame around the recessed basin
    const frontRail = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.055, 0.09),
      brassMat
    );
    frontRail.position.set(0, 0.01, 0.34);
    this.basinDeckGroup.add(frontRail);

    const backRail = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.025, 0.06),
      brassMat
    );
    backRail.position.set(0, 0.015, -0.175);
    backRail.name='counter-rear-rail';
    this.basinDeckGroup.add(backRail);

    [-0.55, 0.55].forEach((sx) => {
      const sideRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.06, 0.56),
        brassMat
      );
      sideRail.position.set(sx, 0.012, 0.07);
      this.basinDeckGroup.add(sideRail);
    });

    // Deep dark chilled freezer well ("Hazne Çukuru") beneath the steel deck
    const freezerWellFloor = new THREE.Mesh(
      new THREE.BoxGeometry(1.08, 0.03, 0.45),
      darkBasinWellMat
    );
    freezerWellFloor.position.set(0, -0.31, 0.075);
    this.basinDeckGroup.add(freezerWellFloor);

    // Brushed Stainless-Steel Recessed Basin Deck Plate ("Çelik Hazne Tezgahı")
    const steelDeckPlate = new THREE.Mesh(
      createBucketDeckGeometry(),
      brushedSteelMat
    );
    steelDeckPlate.rotation.x=-Math.PI/2;
    steelDeckPlate.position.set(0, -0.031, 0.075);
    steelDeckPlate.name='counter-steel-deck';
    steelDeckPlate.receiveShadow = true;
    this.basinDeckGroup.add(steelDeckPlate);

    // Frosted cooling rails running cleanly above the steel basin deck
    [-0.135, 0.22].forEach((fz) => {
      const frostStrip = new THREE.Mesh(
        new THREE.BoxGeometry(1.02, 0.01, 0.028),
        frostRimMat
      );
      frostStrip.position.set(0, 0.002, fz);
      this.basinDeckGroup.add(frostStrip);
    });

    // 4 Authentic Kahramanmaraş Shiny Stainless-Steel Ice Cream Buckets ("Parlak Çelik Kovalar")
    this.tubPositions = ICE_CREAM_FLAVORS.map((flav) => ({
      index: flav.index,
      id: flav.id,
      x: flav.xOffset,
      color: flav.colorHex,
      worldPos: new THREE.Vector3(flav.xOffset, 0.97, -0.33),
    }));

    this.tubMeshes = [];
    this.tubIceGroups = [];

    this.tubPositions.forEach((tub, idx) => {
      const bucketGroup = new THREE.Group();
      bucketGroup.position.set(tub.x, 0.0, 0.01);
      this.basinDeckGroup.add(bucketGroup);

      // 1. Open-ended dark recessed socket shadow sleeve (no top cap so it never Z-fights with deck or ice!)
      const socketWell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.116, 0.112, 0.11, 24, 1, true),
        darkBasinWellMat
      );
      socketWell.position.y = -0.068;
      bucketGroup.add(socketWell);

      // 2. Frosted cold condensation collar cleanly above the steel deck plate
      const frostCollar = new THREE.Mesh(
        new THREE.TorusGeometry(0.115, 0.007, 10, 24),
        frostRimMat
      );
      frostCollar.rotation.x = Math.PI / 2;
      frostCollar.position.y = 0.004;
      bucketGroup.add(frostCollar);

      // 3. Tall Shiny Stainless-Steel Bucket Cylinder Wall ("Parlak Çelik Kova Gövdesi")
      const steelBucketWall = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.095, 0.33, 26, 1, true),
        chromeSteelMat
      );
      steelBucketWall.position.y = 0.052 - 0.165;
      bucketGroup.add(steelBucketWall);
      const bucketFloor=new THREE.Mesh(new THREE.CircleGeometry(.095,26),brushedSteelMat);
      bucketFloor.name='empty-bucket-steel-bottom';bucketFloor.rotation.x=-Math.PI/2;
      bucketFloor.position.y=-.276;bucketGroup.add(bucketFloor);

      // 4. Mirror-Polished Rolled Steel Lip Flange ("Parlak Çelik Kova Ağzı Çemberi")
      const steelRimFlange = new THREE.Mesh(
        new THREE.TorusGeometry(0.107, 0.013, 14, 28),
        chromeSteelMat
      );
      steelRimFlange.rotation.x = Math.PI / 2;
      steelRimFlange.position.y = 0.048;
      bucketGroup.add(steelRimFlange);

      // 5. Stainless-Steel Side Bail Handles on each bucket ("Çelik Kova Kulpları")
      [-0.112, 0.112].forEach((hx) => {
        const handleEar = new THREE.Mesh(
          new THREE.TorusGeometry(0.016, 0.004, 8, 12, Math.PI),
          chromeSteelMat
        );
        handleEar.position.set(hx, 0.036, 0);
        handleEar.rotation.z = hx < 0 ? Math.PI / 2 : -Math.PI / 2;
        bucketGroup.add(handleEar);
      });

      // 6. Sculpted, Swirled Maraş Ice Cream Mass Inside the Shiny Steel Bucket!
      const iceGroup = new THREE.Group();
      iceGroup.position.y = 0.018;
      bucketGroup.add(iceGroup);

      const iceMat = new THREE.MeshStandardMaterial({
        color: tub.color,
        roughness: 0.32,
        metalness: 0.04,
      });

      // Base full-bucket ice cream layer (radius 0.088 so it sits cleanly inside the 0.105 steel wall without Z-fighting)
      const iceBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.088, 0.082, 0.052, 22),
        iceMat
      );
      iceBase.position.y = -0.006;
      iceBase.userData.flavorIndex = tub.index;
      iceGroup.add(iceBase);

      // Main sculpted stretchy dome with paddle-churned ridges
      const iceDome = new THREE.Mesh(
        new THREE.SphereGeometry(
          0.089,
          22,
          14,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.62
        ),
        iceMat
      );
      iceDome.position.y = 0.01;
      iceDome.scale.set(1.0, 0.72, 1.0);
      iceDome.userData.flavorIndex = tub.index;
      iceGroup.add(iceDome);

      // Stretchy swirled folds & peaks on top of the ice cream in the bucket
      for (let s = 0; s < 3; s++) {
        const angle = (s / 3) * Math.PI * 2 + idx * 0.7;
        const swirlFold = new THREE.Mesh(
          new THREE.TorusGeometry(0.044 - s * 0.008, 0.018, 10, 18, Math.PI * 1.35),
          iceMat
        );
        swirlFold.rotation.x = Math.PI / 2 + 0.18;
        swirlFold.rotation.z = angle;
        swirlFold.position.set(
          Math.cos(angle) * 0.022,
          0.038 + s * 0.01,
          Math.sin(angle) * 0.022
        );
        swirlFold.userData.flavorIndex = tub.index;
        iceGroup.add(swirlFold);
      }

      // Garnish bits on top of the tub ice cream (pistachio / chocolate / berry specks)
      const speckColor =
        idx === 1
          ? 0x4ade80
          : idx === 2
            ? 0x3b1c0e
            : idx === 3
              ? 0x9f1239
              : idx === 4
                ? 0xd97706
                : 0x80ed99;
      const speckMat = new THREE.MeshStandardMaterial({
        color: speckColor,
        roughness: 0.4,
      });
      for (let g = 0; g < 6; g++) {
        const ga = (g / 6) * Math.PI * 2;
        const speck = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.008, 0),
          speckMat
        );
        speck.position.set(
          Math.cos(ga) * 0.046,
          0.052 + (g % 2) * 0.006,
          Math.sin(ga) * 0.046
        );
        iceGroup.add(speck);
      }

      this.tubMeshes.push(iceDome, iceBase);
      this.tubIceGroups.push({
        group: iceGroup,
        baseY: 0.018,
        surfaceY: .01 + .089 * .72,
        fill: 1,
        churnEnergy: 0,
        phase: idx * 1.1,
      });
    });

    // Keep the ice surfaces readable: no floating sphere mist.

    // Recessed side hopper: eight wells, seven nested hollow wafers per well.
    // It sits behind the left tub, leaving the scoop surfaces and vendor clear.
    this.coneRack = buildConeRack(this.waffleTexture);
    this.coneRack.position.set(-.55, .90, -.55);
    this.cartGroup.add(this.coneRack);
    this.coneStackWorldPos = new THREE.Vector3(-.475, 1.198, -.72);

    // =========================================================================
    // DETAILED OVERHEAD ARCH & 7 MULTI-PART MARAŞ BRASS BELLS ("Detaylı Çanlar")
    // Positioned at y = 1.90 so all 7 bells and their swinging clappers are
    // prominently visible in the upper third of the screen!
    // =========================================================================
    const leftPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.034, 1.15, 14),
      brassMat
    );
    leftPost.position.set(-0.54, 1.48, 0.12);
    this.cartGroup.add(leftPost);

    const rightPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.034, 1.15, 14),
      brassMat
    );
    rightPost.position.set(0.54, 1.48, 0.12);
    this.cartGroup.add(rightPost);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(1.20, 0.1, 0.50),
      new THREE.MeshStandardMaterial({ color: 0x8c141b, roughness: 0.48 })
    );
    canopy.position.set(0, 2.02, -0.07);
    this.cartGroup.add(canopy);

    const canopyTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 0.038, 0.54),
      brassMat
    );
    canopyTrim.position.set(0, 1.96, -0.07);
    this.cartGroup.add(canopyTrim);

    // Ornate Horizontal Brass Bell Crossbar ("Pirinç Çan Askı Borusu")
    const bellCrossbar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 1.08, 16),
      brassMat
    );
    bellCrossbar.rotation.z = Math.PI / 2;
    bellCrossbar.position.set(0, 1.91, 0.25);
    this.cartGroup.add(bellCrossbar);

    const polishedBrassBellMat = new THREE.MeshStandardMaterial({
      color: 0xffcf48,
      metalness: 0.92,
      roughness: 0.14,
    });
    const antiqueBronzeBandMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      metalness: 0.85,
      roughness: 0.28,
    });
    const bellHollowMat = new THREE.MeshStandardMaterial({
      color: 0x1a0b05,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    const crimsonSilkMat = new THREE.MeshStandardMaterial({
      color: 0xd90429,
      roughness: 0.55,
    });

    const bellCount = 7;
    for (let b = 0; b < bellCount; b++) {
      const bx = -0.45 + b * 0.15;
      // Center bell (b=3) is largest; graduated sizes outward
      const distFromCenter = Math.abs(b - 3);
      const bellScale = (1.16 - distFromCenter * 0.08) * 0.5;

      const bellPivot = new THREE.Group();
      bellPivot.position.set(bx, 1.91, 0.25);
      bellPivot.scale.setScalar(bellScale);

      // 1. Top Brass Suspension Ring & Chain Links ("Askı Halkası ve Zincir")
      const topMountRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.018, 0.005, 10, 18),
        antiqueBronzeBandMat
      );
      bellPivot.add(topMountRing);

      const chainLink = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.032, 8),
        brassMat
      );
      chainLink.position.y = -0.018;
      bellPivot.add(chainLink);

      // 2. Embossed Crown Cap ("Çan Tepeliği")
      const crownCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
        antiqueBronzeBandMat
      );
      crownCap.position.y = -0.048;
      bellPivot.add(crownCap);

      // 3. Upper Bell Dome & Flared Skirt ("Kademeli Pirinç Çan Gövdesi")
      const upperDome = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.048, 0.055, 22),
        polishedBrassBellMat
      );
      upperDome.position.y = -0.068;
      bellPivot.add(upperDome);

      const lowerSkirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.074, 0.058, 24),
        polishedBrassBellMat
      );
      lowerSkirt.position.y = -0.122;
      bellPivot.add(lowerSkirt);

      // 4. Engraved Decorative Waist Bands ("İşlemeli Kuşaklar")
      [-0.088, -0.128].forEach((by) => {
        const r = by === -0.088 ? 0.046 : 0.062;
        const band = new THREE.Mesh(
          new THREE.TorusGeometry(r, 0.0038, 8, 22),
          antiqueBronzeBandMat
        );
        band.rotation.x = Math.PI / 2;
        band.position.y = by;
        bellPivot.add(band);
      });

      // 5. Thick Flared Acoustic Lip Rim ("Çan Ağzı Çemberi") + Dark Hollow Interior
      const acousticLip = new THREE.Mesh(
        new THREE.TorusGeometry(0.073, 0.0085, 12, 26),
        polishedBrassBellMat
      );
      acousticLip.rotation.x = Math.PI / 2;
      acousticLip.position.y = -0.15;
      bellPivot.add(acousticLip);

      const hollowInterior = new THREE.Mesh(
        new THREE.CircleGeometry(0.064, 20),
        bellHollowMat
      );
      hollowInterior.rotation.x = Math.PI / 2;
      hollowInterior.position.y = -0.143;
      bellPivot.add(hollowInterior);

      // 6. Glowing Golden Acoustic Shimmer Ring when struck!
      const shimmerMat = new THREE.MeshBasicMaterial({
        color: 0xffe194,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const shimmerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.078, 0.098, 24),
        shimmerMat
      );
      shimmerRing.rotation.x = Math.PI / 2;
      shimmerRing.position.y = -0.156;
      shimmerRing.visible = false;
      bellPivot.add(shimmerRing);

      // 7. Articulated Independent Inner Clapper Pendulum + Red Silk Tassel ("Sallanan Çan Dili & Püskülü")
      const clapperPivot = new THREE.Group();
      clapperPivot.position.y = -0.065;
      bellPivot.add(clapperPivot);

      const clapperRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, 0.095, 8),
        antiqueBronzeBandMat
      );
      clapperRod.position.y = -0.048;
      clapperPivot.add(clapperRod);

      const clapperBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.019, 14, 12),
        antiqueBronzeBandMat
      );
      clapperBall.position.y = -0.098;
      clapperPivot.add(clapperBall);

      const silkTassel = new THREE.Mesh(
        new THREE.ConeGeometry(0.012, 0.042, 10),
        crimsonSilkMat
      );
      silkTassel.position.y = -0.128;
      clapperPivot.add(silkTassel);

      this.cartGroup.add(bellPivot);
      this.bells.push({
        index: b,
        pivot: bellPivot,
        clapperPivot,
        shimmerRing,
        shimmerMat,
        shimmerTimer: 0,
        worldPos: new THREE.Vector3(bx, 1.91 - 0.122 * bellScale, -0.13),
        strikeCooldown: 0,
        paddleInContact: false,
        handInContact: false,
        velZ: 0,
        velX: 0,
        angleZ: 0,
        angleX: 0,
        clapperAngleZ: 0,
        clapperVelZ: 0,
        clapperAngleX: 0,
        clapperVelX: 0,
      });
    }
    if(batchGeometry)batchIceCreamCart(this);
  }

  _buildPaddleAndCones() {
    this.paddleGroup = new THREE.Group();
    this.scene.add(this.paddleGroup);

    this.paddleRollGroup = new THREE.Group();
    this.paddleGroup.add(this.paddleRollGroup);
    this.paddleContact = new PoleContact();

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.92,
      roughness: 0.14,
    });
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x5c260e,
      roughness: 0.6,
    });

    this.paddleRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.015, 0.92, 12),
      steelMat
    );
    this.paddleRod.rotation.x = Math.PI / 2;
    this.paddleRod.position.set(0, 0, -0.46);
    this.paddleRod.castShadow = true;
    this.paddleRollGroup.add(this.paddleRod);

    this.woodGrip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.028, 0.28, 12),
      handleMat
    );
    this.woodGrip.rotation.x = Math.PI / 2;
    this.woodGrip.position.set(0, 0, -0.88);
    this.paddleRollGroup.add(this.woodGrip);

    const brassPommel = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xf5b942,
        metalness: 0.85,
        roughness: 0.2,
      })
    );
    brassPommel.position.set(0, 0, -1.03);
    this.paddleRollGroup.add(brassPommel);

    this.paddleRearGripAnchor = new THREE.Object3D();
    this.paddleRearGripAnchor.position.set(0, 0, -0.82);
    this.paddleRollGroup.add(this.paddleRearGripAnchor);

    this.paddleFrontGripAnchor = new THREE.Object3D();
    this.paddleFrontGripAnchor.position.set(0, 0, -0.5);
    this.paddleRollGroup.add(this.paddleFrontGripAnchor);

    const spatulaTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.066, 0.014, 0.15),
      steelMat
    );
    spatulaTip.position.set(0, 0, -0.04);
    this.paddleRollGroup.add(spatulaTip);
    this.paddleStrikeAnchor = new THREE.Object3D();
    this.paddleStrikeAnchor.position.set(0, 0, 0.035);
    this.paddleRollGroup.add(this.paddleStrikeAnchor);

    this.conePivot = new THREE.Group();
    this.conePivot.position.set(0, 0.02, 0);
    this.paddleGroup.add(this.conePivot);

    // INNER (Real) Waffle Cone
    this.mainConeMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.056, 0.19, 20, 1, true),
      new THREE.MeshStandardMaterial({
        map: this.waffleTexture,
        roughness: 0.62,
      })
    );
    this.mainConeMesh.rotation.x = Math.PI;
    this.mainConeMesh.position.y = -0.06;
    this.mainConeMesh.castShadow = true;
    this.conePivot.add(this.mainConeMesh);
    // An empty offered cone has a visible cavity, rather than a solid waffle cap.
    const coneLining = new THREE.Mesh(
      new THREE.ConeGeometry(0.052, 0.184, 20, 1, true),
      new THREE.MeshStandardMaterial({ map: this.waffleTexture, color: 0x9a673c, roughness: .8, side: THREE.BackSide })
    );
    coneLining.position.y = -0.001;
    this.mainConeMesh.add(coneLining);
    const coneLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.054, .003, 6, 24),
      new THREE.MeshStandardMaterial({ color: 0xc28b4f, roughness: .65 })
    );
    coneLip.rotation.x = Math.PI / 2;
    coneLip.position.y = -.095;
    this.mainConeMesh.add(coneLip);


    // OUTER (Nested Double-Cone / Çift Külah) Group — visibly nested with a golden separation rim!
    this.outerConeGroup = new THREE.Group();
    this.outerConeGroup.position.set(0, -0.052, 0.008);
    this.outerConeGroup.rotation.z = 0.09; // Slight realistic tilt so player clearly sees 2 nested cones!
    this.outerConeGroup.visible = false;
    this.conePivot.add(this.outerConeGroup);

    this.outerConeMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.064, 0.195, 20, 1, true),
      new THREE.MeshStandardMaterial({
        map: this.outerWaffleTexture,
        roughness: 0.55,
        side: THREE.DoubleSide,
      })
    );
    this.outerConeMesh.rotation.x = Math.PI;
    this.outerConeMesh.position.y = -0.06;
    this.outerConeGroup.add(this.outerConeMesh);

    // Visible bright golden wafer rim around the top of the outer cone so double-cone is unmistakable
    this.outerConeRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.063, 0.004, 10, 24),
      new THREE.MeshStandardMaterial({
        color: 0xe1ad68,
        roughness: 0.65,
      })
    );
    this.outerConeRim.rotation.x = Math.PI / 2;
    this.outerConeRim.position.y = 0.036;
    this.outerConeGroup.add(this.outerConeRim);

    // Legacy compatibility alias
    this.decoyConeOnPaddle = this.outerConeGroup;

    // Eight dynamic scoops, with legacy aliases retained for existing tricks.
    this.scoopStackGroup = new THREE.Group();
    this.conePivot.add(this.scoopStackGroup);

    this.scoop1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.066, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xfff8e7, roughness: 0.35 })
    );
    this.scoop1.position.y = 0.045;
    this.scoopStackGroup.add(this.scoop1);

    // A real scoop in transit from the tub to the cone; the director owns its path.
    this.carryScoop = this.scoop1.clone();
    this.carryScoop.material = this.scoop1.material.clone();
    this.carryScoop.visible = false;
    this.scene.add(this.carryScoop);

    this.scoop2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.062, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0x76c84d, roughness: 0.38 })
    );
    this.scoop2.position.set(0.012, 0.115, 0.008);
    this.scoop2.visible = false;
    this.scoopStackGroup.add(this.scoop2);

    this.scoop3 = new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0x5c2c16, roughness: 0.36 })
    );
    this.scoop3.position.set(-0.01, 0.175, -0.006);
    this.scoop3.visible = false;
    this.scoopStackGroup.add(this.scoop3);

    this.scoop4 = new THREE.Mesh(
      new THREE.SphereGeometry(0.053, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xd92662, roughness: 0.35 })
    );
    this.scoop4.position.set(0.006, 0.228, 0.004);
    this.scoop4.visible = false;
    this.scoopStackGroup.add(this.scoop4);

    this.scoopMeshes = [this.scoop1, this.scoop2, this.scoop3, this.scoop4];
    for (let i = 4; i < MAX_SCOOPS; i++) {
      const scoop = new THREE.Mesh(new THREE.SphereGeometry(.056, 20, 16), new THREE.MeshStandardMaterial({ color: ICE_CREAM_FLAVORS[i % ICE_CREAM_FLAVORS.length].colorHex, roughness: .38 }));
      scoop.position.set(...LARGE_SCOOP_LAYOUT[i].slice(0, 3)); scoop.visible = false;
      this.scoopMeshes.push(scoop); this.scoopStackGroup.add(scoop); this[`scoop${i + 1}`] = scoop;
    }
    this.scoopLayoutTargets = this.scoopMeshes.map((mesh) => mesh.position.clone());
    this.scoopScaleTargets = this.scoopMeshes.map(() => new THREE.Vector3(1, 1, 1));
    this.servingScale = 1;

    this.toppingGroup = new THREE.Group();
    this.toppingGroup.position.set(0, 0.21, 0);
    this.toppingGroup.visible = false;
    this.scoopStackGroup.add(this.toppingGroup);

    const pistachioBitMat = new THREE.MeshStandardMaterial({
      color: 0x80ed99,
      roughness: 0.3,
    });
    for (let p = 0; p < 14; p++) {
      const bit = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.012),
        pistachioBitMat
      );
      const angle = (p / 14) * Math.PI * 2;
      const rad = 0.02 + (p % 3) * 0.012;
      bit.position.set(
        Math.cos(angle) * rad,
        (p % 2) * 0.012,
        Math.sin(angle) * rad
      );
      this.toppingGroup.add(bit);
    }
    const waferStick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.11, 10),
      new THREE.MeshStandardMaterial({ map: this.waffleTexture })
    );
    waferStick.position.set(0.025, 0.03, 0);
    waferStick.rotation.z = -0.35;
    this.toppingGroup.add(waferStick);
    this.waferStick = waferStick;

    // GIANT 5-KILO MARAŞ ICE CREAM BLOCK ("Kalıptan Kocaman Dondurma Kütlesi" + Mid-Air Somersault)
    this.giantBlockGroup = new THREE.Group();
    this.giantBlockGroup.visible = false;
    this.scene.add(this.giantBlockGroup);
    this.giantBlockHeight = 0.32;
    this.giantBlockRadius = 0.09;

    this.giantBlockMat = new THREE.MeshStandardMaterial({
      color: 0xfff8e7,
      roughness: 0.78,
      metalness: 0,
      bumpMap: createIceBumpTexture(),
      bumpScale: .0022,
    });
    // Slight churn ridges distinguish the dense ice mold from a plastic cylinder.
    const moldGeometry = new THREE.CylinderGeometry(0.086, 0.081, this.giantBlockHeight, 32, 12);
    const moldVertices = moldGeometry.attributes.position;
    for (let i = 0; i < moldVertices.count; i++) {
      const x = moldVertices.getX(i), y = moldVertices.getY(i), z = moldVertices.getZ(i);
      const radius = Math.hypot(x, z);
      if (radius > .07) {
        const grain = 1 + .012 * Math.sin(Math.atan2(z, x) * 9 + y * 32);
        moldVertices.setXYZ(i, x * grain, y, z * grain);
      }
    }
    moldGeometry.computeVertexNormals();
    const mainLog = new THREE.Mesh(moldGeometry, this.giantBlockMat);
    mainLog.rotation.z = 0;
    mainLog.castShadow = true;
    this.giantBlockGroup.add(mainLog);
    const moldTop = new THREE.Mesh(new THREE.SphereGeometry(.085, 24, 12, 0, Math.PI * 2, 0, Math.PI * .5), this.giantBlockMat);
    moldTop.scale.y = .22;
    moldTop.position.y = this.giantBlockHeight * .5;
    moldTop.castShadow = true;
    this.giantBlockGroup.add(moldTop);


    // Organic sculpted ridges & stretchy lobes on the 5-kilo ice cream mass
    [-0.09, 0, 0.09].forEach((bx, idx) => {
      const lobe = new THREE.Mesh(
        new THREE.SphereGeometry(0.087 - idx * 0.002, 18, 14),
        this.giantBlockMat
      );
      lobe.position.set(0, bx * 1.40, 0);
      lobe.scale.set(1.0, 0.35, 1.0);
      this.giantBlockGroup.add(lobe);
    });
  }

  setGiantBlockColor(hexColor) {
    if (this.giantBlockMat && hexColor !== undefined) {
      this.giantBlockMat.color.setHex(hexColor);
    }
  }

  setNarrativeState(state) {
    this.narrativeState = this.stallDecor?.setState(state);
    return this.narrativeState;
  }

  setVenue(config = VENUES[0]) {
    this.venueConfig = config;
    this.stallDecor?.setVenue?.(config);
    this.culturalScene?.setVenue(config);
    this.setServingScale(config.scoopScale ?? 1);
  }

  setServingScale(scale = 1) {
    this.servingScale = THREE.MathUtils.clamp(Number(scale) || 1, 1, 1.18);
    this.conePivot.scale.setScalar(this.servingScale);
    return this.servingScale;
  }

  setExplorationMode(enabled) { this.culturalScene?.setExplorationMode(enabled); }
  setExplorationSection(index) { return this.culturalScene?.setSection(index); }
  getDiscoveryTargets() { return this.culturalScene?.getDiscoveryTargets() || []; }
  getDiscoverableAtScreen(x, y) { return this.culturalScene?.pick(x, y) || null; }
  pickCulturalDetail(x, y) { return this.getDiscoverableAtScreen(x, y); }
  focusDiscovery(id) { return this.culturalScene?.focusDiscovery(id); }
  clearDiscoveryFocus() { this.culturalScene?.clearFocus(); }
  setDiscovered(ids) { this.culturalScene?.setDiscovered(ids); }
  resetExploration() { this.culturalScene?.reset(); }

  playVendorReaction(kind = 'greeting') {
    this._vendorReaction = { kind, age: 0, duration: kind === 'photo' ? 1.5 : kind==='refusal'?1.35:1.15 };
    this.setVendorMood(kind === 'recognition' ? 'mischief' : kind==='refusal'?'shock':'smile');
    if (kind === 'photo') this.stallDecor?.focus?.((this.narrativeState?.vendorIndex ?? 0) < 2 ? 'photo' : this.narrativeState.vendorIndex === 2 ? 'ledger' : 'card');
  }

  playFaceTouch(part='face') { this._faceTouch={part,age:0}; }

  cancelVendorReaction() {
    this._vendorReaction = null;
    this.vendorHead.rotation.set(0, 0, 0);
    if (this.lArmRig.openFingers) this.lArmRig.openFingers.visible = false;
    this.lArmRig.fingerWraps.visible = true;
    this.lArmRig.fingerWraps.children.forEach((finger) => { finger.visible = true; });
  }

  handoffCone(owner) { this.stallEffects?.handoffCone(owner); }
  handoffOuterCone(owner, visible = true) { this.stallEffects?.handoffOuterCone(owner, visible); }
  clearSlicePresentation() { this.stallEffects?.clearSlice(); this.stretchCutView?.reset(); this.stretchyStrand?.setHandPressure?.(null); }
  triggerSlice(worldPoint, color, direction = 1) { this.stallEffects?.triggerSlice(worldPoint, color, direction); }
  setStretchCutPresentation(state) {
    if (!this.stretchCutView) this.stretchCutView = new StretchCutView(this);
    this.stretchCutView.set(state);
  }
  setMoldPresentation(options) { this.stallEffects?.setMold(options); }
  getTubMoldSeat(index,out=new THREE.Vector3()) { return tubMoldSeat(this,index,out); }
  beginTubMold(index) {
    const tub=this.tubIceGroups?.[index];if(!tub)return;
    if(!tub.group){tub.fill=0;return;}
    (this.tubMoldTransfer ||= new TubMoldTransfer(this)).begin(index);
  }
  returnTubMold(index) {
    this.tubMoldTransfer?.dock();
    if(this.tubIceGroups?.[index])this.tubIceGroups[index].fill=1;
  }
  clearMoldPresentation() { this.stallEffects?.clearMold(); }
  setScoopPresentation(mode, worldPosition) { this.stallEffects?.setScoop(mode, worldPosition); }
  showSleevePresentation(options) { this.stallEffects?.showSleeve(options); }
  reuseEmptyCone(target) {return this.collectedCones?.take(target)||false;}
  collectEmptyCone(source,key) {
    this.collectedCones ||= new CollectedCones(this);
    return this.collectedCones.collect(source,key);
  }
  setServingNapkin(options) { this.stallEffects?.setServingNapkin(options); }
  clearServingNapkin(options) { this.stallEffects?.clearServingNapkin(options); }
  triggerCounterImpact(point, power = 1) { this.stallEffects?.triggerCounterImpact(point, power); }
  clearTrickPresentations() { this.stallEffects?.clear(); this.stretchCutView?.reset(); }

  /** Full round reset only: old debris cannot land or play a bounce in the next order. */
  resetTransientPresentation() {
    this.collectedCones?.reset();
    this.setConeOfferGlow(0);
    this.playerConeGripRequested = false;
    this.presentationAxialSpin = false;
    this.coneHandTiltZ = 0;
    this.resetExploration();
    this.stretchyStrand?.detach();
    this.stallEffects?.resetTransient();
    if (this.carryScoop) this.carryScoop.visible = false;
    if (this.sliceCueGroup) this.sliceCueGroup.visible = false;
    const geometries = new Set(), materials = new Set();
    for (const particle of this.particles || []) {
      this.scene.remove(particle.mesh);
      geometries.add(particle.mesh.geometry); materials.add(particle.mesh.material);
    }
    if (this.particles) this.particles.length = 0;
    for (const body of this.rigidBodies?.bodies || []) {
      this.scene.remove(body.mesh);
      body.onLandCallback = null; body.getTargetPosFn = null;
      if (body.type === 'scoop_arc') { geometries.add(body.mesh.geometry); materials.add(body.mesh.material); }
    }
    if (this.rigidBodies) this.rigidBodies.bodies.length = 0;
    geometries.forEach((geometry) => geometry?.dispose());
    materials.forEach((material) => material?.dispose());
    for (const bell of this.bells || []) {
      bell.velZ = bell.velX = bell.angleZ = bell.angleX = 0;
      bell.clapperVelZ = bell.clapperVelX = bell.clapperAngleZ = bell.clapperAngleX = 0;
      bell.shimmerTimer = 0; bell.strikeCooldown = 0; bell.paddleInContact = bell.handInContact = false;
      bell.pivot.rotation.set(0, 0, 0); bell.clapperPivot.rotation.set(0, 0, 0); bell.shimmerRing.visible = false; bell.shimmerMat.opacity = 0;
    }
    this.previousPaddleStrikePoint = null;
    this._faceTouch=null;
    if(this.vendorHead)this.vendorHead.position.z=.02;
    this._orderPolePosition = null; this._orderPhase = null;
  }

  /** Order-only presentation override; call after idle director and never during active input. */
  updateOrderPresentation(order = {}, dt = .016, time = 0) {
    this.beginPoseFrame();
    const phase = order.phase || 'greeting';
    if (this._orderPhase !== phase) {
      this.playVendorReaction(phase === 'confirm' ? 'recognition' : phase === 'greeting' ? (order.recognized ? 'recognition' : 'greeting') : 'thanks');
      this._orderPhase = phase;
      this._orderCountStarted = time;
    }
    this.setConeInVendorHand(false);
    this.updateIceCreamScoops(0);
    this.carryScoop.visible = false;
    if (!this._orderPolePosition) this._orderPolePosition = this.paddleGroup.position.clone();
    const tub = this.tubPositions[Math.max(0, Math.min(this.tubPositions.length - 1, Number(order.flavorIndex) || 0))];
    const desired = phase === 'flavor' ? tub.worldPos.clone().add(new THREE.Vector3(0, .18, .07)) : new THREE.Vector3(-.12, 1.24 + Math.sin(time * 1.6) * .012, .12);
    this._orderPolePosition.lerp(desired, 1 - Math.exp(-Math.max(0, dt) * 7));
    this.paddleGroup.position.copy(this._orderPolePosition);
    this.coneSpring.pos.copy(this._orderPolePosition);
    const hand = phase === 'flavor' ? new THREE.Vector3(tub.x * .45, 1.29, -.34) : new THREE.Vector3(.27, 1.43, -.30);
    this.orientPaddleAndHands(0, hand, dt, 0, 0);
    const requestedCount = THREE.MathUtils.clamp(Number(order.count) || (phase === 'count' && order.hover > 0 ? order.hover : order.choices?.at(-1)) || 2, 1, MAX_SCOOPS);
    const countPart = requestedCount > 4 && Math.floor((time - (this._orderCountStarted || 0)) / .8) % 2 === 1 ? requestedCount - 4 : Math.min(4, requestedCount);
    this._setVendorOpenHand(this.lArmRig, phase === 'count' ? countPart : phase === 'flavor' ? 1 : 4);
    if (phase === 'flavor') {
      const direction = tub.worldPos.clone().sub(this.lArmRig.handGroup.position).normalize();
      this.lArmRig.handGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    } else this.lArmRig.handGroup.rotation.set(-.18, -.15, -.12);
  }

  /** Change only the existing cone's owner; preserve its world pose at handoff. */
  setConeInVendorHand(enabled) {
    // The customer owns a caught cone until the round is explicitly reset.
    if (this.conePivot.parent === this.heldSocket) return;
    const destination = enabled ? this.lArmRig.handGroup : this.paddleGroup;
    this.coneHeldByVendor = Boolean(enabled);
    if (this.conePivot.parent !== destination) {
      this.scene.updateMatrixWorld(true);
      destination.attach(this.conePivot);
    }
  }

  /** Current visible lower lip, including reduced scale and pendulum rotation. */
  getBellStrikeTarget(bellIndex, out = new THREE.Vector3()) {
    const b = this.bells[Math.abs(Math.round(bellIndex)) % this.bells.length];
    if (!b) return out.set(0, 1.8, -0.13);
    b.pivot.updateWorldMatrix(true, false);
    return b.pivot.localToWorld(out.set(0, -0.145, 0.073));
  }

  getBellBodyCenter(bellIndex, out = new THREE.Vector3()) {
    const b = this.bells[Math.abs(Math.round(bellIndex)) % this.bells.length];
    if (!b) return out.set(0, 1.8, -0.13);
    b.pivot.updateWorldMatrix(true, false);
    return b.pivot.localToWorld(out.set(0, -0.122, 0));
  }

  getPaddleStrikePoint(out = new THREE.Vector3()) {
    this.paddleStrikeAnchor.updateWorldMatrix(true, false);
    return this.paddleStrikeAnchor.getWorldPosition(out);
  }

  /** Physical top of the existing brass front rail, including basin tilt. */
  getCounterStrikeTarget(x = 0, out = new THREE.Vector3()) {
    this.basinDeckGroup.updateWorldMatrix(true, false);
    return this.basinDeckGroup.localToWorld(out.set(THREE.MathUtils.clamp(x, -.48, .48), .0375, .34));
  }

  /** Front rolled steel lip rather than the ice mass or an approximate table height. */
  getTubRimStrikeTarget(index = 0, out = new THREE.Vector3()) {
    const tub = this.tubPositions[Math.abs(Math.floor(index)) % this.tubPositions.length];
    this.basinDeckGroup.updateWorldMatrix(true, false);
    return this.basinDeckGroup.localToWorld(out.set(tub.x, .061, .117));
  }

  /** Zero-based actual scoop center in world space, usable as a deposition anchor. */
  getScoopAnchor(index = 0, out = new THREE.Vector3()) {
    const scoop = this.scoopMeshes[THREE.MathUtils.clamp(Math.floor(index), 0, this.scoopMeshes.length - 1)];
    scoop.updateWorldMatrix(true, false);
    return scoop.getWorldPosition(out);
  }

  getScoopTopHeight(count) {
    const n = THREE.MathUtils.clamp(Math.ceil(Number(count) || 0), 0, MAX_SCOOPS);
    const layout = n > 4 ? LARGE_SCOOP_LAYOUT : CLASSIC_SCOOP_LAYOUT;
    let top = .035;
    for (let i = 0; i < n; i++) top = Math.max(top, layout[i][1] + layout[i][3]);
    return top;
  }

  applySelectedFlavorColors(flavorIndices = [0, 1, 2, 3]) {
    this.scoopMeshes.forEach((mesh, idx) => {
      const fIdx = flavorIndices[idx % flavorIndices.length] ?? idx;
      const flav =
        ICE_CREAM_FLAVORS[fIdx % ICE_CREAM_FLAVORS.length] ||
        ICE_CREAM_FLAVORS[0];
      mesh.material.color.setHex(flav.colorHex);
    });
  }

  _buildDiegetic3DCues() {
    this.sliceCueGroup = new THREE.Group();
    this.sliceCueGroup.visible = false;
    this.scene.add(this.sliceCueGroup);

    const dashMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.9,
    });
    for (let i = -4; i <= 4; i++) {
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(0.034, 0.009, 0.009),
        dashMat
      );
      dash.position.x = i * 0.052;
      this.sliceCueGroup.add(dash);
    }
  }

  /**
   * Completely Redesigned Anatomical 3D Vendor Puppet
   * Fixes Cezmi Dede's beard & glasses occlusion and adds 4 distinct Master Vendors!
   */
  _buildVendor() {
    this.vendorGroup = new THREE.Group();
    this.vendorGroup.position.set(0, 0, -0.86);
    this.scene.add(this.vendorGroup);

    this.vendorSkinMat = new THREE.MeshStandardMaterial({
      color: 0xe8ac84,
      roughness: 0.48,
    });
    this.vendorCheekMat = new THREE.MeshStandardMaterial({
      color: 0xd97f6c,
      roughness: 0.55,
    });
    this.vendorVestMat = new THREE.MeshStandardMaterial({
      color: 0x99151e,
      roughness: 0.45,
    });
    this.vendorShirtMat = new THREE.MeshStandardMaterial({
      color: 0xf7f4eb,
      roughness: 0.65,
    });
    this.vendorGoldMat = new THREE.MeshStandardMaterial({
      color: 0xf5b942,
      metalness: 0.85,
      roughness: 0.2,
    });
    this.vendorHairMat = new THREE.MeshStandardMaterial({
      color: 0x1c110b,
      roughness: 0.75,
    });

    this.vendorTorso = new THREE.Group();
    this.vendorTorso.position.set(0, 0.94, 0);
    this.vendorGroup.add(this.vendorTorso);

    const chest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.2, 0.56, 20),
      this.vendorShirtMat
    );
    chest.position.y = 0.28;
    chest.castShadow = true;
    this.vendorTorso.add(chest);

    // Traditional Maraş Cepken Embroidered Vest
    const vestLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.52, 0.34),
      this.vendorVestMat
    );
    vestLeft.position.set(-0.12, 0.29, 0.05);
    this.vendorTorso.add(vestLeft);

    const vestRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.52, 0.34),
      this.vendorVestMat
    );
    vestRight.position.set(0.12, 0.29, 0.05);
    this.vendorTorso.add(vestRight);

    const trimLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.526, 0.354),
      this.vendorGoldMat
    );
    trimLeft.position.set(-0.04, 0.29, 0.054);
    this.vendorTorso.add(trimLeft);

    const trimRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.526, 0.354),
      this.vendorGoldMat
    );
    trimRight.position.set(0.04, 0.29, 0.054);
    this.vendorTorso.add(trimRight);

    // Neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.078, 0.12, 14),
      this.vendorSkinMat
    );
    neck.position.set(0, 0.56, 0.01);
    this.vendorTorso.add(neck);

    // Head Group
    this.vendorHead = new THREE.Group();
    this.vendorHead.position.set(0, 0.67, 0.02);
    this.vendorTorso.add(this.vendorHead);

    const headSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.168, 28, 22),
      this.vendorSkinMat
    );
    headSphere.scale.set(0.96, 1.06, 0.94);
    headSphere.castShadow = true;
    this.vendorHead.add(headSphere);

    // Sculpted Ears & Warm Cheeks
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 12, 10),
        this.vendorSkinMat
      );
      ear.scale.set(0.45, 0.85, 0.65);
      ear.position.set(side * 0.162, 0.015, -0.005);
      this.vendorHead.add(ear);

      const cheek = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 12, 10),
        this.vendorCheekMat
      );
      cheek.scale.set(1.1, 0.75, 0.5);
      cheek.position.set(side * 0.088, -0.005, 0.138);
      this.vendorHead.add(cheek);
    });

    // Sculpted Nose (Bridge + Rounded Tip)
    const noseBridge = new THREE.Mesh(
      new THREE.ConeGeometry(0.028, 0.082, 14),
      this.vendorSkinMat
    );
    noseBridge.rotation.x = Math.PI * 0.38;
    noseBridge.position.set(0, 0.018, 0.168);
    this.vendorHead.add(noseBridge);

    const noseTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 12, 12),
      this.vendorSkinMat
    );
    noseTip.position.set(0, 0.002, 0.194);
    this.vendorHead.add(noseTip);

    // Bright, Expressive Eyes with Sclera, Iris, Pupil & Specular Catchlight
    // Placed at z = 0.158 (front of sclera at z = 0.186) so they are ALWAYS 100% visible!
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const irisMat = new THREE.MeshBasicMaterial({ color: 0x4a2511 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f0703 });
    this.eyes = [];
    this.pupils = [];
    [-0.064, 0.064].forEach((ex) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(ex, 0.048, 0.158);
      this.vendorHead.add(eyeGroup);

      const eyeW = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 16, 14),
        eyeWhiteMat
      );
      eyeW.scale.set(1.05, 0.95, 0.85);
      eyeGroup.add(eyeW);

      const pupilGroup = new THREE.Group();
      pupilGroup.position.set(0, 0, 0.021);
      eyeGroup.add(pupilGroup);

      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 12, 12),
        irisMat
      );
      iris.scale.set(1, 1, 0.35);
      pupilGroup.add(iris);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.0095, 10, 10),
        pupilMat
      );
      pupil.position.z = 0.003;
      pupil.scale.set(1, 1, 0.35);
      pupilGroup.add(pupil);

      const glint = new THREE.Mesh(
        new THREE.SphereGeometry(0.0042, 8, 8),
        eyeWhiteMat
      );
      glint.position.set(0.005, 0.005, 0.006);
      pupilGroup.add(glint);

      this.eyes.push(eyeGroup);
      this.pupils.push({ mesh: pupilGroup, baseX: 0 });
    });

    // Expressive Sculpted Eyebrows (Above eyes at y = 0.092, z = 0.168)
    this.leftBrow = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.011, 0.048, 6, 8),
      this.vendorHairMat
    );
    this.leftBrow.rotation.z = Math.PI * 0.5;
    this.leftBrow.position.set(-0.064, 0.092, 0.166);
    this.vendorHead.add(this.leftBrow);

    this.rightBrow = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.011, 0.048, 6, 8),
      this.vendorHairMat
    );
    this.rightBrow.rotation.z = Math.PI * 0.5;
    this.rightBrow.position.set(0.064, 0.092, 0.166);
    this.vendorHead.add(this.rightBrow);

    // Handlebar Mustache ("Pala Bıyık") — cleanly between nose (y=0.002) and mouth (y=-0.068)
    this.mustacheGroup = new THREE.Group();
    this.mustacheGroup.position.set(0, -0.032, 0.172);
    this.vendorHead.add(this.mustacheGroup);

    [-1, 1].forEach((dir) => {
      const stacheHalf = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.021, 0.076, 8, 12),
        this.vendorHairMat
      );
      stacheHalf.rotation.z = dir * (Math.PI * 0.43);
      stacheHalf.position.set(dir * 0.046, 0, 0);
      this.mustacheGroup.add(stacheHalf);

      const curlTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 10, 10),
        this.vendorHairMat
      );
      curlTip.position.set(dir * 0.096, 0.022, 0.004);
      this.mustacheGroup.add(curlTip);
    });

    // ARTICULATED JAW GROUP (Hinges downward on speech! Holds Mouth + Lower Beard so beard NEVER covers eyes!)
    this.jawGroup = new THREE.Group();
    this.jawGroup.position.set(0, -0.068, 0.02);
    this.vendorHead.add(this.jawGroup);

    this.vendorMouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x590d14 })
    );
    this.vendorMouth.position.set(0, 0, 0.132);
    this.vendorMouth.scale.set(1.2, 0.45, 0.5);
    this.jawGroup.add(this.vendorMouth);

    // Sculpted Multi-Lock Beard (for Cezmi Dede & Başusta Haydar)
    // Positioned strictly on the lower jaw & chin (y = -0.02 to -0.14 relative to jawGroup, i.e. y = -0.09 to -0.21 on head!)
    this.beardGroup = new THREE.Group();
    this.beardGroup.position.set(0, 0, 0);
    this.beardGroup.visible = false;
    this.jawGroup.add(this.beardGroup);

    // Chin & Jawline base
    const chinBeard = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 18, 14),
      this.vendorHairMat
    );
    chinBeard.scale.set(1.08, 0.88, 0.82);
    chinBeard.position.set(0, -0.055, 0.088);
    this.beardGroup.add(chinBeard);

    // Left & right sideburns along the lower jaw (stopping at y = +0.02 relative to jaw, well below eyes!)
    [-1, 1].forEach((side) => {
      const jawSideburn = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.032, 0.075, 8, 10),
        this.vendorHairMat
      );
      jawSideburn.rotation.z = side * 0.24;
      jawSideburn.position.set(side * 0.112, 0.005, 0.068);
      this.beardGroup.add(jawSideburn);
    });

    // 5 Sculpted Tapered Beard Locks hanging below the chin
    [-0.068, -0.034, 0, 0.034, 0.068].forEach((lx, idx) => {
      const lockLen = idx === 2 ? 0.095 : idx === 1 || idx === 3 ? 0.082 : 0.065;
      const lock = new THREE.Mesh(
        new THREE.ConeGeometry(0.036, lockLen, 12),
        this.vendorHairMat
      );
      lock.rotation.x = Math.PI * 0.96;
      lock.position.set(lx, -0.105 - (idx === 2 ? 0.015 : 0), 0.108 - Math.abs(lx) * 0.25);
      this.beardGroup.add(lock);
    });

    // Gleaming Gold-Rimmed Spectacles ("Gözlük") for Cezmi Dede & Başusta Haydar
    // Placed at y = 0.048, z = 0.196 (well in front of the eyes at z=0.186 and nose bridge at z=0.178)
    // with temple arms reaching back to the ears so they NEVER flicker or get occluded!
    this.glassesGroup = new THREE.Group();
    this.glassesGroup.position.set(0, 0.048, 0.196);
    this.glassesGroup.visible = false;
    this.vendorHead.add(this.glassesGroup);

    const glassFrameMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      metalness: 0.92,
      roughness: 0.15,
    });
    const glassLensMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      roughness: 0.08,
      metalness: 0.2,
    });

    [-0.064, 0.064].forEach((gx, idx) => {
      const side = idx === 0 ? -1 : 1;
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.038, 0.0055, 12, 28),
        glassFrameMat
      );
      rim.position.x = gx;
      this.glassesGroup.add(rim);

      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.002, 24),
        glassLensMat
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.x = gx;
      this.glassesGroup.add(lens);

      // Temple arm ("Gözlük Sapı") extending from outer rim back to the ear
      const templeArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.005, 0.006, 0.195),
        glassFrameMat
      );
      templeArm.position.set(side * 0.104, 0.004, -0.095);
      templeArm.rotation.y = side * -0.28;
      this.glassesGroup.add(templeArm);
    });

    const noseBridgeBar = new THREE.Mesh(
      new THREE.TorusGeometry(0.026, 0.0048, 8, 16, Math.PI),
      glassFrameMat
    );
    noseBridgeBar.position.set(0, 0.006, 0.002);
    this.glassesGroup.add(noseBridgeBar);

    // Classic Ottoman Fez (Pala Usta & Cezmi Dede)
    this.fezGroup = new THREE.Group();
    this.vendorHead.add(this.fezGroup);

    this.fezMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.152, 0.165, 22),
      new THREE.MeshStandardMaterial({ color: 0xa81018, roughness: 0.48 })
    );
    this.fezMesh.position.set(0, 0.205, -0.01);
    this.fezMesh.rotation.x = -0.08;
    this.fezGroup.add(this.fezMesh);

    // Golden turban sash around the base of the Fez for Grandmaster Haydar (Stage 9-10)
    this.grandmasterSash = new THREE.Mesh(
      new THREE.TorusGeometry(0.148, 0.026, 12, 28),
      this.vendorGoldMat
    );
    this.grandmasterSash.rotation.x = Math.PI / 2 - 0.08;
    this.grandmasterSash.position.set(0, 0.155, -0.005);
    this.grandmasterSash.visible = false;
    this.fezGroup.add(this.grandmasterSash);

    this.fezTassel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.024, 0.15, 10),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    this.fezTassel.position.set(0.13, 0.19, 0.02);
    this.fezTassel.rotation.z = -0.35;
    this.fezGroup.add(this.fezTassel);

    // Apprentice Cap (for Çırak Kadir)
    this.apprenticeCapGroup = new THREE.Group();
    this.apprenticeCapGroup.visible = false;
    this.vendorHead.add(this.apprenticeCapGroup);

    const capCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.145, 0.11, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
    );
    capCrown.position.set(0, 0.19, 0);
    capCrown.rotation.z = 0.08;
    this.apprenticeCapGroup.add(capCrown);

    const capBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.148, 0.148, 0.032, 20),
      new THREE.MeshStandardMaterial({ color: 0x1d6fa5 })
    );
    capBand.position.set(0, 0.145, 0);
    capBand.rotation.z = 0.08;
    this.apprenticeCapGroup.add(capBand);

    // Shoulder Anchors on Torso
    this.rightShoulderAnchor = new THREE.Object3D();
    this.rightShoulderAnchor.position.set(-0.31, 0.46, 0.12);
    this.vendorTorso.add(this.rightShoulderAnchor);

    this.leftShoulderAnchor = new THREE.Object3D();
    this.leftShoulderAnchor.position.set(0.31, 0.46, 0.12);
    this.vendorTorso.add(this.leftShoulderAnchor);

    this.rArmRig = this._createIKLimbRig('right');
    this.lArmRig = this._createIKLimbRig('left');

    this.leftHandConeProp = new THREE.Mesh(
      new THREE.ConeGeometry(0.056, 0.18, 18,1,true),
      new THREE.MeshStandardMaterial({
        map: this.waffleTexture,
        roughness: 0.6,
      })
    );
    this.leftHandConeProp.rotation.x = Math.PI;
    this.leftHandConeProp.position.set(0, 0.08, 0.03);
    this.leftHandConeProp.visible = false;
    this.lArmRig.handGroup.add(this.leftHandConeProp);

    // Paper-wrapped EMPTY wafer: the paper is below the rim, never a white ice cap.
    this.napkinConeProp = new THREE.Group();
    this.napkinConeProp.visible = false;
    this.napkinConeProp.position.set(0, 0.08, 0.03);
    const fakeWaffle = new THREE.Mesh(
      new THREE.ConeGeometry(0.056, 0.18, 18,1,true),
      new THREE.MeshStandardMaterial({
        map: this.waffleTexture,
        roughness: 0.6,
      })
    );
    fakeWaffle.rotation.x = Math.PI;
    this.napkinConeProp.add(fakeWaffle);

    const napMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.88,
      side: THREE.DoubleSide,
    });
    const fakeNapkinTop1 = new THREE.Mesh(
      new THREE.CylinderGeometry(.044,.014,.10,16,1,true,0,Math.PI*1.75),
      napMat
    );
    fakeNapkinTop1.position.y = -.025;
    fakeNapkinTop1.rotation.z = 0.18;
    this.napkinConeProp.add(fakeNapkinTop1);

    const fakeNapkinTop2 = new THREE.Mesh(
      new THREE.PlaneGeometry(.065,.095),
      napMat
    );
    fakeNapkinTop2.position.set(.012,-.026,.033);
    fakeNapkinTop2.rotation.y = 0.8;
    fakeNapkinTop2.rotation.x = -0.22;
    this.napkinConeProp.add(fakeNapkinTop2);
    this.lArmRig.handGroup.add(this.napkinConeProp);

    this.napkinProp = new THREE.Group();
    this.napkinProp.visible = false;
    const napFold1 = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.18, 4),
      napMat
    );
    napFold1.rotation.x = -0.25;
    this.napkinProp.add(napFold1);
    this.napkinProp.position.set(0, 0.06, 0.04);
    this.lArmRig.handGroup.add(this.napkinProp);
    this.vendorBody=new VendorBody(this);
  }

  /**
   * 3D Bazaar Spectator Puppets ("Etrafta Bizi İzleyen Kuklalar")
   * Watch the cone move in real time and clap/laugh/gasp on tricks!
   */
  _buildBazaarSpectators() {
    const specs = [
      {
        // Left Spectator: Curious Bazaar Kid in Striped Cap
        x: -1.26,
        z: -0.58,
        scale: 0.78,
        shirtColor: 0xf77f00,
        hatColor: 0x00b4d8,
        skinColor: 0xf2c6a0,
        hasHat: 'cap',
        hasMustache: false,
        phase: 0.4,
      },
      {
        // Right Spectator: Excited Tourist with Sun Hat & Camera
        x: 1.28,
        z: -0.56,
        scale: 0.94,
        shirtColor: 0x2ec4b6,
        hatColor: 0xffe66d,
        skinColor: 0xf4ccb0,
        hasHat: 'sunhat',
        hasMustache: false,
        phase: 1.9,
      },
      {
        // Back-Left Spectator: Bazaar Shopkeeper Neighbor with Fez/Mustache
        x: -1.52,
        z: -1.22,
        scale: 0.96,
        shirtColor: 0x6a4c93,
        hatColor: 0x9b2226,
        skinColor: 0xe0a980,
        hasHat: 'fez',
        hasMustache: true,
        phase: 3.1,
      },
    ];

    const eyeWMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    specs.forEach((cfg) => {
      const root = new THREE.Group();
      root.position.set(cfg.x, 0, cfg.z);
      root.scale.setScalar(cfg.scale);
      // Angle slightly toward the center of the stall
      root.rotation.y = cfg.x < 0 ? 0.45 : -0.45;
      this.scene.add(root);

      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.15, 0.52, 14),
        new THREE.MeshStandardMaterial({
          color: cfg.shirtColor,
          roughness: 0.65,
        })
      );
      torso.position.y = 0.96;
      torso.castShadow = true;
      root.add(torso);

      const skinMat = new THREE.MeshStandardMaterial({
        color: cfg.skinColor,
        roughness: 0.5,
      });

      const head = new THREE.Group();
      head.position.set(0, 1.38, 0);
      root.add(head);

      const skull = new THREE.Mesh(
        new THREE.SphereGeometry(0.135, 18, 16),
        skinMat
      );
      head.add(skull);

      const nose = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 10, 10),
        skinMat
      );
      nose.position.set(0, 0, 0.135);
      head.add(nose);

      [-0.045, 0.045].forEach((ex) => {
        const ew = new THREE.Mesh(
          new THREE.SphereGeometry(0.02, 10, 10),
          eyeWMat
        );
        ew.position.set(ex, 0.032, 0.12);
        head.add(ew);

        const ep = new THREE.Mesh(
          new THREE.SphereGeometry(0.01, 8, 8),
          eyePMat
        );
        ep.position.set(ex, 0.032, 0.136);
        head.add(ep);
      });

      const mouth = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0x6e1423 })
      );
      mouth.position.set(0, -0.048, 0.122);
      mouth.scale.set(1.2, 0.5, 0.5);
      head.add(mouth);

      if (cfg.hasMustache) {
        const stache = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.015, 0.08, 6, 8),
          new THREE.MeshStandardMaterial({ color: 0x2b1d14 })
        );
        stache.rotation.z = Math.PI / 2;
        stache.position.set(0, -0.024, 0.132);
        head.add(stache);
      }

      if (cfg.hasHat === 'cap') {
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(
            0.14,
            14,
            10,
            0,
            Math.PI * 2,
            0,
            Math.PI * 0.55
          ),
          new THREE.MeshStandardMaterial({ color: cfg.hatColor })
        );
        cap.position.y = 0.02;
        head.add(cap);
      } else if (cfg.hasHat === 'sunhat') {
        const brim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, 0.015, 18),
          new THREE.MeshStandardMaterial({ color: cfg.hatColor })
        );
        brim.position.y = 0.1;
        head.add(brim);
        const crown = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.13, 0.09, 16),
          new THREE.MeshStandardMaterial({ color: cfg.hatColor })
        );
        crown.position.y = 0.145;
        head.add(crown);
      } else if (cfg.hasHat === 'fez') {
        const fz = new THREE.Mesh(
          new THREE.CylinderGeometry(0.095, 0.115, 0.12, 16),
          new THREE.MeshStandardMaterial({ color: cfg.hatColor })
        );
        fz.position.y = 0.155;
        head.add(fz);
      }

      // Expressive Clapping Hands for each Spectator
      const leftHand = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 10, 10),
        skinMat
      );
      leftHand.position.set(-0.18, 1.05, 0.14);
      root.add(leftHand);

      const rightHand = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 10, 10),
        skinMat
      );
      rightHand.position.set(0.18, 1.05, 0.14);
      root.add(rightHand);

      this.spectators.push({
        root,
        head,
        mouth,
        leftHand,
        rightHand,
        baseX: cfg.x,
        baseY: 0,
        phase: cfg.phase,
      });
    });
  }

  triggerSpectatorReaction(type = 'cheer') {
    this.spectatorReactionType = type;
    this.spectatorReactionTimer = 1.4;
  }

  _createIKLimbRig(handedness = 'right') {
    const upperGroup = new THREE.Group();
    this.scene.add(upperGroup);
    const upperMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.054, 1, 12),
      this.vendorShirtMat
    );
    upperMesh.rotation.x = Math.PI / 2;
    upperMesh.position.z = 0.5;
    upperMesh.castShadow = true;
    upperGroup.add(upperMesh);

    const elbowSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 12, 12),
      this.vendorShirtMat
    );
    elbowSphere.position.z = 1.0;
    upperGroup.add(elbowSphere);

    const lowerGroup = new THREE.Group();
    this.scene.add(lowerGroup);
    const lowerMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.045, 1, 12),
      this.vendorSkinMat
    );
    lowerMesh.rotation.x = Math.PI / 2;
    lowerMesh.position.z = 0.5;
    lowerMesh.castShadow = true;
    lowerGroup.add(lowerMesh);

    const cuffMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.18, 12),
      this.vendorShirtMat
    );
    cuffMesh.rotation.x = Math.PI / 2;
    cuffMesh.position.z = 0.18;
    lowerGroup.add(cuffMesh);

    const handGroup = new THREE.Group();
    this.scene.add(handGroup);
    const anatomicalHand=typeof handedness==='string'?handedness:handedness<0?'left':'right';
    const handRig = new HandRig({material:this.vendorSkinMat,handedness:anatomicalHand});
    handGroup.add(handRig);
    // Non-rendering compatibility handles for older choreography reset paths.
    const fingerWraps = new THREE.Group(),openFingers = new THREE.Group();
    return {upperGroup,lowerGroup,handGroup,handRig,palm:handRig.palm,
      fingerWraps,openFingers,thumb:handRig.thumbPivot,
      wristAnchor:handRig.wristAnchor,gripAnchor:handRig.gripAnchor};
  }

  _solveArmIK(rig, shoulderWorld, targetWorld, elbowHintOffset, lockToGrip = false) {
    const solver=this._vendorArmSolver||(this._vendorArmSolver=new VendorArmSolver(this.vendorTorso,{presentation:true,counter:Boolean(this.basinDeckGroup)}));
    solver.prepare();
    const side=elbowHintOffset.x<0?-1:1;
    const gripAxis=lockToGrip?this.paddleRollGroup?.getWorldDirection(new THREE.Vector3()):null;
    const pose=solver.solveContinuous(shoulderWorld,targetWorld,{side,mode:this.vendorArmMode||'front',previous:rig.previousFrameElbow||rig.armPose?.elbow,clampReach:!lockToGrip,gripAxis},rig.previousArmFrame,this._handPoseDt);
    rig.shoulderWorld=shoulderWorld.clone();rig.armSide=side;rig.lockToGrip=lockToGrip;
    this._applyVendorArmPose(rig,pose);
    rig.handGroup.position.copy(pose.wrist);
    rig.handGroup.quaternion.copy(this.paddleGroup.quaternion);
  }

  _applyVendorArmPose(rig,pose) {
    rig.armPose=pose;
    if(!rig.shoulderCap){
      rig.shoulderCap=new THREE.Mesh(new THREE.SphereGeometry(.078,12,10),this.vendorShirtMat);
      rig.shoulderCap.castShadow=true;this.scene.add(rig.shoulderCap);
    }
    const base=this.vendorTorso?this.vendorTorso.localToWorld(new THREE.Vector3((rig.armSide||1)*.22,.46,.06)):(rig.shoulderWorld||pose.shoulder).clone();
    const shoulderAxis=pose.shoulder.clone().sub(base),span=shoulderAxis.length();
    rig.shoulderCap.position.copy(base).add(pose.shoulder).multiplyScalar(.5);
    if(span>.001)rig.shoulderCap.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),shoulderAxis.divideScalar(span));
    rig.shoulderCap.scale.set(.95,Math.max(1,(span+.11)/.156),.95);
    rig.upperGroup.position.copy(pose.shoulder);rig.upperGroup.lookAt(pose.elbow);
    rig.upperGroup.scale.set(1,1,pose.upperLength);
    rig.lowerGroup.position.copy(pose.elbow);rig.lowerGroup.lookAt(pose.wrist);
    rig.lowerGroup.scale.set(1,1,pose.lowerLength);
  }

  /** Shaft/wafer root stays in contact; skin joins the actual articulated wrist. */
  _fitArmToHand(rig) {
    if(!rig.handRig?.wristAnchor||!rig.shoulderWorld)return;
    const wrist=rig.handRig.wristAnchor.getWorldPosition(new THREE.Vector3());
    const solver=this._vendorArmSolver.prepare();
    const gripAxis=['pole','cone'].includes(rig.handRig.pose)
      ?new THREE.Vector3(1,0,0).transformDirection(rig.handRig.matrixWorld):null;
    const pose=solver.solveContinuous(rig.shoulderWorld,wrist,{side:rig.armSide,mode:this.vendorArmMode||'front',previous:rig.previousFrameElbow||rig.armPose?.elbow,clampReach:false,gripAxis},rig.previousArmFrame,this._handPoseDt);
    this._applyVendorArmPose(rig,pose);
  }

  _safeShaftGrip(tip,backward,shoulder,min,max,preferred,side) {
    const solver=this._vendorArmSolver||(this._vendorArmSolver=new VendorArmSolver(this.vendorTorso,{presentation:true,counter:Boolean(this.basinDeckGroup)}));
    solver.prepare();
    const rig=side<0?this.rArmRig:this.lArmRig;
    const direction=backward.clone().negate(),elbow=(rig.previousFrameElbow||rig.armPose?.elbow)?.clone()||shoulder.clone().add(new THREE.Vector3(side*.15,-.25,.06));
    const roll=Math.sin(this._displayedPaddleRoll||0)*(side<0?.18:.14),local=canonicalPoleHandRotation(rig.handRig.side),frames=new Map();
    const wristOffset=distance=>{
      const contact=tip.clone().addScaledVector(backward,distance);
      const frame=poleContactRotation(rig.handRig.side,direction,contact,elbow,roll,new THREE.Quaternion(),rig.poleFrameStart,this._handPoseDt*6);
      frames.set(distance,frame);
      return handGripCenter('pole',distance>.74?.027:.014).applyQuaternion(local).negate().applyQuaternion(frame);
    };
    const selected=solver.shaftGrip(tip,backward,shoulder,min,max,preferred,{side,mode:this.vendorArmMode||'front',wristOffset});
    selected.handFrame=frames.get(selected.distance);return selected;
  }

  _resolveVendorGrips(right,left,preferred=.82) {
    const read=()=>{
      const tip=this.paddleRollGroup.getWorldPosition(new THREE.Vector3());
      const backward=new THREE.Vector3(0,0,-1).applyQuaternion(this.paddleRollGroup.getWorldQuaternion(new THREE.Quaternion()));
      const rear=this._safeShaftGrip(tip,backward,right,.14,1.01,this.vendorRearGripHint??this._bareRearGrip??this._rearGripDistance??preferred,-1);
      return{tip,backward,rear};
    };
    let selected=read();
    // The blade can swivel tangent to the ice crown without moving the food.
    // Select the nearest safe handle lane when a large/inverted cone blocks it.
    if(!selected.rear.safe&&this.paddleContact?.active&&!this._resolvingVendorStance){
      const initial=this.paddleTangentOffset||0;let best=initial,bestScore=selected.rear.score;
      for(const delta of[.10,-.10,.17,-.17,.22,-.22,.45,-.45,.8,-.8,1.2,-1.2,1.7,-1.7]){
        this.paddleTangentOffset=initial+delta;this.paddleContact.update(this,this._displayedPaddleRoll||0);
        const candidate=read();
        if(candidate.rear.score<bestScore){bestScore=candidate.rear.score;best=this.paddleTangentOffset;}
        if(candidate.rear.safe){best=this.paddleTangentOffset;break;}
      }
      this.paddleTangentOffset=best;this.paddleContact.update(this,this._displayedPaddleRoll||0);selected=read();
    }
    const {tip,backward,rear}=selected;
    const front=this._safeShaftGrip(tip,backward,left,.12,rear.distance-.10,this._frontGripDistance??rear.distance-.30,1);
    front.safe=front.safe&&rear.distance-front.distance>=.099;
    this._rearGripDistance=rear.distance;this._frontGripDistance=front.distance;
    if(!rear.safe&&this.vendorTorso&&this.vendorGroup&&!this._resolvingVendorStance&&!Number.isFinite(this.vendorBodyYawHint)){
      const baseYaw=this._bodyTargetYaw??this.vendorTorso.rotation.y;
      const initial={yaw:this.vendorTorso.rotation.y,tangent:this.paddleTangentOffset||0,rear:this._rearGripDistance,front:this._frontGripDistance};
      const heldForward=this.paddleRollGroup.getWorldDirection(new THREE.Vector3());
      let best={...initial,result:{rear,front},score:rear.score};
      const sign=rear.wrist.x>=right.x?1:-1;
      const testedYaw=new Set([initial.yaw]);
      this._resolvingVendorStance=true;
      for(const turn of[.08,.16,.24]){
        const candidateYaw=THREE.MathUtils.clamp(initial.yaw+turn*sign,Math.max(-.65,baseYaw-.30),Math.min(.65,baseYaw+.30));
        if(testedYaw.has(candidateYaw))continue;testedYaw.add(candidateYaw);
        this.vendorTorso.rotation.y=candidateYaw;
        this.paddleTangentOffset=initial.tangent;this._rearGripDistance=initial.rear;this._frontGripDistance=initial.front;
        this.vendorGroup.updateMatrixWorld(true);
        this.rightShoulderAnchor.getWorldPosition(right);this.leftShoulderAnchor.getWorldPosition(left);
        const candidate=this._resolveVendorGrips(right,left,preferred);
        if(candidate.rear.score<best.score)best={yaw:this.vendorTorso.rotation.y,tangent:this.paddleTangentOffset,rear:this._rearGripDistance,front:this._frontGripDistance,result:candidate,score:candidate.rear.score};
        if(candidate.rear.safe)break;
      }
      this.vendorTorso.rotation.y=best.yaw;this.paddleTangentOffset=best.tangent;this._rearGripDistance=best.rear;this._frontGripDistance=best.front;
      this._vendorGripYawOffset=THREE.MathUtils.clamp(best.yaw-baseYaw,-.30,.30);
      this.vendorGroup.updateMatrixWorld(true);this.rightShoulderAnchor.getWorldPosition(right);this.leftShoulderAnchor.getWorldPosition(left);
      // The body moves beneath an already-held tool. Counter the changed
      // shoulder reference so the steel/contact does not rotate with the torso.
      if(this.paddleContact?.active&&this.paddleContact.scoop){
        this.paddleTangentOffset=0;
        const pose=this.paddleContact.poseForScoop(this,this.paddleContact.scoop),normal=pose.normal.clone(),base=pose.forward.clone();
        heldForward.addScaledVector(normal,-heldForward.dot(normal)).normalize();
        this.paddleTangentOffset=Math.atan2(normal.dot(new THREE.Vector3().crossVectors(base,heldForward)),base.dot(heldForward));
        this.paddleContact.update(this,this._displayedPaddleRoll||0);
      }
      this._resolvingVendorStance=false;
      return best.result;
    }
    return{rear,front};
  }

  _fitHandToShaft(rig, distance, wristRoll,selectedFrame=null) {
    const shaftDirection = new THREE.Vector3(0,0,1).applyQuaternion(this.paddleRollGroup.getWorldQuaternion(new THREE.Quaternion()));
    const frame=selectedFrame||poleContactRotation(rig.handRig.side,shaftDirection,rig.handGroup.position,rig.armPose?.elbow,wristRoll);
    rig.handGroup.quaternion.copy(frame);
    (rig.poleContactFrame ||= new THREE.Quaternion()).copy(frame);
    rig.handRig.placeGrip(new THREE.Vector3(),'pole','pole',distance>.74?.027:.014);
  }

  _setVendorOpenHand(rig,count=4,rest=false) {
    rig.handRig?.placeOpen(count);
    this._fitArmToHand?.(rig);
    if(rest&&rig.armPose){
      const forearm=rig.armPose.wrist.clone().sub(rig.armPose.elbow);
      const bodyRight=new THREE.Vector3(1,0,0).transformDirection(this.vendorTorso.matrixWorld);
      restHandRotation(rig.handRig.side,forearm,bodyRight,rig.handGroup.quaternion);
    }
  }

  beginVendorConeReceive(){
    this.vendorConeReceiveFrom=captureVendorHandPose(this.lArmRig);
    this.vendorConeReceiveProgress=0;
  }

  setVendorMood(mood = 'smile') {
    this.vendorMood = mood;
    if (mood === 'laugh') {
      this.vendorMouth.scale.set(1.45, 0.85, 0.6);
      this.leftBrow.position.y = 0.1;
      this.rightBrow.position.y = 0.1;
      this.leftBrow.rotation.z = Math.PI * 0.5 + 0.14;
      this.rightBrow.rotation.z = Math.PI * 0.5 - 0.14;
    } else if (mood === 'mischief') {
      this.vendorMouth.scale.set(1.3, 0.5, 0.5);
      this.leftBrow.position.y = 0.102;
      this.rightBrow.position.y = 0.086;
      this.leftBrow.rotation.z = Math.PI * 0.5 - 0.18;
      this.rightBrow.rotation.z = Math.PI * 0.5 + 0.18;
    } else if (mood === 'shock') {
      this.vendorMouth.scale.set(0.85, 1.1, 0.6);
      this.leftBrow.position.y = 0.108;
      this.rightBrow.position.y = 0.108;
      this.leftBrow.rotation.z = Math.PI * 0.5;
      this.rightBrow.rotation.z = Math.PI * 0.5;
    } else {
      this.vendorMouth.scale.set(1.2, 0.45, 0.5);
      this.leftBrow.position.y = 0.092;
      this.rightBrow.position.y = 0.092;
      this.leftBrow.rotation.z = Math.PI * 0.5 + 0.06;
      this.rightBrow.rotation.z = Math.PI * 0.5 - 0.06;
    }
  }

  setVendorCharacter(vendorIndex) {
    const idx = vendorIndex % 4;
    if (idx === 0) {
      // USTA 0: Çırak Kadir (Apprentice)
      this.vendorVestMat.color.setHex(0x16697a);
      this.vendorGoldMat.color.setHex(0xe2e8f0);
      this.vendorHairMat.color.setHex(0x3d2314);
      this.mustacheGroup.visible = false;
      this.beardGroup.visible = false;
      this.glassesGroup.visible = false;
      this.fezGroup.visible = false;
      this.grandmasterSash.visible = false;
      this.apprenticeCapGroup.visible = true;
      this.vendorTorso.scale.set(0.94, 0.98, 0.94);
    } else if (idx === 1) {
      // USTA 1: Pala Usta (Classic Fez + Handlebar Mustache)
      this.vendorVestMat.color.setHex(0x99151e);
      this.vendorGoldMat.color.setHex(0xf5b942);
      this.vendorHairMat.color.setHex(0x180d06);
      this.mustacheGroup.visible = true;
      this.mustacheGroup.scale.set(1.18, 1.18, 1.18);
      this.beardGroup.visible = false;
      this.glassesGroup.visible = false;
      this.fezGroup.visible = true;
      this.fezMesh.material.color.setHex(0xa81018);
      this.grandmasterSash.visible = false;
      this.apprenticeCapGroup.visible = false;
      this.vendorTorso.scale.set(1.06, 1.02, 1.05);
    } else if (idx === 2) {
      // USTA 2: Cezmi Dede (Snow-White Sculpted Beard + Gold-Rimmed Glasses + Deep Burgundy Fez)
      this.vendorVestMat.color.setHex(0x4a154b);
      this.vendorGoldMat.color.setHex(0xffd166);
      this.vendorHairMat.color.setHex(0xf4f4f6);
      this.mustacheGroup.visible = true;
      this.mustacheGroup.scale.set(1.22, 1.18, 1.18);
      this.beardGroup.visible = true;
      this.glassesGroup.visible = true;
      this.fezGroup.visible = true;
      this.fezMesh.material.color.setHex(0x6e0d1c);
      this.grandmasterSash.visible = false;
      this.apprenticeCapGroup.visible = false;
      this.vendorTorso.scale.set(1.03, 1.0, 1.04);
    } else {
      // USTA 3: Başusta Haydar Baba (Grandmaster with Emerald-Gold Turban Fez + Silver Beard + Glasses)
      this.vendorVestMat.color.setHex(0x0f4c3a);
      this.vendorGoldMat.color.setHex(0xffd700);
      this.vendorHairMat.color.setHex(0xd4d4d8);
      this.mustacheGroup.visible = true;
      this.mustacheGroup.scale.set(1.32, 1.25, 1.25);
      this.beardGroup.visible = true;
      this.glassesGroup.visible = true;
      this.fezGroup.visible = true;
      this.fezMesh.material.color.setHex(0x8c141b);
      this.grandmasterSash.visible = true;
      this.apprenticeCapGroup.visible = false;
      this.vendorTorso.scale.set(1.08, 1.04, 1.08);
    }
    this.setVendorMood('smile');
  }

  _buildTouristPOVHand() {
    this.touristHand = new THREE.Group();
    this.touristHand.position.set(0.22, 1.08, 0.62);
    this.scene.add(this.touristHand);

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf2c29b,
      roughness: 0.46,
      metalness: 0.05,
    });

    // All palm rotation originates at this wrist, where the forearm terminates.
    // Keeping a shared joint prevents the old center-pivot palm from separating.
    const wristCenter = new THREE.Vector3(0, -0.05, 0.012);
    this.playerWristRest = wristCenter.clone();
    const armEnd = new THREE.Vector3(0.105, -0.28, 0.37);
    const armAxis = wristCenter.clone().sub(armEnd).normalize();
    this.touristForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.055, PLAYER_FOREARM_LENGTH, 14),
      skinMat
    );
    this.touristForearm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), armAxis);
    this.touristForearm.position.copy(wristCenter).add(armEnd).multiplyScalar(0.5);
    this.touristForearm.castShadow = true;
    this.touristHand.add(this.touristForearm);

    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.059, PLAYER_UPPER_ARM_LENGTH, 14),
      new THREE.MeshStandardMaterial({ color: 0x1d3557, roughness: 0.7 })
    );
    sleeve.quaternion.copy(this.touristForearm.quaternion);
    sleeve.position.copy(armEnd).addScaledVector(armAxis, 0.025);
    this.touristHand.add(sleeve);
    this.touristSleeve = sleeve;


    this.playerHandRig = new HandRig({material:skinMat,handedness:'right'});
    this.playerHandRig.position.copy(wristCenter);
    this.touristHand.add(this.playerHandRig);
    this.palmGroup = this.playerHandRig;
    this.touristPalm = this.playerHandRig.palm;
    this.touristWrist = this.playerHandRig.wrist;
    this.fingers = this.playerHandRig.fingers;
    for (const name of ['thumbPivot','thumbJoint','thumbBaseJoint','thumbProximal','thumbKnuckle','thumbDistal'])this[name]=this.playerHandRig[name];
    this.playerAimAnchor = this.playerHandRig.aimAnchor;
    this.touristHand.updateWorldMatrix(true,true);
    this.playerAimReference = this.touristHand.worldToLocal(this.playerAimAnchor.getWorldPosition(new THREE.Vector3()));

    const bracelet = new THREE.Mesh(new THREE.TorusGeometry(.031,.0035,8,18),new THREE.MeshStandardMaterial({color:0x00b4d8,roughness:.35}));
    this.touristHand.add(bracelet);this.touristBracelet=bracelet;this.playerBraceletRest=wristCenter.clone();
    this.heldSocket = new THREE.Group();
    this.heldSocket.position.copy(HAND_GRIP_CENTER);
    this.playerHandRig.add(this.heldSocket);
    fitPlayerForearm(this);

    this.heldEmptyCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.19, 18),
      new THREE.MeshStandardMaterial({
        map: this.outerWaffleTexture,
        roughness: 0.55,
      })
    );
    this.heldEmptyCone.rotation.x = Math.PI;
    this.heldEmptyCone.visible = false;
    this.heldSocket.add(this.heldEmptyCone);

    this.heldNapkin = new THREE.Mesh(
      new THREE.PlaneGeometry(.14,.13,5,5),
      new THREE.MeshStandardMaterial({color:0xf7f0e1,roughness:.95,side:THREE.DoubleSide})
    );
    this.heldNapkin.visible = false;
    this.heldSocket.add(this.heldNapkin);

    this.heldNapkinCone = new THREE.Group();
    this.heldNapkinCone.visible = false;
    const hWaffle = new THREE.Mesh(
      new THREE.ConeGeometry(0.056, 0.18, 18,1,true),
      new THREE.MeshStandardMaterial({
        map: this.waffleTexture,
        roughness: 0.6,
      })
    );
    hWaffle.rotation.x = Math.PI;
    this.heldNapkinCone.add(hWaffle);
    const hNapMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    const hNap1 = new THREE.Mesh(
      new THREE.CylinderGeometry(.044,.014,.10,16,1,true,0,Math.PI*1.75),
      hNapMat
    );
    hNap1.position.y = -.025;
    hNap1.rotation.z = 0.2;
    this.heldNapkinCone.add(hNap1);
    const hNap2 = new THREE.Mesh(
      new THREE.PlaneGeometry(.065,.095),
      hNapMat
    );
    hNap2.position.set(.012,-.026,.033);
    hNap2.rotation.y = 0.8;
    hNap2.rotation.x = -0.22;
    this.heldNapkinCone.add(hNap2);
    this.heldSocket.add(this.heldNapkinCone);
  }

  throwHeldProp(propType = 'EMPTY_CONE', dirX = 1) {
    let sourceObj = this.heldEmptyCone;
    if (propType === 'NAPKIN_CONE') sourceObj = this.heldNapkinCone;
    else if (propType === 'NAPKIN') sourceObj = this.heldNapkin;

    const clone = sourceObj.clone(true);
    const startWorld = new THREE.Vector3();
    this.touristHand.getWorldPosition(startWorld);

    const sign = dirX >= 0 ? 1 : -1;
    const linVel = new THREE.Vector3(
      sign * (1.8 + Math.random() * 0.8),
      2.2 + Math.random() * 0.6,
      -1.6 - Math.random() * 0.6
    );
    const angVel = new THREE.Vector3(
      (Math.random() - 0.5) * 14,
      (Math.random() - 0.5) * 14,
      -sign * 12
    );
    this.rigidBodies.spawnThrownObject(clone, startWorld, linVel, angVel, 0.06);
  }

  projectToScreen(worldVec) {
    const w = Math.max(1, window.visualViewport?.width || window.innerWidth);
    const h = Math.max(1, window.visualViewport?.height || window.innerHeight);
    const v = worldVec.clone().project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * w,
      y: (-(v.y * 0.5) + 0.5) * h,
    };
  }

  launchScoopFromTub(tubIndex, onImpact) {
    const tub =
      this.tubPositions[tubIndex % this.tubPositions.length] ||
      this.tubPositions[0];
    this.rigidBodies.spawnFlyingScoop(
      tub.color,
      tub.worldPos,
      () => this.coneSpring.pos,
      () => {
        this.scoopJiggleSpring.impulse(
          (Math.random() - 0.5) * 2.0,
          -3.0,
          (Math.random() - 0.5) * 2.0
        );
        this.spawnBurst(this.coneSpring.pos, tub.color, 16);
        if (onImpact) onImpact();
      }
    );
  }

  updateIceCreamScoops(scoopCount, showCrownTopping = false) {
    const amount = THREE.MathUtils.clamp(Number(scoopCount) || 0, 0, MAX_SCOOPS);
    const count = Math.ceil(amount);
    const layout = count > 4 ? LARGE_SCOOP_LAYOUT : CLASSIC_SCOOP_LAYOUT;
    let highest = 0;
    this.scoopMeshes.forEach((mesh, index) => {
      const pose = layout[index] || LARGE_SCOOP_LAYOUT[index];
      mesh.visible = index < count;
      this.scoopLayoutTargets[index].set(pose[0], pose[1], pose[2]);
      const radius = mesh.geometry.parameters.radius;
      this.scoopScaleTargets[index].setScalar(pose[3] / radius);
      if (amount > 0 && amount < 1 && index === 0) {
        this.scoopLayoutTargets[index].y = .025;
        this.scoopScaleTargets[index].set(.75, .5, .75);
      }
      if (index < count && pose[1] + pose[3] > (layout[highest]?.[1] ?? 0) + (layout[highest]?.[3] ?? 0)) highest = index;
      if (!this._scoopLayoutInitialized) { mesh.position.copy(this.scoopLayoutTargets[index]); mesh.scale.copy(this.scoopScaleTargets[index]); }
    });
    this._scoopLayoutInitialized = true;
    const top = layout[highest] || CLASSIC_SCOOP_LAYOUT[0];
    this.toppingGroup.position.set(top[0], this.getScoopTopHeight(count) - .015, top[2]);
    this.toppingGroup.visible = Boolean(showCrownTopping && count > 0);
    if (this.waferStick) {
      this.waferStick.rotation.z = count > 4 ? -1.05 : -.35;
      this.waferStick.position.set(count > 4 ? .05 : .025, count > 4 ? 0 : .03, 0);
    }
  }

  updateServingLayout(dt) {
    const blend = 1 - Math.exp(-Math.max(0, dt) * 14);
    this.scoopMeshes.forEach((mesh, index) => {
      mesh.position.lerp(this.scoopLayoutTargets[index], blend);
      mesh.scale.lerp(this.scoopScaleTargets[index], blend);
    });
  }

  triggerScoopJiggle(power = 1.0) {
    this.scoopJiggleSpring.impulse(
      (Math.random() - 0.5) * 2.2 * power,
      -3.2 * power,
      (Math.random() - 0.5) * 2.2 * power
    );
  }

  ringBells(power = 1.0) {
    this.bells.forEach((b, i) => {
      const sign = i % 2 === 0 ? 1 : -1;
      b.velZ += sign * (8.5 + Math.random() * 5) * power;
      b.velX += (Math.random() - 0.5) * 6.5 * power;
      b.clapperVelZ += -sign * (15 + Math.random() * 8) * power;
      b.clapperVelX += (Math.random() - 0.5) * 10 * power;
      b.shimmerTimer = Math.max(b.shimmerTimer, 0.36 * power);
    });
  }

  /**
   * Strikes a specific overhead brass bell (`0..6`), triggering realistic bell-body swing,
   * independent clapper rebound against the lip, golden shimmer ring, and spark burst!
   */
  strikeBell(bellIndex, power = 1.0) {
    if (!this.bells || !this.bells.length) return;
    const idx = Math.abs(Math.round(bellIndex)) % this.bells.length;
    const b = this.bells[idx];
    if (!b) return;

    this.getBellBodyCenter(idx, b.worldPos);
    b.strikeCooldown = 0.28;

    const dir = idx < 3 ? -1 : idx > 3 ? 1 : Math.random() < 0.5 ? -1 : 1;
    b.velZ += dir * 13.5 * power;
    b.velX += (0.5 + Math.random() * 0.5) * 9.0 * power;
    b.clapperVelZ += -dir * 24.0 * power;
    b.clapperVelX += 14.0 * power;
    b.shimmerTimer = 0.52;
    this.spawnBurst(b.worldPos, 0xffe194, Math.round(10 * power));
  }

  /**
   * Animates the ice cream mass inside a specific stainless-steel bucket when scraped!
   */
  churnTubIceCream(tubIndex, power = 1.0) {
    if (!this.tubIceGroups || !this.tubIceGroups.length) return;
    const idx = Math.abs(Math.round(tubIndex)) % this.tubIceGroups.length;
    const tig = this.tubIceGroups[idx];
    if (tig) {
      tig.churnEnergy = Math.min(1.5, tig.churnEnergy + 0.65 * power);
    }
  }

  spawnBurst(worldPos, color = 0xf5b942, count = 16) {
    count=Math.max(0,Math.ceil(count));
    if(!Number.isFinite(count)||count===0)return;
    const geo = new THREE.OctahedronGeometry(0.017, 0);
    const mat = new THREE.MeshBasicMaterial({ color });
    const resources={geometry:geo,material:mat,remaining:count};
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(worldPos);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.6,
        0.5 + Math.random() * 1.3,
        (Math.random() - 0.5) * 1.6
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, vel, life: 0.7, resources });
    }
  }

  updateBurstParticles(dt) {
    for(let i=this.particles.length-1;i>=0;i--){
      const p=this.particles[i];p.life-=dt;
      if(p.life<=0){
        this.scene.remove(p.mesh);this.particles.splice(i,1);
        // A burst shares one geometry/material; release after its final mote.
        if(p.resources&&--p.resources.remaining===0){p.resources.geometry.dispose();p.resources.material.dispose();}
      }else{
        p.vel.y-=4.0*dt;p.mesh.position.addScaledVector(p.vel,dt);
        p.mesh.rotation.x+=5*dt;p.mesh.rotation.y+=5*dt;
        p.mesh.scale.setScalar(Math.max(.01,p.life*1.3));
      }
    }
  }

  updateTouristHand(targetPos, grabCurl = 0.15, lungeBoost = 0, dt = 0.016, directTouch = false, time=0) {
    this.handSpring.target.copy(targetPos);
    if (directTouch) {
      // The phone hand is a direct extension of the finger: no lag below it.
      this.handSpring.pos.copy(targetPos); this.handSpring.vel.set(0, 0, 0);
    }
    const pos = this.handSpring.step(dt);
    this.touristHand.position.copy(pos);
    const resting=!this.playerPointerActive&&(!directTouch||this.playerPointerResting)&&!this.playerConeGripRequested&&!playerOwnsCone(this);
    if(resting){this.touristHand.position.y+=Math.sin(time*1.8)*.004;this.touristHand.position.x+=Math.sin(time*.9)*.002;}

    const v = this.handSpring.vel;
    playerFreeHandRotation(pos.x,pos.y,time,this.playerHandRig.quaternion);
    const isHoldingObject=this.heldEmptyCone.visible||this.heldNapkin.visible||
      this.heldNapkinCone.visible||this.servingNapkin?.visible&&this.servingNapkin.parent===this.heldSocket||
      this.outerConeGroup?.visible&&this.outerConeGroup.parent===this.heldSocket||this.conePivot.parent===this.heldSocket;
    const coneGrip=playerOwnsCone(this)||this.playerConeGripRequested||(grabCurl>.85&&!isHoldingObject);
    const servingPaper=this.servingNapkin?.visible&&this.servingNapkin.parent===this.heldSocket;
    const paperOnly=!coneGrip&&(this.heldNapkin.visible||servingPaper);
    const poseBlend=1-Math.exp(-Math.max(0,dt)*18);
    this.playerHandRig.setPose(paperOnly?'pinch':this.playerInspectPointing?'point':'relaxed',poseBlend,{curl:grabCurl});
    applyPlayerConeGrip(this,dt,coneGrip);
    if(paperOnly){
      this.playerHandRig.setPose('pinch',poseBlend);
      // Keep the existing paper and socket; align its authored held edge with
      // the moving thumb/index pinch. Do not cancel the paper's transfer path.
      const edge=servingPaper?new THREE.Vector3(0,.06,-.018):new THREE.Vector3(0,.08,0);
      edge.applyQuaternion(this.heldSocket.quaternion);
      this.heldSocket.position.copy(this.playerHandRig.gripAnchor.position).sub(edge);
    }
    if(directTouch&&!this.playerConeGripRequested){
      const visual=constrainPlayerArmDepth(this,targetPos,this.playerRenderAim ||= new THREE.Vector3());
      this.alignPlayerTipTo(visual);
    }
    fitPlayerForearm(this);
  }

  /** Presentation alignment only. The logical spring and raw input remain at
   * their canonical target, while the actual posed fingertip is the cursor. */
  alignPlayerTipTo(target) {
    this.touristHand.updateWorldMatrix(true,true);
    const tip=this.playerAimAnchor.getWorldPosition(new THREE.Vector3());
    this.touristHand.position.add(new THREE.Vector3().copy(target).sub(tip));
    this.touristHand.updateWorldMatrix(true,true);
  }

  /** Convert a fingertip destination to the authored hand-root destination.
   * Use the current articulated pose, without moving the hand or its cone. */
  getPlayerTipRootTarget(tipWorld,out=new THREE.Vector3()) {
    this.touristHand.updateWorldMatrix(true,true);
    const offset=this.playerAimAnchor.getWorldPosition(new THREE.Vector3())
      .sub(this.touristHand.getWorldPosition(new THREE.Vector3()));
    return out.copy(tipWorld).sub(offset);
  }

  fitPlayerForearm() { fitPlayerForearm(this); }

  setPlayerConeGrip(enabled) { this.playerConeGripRequested = Boolean(enabled); }

  getPlayerConeGripTarget(coneWorldPosition, out = new THREE.Vector3()) {
    return playerConeGripTarget(this, coneWorldPosition, out);
  }

  /** Idle start: the real empty cone is offered by hand; the pole tip is bare. */
  prepareEmptyConeOffer() {
    this.clearTrickPresentations?.();
    this.clearServingNapkin?.();
    this.stretchyStrand?.detach();
    this.handoffOuterCone?.('nested', false);
    this.handoffCone('vendor');
    this.conePivot.position.set(0, .11, .035);
    this.conePivot.quaternion.identity();
    if (this.stallEffects) this.stallEffects.coneMoving = false;
    this.mainConeMesh.visible = this.conePivot.visible = true;
    this.carryScoop.visible = false;
    this.updateIceCreamScoops(0, false);
    this.coneHandTiltZ = 0;
    this.playerConeGripRequested = false;
    this._emptyConeOffer = { releaseAge:0 };
  }

  updateEmptyConeOffer(time, dt, { reach = 0, receiving = false } = {}) {
    this.beginPoseFrame();
    if (!this._emptyConeOffer) this.prepareEmptyConeOffer();
    const amount = THREE.MathUtils.clamp(reach, 0, 1);
    const offered = new THREE.Vector3(.06, 1.20 + Math.sin(time * 1.25) * .006, -.10);
    const resting = new THREE.Vector3(.21, 1.22, -.30);
    let hand = resting.clone().lerp(offered, .74 + amount * .26);
    if (receiving && this.conePivot.parent === this.heldSocket) {
      this._emptyConeOffer.releaseAge += Math.max(0, dt);
      hand.lerp(resting, THREE.MathUtils.smoothstep(this._emptyConeOffer.releaseAge, .10, .55));
    } else this._emptyConeOffer.releaseAge = 0;
    this.paddleGroup.position.set(-.25, 1.11, -.22);
    this.coneSpring.pos.copy(this.paddleGroup.position); this.coneSpring.target.copy(this.paddleGroup.position); this.coneSpring.vel.set(0,0,0);
    const oldForward=this.vendorPoleForwardHint,oldGrip=this.vendorRearGripHint;
    this.vendorPoleForwardHint=new THREE.Vector3(.08,-.98,.18).normalize();this.vendorRearGripHint=.30;
    this.orientPaddleAndHands(0, hand, dt, 0, 0);
    this.vendorPoleForwardHint=oldForward;this.vendorRearGripHint=oldGrip;
    if (receiving && this.conePivot.parent === this.heldSocket) this._setVendorOpenHand(this.lArmRig, 4, true);
  }

  getConeOfferTarget(out = new THREE.Vector3()) {
    this.conePivot.updateWorldMatrix(true, false);
    return this.conePivot.getWorldPosition(out);
  }

  setConeOfferGlow(amount=0){
    const material=this.mainConeMesh?.material;if(!material?.emissive)return;
    if(!this._offerGlowRest)this._offerGlowRest={color:material.emissive.clone(),intensity:material.emissiveIntensity};
    if(amount>0){material.emissive.setHex(0xffcf8a);material.emissiveIntensity=.08+.14*amount;}
    else{material.emissive.copy(this._offerGlowRest.color);material.emissiveIntensity=this._offerGlowRest.intensity;}
  }

  resetPaddleOrientation() {
    this.servingOrientation?.reset();
    this._poseFrameManaged=false;this._poseFramePending=false;
    this._displayedPaddleRoll = 0;
    this._leftHandOnShaft = false;
    this._leftSupportRecovery=null;
    this._vendorGripYawOffset=0;this._resolvingVendorStance=false;
    this.paddleTangentOffset=0;this._rearGripDistance=this._frontGripDistance=this._bareRearGrip=null;
    if(this.rArmRig)this.rArmRig.armPose=null;
    if(this.lArmRig)this.lArmRig.armPose=null;
    if(this.rArmRig)this.rArmRig.previousFrameElbow=null;
    if(this.lArmRig)this.lArmRig.previousFrameElbow=null;
    if(this.rArmRig)this.rArmRig.previousArmFrame=null;
    if(this.lArmRig)this.lArmRig.previousArmFrame=null;
    if (this.paddleRollGroup) { this.paddleRollGroup.position.set(0, 0, 0); this.paddleRollGroup.rotation.set(0, 0, 0); }
    if (!this.paddleAngularMotion) {
      this.paddleAngularMotion = {
        shaft: new AngularMotion({ response: 22, maxSpeed: 14 }),
        flip: new AngularMotion({ response: 18, maxSpeed: 8 }),
        pitch: new AngularMotion({ response: 20, maxSpeed: 6 }),
      };
      this.paddleAimQuaternion = new THREE.Quaternion();
    } else {
      Object.values(this.paddleAngularMotion).forEach((channel) => channel.reset(0));
    }
  }

  beginPoseFrame(){this._poseFrameManaged=true;this._poseFramePending=true;}

  /**
   * True 3D Paddle & Cone Orientation!
   * Supports:
   * - `shaftRoll`: Spinning the metal rod & cone 360° around its own axis ("kendi etrafında çevirme")
   * - `coneFlipZ`: Flipping the cone upside down (180°) or full somersaults (360°)
   * - `conePitchX`: Tilting/pitching the cone up & down ("yukarı aşağı çevirme")
   */
  orientPaddleAndHands(
    shaftRoll = 0,
    leftHandCustomTarget = null,
    dt = 0.016,
    coneFlipZ = 0,
    conePitchX = 0,
    leftHandGesture = null
  ) {
    dt = Math.max(0, Math.min(0.1, Number.isFinite(dt) ? dt : 0));
    // A new palm frame must not rotate the serving before its authored tilt.
    const heldConeStart=this.coneHeldByVendor&&this.conePivot.parent===this.lArmRig.handGroup
      ?this.conePivot.getWorldQuaternion(this._heldConeStart ||= new THREE.Quaternion()):null;
    const advance=!this._poseFrameManaged||this._poseFramePending;this._poseFramePending=false;
    if(advance){
      this._handPoseDt=dt;this.paddleContact?.beginPoseFrame(this,dt);
      for(const rig of[this.rArmRig,this.lArmRig])rig.poleFrameStart=rig.handRig.getWorldQuaternion(rig.poleFrameStart||new THREE.Quaternion());
    }else{
      dt=0; // Exact strike/contact refits do not advance animation a second time.
    }
    if (!this.paddleAngularMotion) this.resetPaddleOrientation();
    const displayedRoll = this.paddleAngularMotion.shaft.step(shaftRoll, dt);
    this._displayedPaddleRoll = displayedRoll;
    const displayedFlip = this.paddleAngularMotion.flip.step(coneFlipZ, dt);
    const displayedPitch = this.paddleAngularMotion.pitch.step(conePitchX, dt);
    const tipPos = this.paddleGroup.position;
    const vendorChestCenter = new THREE.Vector3(
      tipPos.x * 0.12 - 0.36,
      1.26 + (tipPos.y - 1.24) * 0.10,
      -0.46
    );
    if(!poleHasFood(this))vendorChestCenter.set(-.26,1.40+(tipPos.y-1.24)*.08,-.45);

    const awayFromChest = this.vendorPoleForwardHint
      ? tipPos.clone().add(this.vendorPoleForwardHint)
      : tipPos.clone().multiplyScalar(2).sub(vendorChestCenter);
    this.paddleAimQuaternion.copy(this.paddleGroup.quaternion);
    this.paddleGroup.lookAt(awayFromChest);
    if(!this.vendorPoleForwardHint)this.paddleGroup.quaternion.slerp(this.paddleAimQuaternion, Math.exp(-dt * 22));
    this.paddleRollGroup.rotation.z = displayedRoll;

    // Let the cone physically tilt up/down (conePitchX), revolve with shaftRoll, and flip (coneFlipZ)!
    if (this.conePivot.parent === this.paddleGroup) {
      // Axial turns rotate the serving around its long axis with a readable
      // wrist rock. Deliberate flip/windmill shows retain their full rotation.
      const axialSpin=Boolean(this.presentationAxialSpin);
      this.conePivot.rotation.set(
        -this.paddleGroup.rotation.x * 0.55 + displayedPitch,
        -this.paddleGroup.rotation.y * 0.65 + Math.sin(displayedRoll) * 0.45 + (axialSpin?displayedRoll:0),
        (axialSpin?Math.sin(displayedRoll)*.12:displayedRoll) + displayedFlip
      );
      (this.servingOrientation ||= new ServingOrientation()).apply(this.conePivot,axialSpin,dt);
    }else{
      this.servingOrientation?.reset();
    }

    // Spine and shoulder girdle lead a reach; elbows then route around clothing.
    const bodyBlend=1-Math.exp(-dt*7);
    const largeServing=(this.scoopMeshes?.filter(mesh=>mesh.visible).length||0)>4;
    const holdingServing=this.conePivot.parent===this.paddleGroup||this.coneHeldByVendor||this.scoopStackGroup?.parent===this.paddleGroup||
      (this.scoopStackGroup?.parent===this.outerConeGroup&&this.outerConeGroup?.parent===this.paddleGroup);
    // A bare pole approaches the crown, but its loaded logical root is the
    // wafer pivot. Use one serving height on both sides of this handoff so
    // the torso is already ready when the low/inverted show resumes.
    let bodyWorkY=largeServing&&this.vendorLargeServingReturn
      ? this.conePivot.getWorldPosition(this._bodyServingPoint ||= new THREE.Vector3()).y
      : tipPos.y;
    if(this.vendorPoleFree&&this.coneHeldByVendor&&!Number.isFinite(this.vendorBodyYawHint)){
      bodyWorkY=Math.max(bodyWorkY,this.conePivot.getWorldPosition(this._bodyServingPoint ||= new THREE.Vector3()).y);
    }
    // A broad, heavy serving needs a lower working stance. Establish it before
    // the resumed inversion, while the front rejoin is already in progress.
    // The authored behind-back orbit keeps its original upright clearance.
    const largeStance=largeServing&&holdingServing&&(poleHasFood(this)||this.vendorLargeServingReturn)&&!this.presentationAxialSpin&&(!Number.isFinite(this.vendorBodyYawHint)||this.vendorLargeServingReturn)
      ? (this.vendorLargeServingReturn?1:1-THREE.MathUtils.smoothstep(tipPos.y,1.40,1.70)) : 0;
    this._bodyTargetYaw=tipPos.x*.30;
    if(!Number.isFinite(this.vendorBodyYawHint))this._vendorGripYawOffset=(this._vendorGripYawOffset||0)*Math.exp(-dt*.8);
    const bodyYaw=Number.isFinite(this.vendorBodyYawHint)?this.vendorBodyYawHint:this._bodyTargetYaw+(this._vendorGripYawOffset||0);
    this.vendorTorso.rotation.y = THREE.MathUtils.lerp(
      this.vendorTorso.rotation.y,
      THREE.MathUtils.clamp(bodyYaw,-.65,.65),
      bodyBlend
    );
    this.vendorTorso.rotation.x = THREE.MathUtils.lerp(
      this.vendorTorso.rotation.x,
      THREE.MathUtils.clamp((1.28-bodyWorkY)*.18+Math.max(0,tipPos.z)*.12+largeStance*.20,-.14,.42),
      bodyBlend
    );
    const stanceOffset=THREE.MathUtils.clamp(this.vendorBodyOffsetX||0,-.22,.22);
    this.vendorTorso.position.x=THREE.MathUtils.lerp(this.vendorTorso.position.x,THREE.MathUtils.clamp(tipPos.x*.06,-.045,.045)+stanceOffset,bodyBlend);
    this.vendorTorso.position.y=THREE.MathUtils.lerp(this.vendorTorso.position.y,.94+THREE.MathUtils.clamp((bodyWorkY-1.24)*.15,-.065,.10)-largeStance*.10,bodyBlend);
    this.vendorTorso.position.z=THREE.MathUtils.lerp(this.vendorTorso.position.z,THREE.MathUtils.clamp(tipPos.z*.12,0,.06),bodyBlend);
    this.rightShoulderAnchor.position.x=-.31;this.leftShoulderAnchor.position.x=.31;
    this.rightShoulderAnchor.position.z=this.leftShoulderAnchor.position.z=.12;

    this.vendorGroup.updateMatrixWorld(true);
    this.paddleGroup.updateMatrixWorld(true);
    if (this.carryScoop?.visible) {
      this.carryScoop.position.copy(this.paddleGroup.position).y += this.paddleCarryOffsetY ?? .035;
    }
    this.paddleContact?.update(this, displayedRoll);
    const shaftTipPos = this.paddleRollGroup.getWorldPosition(new THREE.Vector3());
    const shaftRotation = this.paddleRollGroup.getWorldQuaternion(new THREE.Quaternion());
    const distToChest = shaftTipPos.distanceTo(vendorChestCenter);
    const preferredRear = Math.min(0.94, Math.max(0.56, distToChest * 0.92));

    const rShoulderWorld = new THREE.Vector3();
    const lShoulderWorld = new THREE.Vector3();
    this.rightShoulderAnchor.getWorldPosition(rShoulderWorld);
    this.leftShoulderAnchor.getWorldPosition(lShoulderWorld);

    // Slide each grip along the real shaft into arm reach before solving IK.
    // Clamping a hand independently in world space used to detach it from the rod.
    const backward = new THREE.Vector3(0, 0, -1).applyQuaternion(shaftRotation);
    const previous=this._rearGripDistance??.45;
    this._bareRearGrip=poleHasFood(this)?null:previous+THREE.MathUtils.clamp(.45-previous,-dt*.65,dt*.65);
    if(!this.paddleContact?.active&&!this.vendorPoleForwardHint){
      const trial=this._safeShaftGrip(shaftTipPos,backward,rShoulderWorld,.14,1.01,this._rearGripDistance??preferredRear,-1);
      if(!trial.safe){this.paddleGroup.lookAt(awayFromChest);this.paddleGroup.updateMatrixWorld(true);}
    }
    const {rear,front}=this._resolveVendorGrips(rShoulderWorld,lShoulderWorld,preferredRear);
    this.paddleRearGripAnchor.position.set(0, 0, -rear.distance);
    this.paddleFrontGripAnchor.position.set(0, 0, -front.distance);
    this.paddleGroup.updateMatrixWorld(true);

    const rearGripWorld = new THREE.Vector3();
    const frontGripWorld = new THREE.Vector3();
    this.paddleRearGripAnchor.getWorldPosition(rearGripWorld);
    this.paddleFrontGripAnchor.getWorldPosition(frontGripWorld);

    this._solveArmIK(
      this.rArmRig,
      rShoulderWorld,
      rearGripWorld,
      new THREE.Vector3(-0.35, -0.5, -0.2),
      true
    );
    this._fitHandToShaft(this.rArmRig, rear.distance, Math.sin(displayedRoll) * 0.18,rear.handFrame);

    const stockArrival=this.collectedCones?.reusing?.target;
    // A wafer travelling from the rack still needs a waiting receiving hand;
    // hiding its destination must not send that hand back to the pole mid-flight.
    const vendorHoldsCone = this.coneHeldByVendor ||
      ((this.outerConeGroup?.visible||(stockArrival&&stockArrival===this.outerConeGroup)) && this.outerConeGroup.parent === this.lArmRig.handGroup);
    const legacyCone = [this.leftHandConeProp,this.napkinConeProp].find(prop=>(prop?.visible||(stockArrival&&stockArrival===prop))&&prop?.parent===this.lArmRig.handGroup);
    const legacyPaper = this.napkinProp?.visible&&this.napkinProp.parent===this.lArmRig.handGroup ? this.napkinProp : null;
    let leftPresentationTarget = leftHandCustomTarget || (vendorHoldsCone ? new THREE.Vector3(.18, 1.22, -.20) : null);
    const releasedSupport=!leftPresentationTarget&&!front.safe;
    if(releasedSupport){leftPresentationTarget=this.vendorTorso.localToWorld(new THREE.Vector3(.36,.25,.34));leftPresentationTarget.y=Math.max(1.15,leftPresentationTarget.y);}
    const reaction = this._vendorReaction;
    const reactionArm = reaction && !leftHandCustomTarget && !this.coneHeldByVendor &&
      !this.leftHandConeProp?.visible && !this.napkinProp?.visible && !this.napkinConeProp?.visible &&
      ['greeting', 'recognition', 'photo'].includes(reaction.kind);
    if (this.lArmRig.openFingers) this.lArmRig.openFingers.visible = false;
    if (this.lArmRig.coneFingerWraps) this.lArmRig.coneFingerWraps.visible = false;
    this.lArmRig.fingerWraps.visible = true;
    this.lArmRig.fingerWraps.children.forEach((finger) => { finger.visible = true; });
    if (reactionArm) {
      const blend = Math.sin(Math.min(1, reaction.age / reaction.duration) * Math.PI);
      const destination = reaction.kind === 'photo' ? new THREE.Vector3(.12, 1.48, -.40) : new THREE.Vector3(.28, reaction.kind === 'recognition' ? 1.36 : 1.44, -.29);
      leftPresentationTarget = frontGripWorld.clone().lerp(destination, blend);
    }
    const emptyRest=Boolean(leftPresentationTarget)&&!reactionArm&&!leftHandGesture&&!vendorHoldsCone&&!legacyCone&&!legacyPaper&&
      !(this.servingNapkin?.visible&&this.servingNapkin.parent===this.lArmRig.handGroup)&&!Number.isFinite(this.vendorConeReceiveProgress);
    if (((releasedSupport||reactionArm)&&this._leftHandOnShaft||emptyRest&&this.lArmRig.handRig.position.lengthSq()>1e-10)&&this.lArmRig.handRig?.wristAnchor) {
      // A pole grip root is at the steel contact; an open-hand root is at its
      // wrist. Rebase the spring to that same wrist before changing the pose.
      this.lArmRig.handRig.wristAnchor.getWorldPosition(this.leftPropSpring.pos);
      this.leftPropSpring.vel.set(0,0,0);
    }
    const supportWanted=!leftPresentationTarget&&!legacyCone&&!legacyPaper;
    if(!supportWanted)this._leftSupportRecovery=null;
    else if(!this._leftHandOnShaft&&this.lArmRig.armPose&&!this._leftSupportRecovery)
      this._leftSupportRecovery=new VendorSupportReach(this.lArmRig,this.leftPropSpring);
    const recovery=this._leftSupportRecovery;
    let recoveringTarget=null;
    if(recovery){
      const direction=new THREE.Vector3(0,0,1).applyQuaternion(this.paddleRollGroup.getWorldQuaternion(new THREE.Quaternion()));
      recoveringTarget=recovery.update(this.lArmRig,frontGripWorld,direction,Math.sin(displayedRoll)*.14,dt,this._vendorArmSolver.prepare(),front.distance>.74?.027:.014,front.handFrame);
    }else if (leftPresentationTarget) {
      this.leftPropSpring.target.copy(leftPresentationTarget);
    } else {
      this.leftPropSpring.target.copy(frontGripWorld);
    }
    // A held pole is a hard contact constraint. Only independent props lag softly.
    const lTarget = recoveringTarget || (leftPresentationTarget ? this.leftPropSpring.step(dt) : frontGripWorld);
    this._leftHandOnShaft = supportWanted&&!recovery;
    if (!leftPresentationTarget&&!recovery) {
      this.leftPropSpring.pos.copy(frontGripWorld);
      this.leftPropSpring.vel.set(0, 0, 0);
    }

    this._solveArmIK(
      this.lArmRig,
      lShoulderWorld,
      lTarget,
      new THREE.Vector3(0.35, -0.5, -0.2),
      this._leftHandOnShaft
    );
    if(recovery){
      recovery.apply(this.lArmRig,dt);
      if(recovery.ready(this.lArmRig)){
        this._leftSupportRecovery=null;this._leftHandOnShaft=true;
        this.lArmRig.handGroup.position.copy(frontGripWorld);this.leftPropSpring.pos.copy(frontGripWorld);this.leftPropSpring.vel.set(0,0,0);
        this._fitHandToShaft(this.lArmRig,front.distance,Math.sin(displayedRoll)*.14,front.handFrame);
      }
    }else if (!leftPresentationTarget) this._fitHandToShaft(this.lArmRig, front.distance, Math.sin(displayedRoll) * 0.14,front.handFrame);
    else if (reactionArm || leftHandGesture) {
      this._setVendorOpenHand(this.lArmRig, reaction?.kind === 'photo' ? 1 : 4);
      if (reaction?.kind === 'photo' && this.stallDecor) {
        const direction = this.stallDecor.props.photo.group.getWorldPosition(new THREE.Vector3()).sub(this.lArmRig.handGroup.position).normalize();
        this.lArmRig.handGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      }
    }else if(emptyRest){
      this._setVendorOpenHand(this.lArmRig,4,true);
    }

    if(Number.isFinite(this.vendorConeReceiveProgress)&&this.vendorConeReceiveFrom)
      applyVendorReceivingGrip(this.lArmRig,this.vendorConeReceiveProgress,this.vendorConeReceiveFrom);
    else if (vendorHoldsCone) applyVendorConeGrip(this.lArmRig, this.coneHandTiltZ || 0);
    else if(legacyCone)applyVendorConeGrip(this.lArmRig,0,legacyCone.position);
    else if(legacyPaper){
      // Pinch the actual front fold's lower edge. The paper and its authored
      // owner/target remain untouched; only the same articulated fingers pose.
      const fold=legacyPaper.children[0],edge=new THREE.Vector3(.04,-.09,.04);
      if(fold){fold.updateMatrix();edge.applyMatrix4(fold.matrix);}else edge.set(0,0,0);
      edge.add(legacyPaper.position);applyVendorPaperGrip(this.lArmRig,edge);
    }

    if(this.servingNapkin?.visible&&this.servingNapkin.parent===this.lArmRig.handGroup&&!vendorHoldsCone&&!legacyCone)
      applyVendorPaperGrip(this.lArmRig,new THREE.Vector3(0,.07,0));
    if (this.coneHeldByVendor && this.conePivot.parent === this.lArmRig.handGroup) {
      this.conePivot.position.lerp(new THREE.Vector3(0, 0.11, 0.035), Math.min(1, dt * 12));
      if(heldConeStart)this.conePivot.quaternion.copy(this.lArmRig.handGroup.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(heldConeStart));
      orientVendorHeldCone(this, dt);
    } else if (this.conePivot.parent === this.paddleGroup) {
      this.coneHeldByVendor = false;
      this.conePivot.position.lerp(new THREE.Vector3(0, 0.02, 0), Math.min(1, dt * 14));
    }
    (this.servingClearance ||= new ServingClearance()).apply(this);
    this.refreshPaddleAttachment();
    const handRole=this._leftHandOnShaft||this._leftSupportRecovery?'pole':vendorHoldsCone||legacyCone?'cone':legacyPaper||this.servingNapkin?.visible&&this.servingNapkin.parent===this.lArmRig.handGroup?'paper':'free';
    if(this.lArmRig.handRig)(this.lArmRig.poseBlend ||= new VendorHandBlend(this.lArmRig)).apply(handRole,dt);
    this._fitArmToHand(this.lArmRig);
  }

  /** Refit after food deformation/ownership settling, before rendering. */
  refreshPaddleAttachment() {
    if (!this.paddleContact || !this.rArmRig) return;
    this.paddleContact.update(this, this._displayedPaddleRoll || 0);
    const tip = this.paddleRollGroup.getWorldPosition(new THREE.Vector3());
    const backward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.paddleRollGroup.getWorldQuaternion(new THREE.Quaternion()));
    const right = this.rightShoulderAnchor.getWorldPosition(new THREE.Vector3());
    const left = this.leftShoulderAnchor.getWorldPosition(new THREE.Vector3());
    const {rear,front}=this._resolveVendorGrips(right,left);
    this.paddleRearGripAnchor.position.set(0, 0, -rear.distance);
    this.paddleFrontGripAnchor.position.set(0, 0, -front.distance);
    this.paddleRollGroup.updateWorldMatrix(true, true);
    this._solveArmIK(this.rArmRig, right, this.paddleRearGripAnchor.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(-.35, -.5, -.2), true);
    this._fitHandToShaft(this.rArmRig, rear.distance, Math.sin(this._displayedPaddleRoll || 0) * .18,rear.handFrame);
    this._fitArmToHand(this.rArmRig);
    if (this._leftHandOnShaft && front.safe) {
      const target = this.paddleFrontGripAnchor.getWorldPosition(new THREE.Vector3());
      this.leftPropSpring.pos.copy(target); this.leftPropSpring.vel.set(0, 0, 0);
      this._solveArmIK(this.lArmRig, left, target, new THREE.Vector3(.35, -.5, -.2), true);
      this._fitHandToShaft(this.lArmRig, front.distance, Math.sin(this._displayedPaddleRoll || 0) * .14,front.handFrame);
      this._fitArmToHand(this.lArmRig);
    }
  }

  updateEnvironmentAnimations(
    time,
    dt,
    dizzyAmount = 0,
    cameraShake = 0,
    onBellHit = null,
    voiceMouthOpen = 0
  ) {
    this.rigidBodies.update(dt);
    this.updateServingLayout(dt);
    this.stallEffects?.update(dt);
    this.collectedCones?.update(dt);
    this.stallDecor?.update(time);

    // Real-time Vendor Lip-Sync & Jaw/Beard/Mustache Animation
    // Note: jawGroup hinges DOWNWARD (-0.068 - voiceMouthOpen * 0.024) so the beard NEVER rises over the face!
    if (voiceMouthOpen > 0.01) {
      this.vendorMouth.scale.set(
        1.25 + voiceMouthOpen * 0.4,
        0.45 + voiceMouthOpen * 1.35,
        0.65
      );
      this.jawGroup.position.y = -0.068 - voiceMouthOpen * 0.024;
      this.jawGroup.rotation.x = voiceMouthOpen * 0.18;
      this.mustacheGroup.position.y = -0.032 + voiceMouthOpen * 0.008;
      this.mustacheGroup.rotation.z =
        Math.sin(time * 28) * voiceMouthOpen * 0.08;
      this.vendorHead.position.y = 0.67 + voiceMouthOpen * 0.015;
    } else {
      this.jawGroup.position.y = -0.068;
      this.jawGroup.rotation.x = 0;
      this.mustacheGroup.position.y = -0.032;
      this.mustacheGroup.rotation.z = 0;
      this.vendorHead.position.y = 0.67 + Math.sin(Number.isFinite(this.vendorBeatPhase)?this.vendorBeatPhase*Math.PI*2:time*2.2) * 0.005;
      this.setVendorMood(this.vendorMood || 'smile');
    }

    if (this._vendorReaction) {
      const reaction = this._vendorReaction;
      reaction.age += Math.max(0, dt);
      const p = Math.min(1, reaction.age / reaction.duration);
      const envelope = Math.sin(p * Math.PI);
      if(reaction.kind==='refusal'){
        this.vendorHead.rotation.x=-.08*envelope;
        this.vendorHead.rotation.y=Math.sin(p*Math.PI*3)*.14*envelope;
        this.vendorHead.rotation.z=Math.sin(p*Math.PI*2)*.10*envelope;
        if(p>.42&&!reaction.grinning){reaction.grinning=true;this.setVendorMood('mischief');}
      }else{
        this.vendorHead.rotation.x = Math.sin(p * Math.PI * (reaction.kind === 'recognition' ? 4 : 2)) * .12 * envelope;
        this.vendorHead.rotation.y = reaction.kind === 'photo' ? -.24 * envelope : .035 * Math.sin(p * Math.PI * 2);
      }
      if (p >= 1) { this.vendorHead.rotation.set(0, 0, 0); this._vendorReaction = null; }
    }

    if(Number.isInteger(this.vendorBellLook)&&!this._vendorReaction){
      this._bellLooking=true;const target=this.getBellBodyCenter(this.vendorBellLook),b=1-Math.exp(-dt*9);
      this.vendorHead.rotation.x=THREE.MathUtils.lerp(this.vendorHead.rotation.x,-.13,b);
      this.vendorHead.rotation.y=THREE.MathUtils.lerp(this.vendorHead.rotation.y,target.x*.42,b);
    }
    if(!Number.isInteger(this.vendorBellLook)&&this._bellLooking&&!this._vendorReaction){this.vendorHead.rotation.x*=Math.exp(-dt*9);if(Math.abs(this.vendorHead.rotation.x)<.002)this._bellLooking=false;}
    // Natural Vendor Eye Blinking
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      if (!this.isBlinking) {
        this.isBlinking = true;
        this.blinkTimer = 0.11;
        this.eyes.forEach((e) => e.scale.set(1, 0.12, 1));
      } else {
        this.isBlinking = false;
        this.blinkTimer = 2.8 + Math.random() * 1.8;
        this.eyes.forEach((e) => e.scale.set(1, 1, 1));
      }
    }

    // Animate Spectator Puppets watching the cone and reacting!
    if(this._faceTouch){
      const reaction=this._faceTouch;reaction.age+=dt;
      const p=Math.min(1,reaction.age/1.1),amount=Math.sin(p*Math.PI);
      this.vendorHead.position.z=.02-amount*.055;
      this.vendorHead.rotation.x=-amount*.13;
      this.vendorHead.rotation.y=Math.sin(p*Math.PI*3)*amount*.16;
      this.leftBrow.rotation.z=Math.PI*.5-.38*amount;
      this.rightBrow.rotation.z=Math.PI*.5+.38*amount;
      this.eyes.forEach(eye=>eye.scale.y=this.isBlinking?.12:1-amount*(reaction.part==='eye'?.8:.35));
      if(p>=1){this._faceTouch=null;this.vendorHead.position.z=.02;this.vendorHead.rotation.set(0,0,0);this.setVendorMood(this.vendorMood);}
    }

    if (this.spectatorReactionTimer > 0) {
      this.spectatorReactionTimer = Math.max(
        0,
        this.spectatorReactionTimer - dt
      );
    }
    const paddlePos = this.paddleGroup.position;
    this.spectators.forEach((sp) => {
      const lookYaw = THREE.MathUtils.clamp(
        (paddlePos.x - sp.baseX * 0.25) * 0.45,
        -0.5,
        0.5
      );
      const lookPitch = THREE.MathUtils.clamp(
        (1.3 - paddlePos.y) * 0.35,
        -0.3,
        0.3
      );
      sp.head.rotation.y = THREE.MathUtils.lerp(
        sp.head.rotation.y,
        lookYaw,
        Math.min(1, dt * 8)
      );
      sp.head.rotation.x = THREE.MathUtils.lerp(
        sp.head.rotation.x,
        lookPitch,
        Math.min(1, dt * 8)
      );

      if (this.spectatorReactionTimer > 0) {
        const bounce = Math.abs(Math.sin(time * 14 + sp.phase)) * 0.07;
        sp.root.position.y = bounce;
        const clap = Math.sin(time * 22 + sp.phase) * 0.09;
        sp.leftHand.position.set(-0.11 + clap, 1.14, 0.2);
        sp.rightHand.position.set(0.11 - clap, 1.14, 0.2);
        sp.mouth.scale.set(1.4, 0.95, 0.6);
      } else {
        sp.root.position.y = Math.sin(time * 2.1 + sp.phase) * 0.01;
        sp.leftHand.position.set(-0.18, 1.05, 0.14);
        sp.rightHand.position.set(0.18, 1.05, 0.14);
        sp.mouth.scale.set(1.2, 0.5, 0.5);
      }
    });

    // The extracted mass is carried by the pole, not also left inside its tub.
    if (this.tubIceGroups) {
      this.tubIceGroups.forEach((tig) => {
        tig.group.visible=!tig.moldOut;
        if(tig.moldOut)return;
        if (tig.churnEnergy > 0.005) {
          tig.churnEnergy = Math.max(0, tig.churnEnergy - dt * 1.6);
          tig.group.rotation.y += dt * 7.5 * tig.churnEnergy;
          const swell = 1 + Math.sin(time * 18 + tig.phase) * 0.12 * tig.churnEnergy;
          tig.group.scale.set(1 / Math.sqrt(swell), swell, 1 / Math.sqrt(swell));
          tig.group.position.y = tig.baseY + tig.churnEnergy * 0.018;
        } else {
          tig.group.scale.set(1, 1, 1);
          tig.group.position.y = tig.baseY;
        }
        tig.group.scale.y *= tig.fill ?? 1;
        tig.group.position.y -= (1 - (tig.fill ?? 1)) * 0.035;
      });
    }

    if (this.sliceCueGroup.visible) {
      this.sliceCueGroup.position.set(
        this.paddleGroup.position.x * 0.5,
        1.22 + Math.sin(time * 6) * 0.02,
        0.18
      );
    }

    const coneVelX =
      (this.paddleGroup.position.x - this.prevConePos.x) / Math.max(0.005, dt);
    const coneVelY =
      (this.paddleGroup.position.y - this.prevConePos.y) / Math.max(0.005, dt);
    this.prevConePos.copy(this.paddleGroup.position);

    this.scoopJiggleSpring.impulse(
      -coneVelX * 0.35 * dt,
      -coneVelY * 0.28 * dt,
      0
    );
    const jiggle = this.scoopJiggleSpring.step(dt);

    const squashY = THREE.MathUtils.clamp(1 + jiggle.y * 1.2, 0.78, 1.25);
    const invSquash = 1 / Math.sqrt(squashY);
    const servingFactor = this.scoopStackGroup.parent === this.conePivot ? 1 : this.servingScale;
    this.scoopStackGroup.scale.set(invSquash * servingFactor, squashY * servingFactor, invSquash * servingFactor);
    this.scoopStackGroup.rotation.z = THREE.MathUtils.clamp(
      jiggle.x * 1.8,
      -0.32,
      0.32
    );
    if((this.servingClearance ||= new ServingClearance()).apply(this))this._fitArmToHand(this.lArmRig);
    this.refreshPaddleAttachment();

    this.lanterns.forEach((l) => {
      l.group.rotation.z = Math.sin(time * 1.4 + l.phase) * 0.05;
    });

    const handPos = this.touristHand.position;
    const paddleStrikePoint = this.getPaddleStrikePoint();
    const previousStrikePoint = this.previousPaddleStrikePoint || paddleStrikePoint;

    // Coupled 2-DOF Bell Body + Independent Internal Clapper Pendulum & Shimmer Ring Animation
    this.bells.forEach((b) => {
      this.getBellBodyCenter(b.index, b.worldPos);
      b.strikeCooldown = Math.max(0, b.strikeCooldown - dt);
      const distHand = handPos.distanceTo(b.worldPos);
      const bodyRadius = 0.074 * b.pivot.scale.x;
      const handContact = this.playerCounterInteractionEnabled!==false && distHand < bodyRadius + 0.055;
      const paddleContact = distanceToSegment(b.worldPos, previousStrikePoint, paddleStrikePoint) < bodyRadius + 0.018;
      if (handContact && !b.handInContact && b.strikeCooldown === 0) {
        this.strikeBell(b.index, 0.65);
        if (onBellHit) onBellHit(0.78, b.worldPos.x, b.index);
      } else if (paddleContact && !poleHasFood(this) && !b.paddleInContact && b.strikeCooldown === 0) {
        this.strikeBell(b.index, 0.8);
        if (onBellHit) onBellHit(0.92, b.worldPos.x, b.index);
      }
      b.handInContact = handContact;
      b.paddleInContact = paddleContact;

      // Outer brass bell swing physics
      const springZ = -115 * b.angleZ - 4.4 * b.velZ;
      const springX = -115 * b.angleX - 4.4 * b.velX;
      b.velZ += springZ * dt;
      b.velX += springX * dt;
      b.angleZ = THREE.MathUtils.clamp(b.angleZ + b.velZ * dt, -0.68, 0.68);
      b.angleX = THREE.MathUtils.clamp(b.angleX + b.velX * dt, -0.55, 0.55);

      // High-frequency acoustic vibration shudder while ringing
      const ringVib =
        b.shimmerTimer > 0 ? Math.sin(time * 68 + b.index) * 0.025 * b.shimmerTimer : 0;
      b.pivot.rotation.z = b.angleZ + ringVib;
      b.pivot.rotation.x = b.angleX;

      // Independent inner clapper pendulum with rim collision rebound!
      if (b.clapperPivot) {
        const cSpringZ = -210 * b.clapperAngleZ - 3.6 * b.clapperVelZ - springZ * 0.45;
        const cSpringX = -210 * b.clapperAngleX - 3.6 * b.clapperVelX - springX * 0.45;
        b.clapperVelZ += cSpringZ * dt;
        b.clapperVelX += cSpringX * dt;
        b.clapperAngleZ += b.clapperVelZ * dt;
        b.clapperAngleX += b.clapperVelX * dt;

        // Rim impact bounce when clapper hits inside of bell wall
        if (Math.abs(b.clapperAngleZ) > 0.34) {
          b.clapperAngleZ = Math.sign(b.clapperAngleZ) * 0.34;
          b.clapperVelZ *= -0.62;
        }
        if (Math.abs(b.clapperAngleX) > 0.3) {
          b.clapperAngleX = Math.sign(b.clapperAngleX) * 0.3;
          b.clapperVelX *= -0.62;
        }
        b.clapperPivot.rotation.z = b.clapperAngleZ;
        b.clapperPivot.rotation.x = b.clapperAngleX;
      }

      // Acoustic golden shimmer ring expansion
      if (b.shimmerTimer > 0) {
        b.shimmerTimer = Math.max(0, b.shimmerTimer - dt);
        const norm = b.shimmerTimer / 0.52;
        b.shimmerRing.visible = true;
        b.shimmerMat.opacity = norm * 0.85;
        const sScale = 1 + (1 - norm) * 0.9;
        b.shimmerRing.scale.set(sScale, sScale, 1);
      } else if (b.shimmerMat) {
        b.shimmerMat.opacity = 0;
        b.shimmerRing.visible = false;
      }
    });
    if (!this.previousPaddleStrikePoint) this.previousPaddleStrikePoint = new THREE.Vector3();
    this.previousPaddleStrikePoint.copy(paddleStrikePoint);

    this.pupils.forEach((p) => {
      p.mesh.position.x =
        p.baseX + THREE.MathUtils.clamp(paddlePos.x * 0.015, -0.008, 0.008);
      p.mesh.position.y = THREE.MathUtils.clamp(
        (paddlePos.y - 1.3) * 0.014,
        -0.006,
        0.006
      );
    });

    this.updateBurstParticles(dt);

    const swayX =
      Math.sin(time * 1.6) * 0.005 +
      Math.sin(time * 4.5) * (0.04 * dizzyAmount);
    const swayY =
      Math.cos(time * 1.3) * 0.005 +
      Math.cos(time * 3.8) * (0.025 * dizzyAmount);
    const shakeX = (Math.random() - 0.5) * cameraShake * 0.05;
    const shakeY = (Math.random() - 0.5) * cameraShake * 0.05;

    this.camera.position.set(
      this.baseCamPos.x + swayX + shakeX,
      this.baseCamPos.y + swayY + shakeY,
      this.baseCamPos.z
    );
    this.camera.rotation.z = Math.sin(time * 4.2) * (0.04 * dizzyAmount);
    this.vendorBody?.update(time,dt);
    this.stretchCutView?.update(dt);
    this.culturalScene?.update(dt);
    for(const rig of[this.rArmRig,this.lArmRig])if(rig?.armPose){
      (rig.previousFrameElbow ||= new THREE.Vector3()).copy(rig.armPose.elbow);
      const frame=(rig.previousArmFrame ||= {base:new THREE.Vector3(),shoulder:new THREE.Vector3(),elbow:new THREE.Vector3(),wrist:new THREE.Vector3()});
      frame.base.copy(rig.shoulderWorld);frame.shoulder.copy(rig.armPose.shoulder);frame.elbow.copy(rig.armPose.elbow);frame.wrist.copy(rig.armPose.wrist);
    }
    this._poseFrameManaged=false;
  }

  onResize() {
    const w = Math.max(1, window.visualViewport?.width || window.innerWidth);
    const h = Math.max(1, window.visualViewport?.height || window.innerHeight);
    const size=resizeRenderer(this.renderer,w,h,Math.min(window.devicePixelRatio||1,2),this._renderSize);
    // The constructor allocates the buffer before the first camera fitting.
    if(size===this._renderSize&&size===this._cameraSize)return;
    this._renderSize=size;this._cameraSize=size;
    const aspect = w / h;
    this.camera.aspect = aspect;
    const framing=shopCameraProfile(w,h);
    this.camera.fov=framing.fov;
    this.baseCamPos.fromArray(framing.position);
    this.baseCamTarget.fromArray(framing.target);
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(this.baseCamTarget);
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
