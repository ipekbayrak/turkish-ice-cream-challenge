import * as THREE from 'three';
import {
  SpringVec3,
  StretchyDondurmaStrand,
  RigidBodyManager,
} from './physics.js';

export class GameWorld {
  constructor(canvas, onPhysicsBounce = null) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x140805);
    this.scene.fog = new THREE.FogExp2(0x140805, 0.082);

    // POV First-Person Tourist Camera
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    this.bells = [];
    this.lanterns = [];
    this.particles = [];
    this.frostMotes = [];

    // Smooth, natural-weight 3D Physics Solvers
    this.handSpring = new SpringVec3(0.22, 1.08, 0.62, 135, 18);
    this.coneSpring = new SpringVec3(0, 1.24, 0.22, 68, 15);
    this.scoopJiggleSpring = new SpringVec3(0, 0, 0, 220, 14);
    this.leftPropSpring = new SpringVec3(0.24, 1.22, -0.25, 85, 16);
    this.prevConePos = new THREE.Vector3(0, 1.24, 0.22);

    this.blinkTimer = 2.5;
    this.isBlinking = false;
    this.vendorMood = 'smile';

    this._createTextures();
    this._setupLights();
    this._buildBazaarEnvironment();
    this._buildIceCreamCart();
    this._buildPaddleAndCones();
    this._buildVendor();
    this._buildTouristPOVHand();
    this._buildDiegetic3DCues();

    this.stretchyStrand = new StretchyDondurmaStrand(this.scene, 10);
    this.rigidBodies = new RigidBodyManager(this.scene, onPhysicsBounce);

    window.addEventListener('resize', () => this.onResize());
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
    const ambient = new THREE.AmbientLight(0xffe2bd, 0.86);
    this.scene.add(ambient);

    const keyLight = new THREE.SpotLight(0xffdfa8, 4.1);
    keyLight.position.set(0.8, 3.6, 1.8);
    keyLight.angle = Math.PI / 2.8;
    keyLight.penumbra = 0.55;
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    this.scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xff7b29, 2.3, 7);
    rimLight.position.set(-1.4, 2.3, -1.9);
    this.scene.add(rimLight);

    const cyanLight = new THREE.PointLight(0x2ec4b6, 1.4, 6);
    cyanLight.position.set(1.6, 2.2, -1.5);
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

    const lanternColors = [0xff595e, 0xffca3a, 0x2ec4b6, 0xff924c, 0x8ac926];
    lanternColors.forEach((col, idx) => {
      const lx = (idx - 2) * 1.15;
      const ly = 2.68 + (idx % 2) * 0.18;
      const lz = -1.75 - (idx % 2) * 0.4;

      const lGroup = new THREE.Group();
      lGroup.position.set(lx, ly, lz);

      const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.7),
        new THREE.MeshBasicMaterial({ color: 0x222222 })
      );
      cord.position.y = 0.35;
      lGroup.add(cord);

      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 16, 12),
        new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 0.85,
          roughness: 0.2,
        })
      );
      lGroup.add(globe);

      this.scene.add(lGroup);
      this.lanterns.push({ group: lGroup, phase: idx * 1.3 });
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
      new THREE.BoxGeometry(1.72, 0.92, 0.68),
      copperMat
    );
    baseMesh.position.y = 0.46;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.cartGroup.add(baseMesh);

    const signPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.56, 0.76),
      new THREE.MeshStandardMaterial({
        map: this.cartSignTexture,
        roughness: 0.35,
        metalness: 0.3,
      })
    );
    signPlane.position.set(0, 0.46, 0.345);
    this.cartGroup.add(signPlane);

    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.82, 0.06, 0.76),
      brassMat
    );
    counterTop.position.y = 0.94;
    counterTop.receiveShadow = true;
    this.cartGroup.add(counterTop);

    this.tubPositions = [
      { x: -0.48, color: 0xfff6e0, worldPos: new THREE.Vector3(-0.48, 0.96, -0.36) },
      { x: -0.16, color: 0x7bc950, worldPos: new THREE.Vector3(-0.16, 0.96, -0.36) },
      { x: 0.16, color: 0x4f2814, worldPos: new THREE.Vector3(0.16, 0.96, -0.36) },
      { x: 0.48, color: 0xff758f, worldPos: new THREE.Vector3(0.48, 0.96, -0.36) },
    ];

    this.tubPositions.forEach((tub) => {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.13, 0.018, 12, 24),
        brassMat
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.set(tub.x, 0.975, 0.02);
      this.cartGroup.add(rim);

      const iceMass = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
        new THREE.MeshStandardMaterial({ color: tub.color, roughness: 0.42 })
      );
      iceMass.position.set(tub.x, 0.94, 0.02);
      this.cartGroup.add(iceMass);
    });

    // Subtle Cold Frost Mist Particles rising from the ice cream tubs
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.18,
    });
    for (let m = 0; m < 10; m++) {
      const mote = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), mistMat);
      mote.position.set((Math.random() - 0.5) * 1.1, 0.98 + Math.random() * 0.2, -0.36);
      this.scene.add(mote);
      this.frostMotes.push({
        mesh: mote,
        baseX: mote.position.x,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const coneStackGroup = new THREE.Group();
    coneStackGroup.position.set(-0.74, 0.97, 0.16);
    for (let c = 0; c < 5; c++) {
      const stackCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.052, 0.16, 16),
        new THREE.MeshStandardMaterial({ map: this.waffleTexture, roughness: 0.65 })
      );
      stackCone.rotation.x = Math.PI;
      stackCone.position.y = 0.08 + c * 0.045;
      coneStackGroup.add(stackCone);
    }
    this.cartGroup.add(coneStackGroup);

    const leftPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.032, 1.28, 12),
      brassMat
    );
    leftPost.position.set(-0.82, 1.58, 0);
    this.cartGroup.add(leftPost);

    const rightPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.032, 1.28, 12),
      brassMat
    );
    rightPost.position.set(0.82, 1.58, 0);
    this.cartGroup.add(rightPost);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(1.88, 0.12, 0.72),
      new THREE.MeshStandardMaterial({ color: 0x8c141b, roughness: 0.5 })
    );
    canopy.position.set(0, 2.22, 0);
    this.cartGroup.add(canopy);

    const canopyTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.92, 0.04, 0.76),
      brassMat
    );
    canopyTrim.position.set(0, 2.15, 0);
    this.cartGroup.add(canopyTrim);

    for (let b = 0; b < 6; b++) {
      const bx = -0.62 + b * 0.248;
      const bellPivot = new THREE.Group();
      bellPivot.position.set(bx, 2.13, 0.24);

      const bellBody = new THREE.Mesh(
        new THREE.ConeGeometry(0.054, 0.098, 16),
        brassMat
      );
      bellBody.position.y = -0.05;
      bellPivot.add(bellBody);

      const clapper = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 8, 8),
        darkWoodMat
      );
      clapper.position.y = -0.098;
      bellPivot.add(clapper);

      this.cartGroup.add(bellPivot);
      this.bells.push({
        pivot: bellPivot,
        worldPos: new THREE.Vector3(bx, 2.04, -0.14),
        velZ: 0,
        velX: 0,
        angleZ: 0,
        angleX: 0,
      });
    }
  }

  _buildPaddleAndCones() {
    // Paddle Group: Origin (0,0,0) is at the Cone Tip; -Z points toward the Vendor's Chest!
    // Calling `paddleGroup.lookAt(awayFromChest)` aligns local -Z directly into the Vendor's hands
    // while keeping local +Z forward and local +Y upright!
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

    // Long Metal Rod extending along -Z from tip (0,0,0) toward vendor
    this.paddleRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.015, 0.92, 12),
      steelMat
    );
    this.paddleRod.rotation.x = Math.PI / 2;
    this.paddleRod.position.set(0, 0, -0.46);
    this.paddleRod.castShadow = true;
    this.paddleRollGroup.add(this.paddleRod);

    // Wooden handle at the rear of the rod (-Z = -0.74 to -1.02)
    this.woodGrip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.028, 0.28, 12),
      handleMat
    );
    this.woodGrip.rotation.x = Math.PI / 2;
    this.woodGrip.position.set(0, 0, -0.88);
    this.paddleRollGroup.add(this.woodGrip);

    const brassPommel = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf5b942, metalness: 0.85, roughness: 0.2 })
    );
    brassPommel.position.set(0, 0, -1.03);
    this.paddleRollGroup.add(brassPommel);

    // Exact 3D Grip Anchors on the Paddle Shaft for the Vendor's Right & Left Hands!
    this.paddleRearGripAnchor = new THREE.Object3D();
    this.paddleRearGripAnchor.position.set(0, 0, -0.82);
    this.paddleRollGroup.add(this.paddleRearGripAnchor);

    this.paddleFrontGripAnchor = new THREE.Object3D();
    this.paddleFrontGripAnchor.position.set(0, 0, -0.5);
    this.paddleRollGroup.add(this.paddleFrontGripAnchor);

    const spatulaTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.062, 0.012, 0.14),
      steelMat
    );
    spatulaTip.position.set(0, 0, -0.04);
    this.paddleRollGroup.add(spatulaTip);

    this.conePivot = new THREE.Group();
    this.conePivot.position.set(0, 0.02, 0);
    this.paddleGroup.add(this.conePivot);

    this.mainConeMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.058, 0.19, 20),
      new THREE.MeshStandardMaterial({ map: this.waffleTexture, roughness: 0.62 })
    );
    this.mainConeMesh.rotation.x = Math.PI;
    this.mainConeMesh.position.y = -0.06;
    this.mainConeMesh.castShadow = true;
    this.conePivot.add(this.mainConeMesh);

    this.scoopStackGroup = new THREE.Group();
    this.conePivot.add(this.scoopStackGroup);

    this.scoop1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.066, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xfff8e7, roughness: 0.36 })
    );
    this.scoop1.position.y = 0.045;
    this.scoopStackGroup.add(this.scoop1);

    this.scoop2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.062, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0x76c84d, roughness: 0.4 })
    );
    this.scoop2.position.set(0.012, 0.115, 0.008);
    this.scoop2.visible = false;
    this.scoopStackGroup.add(this.scoop2);

    this.scoop3 = new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0x5c2c16, roughness: 0.38 })
    );
    this.scoop3.position.set(-0.01, 0.175, -0.006);
    this.scoop3.visible = false;
    this.scoopStackGroup.add(this.scoop3);

    this.toppingGroup = new THREE.Group();
    this.toppingGroup.position.set(0, 0.21, 0);
    this.toppingGroup.visible = false;
    this.scoopStackGroup.add(this.toppingGroup);

    const pistachioBitMat = new THREE.MeshStandardMaterial({
      color: 0x80ed99,
      roughness: 0.3,
    });
    for (let p = 0; p < 12; p++) {
      const bit = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.012),
        pistachioBitMat
      );
      const angle = (p / 12) * Math.PI * 2;
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

    this.decoyConeOnPaddle = new THREE.Mesh(
      new THREE.ConeGeometry(0.063, 0.19, 18),
      new THREE.MeshStandardMaterial({ map: this.waffleTexture, roughness: 0.6 })
    );
    this.decoyConeOnPaddle.rotation.x = Math.PI;
    this.decoyConeOnPaddle.position.y = -0.095;
    this.decoyConeOnPaddle.visible = false;
    this.conePivot.add(this.decoyConeOnPaddle);
  }

  _buildDiegetic3DCues() {
    // 3D Golden Slice Line across the stretched ice cream during Stage 2
    this.sliceCueGroup = new THREE.Group();
    this.sliceCueGroup.visible = false;
    this.scene.add(this.sliceCueGroup);

    const dashMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = -3; i <= 3; i++) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.008, 0.008), dashMat);
      dash.position.x = i * 0.052;
      this.sliceCueGroup.add(dash);
    }
  }

  _buildVendor() {
    this.vendorGroup = new THREE.Group();
    this.vendorGroup.position.set(0, 0, -0.86);
    this.scene.add(this.vendorGroup);

    this.vendorSkinMat = new THREE.MeshStandardMaterial({
      color: 0xe8ac84,
      roughness: 0.52,
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
      metalness: 0.8,
      roughness: 0.25,
    });
    this.vendorHairMat = new THREE.MeshStandardMaterial({
      color: 0x1c110b,
      roughness: 0.8,
    });

    this.vendorTorso = new THREE.Group();
    this.vendorTorso.position.set(0, 0.94, 0);
    this.vendorGroup.add(this.vendorTorso);

    const chest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.2, 0.56, 18),
      this.vendorShirtMat
    );
    chest.position.y = 0.28;
    chest.castShadow = true;
    this.vendorTorso.add(chest);

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
      new THREE.BoxGeometry(0.03, 0.52, 0.36),
      this.vendorGoldMat
    );
    trimLeft.position.set(-0.04, 0.29, 0.05);
    this.vendorTorso.add(trimLeft);

    const trimRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.52, 0.36),
      this.vendorGoldMat
    );
    trimRight.position.set(0.04, 0.29, 0.05);
    this.vendorTorso.add(trimRight);

    // Head Group
    this.vendorHead = new THREE.Group();
    this.vendorHead.position.set(0, 0.64, 0.02);
    this.vendorTorso.add(this.vendorHead);

    const headSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.175, 24, 20),
      this.vendorSkinMat
    );
    headSphere.scale.set(0.95, 1.08, 0.95);
    headSphere.castShadow = true;
    this.vendorHead.add(headSphere);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.032, 0.085, 12),
      this.vendorSkinMat
    );
    nose.rotation.x = Math.PI * 0.42;
    nose.position.set(0, 0.01, 0.175);
    this.vendorHead.add(nose);

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x160c06 });
    this.eyes = [];
    this.pupils = [];
    [-0.062, 0.062].forEach((ex) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(ex, 0.045, 0.15);
      this.vendorHead.add(eyeGroup);

      const eyeW = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 12, 12),
        eyeWhiteMat
      );
      eyeGroup.add(eyeW);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.013, 10, 10),
        pupilMat
      );
      pupil.position.set(0, 0, 0.022);
      eyeGroup.add(pupil);

      this.eyes.push(eyeGroup);
      this.pupils.push({ mesh: pupil, baseX: 0 });
    });

    this.leftBrow = new THREE.Mesh(
      new THREE.BoxGeometry(0.062, 0.018, 0.02),
      this.vendorHairMat
    );
    this.leftBrow.position.set(-0.062, 0.085, 0.158);
    this.vendorHead.add(this.leftBrow);

    this.rightBrow = new THREE.Mesh(
      new THREE.BoxGeometry(0.062, 0.018, 0.02),
      this.vendorHairMat
    );
    this.rightBrow.position.set(0.062, 0.085, 0.158);
    this.vendorHead.add(this.rightBrow);

    // Handlebar Mustache
    this.mustacheGroup = new THREE.Group();
    this.mustacheGroup.position.set(0, -0.038, 0.165);
    this.vendorHead.add(this.mustacheGroup);

    [-1, 1].forEach((dir) => {
      const stacheHalf = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.024, 0.08, 8, 12),
        this.vendorHairMat
      );
      stacheHalf.rotation.z = dir * (Math.PI * 0.42);
      stacheHalf.position.set(dir * 0.048, 0, 0);
      this.mustacheGroup.add(stacheHalf);

      const curlTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 10, 10),
        this.vendorHairMat
      );
      curlTip.position.set(dir * 0.1, 0.024, 0);
      this.mustacheGroup.add(curlTip);
    });

    // Full Beard (for Cezmi Dede)
    this.beardGroup = new THREE.Group();
    this.beardGroup.position.set(0, -0.1, 0.11);
    this.beardGroup.visible = false;
    this.vendorHead.add(this.beardGroup);

    const beardMain = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 16, 12),
      this.vendorHairMat
    );
    beardMain.scale.set(1.0, 1.15, 0.85);
    this.beardGroup.add(beardMain);

    // Gold Spectacles (for Cezmi Dede)
    this.glassesGroup = new THREE.Group();
    this.glassesGroup.position.set(0, 0.045, 0.176);
    this.glassesGroup.visible = false;
    this.vendorHead.add(this.glassesGroup);

    [-0.062, 0.062].forEach((gx) => {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.034, 0.004, 8, 20),
        this.vendorGoldMat
      );
      rim.position.x = gx;
      this.glassesGroup.add(rim);
    });
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.005, 0.005),
      this.vendorGoldMat
    );
    this.glassesGroup.add(bridge);

    // Fez
    this.fezGroup = new THREE.Group();
    this.vendorHead.add(this.fezGroup);

    this.fezMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.152, 0.16, 20),
      new THREE.MeshStandardMaterial({ color: 0xa81018, roughness: 0.5 })
    );
    this.fezMesh.position.set(0, 0.21, -0.01);
    this.fezMesh.rotation.x = -0.08;
    this.fezGroup.add(this.fezMesh);

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
    capCrown.rotation.z = 0.1;
    this.apprenticeCapGroup.add(capCrown);

    const capBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.148, 0.148, 0.03, 20),
      new THREE.MeshStandardMaterial({ color: 0x1d6fa5 })
    );
    capBand.position.set(0, 0.145, 0);
    capBand.rotation.z = 0.1;
    this.apprenticeCapGroup.add(capBand);

    this.vendorMouth = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x590d14 })
    );
    this.vendorMouth.position.set(0, -0.072, 0.152);
    this.vendorMouth.scale.set(1.2, 0.45, 0.5);
    this.vendorHead.add(this.vendorMouth);

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
      new THREE.MeshStandardMaterial({ map: this.waffleTexture, roughness: 0.6 })
    );
    this.leftHandConeProp.rotation.x = Math.PI;
    this.leftHandConeProp.position.set(0, 0.08, 0.03);
    this.leftHandConeProp.visible = false;
    this.lArmRig.handGroup.add(this.leftHandConeProp);

    // Fake "Peçeteli Külah" (Cone stuffed with a white folded paper napkin that looks like fake vanilla!)
    this.napkinConeProp = new THREE.Group();
    this.napkinConeProp.visible = false;
    this.napkinConeProp.position.set(0, 0.08, 0.03);
    const fakeWaffle = new THREE.Mesh(
      new THREE.ConeGeometry(0.056, 0.18, 18),
      new THREE.MeshStandardMaterial({ map: this.waffleTexture, roughness: 0.6 })
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

    // Rolled-up shirt cuff at mid-forearm
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

    // Curled fingers wrapped tightly around the paddle handle
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
    const bendDir = new THREE.Vector3().crossVectors(right, forward).normalize();

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
      this.leftBrow.position.y = 0.096;
      this.rightBrow.position.y = 0.096;
      this.leftBrow.rotation.z = 0.14;
      this.rightBrow.rotation.z = -0.14;
    } else if (mood === 'mischief') {
      this.vendorMouth.scale.set(1.3, 0.5, 0.5);
      this.leftBrow.position.y = 0.098;
      this.rightBrow.position.y = 0.082;
      this.leftBrow.rotation.z = -0.18;
      this.rightBrow.rotation.z = 0.18;
    } else if (mood === 'shock') {
      this.vendorMouth.scale.set(0.85, 1.1, 0.6);
      this.leftBrow.position.y = 0.105;
      this.rightBrow.position.y = 0.105;
      this.leftBrow.rotation.z = 0;
      this.rightBrow.rotation.z = 0;
    } else {
      this.vendorMouth.scale.set(1.2, 0.45, 0.5);
      this.leftBrow.position.y = 0.085;
      this.rightBrow.position.y = 0.085;
      this.leftBrow.rotation.z = 0.06;
      this.rightBrow.rotation.z = -0.06;
    }
  }

  setVendorCharacter(levelIndex) {
    const idx = levelIndex % 3;
    if (idx === 0) {
      // USTA 1: Çırak Kadir
      this.vendorVestMat.color.setHex(0x16697a);
      this.vendorGoldMat.color.setHex(0xe2e8f0);
      this.vendorHairMat.color.setHex(0x3d2314);
      this.mustacheGroup.visible = false;
      this.beardGroup.visible = false;
      this.glassesGroup.visible = false;
      this.fezGroup.visible = false;
      this.apprenticeCapGroup.visible = true;
      this.vendorTorso.scale.set(0.92, 0.98, 0.92);
    } else if (idx === 1) {
      // USTA 2: Pala Usta
      this.vendorVestMat.color.setHex(0x99151e);
      this.vendorGoldMat.color.setHex(0xf5b942);
      this.vendorHairMat.color.setHex(0x160c06);
      this.mustacheGroup.visible = true;
      this.mustacheGroup.scale.set(1.15, 1.15, 1.15);
      this.beardGroup.visible = false;
      this.glassesGroup.visible = false;
      this.fezGroup.visible = true;
      this.fezMesh.material.color.setHex(0xa81018);
      this.apprenticeCapGroup.visible = false;
      this.vendorTorso.scale.set(1.06, 1.02, 1.05);
    } else {
      // USTA 3: Cezmi Dede
      this.vendorVestMat.color.setHex(0x4a154b);
      this.vendorGoldMat.color.setHex(0xffd166);
      this.vendorHairMat.color.setHex(0xe5e5e5);
      this.mustacheGroup.visible = true;
      this.mustacheGroup.scale.set(1.25, 1.2, 1.2);
      this.beardGroup.visible = true;
      this.glassesGroup.visible = true;
      this.fezGroup.visible = true;
      this.fezMesh.material.color.setHex(0x5e0b15);
      this.apprenticeCapGroup.visible = false;
      this.vendorTorso.scale.set(1.02, 1.0, 1.04);
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
      new THREE.ConeGeometry(0.058, 0.19, 18),
      new THREE.MeshStandardMaterial({ map: this.waffleTexture, roughness: 0.6 })
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

    // 3D Peçeteli Külah (Fake cone stuffed with folded white napkins) in Tourist's Hand
    this.heldNapkinCone = new THREE.Group();
    this.heldNapkinCone.visible = false;
    const hWaffle = new THREE.Mesh(
      new THREE.ConeGeometry(0.056, 0.18, 18),
      new THREE.MeshStandardMaterial({ map: this.waffleTexture, roughness: 0.6 })
    );
    hWaffle.rotation.x = Math.PI;
    this.heldNapkinCone.add(hWaffle);
    const hNapMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    const hNap1 = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.15, 4), hNapMat);
    hNap1.position.y = 0.11;
    hNap1.rotation.z = 0.2;
    this.heldNapkinCone.add(hNap1);
    const hNap2 = new THREE.Mesh(new THREE.ConeGeometry(0.066, 0.14, 4), hNapMat);
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
    const v = worldVec.clone().project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-(v.y * 0.5) + 0.5) * window.innerHeight,
    };
  }

  launchScoopFromTub(tubIndex, onImpact) {
    const tub = this.tubPositions[tubIndex] || this.tubPositions[0];
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

  updateIceCreamScoops(scoopCount) {
    if (scoopCount <= 0) {
      this.scoop1.visible = false;
      this.scoop2.visible = false;
      this.scoop3.visible = false;
      this.toppingGroup.visible = false;
    } else if (scoopCount < 1) {
      this.scoop1.visible = true;
      this.scoop1.scale.set(0.75, 0.5, 0.75);
      this.scoop1.position.y = 0.025;
      this.scoop2.visible = false;
      this.scoop3.visible = false;
      this.toppingGroup.visible = false;
    } else if (scoopCount === 1) {
      this.scoop1.visible = true;
      this.scoop1.scale.set(1, 1, 1);
      this.scoop1.position.y = 0.045;
      this.scoop2.visible = false;
      this.scoop3.visible = false;
      this.toppingGroup.visible = false;
    } else if (scoopCount === 2) {
      this.scoop1.visible = true;
      this.scoop1.scale.set(1, 1, 1);
      this.scoop1.position.y = 0.045;
      this.scoop2.visible = true;
      this.scoop3.visible = false;
      this.toppingGroup.visible = false;
    } else if (scoopCount === 3) {
      this.scoop1.visible = true;
      this.scoop1.scale.set(1, 1, 1);
      this.scoop2.visible = true;
      this.scoop3.visible = true;
      this.toppingGroup.visible = false;
    } else {
      this.scoop1.visible = true;
      this.scoop1.scale.set(1, 1, 1);
      this.scoop2.visible = true;
      this.scoop3.visible = true;
      this.toppingGroup.visible = true;
    }
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
      b.velZ += (i % 2 === 0 ? 1 : -1) * (7 + Math.random() * 5) * power;
      b.velX += (Math.random() - 0.5) * 6 * power;
    });
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

    // Physical inertial sway on whatever prop is currently grasped in the tourist's hand
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

  // Orient the Paddle Shaft from the Cone Tip directly back into the Vendor's Chest/Hands,
  // apply axial wrist twist (`shaftRoll`), and solve 2-Bone IK for both arms!
  orientPaddleAndHands(
    shaftRoll = 0,
    leftHandCustomTarget = null,
    dt = 0.016,
    coneFlipZ = 0
  ) {
    const tipPos = this.paddleGroup.position;
    const vendorChestCenter = new THREE.Vector3(
      tipPos.x * 0.35 - 0.06,
      1.22 + (tipPos.y - 1.24) * 0.25,
      -0.64
    );

    // Point local +Z away from vendorChestCenter so local -Z (the paddle shaft) points directly into the vendor's hands!
    const awayFromChest = tipPos.clone().multiplyScalar(2).sub(vendorChestCenter);
    this.paddleGroup.lookAt(awayFromChest);

    this.paddleRollGroup.rotation.z = THREE.MathUtils.lerp(
      this.paddleRollGroup.rotation.z,
      shaftRoll,
      Math.min(1, dt * 10)
    );

    // Dynamically choke up on the shaft when the tip is close to the vendor so his hands stay in front of his torso
    const distToChest = tipPos.distanceTo(vendorChestCenter);
    const rearZ = -Math.min(0.84, Math.max(0.54, distToChest * 0.92));
    const frontZ = rearZ + 0.3;
    this.paddleRearGripAnchor.position.set(0, 0, rearZ);
    this.paddleFrontGripAnchor.position.set(0, 0, frontZ);

    // Keep the ice cream cone pointing vertically upright (or flipped upside down during UPSIDE_DOWN_FAKE)
    this.conePivot.rotation.set(
      -this.paddleGroup.rotation.x,
      -this.paddleGroup.rotation.y,
      Math.sin(shaftRoll) * 0.32 + coneFlipZ
    );

    // Solve Two-Bone Analytical IK for Vendor's Right & Left Arms
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

    // Real-time Vendor Lip-Sync & Mustache/Beard/Chest Animation when speaking or laughing
    if (voiceMouthOpen > 0.01) {
      this.vendorMouth.scale.set(
        1.25 + voiceMouthOpen * 0.4,
        0.45 + voiceMouthOpen * 1.35,
        0.65
      );
      this.mustacheGroup.position.y = -0.042 + voiceMouthOpen * 0.014;
      this.mustacheGroup.rotation.z = Math.sin(time * 28) * voiceMouthOpen * 0.09;
      this.beardGroup.position.y = -0.02 - voiceMouthOpen * 0.022;
      this.vendorHead.position.y = 0.67 + voiceMouthOpen * 0.02;
    } else {
      this.mustacheGroup.position.y = -0.042;
      this.mustacheGroup.rotation.z = 0;
      this.beardGroup.position.y = -0.02;
      this.vendorHead.position.y = 0.67 + Math.sin(time * 2.2) * 0.005;
      this.setVendorMood(this.vendorMood || 'smile');
    }

    // Natural Vendor Eye Blinking every ~3.4 seconds
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

    // Animate cold frost mist rising from copper tubs
    this.frostMotes.forEach((m) => {
      m.phase += dt * 0.9;
      m.mesh.position.y = 0.98 + ((m.phase * 0.12) % 0.26);
      m.mesh.position.x = m.baseX + Math.sin(m.phase * 2) * 0.03;
    });

    // Pulse 3D slice guide line if visible
    if (this.sliceCueGroup.visible) {
      this.sliceCueGroup.position.set(0, 1.22 + Math.sin(time * 6) * 0.02, 0.18);
    }

    const coneVelX =
      (this.paddleGroup.position.x - this.prevConePos.x) / Math.max(0.005, dt);
    const coneVelY =
      (this.paddleGroup.position.y - this.prevConePos.y) / Math.max(0.005, dt);
    this.prevConePos.copy(this.paddleGroup.position);

    this.scoopJiggleSpring.impulse(-coneVelX * 0.35 * dt, -coneVelY * 0.28 * dt, 0);
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
    const paddlePos = this.paddleGroup.position;

    this.bells.forEach((b) => {
      const distHand = handPos.distanceTo(b.worldPos);
      const distPaddle = paddlePos.distanceTo(b.worldPos);
      if (distHand < 0.16 && Math.abs(b.velZ) < 4) {
        b.velZ += (handPos.x < b.worldPos.x ? 1 : -1) * 10;
        b.velX += 7;
        if (onBellHit) onBellHit(0.75, b.worldPos.x);
      } else if (distPaddle < 0.18 && Math.abs(b.velZ) < 4) {
        b.velZ += (paddlePos.x < b.worldPos.x ? 1 : -1) * 11;
        b.velX += 8;
        if (onBellHit) onBellHit(0.9, b.worldPos.x);
      }

      const springZ = -120 * b.angleZ - 5.2 * b.velZ;
      const springX = -120 * b.angleX - 5.2 * b.velX;
      b.velZ += springZ * dt;
      b.velX += springX * dt;
      b.angleZ += b.velZ * dt;
      b.angleX += b.velX * dt;
      b.pivot.rotation.z = b.angleZ;
      b.pivot.rotation.x = b.angleX;
    });

    this.pupils.forEach((p) => {
      p.mesh.position.x =
        p.baseX + THREE.MathUtils.clamp(paddlePos.x * 0.02, -0.01, 0.01);
      p.mesh.position.y = THREE.MathUtils.clamp(
        (paddlePos.y - 1.3) * 0.018,
        -0.008,
        0.008
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
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 65 : 54;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
