import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createCulturalPalette } from './cultural-materials.js';
import { batchStaticMeshes } from './static-batch.js';

export const CULTURAL_MODEL_KINDS = Object.freeze(['teaGlass', 'cezve', 'cup', 'plate', 'bowl', 'jar', 'utensil', 'textile', 'toyTop', 'marble', 'woodToy', 'shadowPuppet', 'instrument', 'clock', 'book', 'sign', 'basket', 'tray', 'lantern', 'ceramicTile', 'foodBoard', 'bread', 'sweets', 'fruit', 'spice', 'metalwork', 'gameBoard', 'boat', 'music']);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ease = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const hash = (value = '') => [...value].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
const nameOf = (item) => item.name?.tr || item.id;
const variantOf = (item) => `${item.variant || ''} ${item.id || ''} ${nameOf(item)}`.toLocaleLowerCase('tr');

const palette = createCulturalPalette;
const roundedBox = (w, h, d) => new RoundedBoxGeometry(w, h, d, 1, Math.min(.004, w*.12, h*.12, d*.12));

/** Authored miniature artwork. Names are labels; researched claims stay in catalog data. */
export function culturalArtwork(item, kind = 'pattern') {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = kind === 'puppet' ? 384 : 256;
  const c = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  const seed = hash(item.id), colors = ['#255e68', '#9c3d31', '#557342', '#78604a'];
  c.fillStyle = '#e4d2a9'; c.fillRect(0, 0, W, H);
  if (kind === 'puppet') {
    c.clearRect(0, 0, W, H);
    c.strokeStyle = '#30271c'; c.lineWidth = 5;
    c.fillStyle = seed % 2 ? '#914a37' : '#55754a';
    c.beginPath(); c.moveTo(79, 129); c.lineTo(185, 135); c.lineTo(185, 256); c.lineTo(67, 250); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#b98b57'; c.beginPath(); c.ellipse(127, 94, 45, 53, -.12, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(162, 82); c.lineTo(203, 107); c.lineTo(165, 117); c.fill(); c.stroke();
    c.fillStyle = '#3d3026'; c.fillRect(80, 34, 94, 24); c.beginPath(); c.arc(98, 86, 7, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#c69b62'; c.lineWidth = 28;
    c.beginPath(); c.moveTo(78, 152); c.lineTo(35, 198); c.lineTo(80, 217); c.moveTo(175, 154); c.lineTo(220, 205); c.lineTo(234, 167); c.stroke();
    c.strokeStyle = '#463629'; c.lineWidth = 26;
    c.beginPath(); c.moveTo(95, 253); c.lineTo(85, 331); c.lineTo(127, 344); c.moveTo(156, 256); c.lineTo(167, 329); c.lineTo(209, 337); c.stroke();
    c.strokeStyle = '#dec392'; c.lineWidth = 4; for (let y = 160; y < 245; y += 22) { c.beginPath(); c.moveTo(90, y); c.lineTo(163, y); c.stroke(); }
  } else if (kind === 'clock') {
    c.fillStyle = '#eee1c5'; c.beginPath(); c.arc(128, 128, 120, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3b3528'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '21px Georgia';
    for (let n = 1; n <= 12; n++) { const a = n * Math.PI / 6; c.fillText(String(n), 128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); }
  } else if (kind === 'board') {
    c.fillStyle = '#684b2d'; c.fillRect(0, 0, W, H);
    if (/tavla|backgammon/.test(variantOf(item))) {
      for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#b67e49' : '#dfc992'; const x = 12 + (i % 6) * 40; const y = i < 6 ? 12 : 244; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30, y); c.lineTo(x + 15, i < 6 ? 115 : 141); c.fill(); }
      c.fillStyle = '#422a1c'; c.fillRect(124, 0, 8, H);
    } else {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = (x + y) % 2 ? '#795533' : '#e0c69a'; c.fillRect(x * 32, y * 32, 32, 32); }
    }
  } else if (kind === 'miniature') {
    c.fillStyle = '#a9c1b2'; c.fillRect(0, 0, W, H); c.fillStyle = '#c6b288'; c.fillRect(0, 145, W, 111);
    for (let i = 0; i < 5; i++) { const x = 12 + i * 48, y = 90 + (i % 2) * 25; c.fillStyle = ['#a56348', '#d6bd83', '#6e8c80'][i % 3]; c.fillRect(x, y, 41, 90); c.fillStyle = '#763e31'; c.beginPath(); c.moveTo(x - 2, y); c.lineTo(x + 20, y - 29); c.lineTo(x + 44, y); c.fill(); c.fillStyle = '#3f574f'; c.fillRect(x + 12, y + 20, 13, 22); }
    c.strokeStyle = '#b89552'; c.lineWidth = 10; c.strokeRect(5, 5, 246, 246);
    for (let i = 0; i < 4; i++) { c.fillStyle = '#855037'; c.beginPath(); c.arc(35 + i * 57, 207, 7, 0, Math.PI * 2); c.fill(); c.fillRect(30 + i * 57, 214, 11, 20); }
  } else if (kind === 'illumination' || kind === 'papercut') {
    c.fillStyle = kind === 'papercut' ? '#3f6570' : '#e9dbbd'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#c39a50'; c.lineWidth = 10; c.strokeRect(15, 15, 226, 226);
    c.fillStyle = kind === 'papercut' ? '#f1e5c7' : '#b88f46';
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.save(); c.translate(128 + Math.cos(a) * 56, 128 + Math.sin(a) * 56); c.rotate(a); c.beginPath(); c.ellipse(0, 0, 36, 13, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    c.fillStyle = kind === 'papercut' ? '#3f6570' : '#486c78'; c.beginPath(); c.arc(128, 128, 29, 0, Math.PI * 2); c.fill();
  } else if (kind === 'ebru') {
    c.fillStyle = '#e0d2b5'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 38; i++) { c.strokeStyle = ['#487f83', '#b98179', '#8ca085', '#d8bd84'][i % 4]; c.lineWidth = 4; c.beginPath(); for (let y = 0; y <= H; y += 4) { const x = i * 7 + Math.sin(y * .038 + i * .3) * 24; if (y === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); }
  } else if (kind === 'ticket') {
    c.strokeStyle = '#9d6841'; c.lineWidth = 4; c.strokeRect(13, 13, 230, 230); c.fillStyle = '#6e4933'; c.textAlign = 'center'; c.font = 'bold 31px Georgia'; c.fillText('TÜNEL', 128, 70); c.font = '22px Georgia'; c.fillText('BİLET', 128, 113); c.font = '20px monospace'; c.fillText('No. 0190', 128, 185); for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(8 + i * 18, 246, 4, 0, Math.PI * 2); c.fill(); }
  } else if (kind === 'hopscotch' || kind === 'morris') {
    c.fillStyle = '#576057'; c.fillRect(0, 0, W, H); c.strokeStyle = '#e5d9bb'; c.lineWidth = 4;
    if (kind === 'morris') { for (const inset of [18, 52, 86]) c.strokeRect(inset, inset, W - inset * 2, H - inset * 2); for (const [x1, y1, x2, y2] of [[128, 18, 128, 86], [128, 170, 128, 238], [18, 128, 86, 128], [170, 128, 238, 128]]) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); } }
    else { c.font = '25px Georgia'; c.textAlign = 'center'; for (let i = 0; i < 7; i++) { const row = Math.floor(i / 2), x = i === 6 ? 99 : 69 + (i % 2) * 60, y = 204 - row * 54; c.strokeRect(x, y - 44, 56, 48); c.fillStyle = '#e5d9bb'; c.fillText(String(i + 1), x + 28, y - 10); } }
  } else if (kind === 'book' || kind === 'sign') {
    c.strokeStyle = '#a47b47'; c.lineWidth = 5; c.strokeRect(12, 12, 232, 232);
    c.fillStyle = '#6b4c33'; c.textAlign = 'center'; c.font = 'bold 22px Georgia';
    const words = nameOf(item).split(' '); let line = '', y = 68;
    for (const word of words) { if (c.measureText(`${line} ${word}`).width > 204) { c.fillText(line, 128, y); y += 30; line = word; } else line = `${line} ${word}`.trim(); }
    if (line) c.fillText(line, 128, y);
    c.strokeStyle = '#b59b75'; c.lineWidth = 2; for (let sy = Math.max(145, y + 38); sy < 225; sy += 15) { c.beginPath(); c.moveTo(36, sy); c.lineTo(220 - ((sy + seed) % 35), sy); c.stroke(); }
  } else {
    c.fillStyle = colors[seed % colors.length]; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#e3c99a'; c.lineWidth = 3;
    const divisions = kind === 'textile' ? 4 : 3, step = W / divisions;
    for (let y = 0; y < divisions; y++) for (let x = 0; x < divisions; x++) {
      const cx = (x + .5) * step, cy = (y + .5) * step;
      c.beginPath(); c.moveTo(cx, cy - step * .38); c.lineTo(cx + step * .38, cy); c.lineTo(cx, cy + step * .38); c.lineTo(cx - step * .38, cy); c.closePath(); c.stroke();
      if (kind !== 'textile') { c.beginPath(); c.arc(cx, cy, step * .17, 0, Math.PI * 2); c.stroke(); }
    }
    c.lineWidth = 8; c.strokeRect(8, 8, W - 16, H - 16);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

/** Merge only static pieces of one exhibit; preserve articulated parts as separate nodes. */
function consolidate(root) {
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const batches = new Map(), disposed = new Set();
  root.traverse((node) => {
    if (!node.isMesh || Array.isArray(node.material)) return;
    let ancestor = node; while (ancestor && ancestor !== root) { if (ancestor.userData.motionPart) return; ancestor = ancestor.parent; }
    const entries = batches.get(node.material) || []; entries.push(node); batches.set(node.material, entries);
  });
  for (const [material, meshes] of batches) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map((mesh) => {
      let geometry = mesh.geometry.clone(); if (geometry.index) { const flat = geometry.toNonIndexed(); geometry.dispose(); geometry = flat; }
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInverse, mesh.matrixWorld));
      if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
      return geometry;
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (!merged) continue;
    for (const mesh of meshes) { mesh.removeFromParent(); if (!disposed.has(mesh.geometry)) { mesh.geometry.dispose(); disposed.add(mesh.geometry); } }
    root.add(new THREE.Mesh(merged, material));
  }
}

