# Turkish Ice Cream Challenge (Maraş Dondurmacısı 3D Şov)

## 1. Altyapı & Canlı Dağıtım Bilgisi
Bu projenin sunucu, domain, container, hesap ve secret **adres** bilgileri `~/ipekbayrak-verse` reposundadır (`GitHub: ipekbayrak/ipekbayrak-verse`).

- **Proje ID:** `turkish-ice-cream-challenge`
- **Envanter Kaydı:** `~/ipekbayrak-verse/inventory/services.yaml` → `id: turkish-ice-cream-challenge`
- **Özet Doküman:** `~/ipekbayrak-verse/projects/turkish-ice-cream-challenge/README.md`
- **Canlı Web Adresleri (`hetzner-1` / `46.224.237.129`):**
  - `https://dondurma.ipekbayrak.com.tr` (Tam ekran iOS/Android PWA & Masaüstü)
  - `https://ipekbayrak.com.tr/dondurma/`
  - `https://ipekbayrak.com.tr/maras/`
- **Web Yayın Komutu:**
  ```bash
  npm run deploy:web
  ```
  (`scripts/deploy-web.sh` çalıştırılır; `vite build` çıktısını `root@46.224.237.129:/srv/ipekbayrak/dist/dondurma/` dizinine `rsync` ile gönderir.)
- **Google Play Yayın Komutları:**
  - `npm run release:android` / `npm run play:publish`
  - Gizli değerleri hiçbir dosyaya yazma; sadece `vault://` adresi kullan.

---

## 2. Mimari & Dosya Yapısı (`src/`)
- [`src/main.js`](src/main.js): Uygulama giriş noktası, iOS tam ekran/PWA yönetimi, görsel sipariş seçici (1–4 top ve dondurma kovası renkleri), 2B Canvas kuyruklu yıldız (`comet`) rehber çizgileri, HUD önbelleklemesi (`hudCache`) ve ana `animate()` döngüsü.
- [`src/world.js`](src/world.js): Three.js 3B sahnesi:
  - **Soğutmalı Çelik Hazne & 6 Parlak Çelik Dondurma Kovası (`_buildIceCreamCart`):** Öne eğimli (`rotation.x = 0.22`) paslanmaz çelik tezgah içinde 6 çelik kova (`steelBucketWall`, `steelRimFlange`, kulplar ve dönen dondurma kütleleri `this.tubIceGroups`).
  - **7 Detaylı Pirinç Maraş Çanı (`this.bells`):** Üst kemerde 7 kademeli pirinç çan, bağımsız sallanan iç çan dili (`clapperPivot`), kırmızı püskül ve akustik halka (`shimmerRing`).
  - **4 Maraş Ustası (`_buildVendor`, `setVendorCharacter`):** Çırak Kadir, Pala Usta (fesli), Aksakal Dede (3B altın çerçeveli gözlük + katmanlı beyaz sakal + göz kırpma), Cihan Pehlivanı.
  - **Çarşı Seyircileri (`_buildSpectators`):** Etrafta alkışlayan ve tepki veren 3B kukla seyirciler.
  - **Dondurma Çubuğu & İkili Külah (`_buildPaddleAndCones`):** `paddleGroup` + `paddleRollGroup`, iç/dış çift külah (`innerConeGroup`, `outerDecoyConeGroup`), sünen dondurma şeridi (`stretchRibbon`) ve dev kalıp (`kalipBlockGroup`).
- [`src/tricks.js`](src/tricks.js): `TrickDirector` oyun motoru:
  - **8 Aşamalı Kampanya (`CAMPAIGN_LEVELS`)** ve **10 Saniyelik İnteraktif Tutorial (`TUTORIAL_ROUTINE`)**.
  - **15 Maraş Dondurma Hilesi (`TRICK_CATALOG`):**
    1. `FLAVOR_POINT_ASK` (Kovadan dondurma seçimi + kepçe daldırma)
    2. `CLASSIC_SWOOP_FAKE`
    3. `NESTED_CONES_SHELL_TRICK` (İç içe çift külah tuzağı)
    4. `INVERTED_PADDLE_SPIN` (Ters çevirip kendi etrafında döndürme)
    5. `GIANT_KALIP_BLOCK_FLIP` (Kalıptan dev dondurma çıkarma ve havada takla)
    6. `HYPER_TAFFY_STRETCH_3X` (3 kat uzayan Maraş sünmesi + makas kesme)
    7. `BELL_MELODY_CHALLENGE` (Üstteki çanlarla ritim)
    8. `DECISIVE_DOUBLE_TAP_LOCK`
    9. `NAPKIN_MOUTH_WIPE_TRAP`
    10. `DECOY_FLOAT_SWITCH`
    11. `FIGURE_EIGHT_WEAVE`
    12. `TORNADO_orbit_360`
    13. `PENDULUM_WHIP_FAKE`
    14. `UPSIDE_DOWN_GRAVITY_DROP`
    15. `EYE_LOCK_RHYTHM_CHASE` (Yeşil çizginin ortasında göz göze kilitlenme, sağa/sola ritmik yeşil çizgi takibi ve gecikince `"Hop! Hop!"` çubuk yönü şaşırtmacası)
  - **Çok Senaryolu AFK Şovu (`_updateAfkShow`):** Oyuncu elini hareket ettirmediğinde ustanın çubuğu geri çekmesi, tezgaha vurması (`counter_drum`), çanlarda melodi çalması (`bell_melody`), göz göze el sallama (`eye_poke_wave`) ve çubuğu fırıldak gibi çevirmesi (`paddle_spin_taunt`).
- [`src/sound.js`](src/sound.js): Prosedürel Web Audio API ses motoru (darbuka/davul ritimleri, 7 çan notası, ustanın `"Hmm?"`, `"Hırr!"`, `"Hoppa!"`, `"Hahaha!"` vokal sentezleri ve dudak senkronu `getVoiceMouthOpen()`).
- [`src/multiplayer.js`](src/multiplayer.js): İleride 2 kişilik (`CUSTOMER` vs `VENDOR`) oynanışı desteklemek üzere hazır `LocalBotTransport` ve `WebSocketRoomTransport` altyapısı.

---

## 3. Teknik Kurallar (Flicker / Derinlik Koruma)
- `src/world.js` içinde `baseMesh` yüksekliği `0.78` (`y = 0.39`) olarak kalmalıdır; `this.basinDeckGroup` (`y = 0.94`) ile kesişmemesi için üst kısım çevre panellerle (`frontUpperSkirt`, `backUpperSkirt`, `sideUpperSkirt`) çevrilidir.
- Yarı saydam materyallerde (`frostRimMat`, `mistMat`, `shimmerMat`) `depthWrite: false` korunmalıdır.
- `src/tricks.js` içindeki `_spawnScorePopup` pozitif puanlarda tam ekran `vignetteFlash` tetiklememelidir.
- `public/sw.js` içinde önbellek değişikliklerinde `CACHE_NAME` sürümü artırılmalıdır (güncel: `maras-dondurma-v6`).
