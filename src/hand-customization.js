import * as THREE from 'three';

/**
 * First-Person Customer Hand & Accessory Customization (`HandCustomization`).
 * Provides 6 inclusive skin tones + sleeve colors + wrist bracelets/watch + nail polish
 * with zero texture downloads (100% procedural PBR material tinting).
 */

export const SKIN_TONES = Object.freeze([
  { id: 0, hex: 0xf7d7c4, css: '#f7d7c4', label: 'I' },
  { id: 1, hex: 0xf2c29b, css: '#f2c29b', label: 'II' },
  { id: 2, hex: 0xe0a378, css: '#e0a378', label: 'III' },
  { id: 3, hex: 0xc68652, css: '#c68652', label: 'IV' },
  { id: 4, hex: 0x8d5524, css: '#8d5524', label: 'V' },
  { id: 5, hex: 0x523018, css: '#523018', label: 'VI' },
]);

export const SLEEVE_STYLES = Object.freeze([
  { id: 0, main: 0x1d3557, cuff: 0x2b4c7e, cap: 0x122238, css: '#1d3557', icon: '🧥' },
  { id: 1, main: 0x8c141b, cuff: 0xb91c1c, cap: 0x590d14, css: '#8c141b', icon: '🧣' },
  { id: 2, main: 0x0f4c3a, cuff: 0x15803d, cap: 0x082f23, css: '#0f4c3a', icon: '🌿' },
  { id: 3, main: 0xf3e8d2, cuff: 0xd6c3a5, cap: 0xc8b496, css: '#f3e8d2', icon: '👕' },
  { id: 4, main: 0x5b21b6, cuff: 0xd97706, cap: 0x3b0764, css: '#5b21b6', icon: '👑' },
  { id: 5, main: 0x1f2937, cuff: 0x4b5563, cap: 0x111827, css: '#1f2937', icon: '🖤' },
]);

export const BRACELET_STYLES = Object.freeze([
  { id: 'turquoise', hex: 0x00b4d8, metalness: 0.2, roughness: 0.35, icon: '🩵', names: { tr: 'Turkuaz', en: 'Turquoise' } },
  { id: 'evil_eye', hex: 0x1d4ed8, metalness: 0.25, roughness: 0.25, icon: '🧿', names: { tr: 'Nazarlık', en: 'Evil Eye' } },
  { id: 'gold', hex: 0xfbbf24, metalness: 0.9, roughness: 0.18, icon: '✨', names: { tr: 'Altın Bilezik', en: 'Gold Bangle' } },
  { id: 'watch', hex: 0x334155, metalness: 0.75, roughness: 0.28, icon: '⌚', names: { tr: 'Klasik Saat', en: 'Wristwatch' } },
  { id: 'crimson_cord', hex: 0xdc2626, metalness: 0.08, roughness: 0.7, icon: '🧶', names: { tr: 'Kırmızı İp', en: 'Red Cord' } },
  { id: 'none', hex: 0x000000, metalness: 0, roughness: 0.5, icon: '🚫', names: { tr: 'Yok', en: 'None' } },
]);

export const NAIL_STYLES = Object.freeze([
  { id: 'natural', hex: null, css: '#f7d6c4', icon: '🤍' },
  { id: 'crimson', hex: 0xbe123c, css: '#be123c', icon: '❤️' },
  { id: 'gold', hex: 0xf59e0b, css: '#f59e0b', icon: '💛' },
  { id: 'pistachio', hex: 0x65a30d, css: '#65a30d', icon: '💚' },
  { id: 'midnight', hex: 0x1e1b4b, css: '#1e1b4b', icon: '💙' },
  { id: 'pearl', hex: 0xfffbeb, css: '#fffbeb', icon: '🐚' },
]);

function ensureBraceletCharms(braceletMesh) {
  if (!braceletMesh || braceletMesh.userData.charmsBuilt) return;
  braceletMesh.userData.charmsBuilt = true;

  // Miniature wristwatch dial
  const watchDial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.006, 16),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, metalness: 0.65, roughness: 0.2 })
  );
  watchDial.name = 'player-watch-dial';
  watchDial.position.set(0, 0.031, 0);
  watchDial.visible = false;
  braceletMesh.add(watchDial);

  // Miniature Nazar Boncuğu bead
  const nazarBead = new THREE.Mesh(
    new THREE.SphereGeometry(0.0095, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.18, metalness: 0.1 })
  );
  nazarBead.name = 'player-nazar-bead';
  nazarBead.position.set(0, 0.032, 0);
  nazarBead.visible = false;
  braceletMesh.add(nazarBead);
}

export function normalizeHandStyle(raw = {}) {
  const skinIdx = Number.isInteger(raw?.skin) ? Math.max(0, Math.min(SKIN_TONES.length - 1, raw.skin)) : 1;
  const sleeveIdx = Number.isInteger(raw?.sleeve) ? Math.max(0, Math.min(SLEEVE_STYLES.length - 1, raw.sleeve)) : 0;
  const braceletId = BRACELET_STYLES.some((b) => b.id === raw?.bracelet) ? raw.bracelet : 'turquoise';
  const nailId = NAIL_STYLES.some((n) => n.id === raw?.nails) ? raw.nails : 'natural';
  return {
    skin: skinIdx,
    sleeve: sleeveIdx,
    bracelet: braceletId,
    nails: nailId,
  };
}

