import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORY, CHAPTERS, CHARACTERS,
  getChapter, getStory, getCharacters, getUnlockedChapters,
} from '../src/lore.js';
import { CAMPAIGN_LEVELS } from '../src/protocol.js';

const supported = ['tr', 'en'];

test('ten narrative chapters map to the opening encounters and their vendors', () => {
  assert.equal(CHAPTERS.length, 10);
  assert.ok(CAMPAIGN_LEVELS.length > CHAPTERS.length);
  assert.deepEqual(CHAPTERS.map((c) => c.stage), CAMPAIGN_LEVELS.slice(0, 10).map((l) => l.stage));
  assert.deepEqual(CHAPTERS.map((c) => c.vendor), CAMPAIGN_LEVELS.slice(0, 10).map((l) => l.vendorIdx));
  assert.deepEqual(CHAPTERS.map((c) => c.vendor), [0, 0, 1, 1, 1, 2, 2, 2, 3, 3]);
  assert.equal(CHARACTERS.length, 4);
});

test('every chapter is complete in Turkish and English and active copy stays short', () => {
  for (const chapter of CHAPTERS) {
    assert.ok(chapter.symbol);
    for (const lang of supported) {
      const text = getChapter(chapter.stage, lang);
      for (const key of ['title', 'entry', 'win', 'fragmentTitle', 'fragment', 'retry']) {
        assert.equal(typeof text[key], 'string', `${chapter.stage}/${lang}/${key}`);
        assert.ok(text[key].trim().length > 0);
      }
      assert.ok(text.entry.length <= 100, `entry ${chapter.stage}/${lang} is too long`);
      assert.ok(text.win.length <= 130, `win ${chapter.stage}/${lang} is too long`);
      assert.ok(text.fragment.split(/\s+/u).length <= 100, `fragment ${chapter.stage}/${lang} is too long`);
      assert.ok(text.retry.length <= 100, `retry ${chapter.stage}/${lang} is too long`);
    }
  }
  for (const lang of supported) {
    assert.equal(new Set(CHAPTERS.map((c) => c[lang].title)).size, 10);
    assert.equal(new Set(CHAPTERS.map((c) => c[lang].fragmentTitle)).size, 10);
  }
});

test('story and four characters are available in both languages with explicit secret reveal stages', () => {
  for (const lang of supported) {
    const story = getStory(lang);
    assert.equal(story.locale, lang);
    for (const key of ['title', 'teaser', 'prologue', 'ending']) assert.ok(story[key]);
    const characters = getCharacters(lang);
    assert.deepEqual(characters.map((c) => c.id), [0, 1, 2, 3]);
    assert.deepEqual(characters.map((c) => c.revealStage), [2, 5, 8, 10]);
    for (const character of characters) {
      for (const key of ['name', 'role', 'backstory', 'secret']) assert.ok(character[key]);
      assert.equal(getChapter(character.revealStage, lang).vendor, character.id);
    }
  }
});

test('chapter lookup safely clamps chapter numbers without changing campaign data', () => {
  const originalStageCount=CAMPAIGN_LEVELS.length;
  for (const value of [undefined, NaN, Infinity, -Infinity, -2, 0, null, 'invalid']) {
    assert.equal(getChapter(value).stage, 1);
  }
  assert.equal(getChapter(50).stage, 10);
  assert.equal(getChapter(3.9).stage, 3);
  assert.equal(getChapter('6').stage, 6);
  assert.equal(CAMPAIGN_LEVELS.length, originalStageCount);
});

test('unsupported interface languages receive explicit English fallback; Turkish locale tags work', () => {
  assert.equal(getChapter(2, 'tr-TR').locale, 'tr');
  assert.equal(getStory('TR_tr').title, STORY.tr.title);
  for (const lang of ['en-US', 'ar', 'ru', 'de', 'ja', 'unknown', null]) {
    assert.equal(getChapter(2, lang).entry, CHAPTERS[1].en.entry);
    assert.equal(getStory(lang).locale, 'en');
    assert.equal(getCharacters(lang)[0].name, CHARACTERS[0].en.name);
  }
});

test('archive reveals only exact completed stage IDs, never intermediate or future chapters', () => {
  const unlocked = getUnlockedChapters([3, 1, 3], 'tr');
  assert.deepEqual(unlocked.map((c) => c.stage), [1, 3]);
  assert.ok(!unlocked.some((c) => c.stage === 2));
  assert.ok(!unlocked.some((c) => c.stage > 3));
  assert.deepEqual(getUnlockedChapters(new Set([8, 2]), 'en').map((c) => c.stage), [2, 8]);
  assert.deepEqual(getUnlockedChapters([10]).map((c) => c.stage), [10]);
});

test('invalid or merely unlocked progress cannot expose story fragments', () => {
  for (const input of [undefined, null, 10, '1,2,3', { unlockedStage: 10 }, { 1: true }]) {
    assert.deepEqual(getUnlockedChapters(input), []);
  }
  assert.deepEqual(getUnlockedChapters([0, 11, -1, 1.5, NaN, true, '2']), []);
  assert.deepEqual(getUnlockedChapters([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((c) => c.stage), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('localized helper results are independent copies; UI changes cannot overwrite narrative canon', () => {
  const chapter = getChapter(1); chapter.entry = 'changed';
  const story = getStory(); story.title = 'changed';
  const characters = getCharacters(); characters[0].secret = 'changed';
  assert.equal(getChapter(1).entry, CHAPTERS[0].tr.entry);
  assert.equal(getStory().title, STORY.tr.title);
  assert.equal(getCharacters()[0].secret, CHARACTERS[0].tr.secret);
});
