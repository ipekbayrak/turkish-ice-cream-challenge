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
- [`src/main.js`](src/main.js): Uygulama giriş noktası, iOS tam ekran/PWA yönetimi, oyun içi sipariş (bölüme göre 1–12 top), mekân seçimi, 2B Canvas kuyruklu yıldız (`comet`) rehber çizgileri, HUD önbelleklemesi (`hudCache`) ve ana `animate()` döngüsü.
- [`src/world.js`](src/world.js): Three.js 3B sahnesi:
  - **Soğutmalı Çelik Hazne & 4 Parlak Çelik Dondurma Kovası (`_buildIceCreamCart`):** Öne eğimli (`rotation.x = 0.22`) paslanmaz çelik tezgah içinde 4 çelik kova (`steelBucketWall`, `steelRimFlange`, kulplar ve dönen dondurma kütleleri `this.tubIceGroups`).
  - **7 Detaylı Pirinç Maraş Çanı (`this.bells`):** Üst kemerde 7 kademeli pirinç çan, bağımsız sallanan iç çan dili (`clapperPivot`), kırmızı püskül ve akustik halka (`shimmerRing`).
  - **4 Maraş Ustası (`_buildVendor`, `setVendorCharacter`):** Çırak Kadir, Pala Usta (fesli), Aksakal Dede (3B altın çerçeveli gözlük + katmanlı beyaz sakal + göz kırpma), Cihan Pehlivanı.
  - **Çarşı Seyircileri (`_buildSpectators`):** Etrafta alkışlayan ve tepki veren 3B kukla seyirciler.
  - **Dondurma Çubuğu & İkili Külah (`_buildPaddleAndCones`):** `paddleGroup` + `paddleRollGroup`, iç/dış çift külah (`innerConeGroup`, `outerDecoyConeGroup`), sünen dondurma şeridi (`stretchRibbon`) ve dev kalıp (`kalipBlockGroup`).
- [`src/tricks.js`](src/tricks.js): `TrickDirector` oyun motoru:
  - **6 mekâna yayılan 30 karşılaşma (`CAMPAIGN_LEVELS`, `src/venues.js`)**. Öğretici ve ayrı hile listesi normal arayüzde yoktur.
  - **63 numara/gösteri + final:** `TRICK_CATALOG` gerçek kod kimliklerinin kaynağıdır. `src/trick-routines.js` kaynaklanan hareket sözlüğünü ve oyun için kurgulanmış 36 bileşimi tutar. Toplam 63 oynanabilir gösteri, 63 ayrı belgelenmiş geleneksel numara anlamına gelmez. Bileşenler aynı `TrickDirector` giriş/puan/sahiplik yollarından geçer. İlk on karşılaşmada tur başına en fazla bir uzun gösteri seçilir.
  - **Çok Senaryolu AFK Şovu (`_updateAfkShow`):** Oyuncu elini hareket ettirmediğinde ustanın çubuğu geri çekmesi, tezgaha vurması (`counter_drum`), çanlarda melodi çalması (`bell_melody`), göz göze el sallama (`eye_poke_wave`) ve çubuğu fırıldak gibi çevirmesi (`paddle_spin_taunt`).
- [`src/audio.js`](src/audio.js): Prosedürel Web Audio API ses motoru (darbuka/davul ritimleri, 7 çan notası, ustanın seyrek, yumuşak oyuncak/üflemeli tınılı kısa tepkileri ve dudak senkronu `getVoiceMouthOpen()`).
- [`src/protocol.js`](src/protocol.js): İleride 2 kişilik (`CUSTOMER` vs `VENDOR`) oynanışı desteklemek üzere hazır `LocalBotTransport` ve `WebSocketRoomTransport` altyapısı.

---

## 3. Teknik Kurallar (Flicker / Derinlik Koruma)
- Tezgâhın altı `shop-interior.js` içindeki açık servis iskeletidir; ustanın bel/ayak görüşünü kapatan eski opak dolabı geri getirme. `basinDeckGroup` yüksekliği korunur; dört kova ve dar tezgâhın fiziksel darbe hedefleri aynı yerleşimden hesaplanır. Kısaltılmış arka tabla ustanın gövdesinden ayrıdır; külah haznesinin dar yan desteği orta çalışma yolunu kapatmaz.
- Yarı saydam materyallerde (`frostRimMat`, `mistMat`, `shimmerMat`) `depthWrite: false` korunmalıdır.
- `src/tricks.js` içindeki `_spawnScorePopup` pozitif puanlarda tam ekran `vignetteFlash` tetiklememelidir.
- `public/sw.js` içinde önbellek değişikliklerinde `CACHE_NAME` sürümü artırılmalıdır (güncel: `maras-dondurma-v43-stable-hands`).


## Servis ve ilerleme sınırları
- `resetRound()` canlı kazıma/sünme numarası başlatmaz. Başlangıç ve sipariş sırasında boş külah gösterilir; gerçek hazırlık `startRound()` ile başlar.
- Top sayısını sabit 4 ile sınırlama: `MAX_SCOOPS`, `getStageOrderOptions()` ve dünya `getScoopAnchor()` yardımcılarını kullan. İlk dört topun düzeni korunur; büyük servisler geniş bir kümeye geçer.
- Peçete, külah ve dondurma ayrı sahipliklere sahiptir. Peçete tutulduğunda külah çubukta kalır; kâğıt aynı nesne olarak ele geçer.
- Darbe efekti ve sesini gerçek temas noktasında tetikle. Tam tur sıfırlaması eski parçacıkları, uçan nesneleri ve bekleyen iniş callback'lerini temizler.
- Hile ve bölüm katalogları içerik verisidir; normal arayüzde hile/numaralı bölüm listesi yeniden açılmamalıdır. Kullanıcıya mekânlar gösterilir.


## Keşif ve içerik ekleme
- `cultural-details.js`: altı mekâna eşit dağılmış 108 nesne; TR/EN kültürel bilgi (`detail`) ve özgün kurgu (`narrative`) ayrıdır. `sourceIds` ilgili iddiayı desteklemelidir. Bölgesel adetleri tüm ülkeye genelleme.
- `cultural-scene.js`: yalnız seçili mekânın 18 nesnesi görünür. İnceleme yeni kopya yaratmaz; aynı nesne sahne grafiğinde taşınır ve tam eski pozuna döner. Tur başında `resetExploration()` kamera ve nesne sahipliğini temizler.
- `discovery-ui.js`: menüden isteğe bağlı üç raf görünümü ve nesnenin üstünde dokunma hedefleri. Oyun sırasında keşif açılmaz. Kamera, sipariş veya ritim girişleri birlikte çalıştırılmamalıdır.
- `discovery-progress.js`: `maras-cultural-discoveries-v1` anahtarında yalnız katalogda var olan nesne kimlikleri tutulur; kalp/puan/bölüm kayıtlarını değiştirmez.
- Yeni gösteri için yalnız katalog kimliği eklemek yeterli değildir: okunur sürekli hareket, fiziksel nesne sahipliği, doğru/yanlış giriş ve kesintide sıfırlama testleri gereklidir. Var olan numaraların dokunma eşiği/puanı/kazanma kuralını içerik genişletirken değiştirme.

