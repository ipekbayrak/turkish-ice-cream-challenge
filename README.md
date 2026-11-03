# Maraş Dondurmacısı 3D Şov (Turkish Ice Cream Challenge)

Three.js ve Web Audio API ile geliştirilmiş, birinci şahıs (POV) 3B Kahramanmaraş dondurmacısı şov ve refleks oyunu. Hem iOS/Android mobil tarayıcılarda (Tam Ekran PWA) hem masaüstünde hem de Android (Capacitor) üzerinde çalışır.

## Canlı Adresler
- **Ana Uygulama (PWA):** https://dondurma.ipekbayrak.com.tr
- **Alternatif Yol:** https://ipekbayrak.com.tr/dondurma/

## Hızlı Başlangıç
```bash
# Geliştirme sunucusu (http://localhost:5173)
npm run dev

# Production derlemesi (dist/)
npm run build

# Canlı web sunucusuna (hetzner-1) anında dağıtım
npm run deploy:web
```

## Öne Çıkan Özellikler
- **15 Gerçekçi Maraş Dondurma Hilesi:** Göz göze ritim takibi (`EYE_LOCK_RHYTHM_CHASE`), iç içe çift külah tuzağı (`NESTED_CONES_SHELL_TRICK`), kalıptan dev dondurma çıkarma ve havada takla (`GIANT_KALIP_BLOCK_FLIP`), 3 kat uzayan dondurma sünmesi (`HYPER_TAFFY_STRETCH_3X`), ters çubuk çevirme (`INVERTED_PADDLE_SPIN`), peçete şakası ve çan melodisi.
- **Çok Senaryolu AFK Şov Sistemi:** Oyuncu elini hareket ettirmediğinde usta çubuğu geri çeker, tezgaha ritmik vurur, yukarıdaki 7 pirinç çana çubukla vurarak melodi çalar veya çubuğu çevirerek müşteriyi kışkırtır.
- **Soğutmalı Çelik Hazne & 6 Parlak Çelik Kova:** Tezgahın içindeki eğimli soğutma haznesinde 6 farklı aromada (Sütlü Maraş, Antep Fıstıklı, Kakao, Vişne, Karamel, Damla Sakızlı) parlak paslanmaz çelik dondurma kovası.
- **4 Farklı Maraş Ustası & 8 Seviyeli Kampanya:** Çırak Kadir, Pala Usta, Aksakal Dede (3B gözlüklü ve beyaz sakallı) ve Cihan Pehlivanı.
- **2 Kişilik (Müşteri vs Dondurmacı) Altyapısı:** `src/multiplayer.js` içerisinde tek oyunculu ve gelecekteki 2 oyunculu modlar için hazır protokol.

Detaylı teknik ve mimari bilgi için [`CLAUDE.md`](CLAUDE.md) dosyasına bakabilirsiniz.
