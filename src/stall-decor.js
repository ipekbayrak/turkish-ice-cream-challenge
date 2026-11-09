import * as THREE from 'three';
import { STALL_MEMORIES } from './stall-memories.js';

export function narrativeReveals(state = {}) {
  const completed = new Set((Array.isArray(state.completedStages) ? state.completedStages : []).filter((n) => Number.isInteger(n) && n >= 1 && n <= 10));
  return {
    vendorIndex: Math.max(0, Math.min(3, Math.floor(Number(state.vendorIndex) || 0))),
    visits: Math.max(0, Math.floor(Number(state.visits) || 0)),
    chapter: Math.max(1, Math.min(10, Number(state.chapter?.stage ?? state.chapter) || 1)),
    photograph: completed.has(1), notes: completed.has(2), melody: completed.has(5),
    ledger: completed.has(6), nora: completed.has(9), ending: completed.has(10),
    masters: [2, 5, 8, 10].map((stage) => completed.has(stage)),
    stallMemories: STALL_MEMORIES.filter(memory => Array.isArray(state.stallMemories) && state.stallMemories.includes(memory.id)).map(memory => memory.id),
  };
}

// Small authored illustrations belong to the shop, rather than to the HUD.
export function createStallArtwork(kind, index = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = kind === 'tile' ? 512 : 512;
  canvas.height = kind === 'portrait' ? 640 : 384;
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  c.fillStyle = '#dfc99d'; c.fillRect(0, 0, W, H);
  if (kind === 'tile') {
    const tileColor = `#${(index?.palette?.tile ?? 0x296d6b).toString(16).padStart(6, '0')}`;
    c.fillStyle = '#d6c5a0'; c.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 96) for (let x = 0; x < W; x += 128) {
      c.fillStyle = ((x / 128 + y / 96) % 2) ? tileColor : '#e4d6b5';
      c.fillRect(x + 3, y + 3, 122, 90);
      c.strokeStyle = ((x / 128 + y / 96) % 2) ? '#d2c6a7' : tileColor;
      c.lineWidth = 3; c.beginPath(); c.moveTo(x + 64, y + 15); c.lineTo(x + 109, y + 48); c.lineTo(x + 64, y + 81); c.lineTo(x + 19, y + 48); c.closePath(); c.stroke();
      c.beginPath(); c.arc(x + 64, y + 48, 13, 0, Math.PI * 2); c.stroke();
    }
  } else if (kind === 'place') {
    c.fillStyle = `#${(index?.palette?.accent ?? 0x296d6b).toString(16).padStart(6, '0')}`; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#d8ba7f'; c.lineWidth = 10; c.strokeRect(20, 20, W - 40, H - 40);
    c.fillStyle = '#f4e5c3'; c.textAlign = 'center'; c.font = '26px Georgia'; c.fillText('MEŞHUR MARAŞ DONDURMASI', W / 2, 115);
    const name = index?.name?.tr || 'İstanbul'; let size = 66;
    do { c.font = `bold ${size--}px Georgia`; } while (c.measureText(name).width > 450 && size > 28);
    c.fillText(name, W / 2, 245);
    c.font = 'italic 25px Georgia'; c.fillText('Bir külah, bir hatıra.', W / 2, 311);
  } else if (kind === 'portrait') {
    const coats = ['#3a777e', '#8c3036', '#624353', '#315d47'];
    c.fillStyle = '#614836'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#a58860'; c.beginPath(); c.ellipse(256, 272, 184, 222, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = coats[index]; c.beginPath(); c.roundRect(100, 350, 312, 215, 55); c.fill();
    c.fillStyle = '#e4b086'; c.beginPath(); c.ellipse(256, 270, 112, 138, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = index === 0 ? '#e8e0c9' : '#982c33'; c.beginPath(); c.moveTo(145, 179); c.lineTo(171, 66); c.lineTo(339, 66); c.lineTo(365, 179); c.closePath(); c.fill();
    c.fillStyle = '#211713'; c.fillRect(202, 224, 30, 11); c.fillRect(280, 224, 30, 11);
    c.fillStyle = '#f5ead6'; for (const x of [216, 296]) { c.beginPath(); c.ellipse(x, 251, 20, 16, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#261d18'; for (const x of [218, 294]) { c.beginPath(); c.arc(x, 253, 9, 0, Math.PI * 2); c.fill(); }
    if (index > 0) { c.fillStyle = index > 1 ? '#e5ded0' : '#2b2018'; c.beginPath(); c.ellipse(222, 315, 53, 20, -.2, 0, Math.PI * 2); c.ellipse(289, 315, 53, 20, .2, 0, Math.PI * 2); c.fill(); }
    if (index > 1) { c.fillStyle = '#e5ded0'; c.beginPath(); c.moveTo(156, 322); c.quadraticCurveTo(256, 516, 356, 322); c.quadraticCurveTo(256, 399, 156, 322); c.fill(); c.strokeStyle = '#c9a25f'; c.lineWidth = 8; for (const x of [216, 296]) { c.beginPath(); c.arc(x, 252, 30, 0, Math.PI * 2); c.stroke(); } c.beginPath(); c.moveTo(247, 250); c.lineTo(266, 250); c.stroke(); }
    c.fillStyle = '#e7c988'; c.textAlign = 'center'; c.font = 'bold 42px Georgia'; c.fillText(['KADİR', 'PALA', 'CEZMİ', 'HAYDAR'][index], 256, 602);
  } else if (kind === 'photo') {
    c.fillStyle = '#b6996c'; c.fillRect(18, 18, W - 36, H - 60);
    c.fillStyle = '#7e6a4b'; c.fillRect(35, 238, 440, 70);
    c.fillStyle = '#61442f'; c.fillRect(100, 175, 310, 124); c.fillRect(92, 91, 326, 28);
    c.fillStyle = '#d3b782'; for (let i = 0; i < 10; i++) { c.fillRect(95 + i * 32, 91, 14, 28); }
    c.strokeStyle = '#5d472f'; c.lineWidth = 9; c.beginPath(); c.moveTo(113, 116); c.lineTo(113, 180); c.moveTo(397, 116); c.lineTo(397, 180); c.stroke();
    c.fillStyle = '#d6bd87'; for (let i = 0; i < 7; i++) { c.save(); c.translate(136 + i * 39, 134); if (i === 0) c.rotate(-.2); c.beginPath(); c.moveTo(-6, 0); c.lineTo(-11, 18); c.lineTo(11, 18); c.lineTo(6, 0); c.closePath(); c.fill(); c.restore(); }
    c.fillStyle = '#452f25'; c.beginPath(); c.arc(257, 145, 23, 0, Math.PI * 2); c.fill(); c.fillRect(232, 164, 50, 52);
    c.strokeStyle = '#553e2b'; c.lineWidth = 3; c.strokeRect(25, 25, W - 50, H - 75);
    c.fillStyle = '#5a4230'; c.textAlign = 'center'; c.font = 'italic 27px Georgia'; c.fillText('Aynı tezgâh, başka bir gün.', W / 2, H - 17);
  } else if (kind === 'notes') {
    c.strokeStyle = '#9e8965'; c.lineWidth = 2; for (let y = 100; y < 220; y += 24) { c.beginPath(); c.moveTo(55, y); c.lineTo(457, y); c.stroke(); }
    c.strokeStyle = '#594633'; c.fillStyle = '#594633'; c.lineWidth = 7;
    for (const [x, y] of [[116, 172], [219, 148], [331, 196]]) { c.beginPath(); c.ellipse(x, y, 15, 10, -.4, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(x + 13, y); c.lineTo(x + 13, y - 65); c.stroke(); }
    c.setLineDash([8, 10]); c.strokeRect(390, 120, 49, 90); c.setLineDash([]);
    c.font = 'italic 31px Georgia'; c.fillText('son nota…', 170, 300);
  } else if (kind === 'ledger') {
    c.fillStyle = '#5a3e2a'; c.fillRect(0, 0, W, H); c.strokeStyle = '#c5a566'; c.lineWidth = 7; c.strokeRect(22, 22, W - 44, H - 44);
    c.fillStyle = '#d9bc80'; c.textAlign = 'center'; c.font = 'bold 54px Georgia'; c.fillText('TARİF', 256, 165); c.font = '35px Georgia'; c.fillText('ve hatıralar', 256, 222);
  } else if (kind === 'ledger-open' || kind === 'ledger-apprentice') {
    c.strokeStyle = '#ba9b6b'; c.lineWidth = 2; for (let y = 65; y < 330; y += 34) { c.beginPath(); c.moveTo(30, y); c.lineTo(480, y); c.stroke(); }
    c.fillStyle = '#5c4935'; c.font = 'italic 30px Georgia'; ['süt · salep · emek', 'bir daha', 'hoş bulduk', 'Kadir · Pala · Cezmi'].forEach((text, i) => c.fillText(text, 40, 91 + i * 56));
    c.strokeStyle = '#9c614c'; c.beginPath(); c.arc(417, 267, 36, 0, Math.PI * 2); c.stroke();
    if (kind === 'ledger-apprentice') {
      c.save(); c.translate(416,263); c.rotate(-.16); c.strokeStyle='#39798a'; c.lineWidth=6;
      c.beginPath(); c.moveTo(-14,-17); c.lineTo(-22,13); c.quadraticCurveTo(0,23,22,13); c.lineTo(14,-17); c.quadraticCurveTo(0,-27,-14,-17); c.stroke();
      c.beginPath(); c.arc(0,22,4,0,Math.PI*2); c.stroke(); c.restore();
      c.fillStyle='#39798a';c.font='italic 28px Georgia';c.fillText('K.',360,330);
    }
  } else if (kind === 'card' || kind === 'nora') {
    c.strokeStyle = '#b69c71'; c.lineWidth = 3; c.strokeRect(16, 16, W - 32, H - 32); c.beginPath(); c.moveTo(280, 40); c.lineTo(280, 340); c.stroke();
    c.strokeRect(393, 40, 70, 86); c.fillStyle = '#9d3e36'; c.font = '28px Georgia'; c.fillText('İSTANBUL', 304, 181);
    c.fillStyle = '#624d36'; c.font = 'italic 28px Georgia'; c.fillText('Döndüğünde…', 38, 85); c.fillText('sonunu anlat.', 38, 131); c.font = 'italic 62px Georgia'; c.fillText(kind === 'nora' ? 'Nora' : 'N.', 52, 277);
    c.fillStyle = '#8e3243'; c.beginPath(); c.arc(204, 298, 12, 0, Math.PI * 2); c.fill();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildStallDecor(scene, { textureFactory = createStallArtwork } = {}) {
  const root = new THREE.Group(); root.name = 'shop-back-counter'; scene.add(root);
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2c1c, roughness: .68 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb88747, metalness: .72, roughness: .33 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xa8542b, metalness: .7, roughness: .32 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xd3c5a6, roughness: .85 });
  const box = (w, h, d, x, y, z, material = wood) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); root.add(mesh); return mesh; };
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x70513a, roughness: .96 });
  box(4.5, 2.6, .10, 0, 1.3, -2.26, wallMat);
  const tiles = textureFactory('tile'); tiles.wrapS = THREE.RepeatWrapping; tiles.repeat.x = 3;
  const tileMat = new THREE.MeshStandardMaterial({ map: tiles, roughness: .47 });
  box(4.45, .83, .015, 0, .97, -2.197, tileMat);
  box(4.45, .045, .04, 0, 1.40, -2.16, brass);
  box(3.1, .72, .34, 0, .51, -1.95);
  box(3.18, .075, .44, 0, .91, -1.91, cream);
  for (const side of [-1, 1]) {
    box(.94, .045, .30, side * .85, 1.28, -1.98);
    box(.97, .045, .24, side * .85, 1.87, -2.02);
    for (const x of [side * .85 - .34, side * .85 + .34]) box(.035, .13, .12, x, 1.20, -2.05, brass);
  }
  const props = {};
  function frame(key, texture, width, height, x, y, z = -2.16) {
    const group = new THREE.Group(); group.position.set(x, y, z); root.add(group);
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x6b4327, roughness: .58, emissive: 0x8c5b20, emissiveIntensity: 0 });
    const border = new THREE.Mesh(new THREE.BoxGeometry(width + .035, height + .035, .032), borderMat); group.add(border);
    const picture = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: .9 })); picture.position.z = .018; group.add(picture);
    props[key] = { group, picture, borderMat };
    return props[key];
  }
  for (let i = 0; i < 4; i++) frame(`master${i}`, textureFactory('portrait', i), .255, .32, [-1.03, -.68, .68, 1.03][i], 2.11);
  frame('photo', textureFactory('photo'), .52, .35, -.76, 1.60);
  frame('notes', textureFactory('notes'), .29, .22, -.39, 1.55, -2.115).group.rotation.z = -.08;
  const ledger = frame('ledger', textureFactory('ledger'), .38, .27, .62, 1.49, -1.91);
  ledger.group.rotation.x = -.15; ledger.closedMap = ledger.picture.material.map; ledger.openMap = textureFactory('ledger-open');
  ledger.apprenticeMap = textureFactory('ledger-apprentice');
  ledger.memoryTabs = STALL_MEMORIES.map((memory,index) => {
    const tab = new THREE.Mesh(new THREE.BoxGeometry(.049,.022,.008), new THREE.MeshStandardMaterial({color:[0x487d92,0x9e4339,0x72557a,0x427c60][index],roughness:.9}));
    tab.name=`memory-tab-${memory.id}`;tab.position.set(.211,-.072+index*.046,.018);tab.rotation.z=(index-1.5)*.025;tab.visible=false;ledger.group.add(tab);return tab;
  });
  const card = frame('card', textureFactory('card'), .32, .24, 1.00, 1.55, -2.12);
  card.group.rotation.z = .08; card.hiddenMap = card.picture.material.map; card.revealedMap = textureFactory('nora');
  const venueSign = frame('venueSign', textureFactory('place'), 1.06, .26, 0, 2.47);

  // Tea service: one tray and two waist-shaped glasses with a dark amber fill.
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .014, 24), brass); tray.scale.z = .65; tray.position.set(-.89, 1.314, -1.95); root.add(tray);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xdfc6a4, transparent: true, opacity: .48, roughness: .12, metalness: .15, depthWrite: false });
  for (const x of [-.96, -.82]) {
    const profile = [new THREE.Vector2(.032, 0), new THREE.Vector2(.026, .025), new THREE.Vector2(.018, .055), new THREE.Vector2(.029, .10)];
    const glass = new THREE.Mesh(new THREE.LatheGeometry(profile, 16), glassMat); glass.position.set(x, 1.325, -1.95); root.add(glass);
    const tea = new THREE.Mesh(new THREE.CylinderGeometry(.024, .028, .063, 16), new THREE.MeshStandardMaterial({ color: 0x732d13, roughness: .22 })); tea.position.set(x, 1.355, -1.95); root.add(tea);
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(.048, .046, .008, 18), cream); saucer.position.set(x, 1.324, -1.95); root.add(saucer);
  }
  const cezve = new THREE.Group(); cezve.position.set(.99, 1.31, -1.98); root.add(cezve);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.047, .067, .105, 18), copper); pot.position.y = .053; cezve.add(pot);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.008, .010, .21, 8), wood); handle.rotation.z = -1.2; handle.position.set(.12, .12, 0); cezve.add(handle);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.047, .006, 6, 18), brass); rim.rotation.x = Math.PI / 2; rim.position.y = .108; cezve.add(rim);

  const nazar = new THREE.Group(); nazar.position.set(0, 2.18, -2.13); root.add(nazar);
  for (const [radius, color, depth] of [[.067, 0x17485c, 0], [.047, 0xe6ded0, .003], [.030, 0x2c9eaf, .006], [.015, 0x102735, .009]]) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), new THREE.MeshStandardMaterial({ color, roughness: .28 })); disc.position.z = depth; nazar.add(disc);
  }
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, .20, 6), wood); cord.position.set(0, 2.32, -2.13); root.add(cord);
  const pepperMat = new THREE.MeshStandardMaterial({ color: 0x94352a, roughness: .66 });
  for (let i = 0; i < 6; i++) {
    const pepper = new THREE.Mesh(new THREE.CapsuleGeometry(.018, .065, 3, 8), pepperMat); pepper.position.set(-1.39 + (i % 2) * .035, 1.96 - i * .065, -2.06); pepper.rotation.z = (i % 2 ? 1 : -1) * .35; root.add(pepper);
  }
  // Dedicated low-intensity shelf illumination; original stall lighting is untouched.
  const shelfLight = new THREE.PointLight(0xffd6a0, .52, 3.2); shelfLight.position.set(0, 2.35, -1.45); root.add(shelfLight);
  const themeProps = {};
  const addMini = (group, geometry, material, x, y, z) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); group.add(mesh); return mesh; };
  const motifAccent = new THREE.MeshStandardMaterial({ color: 0xa63d32, roughness: .65 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x242725, roughness: .6 });
  for (const theme of ['tram', 'tower', 'harbor', 'market', 'ferry', 'courtyard']) {
    const group = new THREE.Group(); group.name = `venue-${theme}`; group.position.set(1.29, 1.31, -1.99); group.rotation.y = -.18; group.visible = false; root.add(group); themeProps[theme] = group;
    if (theme === 'tram') {
      addMini(group, new THREE.BoxGeometry(.23, .13, .11), motifAccent, 0, .09, 0);
      addMini(group, new THREE.BoxGeometry(.25, .018, .12), wood, 0, .165, 0);
      for (const x of [-.075, -.025, .025, .075]) addMini(group, new THREE.BoxGeometry(.035, .045, .003), cream, x, .115, .057);
      for (const x of [-.072, .072]) for (const z of [-.048, .048]) addMini(group, new THREE.SphereGeometry(.018, 8, 6), dark, x, .02, z);
      const trolley = addMini(group, new THREE.TorusGeometry(.045, .003, 5, 12, Math.PI), brass, 0, .185, 0); trolley.rotation.x = Math.PI / 2;
    } else if (theme === 'tower') {
      addMini(group, new THREE.CylinderGeometry(.067, .075, .22, 18), cream, 0, .11, 0);
      addMini(group, new THREE.ConeGeometry(.078, .105, 18), motifAccent, 0, .273, 0);
      const balcony = addMini(group, new THREE.TorusGeometry(.073, .008, 6, 18), brass, 0, .186, 0); balcony.rotation.x = Math.PI / 2;
      for (const x of [-.03, .03]) addMini(group, new THREE.BoxGeometry(.018, .034, .003), dark, x, .15, .064);
    } else if (theme === 'harbor') {
      addMini(group, new THREE.CylinderGeometry(.008, .008, .20, 8), brass, 0, .12, 0);
      addMini(group, new THREE.TorusGeometry(.023, .006, 6, 12), brass, 0, .226, 0);
      addMini(group, new THREE.TorusGeometry(.073, .009, 6, 18, Math.PI), brass, 0, .078, 0).rotation.z = Math.PI;
      addMini(group, new THREE.BoxGeometry(.11, .012, .018), brass, 0, .17, 0);
      for (let i = 0; i < 3; i++) { const rope = addMini(group, new THREE.TorusGeometry(.065 - i * .014, .006, 6, 18), wood, 0, .013, .025); rope.rotation.x = Math.PI / 2; }
    } else if (theme === 'market') {
      addMini(group, new THREE.BoxGeometry(.23, .065, .14), wood, 0, .033, 0);
      const colors = [0xb46b23, 0x997c2a, 0x688047];
      for (let i = 0; i < 9; i++) addMini(group, new THREE.SphereGeometry(.024, 10, 8), new THREE.MeshStandardMaterial({ color: colors[i % 3], roughness: .7 }), (i % 3 - 1) * .06, .084, (Math.floor(i / 3) - 1) * .038);
    } else if (theme === 'ferry') {
      addMini(group, new THREE.BoxGeometry(.26, .045, .105), motifAccent, 0, .028, 0);
      addMini(group, new THREE.BoxGeometry(.18, .055, .08), cream, -.015, .078, 0);
      addMini(group, new THREE.CylinderGeometry(.015, .015, .055, 10), dark, .02, .13, 0);
      for (const x of [-.065, -.025, .015, .055]) addMini(group, new THREE.BoxGeometry(.021, .023, .003), dark, x, .082, .042);
    } else {
      addMini(group, new THREE.CylinderGeometry(.055, .039, .095, 12), copper, 0, .048, 0);
      addMini(group, new THREE.CylinderGeometry(.006, .008, .15, 8), wood, 0, .15, 0);
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x426a3f, roughness: .85 });
      for (let i = 0; i < 7; i++) { const angle = i * Math.PI * 2 / 7; const leaf = addMini(group, new THREE.SphereGeometry(.04, 10, 8), leafMat, Math.cos(angle) * .045, .16 + i * .009, Math.sin(angle) * .035); leaf.scale.set(1.0, .3, .5); leaf.rotation.z = Math.sin(angle) * .4; }
    }
  }
  const venueTextures = new Map();
  let venueId = null;
  let state = narrativeReveals();
  let focusKey = null, focusUntil = 0, lastTime = 0;
  return {
    root, props, themeProps, materials: { wall: wallMat, tile: tileMat, wood, metal: brass, accent: motifAccent }, shelfLight,
    setVenue(config = {}) {
      if (config.id && config.id === venueId) return;
      const palette = config.palette || {};
      wallMat.color.setHex(palette.wall ?? 0x70513a); wood.color.setHex(palette.wood ?? 0x4a2c1c); brass.color.setHex(palette.metal ?? 0xb88747); motifAccent.color.setHex(palette.accent ?? 0xa63d32);
      const key = config.id || 'default';
      if (!venueTextures.has(key)) {
        const tile = textureFactory('tile', config); tile.wrapS = THREE.RepeatWrapping; tile.repeat.x = 3;
        venueTextures.set(key, { tile, sign: textureFactory('place', config) });
      }
      tileMat.map = venueTextures.get(key).tile; venueSign.picture.material.map = venueTextures.get(key).sign;
      shelfLight.color.setHex(config.lightColor ?? 0xffd6a0); shelfLight.intensity = .52 * (config.lightIntensity ?? 1);
      for (const [theme, group] of Object.entries(themeProps)) group.visible = theme === (config.propTheme || 'tram');
      venueId = config.id || null;
    },
    focus(key) { if (props[key]) { focusKey = key; focusUntil = lastTime + 2.4; } },
    setState(next) {
      state = narrativeReveals(next);
      ledger.picture.material.map = state.stallMemories.includes('apprentice-mark') ? ledger.apprenticeMap : state.ledger ? ledger.openMap : ledger.closedMap;
      ledger.memoryTabs.forEach((tab,index)=>{tab.visible=state.stallMemories.includes(STALL_MEMORIES[index].id);});
      card.picture.material.map = state.nora ? card.revealedMap : card.hiddenMap;
      props.notes.group.visible = state.notes;
      props.photo.borderMat.emissiveIntensity = state.photograph ? .16 : 0;
      for (let i = 0; i < 4; i++) props[`master${i}`].borderMat.color.setHex(i === state.vendorIndex ? 0xc39550 : 0x6b4327);
      return state;
    },
    update(time) {
      lastTime = time;
      props.photo.borderMat.emissiveIntensity = state.photograph ? .16 : 0;
      const pulse = .12 + Math.sin(time * 1.7) * .035;
      for (let i = 0; i < 4; i++) props[`master${i}`].borderMat.emissiveIntensity = i === state.vendorIndex ? pulse : state.masters[i] ? .055 : 0;
      ledger.borderMat.emissiveIntensity = state.ledger ? .12 : 0;
      card.borderMat.emissiveIntensity = state.nora ? pulse : 0;
      if (focusKey && time < focusUntil) props[focusKey].borderMat.emissiveIntensity = .42 + Math.sin(time * 4) * .08;
      else focusKey = null;
    },
  };
}