export function createCulturalModel(item, { materials = palette(), textureFactory = culturalArtwork } = {}) {
  if (!CULTURAL_MODEL_KINDS.includes(item.modelKind)) throw new Error(`Unsupported cultural model: ${item.modelKind}`);
  const art = new THREE.Group(); art.name = `cultural-${item.id}`;
  const m = materials, variant = variantOf(item), seed = hash(item.id), sub = seed % 3;
  const motion = {};
  const printedMaterials = new Map();
  const add = (geometry, material, x = 0, y = 0, z = 0, parent = art) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
  const box = (w, h, d, material, x = 0, y = 0, z = 0, parent = art) => add(roundedBox(w, h, d), material, x, y, z, parent);
  const sphere = (r, material, x = 0, y = 0, z = 0, parent = art) => add(new THREE.SphereGeometry(r, 16, 12), material, x, y, z, parent);
  const cyl = (a, b, h, material, x = 0, y = 0, z = 0, parent = art) => add(new THREE.CylinderGeometry(a, b, h, 24), material, x, y, z, parent);
  const ring = (r, t, material, x = 0, y = 0, z = 0, arc = Math.PI * 2, parent = art) => add(new THREE.TorusGeometry(r, t, 8, 28, arc), material, x, y, z, parent);
  const lathe = (profile, material, x = 0, z = 0, parent = art) => add(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32), material, x, 0, z, parent);
  const line = (a, b, radius, material, parent = art) => { const delta = b.clone().sub(a); const mesh = cyl(radius, radius, delta.length(), material, 0, 0, 0, parent); mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(V(0, 1, 0), delta.normalize()); return mesh; };
  const artMaterial = (kind, transparent = false) => {
    if (!printedMaterials.has(kind)) printedMaterials.set(kind, new THREE.MeshStandardMaterial({ map: textureFactory(item, kind), roughness: .8, transparent, side: THREE.DoubleSide, depthWrite: !transparent }));
    return printedMaterials.get(kind);
  };
  const flatArt = (w, h, kind, x, y, z, parent = art) => add(new THREE.PlaneGeometry(w, h), artMaterial(kind, kind === 'puppet'), x, y, z, parent);
  const saucer = (x = 0, z = 0, radius = .075) => { lathe([[0,.006],[radius*.56,.006],[radius*.8,.009],[radius,.016],[radius,.019],[radius*.78,.014],[radius*.55,.011],[0,.011]],m.porcelain,x,z); ring(radius*.94,.0017,m.brass,x,.018,z).rotation.x=Math.PI/2; };
  const cup = (x = 0, z = 0, small = false) => { const r=small?.028:.042; lathe([[r*.66,.012],[r*.71,.016],[r*.8,.03],[r,.08],[r*1.02,.085],[r*.91,.085],[r*.89,.077],[r*.69,.024]],m.porcelain,x,z); cyl(r*.88,r*.88,.003,m.tea,x,.072,z); ring(r*.97,.0015,m.brass,x,.085,z).rotation.x=Math.PI/2; ring(r*.55,.005,m.porcelain,x+r*1.1,.055,z); };
  const loaf = (x, z, kind = '') => { if (/simit|ring/.test(kind)) { const bread = ring(.063, .016, m.brown, x, .023, z); bread.rotation.x = Math.PI / 2; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const s = sphere(.0025, m.cream, x + Math.cos(a) * .063, .039, z + Math.sin(a) * .063); s.scale.z = 1.8; } } else { const bread = add(new THREE.CapsuleGeometry(.035, .10, 4, 12), m.yellow, x, .039, z); bread.rotation.z = Math.PI / 2; bread.scale.z = /pide|flat|lava/.test(kind) ? 1.8 : 1; for (let i = -1; i <= 1; i++) { const slash = box(.025, .002, .004, m.brown, x + i * .034, .073, z); slash.rotation.y = -.6; } } };
  const fruit = (x, y, z, type, r = .025) => { const p = sphere(r, /grape|üzüm/.test(type) ? m.blue : /fig|incir/.test(type) ? m.red : /lemon|limon/.test(type) ? m.yellow : m.green, x, y, z); if (/pear|armut|fig|incir/.test(type)) p.scale.y = 1.3; if (/lemon|limon/.test(type)) p.scale.z = 1.45; cyl(.002, .002, .016, m.darkWood, x, y + r + .005, z); };
  const pan = () => { lathe([[0,.003],[.08,.003],[.098,.01],[.105,.027],[.105,.032],[.099,.032],[.092,.014],[0,.014]], m.copper); ring(.102,.003,m.brass,0,.031).rotation.x=Math.PI/2; for (const side of [-1, 1]) ring(.022, .004, m.brass, side * .11, .028, 0, Math.PI).rotation.y = Math.PI / 2; };
  const movable = (key, x = 0, y = 0, z = 0) => { const part = new THREE.Group(); part.userData.motionPart = true; part.position.set(x, y, z); part.userData.restPosition = part.position.clone(); art.add(part); motion[key] = part; return part; };
  let handled = true;
  switch (item.variant) {
    case 'fish-sandwich': { const bottom = add(new THREE.CapsuleGeometry(.037, .14, 4, 12), m.yellow, 0, .031); bottom.rotation.z = Math.PI / 2; bottom.scale.y = .65; box(.17, .016, .064, m.cream, 0, .052); for (let i = -2; i <= 2; i++) { const leaf = sphere(.025, m.green, i * .034, .065, .012); leaf.scale.set(1, .12, .7); } const top = add(new THREE.CapsuleGeometry(.033, .14, 4, 12), m.brown, 0, .078); top.rotation.z = Math.PI / 2; top.scale.z = .85; break; }
    case 'pide': { const base = sphere(.07, m.yellow, 0, .021); base.scale.set(1.9, .18, .65); const filling = sphere(.058, m.brown, 0, .034); filling.scale.set(1.8, .10, .50); for (let i = 0; i < 10; i++) sphere(.005, i % 3 ? m.red : m.green, Math.sin(i * 2.3) * .09, .040, Math.cos(i * 2.3) * .024); for (const side of [-1, 1]) { const crust = add(new THREE.CapsuleGeometry(.009, .20, 3, 10), m.yellow, 0, .036, side * .031); crust.rotation.z = Math.PI / 2; } break; }
    case 'felt-runner': { const felt = box(.11, .007, .29, m.cream, 0, .005); flatArt(.10, .28, 'textile', 0, .009, 0).rotation.x = -Math.PI / 2; box(.11, .009, .045, m.red, 0, .012, .115); break; }
    case 'carpet': { const carpet = flatArt(.22, .17, 'pattern', 0, .009, 0); carpet.rotation.x = -Math.PI / 2; cyl(.029, .029, .22, artMaterial('pattern'), 0, .034, -.067).rotation.z = Math.PI / 2; for (let i = 0; i < 12; i++) line(V(-.10 + i * .018, .009, .083), V(-.10 + i * .018, .009, .102), .0015, m.cream); break; }
    case 'pouch': {
      lathe([[.032, 0], [.049, .02], [.045, .06], [.028, .079]], m.cream, -.03, -.025); ring(.028, .003, m.darkWood, -.03, .08, -.025).rotation.x = Math.PI / 2;
      const stones = movable('marbles'); for (let i = 0; i < 6; i++) { const marble = sphere(.015, [m.blue, m.green, m.yellow][i % 3], i < 3 ? -.04 + i * .014 : .015 + (i - 3) * .032, i < 3 ? .076 : .016, i < 3 ? -.025 : .032, stones); marble.userData.rest = marble.position.clone(); } break;
    }
    case 'tram': box(.21, .09, .105, m.red, 0, .075); box(.23, .014, .12, m.darkWood, 0, .13); for (let i = -1; i <= 1; i++) box(.045, .042, .002, m.cream, i * .061, .095, .054); for (const x of [-.07, .07]) for (const z of [-.052, .052]) cyl(.022, .022, .01, m.dark, x, .025, z).rotation.x = Math.PI / 2; line(V(-.06, .138, 0), V(.025, .19, 0), .002, m.brass); line(V(.025, .19, 0), V(.08, .19, 0), .002, m.brass); break;
    case 'tarhana': case 'jam': {
      lathe([[.045, 0], [.051, .022], [.051, .12], [.043, .14]], m.glass); cyl(.047, .043, .10, item.variant === 'jam' ? m.red : m.yellow, 0, .057); cyl(.048, .048, .012, item.variant === 'jam' ? artMaterial('textile') : m.wood, 0, .145); const label = flatArt(.062, .043, 'sign', 0, .08, .052); if (item.variant === 'tarhana') for (let i = 0; i < 5; i++) sphere(.005, m.brown, Math.sin(i * 2) * .028, .112, Math.cos(i * 2) * .027); break;
    }
    case 'leather-bound': box(.14, .027, .19, m.cream, 0, .02); for (const y of [.004, .036]) box(.15, .006, .20, m.darkWood, 0, y); flatArt(.13, .18, 'illumination', 0, .040, 0).rotation.x = -Math.PI / 2; for (let i = -1; i <= 1; i++) box(.007, .034, .012, m.brass, -.077, .02, i * .06); break;
    case 'mangala': box(.29, .018, .13, m.wood, 0, .01); for (let i = 0; i < 12; i++) { const x = (i % 6 - 2.5) * .034, z = i < 6 ? -.031 : .031; cyl(.013, .013, .002, m.darkWood, x, .02, z); for (const dx of [-.004, .004]) sphere(.004, m.cream, x + dx, .024, z); } for (const x of [-.122, .122]) { const store = cyl(.023, .023, .002, m.darkWood, x, .021); store.scale.z = 1.8; sphere(.005, m.blue, x, .026); } break;
    case 'chestnuts': pan(); for (let i = 0; i < 9; i++) { const x = (i % 3 - 1) * .052, z = (Math.floor(i / 3) - 1) * .045; sphere(.023, m.brown, x, .04, z).scale.y = .75; line(V(x - .01, .058, z), V(x + .01, .058, z), .002, m.cream); } break;
    case 'corn': {
      const corn = add(new THREE.CapsuleGeometry(.027, .14, 4, 12), m.yellow, 0, .035); corn.rotation.z = Math.PI / 2;
      for (let i = 0; i < 9; i++) ring(.028, .002, m.cream, -.068 + i * .017, .035).rotation.y = Math.PI / 2;
      for (const side of [-1, 1]) { const leaf = sphere(.055, m.green, side * .09, .022); leaf.scale.set(1.0, .10, .50); leaf.rotation.y = side * .35; } break;
    }
    case 'kumpir': { const potato = sphere(.075, m.brown, 0, .054); potato.scale.set(1.25, .7, .8); const cream = sphere(.061, m.cream, 0, .088); cream.scale.set(1.30, .19, .70); for (let i = 0; i < 9; i++) sphere(.009, [m.red, m.green, m.yellow][i % 3], Math.sin(i * 2.1) * .05, .103, Math.cos(i * 2.1) * .03); break; }
    case 'ice-cream-block': cyl(.064, .060, .14, m.cream, -.025, .073); const tinyCone = add(new THREE.ConeGeometry(.025, .075, 14), m.wood, .10, .043); tinyCone.rotation.z = Math.PI; line(V(-.1, .009, -.08), V(.13, .009, -.08), .004, m.brass); break;
    case 'menemen': pan(); cyl(.091, .091, .005, m.red, 0, .03); for (let i = 0; i < 10; i++) { const egg = sphere(.014, i % 3 ? m.yellow : m.green, Math.sin(i * 2.1) * .065, .039, Math.cos(i * 2.1) * .06); egg.scale.y = .3; } break;
    case 'sutlac': lathe([[.057, 0], [.070, .022], [.080, .055]], m.brown); cyl(.074, .074, .004, m.cream, 0, .047); const crust = sphere(.048, m.brown, .006, .050, -.005); crust.scale.set(1, .05, .7); break;
    case 'sugar-cubes': lathe([[.045, 0], [.069, .028], [.065, .063]], m.brass); for (let i = 0; i < 7; i++) box(.025, .025, .025, m.white, Math.sin(i * 2.2) * .037, .052 + (i > 4 ? .018 : 0), Math.cos(i * 2.2) * .035); const sugarLid = add(new THREE.ConeGeometry(.068, .024, 18), m.brass, .085, .035); sugarLid.rotation.z = -.8; break;
    case 'dolma': saucer(0, 0, .105); for (const [x, z] of [[-.04, -.025], [.04, -.025], [0, .04]]) { const pepper = sphere(.034, m.green, x, .047, z); pepper.scale.y = 1.15; cyl(.024, .024, .006, m.cream, x, .080, z); sphere(.008, m.red, x, .085, z); } break;
    case 'bath-bowl': lathe([[.045, 0], [.062, .014], [.090, .065], [.095, .069]], m.brass); ring(.094, .004, m.brass, 0, .069).rotation.x = Math.PI / 2; for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; line(V(Math.sin(a) * .047, .005, Math.cos(a) * .047), V(Math.sin(a) * .089, .06, Math.cos(a) * .089), .0012, m.copper); } break;
    case 'asure': lathe([[.047, 0], [.071, .03], [.082, .065]], m.cream); cyl(.075, .075, .004, m.yellow, 0, .058); for (let i = 0; i < 11; i++) sphere(.006 + (i % 2) * .003, [m.red, m.brown, m.green][i % 3], Math.sin(i * 2.4) * .058, .065, Math.cos(i * 2.4) * .056); break;
    case 'white-cheese': saucer(0, 0, .10); for (let i = 0; i < 3; i++) box(.052, .030, .036, m.cream, (i - 1) * .06, .028); fruit(.04, .028, .048, 'olive', .01); break;
    case 'olives': saucer(0, 0, .095); for (let i = 0; i < 11; i++) { const olive = sphere(.014, i % 2 ? m.green : m.dark, Math.sin(i * 2.4) * .061, .025, Math.cos(i * 2.4) * .058); olive.scale.z = 1.3; } break;
    case 'mussels': saucer(0, 0, .11); for (let i = 0; i < 5; i++) { const angle = i * Math.PI * 2 / 5, x = Math.sin(angle) * .062, z = Math.cos(angle) * .062; const shell = sphere(.032, m.dark, x, .027, z); shell.scale.set(.55, .25, 1); shell.rotation.y = angle; const rice = sphere(.021, m.yellow, x, .034, z); rice.scale.set(.5, .14, 1); rice.rotation.y = angle; } fruit(0, .029, 0, 'lemon', .022); break;
    case 'semolina-helva': saucer(0, 0, .095); add(new THREE.ConeGeometry(.06, .065, 18), m.yellow, 0, .044); for (let i = 0; i < 5; i++) sphere(.004, m.green, Math.sin(i * 2) * .02, .071, Math.cos(i * 2) * .02); break;
    case 'honey-kaymak': saucer(0, 0, .105); const kaymak = sphere(.055, m.white, -.027, .037); kaymak.scale.set(1, .33, .65); const honey = sphere(.042, m.yellow, .038, .022, .02); honey.scale.y = .12; line(V(.05, .033, -.04), V(.12, .033, .055), .004, m.wood); for (let i = 0; i < 3; i++) ring(.012, .003, m.wood, .052 + i * .007, .035, -.035).rotation.y = Math.PI / 2; break;
    case 'kazandibi': { saucer(0, 0, .095); const roll = cyl(.03, .03, .11, m.cream, 0, .04); roll.rotation.z = Math.PI / 2; const caramel = box(.104, .002, .039, m.brown, 0, .067); caramel.rotation.x = -.2; break; }
    case 'mortar': lathe([[.047, 0], [.054, .02], [.064, .07], [.061, .09]], m.brass); const pestle = add(new THREE.CapsuleGeometry(.013, .12, 3, 10), m.brass, .022, .111); pestle.rotation.z = -.4; break;
    case 'skimmer': { const head = cyl(.045, .045, .006, m.brass, 0, .018, -.06); for (let i = 0; i < 12; i++) { const hole = cyl(.003, .003, .001, m.dark, Math.sin(i * 2.4) * .032, .022, -.06 + Math.cos(i * 2.4) * .032); hole.name = 'skimmer-perforation'; } line(V(0, .019, -.02), V(0, .019, .13), .004, m.wood); break; }
    case 'ladle': { const scoop = add(new THREE.SphereGeometry(.039, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m.copper, 0, .049, -.065); line(V(0, .049, -.032), V(0, .09, .13), .004, m.brass); break; }
    case 'coffee-grinder': lathe([[.038, 0], [.039, .13], [.029, .15]], m.brass); box(.065, .009, .012, m.brass, .027, .163); cyl(.008, .008, .022, m.wood, .06, .172); ring(.039, .003, m.copper, 0, .11).rotation.x = Math.PI / 2; break;
    case 'jump-rope': { const curve = new THREE.CatmullRomCurve3([V(-.09, .012, -.055), V(-.10, .012, .065), V(0, .012, .10), V(.10, .012, .065), V(.09, .012, -.055)]); add(new THREE.TubeGeometry(curve, 24, .003, 5), m.cream); for (const x of [-.09, .09]) cyl(.008, .008, .07, m.wood, x, .012, -.09).rotation.x = Math.PI / 2; break; }
    case 'embroidery-frame': ring(.09, .008, m.wood, 0, .10); add(new THREE.CircleGeometry(.084, 24), artMaterial('textile'), 0, .10, .002); line(V(.015, .13, .005), V(.06, .19, .01), .0015, m.brass); box(.028, .02, .014, m.brass, 0, .2); break;
    case 'woven-belt': { const belt = flatArt(.055, .30, 'textile', 0, .016, 0); belt.rotation.x = -Math.PI / 2; cyl(.019, .019, .06, artMaterial('textile'), 0, .031, -.14).rotation.z = Math.PI / 2; break; }
    case 'quilt': { const quilt = box(.23, .033, .17, artMaterial('textile'), 0, .018); for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) { const puff = sphere(.039, x % 2 ? m.red : m.cream, x * .074, .033, z * .05); puff.scale.set(1, .20, .65); } break; }
    case 'lace-scarf': { const scarf = flatArt(.20, .17, 'textile', 0, .01, 0); scarf.rotation.x = -Math.PI / 2; for (let i = 0; i < 13; i++) ring(.008, .0015, m.cream, -.096 + i * .016, .012, .091).rotation.x = Math.PI / 2; break; }
    case 'illuminated': box(.15, .007, .20, m.darkWood, 0, .004); flatArt(.145, .195, 'illumination', 0, .008, 0).rotation.x = -Math.PI / 2; break;
    case 'miniature': { box(.23, .009, .17, m.darkWood, 0, .005); for (const side of [-1, 1]) { const page = flatArt(.11, .16, 'miniature', side * .057, .012, 0); page.rotation.set(-Math.PI / 2, side * .12, 0); } break; }
    case 'paper-ticket': { const ticket = flatArt(.23, .10, 'ticket', 0, .014, 0); ticket.rotation.x = -Math.PI / 2; const stub = flatArt(.06, .10, 'ticket', .14, .014, .015); stub.rotation.set(-Math.PI / 2, 0, -.17); break; }
    case 'papercut': box(.19, .19, .012, m.darkWood, 0, .105); flatArt(.18, .18, 'papercut', 0, .105, .008); break;
    case 'five-stones': { for (let i = 0; i < 5; i++) { const pebble = sphere(.022, m.cream, Math.sin(i * 2.4) * .055, .020, Math.cos(i * 2.4) * .055); pebble.scale.set(1 + i * .08, .65, .85); } break; }
    case 'walnuts': { for (let i = 0; i < 6; i++) { const x = Math.sin(i * 2.4) * .06, z = Math.cos(i * 2.4) * .05; const nut = sphere(.022, m.wood, x, .021, z); nut.scale.y = 1.1; ring(.021, .0015, m.darkWood, x, .021, z); } break; }
    case 'cloth-doll': add(new THREE.ConeGeometry(.054, .10, 12), artMaterial('textile'), 0, .095); sphere(.032, m.cream, 0, .176); for (const side of [-1, 1]) { line(V(side * .028, .14), V(side * .065, .09), .01, m.cream); line(V(side * .019, .053), V(side * .02, .014), .009, m.darkWood); sphere(.004, m.dark, side * .011, .18, .03); } const scarf = add(new THREE.SphereGeometry(.034, 12, 8, 0, Math.PI * 2, 0, Math.PI * .45), m.red, 0, .185); break;
    case 'carved-chest': case 'pearl-box': {
      const pearl = item.variant === 'pearl-box'; box(.21, pearl ? .075 : .12, .14, m.darkWood, 0, pearl ? .04 : .065);
      flatArt(.19, pearl ? .06 : .10, pearl ? 'illumination' : 'pattern', 0, pearl ? .043 : .068, .071);
      const lid = movable('lid', 0, pearl ? .08 : .13, -.07); box(.215, .016, .145, m.wood, 0, .008, .073, lid);
      for (const x of [-.075, .075]) box(.012, .032, .008, m.brass, x, pearl ? .04 : .07, .075);
      break;
    }
    case 'pinwheel': {
      line(V(), V(0, .24, 0), .004, m.wood); const wheel = movable('wheel', 0, .20, .006);
      for (let i = 0; i < 4; i++) { const blade = add(new THREE.CircleGeometry(.055, 3), [m.red, m.blue, m.yellow, m.green][i], Math.sin(i * Math.PI / 2) * .033, Math.cos(i * Math.PI / 2) * .033, 0, wheel); blade.rotation.z = -i * Math.PI / 2 + .35; }
      sphere(.009, m.brass, 0, 0, .009, wheel); break;
    }
    case 'wire-car': {
      for (const z of [-.048, .048]) { line(V(-.09, .035, z), V(.09, .035, z), .003, m.brass); line(V(-.055, .035, z), V(-.025, .095, z), .003, m.brass); line(V(-.025, .095, z), V(.055, .095, z), .003, m.brass); line(V(.055, .095, z), V(.08, .035, z), .003, m.brass); }
      for (const x of [-.065, .065]) for (const z of [-.057, .057]) ring(.028, .004, m.dark, x, .029, z);
      line(V(.075, .04, 0), V(.14, .22, 0), .002, m.brass); break;
    }
    case 'telephone': {
      box(.18, .035, .13, m.dark, 0, .02); cyl(.043, .043, .005, m.brass, 0, .042, .015); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cyl(.006, .006, .002, m.dark, Math.sin(a) * .029, .046, .015 + Math.cos(a) * .029); }
      for (const x of [-.07, .07]) line(V(x, .03, -.037), V(x, .09, -.037), .006, m.dark);
      const receiver = new THREE.CatmullRomCurve3([V(-.085, .085, -.037), V(-.045, .115, -.037), V(.045, .115, -.037), V(.085, .085, -.037)]); add(new THREE.TubeGeometry(receiver, 12, .013, 8), m.dark); for (const x of [-.084, .084]) sphere(.023, m.dark, x, .083, -.037); break;
    }
    case 'telegraph': box(.21, .016, .13, m.darkWood, 0, .009); for (const x of [-.055, .055]) cyl(.023, .023, .045, m.copper, x, .04, -.015); const key = movable('key', 0, .065, .02); box(.11, .008, .02, m.brass, 0, 0, 0, key); sphere(.018, m.dark, .052, .013, 0, key); break;
    case 'printing-block': box(.15, .035, .15, m.wood, 0, .025); flatArt(.14, .14, 'pattern', 0, .043, 0).rotation.x = -Math.PI / 2; const second = box(.095, .025, .095, m.darkWood, .10, .02, .065); second.rotation.y = -.25; break;
    case 'ferris-wheel': {
      for (const z of [-.02, .02]) { line(V(-.07, .006, z), V(0, .13, z), .005, m.wood); line(V(.07, .006, z), V(0, .13, z), .005, m.wood); }
      const wheel = movable('wheel', 0, .13, .03); ring(.096, .005, m.wood, 0, 0, 0, Math.PI * 2, wheel);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; line(V(), V(Math.sin(a) * .096, Math.cos(a) * .096), .003, m.brass, wheel); box(.027, .021, .027, i % 2 ? m.red : m.blue, Math.sin(a) * .088, Math.cos(a) * .088, .015, wheel); } break;
    }
    case 'bath-clogs': for (const side of [-1, 1]) { const x = side * .055; box(.072, .015, .17, m.wood, x, .052); for (const z of [-.055, .055]) box(.055, .042, .012, m.darkWood, x, .025, z); const strap = ring(.038, .008, m.cream, x, .058, -.014, Math.PI); strap.rotation.y = Math.PI / 2; } break;
    case 'camera': {
      box(.15, .12, .065, m.darkWood, 0, .145); box(.10, .085, .06, m.dark, 0, .14, .057); for (let i = 0; i < 4; i++) box(.105, .09, .003, m.wood, 0, .14, .035 + i * .016); cyl(.033, .033, .043, m.brass, 0, .14, .108).rotation.x = Math.PI / 2; cyl(.025, .025, .002, m.dark, 0, .14, .131).rotation.x = Math.PI / 2; for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; line(V(0, .09, 0), V(Math.sin(a) * .09, 0, Math.cos(a) * .09), .004, m.wood); } break;
    }
    case 'acrobat': {
      for (const x of [-.07, .07]) line(V(x, 0), V(x, .25), .005, m.wood); line(V(-.07, .23), V(.07, .23), .004, m.brass);
      const acrobat = movable('acrobat', 0, .22, .006); sphere(.02, m.cream, 0, -.035, 0, acrobat); box(.032, .06, .021, m.red, 0, -.079, 0, acrobat); for (const side of [-1, 1]) { line(V(side * .012, -.058), V(side * .046, 0), .005, m.wood, acrobat); line(V(side * .01, -.109), V(side * .025, -.16), .006, m.wood, acrobat); } break;
    }
    case 'zoetrope': cyl(.055, .065, .012, m.wood, 0, .006); cyl(.009, .009, .05, m.brass, 0, .037); const drum = movable('wheelY', 0, .12, 0); cyl(.09, .09, .11, m.darkWood, 0, 0, 0, drum); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const slit = box(.010, .045, .002, m.dark, Math.sin(a) * .091, .022, Math.cos(a) * .091, drum); slit.rotation.y = a; } break;
    case 'candlestick': lathe([[.062, 0], [.065, .015], [.026, .03], [.018, .11], [.031, .14], [.018, .17], [.048, .19]], m.darkWood); cyl(.014, .014, .07, m.cream, 0, .227); cyl(.0012, .0012, .009, m.dark, 0, .267); break;
    case 'rolling-hoop': ring(.105, .005, m.wood, -.02, .11); line(V(.085, .008, .015), V(.13, .225, .015), .004, m.darkWood); break;
    case 'funicular': {
      const rail = box(.29, .018, .13, m.wood, 0, .027); rail.rotation.z = .16; const car = movable('car', 0, .07, 0); box(.17, .082, .09, m.red, 0, .025, 0, car); for (let i = -1; i <= 1; i++) box(.035, .037, .002, m.cream, i * .047, .04, .046, car); for (const x of [-.055, .055]) for (const z of [-.045, .045]) cyl(.02, .02, .01, m.dark, x, -.025, z, car).rotation.x = Math.PI / 2; break;
    }
    case 'kanun': {
      const shape = new THREE.Shape(); shape.moveTo(-.11, -.07); shape.lineTo(.11, -.07); shape.lineTo(.074, .07); shape.lineTo(-.065, .07); shape.closePath();
      const board = add(new THREE.ExtrudeGeometry(shape, { depth: .024, bevelEnabled: false }), m.wood, 0, .026); board.rotation.x = -Math.PI / 2;
      for (let i = 0; i < 12; i++) line(V(-.095 + i * .003, .03, -.06 + i * .011), V(.095 - i * .002, .03, -.06 + i * .011), .0008, m.brass);
      for (const x of [-.04, 0, .04]) cyl(.009, .009, .001, m.dark, x, .031, .015); motion.pulse = true; break;
    }
    case 'zurna': lathe([[.034, 0], [.034, .016], [.015, .065], [.011, .22], [.007, .25]], m.wood); for (let i = 0; i < 6; i++) sphere(.0028, m.dark, 0, .08 + i * .024, .012); ring(.034, .003, m.brass, 0, .014).rotation.x = Math.PI / 2; break;
    case 'spoons': {
      for (const side of [-1, 1]) { const scoop = sphere(.03, m.wood, side * .035, .018, -.067); scoop.scale.set(.65, .25, 1); line(V(side * .034, .017, -.035), V(side * .017, .02, .12), .005, m.wood); }
      motion.pulse = true; break;
    }
    case 'cumbus': cyl(.065, .065, .035, m.brass, 0, .075).rotation.x = Math.PI / 2; add(new THREE.CircleGeometry(.059, 24), m.white, 0, .075, .019); box(.017, .19, .016, m.wood, 0, .22); for (const x of [-.004, 0, .004]) line(V(x, .065, .022), V(x, .313, .012), .0007, m.brass); motion.pulse = true; break;
    case 'davul': {
      cyl(.09, .09, .11, m.wood, 0, .095).rotation.x = Math.PI / 2;
      for (const z of [-.057, .057]) add(new THREE.CircleGeometry(.084, 24), m.cream, 0, .095, z).rotation.y = z < 0 ? Math.PI : 0;
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, b = a + .4; line(V(Math.sin(a) * .091, .095 + Math.cos(a) * .091, -.053), V(Math.sin(b) * .091, .095 + Math.cos(b) * .091, .053), .0015, m.cream); }
      line(V(.10, .006, -.10), V(.14, .025, .10), .005, m.wood); sphere(.011, m.darkWood, .14, .025, .10); motion.pulse = true; break;
    }
    case 'accordion': {
      box(.11, .12, .08, m.red, 0, .067); for (let i = 0; i < 8; i++) box(.003, .124, .085, i % 2 ? m.dark : m.cream, -.051 + i * .015, .067);
      for (const side of [-1, 1]) box(.042, .14, .09, m.dark, side * .077, .077);
      for (let i = 0; i < 8; i++) box(.035, .012, .007, m.white, -.077, .025 + i * .014, .05);
      for (let i = 0; i < 9; i++) sphere(.003, m.cream, .066 + (i % 3) * .01, .045 + Math.floor(i / 3) * .026, .047); motion.pulse = true; break;
    }
    case 'oud': {
      const body = sphere(.07, m.wood, 0, .08); body.scale.set(.85, 1.1, .40); box(.023, .105, .018, m.darkWood, 0, .192); const peg = box(.026, .055, .017, m.darkWood, 0, .263, -.009); peg.rotation.x = -.55;
      for (const x of [-.023, .023]) add(new THREE.CircleGeometry(.012, 12), m.dark, x, .091, .027);
      for (let i = 0; i < 6; i++) line(V((i - 2.5) * .002, .04, .029), V((i - 2.5) * .002, .238, .012), .00055, m.cream); motion.pulse = true; break;
    }
    case 'kemence': {
      const body = sphere(.038, m.wood, 0, .075); body.scale.set(.65, 1.8, .5); box(.016, .12, .014, m.wood, 0, .195); sphere(.02, m.darkWood, 0, .265).scale.set(.7, 1.1, .6); for (const x of [-.004, 0, .004]) line(V(x, .027, .018), V(x, .252, .012), .0007, m.cream);
      line(V(.061, .015, 0), V(.065, .278, 0), .0028, m.wood); line(V(.052, .02, 0), V(.054, .27, 0), .0008, m.cream); motion.pulse = true; break;
    }
    case 'gramophone': {
      box(.19, .055, .15, m.darkWood, 0, .03); const disc = movable('wheelY', -.015, .061, .015); cyl(.064, .064, .004, m.dark, 0, 0, 0, disc); cyl(.012, .012, .005, m.red, 0, .001, 0, disc);
      line(V(.072, .055, -.045), V(.072, .16, -.045), .006, m.brass); const horn = add(new THREE.CylinderGeometry(.078, .012, .12, 18, 1, true), m.brass, .045, .203, -.015); horn.rotation.x = .8; horn.rotation.z = -.45;
      ring(.078, .004, m.brass, 0, .061, 0, Math.PI * 2, horn).rotation.x = Math.PI / 2; line(V(.07, .07, .055), V(.018, .064, .013), .0025, m.brass); break;
    }
    case 'kunefe': pan(); cyl(.082, .082, .022, m.yellow, 0, .035); for (let i = 0; i < 7; i++) ring(.012 + i * .010, .0018, m.brown, 0, .047).rotation.x = Math.PI / 2; for (let i = 0; i < 8; i++) sphere(.003, m.green, Math.sin(i * 2.3) * .038, .051, Math.cos(i * 2.3) * .038); break;
    case 'tulumba': box(.21, .012, .15, m.brass, 0, .007); for (let i = 0; i < 6; i++) { const x = (i % 3 - 1) * .058, z = (Math.floor(i / 3) - .5) * .07; const sweet = add(new THREE.CapsuleGeometry(.017, .027, 3, 10), m.yellow, x, .032, z); sweet.rotation.x = Math.PI / 2; for (const dx of [-.009, 0, .009]) line(V(x + dx, .047, z - .018), V(x + dx, .047, z + .018), .0012, m.brown); } break;
    case 'ebru': { box(.23, .02, .17, m.darkWood, 0, .012); flatArt(.21, .15, 'ebru', 0, .024, 0).rotation.x = -Math.PI / 2; line(V(.12, .025, -.06), V(.13, .025, .10), .002, m.wood); break; }
    case 'ayran': lathe([[.038, 0], [.044, .085], [.046, .092]], m.copper); cyl(.04, .04, .004, m.white, 0, .084); ring(.026, .005, m.brass, .053, .054); for (let i = 0; i < 5; i++) sphere(.004, m.white, Math.sin(i * 2) * .022, .088, Math.cos(i * 2) * .022); break;
    case 'water-glass': lathe([[.029, 0], [.032, .011], [.034, .105]], m.glass); cyl(.031, .029, .055, m.blue, 0, .04); saucer(0, 0, .047); break;
    case 'salep': saucer(0, 0, .072); lathe([[.03, .012], [.04, .075], [.044, .08]], m.white); ring(.025, .006, m.white, .051, .052); cyl(.040, .040, .003, m.cream, 0, .074); for (let i = 0; i < 7; i++) sphere(.0015, m.brown, Math.sin(i * 2.4) * .024, .077, Math.cos(i * 2.4) * .024); break;
    case 'gourd': {
      const glow = sphere(.064, m.wood, 0, .076); glow.scale.y = 1.15; const neck = sphere(.025, m.wood, 0, .151); neck.scale.y = 1.6; ring(.016, .003, m.brass, 0, .20);
      const lit = m.yellow.clone(); lit.emissive.setHex(0xe5a64b); lit.emissiveIntensity = .18;
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; sphere(.0045, lit, Math.sin(a) * .061, .085 + (i % 2) * .014, Math.cos(a) * .061); }
      break;
    }
    case 'milk-pail': add(new THREE.CylinderGeometry(.06, .047, .13, 18, 1, true), m.brass, 0, .07); ring(.061, .004, m.brass, 0, .135).rotation.x = Math.PI / 2; ring(.062, .004, m.brass, 0, .13, 0, Math.PI); break;
    case 'lidded-sahan': pan(); add(new THREE.SphereGeometry(.099, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.brass, 0, .03).scale.y = .55; sphere(.009, m.darkWood, 0, .095); break;
    case 'oltu-beads': { for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; sphere(.0085, m.dark, Math.sin(a) * .075, .012, Math.cos(a) * .09); } line(V(0, .012, .09), V(0, .012, .145), .003, m.brass); for (let i = -2; i <= 2; i++) line(V(0, .012, .145), V(i * .008, .012, .18), .0012, m.brass); break; }
    case 'bird-gugum': {
      lathe([[.047, 0], [.065, .04], [.060, .12], [.033, .18], [.03, .205]], m.copper); add(new THREE.ConeGeometry(.036, .02, 18), m.brass, 0, .214); ring(.065, .007, m.brass, .064, .125);
      sphere(.019, m.brass, 0, .242).scale.set(1.2, .7, .7); sphere(.009, m.brass, -.02, .251); const beak = add(new THREE.ConeGeometry(.005, .016, 8), m.brass, -.031, .251); beak.rotation.z = Math.PI / 2; const tail = add(new THREE.ConeGeometry(.011, .028, 8), m.brass, .027, .249); tail.rotation.z = -.7; break;
    }
    case 'soap-holder': box(.18, .02, .12, m.brass, 0, .012); for (let i = 0; i < 7; i++) box(.004, .001, .09, m.dark, -.066 + i * .022, .023); const soap = box(.10, .026, .064, m.cream, -.012, .037); soap.rotation.y = -.12; break;
    case 'meerschaum-pendant': { const loop = ring(.077, .002, m.brass, 0, .015); loop.rotation.x = Math.PI / 2; const pendant = sphere(.033, m.white, 0, .018, .078); pendant.scale.set(.70, .22, 1.1); for (let i = 0; i < 5; i++) { const leaf = sphere(.012, m.cream, Math.sin(i * 2) * .012, .026, .078 + Math.cos(i * 2) * .018); leaf.scale.y = .15; } break; }
    case 'tile-stack': for (let i = 0; i < 9; i++) { const tile = box(.075, .009, .065, i % 2 ? m.red : m.wood, 0, .005 + i * .010); tile.rotation.y = (i % 3 - 1) * .08; } sphere(.024, m.cream, .098, .025, .015); break;
    case 'hopscotch': { const floor = flatArt(.16, .24, 'hopscotch', 0, .003, 0); floor.rotation.x = -Math.PI / 2; sphere(.013, m.cream, .023, .014, .021).scale.y = .5; break; }
    case 'knucklebones': for (let i = 0; i < 5; i++) { const x = Math.sin(i * 2.4) * .061, z = Math.cos(i * 2.4) * .05; box(.022, .018, .013, m.cream, x, .013, z); for (const dx of [-.012, .012]) sphere(.010, m.white, x + dx, .014, z).scale.set(.75, 1, .9); } break;
    case 'nine-mens-morris': box(.20, .012, .20, m.wood, 0, .007); flatArt(.19, .19, 'morris', 0, .014, 0).rotation.x = -Math.PI / 2; for (let i = 0; i < 6; i++) cyl(.009, .009, .005, i % 2 ? m.cream : m.dark, [-.078, 0, .078][i % 3], .018, i < 3 ? -.078 : .078); break;
    case 'rowing': { const hull = add(new THREE.SphereGeometry(.07, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m.wood, 0, .073); hull.scale.set(2, .75, .58); for (const x of [-.055, .055]) box(.018, .009, .075, m.darkWood, x, .07); for (const side of [-1, 1]) { line(V(-.03, .074, side * .025), V(.09, .032, side * .12), .0028, m.wood); const blade = box(.036, .004, .019, m.wood, .09, .032, side * .12); blade.rotation.y = side * -.5; } motion.rock = true; break; }
    case 'steamship': case 'tugboat': {
      const steamship = item.variant === 'steamship'; const hull = box(steamship ? .29 : .21, .045, .10, m.dark, 0, .028); box(steamship ? .18 : .10, .055, .08, m.cream, -.018, .078);
      for (let i = 0; i < (steamship ? 2 : 1); i++) cyl(.015, .015, steamship ? .055 : .07, m.red, (i - (steamship ? .5 : 0)) * .052, .13);
      for (let i = 0; i < (steamship ? 5 : 3); i++) box(.018, .021, .002, m.dark, -.07 + i * .032, .082, .042);
      if (!steamship) { ring(.024, .006, m.dark, .103, .035).rotation.y = Math.PI / 2; line(V(.075, .05, -.03), V(.075, .15, -.03), .002, m.brass); } motion.rock = true; break;
    }
    case 'fruit-soap': { box(.22, .01, .15, m.wood, 0, .006); for (let i = 0; i < 6; i++) fruit((i % 3 - 1) * .062, .038, (Math.floor(i / 3) - .5) * .064, ['fig', 'lemon', 'pear'][i % 3], .023); break; }
    case 'market-sacks': for (let i = 0; i < 3; i++) { const x = (i - 1) * .079; const sack = sphere(.039, m.cream, x, .042); sack.scale.y = 1.1; ring(.031, .004, m.wood, x, .077).rotation.x = Math.PI / 2; add(new THREE.ConeGeometry(.03, .02, 14), [m.red, m.yellow, m.green][i], x, .083); } break;
    default: handled = false;
  }
  if (!handled) switch (item.modelKind) {
    case 'teaGlass': {
      const count = /pair|double|iki|tray|tepsi/.test(variant) ? 2 : 1;
      for (let i = 0; i < count; i++) { const x = (i - (count - 1) / 2) * .10; saucer(x, 0, .055); lathe([[.026, .015], [.029, .026], [.019, .061], [.031, .108], [.034, .115]], m.glass, x); ring(.033,.002,m.glass,x,.114).rotation.x=Math.PI/2; cyl(.024, .023, .060, m.tea, x, .050); }
      if (count === 1) { box(.018, .017, .018, m.white, .055, .023, .016); line(V(.03, .018, -.04), V(.08, .018, .02), .0025, m.brass); }
      const steam = new THREE.Group(); steam.userData.motionPart = true; steam.position.y = .13; art.add(steam); motion.steam = steam;
      for (let i = 0; i < 2; i++) { const curve = new THREE.CatmullRomCurve3([V(0, 0, 0), V(.012, .025, 0), V(-.006, .05, 0), V(.006, .08, 0)]); const mat = new THREE.MeshBasicMaterial({ color: 0xeadfcb, transparent: true, opacity: .12, depthWrite: false }); add(new THREE.TubeGeometry(curve, 10, .0018, 5), mat, i * .018 - .009, 0, 0, steam); }
      break;
    }
    case 'cezve': {
      const r = /small|mini|tek/.test(variant) ? .035 : .047;
      lathe([[r * .85, 0], [r, .012], [r * .72, .092], [r * .78, .101]], /bakır|copper/.test(variant) ? m.copper : m.brass);
      ring(r * .76, .004, m.brass, 0, .1).rotation.x = Math.PI / 2;
      line(V(r * .7, .075, 0), V(.19, .15, 0), .006, m.darkWood);
      const spout = new THREE.CatmullRomCurve3([V(-r*.68,.092,0),V(-r*.92,.102,0),V(-r-.018,.107,0)]); add(new THREE.TubeGeometry(spout,8,.007,8),m.copper);
      for(const y of [.073,.086]) sphere(.0033,m.brass,r*.76,y,.006);
      if (/set|servis/.test(variant)) cup(-.09, .02, true);
      else cyl(r * .68, r * .68, .002, m.tea, 0, .088);
      break;
    }
    case 'cup': saucer(0, 0, .075); cup(); if (/lid|kapak/.test(variant)) { add(new THREE.ConeGeometry(.045, .018, 16), m.brass, 0, .094); sphere(.008, m.brass, 0, .106); } else if (/pair|iki/.test(variant)) { saucer(.10, 0, .045); cup(.10, 0, true); } break;
    case 'plate': {
      const count = /stack|üst|üç/.test(variant) ? 3 : 1;
      for (let i = 0; i < count; i++) { cyl(.105 - i * .004, .09, .009, m.white, 0, .008 + i * .012); const surface = flatArt(.195, .195, 'pattern', 0, .014 + i * .012, 0); surface.rotation.x = -Math.PI / 2; }
      if (/wall|duvar/.test(variant)) art.rotation.x = .85;
      break;
    }
    case 'bowl': lathe([[.044, 0], [.047, .01], [.070, .035], [.084, .075], [.087, .08]], /copper|bakır/.test(variant) ? m.copper : m.blue); ring(.087, .004, m.cream, 0, .08).rotation.x = Math.PI / 2; if (/soup|çorba|yoğurt/.test(variant)) { cyl(.077, .077, .003, m.cream, 0, .065); line(V(.025, .063, 0), V(.12, .10, .03), .003, m.brass); } break;
    case 'jar': {
      const bottle = /bottle|şişe|kolonya|rose|gül/.test(variant);
      lathe(bottle ? [[.038, 0], [.043, .02], [.040, .12], [.018, .16], [.018, .19]] : [[.046, 0], [.051, .025], [.051, .13], [.044, .15]], m.glass);
      cyl(bottle ? .022 : .049, bottle ? .022 : .049, .019, m.brass, 0, bottle ? .197 : .157);
      const label = flatArt(bottle ? .055 : .077, .050, 'sign', 0, .08, bottle ? .042 : .052);
      if (/pickle|turşu/.test(variant)) {
        for (const [i, p] of [[-.023,.065,.012],[.018,.068,-.012],[.008,.081,.023]].entries()) {
          const cucumber=add(new THREE.CapsuleGeometry(.011,.061,4,10),m.green,...p);
          cucumber.rotation.z=(i-1)*.17;
          for(let n=0;n<4;n++)sphere(.0022,m.green,.009,-.023+n*.015,.004,cucumber);
        }
        for(const x of [-.015,.027]){const carrot=cyl(.004,.007,.057,m.yellow,x,.054,-.023);carrot.rotation.z=x<0?.22:-.2;}
        for(const x of [-.025,.012]){const clove=sphere(.009,m.cream,x,.018,.014);clove.scale.set(.65,1,.85);}
        const brine=new THREE.MeshStandardMaterial({color:0xa6b76e,transparent:true,opacity:.10,roughness:.22,depthWrite:false});
        cyl(.046,.046,.112,brine,0,.064);
      } else if (/olive|zeytin/.test(variant)) for (let i = 0; i < 7; i++) {const olive=sphere(.012,m.green,Math.sin(i*2)*.027,.022+i*.014,Math.cos(i*2)*.025);olive.scale.y=1.3;}
      for (const y of [bottle ? .194 : .153,bottle ? .201 : .161])ring(bottle ? .0225 : .0495,.0013,m.brass,0,y).rotation.x=Math.PI/2;
      label.name = 'jar-label'; break;
    }
    case 'utensil': {
      if (/rolling|oklava/.test(variant)) { cyl(.014, .014, .26, m.wood, 0, .02).rotation.z = Math.PI / 2; for (const x of [-.155, .155]) cyl(.008, .008, .055, m.darkWood, x, .02).rotation.z = Math.PI / 2; }
      else if (/sieve|elek/.test(variant)) { ring(.085, .009, m.wood, 0, .018).rotation.x = Math.PI / 2; for (let i = -4; i <= 4; i++) { line(V(i * .015, .016, -.064), V(i * .015, .016, .064), .001, m.brass); line(V(-.064, .016, i * .015), V(.064, .016, i * .015), .001, m.brass); } }
      else if (/tongs|maşa/.test(variant)) { for (const side of [-1, 1]) line(V(0, .02, -.09), V(side * .035, .02, .09), .004, m.brass); }
      else if (/knife|bıçak|satır/.test(variant)) { box(.045, .008, .12, m.brass, 0, .02, -.018); box(.022, .018, .075, m.darkWood, 0, .02, .078); }
      else { const scoop = sphere(.035, /wood|ahşap|tahta/.test(variant) ? m.wood : m.brass, 0, .026, -.065); scoop.scale.set(.72, .25, 1); line(V(0, .028, -.03), V(0, .028, .115), .006, m.wood); if (/pair|çift/.test(variant)) { const other = scoop.clone(); other.position.x = .06; art.add(other); line(V(.06, .028, -.03), V(.06, .028, .115), .006, m.wood); } }
      break;
    }
    case 'textile': {
      const hanging = /apron|önlük|lace|oya/.test(variant); const w = hanging ? .14 : .21, h = hanging ? .23 : .14;
      const fabric = flatArt(w, h, 'textile', 0, hanging ? .13 : .012, 0); if (!hanging) fabric.rotation.x = -Math.PI / 2;
      for (let i = 0; i < 9; i++) line(hanging ? V(-w / 2 + i * w / 8, .012, 0) : V(-w / 2 + i * w / 8, .012, h / 2), hanging ? V(-w / 2 + i * w / 8, 0, 0) : V(-w / 2 + i * w / 8, .012, h / 2 + .016), .0018, m.cream);
      if (/roll|peştemal|towel|havlu/.test(variant)) { const roll = cyl(.024, .024, .16, artMaterial('textile'), 0, .030, -.045); roll.rotation.z = Math.PI / 2; }
      if (hanging) { line(V(-.07, .25, 0), V(.07, .25, 0), .004, m.wood); ring(.022, .003, m.brass, 0, .274, 0, Math.PI); }
      break;
    }
    case 'toyTop': {
      const spindle = movable('spindle');
      lathe([[.003,0],[.008,.012],[.030,.035],[.055,.063],[.063,.085],[.058,.103],[.044,.116],[.016,.122]],m.wood,0,0,spindle);
      for(const [radius,y] of [[.061,.087],[.059,.099]]) ring(radius,.0027,m.red,0,y,0,Math.PI*2,spindle).rotation.x=Math.PI/2;
      cyl(.008,.010,.037,m.darkWood,0,.139,0,spindle);
      cyl(.003,.004,.015,m.brass,0,.002,0,spindle);
      if(/whip|kırbaç|ip|string/.test(variant)){ring(.072,.0022,m.cream,0,.008).rotation.x=Math.PI/2;line(V(.09,.01,-.1),V(.09,.01,.1),.004,m.wood);}
      break;
    }
    case 'marble': {
      cyl(.10, .095, .012, m.darkWood, 0, .006);
      const stones = new THREE.Group(); stones.userData.motionPart = true; art.add(stones); motion.marbles = stones;
      for (let i = 0; i < 5 + sub; i++) { const angle = i * 2.4; const marble = sphere(.016 + (i === 0 ? .006 : 0), [m.blue, m.green, m.yellow][i % 3], Math.cos(angle) * (i === 0 ? 0 : .056), .032, Math.sin(angle) * (i === 0 ? 0 : .056), stones); marble.userData.rest = marble.position.clone(); }
      break;
    }
    case 'woodToy': {
      if (/horse|at|rocking/.test(variant)) { const body = add(new THREE.CapsuleGeometry(.034, .075, 3, 10), m.wood, 0, .09); body.rotation.z = Math.PI / 2; sphere(.033, m.wood, -.065, .14); for (const x of [-.04, .04]) for (const z of [-.022, .022]) line(V(x, .075, z), V(x * 1.3, .015, z), .008, m.darkWood); line(V(.06, .1, 0), V(.09, .075, 0), .006, m.darkWood); }
      else if (/yo|yoyo|makara/.test(variant)) { for (const z of [-.013, .013]) cyl(.065, .065, .018, m.wood, 0, .07, z).rotation.x = Math.PI / 2; line(V(0, .07, 0), V(.08, .16, 0), .002, m.cream); motion.spin = true; }
      else { box(.20, .065, .10, m.wood, 0, .06); box(.08, .06, .09, m.red, -.04, .12); if (/tram|train|tren/.test(variant)) cyl(.022, .022, .055, m.darkWood, .045, .119); for (const x of [-.067, .067]) for (const z of [-.055, .055]) cyl(.027, .027, .012, m.dark, x, .029, z).rotation.x = Math.PI / 2; }
      break;
    }
    case 'shadowPuppet': {
      const puppet = new THREE.Group(); puppet.userData.motionPart = true; art.add(puppet); motion.puppet = puppet;
      flatArt(.15, .24, 'puppet', 0, .15, 0, puppet); line(V(-.04, .03, .006), V(-.04, .17, .006), .0025, m.wood, puppet); line(V(.063, .06, .006), V(.063, .14, .006), .0025, m.wood, puppet);
      for (const side of [-1, 1]) line(V(side * .11, 0, -.035), V(side * .11, .29, -.035), .004, m.darkWood);
      box(.23, .012, .02, m.darkWood, 0, .29, -.035); const screenMat = new THREE.MeshStandardMaterial({ color: 0xf0e5c9, emissive: 0xe9c78b, emissiveIntensity: .12, side: THREE.DoubleSide }); const screen = add(new THREE.PlaneGeometry(.21, .27), screenMat, 0, .145, -.045); motion.screen = screen;
      break;
    }
    case 'instrument': {
      if (/saz|bağlama|lute/.test(variant)) { const body = sphere(.068, m.wood, 0, .07); body.scale.set(.78, 1.1, .36); box(.018, .18, .018, m.darkWood, 0, .20); for (const x of [-.004, 0, .004]) line(V(x, .06, .027), V(x, .295, .015), .0007, m.cream); }
      else if (/ney|flute|kaval/.test(variant)) { cyl(.011, .012, .29, m.wood, 0, .15); for (let i = 0; i < 6; i++) sphere(.003, m.dark, 0, .08 + i * .027, .011); }
      else if (/tef|tambour/.test(variant)) { cyl(.09, .09, .025, m.wood, 0, .095).rotation.x = Math.PI / 2; add(new THREE.CircleGeometry(.083, 24), m.cream, 0, .095, .014); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; cyl(.012, .012, .003, m.brass, Math.sin(a) * .089, .095 + Math.cos(a) * .089).rotation.x = Math.PI / 2; } }
      else { lathe([[.043, 0], [.029, .04], [.031, .09], [.067, .15], [.069, .17]], /bakır|copper/.test(variant) ? m.copper : m.wood); cyl(.067, .067, .004, m.cream, 0, .172); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; line(V(Math.sin(a) * .065, .16, Math.cos(a) * .065), V(Math.sin(a) * .035, .025, Math.cos(a) * .035), .002, m.cream); } }
      motion.pulse = true; break;
    }
    case 'clock': {
      const tall = /pendulum|sarkaç|wall|duvar/.test(variant);
      box(.15, tall ? .25 : .17, .045, m.darkWood, 0, tall ? .135 : .095); const face = flatArt(.13, .13, 'clock', 0, tall ? .18 : .105, .024);
      const hands = new THREE.Group(); hands.userData.motionPart = true; hands.position.copy(face.position).z += .002; art.add(hands); motion.clock = hands;
      box(.004, .047, .002, m.dark, 0, .02, 0, hands); const hour = box(.005, .032, .002, m.dark, .014, 0, .001, hands); hour.rotation.z = -Math.PI / 2;
      if (tall) { const pend = new THREE.Group(); pend.userData.motionPart = true; pend.position.set(0, .105, .028); art.add(pend); line(V(), V(0, -.06, 0), .0025, m.brass, pend); sphere(.018, m.brass, 0, -.065, 0, pend); motion.pendulum = pend; }
      else for (const side of [-1, 1]) add(new THREE.SphereGeometry(.026, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.brass, side * .055, .19);
      break;
    }
    case 'book': {
      if (/open|recipe|tarif|defter/.test(variant)) { for (const side of [-1, 1]) { const page = flatArt(.10, .15, 'book', side * .052, .02, 0); page.rotation.set(-Math.PI / 2, side * .12, 0); } box(.22, .008, .16, m.darkWood, 0, .009); }
      else { box(.14, .026, .19, m.cream, 0, .019); for (const y of [.005, .034]) box(.15, .006, .20, m.red, 0, y); flatArt(.13, .18, 'book', 0, .038, 0).rotation.x = -Math.PI / 2; }
      break;
    }
    case 'sign': box(.21, .15, .018, m.darkWood, 0, .09); flatArt(.19, .13, 'sign', 0, .09, .010); if (/hanging|askı/.test(variant)) for (const x of [-.07, .07]) line(V(x, .165, 0), V(x * .6, .22, 0), .002, m.brass); else for (const x of [-.065, .065]) box(.015, .05, .04, m.wood, x, .02); break;
    case 'basket': lathe([[.065, 0], [.075, .018], [.09, .09], [.09, .10]], m.wood); for (let i = 0; i < 5; i++) ring(.07 + i * .004, .0025, m.cream, 0, .015 + i * .018).rotation.x = Math.PI / 2; ring(.09, .006, m.darkWood, 0, .1, 0, Math.PI); if (/fruit|meyve|pazar/.test(variant)) for (let i = 0; i < 4; i++) fruit(Math.sin(i * 2) * .045, .10, Math.cos(i * 2) * .04, variant); break;
    case 'tray': cyl(.12, .115, .012, /copper|bakır/.test(variant) ? m.copper : m.brass, 0, .008); for (const side of [-1, 1]) ring(.027, .005, m.brass, side * .125, .018, 0, Math.PI).rotation.y = Math.PI / 2; if (/service|servis|tea|çay/.test(variant)) { cup(-.045, 0, true); cup(.045, 0, true); } else flatArt(.17, .17, 'pattern', 0, .015, 0).rotation.x = -Math.PI / 2; break;
    case 'lantern': {
      cyl(.055, .064, .022, m.brass, 0, .012); cyl(.055, .04, .027, m.brass, 0, .174); const glow = sphere(.045, m.yellow.clone(), 0, .09); glow.scale.y = 1.4; glow.material.emissive.setHex(0xca8b36); glow.material.emissiveIntensity = .12; motion.glow = glow;
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; line(V(Math.sin(a) * .052, .02, Math.cos(a) * .052), V(Math.sin(a) * .052, .165, Math.cos(a) * .052), .0025, m.darkWood); }
      ring(.033, .0035, m.brass, 0, .214); break;
    }
    case 'ceramicTile': box(.19, .19, .014, m.cream, 0, .105); flatArt(.18, .18, 'pattern', 0, .105, .008); if (/pair|çift|panel/.test(variant)) { const extra = flatArt(.11, .11, 'pattern', .12, .07, .02); extra.rotation.z = -.12; } break;
    case 'foodBoard': box(.25, .016, .17, m.wood, 0, .008); if (/cheese|peynir/.test(variant)) { for (let i = 0; i < 3; i++) box(.04, .035, .04, m.cream, -.07 + i * .06, .034, 0); } else { loaf(-.035, 0, variant); fruit(.08, .04, .025, 'fig'); } line(V(.09, .018, -.075), V(.12, .018, .065), .005, m.brass); break;
    case 'bread': cyl(.11, .105, .008, m.cream, 0, .004); loaf(0, 0, variant); if (/braid|örgü/.test(variant)) { loaf(0, .037, 'loaf'); loaf(0, -.037, 'loaf'); } break;
    case 'sweets': {
      box(.21, .012, .16, m.brass, 0, .006);
      if (/candy|akide|şeker/.test(variant)) { for (let i = 0; i < 7; i++) sphere(.021, [m.red, m.yellow, m.white][i % 3], Math.sin(i * 2.3) * .067, .031, Math.cos(i * 2.3) * .05); }
      else for (let i = 0; i < 6; i++) { const sweet = box(.046, /lokum|delight/.test(variant) ? .036 : .024, .039, /lokum|delight/.test(variant) ? (i % 2 ? m.red : m.white) : m.yellow, (i % 3 - 1) * .058, .025, (Math.floor(i / 3) - .5) * .061); if (/baklava/.test(variant)) { sweet.rotation.y = .3; sphere(.005, m.green, sweet.position.x, .040, sweet.position.z); } }
      break;
    }
    case 'fruit': cyl(.10, .09, .014, m.cream, 0, .007); for (let i = 0; i < (/grape|üzüm/.test(variant) ? 11 : 5); i++) fruit(Math.sin(i * 2.4) * .05, .03 + (i > 5 ? .025 : 0), Math.cos(i * 2.4) * .047, variant, /grape|üzüm/.test(variant) ? .015 : .026); break;
    case 'spice': {
      if (/grinder|değirmen/.test(variant)) { lathe([[.035, 0], [.026, .04], [.021, .1], [.032, .145]], m.wood); sphere(.035, m.wood, 0, .16); cyl(.005, .005, .016, m.brass, 0, .196); }
      else for (let i = 0; i < 3; i++) { const x = (i - 1) * .079; cyl(.038, .028, .03, m.wood, x, .016); add(new THREE.ConeGeometry(.031, .027, 14), [m.red, m.yellow, m.green][i], x, .039); }
      break;
    }
    case 'metalwork': {
      if (/scale|terazi/.test(variant)) { cyl(.065, .075, .014, m.wood, 0, .007); line(V(0, .02, 0), V(0, .22, 0), .006, m.brass); line(V(-.10, .19, 0), V(.1, .19, 0), .005, m.brass); for (const side of [-1, 1]) { line(V(side * .095, .19, 0), V(side * .095, .08, 0), .0015, m.brass); cyl(.043, .02, .016, m.brass, side * .095, .07); } }
      else if (/brazier|mangal/.test(variant)) { lathe([[.055, .025], [.085, .05], [.082, .09]], m.copper); for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; line(V(Math.cos(a) * .055, .035, Math.sin(a) * .055), V(Math.cos(a) * .075, 0, Math.sin(a) * .075), .006, m.brass); } for (let i = 0; i < 4; i++) sphere(.019, m.dark, Math.sin(i * 2) * .04, .06, Math.cos(i * 2) * .04); }
      else { lathe([[.04, 0], [.035, .025], [.068, .08], [.045, .14], [.025, .19]], m.copper); add(new THREE.ConeGeometry(.036, .025, 16), m.brass, 0, .203); ring(.067, .007, m.brass, .064, .11); const curve = new THREE.CatmullRomCurve3([V(-.05, .085), V(-.085, .13), V(-.10, .19)]); add(new THREE.TubeGeometry(curve, 10, .012, 8), m.copper); }
      break;
    }
    case 'gameBoard': {
      box(.24, .016, .18, m.darkWood, 0, .009); flatArt(.225, .165, 'board', 0, .018, 0).rotation.x = -Math.PI / 2;
      if (/mangala/.test(variant)) for (let i = 0; i < 12; i++) { const x = (i % 6 - 2.5) * .033, z = i < 6 ? -.04 : .04; cyl(.012, .012, .002, m.dark, x, .020, z); sphere(.004, m.cream, x, .024, z); }
      else for (let i = 0; i < 8; i++) cyl(.013, .013, .007, i % 2 ? m.white : m.dark, (i % 4 - 1.5) * .042, .025, i < 4 ? -.045 : .045);
      break;
    }
    case 'boat': {
      const ferry = /ferry|vapur/.test(variant); box(.26, .04, .09, m.blue, 0, .025); const bow = add(new THREE.ConeGeometry(.045, .075, 3), m.blue, -.155, .025); bow.rotation.z = Math.PI / 2;
      if (ferry) { box(.17, .05, .07, m.white, 0, .068); cyl(.012, .012, .045, m.dark, .025, .113); for (const x of [-.05, -.015, .02, .055]) box(.02, .021, .002, m.dark, x, .072, .037); }
      else { line(V(0, .035, 0), V(0, .23, 0), .003, m.wood); const sail = add(new THREE.CircleGeometry(.083, 3), m.cream, -.026, .145); sail.rotation.z = .4; line(V(.10, .03, 0), V(0, .225, 0), .001, m.cream); }
      motion.rock = true; break;
    }
  }
  consolidate(art);
  art.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(art), size = bounds.getSize(V());
  // Normalize the shelf footprint, retaining each silhouette and relative proportions.
  const fit = .185 / Math.max(size.x, size.y, size.z, .001);
  const center = bounds.getCenter(V());
  art.scale.setScalar(fit); art.position.set(-center.x * fit, -bounds.min.y * fit, -center.z * fit);
  const root = new THREE.Group(); root.add(art); root.name = `exhibit-${item.id}`; root.userData.culturalId = item.id;
  return { root, art, motion, restArtPosition: art.position.clone(), restArtScale: art.scale.clone(), restArtRotation: art.rotation.clone() };
}

