import { DataTexture, RGBAFormat, RepeatWrapping, LinearFilter, MeshStandardMaterial, MeshPhysicalMaterial, SRGBColorSpace, DoubleSide } from 'three';

/** Shared, deterministic close-up surfaces: no network assets or per-frame textures. */
function surface(kind, size = 64) {
  const pixels = new Uint8Array(size * size * 4);
  let seed = kind === 'wood' ? 9173 : kind === 'metal' ? 6179 : 1723;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const grain = kind === 'wood'
      ? .72 + .17 * Math.sin(y * .64 + Math.sin(x * .07) * 2.2) + .08 * Math.sin(y * 2.1 + x * .025)
      : kind === 'metal'
        ? .72 + .13 * Math.sin(x * .74) * Math.sin(y * .81) + random() * .14
        : .80 + random() * .18;
    const value = Math.max(0, Math.min(255, Math.round(grain * 255))), i = (y * size + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = value; pixels[i + 3] = 255;
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat);
  texture.name = `cultural-${kind}-surface`; texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.minFilter = texture.magFilter = LinearFilter; texture.needsUpdate = true;
  return texture;
}
export function createCulturalPalette() {
  const woodGrain = surface('wood'), woodColor = woodGrain.clone(); woodColor.colorSpace = SRGBColorSpace; woodColor.needsUpdate = true;
  const hammering = surface('metal'), fine = surface('fine');
  const standard = (color, roughness = .65, metalness = 0, extra = {}) => new MeshStandardMaterial({ color, roughness, metalness, ...extra });
  return {
    wood: standard(0xb58551, .58, 0, { map:woodColor, bumpMap:woodGrain, bumpScale:.0012 }),
    darkWood: standard(0x72503a, .63, 0, { map:woodColor, bumpMap:woodGrain, bumpScale:.0010 }),
    cream: standard(0xe7d8b8, .72, 0, { bumpMap:fine, bumpScale:.00045 }),
    white: standard(0xf7efda, .54),
    porcelain: new MeshPhysicalMaterial({ color:0xf7efda, roughness:.27, clearcoat:.55, clearcoatRoughness:.20, bumpMap:fine, bumpScale:.00025 }),
    brass: standard(0xc09a52, .42, .78, { roughnessMap:hammering, bumpMap:hammering, bumpScale:.0010 }),
    copper: standard(0xb97043, .43, .80, { roughnessMap:hammering, bumpMap:hammering, bumpScale:.0014 }),
    dark: standard(0x282b27), red: standard(0xa84335, .52), blue: standard(0x397986, .44),
    green: standard(0x577b43), yellow: standard(0xd2a34d), brown: standard(0x804d2f),
    tea: new MeshPhysicalMaterial({ color:0x8a3815, roughness:.18, clearcoat:.65, clearcoatRoughness:.15 }),
    glass: new MeshPhysicalMaterial({ color:0xe0eee6, roughness:.12, metalness:0, transparent:true, opacity:.34, depthWrite:false, clearcoat:1, clearcoatRoughness:.12, side:DoubleSide }),
  };
}
