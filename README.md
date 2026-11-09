# Maraş Dondurmacısı 3D Şov (Turkish Ice Cream Challenge)

Three.js ve Web Audio API ile geliştirilmiş, birinci şahıs (POV) 3B Kahramanmaraş dondurmacısı şov ve refleks oyunu. Hem iOS/Android mobil tarayıcılarda (Tam Ekran PWA) hem masaüstünde hem de Android (Capacitor) üzerinde çalışır.

## v43: usta eli ve dirsek kararlılığı

`serving-orientation.js`, eksenel dönüşten normal poza geçerken aynı roll açısının farklı eksene uygulanmasını yumuşatır. `VendorArmSolver.solveContinuous`, yavaş hareket eden elin dirseğini önceki güvenli pozdan sürdürür; gerçek kemik boyu ve çarpışma kontrolü korunur. Hızlı numaraların normal dönüşleri korunur. Tutuş adayları tezgâhı hesaba katar; `PoleContact` temas sınırında aynı topa sürekli bağlanıp ayrılmayı önleyen giriş/çıkış payı kullanır.

`tests/vendor-stability.test.js` dönüşten çıkış, kalıp/kesme sırasında ters dirsek sıçraması ve temas sınırı için gerçek rig kontrolleridir. Kalp, puan, joystick, numara süresi ve müzik saati değişmez. CPU ölçümü gerçek telefon FPS'i sayılmaz; v43 sırasında fiziksel telefon bağlı değildi.

## v42: katmanlı servis, müzik saati ve büyük siparişler

- Peçete dış külahın gerçek konik yüzeyine sarılır: peçete → dış külah → iç külah → toplar. Aynı peçete müşteri/usta arasında taşınır; külah stok kopyalarına peçete veya top kopyalanmaz.
- Külahlar arası top aktarımında boş külah dik ve ayrı durur. İlk 30 bölümün kapasitesi korunur; 31/36/41/46. bölümlerde 9/10/11/12 top açılır.
- `src/scoop-layout.js` tek top yerleşimi kaynağıdır. İlk sekiz yerleşim korunmuştur; ilave toplar kompakt kümeye eklenir. Kapasiteyi `src/venues.js` belirler; yeni numaralarda sabit 8 sınırı kullanmayın.
- `src/music-transport.js` müziği AudioContext saatinde önceden planlar. `RhythmClock` ve numara zamanı bu saati okur. Zil/tezgah/numara geçişleri müzik sayacını sıfırlamamalıdır; `syncMusicBeat()` geriye uyumlu, etkisiz bir çağrıdır. Sessiz ve ses bağlamı olmayan testlerde deterministik kare zamanı çalışır.
- Açılış külahı ilk dokunuşu beklemeden parlar. Kamera külahın gerçek el değiştirme anında, 0.65 saniyelik geçişle sipariş mesafesine gelir.

Kontroller: `npm test`; gerçek rig ile katalog taraması için `node scripts/audit-encounters.mjs --counts 12 --pace 46 --fps 60`. Tarayıcıdaki `tests/encounter-audit-preview.html` katman/aktarım görünümünde durabilir ve gerçek müzik saatiyle oynatılabilir. `tests/relative-control-preview.html?phone=1` külah alma, ilk seçim ve kesintisiz dokunma akışını kontrol eder.

