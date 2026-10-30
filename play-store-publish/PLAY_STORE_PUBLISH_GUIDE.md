# Google Play Store Tam Yayın Paketi (Turkish Ice Cream Challenge v1.0.0)

Tüm Google Play Store üretim dosyaları, imzalı `.aab` paketi, 6 dildeki mağaza açıklamaları ve grafik varlıkları [`play-store-publish/`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/play-store-publish) klasöründe eksiksiz olarak oluşturulmuştur.

---

## 📦 1. Hazır Üretim Dosyaları (`play-store-publish/`)

### A. İmzalı Uygulama Paketleri (`releases/`)
- **Google Play Store Production `.aab` (Android App Bundle)**:
  [`play-store-publish/releases/TurkishIceCreamChallenge-v1.0.0-release.aab`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/play-store-publish/releases/TurkishIceCreamChallenge-v1.0.0-release.aab) (`1.6 MB`, Target SDK 36, R8 Minified)
- **Doğrudan Kurulum İmzalı `.apk`**:
  [`play-store-publish/releases/TurkishIceCreamChallenge-v1.0.0-release.apk`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/play-store-publish/releases/TurkishIceCreamChallenge-v1.0.0-release.apk) (`1.2 MB`)
- **R8 Deobfuscation Sembol Haritası (`mapping.txt`)**:
  [`play-store-publish/releases/mapping.txt`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/play-store-publish/releases/mapping.txt)

### B. Üretim Upload Keystore Bilgileri (`android/keystore/`)
- **Keystore Dosyası**: [`android/keystore/maras-upload-key.jks`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/android/keystore/maras-upload-key.jks)
- **Key Alias**: `maras-upload`
- **SHA-256 Sertifika Parmak İzi**: `31:F7:34:D5:31:03:70:01:CB:F5:45:C5:9F:5A:B4:46:46:95:04:C7:EE:CF:EF:15:77:DB:67:A9:6C:D9:7C:0F`
- **SHA-1 Sertifika Parmak İzi**: `1B:F5:09:BB:7E:40:D0:A8:BA:09:E8:E1:8A:11:33:4F:1E:92:47:C0`

### C. Grafik Varlıkları (`graphics/`)
- **512×512 Yüksek Çözünürlüklü Mağaza İkonu**: [`play-store-publish/graphics/icon-512x512.png`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/play-store-publish/graphics/icon-512x512.png)
- **1024×500 Özellik Grafiği (Feature Graphic)**: [`play-store-publish/graphics/feature-graphic-1024x500.png`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/play-store-publish/graphics/feature-graphic-1024x500.png)
- **4 Adet 1080×1920 Telefon Ekran Görüntüsü (`screenshots/`)**:
  1. [`phone-1-gameplay.png`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/play-store-publish/graphics/screenshots/phone-1-gameplay.png)
  2. [`phone-2-empty-cone-trap.png`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/play-store-publish/graphics/screenshots/phone-2-empty-cone-trap.png)
  3. [`phone-3-napkin-fakeout.png`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/play-store-publish/graphics/screenshots/phone-3-napkin-fakeout.png)
  4. [`phone-4-final-catch.png`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/play-store-publish/graphics/screenshots/phone-4-final-catch.png)

### D. 6 Dilde Mağaza Listelemeleri (`store-listings/` & `android/app/src/main/play/listings/`)
- `tr-TR` (Türkçe), `en-US` (İngilizce), `ar` (Arapça), `ru` (Rusça), `de` (Almanca), `ja` (Japonca) için `title.txt`, `short-description.txt`, `full-description.txt` ve `release-notes.txt`.

---

## 🚀 2. Google Play Store'a Canlı Gönderim (2 Yöntem)

### Yöntem 1: Tek Komutla Otomatik API Yayını (Gradle Play Publisher)
Google Play Console hesabınızdan aldığınız **Service Account JSON** anahtarını [`android/play-service-account.json`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/android/app/build.gradle#L9-L12) olarak kaydettiğinizde şu komut `.aab` paketini, 6 dildeki mağaza açıklamalarını, sürüm notlarını ve tüm görselleri doğrudan Google Play Console'a yükler:
```bash
npm run play:publish
```

### Yöntem 2: Google Play Console Web Arayüzünden Sürükle-Bırak
1. **Google Play Console** → **Uygulama Oluştur (Create App)** ekranında:
   - **Uygulama Adı**: `Maraş Dondurmacısı 3D Şov` (veya `Turkish Ice Cream Challenge 3D`)
   - **Varsayılan Dil**: `Türkçe (tr-TR)`
   - **Uygulama veya Oyun**: `Oyun (Game)` → Kategori: `Arcade`
   - **Ücretsiz / Ücretli**: `Ücretsiz (Free)`
2. **Gizlilik Politikası (Privacy Policy)**:
   - Uygulama içi hazır sayfa: [`public/privacy-policy.html`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/public/privacy-policy.html)
3. **Veri Güvenliği (Data Safety) & İçerik Derecelendirmesi (IARC)**:
   - [`play-store-publish/DATA_SAFETY_AND_IARC.json`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/play-store-publish/DATA_SAFETY_AND_IARC.json) içindeki yanıtları işaretleyin (`Veri toplanmıyor: Hayır`, `PEGI 3 / Everyone`).
4. **Üretim Sürümü (Production Release)**:
   - [`TurkishIceCreamChallenge-v1.0.0-release.aab`](file:///Users/mustafa/Turkish%20Ice%20Cream%20Challenge/play-store-publish/releases/TurkishIceCreamChallenge-v1.0.0-release.aab) dosyasını yükleyin ve **İncelemeye Gönder (Send for review)** düğmesine basın.
