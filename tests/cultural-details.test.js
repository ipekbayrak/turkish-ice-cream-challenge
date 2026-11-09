import test from 'node:test';
import assert from 'node:assert/strict';
import { CULTURAL_DETAILS, CULTURAL_SOURCES, detailsForVenue, getCulturalDetail } from '../src/cultural-details.js';
import { VENUES } from '../src/venues.js';

const CATEGORIES = ['kitchen', 'craft', 'childhood', 'music', 'hospitality', 'street'];
const MODEL_KINDS = new Set(['bread','foodBoard','bowl','plate','utensil','textile','ceramicTile','book','toyTop','marble','woodToy','instrument','cezve','teaGlass','music','sweets','jar','tray','shadowPuppet','cup','lantern','metalwork','gameBoard','boat','fruit','spice']);
const words = text => text.trim().split(/\s+/u).length;

test('108 distinct discoverable objects cover six venues with eighteen each', () => {
  assert.equal(CULTURAL_DETAILS.length, 108);
  assert.equal(new Set(CULTURAL_DETAILS.map(item => item.id)).size, 108);
  assert.equal(new Set(CULTURAL_DETAILS.map(item => item.name.tr)).size, 108);
  assert.equal(new Set(CULTURAL_DETAILS.map(item => item.name.en)).size, 108);
  assert.equal(new Set(CULTURAL_DETAILS.map(item => `${item.modelKind}:${item.variant}`)).size, 108, 'no same-shape recolor entries');
  for (const venue of VENUES) {
    const details = detailsForVenue(venue.id);
    assert.equal(details.length, 18, venue.id);
    assert.deepEqual([...new Set(details.map(item => item.category))].sort(), [...CATEGORIES].sort());
    assert.deepEqual(details.map(item => `${item.section}:${item.slot}`), Array.from({ length: 18 }, (_, i) => `${Math.floor(i / 6)}:${i % 6}`));
    assert.ok(details.every(item => item.unlockStage === venue.firstStage), 'all objects are inspectable on venue arrival');
  }
});

test('facts and clearly separate fictional memories remain short in both languages', () => {
  for (const item of CULTURAL_DETAILS) {
    assert.match(item.id, /^[a-z][a-z0-9-]+$/);
    assert.ok(MODEL_KINDS.has(item.modelKind), item.id);
    assert.ok(item.variant.length > 1, item.id);
    for (const language of ['tr', 'en']) {
      assert.ok(item.name[language].length >= 2 && item.name[language].length <= 70, item.id);
      assert.ok(item.detail[language].length >= 25 && item.detail[language].length <= 200, item.id);
      assert.ok(item.narrative[language].length >= 25 && item.narrative[language].length <= 200, item.id);
      assert.notEqual(item.detail[language], item.narrative[language], item.id);
      assert.doesNotMatch(item.detail[language], /Nora|Kadir|Haydar|Cezmi|Pala/, 'game fiction must not leak into the cultural fact');
    }
  }
});

test('every fact has an existing primary reference and per-page bilingual summaries stay small', () => {
  const sourceWords = new Map(), usedSources = new Set();
  for (const item of CULTURAL_DETAILS) {
    assert.ok(item.sourceIds.length > 0, item.id);
    for (const id of item.sourceIds) {
      const source = CULTURAL_SOURCES[id];
      assert.ok(source, `${item.id}: ${id}`);
      const url = new URL(source.url);
      assert.equal(url.protocol, 'https:');
      assert.ok(/(^|\.)(unesco\.org|goturkiye\.com|kulturportali\.gov\.tr|ktb\.gov\.tr|meb\.gov\.tr|eba\.gov\.tr|istanbuloyuncakmuzesi\.com|rmk-museum\.org\.tr|iett\.istanbul)$/.test(url.hostname), url.hostname);
      assert.equal(source.id, id);
      assert.ok(source.title && source.scope);
      usedSources.add(id);
      sourceWords.set(source.url, (sourceWords.get(source.url) || 0) + words(item.detail.tr) + words(item.detail.en));
    }
  }
  assert.equal(usedSources.size, Object.keys(CULTURAL_SOURCES).length, 'no unreviewed decorative references');
  for (const [url, count] of sourceWords) assert.ok(count <= 180, `${url}: ${count} words`);
});

test('regional examples and foreign-origin museum objects do not become universal origin claims', () => {
  const regional = { corummusic: /Çorum/, bursamusic: /Bursa/, urfamusic: /Şanlıurfa/, hamam: /Trabzon/, walnut: /Van/, copper: /Afyon/, antalyacrafts: /Antalya/ };
  for (const item of CULTURAL_DETAILS) {
    for (const [sourceId, region] of Object.entries(regional)) if (item.sourceIds.includes(sourceId)) assert.match(item.detail.tr, region, item.id);
    if (item.sourceIds.includes('communication')) {
      assert.match(item.detail.tr, /Müze/);
      assert.doesNotMatch(item.detail.tr, /Türk icadı|Türkiye’de icat/);
    }
  }
  assert.match(getCulturalDetail('kunefe').detail.tr, /Antakya/);
});

test('lookup is exact and immutable; UI filters cannot alter the cultural catalog', () => {
  assert.equal(getCulturalDetail('missing'), null);
  assert.deepEqual(detailsForVenue('missing'), []);
  const entry = getCulturalDetail('coffee-cezve');
  assert.ok(Object.isFrozen(entry)); assert.ok(Object.isFrozen(entry.detail)); assert.ok(Object.isFrozen(entry.narrative));
  assert.ok(Object.isFrozen(entry.sourceIds)); assert.ok(Object.isFrozen(CULTURAL_DETAILS)); assert.ok(Object.isFrozen(CULTURAL_SOURCES));
  const list = detailsForVenue('istiklal'); list.pop();
  assert.equal(detailsForVenue('istiklal').length, 18);
});