Android tanı paketi: `node scripts/build-native-soak.mjs --encounters`, ardından debug Gradle derlemesi ve `python3 scripts/native-encounters.py --serial <cihaz> --output <kanıt-klasörü>`. `VITE_NATIVE_IDS=SCOOP_CONE_RELAY,SCRAPE_FLAVOR_SCOOP` ile dar kapsamlı tekrar yapılabilir. Test sonrası **`npm run android:apk` ile normal paketi yeniden oluşturup kurun**; tanı sayfaları normal APK ve web dağıtımına dahil edilmez. Mevcut cihaz kaydını korumak için `adb install -r` kullanın.

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
- **Tezgâhta hızlı sipariş:** Gerçek kovada 0,42 saniye tutuş bir top ekler. Başka kovaya geç veya aynı lezzet için çıkıp yeniden gir. Her seçimde külahı tutan el ustaya doğru kısa bir hareket yapar. Sabit kalınca seçilen sayı onaylanır: 1. top sonrası 1 saniye, 2. top sonrası 800 ms, 3. top sonrası 600 ms, sonra en az 450 ms. Gerçek hareket süreyi yeniler; yeni top tutuşu yarıda kesilmez. Altta seçilmiş renkler, toplam ve dolan onay göstergesi vardır. Sade ve sakızlı kovaları ayrı etiketlenir. Seçim yapılmadan otomatik top eklenmez; kapasite ilerlemeyle sekize çıkar.
- **Mevcut ritim ve numaralar:** Göz göze takip, çift külah, çubuk çevirme, sünme, peçete, çan ve kalıp şakaları korunur. 18 temel numara, 36 bağlantılı koreografi, katmanlı külah–peçete servisi, dört elden servis akışı ve dört araştırma/oyun uyarlamasıyla toplam 63 oynanabilir gösteri, ayrıca final yakalama vardır. Bunlar 63 ayrı belgelenmiş geleneksel numara olarak sunulmaz.
- **Üç yeni gösteri uyarlaması:** Bütün kalıbı küçük külaha oturtma, topları çubuğa geri alıp gerçek boş külah uzatma, “biraz daha” teklif ederek eldeki külahı geri alma. Nesneler sahip değiştirir; kalıp/ek top kovaya geri döner.
- **Kesmenin sonucu görünür:** İki kesik uç büzülür, küçük parçalar düşer; hemen sonraki harekete atlamaz.
- **Ustalar misafiri hatırlar:** Ziyaret ve tamamlanan bölümlere göre karşılamalar, tepkiler ve diğer ustalara göndermeler değişir. Fotoğraf, notalar, tarif defteri ve kartpostal İstanbul dükkânı esintili tezgâh arkasında görünür ve ilerlemeyle açılır.
- **Dört usta, altı mekân, otuz karşılaşma:** İstiklal’den Ustalar Avlusu’na uzanan yolculukta siparişler büyür. İlk on karşılaşmadaki “Son Nota” hikâyesinden sonra yeni mekânlarda gösteriler sürer; isteğe bağlı defter ilk hikâyeyi saklar.
- **Seyrek oyun sesleri:** Yumuşak kısa karakter tepkileri; en az 3,2 saniye aralık, aynı tepki ailesine 7 saniye aralık, tur başına en fazla 6 tepki. Müzik ve temel efektler korunur.

Detaylı teknik ve mimari bilgi için [`CLAUDE.md`](CLAUDE.md) dosyasına bakabilirsiniz.


## Etkileşim, karakter ve hikâye kontrolleri

- Masaüstünde fareyi gezdirmek eli uzatır; dokunmatikte basılı tutup sürükleme korunur. `src/pointer-controls.js` kontrol modlarını, `src/gesture-validation.js` gerçek hareket doğrulamasını ayırır.
- `src/angular-motion.js` yalnız görsel dönüşleri yumuşatır; bölüm sürelerini ve puanları değiştirmez.
- “Son Nota” hikâyesi `src/lore.js` içindedir. `src/lore-journal.js` isteğe bağlı defteri gösterir; `src/vendor-relationships.js` canlı karşılamaları ve tepkileri, `src/stall-decor.js` sahnedeki hikâye eşyalarını yönetir. Yeni anılar yalnız başarılı bölüm bitişinde kaydedilir; hikâye kayıtları mevcut oyun kaydından ayrıdır.
- `npm test` hareket, nesne sahipliği, el eklemleri, dönüşler, ses ve hikâye kontrollerini çalıştırır.
- Performans kontrolü: geliştirme sunucusunda `/?perf=1` gerçek oyunun kare/CPU/çizim ölçümünü açar. `npm run perf:cpu -- --compare` ağır servis dönüşlerini aynı girdilerle eski çözücüyle karşılaştırır; bu CPU ölçümüdür, telefon FPS sonucu değildir.
- Sabit tezgâh/raf parçaları malzeme ve geometrileri korunarak toplu çizilir. Kol çarpışması aynı kararları tekrar eden dönüşüm ve geçici diziler olmadan hesaplar. Boyutu değişmeyen ekran tamponları yeniden kurulmaz; biten parçacık ve ses kaynakları temizlenir.
- Uzun oturum testi: `/tests/mobile-soak-preview.html` çok toplu servisleri, kesme/sünme, çan, çift külah ve uçan top yollarını tekrarlar; 10 saniyelik kare/kaynak ölçümleri verir. Bu sayfa kullanıcı kaydını değiştirmez. Telefon boyutu testi ve gerçek cihaz/ısınma ölçümü ayrı doğrulamalardır.
- Fiziksel Android ölçümü için `npm run android:sync`, `npm run android:soak:assets` ve `android/gradlew -p android assembleDebug` kullanılır. Tanılama APK'sı yüklendikten sonra `python3 scripts/native-soak.py --serial <cihaz> --output <klasör>` 2/4/8 top, bellek ve sıcaklık raporu toplar. Normal `npm run android:apk` tanılama ekranlarını paketten temizler.
- Geliştirme sunucusunda `/tests/visual-preview.html` animasyon karelerini, `/tests/audio-preview.html` karakter tepkilerini incelemek içindir. Bu kontrol sayfaları üretim derlemesine dahil edilmez.