- Üretim dokunması artık `relative-touch.js` üzerinden göreli sürüklemedir (v24 bölümü). `touch-reach.js` içindeki eski `update/contactAt` çifti mutlak önizlemeler ve28px ofsetli masaüstü fare için korunur; üretim dokunması ofsetsiz `updateAim` kullanır. Giysiyi ham basışa bağlama veya giderek büyüyen ofset eklenmemelidir. `normX/Y` yalnız gerçek sürüklemeyle değişen sanal hedefin hareket kanıtıdır; otomatik dönüş bu kanalı değiştirmez. `aimNormX/Y` görünür hedef, `intentWorldPos` bağımsız etkileşim noktasıdır.
- `PointerTipView` (`touch-arm-view.js`) son kamera pozunda gerçek parmak ucunu hizalar. Kol ve giysi mevcut anatomik boylarında kalır; dokunma noktasına uzatılmaz/kesilmez. Fiziksel çubuk tutuşu ve başlangıç devri `playerConeGripRequested` ile korunur.
- `flavors.js` dört kovanın tek menü kaynağıdır: Sade, Fıstıklı, Kakaolu, Urmu dutlu. Bu seçki dört değişmez geleneksel tür iddiası değildir. Eski4/5 renk kayıtları sade olarak okunur; bölüm/puan/top sayısı korunur. Top kapasitesi bölüm kilitleriyle 1–12; dört çeşit dört top sınırı değildir. `TubOrderView.drawLabels` bütün dört ismi başlangıçta, siparişte ve oyunda görünür tutar.

- Siparişin sayısı kovada yapılan bilinçli seçimlerin sayısıdır. Mekân minimumuyla veya sessizlikte otomatik top ekleme; `min=1`, ilerleyen kapasite `max` ile sınırlıdır. Kullanıcının son isteğiyle onay hareketsizliktir: 1/.8/.6/.45 saniye (450 ms alt sınır). Ham `pointerX/Y` koordinatlarında en az 6 px hareket veya yeni top süreyi yeniler. Taze kova tutuşu sınırlı seçim payı alır. Kamera/elin uzanma animasyonu sayaç yenileyemez. `order-reach.js` sadece görüntü hedefini oynatır; `gestureState.handWorldPos`, `intentWorldPos` ve kova ışın seçimi değişmez. `finishIntent`/zorunlu aşağı çek onayı kullanılmaz. Seçilmiş renkli toplar ve dolan onay göstergesi korunur.
- Katmanlı servis seçildiyse tüm kazıma/top ekleme adımlarından sonra, finalden hemen önce oynat. Aynı dış külah/peçete nesnelerini taşı; eldeki nesne yerine kopya koyma. Finalde peçete dolu külahla kalır ve boş çubuktan uzayan renkli şerit oluşturulmaz.

- Ustanın AFK masa/çan/kova gösterileri oyuncu hareketi istemez: `idle-presentation.js` hazırlık, sırt hareketi, dönüş ve kısa yerleşme boyunca ok/halka/eski izleri kapatır. Önceki kesmeden kalan 3B şerit temizlenir; gerçek elde tutma/çekme ayrılmaz. Aktif ritim, tutma, çekme ve kesme işaretleri korunur.
- `HandRig.handedness` anatomik sağ/solu belirtir; ekran tarafı ve kavrama dönüşüyle karıştırma. Oyuncu sağ eldir. `hand-orientation.js` elin bilek–boğum eksenini önkola göre kurar; çubuk üzerindeki dönüş kesintisizdir. Kavrayış tahmini ve çizimi aynı seçilmiş el çerçevesini kullanmalıdır.
- `vendor-body.js` kalça/diz/ayakları gövdeye bağlar ve ayak basışını yönetir. Yanal gövde hedefi kol çözümünden önce uygulanır; kol çözümünden sonra karakter kökünü taşıma. `shopCameraProfile` sahne önizlemesinin taban kadrajıdır. Asıl oyunda `EncounterCamera` teklif → sipariş → şov için yakın POV geçişlerini yönetir; dış kova kenarlarını kadraja alır. Geçiş tamamlandığında donmuş giriş kamerası yeniden kurulur, pointer kimliği/epoch/ham hız değiştirilmez. `/tests/shop-body-preview.html` görünür bel, baldırlar, ayaklar ve adım kontrolüdür.

- `/tests/touch-preview.html` iframe içinde DEV `?touch-preview=1` kullanır: oyun alanındaki gerçek fare bas/sürükle/bırak olayları dokunma yolundan geçer, fare hover kapalıdır. Dokunma bırakma/iptal/odak kaybında iz temizlenir. İz yükseltilmiş seçim ucunu takip eder; ham basışta ikinci bir nokta veya eski kol-kesme sınırı çizilmez.


## Külah başlangıcı ve tutuş
- Ana ekrana yeniden başlangıç kartı veya düğme sırası koyma: yalnız sağ üst Seçenekler görünür. Başlangıç, ustanın elindeki gerçek boş külaha temasla olur. Şova Başla erişilebilirlik eylemi yalnız seçenekler panelinin en altındadır. Oyun bilgisi ve hamle/sipariş yönergeleri üsttedir; sonuç penceresi ortada açılır. Yeniden dene/sonraki tur otomatik alma yapmaz, boş külah teklifiyle başlar.
- `ConeIntroduction` önce gerçek ele temas eder, aynı külahı oyuncuya bağlar, sonra kovadan siparişe geçer. `resetRound(stage,false,{preserveCustomerCone:true})` ve `startRound({customerCone:true})` sipariş sonundaki sahipliği korur.
- `customerOpeningRoutine` oyuncu külahındaki ilk1–2topu hazırladığı için karşılık gelen SCRAPE adımlarını kaldırır; kalan seçilmiş toplar eski rutinde tamamlanır. Top sayısını/renk sırasını sessizce artırma.
- `poleGripRenderTarget` yalnız görüntü elini yeni dik kavrayışa hizalar. `gestureState.handWorldPos` ve .45 yay eşleşmesi eski mantıksal yolda kalır.
- Keşif için main pointerDown/Move/Up/Cancel olayları DiscoveryUI'ye yönlendirilir. Nesne dönüşü aynı modeli kullanır; raf/menü/iptalde özgün dönüşüm geri gelir. Sayaç metni ve rakamı ekleme.


## Ölçülü ses ve yaşayan lore
- `sound-palette.js` canlı ve çevrimdışı ses üretiminin ortak kaynağıdır. İnsan kaydı/TTS gibi sunma. Çan/temas işaretlerini koru; ses sıklığı ve kırpılma/spektral sınır testlerini kaldırma. `stopMusic` yalnız eşliği durdurur, genel mute tüm kaynakları durdurur.
- `StallMemoryProgress` kazanılmış anıları kayıtlı gerçek galibiyet + geçerli keşif kimliğinden türetir. Ziyaret/unlockedStage tek başına hatıra kazandırmaz. Oyun puanı/seviye kaydı değiştirilmez.
- DiscoveryUI `onInspect/getMemory`, VendorRelationships `setDiscoveredObjects/discoverObject/discoveryMemory/finish` aracılığıyla keşif, kısa kurmaca kartı, sonuç satırı ve fiziksel defter ayraçları aynı hikâyeyi taşır. Hazırlık dışında yeni anlatı sokma; tur başına en fazla bir yeni anı, en az 7 saniye anlatı aralığı.
- Dört araştırma/oyun uyarlamasının kökeni `researched-service.js` içinde tutulur. Havada külah/top yakalama kuralları oyuna aittir. Yeni ad/ayna/renk değişikliği tek başına yeni gerçek numara sayılmaz.

