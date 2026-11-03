import * as THREE from 'three';
import {
  SpringVec3,
  StretchyDondurmaStrand,
  RigidBodyManager,
} from './physics.js';
import { ICE_CREAM_FLAVORS } from './protocol.js';

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
    this.baseCamPos = new THREE.Vector3(0, 1.52, 1.05);
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(0, 1.28, -0.55);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
    this.scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xff7b29, 2.4, 8);
    rimLight.position.set(-1.6, 2.3, -1.8);
    this.scene.add(rimLight);

    const cyanLight = new THREE.PointLight(0x2ec4b6, 1.5, 7);
    cyanLight.position.set(1.7, 2.2, -1.5);
    this.scene.add(cyanLight);
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

    // Traditional Anatolian Carpet Runner in front of the Ice Cream Cart
    const rugGroup = new THREE.Group();
    rugGroup.position.set(0, 0.004, 0.35);
    const rugOuter = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.15),
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.9 })
    );
    rugOuter.rotation.x = -Math.PI / 2;
    rugGroup.add(rugOuter);
    const rugBorder = new THREE.Mesh(
      new THREE.PlaneGeometry(1.98, 0.95),
      new THREE.MeshStandardMaterial({ color: 0xf5b942, roughness: 0.85 })
    );
    rugBorder.rotation.x = -Math.PI / 2;
    rugBorder.position.y = 0.002;
    rugGroup.add(rugBorder);
    const rugInner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.82, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x4a0e17, roughness: 0.9 })
    );
    rugInner.rotation.x = -Math.PI / 2;
    rugInner.position.y = 0.004;
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

  _buildIceCreamCart() {
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

    const baseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.76, 0.92, 0.68),
      copperMat
    );
    baseMesh.position.y = 0.46;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.cartGroup.add(baseMesh);

    const signPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.58, 0.72),
      new THREE.MeshStandardMaterial({
        map: this.cartSignTexture,
        roughness: 0.35,
        metalness: 0.3,
      })
    );
    signPlane.position.set(0, 0.44, 0.345);
    this.cartGroup.add(signPlane);

    // =========================================================================
    // RECESSED COOLING BASIN ("Masanın İçindeki Soğutmalı Hazne") &
    // 6 SHINY STAINLESS-STEEL ICE CREAM BUCKETS ("Parlak Çelik Dondurma Kovaları")
    // =========================================================================
    const chromeSteelMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.09,
    });
    const brushedSteelMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.88,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });
    const darkBasinWellMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.65,
      roughness: 0.45,
    });
    const frostRimMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.18,
      roughness: 0.65,
      transparent: true,
      opacity: 0.82,
    });

    // Forward-tilted showcase basin deck so the player clearly sees inside the counter well and steel buckets!
    this.basinDeckGroup = new THREE.Group();
    this.basinDeckGroup.position.set(0, 0.94, 0.04);
    this.basinDeckGroup.rotation.x = 0.22; // Tilted toward the customer POV camera
    this.cartGroup.add(this.basinDeckGroup);

    // Outer hammered brass/copper counter frame around the recessed basin
    const frontRail = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.055, 0.09),
      brassMat
    );
    frontRail.position.set(0, 0.01, 0.34);
    this.basinDeckGroup.add(frontRail);

    const backRail = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.065, 0.1),
      brassMat
    );
    backRail.position.set(0, 0.015, -0.34);
    this.basinDeckGroup.add(backRail);

    [-0.91, 0.91].forEach((sx) => {
      const sideRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.06, 0.76),
        brassMat
      );
      sideRail.position.set(sx, 0.012, 0);
      this.basinDeckGroup.add(sideRail);
    });

    // Deep dark chilled freezer well ("Hazne Çukuru") beneath the steel deck
    const freezerWellFloor = new THREE.Mesh(
      new THREE.BoxGeometry(1.74, 0.04, 0.6),
      darkBasinWellMat
    );
    freezerWellFloor.position.set(0, -0.11, 0);
    this.basinDeckGroup.add(freezerWellFloor);

    // Brushed Stainless-Steel Recessed Basin Deck Plate ("Çelik Hazne Tezgahı")
    const steelDeckPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.74, 0.018, 0.6),
      brushedSteelMat
    );
    steelDeckPlate.position.set(0, -0.018, 0);
    steelDeckPlate.receiveShadow = true;
    this.basinDeckGroup.add(steelDeckPlate);

    // Frosted cooling rails running along the steel basin
    [-0.22, 0.22].forEach((fz) => {
      const frostStrip = new THREE.Mesh(
        new THREE.BoxGeometry(1.62, 0.01, 0.028),
        frostRimMat
      );
      frostStrip.position.set(0, -0.005, fz);
      this.basinDeckGroup.add(frostStrip);
    });

    // 6 Authentic Kahramanmaraş Shiny Stainless-Steel Ice Cream Buckets ("Parlak Çelik Kovalar")
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

      // 1. Dark recessed socket shadow ring in the basin
      const socketWell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.116, 0.112, 0.12, 24),
        darkBasinWellMat
      );
      socketWell.position.y = -0.062;
      bucketGroup.add(socketWell);

      // 2. Frosted cold condensation collar around each steel bucket
      const frostCollar = new THREE.Mesh(
        new THREE.TorusGeometry(0.115, 0.008, 10, 24),
        frostRimMat
      );
      frostCollar.rotation.x = Math.PI / 2;
      frostCollar.position.y = -0.004;
      bucketGroup.add(frostCollar);

      // 3. Tall Shiny Stainless-Steel Bucket Cylinder Wall ("Parlak Çelik Kova Gövdesi")
      const steelBucketWall = new THREE.Mesh(
        new THREE.CylinderGeometry(0.106, 0.096, 0.135, 26, 1, true),
        chromeSteelMat
      );
      steelBucketWall.position.y = -0.015;
      bucketGroup.add(steelBucketWall);

      // Inner brushed steel wall so the inside of the bucket gleams around the ice cream
      const innerBucketWall = new THREE.Mesh(
        new THREE.CylinderGeometry(0.102, 0.094, 0.13, 24, 1, true),
        brushedSteelMat
      );
      innerBucketWall.position.y = -0.015;
      bucketGroup.add(innerBucketWall);

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

      // Base full-bucket ice cream layer
      const iceBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.097, 0.09, 0.055, 22),
        iceMat
      );
      iceBase.position.y = -0.008;
      iceBase.userData.flavorIndex = tub.index;
      iceGroup.add(iceBase);

      // Main sculpted stretchy dome with paddle-churned ridges
      const iceDome = new THREE.Mesh(
        new THREE.SphereGeometry(
          0.094,
          22,
          14,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.62
        ),
        iceMat
      );
      iceDome.position.y = 0.008;
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
          Math.cos(ga) * 0.048,
          0.052 + (g % 2) * 0.006,
          Math.sin(ga) * 0.048
        );
        iceGroup.add(speck);
      }

      this.tubMeshes.push(iceDome, iceBase);
      this.tubIceGroups.push({
        group: iceGroup,
        baseY: 0.018,
        churnEnergy: 0,
        phase: idx * 1.1,
      });
    });

    // Cold Frost Mist Particles rising from the recessed steel buckets
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.22,
    });
    for (let m = 0; m < 16; m++) {
      const mote = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 8, 8),
        mistMat
      );
      mote.position.set(
        (Math.random() - 0.5) * 1.35,
        0.98 + Math.random() * 0.2,
        -0.33
      );
      this.scene.add(mote);
      this.frostMotes.push({
        mesh: mote,
        baseX: mote.position.x,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Waffle Cone Dispenser Stack on Left Corner of Cart
    this.coneStackWorldPos = new THREE.Vector3(-0.79, 1.14, -0.22);
    const coneStackGroup = new THREE.Group();
    coneStackGroup.position.set(-0.81, 0.98, 0.22);
    for (let c = 0; c < 6; c++) {
      const stackCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.155, 16),
        new THREE.MeshStandardMaterial({
          map: this.waffleTexture,
          roughness: 0.65,
        })
      );
      stackCone.rotation.x = Math.PI;
      stackCone.position.y = 0.08 + c * 0.042;
      coneStackGroup.add(stackCone);
    }
    this.cartGroup.add(coneStackGroup);

    // =========================================================================
    // DETAILED OVERHEAD ARCH & 7 MULTI-PART MARAŞ BRASS BELLS ("Detaylı Çanlar")
    // Positioned at y = 1.90 so all 7 bells and their swinging clappers are
    // prominently visible in the upper third of the screen!
    // =========================================================================
    const leftPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.034, 1.15, 14),
      brassMat
    );
    leftPost.position.set(-0.86, 1.48, 0.12);
    this.cartGroup.add(leftPost);

    const rightPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.034, 1.15, 14),
      brassMat
    );
    rightPost.position.set(0.86, 1.48, 0.12);
    this.cartGroup.add(rightPost);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(1.94, 0.1, 0.68),
      new THREE.MeshStandardMaterial({ color: 0x8c141b, roughness: 0.48 })
    );
    canopy.position.set(0, 2.02, 0.06);
    this.cartGroup.add(canopy);

    const canopyTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.98, 0.038, 0.72),
      brassMat
    );
    canopyTrim.position.set(0, 1.96, 0.06);
    this.cartGroup.add(canopyTrim);

    // Ornate Horizontal Brass Bell Crossbar ("Pirinç Çan Askı Borusu")
    const bellCrossbar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 1.72, 16),
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
    });
    const crimsonSilkMat = new THREE.MeshStandardMaterial({
      color: 0xd90429,
      roughness: 0.55,
    });

    const bellCount = 7;
    for (let b = 0; b < bellCount; b++) {
      const bx = -0.66 + b * 0.22;
      // Center bell (b=3) is largest; graduated sizes outward
      const distFromCenter = Math.abs(b - 3);
      const bellScale = 1.16 - distFromCenter * 0.08;

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
      upperDome.castShadow = true;
      bellPivot.add(upperDome);

      const lowerSkirt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.074, 0.058, 24),
        polishedBrassBellMat
      );
      lowerSkirt.position.y = -0.122;
      lowerSkirt.castShadow = true;
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
        new THREE.CircleGeometry(0.068, 20),
        bellHollowMat
      );
      hollowInterior.rotation.x = Math.PI / 2;
      hollowInterior.position.y = -0.148;
      bellPivot.add(hollowInterior);

      // 6. Glowing Golden Acoustic Shimmer Ring when struck!
      const shimmerMat = new THREE.MeshBasicMaterial({
        color: 0xffe194,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const shimmerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.075, 0.095, 24),
        shimmerMat
      );
      shimmerRing.rotation.x = Math.PI / 2;
      shimmerRing.position.y = -0.152;
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
        worldPos: new THREE.Vector3(bx, 1.79, -0.13),
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
  }

  _buildPaddleAndCones() {
    this.paddleGroup = new THREE.Group();
    this.scene.add(this.paddleGroup);

    this.paddleRollGroup = new THREE.Group();
    this.paddleGroup.add(this.paddleRollGroup);

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

    this.conePivot = new THREE.Group();
    this.conePivot.position.set(0, 0.02, 0);
    this.paddleGroup.add(this.conePivot);

    // INNER (Real) Waffle Cone
    this.mainConeMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.056, 0.19, 20),
      new THREE.MeshStandardMaterial({
        map: this.waffleTexture,
        roughness: 0.62,
      })
    );
    this.mainConeMesh.rotation.x = Math.PI;
    this.mainConeMesh.position.y = -0.06;
    this.mainConeMesh.castShadow = true;
    this.conePivot.add(this.mainConeMesh);

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
      new THREE.TorusGeometry(0.063, 0.006, 10, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffd166,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.45,
        roughness: 0.3,
      })
    );
    this.outerConeRim.rotation.x = Math.PI / 2;
    this.outerConeRim.position.y = 0.036;
    this.outerConeGroup.add(this.outerConeRim);

    // Legacy compatibility alias
    this.decoyConeOnPaddle = this.outerConeGroup;

    // 4 Dynamic Scoops Stack (Colored per Player's Flavor Selection!)
    this.scoopStackGroup = new THREE.Group();
    this.conePivot.add(this.scoopStackGroup);

    this.scoop1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.066, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xfff8e7, roughness: 0.35 })
    );
    this.scoop1.position.y = 0.045;
    this.scoopStackGroup.add(this.scoop1);

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

    // GIANT 5-KILO MARAŞ ICE CREAM BLOCK ("Kalıptan Kocaman Dondurma Kütlesi" + Mid-Air Somersault)
    this.giantBlockGroup = new THREE.Group();
    this.giantBlockGroup.visible = false;
    this.scene.add(this.giantBlockGroup);

    this.giantBlockMat = new THREE.MeshStandardMaterial({
      color: 0xfff8e7,
      roughness: 0.3,
      metalness: 0.05,
    });

    const mainLog = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.115, 0.19, 14, 24),
      this.giantBlockMat
    );
    mainLog.rotation.z = Math.PI * 0.5;
    mainLog.castShadow = true;
    this.giantBlockGroup.add(mainLog);

    // Organic sculpted ridges & stretchy lobes on the 5-kilo ice cream mass
    [-0.09, 0, 0.09].forEach((bx, idx) => {
      const lobe = new THREE.Mesh(
        new THREE.SphereGeometry(0.125 - idx * 0.008, 18, 14),
        this.giantBlockMat
      );
      lobe.position.set(bx, (idx % 2 === 0 ? 1 : -1) * 0.018, 0);
      lobe.scale.set(1.0, 0.92, 1.08);
      this.giantBlockGroup.add(lobe);
    });
  }

  setGiantBlockColor(hexColor) {
    if (this.giantBlockMat && hexColor !== undefined) {
      this.giantBlockMat.color.setHex(hexColor);
    }
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
      new THREE.BoxGeometry(0.032, 0.52, 0.36),
      this.vendorGoldMat
    );
    trimLeft.position.set(-0.04, 0.29, 0.05);
    this.vendorTorso.add(trimLeft);

    const trimRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.52, 0.36),
      this.vendorGoldMat
    );
    trimRight.position.set(0.04, 0.29, 0.05);
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
    this.rightShoulderAnchor.position.set(-0.25, 0.46, 0.06);
    this.vendorTorso.add(this.rightShoulderAnchor);

    this.leftShoulderAnchor = new THREE.Object3D();
    this.leftShoulderAnchor.position.set(0.25, 0.46, 0.06);
    this.vendorTorso.add(this.leftShoulderAnchor);

    this.rArmRig = this._createIKLimbRig();
    this.lArmRig = this._createIKLimbRig();

    this.leftHandConeProp = new THREE.Mesh(
      new THREE.ConeGeometry(0.056, 0.18, 18),
      new THREE.MeshStandardMaterial({
        map: this.waffleTexture,
        roughness: 0.6,
      })
    );
    this.leftHandConeProp.rotation.x = Math.PI;
    this.leftHandConeProp.position.set(0, 0.08, 0.03);
    this.leftHandConeProp.visible = false;
    this.lArmRig.handGroup.add(this.leftHandConeProp);

    // Fake "Peçeteli Külah" (Cone stuffed with a white folded paper napkin)
    this.napkinConeProp = new THREE.Group();
    this.napkinConeProp.visible = false;
    this.napkinConeProp.position.set(0, 0.08, 0.03);
    const fakeWaffle = new THREE.Mesh(
      new THREE.ConeGeometry(0.056, 0.18, 18),
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
      new THREE.ConeGeometry(0.072, 0.15, 4),
      napMat
    );
    fakeNapkinTop1.position.y = 0.12;
    fakeNapkinTop1.rotation.z = 0.18;
    this.napkinConeProp.add(fakeNapkinTop1);

    const fakeNapkinTop2 = new THREE.Mesh(
      new THREE.ConeGeometry(0.068, 0.14, 4),
      napMat
    );
    fakeNapkinTop2.position.y = 0.13;
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

  _createIKLimbRig() {
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
    const palm = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 14, 12),
      this.vendorSkinMat
    );
    palm.scale.set(1.05, 0.9, 1.15);
    handGroup.add(palm);

    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.011, 0.036, 6, 8),
        this.vendorSkinMat
      );
      finger.position.set(-0.022 + i * 0.015, -0.022, 0.01);
      finger.rotation.x = Math.PI * 0.48;
      handGroup.add(finger);
    }

    const thumb = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.012, 0.034, 6, 8),
      this.vendorSkinMat
    );
    thumb.position.set(0.028, 0.018, 0.01);
    thumb.rotation.z = -0.6;
    handGroup.add(thumb);

    return {
      upperGroup,
      lowerGroup,
      handGroup,
    };
  }

  _solveArmIK(rig, shoulderWorld, targetWorld, elbowHintOffset) {
    const upperLen = 0.33;
    const lowerLen = 0.33;

    const dir = new THREE.Vector3().subVectors(targetWorld, shoulderWorld);
    const dist = dir.length();
    const maxReach = upperLen + lowerLen - 0.004;

    const clampedTarget = targetWorld.clone();
    if (dist > maxReach) {
      dir.normalize();
      clampedTarget.copy(shoulderWorld).addScaledVector(dir, maxReach);
    }

    const d = Math.min(maxReach, Math.max(0.08, dist));
    const cosAngle = THREE.MathUtils.clamp(
      (upperLen * upperLen + d * d - lowerLen * lowerLen) / (2 * upperLen * d),
      -1,
      1
    );
    const angle = Math.acos(cosAngle);

    const forward = new THREE.Vector3()
      .subVectors(clampedTarget, shoulderWorld)
      .normalize();
    const pole = elbowHintOffset.clone().normalize();
    const right = new THREE.Vector3().crossVectors(forward, pole).normalize();
    const bendDir = new THREE.Vector3()
      .crossVectors(right, forward)
      .normalize();

    const elbowWorld = shoulderWorld
      .clone()
      .addScaledVector(forward, Math.cos(angle) * upperLen)
      .addScaledVector(bendDir, Math.sin(angle) * upperLen);

    rig.upperGroup.position.copy(shoulderWorld);
    rig.upperGroup.lookAt(elbowWorld);
    rig.upperGroup.scale.set(1, 1, shoulderWorld.distanceTo(elbowWorld));

    rig.lowerGroup.position.copy(elbowWorld);
    rig.lowerGroup.lookAt(clampedTarget);
    rig.lowerGroup.scale.set(1, 1, elbowWorld.distanceTo(clampedTarget));

    rig.handGroup.position.copy(clampedTarget);
    rig.handGroup.rotation.copy(this.paddleGroup.rotation);
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

    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.046, 0.058, 0.42, 16),
      skinMat
    );
    forearm.rotation.x = Math.PI * 0.38;
    forearm.rotation.z = -0.18;
    forearm.position.set(0.06, -0.14, 0.18);
    this.touristHand.add(forearm);

    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.068, 0.22, 16),
      new THREE.MeshStandardMaterial({ color: 0x1d3557, roughness: 0.7 })
    );
    sleeve.rotation.x = Math.PI * 0.38;
    sleeve.rotation.z = -0.18;
    sleeve.position.set(0.09, -0.22, 0.29);
    this.touristHand.add(sleeve);

    const bracelet = new THREE.Mesh(
      new THREE.TorusGeometry(0.048, 0.008, 10, 20),
      new THREE.MeshStandardMaterial({ color: 0x00b4d8, roughness: 0.2 })
    );
    bracelet.rotation.x = Math.PI * 0.38;
    bracelet.position.set(0.03, -0.06, 0.07);
    this.touristHand.add(bracelet);

    this.palmGroup = new THREE.Group();
    this.touristHand.add(this.palmGroup);

    const palmMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.105, 0.11, 0.038),
      skinMat
    );
    palmMesh.castShadow = true;
    this.palmGroup.add(palmMesh);

    this.fingers = [];
    const fingerOffsets = [-0.038, -0.013, 0.013, 0.038];
    const fingerLengths = [0.072, 0.08, 0.074, 0.058];

    fingerOffsets.forEach((fx, i) => {
      const fPivot = new THREE.Group();
      fPivot.position.set(fx, 0.052, 0);
      this.palmGroup.add(fPivot);

      const seg1 = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.011, fingerLengths[i] * 0.55, 8, 10),
        skinMat
      );
      seg1.position.y = fingerLengths[i] * 0.32;
      fPivot.add(seg1);

      const knuckle2 = new THREE.Group();
      knuckle2.position.y = fingerLengths[i] * 0.62;
      fPivot.add(knuckle2);

      const seg2 = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.0095, fingerLengths[i] * 0.45, 8, 10),
        skinMat
      );
      seg2.position.y = fingerLengths[i] * 0.25;
      knuckle2.add(seg2);

      this.fingers.push({ base: fPivot, tip: knuckle2 });
    });

    this.thumbPivot = new THREE.Group();
    this.thumbPivot.position.set(-0.056, -0.01, 0.012);
    this.thumbPivot.rotation.z = 0.65;
    this.palmGroup.add(this.thumbPivot);

    const thumbMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.013, 0.055, 8, 10),
      skinMat
    );
    thumbMesh.position.y = 0.032;
    this.thumbPivot.add(thumbMesh);

    this.heldSocket = new THREE.Group();
    this.heldSocket.position.set(0, 0.04, -0.035);
    this.palmGroup.add(this.heldSocket);

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
      new THREE.ConeGeometry(0.075, 0.16, 4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })
    );
    this.heldNapkin.visible = false;
    this.heldSocket.add(this.heldNapkin);

    this.heldNapkinCone = new THREE.Group();
    this.heldNapkinCone.visible = false;
    const hWaffle = new THREE.Mesh(
      new THREE.ConeGeometry(0.056, 0.18, 18),
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
      new THREE.ConeGeometry(0.072, 0.15, 4),
      hNapMat
    );
    hNap1.position.y = 0.11;
    hNap1.rotation.z = 0.2;
    this.heldNapkinCone.add(hNap1);
    const hNap2 = new THREE.Mesh(
      new THREE.ConeGeometry(0.066, 0.14, 4),
      hNapMat
    );
    hNap2.position.y = 0.12;
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
    this.scoop1.visible = scoopCount >= 1;
    this.scoop2.visible = scoopCount >= 2;
    this.scoop3.visible = scoopCount >= 3;
    this.scoop4.visible = scoopCount >= 4;

    if (scoopCount > 0 && scoopCount < 1) {
      this.scoop1.visible = true;
      this.scoop1.scale.set(0.75, 0.5, 0.75);
      this.scoop1.position.y = 0.025;
    } else if (scoopCount >= 1) {
      this.scoop1.scale.set(1, 1, 1);
      this.scoop1.position.y = 0.045;
    }

    const topY =
      scoopCount >= 4
        ? 0.265
        : scoopCount >= 3
          ? 0.21
          : scoopCount >= 2
            ? 0.15
            : 0.085;
    this.toppingGroup.position.y = topY;
    this.toppingGroup.visible = Boolean(showCrownTopping && scoopCount >= 1);
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
    const geo = new THREE.OctahedronGeometry(0.017, 0);
    const mat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(worldPos);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.6,
        0.5 + Math.random() * 1.3,
        (Math.random() - 0.5) * 1.6
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, vel, life: 0.7 });
    }
  }

  updateTouristHand(targetPos, grabCurl = 0.15, lungeBoost = 0, dt = 0.016) {
    this.handSpring.target.copy(targetPos);
    const pos = this.handSpring.step(dt);
    this.touristHand.position.copy(pos);

    const v = this.handSpring.vel;
    this.palmGroup.rotation.z = THREE.MathUtils.clamp(
      -pos.x * 0.4 - v.x * 0.08,
      -0.75,
      0.75
    );
    this.palmGroup.rotation.x = THREE.MathUtils.clamp(
      (pos.y - 1.2) * 0.45 - lungeBoost * 0.35 + v.y * 0.08,
      -0.8,
      0.65
    );
    this.palmGroup.rotation.y = THREE.MathUtils.clamp(-v.x * 0.06, -0.4, 0.4);

    const isHoldingObject =
      this.heldEmptyCone.visible ||
      this.heldNapkin.visible ||
      (this.heldNapkinCone && this.heldNapkinCone.visible) ||
      this.conePivot.parent === this.heldSocket;

    if (this.heldSocket) {
      this.heldSocket.rotation.z = THREE.MathUtils.lerp(
        this.heldSocket.rotation.z,
        THREE.MathUtils.clamp(-v.x * 0.18, -0.45, 0.45),
        Math.min(1, dt * 14)
      );
      this.heldSocket.rotation.x = THREE.MathUtils.lerp(
        this.heldSocket.rotation.x,
        THREE.MathUtils.clamp(v.y * 0.16, -0.35, 0.35),
        Math.min(1, dt * 14)
      );
    }

    const effectiveGrab = isHoldingObject ? Math.max(grabCurl, 0.92) : grabCurl;
    const lerpSpeed = Math.min(1, dt * 18);
    const curlAngle = effectiveGrab * 1.38;
    this.fingers.forEach((f, idx) => {
      f.base.rotation.x = THREE.MathUtils.lerp(
        f.base.rotation.x,
        -curlAngle - idx * 0.04,
        lerpSpeed
      );
      f.tip.rotation.x = THREE.MathUtils.lerp(
        f.tip.rotation.x,
        -curlAngle * 0.95,
        lerpSpeed
      );
    });
    this.thumbPivot.rotation.x = THREE.MathUtils.lerp(
      this.thumbPivot.rotation.x,
      -curlAngle * 0.85,
      lerpSpeed
    );
  }

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
    conePitchX = 0
  ) {
    const tipPos = this.paddleGroup.position;
    const vendorChestCenter = new THREE.Vector3(
      tipPos.x * 0.35 - 0.06,
      1.22 + (tipPos.y - 1.24) * 0.25,
      -0.64
    );

    const awayFromChest = tipPos
      .clone()
      .multiplyScalar(2)
      .sub(vendorChestCenter);
    this.paddleGroup.lookAt(awayFromChest);

    this.paddleRollGroup.rotation.z = THREE.MathUtils.lerp(
      this.paddleRollGroup.rotation.z,
      shaftRoll,
      Math.min(1, dt * 14)
    );

    const distToChest = tipPos.distanceTo(vendorChestCenter);
    const rearZ = -Math.min(0.84, Math.max(0.54, distToChest * 0.92));
    const frontZ = rearZ + 0.3;
    this.paddleRearGripAnchor.position.set(0, 0, rearZ);
    this.paddleFrontGripAnchor.position.set(0, 0, frontZ);

    // Let the cone physically tilt up/down (conePitchX), revolve with shaftRoll, and flip (coneFlipZ)!
    if (this.conePivot.parent === this.paddleGroup) {
      this.conePivot.rotation.set(
        -this.paddleGroup.rotation.x * 0.55 + conePitchX,
        -this.paddleGroup.rotation.y * 0.65 + Math.sin(shaftRoll) * 0.45,
        shaftRoll * 0.88 + coneFlipZ
      );
    }

    // Subtle vendor torso lean following the paddle
    this.vendorTorso.rotation.y = THREE.MathUtils.lerp(
      this.vendorTorso.rotation.y,
      THREE.MathUtils.clamp(tipPos.x * 0.35, -0.28, 0.28),
      Math.min(1, dt * 8)
    );
    this.vendorTorso.rotation.x = THREE.MathUtils.lerp(
      this.vendorTorso.rotation.x,
      THREE.MathUtils.clamp((1.28 - tipPos.y) * 0.18, -0.14, 0.18),
      Math.min(1, dt * 8)
    );

    this.vendorGroup.updateMatrixWorld(true);
    this.paddleGroup.updateMatrixWorld(true);

    const rShoulderWorld = new THREE.Vector3();
    const lShoulderWorld = new THREE.Vector3();
    this.rightShoulderAnchor.getWorldPosition(rShoulderWorld);
    this.leftShoulderAnchor.getWorldPosition(lShoulderWorld);

    const rearGripWorld = new THREE.Vector3();
    const frontGripWorld = new THREE.Vector3();
    this.paddleRearGripAnchor.getWorldPosition(rearGripWorld);
    this.paddleFrontGripAnchor.getWorldPosition(frontGripWorld);

    this._solveArmIK(
      this.rArmRig,
      rShoulderWorld,
      rearGripWorld,
      new THREE.Vector3(-0.35, -0.5, -0.2)
    );

    if (leftHandCustomTarget) {
      this.leftPropSpring.target.copy(leftHandCustomTarget);
    } else {
      this.leftPropSpring.target.copy(frontGripWorld);
    }
    const lTarget = this.leftPropSpring.step(dt);

    this._solveArmIK(
      this.lArmRig,
      lShoulderWorld,
      lTarget,
      new THREE.Vector3(0.35, -0.5, -0.2)
    );
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
      this.vendorHead.position.y = 0.67 + Math.sin(time * 2.2) * 0.005;
      this.setVendorMood(this.vendorMood || 'smile');
    }

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

    this.frostMotes.forEach((m) => {
      m.phase += dt * 0.9;
      m.mesh.position.y = 0.98 + ((m.phase * 0.12) % 0.26);
      m.mesh.position.x = m.baseX + Math.sin(m.phase * 2) * 0.03;
    });

    // Animate the swirled ice cream mounds inside the 6 shiny stainless-steel buckets!
    if (this.tubIceGroups) {
      this.tubIceGroups.forEach((tig) => {
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
    this.scoopStackGroup.scale.set(invSquash, squashY, invSquash);
    this.scoopStackGroup.rotation.z = THREE.MathUtils.clamp(
      jiggle.x * 1.8,
      -0.32,
      0.32
    );

    this.lanterns.forEach((l) => {
      l.group.rotation.z = Math.sin(time * 1.4 + l.phase) * 0.05;
    });

    const handPos = this.touristHand.position;

    // Coupled 2-DOF Bell Body + Independent Internal Clapper Pendulum & Shimmer Ring Animation
    this.bells.forEach((b) => {
      const distHand = handPos.distanceTo(b.worldPos);
      const distPaddle = paddlePos.distanceTo(b.worldPos);
      if (distHand < 0.16 && Math.abs(b.velZ) < 4) {
        const sign = handPos.x < b.worldPos.x ? 1 : -1;
        b.velZ += sign * 11;
        b.velX += 7;
        b.clapperVelZ += -sign * 20;
        b.shimmerTimer = 0.42;
        this.spawnBurst(b.worldPos, 0xffe194, 7);
        if (onBellHit) onBellHit(0.78, b.worldPos.x, b.index);
      } else if (distPaddle < 0.18 && Math.abs(b.velZ) < 4) {
        const sign = paddlePos.x < b.worldPos.x ? 1 : -1;
        b.velZ += sign * 12;
        b.velX += 8;
        b.clapperVelZ += -sign * 22;
        b.shimmerTimer = 0.48;
        this.spawnBurst(b.worldPos, 0xffe194, 9);
        if (onBellHit) onBellHit(0.92, b.worldPos.x, b.index);
      }

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
        b.shimmerMat.opacity = norm * 0.85;
        const sScale = 1 + (1 - norm) * 0.9;
        b.shimmerRing.scale.set(sScale, sScale, 1);
      } else if (b.shimmerMat) {
        b.shimmerMat.opacity = 0;
      }
    });

    this.pupils.forEach((p) => {
      p.mesh.position.x =
        p.baseX + THREE.MathUtils.clamp(paddlePos.x * 0.015, -0.008, 0.008);
      p.mesh.position.y = THREE.MathUtils.clamp(
        (paddlePos.y - 1.3) * 0.014,
        -0.006,
        0.006
      );
    });

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      } else {
        p.vel.y -= 4.0 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.rotation.x += 5 * dt;
        p.mesh.rotation.y += 5 * dt;
        p.mesh.scale.setScalar(Math.max(0.01, p.life * 1.3));
      }
    }

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
  }

  onResize() {
    const w = Math.max(1, window.visualViewport?.width || window.innerWidth);
    const h = Math.max(1, window.visualViewport?.height || window.innerHeight);
    const aspect = w / h;
    this.camera.aspect = aspect;
    if (aspect < 0.75) {
      this.camera.fov = THREE.MathUtils.clamp(
        62 + (0.65 - aspect) * 28,
        64,
        72
      );
      this.baseCamPos.set(0, 1.5, 1.12);
    } else {
      this.camera.fov = 54;
      this.baseCamPos.set(0, 1.52, 1.05);
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
