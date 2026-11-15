/**
 * Maraş Dondurmacısı 3D (tr.com.ipekbayrak.turkishicecream)
 * ipekbayrak-verse Hesap Sahibi OAuth (play-oauth-client.json + play-oauth-token.json)
 * ile Google Play Store Production yayını:
 *   1. Edit açar
 *   2. İmzalı AAB (v2.0.0 / versionCode 2) yükler ve belirtilen track'e (varsayılan: production + internal) atar
 *   3. 6 dildeki (tr-TR, en-US, ar, ru-RU, de-DE, ja-JP) başlık, kısa ve tam açıklamaları yükler
 *   4. 512x512 3D İkon, yerelleştirilmiş 1024x500 Feature Graphic, 6 adet 1080x1920 gerçek 3D Telefon Ekran Görüntüsü
 *      ve 4 adet 1920x1080 gerçek 3D Tablet Ekran Görüntüsünü (7" + 10") yükler
 *   5. Edit'i commit eder ve play-tracks-published.json dosyasını günceller
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERSE_ROOT = '/Users/mustafa/ipekbayrak-verse';
const CLIENT_FILE = process.env.PLAY_OAUTH_CLIENT ?? resolve(VERSE_ROOT, 'secrets/local/play/play-oauth-client.json');
const TOKEN_FILE = process.env.PLAY_OAUTH_TOKEN ?? resolve(VERSE_ROOT, 'secrets/local/play/play-oauth-token.json');
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const UPLOAD = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3';

const PKG = process.env.PLAY_PACKAGE ?? 'tr.com.ipekbayrak.turkishicecream';
const TRACK = process.env.PLAY_TRACK ?? process.argv[2] ?? 'production';
const DRAFT = process.argv.includes('--draft') || Boolean(process.env.PLAY_DRAFT);
const AAB_V210 = resolve(ROOT, 'play-store-publish/releases/TurkishIceCreamChallenge-v2.1.0-release.aab');
const AAB_V201 = resolve(ROOT, 'play-store-publish/releases/TurkishIceCreamChallenge-v2.0.1-release.aab');
const AAB_V2 = resolve(ROOT, 'play-store-publish/releases/TurkishIceCreamChallenge-v2.0.0-release.aab');
const AAB_V1 = resolve(ROOT, 'play-store-publish/releases/TurkishIceCreamChallenge-v1.0.0-release.aab');
const AAB_PATH = existsSync(AAB_V210) ? AAB_V210 : existsSync(AAB_V201) ? AAB_V201 : existsSync(AAB_V2) ? AAB_V2 : AAB_V1;

const die = (m) => { console.error(m); process.exit(1); };

if (!existsSync(AAB_PATH)) die(`AAB bulunamadı: ${AAB_PATH}`);
if (!existsSync(CLIENT_FILE)) die(`OAuth client bulunamadı: ${CLIENT_FILE}`);
if (!existsSync(TOKEN_FILE)) die(`OAuth token bulunamadı: ${TOKEN_FILE}`);

const LOCALE_MAP = {
  'tr-TR': 'tr-TR',
  'en-US': 'en-US',
  'ar': 'ar',
  'ru': 'ru-RU',
  'de': 'de-DE',
  'ja': 'ja-JP',
};

function parseReleaseNotes() {
  const f = resolve(ROOT, 'RELEASE_NOTES.md');
  if (!existsSync(f)) return undefined;
  const out = [];
  for (const block of readFileSync(f, 'utf8').split(/^##\s+/m).slice(1)) {
    const nl = block.indexOf('\n');
    const language = block.slice(0, nl).trim();
    const text = block.slice(nl + 1).trim();
    if (!language || !text) continue;
    if (text.length > 500) die(`${language} sürüm notu ${text.length} karakter (max 500)`);
    out.push({ language, text });
  }
  return out.length ? out : undefined;
}

async function accessToken() {
  const { installed, web } = JSON.parse(readFileSync(CLIENT_FILE, 'utf8'));
  const { client_id, client_secret } = installed ?? web;
  const { refresh_token } = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: 'refresh_token' }),
  });
  const t = await r.json();
  if (!r.ok) die(`Token yenileme başarısız (${r.status}): ${JSON.stringify(t)}`);
  return t.access_token;
}

async function call(url, { method = 'GET', token, body, raw, contentType } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  if (raw) headers['Content-Type'] = contentType;
  else if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(url, {
    method,
    headers,
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await r.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { ok: r.ok, status: r.status, json };
}

const token = await accessToken();
console.log(`==> ${PKG} · AAB (${(statSync(AAB_PATH).size / 1048576).toFixed(2)} MB) · track "${TRACK}"${DRAFT ? ' (draft)' : ''}`);

// 1. Open Edit
const editRes = await call(`${API}/applications/${PKG}/edits`, { method: 'POST', token, body: {} });
if (!editRes.ok) {
  console.error(`Edit açılamadı (${editRes.status}):`, JSON.stringify(editRes.json, null, 2));
  process.exit(1);
}

const editId = editRes.json.id;
console.log(`    ✔ Edit açıldı: ${editId}`);

// 2. Upload AAB Bundle
const bundleRes = await call(`${UPLOAD}/applications/${PKG}/edits/${editId}/bundles?uploadType=media`, {
  method: 'POST',
  token,
  raw: readFileSync(AAB_PATH),
  contentType: 'application/octet-stream',
});
if (!bundleRes.ok) die(`AAB yükleme hatası (${bundleRes.status}): ${JSON.stringify(bundleRes.json, null, 2)}`);
const versionCode = String(bundleRes.json.versionCode);
console.log(`    ✔ AAB yüklendi: versionCode ${versionCode}`);

// 3. Assign Track (production + internal)
const notes = parseReleaseNotes();
const releaseObj = {
  name: '2.1.0',
  versionCodes: [versionCode],
  status: DRAFT ? 'draft' : 'completed',
  ...(notes ? { releaseNotes: notes } : {}),
};

const trackRes = await call(`${API}/applications/${PKG}/edits/${editId}/tracks/${TRACK}`, {
  method: 'PUT',
  token,
  body: { track: TRACK, releases: [releaseObj] },
});
if (!trackRes.ok) die(`Track (${TRACK}) atama hatası (${trackRes.status}): ${JSON.stringify(trackRes.json, null, 2)}`);
console.log(`    ✔ Track "${TRACK}" güncellendi (${DRAFT ? 'draft' : 'completed'})`);

if (TRACK !== 'internal') {
  await call(`${API}/applications/${PKG}/edits/${editId}/tracks/internal`, {
    method: 'PUT',
    token,
    body: { track: 'internal', releases: [releaseObj] },
  });
  console.log(`    ✔ Track "internal" güncellendi (${DRAFT ? 'draft' : 'completed'})`);
}

// 4. Update 6-Language Store Listings
const listingsDir = resolve(ROOT, 'play-store-publish/store-listings');
for (const [dirName, playLocale] of Object.entries(LOCALE_MAP)) {
  const locDir = resolve(listingsDir, dirName);
  if (!existsSync(locDir)) continue;
  const title = readFileSync(resolve(locDir, 'title.txt'), 'utf8').trim();
  const shortDescription = readFileSync(resolve(locDir, 'short-description.txt'), 'utf8').trim();
  const fullDescription = readFileSync(resolve(locDir, 'full-description.txt'), 'utf8').trim();

  const lRes = await call(`${API}/applications/${PKG}/edits/${editId}/listings/${playLocale}`, {
    method: 'PUT',
    token,
    body: { language: playLocale, title, shortDescription, fullDescription },
  });
  if (lRes.ok) console.log(`    ✔ Mağaza metni (${playLocale}) güncellendi`);
  else console.warn(`    ⚠ Mağaza metni (${playLocale}) atlandı (${lRes.status}): ${lRes.json?.error?.message ?? ''}`);
}

// 5. Upload 3D Icon (512x512), Localized Feature Graphic (1024x500), 6x 1080x1920 Phone Screenshots & 4x 1920x1080 Tablet Screenshots
const iconBytes = readFileSync(resolve(ROOT, 'play-store-publish/graphics/icon-512x512.png'));

for (const playLocale of ['tr-TR', 'en-US']) {
  const isTr = playLocale === 'tr-TR';
  const fgPath = resolve(
    ROOT,
    isTr ? 'play-store-publish/graphics/feature-graphic-tr.png' : 'play-store-publish/graphics/feature-graphic-en.png'
  );
  const fgBytes = readFileSync(existsSync(fgPath) ? fgPath : resolve(ROOT, 'play-store-publish/graphics/feature-graphic-1024x500.png'));

  const phoneDir = resolve(
    ROOT,
    isTr ? 'play-store-publish/graphics/screenshots-tr' : 'play-store-publish/graphics/screenshots-en'
  );
  const activePhoneDir = existsSync(phoneDir) ? phoneDir : resolve(ROOT, 'play-store-publish/graphics/screenshots');
  const phoneFiles = readdirSync(activePhoneDir).filter((f) => f.endsWith('.png')).sort();

  const tabletDir = resolve(
    ROOT,
    isTr ? 'play-store-publish/graphics/tablet-tr' : 'play-store-publish/graphics/tablet-en'
  );
  const activeTabletDir = existsSync(tabletDir) ? tabletDir : activePhoneDir;
  const tabletFiles = readdirSync(activeTabletDir).filter((f) => f.endsWith('.png')).sort();

  // Clear & upload icon + featureGraphic
  await call(`${API}/applications/${PKG}/edits/${editId}/listings/${playLocale}/icon`, { method: 'DELETE', token });
  await call(`${UPLOAD}/applications/${PKG}/edits/${editId}/listings/${playLocale}/icon?uploadType=media`, {
    method: 'POST', token, raw: iconBytes, contentType: 'image/png',
  });

  await call(`${API}/applications/${PKG}/edits/${editId}/listings/${playLocale}/featureGraphic`, { method: 'DELETE', token });
  await call(`${UPLOAD}/applications/${PKG}/edits/${editId}/listings/${playLocale}/featureGraphic?uploadType=media`, {
    method: 'POST', token, raw: fgBytes, contentType: 'image/png',
  });

  // Clear & upload 6 Phone Screenshots
  await call(`${API}/applications/${PKG}/edits/${editId}/listings/${playLocale}/phoneScreenshots`, {
    method: 'DELETE', token,
  });
  for (const pf of phoneFiles) {
    await call(`${UPLOAD}/applications/${PKG}/edits/${editId}/listings/${playLocale}/phoneScreenshots?uploadType=media`, {
      method: 'POST', token, raw: readFileSync(resolve(activePhoneDir, pf)), contentType: 'image/png',
    });
  }

  // Clear & upload 4 Landscape Tablet Screenshots (7" & 10")
  for (const tabletType of ['sevenInchScreenshots', 'tenInchScreenshots']) {
    await call(`${API}/applications/${PKG}/edits/${editId}/listings/${playLocale}/${tabletType}`, {
      method: 'DELETE', token,
    });
    for (const tf of tabletFiles) {
      await call(`${UPLOAD}/applications/${PKG}/edits/${editId}/listings/${playLocale}/${tabletType}?uploadType=media`, {
        method: 'POST', token, raw: readFileSync(resolve(activeTabletDir, tf)), contentType: 'image/png',
      });
    }
  }

  console.log(`    ✔ Görseller (${playLocale}: 3D ikon, feature graphic, ${phoneFiles.length} telefon + ${tabletFiles.length}x2 tablet ekran görüntüsü) yüklendi`);
}

// 6. Commit Edit
const commitRes = await call(`${API}/applications/${PKG}/edits/${editId}:commit`, { method: 'POST', token });
if (!commitRes.ok) die(`Commit hatası (${commitRes.status}): ${JSON.stringify(commitRes.json, null, 2)}`);

// 7. Fetch & save updated tracks status
const tracksEdit = await call(`${API}/applications/${PKG}/edits`, { method: 'POST', token, body: {} });
if (tracksEdit.ok) {
  const tList = await call(`${API}/applications/${PKG}/edits/${tracksEdit.json.id}/tracks`, { method: 'GET', token });
  if (tList.ok) {
    writeFileSync(resolve(ROOT, 'play-store-publish/play-tracks-published.json'), JSON.stringify(tList.json, null, 2) + '\n');
  }
}

console.log(`\n🎉 TAMAMLANDI! ${PKG} (v2.1.0 / versionCode ${versionCode}) "${TRACK}" ve "internal" kanallarında yayında!`);
console.log('   https://play.google.com/console/u/0/developers/4920333877961656167/app/publishing');