## İmleç, temas ve sekiz hareketi
- `HandRig extends Group` oyuncu ve iki ayna usta eli için ortak avuç/parmak/başparmak hiyerarşisidir. Torus parmaklar veya bağımsız 90° avuç dönüşü ekleme. Külah yönü ve gerçek nesne sahipliği korunur; bilek/önkol birlikte yönlenir.
- Ustada `handGroup` kavrayış kontrol noktası, `handRig.wristAnchor` gerçek anatomik bilektir; bunları birbirinin yerine kullanma. Tutuş değişiminde gerçek bilek pozunu koruyup eklem pozunu harmanla. Önce uzanma/temas, sonra aynı nesnenin sahiplik değişimi gelmelidir.
- `TouchReach` fare hover ve göreli dokunmanın ortak 3D projeksiyonudur. Görünen nokta ve iz sanal parmak ucundadır; ham basış noktası yalnız geliştirme kontrolünde gösterilir. Başlangıç devrinde `getPlayerTipRootTarget()` etkileşim hedefini fiziksel el köküne çevirir; ardından serbest tip kontrolüne sıçramadan dönülür.
- `VendorArmSolver` gövde hacmini ve gerçek anatomik bileği hesaba katar. Kısıtlı omuz hareketi, güvenli dirsek yönü ve çubuk üstünde kavrayış seçimi kullanır; erişilemeyen destek kavrayışı açık ele bırakılır. Kolu sınırsız uzatıp gövdeden geçirme.
- `SHAFT_SPIN_360` görünümü `presentationAxialSpin` ile külahın kendi uzun ekseninde döner; hafif bilek yatışı vardır. Hedef/süre/puan değişmez. Ayrı ters çevirme ve yel değirmeni numaralarının tam dönüşünü koru. Bu çevirmeyi wafer pivotu etrafında hızlı pervane hareketine geri çevirme; uzun servis çubuğu ve kol için fiziksel olarak geçersiz bir yol üretir.
- `vendor-flourish.js` etkileşimsiz AFK çeşitliliğidir: önce aynı külah gerçek temasla ön ele geçer, boş çubuk dış kalça/sırt yolundan dolaşır, oyuncu dönerse güvenli yoldan öne gelir. Puanı veya oyuncunun yanıt süresini tüketmez.
- `idle-presentation.js` rehberi AFK/hazırlık/gösteri/yeniden temas boyunca ve son aktarım karesinde susturur. İlk aktif oyun güncellemesinde rehber hemen açılır; yanıt süresinin başında rehberi gizleyen ek zamanlayıcı ekleme. Normal AFK çıkışı aynı karede mekaniğe devam ediyorsa rehber de o karede görünür.
- Sırttan dönüşte `VendorPoleRejoin` gerçek en üst topa temas bekler; dönerken çıplak çubuğu yakındaki külaha erkenden yapıştırma. `vendorPoleFree` ve alma-pozu geçiş bayrakları iptal/tur sıfırlamasında temizlenir. Ana çubuk kavrayışı sabittir; serbest destek eli güvenli tutuşa yaklaşmadan yeniden kilitlenmez.
- `PoleContact` yalnız gerçek çubuk ve kavrayışları en üst topa hizalar; mantıksal paddle/cone hedeflerini değiştirme. Ayrılmış `scoopStackGroup` görsel çubuğun çocuğu olmamalı; `scoopInFlight` sıfırlamada temizlenmeli. Serbest çubuk otomatik olarak eldeki külaha çekilmemeli.
- `FigureEightGesture` kesintisiz iki halka, son kesişim ve gerçek ham hareket ister. Tek halka/titreme/uydurulmuş kamera hareketi başarı sayılmaz; boyut değişince şekil yeniden kurulur. `guide.figureEight` ortak çiziciye gider; yeni paralel giriş doğrulaması yazma.
- Hız artışı yalnız hazırlık/bağlayıcı/başarı aralarındadır. Etkileşim pencerelerine genel hız çarpanı ekleme.

## Performans sınırları
- `npm run perf:cpu -- --compare` gerçek kol/servis döngüsünü donmuş referans çözücüyle aynı süreçte karşılaştırır. `tests/vendor-arm-performance.test.js` çarpışma, poz ve kavrayış kararlarının birebir aynı kalmasını denetler. Kare atlama, daha az aday veya daha gevşek çarpışma toleransıyla hız kazanma.
- Geliştirmede `/?perf=1` gerçek oyunda 6 saniyelik ölçüm panelini açar; üretim paketine girmez. RAF aralığı, CPU süresi, render gönderim süresi ve çizim sayısı ayrıdır; iç içe metod sürelerini toplama, CPU ölçümünü GPU veya gerçek telefon FPS ölçümü diye sunma.
- `static-batch.js` yalnız açıkça sabit kabul edilen opak mimari parçaları birleştirir. Malzeme, UV, normal ve gölge özellikleri korunur. Kova seçim yüzeyleri, hareketli dondurma, çan/çan dili kökleri, saydam efektler ve incelenebilir kültür nesneleri ayrı kalır.
- `render-size.js` değişmeyen ekran boyutunda GPU/2B tamponlarını yeniden kurmaz; çözünürlük/DPR ve kamera kadrajını düşürmez. Girdi iptali ve gerçek boyut değişimi işlenmeye devam etmelidir.
- Süresi biten ortak parçacık kaynakları son parçacıkta bir kez bırakılır; tur sıfırlama da canlı kaynakları bırakır. Ses bitişinde yalnız o notanın geçici gain/pan düğümlerini ayır; ortak mikserleri veya fade sürelerini değiştirme.
- `deforming-tube.js` sünen üç şeridin sabit GPU tamponlarını günceller. TubeGeometry ile aynı örnekleme, normal, UV ve indeksler korunur; topoloji/7 fizik yinelemesini azaltma. Hareket eden eğrinin yay uzunluğu önbelleği ve sınır küresi her güncellemede yenilenir. Her kare `new TubeGeometry`/`dispose` yolunu geri ekleme.
- Uçan geçici top kendi geometri/malzeme kaynaklarına sahiptir; inişte ve tur sıfırlamasında bırakılır. Fırlatılan külah/peçete kopyaları özgün modelle kaynak paylaşır; onların geometri/malzemelerini süre bitince silme.
- `/tests/mobile-soak-preview.html` gerçek sahneyi 1–8 top ve tekrarlanan rutin/uçuş/efektlerle uzun süre ölçer; kayıt dosyasına erişmez. Varsayılan300 saniye. CPU/RAF aralığı ve 10 saniyelik kaynak sayımlarını kaydeder. Mobil boyutlu masaüstü tarayıcısını fiziksel telefon/ısınma testi olarak raporlama.
- Fiziksel Android ölçümü: önce `android:sync`, sonra `android:soak:assets` ve Gradle `assembleDebug` ile tanılama APK'sı hazırlanır. `scripts/native-soak.py --serial <fiziksel-cihaz> --output <çıktı>` 2/4/8 top senaryolarını yerel WebView'da çalıştırır; yalnız uygulamanın logları, bellek ve termal sayımları okunur. Otomatik giriş yalnız debug uygulamada `maras_soak` intentiyle açılır; kayıtlar silinmez. `android:apk` tanılama varlıklarını otomatik temizler. Ölçüm bitince normal APK'yı `install -r` ile güncelleyip normal başlangıca dön; tanılama paketi dağıtma.

