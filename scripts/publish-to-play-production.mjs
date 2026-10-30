import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const SERVICE_ACCOUNT_PATH = path.join(ROOT, 'android/play-service-account.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('\n❌ HATA: Google Play Service Account anahtarı bulunamadı:');
  console.error(`   Beklenen dosya: ${SERVICE_ACCOUNT_PATH}\n`);
  console.error('📌 Google Play Console API ile Production yayını yapmak için:');
  console.error('   1. Google Play Console (https://play.google.com/console) -> Kurulum (Setup) -> API erişimi (API access) sayfasına gidin.');
  console.error('   2. Hizmet Hesabı (Service Account) JSON anahtarınızı indirin ve şu konuma kaydedin:');
  console.error(`      cp ~/Downloads/<dosya-adi>.json "${SERVICE_ACCOUNT_PATH}"`);
  console.error('   3. Ardından tekrar çalıştırın: npm run play:publish\n');
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
} catch {
  console.error('❌ HATA: android/play-service-account.json geçerli bir JSON dosyası değil.');
  process.exit(1);
}

if (parsed.type !== 'service_account' || !parsed.client_email || !parsed.private_key) {
  console.error('❌ HATA: android/play-service-account.json geçerli bir Google Cloud Service Account anahtarı değil (type: "service_account", client_email ve private_key alanları zorunludur).');
  process.exit(1);
}

console.log(`✔ Service Account doğrulandı (${parsed.client_email})`);
console.log('🚀 Google Play Store PRODUCTION kanalına .aab paketi, 6 dil mağaza açıklamaları ve görseller yükleniyor...\n');

execSync(
  'node scripts/generate-play-assets.mjs && npx vite build && npx cap sync android && cd android && ./gradlew publishReleaseBundle publishListing',
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAY_TRACK: 'production',
      JAVA_HOME: process.env.JAVA_HOME || '/opt/homebrew/opt/openjdk@21',
      ANDROID_HOME: process.env.ANDROID_HOME || `${process.env.HOME}/Library/Android/sdk`,
    },
  }
);

console.log('\n🎉 BAŞARILI! Turkish Ice Cream Challenge v1.0.0 Google Play Store PRODUCTION kanalında yayına gönderildi!');