const SECTION_NAMES = ['left', 'right', 'upper'];
export function discoveryAnchor(section, slot) {
  const column = slot % 3, row = Math.floor(slot / 3);
  if (section === 2) return V((column - 1) * .26, 2.65 + row * .27, -1.95);
  return V((section === 0 ? -.79 : .79) + (column - 1) * .23, 1.31 + row * .59, -1.66);
}

/** Eighteen original objects per venue, six per inspection view. */
export class CulturalScene {
  constructor(world, catalog, { textureFactory = culturalArtwork, viewport, physicalMarkers = false } = {}) {
    this.world = world; this.catalog = catalog;
    this.physicalMarkers = physicalMarkers;
    this.viewport = viewport || (() => ({ width: world.canvas?.clientWidth || globalThis.window?.innerWidth || 800, height: world.canvas?.clientHeight || globalThis.window?.innerHeight || 600 }));
    this.root = new THREE.Group(); this.root.name = 'cultural-exhibits'; world.scene.add(this.root);
    this.focusRoot = new THREE.Group(); this.focusRoot.name = 'original-object-inspection'; world.scene.add(this.focusRoot);
    this.light = new THREE.PointLight(0xffedcf, .75, 2); this.light.visible = false; world.scene.add(this.light);
    this.materials = palette(); this.records = new Map(); this.venueGroups = new Map(); this.discovered = new Set();
    this.furniture = new THREE.Group(); this.furniture.name = 'cultural-display-cabinets'; this.root.add(this.furniture);
    const board = (width, height, depth, x, y, z) => { const mesh = new THREE.Mesh(roundedBox(width, height, depth), this.materials.darkWood); mesh.position.set(x, y, z); this.furniture.add(mesh); return mesh; };
    for (const side of [-1, 1]) for (const y of [1.31, 1.90]) board(.72, .025, .34, side * .79, y - .0265, -1.72);
    board(.86, .55, .035, 0, 2.875, -2.12);
    for (const x of [-.43, .43]) board(.026, .57, .24, x, 2.875, -2.00);
    for (const y of [2.65, 2.92]) board(.86, .025, .28, 0, y - .0265, -1.98);
    board(.89, .032, .27, 0, 3.165, -2.00);
    for (const side of [-1,1]) for (const y of [1.31,1.90]) {
      for(const offset of [-.27,.27]) {
        board(.018,.14,.025,side*.79+offset,y-.105,-1.76);
        const fastener=new THREE.Mesh(new THREE.SphereGeometry(.007,8,6),this.materials.brass);
        fastener.scale.z=.30;fastener.position.set(side*.79+offset,y-.075,-1.741);this.furniture.add(fastener);
      }
    }
    // Only fixed shelves and fasteners: all 108 exhibit roots remain independent.
    batchStaticMeshes(this.furniture);
    this.enabled = false; this.returning = false; this.section = 0; this.venueId = null; this.focus = null; this.disposed = false;
    this.raycaster = new THREE.Raycaster(); this.ndc = new THREE.Vector2(); this.scratch = V(); this.scratch2 = V();
    this.cameraPosition = V(); this.cameraTargetPosition = V(); this.cameraQuaternion = new THREE.Quaternion(); this.cameraTargetQuaternion = new THREE.Quaternion();
    this.savedCamera = null; this.cameraTransition = 0; this.cameraFov = world.camera.fov;
    this.savedLanterns = null;
    this.rotationStep = new THREE.Quaternion(); this.rotationAxis = V(); this.rotationEuler = new THREE.Euler(0,0,0,'YXZ');
    this.inspectionTargetQuaternion = new THREE.Quaternion(); this.inspectionTargetPosition = V(); this.inspectionCenter = V();
    const venueCounts = new Map();
    for (const item of catalog) {
      if (!item.id || this.records.has(item.id)) throw new Error(`Duplicate cultural detail: ${item.id}`);
      if (!this.venueGroups.has(item.venueId)) { const group = new THREE.Group(); group.name = `culture-${item.venueId}`; group.visible = false; this.root.add(group); this.venueGroups.set(item.venueId, group); }
      const index = venueCounts.get(item.venueId) || 0; venueCounts.set(item.venueId, index + 1);
      if (index >= 18) throw new Error(`More than eighteen details in ${item.venueId}`);
      const section = item.section ?? Math.floor(index / 6), slot = item.slot ?? index % 6;
      const anchor = new THREE.Group(); anchor.position.copy(discoveryAnchor(section, slot)); anchor.name = `anchor-${item.id}`; this.venueGroups.get(item.venueId).add(anchor);
      const model = createCulturalModel(item, { materials: this.materials, textureFactory }); anchor.add(model.root);
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(.205, .012, .17), this.materials.darkWood); plinth.position.y = -.008; anchor.add(plinth);
      const markMat = new THREE.MeshBasicMaterial({ color: 0xc9a56a, transparent: true, opacity: .75, depthWrite: false });
      const marker = new THREE.Mesh(new THREE.TorusGeometry(.025, .002, 5, 18), markMat); marker.position.set(0, .02, .105); marker.visible = false; anchor.add(marker);
      model.root.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(model.root);
      const center = model.root.worldToLocal(box.getCenter(V()));
      const flat = ['plate', 'foodBoard', 'bread', 'sweets', 'gameBoard', 'tray', 'fruit', 'marble'].includes(item.modelKind) || ['jump-rope', 'woven-belt', 'quilt', 'kilim', 'felt-runner', 'carpet', 'pestemal', 'paper-ticket', 'illuminated', 'miniature', 'leather-bound', 'soap-holder', 'oltu-beads', 'meerschaum-pendant', 'wooden-spoon', 'skimmer', 'sieve'].includes(item.variant);
      const inspectionQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(flat ? .60 : item.modelKind === 'bowl' ? .28 : .07, 0, 0));
      this.records.set(item.id, { item, section, slot, anchor, ...model, center, marker, markerMaterial: markMat, inspectionQuaternion, age: 0 });
    }
    this.setVenue(catalog[0]?.venueId);
  }

  setVenue(venue) {
    const id = typeof venue === 'string' ? venue : venue?.id;
    if (id === this.venueId) return;
    this.restoreFocusedImmediately();
    this.venueId = id; this.section = 0;
    for (const [key, group] of this.venueGroups) group.visible = key === id;
    if (this.enabled) this.setSection(0);
    this.updateMarkers();
  }

  setExplorationMode(enabled) {
    if (this.disposed || Boolean(enabled) === this.enabled) return;
    if (enabled) {
      const preserveGameCamera = this.returning && this.savedCamera;
      this.enabled = true; this.returning = false;
      const camera = this.world.camera;
      if (!preserveGameCamera) this.savedCamera = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: camera.fov, aspect: camera.aspect, handVisible: this.world.touristHand?.visible };
      else this.refreshSavedViewport();
      if (!preserveGameCamera) this.savedLanterns = (this.world.lanterns || []).map(({ group }) => ({ group, visible: group.visible }));
      this.cameraPosition.copy(camera.position); this.cameraQuaternion.copy(camera.quaternion); this.cameraFov = camera.fov;
      if (this.world.touristHand) this.world.touristHand.visible = false;
      this.light.visible = true; this.setSection(this.section);
    } else {
      this.enabled = false; this.returning = true; this.cameraTransition = 0;
      this.clearFocus();
      this.refreshSavedViewport();
      this.cameraTargetPosition.copy(this.savedCamera?.position || this.world.baseCamPos || this.world.camera.position);
      this.cameraTargetQuaternion.copy(this.savedCamera?.quaternion || this.world.camera.quaternion);
    }
    this.updateMarkers();
    this.updateLanternVisibility();
  }

  setSection(index = 0) {
    this.clearFocus();
    this.section = Math.max(0, Math.min(2, Math.floor(index)));
    const x = this.section === 0 ? -.79 : this.section === 1 ? .79 : 0;
    this.cameraTargetPosition.set(x, this.section === 2 ? 3.13 : 1.76, this.section === 2 ? -.55 : -.34);
    const target = V(x, this.section === 2 ? 2.88 : 1.69, this.section === 2 ? -1.95 : -1.66);
    const look = new THREE.Matrix4().lookAt(this.cameraTargetPosition, target, V(0, 1, 0));
    this.cameraTargetQuaternion.setFromRotationMatrix(look); this.cameraTransition = 0;
    this.updateMarkers();
    this.updateLanternVisibility();
    return SECTION_NAMES[this.section];
  }

  setDiscovered(ids = []) {
    this.discovered = new Set(ids.filter((id) => this.records.has(id)));
    this.updateMarkers();
  }

  updateMarkers() {
    for (const record of this.records.values()) {
      record.marker.visible = this.physicalMarkers && this.enabled && !this.focus && record.item.venueId === this.venueId && record.section === this.section;
      record.markerMaterial.color.setHex(this.discovered.has(record.item.id) ? 0x8fac8d : 0xd6ad68);
      record.root.userData.discovered = this.discovered.has(record.item.id);
    }
  }

  getDiscoveryTargets() {
    if (!this.enabled || this.focus || this.disposed) return [];
    const { width, height } = this.viewport();
    const targets = [];
    for (const record of this.records.values()) {
      if (record.item.venueId !== this.venueId || record.section !== this.section) continue;
      record.root.updateWorldMatrix(true, false);
      const point = this.scratch.copy(record.center).applyMatrix4(record.root.matrixWorld).project(this.world.camera);
      targets.push({ id: record.item.id, x: (point.x * .5 + .5) * width, y: (1 - point.y) * .5 * height, radius: 24, visible: point.z > -1 && point.z < 1 && Math.abs(point.x) < 1.1 && Math.abs(point.y) < 1.1, discovered: this.discovered.has(record.item.id) });
    }
    return targets;
  }

  /** Visible shelf items can be approached from the ordinary counter too.
   * Test only the nearest candidate, and reject objects behind the vendor or
   * canopy. The full scene is never raycast on every animation frame. */
  pickFromCounter(normX,normY) {
    if(this.enabled||this.disposed)return null;
    const {width,height}=this.viewport(),x=normX*width,y=normY*height;
    let best=null,distance=Infinity;
    for(const record of this.records.values()){
      if(record.item.venueId!==this.venueId)continue;
      record.root.updateWorldMatrix(true,false);
      const p=this.scratch.copy(record.center).applyMatrix4(record.root.matrixWorld).project(this.world.camera);
      if(p.z< -1||p.z>1||Math.abs(p.x)>1||Math.abs(p.y)>1)continue;
      const sx=(p.x+1)*width*.5,sy=(1-p.y)*height*.5,d=Math.hypot(x-sx,y-sy);
      if(d<22&&d<distance){best={record,x:sx,y:sy,radius:22};distance=d;}
    }
    if(!best)return null;
    const center=this.scratch.copy(best.record.center).applyMatrix4(best.record.root.matrixWorld);
    const direction=this.scratch2.copy(center).sub(this.world.camera.position),limit=direction.length();
    this.raycaster.set(this.world.camera.position,direction.normalize());
    const occluders=[this.world.vendorTorso,this.world.cartGroup].filter(Boolean);
    const hit=this.raycaster.intersectObjects(occluders,true).find(hit=>hit.object.visible&&hit.distance<limit-.04);
    if(hit)return null;
    return{id:best.record.item.id,kind:'detail',x:best.x,y:best.y,radius:best.radius,item:best.record.item};
  }

  pick(normX, normY) {
    if (!this.enabled || this.disposed) return null;
    this.world.scene.updateMatrixWorld(true); this.world.camera.updateMatrixWorld(true);
    this.ndc.set(normX * 2 - 1, 1 - normY * 2); this.raycaster.setFromCamera(this.ndc, this.world.camera);
    const selected = this.focus ? [this.focus.record] : [...this.records.values()].filter((r) => r.item.venueId === this.venueId && r.section === this.section);
    const hits = this.raycaster.intersectObjects(selected.map((r) => r.root), true);
    for (const hit of hits) { let node = hit.object; while (node) { if (node.userData.culturalId) return this.records.get(node.userData.culturalId)?.item || null; node = node.parent; } }
    if (!this.focus) {
      const { width, height } = this.viewport(); let best = null, distance = Infinity;
      for (const target of this.getDiscoveryTargets()) { const d = Math.hypot(target.x - normX * width, target.y - normY * height); if (target.visible && d <= target.radius && d < distance) { best = this.records.get(target.id).item; distance = d; } }
      return best;
    }
    return null;
  }

  focusDiscovery(id) {
    const record = this.records.get(id);
    if (!this.enabled || !record || record.item.venueId !== this.venueId) return null;
    if (this.focus?.record === record && !this.focus.returning) { record.age = 0; return record.item; }
    this.restoreFocusedImmediately();
    this.positionFocusRoot();
    this.world.scene.updateMatrixWorld(true);
    const original = { parent: record.root.parent, position: record.root.position.clone(), quaternion: record.root.quaternion.clone(), scale: record.root.scale.clone() };
    this.focusRoot.attach(record.root);
    this.focus = { record, original, age: 0, returning: false, fromPosition: record.root.position.clone(), fromQuaternion: record.root.quaternion.clone(), fromScale: record.root.scale.clone(), rotation: new THREE.Quaternion(), velocity: new THREE.Vector2(), dragging: false, pointerId: null, manuallyRotated: false };
    record.age = 0;
    this.updateMarkers();
    return record.item;
  }

  beginRotation(pointerId = 0) {
    const focus = this.focus;
    if (!this.enabled || !focus || focus.returning || (focus.dragging && focus.pointerId !== pointerId)) return false;
    focus.dragging = true; focus.pointerId = pointerId; focus.velocity.set(0,0);
    return true;
  }

  rotateBy(deltaX, deltaY, dt = 1/60, pointerId = 0) {
    const focus = this.focus;
    if (!focus || focus.returning || !focus.dragging || focus.pointerId !== pointerId || !Number.isFinite(deltaX+deltaY)) return false;
    const viewport = this.viewport(), gain = Math.PI * 2 / Math.max(240,Math.min(viewport.width,viewport.height));
    const pitch = deltaY * gain, yaw = deltaX * gain;
    this.rotationEuler.set(pitch,yaw,0,'YXZ'); this.rotationStep.setFromEuler(this.rotationEuler);
    focus.rotation.premultiply(this.rotationStep).normalize(); focus.manuallyRotated = true;
    const seconds = Math.max(.008,Math.min(.1,dt));
    focus.velocity.set(THREE.MathUtils.clamp(pitch/seconds,-6,6),THREE.MathUtils.clamp(yaw/seconds,-6,6));
    return true;
  }

  endRotation(pointerId = null, canceled = false) {
    const focus = this.focus;
    if (!focus || (pointerId !== null && focus.pointerId !== pointerId)) return;
    focus.dragging = false; focus.pointerId = null;
    if (canceled) focus.velocity.set(0,0);
  }

  clearFocus() {
    if (!this.focus || this.focus.returning) return;
    this.endRotation(null,true);
    this.focus.returning = true; this.focus.age = 0;
    this.focus.fromPosition.copy(this.focus.record.root.position); this.focus.fromQuaternion.copy(this.focus.record.root.quaternion); this.focus.fromScale.copy(this.focus.record.root.scale);
  }

  restoreFocusedImmediately() {
    if (!this.focus) return;
    const { record, original } = this.focus;
    original.parent.add(record.root); record.root.position.copy(original.position); record.root.quaternion.copy(original.quaternion); record.root.scale.copy(original.scale);
    this.resetObjectAnimation(record); this.focus = null; this.updateMarkers();
  }

  positionFocusRoot() {
    const camera = this.world.camera; camera.updateMatrixWorld(true);
    this.focusRoot.position.set(0, camera.aspect < .9 ? -.01 : -.045, camera.aspect < .9 ? -.65 : -.86).applyMatrix4(camera.matrixWorld);
    this.focusRoot.quaternion.copy(camera.quaternion); this.focusRoot.updateMatrixWorld(true);
    this.light.position.set(-.20, .20, -.25).applyMatrix4(camera.matrixWorld);
  }

  resetObjectAnimation(record) {
    record.art.position.copy(record.restArtPosition); record.art.scale.copy(record.restArtScale); record.art.rotation.copy(record.restArtRotation);
    if (record.motion.pendulum) record.motion.pendulum.rotation.z = 0;
    if (record.motion.clock) record.motion.clock.rotation.z = 0;
    if (record.motion.puppet) { record.motion.puppet.rotation.z = 0; record.motion.puppet.position.x = 0; }
    if (record.motion.marbles) record.motion.marbles.children.forEach((mesh) => mesh.position.copy(mesh.userData.rest));
    if (record.motion.glow) record.motion.glow.material.emissiveIntensity = .12;
    if (record.motion.screen) record.motion.screen.material.emissiveIntensity = .12;
    for (const key of ['wheel', 'wheelY', 'lid', 'key', 'car', 'acrobat', 'spindle']) if (record.motion[key]) {
      record.motion[key].rotation.set(0, 0, 0);
      if (record.motion[key].userData.restPosition) record.motion[key].position.copy(record.motion[key].userData.restPosition);
    }
  }

  animateObject(record, dt) {
    record.age += dt; const time = record.age;
    const motion = record.motion;
    if (!this.focus?.manuallyRotated && motion.spin) { record.art.rotation.y = record.restArtRotation.y + time * 5; record.art.rotation.z = record.restArtRotation.z + Math.sin(time * 7) * .035; }
    else if (!this.focus?.manuallyRotated && motion.rock) record.art.rotation.z = record.restArtRotation.z + Math.sin(time * 3) * .07;
    else if (!this.focus?.manuallyRotated && motion.pulse) record.art.scale.copy(record.restArtScale).multiplyScalar(1 + Math.sin(time * 10) * .012);
    else if (!this.focus?.manuallyRotated) record.art.rotation.y = record.restArtRotation.y + Math.sin(time * .8) * .10;
    if (motion.steam) { motion.steam.position.y = .13 + Math.sin(time * 2) * .012; motion.steam.children.forEach((mesh, i) => { mesh.material.opacity = .10 + (Math.sin(time * 2.6 + i) + 1) * .07; }); }
    if (motion.clock) motion.clock.rotation.z = -time * .45;
    if (motion.pendulum) motion.pendulum.rotation.z = Math.sin(time * 4.2) * .24;
    if (motion.puppet) { motion.puppet.rotation.z = Math.sin(time * 3.2) * .09; motion.puppet.position.x = Math.sin(time * 1.7) * .01; }
    if (motion.marbles) motion.marbles.children.forEach((mesh, i) => { mesh.position.copy(mesh.userData.rest); mesh.position.x += Math.sin(time * 3 + i) * .008; mesh.position.z += Math.sin(time * 2.4 + i * 1.7) * .006; });
    if (motion.glow) motion.glow.material.emissiveIntensity = .30 + Math.sin(time * 3) * .10;
    if (motion.screen) motion.screen.material.emissiveIntensity = .20 + Math.sin(time * 2) * .06;
    if (motion.spindle) { motion.spindle.rotation.y = time * 7; motion.spindle.rotation.z = Math.sin(time * 6) * .025; }
    if (motion.wheel) motion.wheel.rotation.z = -time * (record.item.variant === 'pinwheel' ? 3 : .65);
    if (motion.wheelY) motion.wheelY.rotation.y = time * 2.2;
    if (motion.lid) motion.lid.rotation.x = -.50 * (1 - Math.cos(time * 1.5)) * .5;
    if (motion.key) motion.key.rotation.z = Math.max(0, Math.sin(time * 5)) * .12;
    if (motion.car) motion.car.position.x = motion.car.userData.restPosition.x + Math.sin(time * 1.8) * .025;
    if (motion.acrobat) motion.acrobat.rotation.x = Math.sin(time * 1.5) * .9;
  }

  update(dt) {
    if (this.disposed || (!this.enabled && !this.returning && !this.focus)) return;
    dt = Math.max(0, Math.min(.1, dt));
    const camera = this.world.camera;
    if (this.returning) this.refreshSavedViewport();
    if (this.enabled || this.returning) {
      this.cameraTransition += dt;
      const blend = 1 - Math.exp(-dt * 9);
      this.cameraPosition.lerp(this.cameraTargetPosition, blend); this.cameraQuaternion.slerp(this.cameraTargetQuaternion, blend);
      const targetFov = this.returning ? this.savedCamera.fov : camera.aspect < .9 ? 65 : 46;
      this.cameraFov += (targetFov - this.cameraFov) * blend;
      camera.position.copy(this.cameraPosition); camera.quaternion.copy(this.cameraQuaternion); camera.fov = this.cameraFov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    }
    this.positionFocusRoot();
    if (this.focus) {
      const focus = this.focus, object = focus.record.root;
      focus.age += dt; const t = ease(focus.age / .52);
      if (!focus.returning) {
        if (!focus.dragging && focus.velocity.lengthSq() > .00001) {
          const speed = focus.velocity.length(), decay = Math.exp(-dt*8);
          this.rotationAxis.set(focus.velocity.x,focus.velocity.y,0).normalize();
          this.rotationStep.setFromAxisAngle(this.rotationAxis,speed*(1-decay)/8);
          focus.rotation.premultiply(this.rotationStep).normalize();
          focus.velocity.multiplyScalar(decay);
        }
        this.inspectionTargetQuaternion.copy(focus.rotation).multiply(focus.record.inspectionQuaternion);
        // Turn around the object's center, so plates and instruments do not orbit into the card.
        this.inspectionCenter.copy(focus.record.center).multiplyScalar(1.25).applyQuaternion(focus.record.inspectionQuaternion).add(V(0,.02,0));
        this.inspectionTargetPosition.copy(focus.record.center).multiplyScalar(1.25).applyQuaternion(this.inspectionTargetQuaternion).negate().add(this.inspectionCenter);
        object.position.lerpVectors(focus.fromPosition, this.inspectionTargetPosition, t);
        object.quaternion.copy(focus.fromQuaternion).slerp(this.inspectionTargetQuaternion, t);
        object.scale.copy(focus.fromScale).lerp(V(1.25, 1.25, 1.25), t);
        this.animateObject(focus.record, dt);
      } else {
        focus.original.parent.updateWorldMatrix(true, false);
        const destination = focus.original.position.clone().applyMatrix4(focus.original.parent.matrixWorld);
        this.focusRoot.worldToLocal(destination);
        const targetQuaternion = focus.original.parent.getWorldQuaternion(new THREE.Quaternion()).multiply(focus.original.quaternion);
        targetQuaternion.premultiply(this.focusRoot.quaternion.clone().invert());
        object.position.lerpVectors(focus.fromPosition, destination, t); object.quaternion.copy(focus.fromQuaternion).slerp(targetQuaternion, t); object.scale.copy(focus.fromScale).lerp(focus.original.scale, t);
        if (t >= 1) this.restoreFocusedImmediately();
      }
    }
    if (this.returning && this.cameraTransition > .65 && !this.focus) {
      camera.position.copy(this.savedCamera.position); camera.quaternion.copy(this.savedCamera.quaternion); camera.fov = this.savedCamera.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
      if (this.world.touristHand) this.world.touristHand.visible = this.savedCamera.handVisible;
      this.returning = false; this.light.visible = false;
      this.updateLanternVisibility();
    }
  }

  reset() {
    this.restoreFocusedImmediately(); this.enabled = false; this.returning = false; this.light.visible = false;
    this.refreshSavedViewport();
    if (this.savedCamera) {
      const camera = this.world.camera; camera.position.copy(this.savedCamera.position); camera.quaternion.copy(this.savedCamera.quaternion); camera.fov = this.savedCamera.fov; camera.updateProjectionMatrix();
      if (this.world.touristHand) this.world.touristHand.visible = this.savedCamera.handVisible;
    }
    this.updateMarkers();
    this.updateLanternVisibility();
  }

  updateLanternVisibility() {
    if (!this.savedLanterns) return;
    const hide = (this.enabled || this.returning) && this.section === 2;
    this.savedLanterns.forEach(({ group, visible }) => { group.visible = hide ? false : visible; });
  }

  refreshSavedViewport() {
    const camera = this.world.camera;
    if (!this.savedCamera || camera.aspect === this.savedCamera.aspect) return;
    this.savedCamera.aspect = camera.aspect;
    this.savedCamera.fov = camera.aspect < .75 ? THREE.MathUtils.clamp(62 + (.65 - camera.aspect) * 28, 64, 72) : 54;
    this.savedCamera.position.copy(this.world.baseCamPos || V(0, camera.aspect < .75 ? 1.5 : 1.52, camera.aspect < .75 ? 1.12 : 1.05));
    if (this.returning) this.cameraTargetPosition.copy(this.savedCamera.position);
  }

  getStats() {
    const active = [...this.records.values()].filter((r) => r.item.venueId === this.venueId);
    let meshes = 0, triangles = 0;
    for (const record of active) record.anchor.traverse((node) => { if (node.isMesh) { meshes++; triangles += node.geometry.index ? node.geometry.index.count / 3 : node.geometry.attributes.position.count / 3; } });
    this.furniture.traverse((node) => { if (node.isMesh) { meshes++; triangles += node.geometry.index ? node.geometry.index.count / 3 : node.geometry.attributes.position.count / 3; } });
    if (this.focus) this.focus.record.root.traverse((node) => { if (node.isMesh) { meshes++; triangles += node.geometry.index ? node.geometry.index.count / 3 : node.geometry.attributes.position.count / 3; } });
    return { catalogCount: this.records.size, activeCount: active.length, activeMeshes: meshes, activeTriangles: triangles };
  }

  dispose() {
    if (this.disposed) return;
    this.reset();
    const geometries = new Set(), materials = new Set(), textures = new Set();
    this.root.traverse((node) => { if (node.isMesh) { geometries.add(node.geometry); for (const material of Array.isArray(node.material) ? node.material : [node.material]) { materials.add(material); for(const key of ['map','bumpMap','roughnessMap','normalMap'])if(material[key])textures.add(material[key]); } } });
    Object.values(this.materials).forEach((material) => {materials.add(material);for(const key of ['map','bumpMap','roughnessMap','normalMap'])if(material[key])textures.add(material[key]);});
    geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); textures.forEach((t) => t.dispose());
    this.root.removeFromParent(); this.focusRoot.removeFromParent(); this.light.removeFromParent(); this.records.clear(); this.venueGroups.clear(); this.savedLanterns = null; this.disposed = true;
  }
}