## Yakın POV ve kesintisiz tur akışı
- Sipariş onayı ve oyun başlangıcında `endPointerInteraction()` çağırma; basılı dokunma aynı pointer/epoch ile devam eder. Gerçek bırakma/iptal/odak kaybı ve tur sıfırlama iptal etmeye devam eder.
- Başlangıç külahı yalnız teklif sırasında hafif emissive nabızla vurgulanır; alınırken vurgu temizlenir. Boş el hafif nefes/çapraz POV duruşu taşır, ileri-geri uzanırken açısı değişir; giysi/kol uzatılmaz.
- `pole-hygiene.js` çubuk üzerindeki dondurma, kalıp ve boş külahı yük sayar. Masa vuruşu yalnız gerçekten boş çubukla yapılır. AFK'da külah diğer eldeyken `vendorPoleFree` yakındaki topa manyetik yeniden yapışmayı engeller; kovayı karıştırıp boş çekme gerçek hazneyi kullanır.
- `ServingClearance` tezgâh bulunan sahnede dolu usta/çubuk servisinin alt sınırını korur. Tablaya değen poz düzeltildiğinde gerçek kol tutuşları yeniden çözülür; nesne sahipliği değişmez. Alıcının eline devir, hazırlanmış kavrayışa gerçek teması bekler.
- Dirsek sunumu önceki karenin pozunu referans alır; dışa/aşağı ve öne doğal dirsek yönünü, gövde/tezgâh açıklığını korur. Boş çubuk tutuşu gövdenin önünde tutulur. Sırttan gösterinin özel tutuş ipuçlarını rastgele değiştirme.
- Geliştirmede `/?flow-check=1` basılı temas/külah sahibi/kamera fazını görünür raporlar. Android debug `maras_flow_probe` aynı parmağı kaldırmadan alma → renk → oyun geçişini gerçek WebView dokunma olaylarıyla dener; normal açılışta çalışmaz.

### Göreli telefon kontrolü (v24)
- Üretim dokunması `relative-touch.js` ile görünmez touchpad: gerçek basış yalnız ekrandaki mevcut parmak ucunu başlangıç alır; sürükleme piksel farkını hedefe ekler. Basış konumu el konumu değildir. Parmak kaldırıp farklı yerden sürüklemek birikir. Fare hover mutlak kontrol olarak kalır.
- Normal bırakışta 40ms geçiş payı + 260ms smoothstep ile toplam 300ms içinde ilk konuma dönüş olur. Ham sürükleme 1.5 katsayıyla sanal hedefe aktarılır; çift dokunma kontrolündeki travel ham piksel kalır. Basılı sabit parmak dönmez: sipariş, bekleme ve ritim tutuşları korunur. Dönüş yalnız sunumdur; normX/Y, hız, gesture history ve fiziksel pointer epoch üretmez. Blur/cancel/yeniden başlat/gerçek boyut değişimi denetimi sıfırlar.
- `TouchReach.updateAim()` sanal parmak ucu hedefini ofsetsiz projekte eder; `PointerTipView` aynı hedefi canlı kamerada hizalar. El/kol uzunluğu fiziksel basışa bağlanmaz. Tekrar basışta görünen el yalnız o gerçek basış için okunur; kareler arası el/kamera geri beslemesi yoktur. Sürükleyip yeniden basmak çift dokunma sayılmaz.
- Kısa bilgiler üst alanda, hareket talimatı ve konuşma `hud-layout.js` ile can barının 52px altından başlayan ortak satırdadır; can barı konuşma sırasında gizlenmez, telefonun güvenli üst boşluğu korunur. Konuşma geçici olarak puanın yerini kullanır; siparişte aynı sözün iki kartta tekrarı yoktur. Yatay ekranda bilgi alanı sol kenara geçer. Kamera yakınlığı ve dört kova çerçevesi korunarak bakış yukarı alınır.
- `tests/relative-control-preview.html`: gerçek oyunda art arda iki sürükleme, gecikmeli dönüş, sabit tutuş ve parmağı bırakmadan külah/sipariş/oyun geçişini PointerEvent üzerinden ölçer. Android debug `maras_flow_probe`, WebView MotionEvent ile aynı akışı ve yeniden basışı dener.

### Doğal el ve tezgâh etkileşimleri (v25)
- `playerFreeHandRotation` ve `HandRig.relaxed`: sağ elin başparmağı yukarıda, avuç içi yana dönük, parmaklar hafif kıvrık. Serbest elde parmak ucu noktası yok. Külah ve peçetenin fiziksel tutuşları mevcut ortak grip sisteminde kalır; eşya üzerinde işaret pozu kullanılır.
- `counter-interactions.js` boş el/gerçek giriş kontrolünü skor sisteminden ayırır. Çanlar gerçek kullanıcı hareket segmentinde birer kez çalar; bırakış dönüşü ve taşınan külah/peçete temas yaratmaz. Yüze dokunma, iki saniyelik tekrar sınırıyla kısa kızgın yüz/geri çekilme ve ses üretir; can/puan değişmez.
- `hand-interaction-intent.js`: aynı görünür nesnede 1.5s tutuş, daralan saydam halka ve hafif görsel uzanma. `CulturalScene.pickFromCounter` ustanın veya tezgâhın arkasındaki görünmeyen nesneleri seçmez. İnceleme oyunu sıfırlamaz; mekanik zamanı/nesne sahipliği korunur ve animasyon döngüsü duraklar. Açan tutuşun bırakılması incelemeyi kapatmaz.
- `order-patience.js`: ilk top seçilmeden dört saniye geçerse boş çubukla üç masa vuruşu, sonraki uyarıda çanlar. Ses yalnız gerçek uç temasıyla çalar. Dondurma seçme tutuşu başlarsa uyarı biter; kendi kendine top seçilmez veya müşteri külahı alınmaz.
- Kovalardan yükselen eski küre/sis geometrileri kaldırıldı. `tests/counter-interactions-preview.html` normal PointerEvent yolundan çan, burun, 1.5s keşif, siparişte bekleme ve ardından seçim testlerini çalıştırır.

