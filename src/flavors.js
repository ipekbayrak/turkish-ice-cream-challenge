// Four counter choices; this is a compact menu, not a claim of four traditional varieties.
// Sources: https://kahramanmaras.bel.tr/maras-dondurmasi
// https://www.edo.com.tr/urunler/maras-dondurmasi
export const ICE_CREAM_FLAVORS = [
  {
    id: 'vanilla',
    index: 0,
    colorHex: 0xfff8e7,
    cssColor: '#fff8e7',
    borderColor: '#f5b942',
    emoji: '🍦',
    xOffset: -0.36,
    names: {
      tr: 'Sade Keçi Sütlü',
      en: 'Plain Goat Milk',
      ar: 'حليب الماعز',
      ru: 'Козье молоко',
      de: 'Ziegenmilch',
      ja: 'ヤギミルク',
    },
  },
  {
    id: 'pistachio',
    index: 1,
    colorHex: 0x76c84d,
    cssColor: '#76c84d',
    borderColor: '#4ade80',
    emoji: '💚',
    xOffset: -0.12,
    names: {
      tr: 'Antep Fıstıklı',
      en: 'Antep Pistachio',
      ar: 'فستق عنتاب',
      ru: 'Фисташковое',
      de: 'Pistazie',
      ja: 'ピスタチオ',
    },
  },
  {
    id: 'chocolate',
    index: 2,
    colorHex: 0x5c2c16,
    cssColor: '#7f4224',
    borderColor: '#d97706',
    emoji: '🍫',
    xOffset: 0.12,
    names: {
      tr: 'Kakaolu',
      en: 'Dark Chocolate',
      ar: 'شوكولاتة مرعش',
      ru: 'Шоколадное',
      de: 'Schokolade',
      ja: 'チョコレート',
    },
  },
  {
    id: 'berry',
    index: 3,
    colorHex: 0xd92662,
    cssColor: '#e63973',
    borderColor: '#fb7185',
    emoji: '🫐',
    xOffset: 0.36,
    names: {
      tr: 'Urmu Dutlu',
      en: 'Black Mulberry',
      ar: 'توت أسود',
      ru: 'Шелковица',
      de: 'Maulbeere',
      ja: 'マルベリー',
    },
  },
];

// Removed honey/mastic save indices become plain milk; progress and scoop count survive.
export function normalizeFlavorIndex(value){
 const index=Math.floor(Number(value));
 return Number.isFinite(index)&&index>=0&&index<ICE_CREAM_FLAVORS.length?index:0;
}
