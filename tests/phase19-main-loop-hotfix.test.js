import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { QualityGovernor } from '../src/quality-tier.js';
import { GameAnalytics } from '../src/game-analytics.js';
import { SoundEngine } from '../src/audio.js';
import { HighlightRingBuffer } from '../src/highlight-recorder.js';
import { ElasticSnatchBack, ScreenSmudge } from '../src/screen-smudge.js';
import { ConeBiteFinale } from '../src/cone-bite-finale.js';
import { CounterTroll } from '../src/counter-troll.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('QualityGovernor supports spec getter, onTierChange callback, sampleFrame, and recordFrame', () => {
  const changes = [];
  const gov = new QualityGovernor({
    mode: 'auto',
    onTierChange(spec) {
      changes.push(spec);
    },
  });

  assert.equal(gov.spec.tier, 'high');
  assert.equal(gov.spec, gov.getSpec());
  assert.equal(typeof gov.sampleFrame, 'function');
  assert.equal(typeof gov.recordFrame, 'function');

  // Feed 90 slow frames (32ms each) via recordFrame(ms) -> triggers downgrade to 'low'
  let downgraded = false;
  for (let i = 0; i < 90; i++) {
    if (gov.recordFrame(32, { visible: true, active: true })) {
      downgraded = true;
    }
  }
  assert.equal(downgraded, true);
  assert.equal(gov.spec.tier, 'low');
  assert.equal(changes.length, 1);
  assert.equal(changes[0].tier, 'low');
});

test('GameAnalytics supports both recordShare signatures and main.js modes', () => {
  const events = [];
  const analytics = new GameAnalytics({
    location: { hostname: 'dondurma.ipekbayrak.com.tr', pathname: '/' },
    navigator: {},
    getTracker: () => ({
      track(name, metadata) {
        events.push({ name, metadata });
      },
    }),
  });

  analytics.startRound(4, { scoops: 3, mode: 'exam' });
  analytics.recordConeBitten(4, { scoops: 3, bamboozled: 1, mode: 'seeded' });
  analytics.recordShare(6, { channel: 'clipboard', kind: 'trap-builder' });
  analytics.recordShare({ kind: 'daily_emoji', stage: 7, mode: 'daily' });

  assert.equal(events.length, 4);
  assert.equal(events[0].name, 'round_started');
  assert.equal(events[0].metadata.mode, 'exam');
  assert.equal(events[0].metadata.scoops, 3);

  assert.equal(events[1].name, 'cone_bitten');
  assert.equal(events[1].metadata.mode, 'seeded');
  assert.equal(events[1].metadata.scoops, 3);

  assert.equal(events[2].name, 'share_triggered');
  assert.equal(events[2].metadata.stage, '6');
  assert.equal(events[2].metadata.operation, 'trap-builder');

  assert.equal(events[3].name, 'share_triggered');
  assert.equal(events[3].metadata.stage, '7');
  assert.equal(events[3].metadata.operation, 'daily_emoji');
  assert.equal(events[3].metadata.mode, 'daily');
});

test('SoundEngine defines bite and smudge audio methods', () => {
  assert.equal(typeof SoundEngine.prototype.playConeBite, 'function');
  assert.equal(typeof SoundEngine.prototype.playCrunchBite, 'function');
  assert.equal(typeof SoundEngine.prototype.playSmudgeSplat, 'function');
});

test('Every method called on newly wired subsystems in src/main.js exists on its class', () => {
  const mainSrc = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');

  const instances = {
    qualityGovernor: new QualityGovernor(),
    gameAnalytics: new GameAnalytics({ location: { hostname: 'localhost' } }),
    highlightBuffer: new HighlightRingBuffer(),
    screenSmudge: new ScreenSmudge(),
    elasticSnatch: new ElasticSnatchBack(),
    coneBiteFinale: new ConeBiteFinale({ world: {}, sound: {} }),
    counterTroll: new CounterTroll({ world: {}, director: {}, sound: {}, save: {} }),
    sound: SoundEngine.prototype,
  };

  for (const [varName, target] of Object.entries(instances)) {
    const callRe = new RegExp(`\\b${varName}(?:\\?\\.|\\.)([a-zA-Z_$][\\w$]*)\\s*(?:\\?\\.\\s*)?\\(`, 'g');
    let match;
    while ((match = callRe.exec(mainSrc)) !== null) {
      const methodName = match[1];
      assert.equal(
        typeof target[methodName],
        'function',
        `Expected ${varName}.${methodName}() called in src/main.js to be a function`
      );
    }
  }
});

test('animate() has circuit-breaker protection, coneIntro uses pause(), and sw.js cache name is bumped to v47-hotfix', () => {
  const mainSrc = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');
  assert.match(mainSrc, /consecutiveFrameErrors\s*>=\s*5/);
  assert.doesNotMatch(mainSrc, /function animate\(now\)\s*\{\s*requestAnimationFrame\(animate\);/);
  assert.doesNotMatch(mainSrc, /coneIntro\.active\s*=/);
  assert.match(mainSrc, /coneIntro\.pause\(\)/);

  const swSrc = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
  assert.match(swSrc, /CACHE_NAME\s*=\s*'maras-dondurma-v(4[7-9]|[5-9]\d)/);
});