### İlerleme, senkron ritim ve analitik (v28)
- `progression.js`: tempo = 1 + 0.30*log(stage); 1. bölümün gerçek tabanları oyun0.78, müzik0.85 olarak korunur. `getStageConfig`30katalog karşılaşmasından sonra ustalık turlarını üretir; hız üst sınırı yoktur. Sonraki artışlar küçülür. Külah/peçete sahibi ve ham hareket doğrulama eşikleri tempo hesabından ayrıdır.
- `RhythmClock` oyun ve müziğin ortak, dt ile ilerleyen mantıksal saatidir. Turda eski `setTimeout` müzik döngüsü kapatılır. Hareket sinüsleri aynı saati, hazırlık zincirleri ölçekli dt'yi kullanır. Gerçek çan/tezgâh teması ve numara geçişi eşliğe ortak anda vurgu verir; sıkışmış notalar bir karede sınırsız üretilmez. Ham gesture dwell hâlâ gerçek saniyedir.
- Sonsuz tur kayıtları `endlessResults` nesnesinde seyrek tutulur; eski30skor/yıldız dizileri büyütülmez. Eski10ve30bölüm kayıtları korunur, son karşılaşma kazanılınca31açılır.
- `GameAnalytics` yalnız resmî web hostlarında mevcut `window.havenProject.track` adaptörüne game_started, round_started, game_engaged, round_completed, round_failed olaylarını aktarır. DNT/GPC ve localhost sessizliği korunur; ad, e-posta veya kalıcı oyuncu kimliği yoktur. Tracker geç yüklenirse32öğelik ve30denemelik sınırlı tampon vardır. Bölüm, sonuç, görünür oyun süresi ve sürüm izinli metadata'dır.
- Özel panel: https://analytics.ipekbayrak.com.tr/owner/apps → Maraş Dondurmacısı. Sayaçlar olay toplamıdır, kişi adı veya tekil oyuncu sayısı değildir. İnceleme/dialog/arka plan süresi oynama süresine eklenmez.

### Rastgele renk şakası (v29)
- `flavor-feint-plan.js`: tur başlangıcında%35olasılıkla yalnız son sipariş topu için farklı bir renk seçer. Mümkünse siparişte hiç bulunmayan renk tercih edilir. `selectedFlavors` ve kayıtlı sipariş değişmez. Her tur en fazla bir kez olur.
- Son topun gerçek hazırlığı geçici renkle kendi kovasında yapılır. Hazırlıktan sonra iç sunum adımı `FLAVOR_FEINT_RETURN` iki uzat–çek yapar; aynı külahı ustanın eline geçirir, yalnız yanlış topu alıp kendi kovasına geri bırakır, istenen kovadan doğru topu çıkarıp yerine koyar ve çubuğa geri bağlar. Alt toplar yeniden dizilmez.
- `flavor-feint-show.js` yalnız mevcut carryScoop ve sahiplik/çubuk temas sistemini kullanır. Bu varyasyon bedava puan/can kaybı üretmez; seyir anında AFK cezaları işlemez. Son servis öncesi renkler siparişe göre doğrulanır. Reset, yanlış rengi ve taşınan geçici topu temizler.
- `tests/flavor-feint-preview.html` gerçek modeli evre evre incelemek için; `tests/flavor-feint-show.test.js`1/2/5/8topta gerçek devirler, kova dönüşü, renklerin düzelmesi ve iptal temizliğini çalıştırır.

### Yanlış rengi elle reddetme (v30)
- `flavor-refusal-gesture.js` ham pointer konumundan kesintisiz sağ–sol veya sol–sağ hareketi tanır. Her yönde ekran genişliğinin %4,5'i (14–28 CSS px), toplam 0,12–1,2 saniye gerekir. Küçük titreme, tek yön, dikey hareket, bırakıp yeniden dokunma ve kamera/el animasyonu sayılmaz.
- `flavor-refusal.js` yalnız yanlış top görünürken kendi hazırlık/sunum aşamalarında çalışır. Kesme, ritim ve sekiz çizme değerlendirmelerine katılmaz; puan/can/sipariş değiştirmez. Tek kez şaşırıp gülümseyen usta tepkisi ve mevcut kahkaha sesi tetiklenir.
- Sunumda kısa sağ–sol ipucu vardır. Reddetmeden sonra iki uzat–çek ve mevcut fiziksel renk düzeltme devam eder. Geç reddetmede iki hareket mevcut pozdan tekrar başlar. Oyuncu reddetmezse 4 gerçek saniye sonra otomatik eski şaka akışı sürer; ek zorunlu hamle veya ceza yoktur.
- Gerçek sahneli önizlemedeki `İstemiyorum ↔` gerçek algılayıcıdan geçer; testler yanlış hareketleri, bağlam izolasyonunu, tekrar ses basmamasını, son rengi, ipucu temizliğini ve otomatik devamı denetler. Ham el hareketleri analitiğe gönderilmez.

### Kısa zil serileri, biriken külahlar ve kesintisiz peçete (v31)
- `idle-bell-phrase.js`: AFK ve sipariş beklemesinde 2–3 komşu çan, her biri 360 ms. Seri kendiliğinden tekrarlanmaz; mevcut bekleme evresinin kalanında boş çubuk dinlenir. Ses/salınım hâlâ yalnız gerçek uç temasında oluşur; aktif çan ritmi numarasına uygulanmaz.
- `collected-cones.js`: müşterinin kazandığı ve numarada işi bitmiş boş gofretler sağdaki tepsiye 500 ms'de yerleşir. İç içe numarada tekrar kullanılacak külah erkenden alınmaz. Tur içi sayaç, tekrar anahtarı ve en fazla18paylaşımlı model; tam tur sıfırlamasında temizlenir, malzeme/geometri silinmez. Puan/can/kayıtlar değişmez.
- `NapkinReturn`: aynı peçete müşteri elinde kalır; müşteri hafifçe öne uzatırken usta gerçek temasta alır, külahın altına taşır ve 350 ms'de sarar. El yetişmiyorsa süre doldu diye nesne aktarılmaz. `paperReturnHandTarget` yalnız görüntü koreografisidir; ham joystick ve hareket kanıtına yazmaz. Yeni kâğıt kopyası/atış yoktur. Normal peçete numarasının140geri kazanma puanı gerçek sarma bitince bir kez verilir. Elden ve katmanlı serviste aynı yardımcı kullanılır; sarılan kâğıt sonraki numarada külahın altında kalır.
- Sipariş ana oyundaki `RelativeTouchController` (1.5kazanç/300msdönüş), `TouchReach`, `PointerTipView` yolunu paylaşır. Eski `OrderReach` onay uzanması üretimde kullanılmaz: kovadaki kısa ışık onaydır, kontrol derinliği oynamaz. `TubOrderView.pick` görünen dört kovayla isimlerini kapsayan bölünmüş geniş alanlar ve5px sınır toleransı kullanır. Sayı/renk dizisi,420msbilinçli tutuş ve1/.8/.6/.45sonlandırma süreleri aynıdır.
- `tests/relative-control-preview.html?stage=21&phone=1`: gerçek PointerEvent ile394×853içerikte dört kovayı isim hizasından seçme, onay sırasında el hizası/derinliği ve parmağı kaldırmadan oyun geçişi. Peçete testi gerçek eklemli ustalarda2/8topu, fiziksel temas ve nesne kimliğini denetler.