- `src/order-flow.js` top seçimini ve ham imleç hareketsizliğinden otomatik onayı, `src/order-view.js` gerçek kova yüzeylerine ışın seçimini ve seçilmiş top görünümünü yönetir. `src/order-reach.js` yalnız seçim sonrası elin uzanma pozudur; ham avuç hedefini, top seçimini veya süreyi değiştirmez. Kova seçimi `aimNorm`, süre yenileme ham CSS piksel koordinatlarını kullanır. Sipariş oyunun puan/kalp hesabına girmez.
- `src/trick-extensions.js` yeni numaraların durumlarını ve kaynaklarını içerir. Gösteri hareketleri gerçek hizmet jestlerinden uyarlanmıştır; numaraların isimleri oyun için verilmiştir. Referanslar: [GoTürkiye](https://goturkiye.com/blog/traditional-maras-ice-cream-and-its-history), [birinci el İstanbul gösterisi](https://daydreamtourist.com/2012/07/05/istanbul-ice-cream-show/), [GoPro / Vedat Dumanli](https://www.youtube.com/watch?v=Jx_NjpeBqQw).


## Mekânlar ve servis fiziği

- `src/venues.js` altı mekânı, sipariş kapasitelerini ve 30 karşılaşmayı tanımlar. `SaveManager.completedStages` yalnız gerçek galibiyetleri izler; eski sıralı açılma bilgisi ve açık hikâye galibiyetleri ödül vermeden taşınır. Başarısızlıkta kazanılan yıldızlar galibiyet sayılmaz.
- Mekân seçimi numaralı bölüm ve hile listelerinin yerini alır. İlerledikçe 5–8 topluk daha geniş servisler açılır; hedef, görüntü ve el teması birlikte hareket eder.
- `NAPKIN_CONE_FAKEOUT` gerçek külahın altına sarılı tek bir peçeteyi kullanır: peçeteyi tutma, külahın çubukla geri çekilmesi, peçetenin elde açılması, savurma ve gerçek teklif.
- Tezgâh/kova vuruşunda ses yalnız spatula ucu gerçek yüzeye ulaştığında çalar. Kazıma ve sünme numarası menü/sipariş sırasında başlatılmaz; `startRound()` ilk etkin numarayı açar.
- `/tests/serving-preview.html` peçete devri, gerçek temas ve farklı mekânlardaki büyük servisleri kullanıcı kaydını değiştirmeden incelemek içindir.


## Tezgâhtaki 108 ayrıntı

Sağ üstteki **Seçenekler → Etrafa bak**, seçili mekânın tezgâhını yakından açar. Üç rafın her birinde altı gerçek sahne nesnesi bulunur; nesneye dokununca aynı nesne raftan alınır; sürükleyerek döndürülebilir, kısa animasyonu ve küçük bilgi kartı açılır. Sayısal keşif sayacı gösterilmez. Altı mekânda toplam 108 farklı eşya vardır: mutfak, el sanatları, çocukluk oyunları, müzik, misafirlik ve sokak hayatı. Kültürel bilgiler kaynak bağlantılıdır; ustaların anıları açıkça oyun kurgusu olarak ayrılır. Keşif kayıtları oyun ilerlemesinden ayrıdır; bu görünüm tur dışında açılır.

- `src/cultural-details.js`: 108 Türkçe/İngilizce eşyanın bilgisi, kaynakları, özgün anısı, mekânı ve model çeşidi.
- `src/cultural-scene.js`: modeller, aynı nesneyi yakından inceleme, raf kameraları ve geri bırakma. Yeni model aileleri burada geliştirilir.
- `src/discovery-progress.js` / `src/discovery-ui.js`: yalnız geçerli eşya kimliklerini saklayan bağımsız kayıt ve sahneye bağlı dokunma hedefleri. Normal oyun ekranına eşya listesi eklenmez.
- `src/trick-routines.js`: kaynak hareketleri, 36 yazılmış gösteri, geçişleri ve aşamalı açılma. Başka bir numara eklerken kaynakta görülen hareket ile oyun için tasarlanan bileşimi ayrı belirt. Yalnız ad/renk/ayna değişikliği yeni numara sayılmaz.
- Yeni içerik önce ilgili veri/modül dosyasında eklenir; `main.js` içine büyük katalog veya yeni durum makinesi gömülmez. `npm test` sahiplik, doğru/yanlış giriş, sıfırlama ve ilerleme regresyonlarını kapsar.

- Geliştirme önizlemeleri: `/tests/culture-preview.html` tüm mekân/raf/nesneleri kayıt değiştirmeden gösterir; `/tests/routines-preview.html` 36 gösteriyi gerçek sahne ve girdilerle oynatır, kare kare durdurur ve tutuş mesafelerini ölçer. Önizleme sürücüsü `tests/routines-driver.js` içindedir; üretim oyunu otomatik oyuncu içermez.

- `src/touch-reach.js` parmak ucunu telefonda basışın sabit44px, farede28px önünde tutar. Kol/giysi dokunma noktasına uzatılmaz. Ham hareket doğrulaması ayrıdır; kamera/el animasyonu hamle sayılmaz. `/tests/pointer-order-preview.html` gerçek oyunda kontrol yollarını denetler.
- Tezgâhta dört kova bulunur: Sade, Fıstıklı, Kakaolu, Urmu dutlu. Bütün isimler aynı anda görünür; dik telefonda kovalar ve tezgâh kenarları ekrana sığar. Menünün kaynağı `src/flavors.js`;1–8top sipariş ve ilerleme korunur. [Belediye açıklaması](https://kahramanmaras.bel.tr/maras-dondurmasi) geleneksel temeli, [yerel üreticinin menüsü](https://www.edo.com.tr/urunler/maras-dondurmasi) seçilen çeşitleri destekler; sabit bir geleneksel çeşit sayısı iddia edilmez.

- `src/hand-rig.js` oyuncu ve ustaların ortak eklemli elidir; anatomik sağ/sol yönü açıkça tanımlıdır, oyuncu sağ elini uzatır. `src/hand-orientation.js` külah/çubuk kavrayışını önkola göre hizalar ve bilek dönüşünü yumuşatır. `src/touch-arm-view.js` gerçek parmak ucundaki işareti ve doğal bilek bağlantısını yönetir. `/tests/hand-rig-preview.html` tüm tutuşları ve ustanın iki bileğini karşılaştırır.
- `src/vendor-arm-solver.js` dirsek ve bilek yollarını gövdenin dışında tutar. Güvenli olmayan ikinci el kavrayışı açık destek pozuna geçer. `src/vendor-flourish.js` boş çubuğu kalça/sırt çevresinden dolaştıran isteğe bağlı AFK gösterisini taşır. Külah ön elde kalır, oyuncu hareket ettiğinde usta güvenli yoldan geri döner. `/tests/vendor-flourish-preview.html` dört ustayı, yan görünümü ve kesintiyi kontrol eder.
- `src/idle-presentation.js` ustanın bekleme gösterisi ve dönüşü boyunca gereksiz ok/yeşil izleri temizler. Hareketin tamamı telefon kadrajı içinde kalır; dönüşün son karesi sessizdir, ilk oyun güncellemesinde rehber hemen geri gelir. Yanıt penceresine ek bekleme veya rehbersiz süre eklenmez.
- `src/shop-interior.js` açık bakır servis tezgâhı, karo zemin ve sade dükkân çalışma alanıdır. `src/vendor-body.js` bel, pantolon, dizler ve ayakkabıları gövdeye bağlar; yana ağırlık aktarımında ayak basışını korur. Sabit kadrajda ustanın belini ve tezgâh altındaki bacak/ayaklarını görebilirsiniz. `/tests/shop-body-preview.html` dört ustayı ve adımlarını denetler.
- Kendi ekseninde çevirme görünümü, külahı hızlıca döndürürken hafifçe yatırır; yakalama hedefi, ritim ve puan korunur. Kasıtlı ters çevirme/takla numaraları tam dönüşlerini sürdürür. Sırttan dönüşte çubuk en üst topa gerçekten temas eder, sonra külahın sahipliği değişir ve boş destek eli yeniden kavrayışa yaklaşır.

- `src/pole-contact.js` çubuğun metal ucunu görünen en üst topun yüzeyine bağlar; mantıksal külah hedefini kaydırmaz. Gerçek kavrayışlar çubuğu izler; boşta masa/çan vuruşları korunur. `/tests/pole-contact-preview.html` 1–8 top, aktarım ve ters dönüş kontrolüdür.
- `src/figure-eight.js` kesintisiz iki halka ve kapanışı ham girişle doğrular; `src/gesture-guide-view.js` çizilmiş kısmı aydınlatır. Yarım şekil, titreme veya kamera hareketi tamamlanma sayılmaz. `/tests/rhythm-service-preview.html` sekizi ve yeni havada yakalama numaralarını kontrol eder.
- Hazırlık hareketleri 1,22 hız katsayısı, daha kısa bağlayıcı animasyonlar ve 0,42 saniyelik başarı arasıyla hızlanır. Yakalama/ritim yanıt pencerelerine bu hazırlık katsayısı uygulanmaz.


- `src/stretch-cut.js` gerçek sünen dondurma eksenine dik kesişmeyi doğrular; ham parmak hareketi şarttır. `stretch-cut-view.js` bilekten kesme pozunu ve izi, fizik şeridi de itme/esneme/kopma sonucunu taşır.
- `src/serving-sequence.js` aynı iç/dış külah ile aynı peçetenin el değiştirmesini yönetir. `LAYERED_SERVICE_TEASE` Galata’da açılır; seçildiğinde bütün toplar hazırlandıktan sonra finalin hemen önüne taşınır. Finalde gerçek dolu külah peçeteli olarak ele geçer; boş çubuktan müşteriye fazladan dondurma şeridi çizilmez.

- Dokunma önizlemesinde artık oyun alanına doğrudan fareyle basıp sürüklemek de gerçek dokunma yolunu kullanır. Hazır test düğmeleri yalnız `?controls=1` ile açılır; normal önizlemede görünmez. Bırakma/odak kaybında parmak izi anında temizlenir; normal masaüstü oyununun fare kontrolü değişmez.


## Külahı alarak başlayan karşılaşma

İlk ekranda yalnız sağ üstte Seçenekler düğmesi vardır. Usta gerçek boş külahı eliyle uzatır; oyuncu eliyle dokunup alınca sipariş açılır. Çubuğun ucunda ikinci bir boş külah bulunmaz. Mevcut Şova Başla eylemi, klavye/erişilebilirlik için seçenekler panelinin en altındadır ve aynı devir animasyonunu çalıştırır.

- `cone-introduction.js`: temas doğrulaması, ele uzanma ve aynı külahın devri. `main.js` arayüzü ve siparişi bağlar.
- `cone-grip.js`: müşterinin dik avuçla külah kavraması, ustanın elden servisi ve görüntüye özgü tutuş hizalaması. Mantıksal el/çubuk yay etkileşimi değiştirilmez.
- `cone-rack.js`: yanda sekiz gözlü hazne; her gözde yedi iç içe, içi boş külah. Üç instanced mesh kullanır.
- `customer-service.js`: oyuncudaki külaha bütün kalıp, gerçek masa vuruşları/top ekleme/çubukla geri alma, elden ters teklif ve elden peçete akışları. Başlangıçtaki ilk iki akış her turda vardır; diğer elden çeşitler ilerledikçe repertuvara katılır. Bir top seçilirse ikinci top eklenmez.
- `cultural-materials.js`: keşif eşyalarının ahşap damarları, metal/seramik/cam yüzeyleri; `cultural-scene.js` merkez etrafında döndürme ve özgün rafa dönüşü korur.
- Kontrol sayfaları: `/tests/cone-grip-preview.html`, `/tests/customer-service-preview.html`, `/tests/culture-preview.html`. Bunlar üretim paketine dahil değildir.


## Araştırma, yaşayan hatıralar ve ses

- `src/researched-service.js`: yaklaşan ele tepki veren iki küçük bilek kaçırması ve aynı dondurmanın iki gerçek külah arasında aktarılması. İsim, süre, sinyal ve yakalama koşulları oyun için yazılmıştır; ayrı geleneksel numara adları oldukları iddia edilmez. Tur başına en fazla bir araştırma uyarlaması seçilir. Kaynaklar: [birinci el İstanbul gözlemi](https://daydreamtourist.com/2012/07/05/istanbul-ice-cream-show/), [insan gösterilerindeki hareketlerin araştırmacı çözümlemesi](https://arxiv.org/html/2509.21776v1#S3.SS3). Video/ses varlığı bu kaynaklardan alınmaz.
- `src/stall-memories.js`: özgün **Tezgâhın Emaneti** hikâyesi. Dört eşya bağlantısı gerçek 15/20/25/30 galibiyetleriyle açılır. Keşif kartı, güvenli hazırlık anındaki kısa usta tepkisi ve mevcut defterdeki renkli ayraçlar aynı durumu gösterir. Gerçek kültürel bilgilerle oyun kurgusu ayrıdır; yeni HUD/sayaç eklenmez.
- `src/sound-palette.js`: özgün, düşük seviyeli müzik ve sözsüz karakter sentezi. Hafif bas, kısa telli çalgı tınısı, soru–cevap cümleleri ve susuşlar vardır. İnsan kaydı veya TTS değildir. Usta tepkilerinde 3,2 saniye genel/7 saniye aile aralığı ve tur başına 6 sınırı korunur; kritik oyun sesleri değiştirilmez.
- Ses karşılaştırmaları: `/tests/audio-preview.html` gerçek Web Audio grafiğini ölçer; `node tests/render-audio-audition.mjs <çıktı-klasörü>` kaynak PCM örnekleri ve muhafazakâr mono karşılaştırma üretir. Önce/sonra örnekleri aynı seviyede, ayrı normalizasyon yapılmadan karşılaştırılmalıdır. Öznel ses zevki yalnız sayısal tepe ölçümüyle doğrulanmış sayılmaz.
- Yeni içerik kontrolleri: `/tests/researched-service-preview.html` ve `/tests/stall-memories-preview.html`; kullanıcı kaydını değiştirmeyen geliştirme sayfalarıdır.

- Yakın POV: boş külah alınca kadraj yaklaşır; sipariş tamamlanınca dış kova kenarları sığacak son yakınlığa geçer. Basılı parmak siparişten oyuna taşınır. Yeniden denemede külah tekrar ustadan alınır.
- Yönergeler/sipariş/puan bilgisi üstte, sonuç penceresi ortadadır. Başlangıç külahı hafifçe parlar; boş el nefes alan çapraz bir duruş kullanır.
- Masa vuruşları boş çubukla yapılır. İlk top öncesi boş çubukla ritim, kovada karıştırma/boş çekme ve dolu servisin tezgâh sınırı fiziksel sahiplik üzerinden yönetilir.