export function applyHandCustomization(world, rawStyle = {}) {
  if (!world) return null;
  const style = normalizeHandStyle(rawStyle);
  const skinTone = SKIN_TONES[style.skin] || SKIN_TONES[1];
  const sleeveSpec = SLEEVE_STYLES[style.sleeve] || SLEEVE_STYLES[0];
  const braceletSpec = BRACELET_STYLES.find((b) => b.id === style.bracelet) || BRACELET_STYLES[0];
  const nailSpec = NAIL_STYLES.find((n) => n.id === style.nails) || NAIL_STYLES[0];

  // 1. Skin tone (shared material across forearm + palm + thumb + all fingers)
  const skinMat = world.touristForearm?.material || world.touristPalm?.material;
  if (skinMat?.color) {
    skinMat.color.setHex(skinTone.hex);
  }

  // 2. Fingernails
  const nailMat = world.playerHandRig?.nailMat;
  if (nailMat?.color) {
    if (nailSpec.hex === null) {
      nailMat.color.setHex(skinTone.hex).lerp(new THREE.Color(0xffe5d2), 0.48);
      nailMat.roughness = 0.68;
      nailMat.metalness = 0.04;
    } else {
      nailMat.color.setHex(nailSpec.hex);
      nailMat.roughness = 0.22;
      nailMat.metalness = nailSpec.id === 'gold' ? 0.65 : 0.12;
    }
  }

  // 3. Sleeve & cuff colors
  if (world.touristSleeve) {
    if (world.touristSleeve.material?.color) {
      world.touristSleeve.material.color.setHex(sleeveSpec.main);
    }
    const cuff = world.touristSleeve.getObjectByName?.('player-sleeve-cuff');
    if (cuff?.material?.color) cuff.material.color.setHex(sleeveSpec.cuff);
    const cap = world.touristSleeve.getObjectByName?.('player-sleeve-cap');
    if (cap?.material?.color) cap.material.color.setHex(sleeveSpec.cap);
  }

  // 4. Wrist bracelet / watch / nazar boncuğu
  if (world.touristBracelet) {
    ensureBraceletCharms(world.touristBracelet);
    if (braceletSpec.id === 'none') {
      world.touristBracelet.visible = false;
    } else {
      world.touristBracelet.visible = true;
      if (world.touristBracelet.material?.color) {
        world.touristBracelet.material.color.setHex(braceletSpec.hex);
        world.touristBracelet.material.metalness = braceletSpec.metalness;
        world.touristBracelet.material.roughness = braceletSpec.roughness;
      }
      const watchDial = world.touristBracelet.getObjectByName?.('player-watch-dial');
      const nazarBead = world.touristBracelet.getObjectByName?.('player-nazar-bead');
      if (watchDial) watchDial.visible = braceletSpec.id === 'watch';
      if (nazarBead) nazarBead.visible = braceletSpec.id === 'evil_eye';
    }
  }

  return style;
}

export function renderHandStyleModal({ container, saveManager, world, onChanged = () => {} } = {}) {
  if (!container || !saveManager) return;
  const tr = saveManager.lang === 'tr';
  const current = normalizeHandStyle(saveManager.data?.handStyle);
  container.replaceChildren();

  const addSection = (titleText, buildRow) => {
    const sec = document.createElement('div');
    sec.className = 'hand-style-section';
    const lbl = document.createElement('small');
    lbl.className = 'hand-style-label';
    lbl.textContent = titleText;
    const row = document.createElement('div');
    row.className = 'hand-swatch-row';
    buildRow(row);
    sec.append(lbl, row);
    container.appendChild(sec);
  };

  const selectPatch = (patch) => {
    const updated = saveManager.setHandStyle(patch);
    applyHandCustomization(world, updated);
    onChanged(updated);
    renderHandStyleModal({ container, saveManager, world, onChanged });
  };

  addSection(tr ? 'Ten Rengi' : 'Skin Tone', (row) => {
    SKIN_TONES.forEach((tone) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hand-swatch-btn${current.skin === tone.id ? ' active' : ''}`;
      btn.style.background = tone.css;
      btn.title = tone.label;
      btn.setAttribute('aria-label', `${tr ? 'Ten' : 'Skin'} ${tone.label}`);
      btn.addEventListener('click', () => selectPatch({ skin: tone.id }));
      row.appendChild(btn);
    });
  });

  addSection(tr ? 'Bileklik & Saat' : 'Wrist Accessory', (row) => {
    BRACELET_STYLES.forEach((br) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hand-accessory-pill${current.bracelet === br.id ? ' active' : ''}`;
      btn.textContent = `${br.icon} ${tr ? br.names.tr : br.names.en}`;
      btn.addEventListener('click', () => selectPatch({ bracelet: br.id }));
      row.appendChild(btn);
    });
  });

  addSection(tr ? 'Kol & Manşet' : 'Sleeve Style', (row) => {
    SLEEVE_STYLES.forEach((sl) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hand-swatch-btn${current.sleeve === sl.id ? ' active' : ''}`;
      btn.style.background = sl.css;
      btn.textContent = sl.icon;
      btn.addEventListener('click', () => selectPatch({ sleeve: sl.id }));
      row.appendChild(btn);
    });
  });

  addSection(tr ? 'Tırnak & Oje' : 'Nail Polish', (row) => {
    NAIL_STYLES.forEach((nl) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hand-swatch-btn${current.nails === nl.id ? ' active' : ''}`;
      btn.style.background = nl.css;
      btn.textContent = nl.icon;
      btn.addEventListener('click', () => selectPatch({ nails: nl.id }));
      row.appendChild(btn);
    });
  });
}