### Kesintisiz numara geçişleri (v32)
- `trick-transition.js`: `_enterRoutineStep` mevcut çizilmiş pozdan başlar. Aynı külah/top/peçete modelinin dünya dönüşümü girişte korunur; yeni numaranın ilk güncellemesindeki gerçek hedefe gider. Genel nötr poza veya tahminî başlangıca sıçrama ekleme. Poz bağlantısı .22–.58 gerçek saniye; mesafe/açı ve tempo hesaba katılır. Kazan/tezgâh hedeflerine önce yukarıdan gidilir. Kesintisiz hızlı hareketin kendisini kopukluk sanmamak için önceki adım/hız farkı izlenir.
- `serving-handoff.js`: girişte veya otomatik geri almada oyuncu/usta/çubuk sahipliği değişecekse aynı nesne önce gerçek alıcıyla temas eder. Usta alma için mevcut `_prepareIdleServing`, çıplak çubuğa dönüş için `VendorPoleRejoin` kullanılır. Oyuncunun aktif yakalamaları ve zaten temas eden devirler kendi mekanik yolunu korur. Yalnız parent değiştirmek animasyon değildir.
- Bağlantı/el değiştirme/ilk peçete hazırlığı sırasında yanıt penceresi, AFK ve puan işlemez; ham hareket geçmişi tazelenir. Müzik ortak RhythmClock ile akmaya devam eder, bitişe vurgu yapılır. Havadaki yakalama uçuşuna yeni gecikme eklenmez. AFK gerçek temasla döndüyse ikinci bir bağlantı/yönerge gecikmesi eklenmez. Reset/end/yeniden giriş eski bağlantıyı temizler.
- `vendor-hand-blend.js` serbest sol elin avuç/parmak geçişini260ms'de yapar; gerçek kavrama veya bilek noktası korunur ve önkol tekrar oturtulur. Çubuk destek elinin mevcut güvenli `VendorSupportReach` yolunu bozma. Ustanın el çerçevesi değiştiğinde tuttuğu külahın dünya açısı önce korunur, sonra istenen yatışa gider.
- Yeni peçete önce erişilebilir çalışma konumunda ustanın elinden gelir, açılıp aynı külahın altına sarılır, sonra teklif pozu başlar. İleri uzatılmış külahı yetişemeyen ele sardırma. Eski sahte külahın beyaz üst kalıbı kaldırıldı; boş ağzı açık gofretin altında kâğıt kılıf var. Oyuncudaki aynı görsel de buna uyar; tek peçete yassı kâğıttır.
- Dev kalıp ilk karede havada belirmez; mevcut kazan çıkarma yolu görünürlüğü yönetir. Normal toplar aynı servisin parçası olarak görünür kalır; kalıp hazırlanırken/topa otururken yok edilmez. Kazıma şeridi gerçek kazıma aralığından önce açılmaz. Peçete yemini bekleyerek geçen oyuncuda aynı sarılı kâğıt kaybolmaz.
- `tests/transition-preview.html`: herhangi bir mevcut pozdan bütün temel numaralara giriş ve peçete kontrolü. Katalog testleri2/8topla aynı servis nesnesinin giriş dönüşümünü ve kare sıçramalarını ölçer. Tam giriş testi fiziksel el değiştirme ve peçete hazırlığının bittiğini de denetler.

- Otomatik teslim/geri almada oyuncunun eli alçakta veya erişimin dışındaysa aynı el .5s'de çalışma alanına uzatılır; devirden sonra yumuşakça geri döner. `paperReturnHandTarget` ortak gösterim yoludur; ham `intentWorldPos`, joystick ve epoch değiştirilmez. Bu durum için gerçek rig/kazan testi vardır; temas şartı oyunu kilitlememelidir.

### Aktif servis, gerçek kazıma ve zil sürprizi (v33)
- `scrape-serving.js` kazıma yolunu gerçek metal uçla eşler: hazneye45mm giriş, yatay/oval kazıma, yüzeyden top kaldırma, aynı topun külaha aktarılması. Boş uçta `presentationStrikeTip`, top taşırken `PoleContact` kullanılır. Kazımada ince düz sünme şeridi yoktur; kesme mekaniğinin esnek şeridi korunur. `contactPathOwnsMotion` bu zaten sürekli temas yoluna ikinci bir genel bağlantı animasyonu eklenmesini engeller.
- Normal toplar kalıp gösterisinde aynı külahla ustanın diğer elinde görünür kalır; kalıp çıkarma ayrı nesnedir. `WHOLE_MOLD_ON_CONE` ile `SCOOP_LIFT_BACK` ayrı dallardır; test her ikisinin gerçek hareketini denetler.
- `NapkinReturn` kısa alma/sarma evreleri ve kararlı doğrudan bilek hedefi kullanır; uzun zorunlu beklemeler yoktur. Kesme pozu doğal el çerçevesine göre küçük göreli bilek dönüşüdür; mutlak Euler açısıyla kolu devirmemelidir.
- Çift külah/peçete yakalandıktan sonra bilinçli aşağı çekiş gerekir. Katmanlı serviste1/6/8/10adımlarında çekiş,4'te geri uzatma gerekir. Topları kaldırma numarasında önce dolu külah müşteriye geçer, müşterinin çekişiyle aynı toplar ayrılır. Sabit bekleme ve eski hız verisi bunları tamamlamaz. Hareket çizgileri `pull`/`return` üzerinden gelir; puanlar bir kez korunur.
- `CollectedCones` yan taraftaki gerçek `coneRack` haznesinin içinde dik, iç içe birikir. Serçe parmağına bağlama veya stok var diye sol eli zorla pozlama. `take(target)` hazneden numaraya animasyonlu geçiş yapar; çift külah/katmanlı servis/sahte külah/havaya atma ve aktarma bunu kullanır.18paylaşımlı model sınırı ve tur sıfırlaması korunur.
- `TubOrderView.pickCone` görünen külahın uç/gövde/ağız izdüşümünün kova alanıyla çakışmasını da seçim kabul eder. İlk seçim yapılana kadar dört kova hafifçe parlar; ilk külah teklifi el hareketinden sonra parıldar. Tek top seçilip durulunca bir kez “Sadece bir mi?” sorulur; yalnız ilk topun bitiş süresine350ms eklenir (1.35s). Sonrakiler .8/.6/.45s kalır.
- Bekleme zilleri%75rastgele2–3farklı çan,%25tam yedi çan sırası (iki yönde) seçer. Ses gerçek temasla çalar, usta çalınan çanlara bakar. Sipariş beklemesi tam diziyi kesmez.
- `BellMelodies` yalnız ilk külah teklifinde insanın gerçek çan vuruşlarını tanır. Neşeye Övgü, Twinkle ve kullanıcının do-do-re-mi-mi-re-do-re-mi-do motifine yanıt vardır. Devam dt ile aynı zilleri çalar; otomatik notalar tanıyıcıya geri verilmez. Başlangıç, oyun içi temas ve otomatik melodi yanıtı aynı metalik zil sesini kullanır; başlangıca özel do–si sesi veya farklı tını yoktur. Başlangıçtan ayrılma/arka plan/sıfırlama çalmayı durdurur; skor, kayıt veya ağ olayı eklemez.

