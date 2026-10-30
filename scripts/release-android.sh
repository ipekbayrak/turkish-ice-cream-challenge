#!/usr/bin/env bash
# Maraş Dondurmacısı 3D — CLI Android Release & Play Store Publisher
# (ipekbayrak-verse OAuth standardı)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PATH="/Users/mustafa/.nvm/versions/node/v24.12.0/bin:/opt/homebrew/opt/openjdk@21/bin:$PATH"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

echo "==> 1. Mağaza görselleri ve 6 dil metinleri üretiliyor"
node scripts/generate-play-assets.mjs

echo "==> 2. Web build + Capacitor Android senkronizasyonu"
npm run build
npx cap sync android

echo "==> 3. Gradle: İmzalı Production AAB + APK derleniyor"
( cd android && ./gradlew --quiet bundleRelease assembleRelease )

mkdir -p play-store-publish/releases
cp android/app/build/outputs/bundle/release/app-release.aab \
   play-store-publish/releases/TurkishIceCreamChallenge-v1.0.0-release.aab
cp android/app/build/outputs/apk/release/app-release.apk \
   play-store-publish/releases/TurkishIceCreamChallenge-v1.0.0-release.apk
cp android/app/build/outputs/mapping/release/mapping.txt \
   play-store-publish/releases/mapping.txt

ls -lh play-store-publish/releases/

if [ "${1:-}" != "--no-publish" ]; then
  echo "==> 4. Google Play Store (${PLAY_TRACK:-production}) yayını başlatılıyor"
  node scripts/play-publish-all.mjs "${PLAY_TRACK:-production}"
fi