### İlk hareket sesi ve sabit POV omzu (v34)
- `SoundEngine.unlockFromGesture()` gerçek pointerdown/up, touchend ve keydown yakalama aşamasında çağrılır. Sessiz tek örnekli kilit açma kaynağı aynı olay yığınında başlatılır; resume asenkron tamamlansa da sonraki sesler çalışır. Genel `init` askıdayken işitilebilir ses biriktirmez. Sessize alma korunur, reddedilen açma tekrar denenebilir; kapalı context yeni mikserle kurulur, ortak ritim saati kopyalanmaz. Fare hover tek başına tarayıcı etkinleştirmesi değildir; ilk gerçek tıklama/dokunma yeterlidir.
- v36 düzeltmesi: `player-arm.js` yalnız .24m önkol ve .09m dar manşet çizer. Omuz/üst kol ve kameradan ele köprü çizilmez. Önkol bileğin doğrultusundadır, içeri ters dirsek bükümü yoktur. Eski omuz erişim küresi derinlik düzeltmesini geri getirme: parmak ucunun görünür hedefi, ham intent ve joystick korunur.
- `PointerTipView` son kamerada aynı ekran ucunu korur. Kol boyunu büyütmez. `tests/player-arm.test.js` serbest/külah tutuşlarında doğrultuyu, sabit kısa boyu ve ucu denetler. Sesin ilk dokunuş kontrolü `/tests/audio-unlock-preview.html` üzerindedir.

### Ekranda kalan eksenel yakalama (v35)
- `reach-offer.js` eksenel çevirmenin iki uzatış yolunu etkin kameraya ve servis büyüklüğüne sığdırır. İkinci uzatışın eski −.40m ucu yakın telefon kadrajından taşıyordu. Kare kare kenara yapıştırmak yerine sinüs yolunun genliği orantılı küçülür; geniş kadrajda eski yol aynen kalır. Gerçek mantıksal hedef, yay, dondurma ve yakalama ipucu aynı yolu paylaşır.
- Çok toplu eksenel teklifte genel aşağı indirme uygulanmaz; kısa telefon ekranlarında gofret görünür kalır. Diğer gösteriler, boş çubuk darbeleri, devirler, kamera, ham kontrol, süre ve puanlar değişmez.
- `tests/reach-offer.test.js` iki aşamada gerçek model sınırlarını ve bıçak temasını 1/4/8 top × 3 ekran boyutunda denetler; dokunma girdisiyle iki yakalama toplam420puanı korur. `/tests/reach-offer-preview.html` aynı numarayı yalıtan, kayıt dosyalarına erişmeyen görsel/etkileşimli kontroldür.

### Görünür temas ve başlangıç seçimi (v36)
- `SCOOP_LIFT_BACK` ilk dolu külah teklifi, `customerServiceTarget` / `reachVisibleService` ile aynı yeşil alanı çizer ve test eder. Ustanın elindeki külah z≈−.026 iken giriş düzlemi z=.26 olduğundan eski3B .28mesafe testi tam üstünde bile reddediyordu. Ham hareket/yeni temas ve kısa tutuş doğrulaması korunur; yakalamadan sonra aktif aşağı çekiş gerekir. Sadece etiket/halka taşımak çözüm değildir.
- Yakalama halkası gerçek test yarıçapındadır ve yumruk simgesi taşır; altındaki eski yukarı oku yakalama yönü diye yeniden ekleme. Çekme/geri uzatma işaretleri kendi adımlarında kalır.
- İlk fiziksel külah devri bitince sipariş doğrudan açılır. `ConeIntroduction.orderIntentAnchor` alma anındaki ham parmağı tutar; ilk renk için bu andan sonra6pxgerçek hareket veya yeni temas yeterlidir. Aynı kovanın üzerinde hareket etmek geçerlidir. `ignoreInitialHover`/kovadan çıkıp tekrar girme kilidi ve ek .7s selamlama gecikmesi yoktur.420ms seçim ve tekrar/bitiriş kuralları aynıdır.
- `orderTubPulse` kovaları700msaralıklarla sırayla altın kenar ışığıyla gösterir. Dondurma materyalini beyazlatma; ilk seçimden sonra sırayla yanma durur, odak/ilerleme halkası kalır.
- Sağ çubuk eli üstten kavrar, başparmak sap yönündedir; sol destek eli korunur. Aday bilek hesaplaması ve çizilen el aynı çerçeveyi kullanır, dönüş hız sınırı korunur.
- `/tests/reach-offer-preview.html?lift=1` bildirilen takılmayı gerçek sahnede açar. `tests/visible-lift-grab.test.js` arkada duran gerçek hedefe fare hover/dokunmayı ve yanlış/pasif girdiyi kontrol eder. `/tests/relative-control-preview.html?phone=1` gerçek oyunda parmak kaldırmadan ilk seçim/oyuna geçiş ve dört lezzet seçimini denetler.

### Gerçek kova/kalıp sahipliği (v38)
- `tub-mold.js` / `TubMoldTransfer`: gösteri taşıyıcısı `giantBlockGroup` sabit kalır; her lezzetin gerçek model grubu kova ile bu taşıyıcı arasında taşınır. Kalıp çıkarılırken eski kova yüzeyleri gizlenir ve fill=0 olur. Geri dönüşte aynı model gerçek oturma noktasına yerleşir; eski yüzey yeniden görünmez, dolu kovayı yerine konan model oluşturur. Başka lezzet hazırlanırken önceki modelin rengi/sahibi değişmez. Dört model/malzeme sınırı, paylaşılan geometri; kare başı model üretme yok.
- `getTubMoldSeat` eğimli haznenin gerçek yuvasını verir. `align` ağızdan geçerken kalıbı kova eksenine hizalar. Normal/havada takla/usta külahına/müşteri külahına kalıp yolları aynı giriş-çıkış kullanır. Dönüş önce ağzın üstüne, sonra içine olur. Kalıp dışarıdayken doluluğu artırma veya kovanın içinde yüzde25/32 dondurma bırakma.
- Çelik tezgâh geometrisinde dört gerçek kova açıklığı bulunur. .33m derin çelik duvar ve taban, kalıp kaldırılınca görünür; opak bir tezgâh düzlemini kova içine geri koyma. Çan/masa temas noktaları değişmez.
- `StallEffects.clearMold` kesinti/tur sıfırlamasında aktif modeli yuvasına geri bağlar. Kullanıcıya ait külah ve seçili toplar ayrı kalır. `/tests/tub-mold-preview.html` dört numarada boş/dolu kova ve aynı model kimliği kontrolüdür. `tub-mold.test.js` kimlik/renk/hizalama/kaynak sınırı; `tub-opening.test.js` gerçek açıklıkları ışınla denetler.

### Hızlı ve bilinçli kesme (v39)
- `StretchCutGesture` kesme için son180msiçindeki gerçek ham hareketi, ekran ölçeğine göre220–480CSSpx/sasgari hızı, mevcut32–60pxmesafeyi ve dondurma eksenine en az65°açıyı ister. Hız yalnız kesme için geçerlidir; külah çekme/atma, yakalama ve ritim eşiklerini değiştirme.
- Hareket dondurmayı geçip dışına çıkmalı veya dondurmaya bastıktan sonra hızla dışarı savrulmalıdır. Ortasına gelip durmak kesmez. Son hareketin anlık ve yakın geçmişteki net hızı da doğrulanır; küçük titreme eski savurmanın hızını kullanamaz. Hareketsiz karede eski hareket yolu yeniden denenmez; sallanan dondurma eski yola girip kendi kendine kesilemez. Basınç/esneme ve100mskopma animasyonu korunur.
- `gestureState.frameTime` gerçek RAF zamanıdır: oyun temposu veya sınırlanmış fizikdt'si yavaş hareketi hızlı saydıramaz. Fare hover ve göreli dokunma aynı kontrolü kullanır; ipucu “HIZLICA DİK KES”.
- `stretch-cut.test.js`15/30/60/120Hz, yavaş/hızlı aynı yol, ortada durma, sonra savurma, bekleyen ele kayan dondurma ve kare gecikmesini kapsar. `/tests/stretch-cut-preview.html` basınç/yavaş/hızlı hareketi gerçek sahnede ayrı düğmelerle denetler.

### Peçete sarma adımının ilerlemesi (v40)
- `NapkinReturn.prepareWorkPose` çubuktaki külahı sarma sırasında iki elin erişebildiği (.18,1.31,−.16) çalışma konumuna280msyumuşak yolla getirir. Önceki sağ taraftaki/screen-left `POLE_REST` konumunda Pala ve Haydar'ın iki toplu külahında sol el temastan40–45mmuzakta kalıyor,35mmeşiğini hiç geçemediği için carry sonsuza kadar bekliyordu. Temas eşiği gevşetilmez, süre dolunca nesne ışınlanmaz veya oyuncu hamlesi atlanmaz.
- Yol mevcut çizilmiş poz/açıdan başlar; gerçek temasta aynı kâğıt külaha bağlanır. `contactPathOwnsMotion` bu sürekli yola ikinci poz geçişi bindirilmesini engeller. Sarma/geri çekilme boyunca çalışma pozu korunur. Aynı elde tutulan veya müşterideki külah bu çubuk düzeltmesiyle taşınmaz; retrieveOnly yalnız peçete alma aşaması da etkilenmez.
- `napkin-liveness.test.js` dört usta×1–8top, büyük servis ölçeği, sonraki teklif adımına ulaşma, gerçek temas/nesne kimliği/puan ve yol sürekliliğini kontrol eder. `napkin-return.test.js` müşteri elinden alma matrisini de dört usta×1–8topa genişletir. `napkin-liveness-preview.html` eski tek-elli yaklaşmanın kilitlendiği pozu, aynı sahne/nesneden düzeltilmiş devamı karşılaştırır.

### Tam numara akışı taraması (v41)
- `tests/encounter-fixture.js` gerçek kova/tezgâh, kol IK, peçete/külah sahipliği, esnek dondurma ve uçan nesne fiziğini çalıştırır; renderer olmadan geniş matris, gerçek `GameWorld` verilerek tarayıcı/Android kontrolü yapılır. `_applyKinematics`, temas denetimleri veya adım ilerletme sahteleştirilmez. `tests/encounter-driver.js` sadece geçerli oyuncu girdileri üretir; sahne/puan/can/süreye müdahale etmez.
- `npm run test:encounters -- --vendors 3 --counts 2,8 --pace 31 --fps 60 --output /tmp/encounters.jsonl` gerçek katalog akışını sona kadar tarar. Varsayılan64katalog kaydı+kazıma,4usta,1–8top. Bir hata varsa süreç başarısız çıkar; son hareket, temas/sahiplik ve geçiş izi raporlanır. `--campaign 1 --feint 1 --seconds 200` gerçek üretilen tam turu, yanlış renk şakası ve finalle birlikte oynatır.
- `isTimedVendorShow`: süreli gösteriyi veya bilerek reddedilen kısa yemi izlemek AFK değildir. Kalıp, takla, ters/düşürme, çan aldatması, çift külah/peçete yeminin mevcut zamanlayıcısı bitmeden AFK gösterisiyle kesilmez. Yakalama/çekme/kesme/sekiz/ritim koşulları aynı kalır.
- `FigureEightGesture` yeni temasta eski izi siler ama yeni temasın ilk merkez noktasını işler.30Hz'de ilk noktanın atlanması ilk halkayı kaybettiriyordu. Yarım halka, titreme ve bırakıp parça birleştirme hâlâ geçersizdir.
- `SCOOP_AIR_CATCH` ilk devirde mevcut `beginVendorConeReceive` pozu ile alıcı eli hazırlar; gerçek40mmtemas koşulu sağlanınca aynı külah ele geçer. Açık elin değişen çerçevesini takip ederek sonsuza dek temas bekleme sorunu giderildi.
- `tests/encounter-audit-preview.html` gerçek sahnede seçilen numara/tam turu oynatır. `scripts/build-native-soak.mjs --encounters` yalnız debug tanılama varlıklarını hazırlar; `scripts/native-encounters.py` kilidi açık fiziksel telefonda56akışı raporlar. Sonrasında `npm run android:apk` tanılama varlıklarını temizleyip normal APK'yı üretir; test bitince normal APK yeniden yüklenir. Kayıt verileri silinmez.


### Usta eli/dirsek sürekliliği (v43)
- `ServingOrientation` yalnız eksenel dönüş ile normal dönüşün koordinat yorumları arasındaki geçişi 0.32 saniyede harmanlar. `shaftRoll` veya müzik/numara zamanını değiştirme; tam fırıldak ve ters çevirme dönüşleri korunur. Aynı karedeki sıfır-dt temas düzeltmeleri bu harmanı ikinci kez ilerletmez.
- `VendorArmSolver.solveContinuous` önceki gösterilen omuz/dirseği izler; ancak gerçek kemik boyları ve gövde/tezgâh temas kontrolü hâlâ geçerlidir. Çarpışmalı bir ara pozu sırf yumuşak görünsün diye kabul etme. Tutuş adayları hızlı aramada da tezgâhı ve bilek payını denetler.
- `PoleContact` eldeki aynı topa giriş/çıkışta ayrı mesafe eşikleri kullanır. Böylece sınırda bir kare bağlanıp diğer kare ayrılmaz; bilinçli geri çekiş hâlâ bırakır.
- `tests/vendor-stability.test.js` gerçek rig ve geçerli hareketlerle kalıp → kesme → fırıldak dizisini, dirsek terslemelerini, dönüşten çıkışı ve temas sınırını denetler. Genel tamamlanma testi tek başına titreme kanıtı değildir.
