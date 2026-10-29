# Kotak TV 1.0.15 (22)

Yerel Windows APK derlemesi: `APK-OLUSTUR.cmd`.
Eski projenizdeki `credentials.json` ve `credentials/` klasörünü bu projenin köküne kopyalayın. İmzalama dosyalarını paylaşmayın.
Komut paketleri kurar, TypeScript kontrolünü yapar, Android projesini hazırlar ve aynı anahtarla release APK üretir.
Sonuç: `KotakTV-1.0.15.apk`. Kurulu uygulamayı silmeden güncelleyin.

Değişiklikler ve açık kalan maddeler: [SURUM-1.0.15.txt](SURUM-1.0.15.txt).
Fiziksel Android testi bu ortamda yapılmadı. Tam dil çevirisi ve telefon ana ekranı simgesinin takım logosuna dönüşmesi henüz tamamlanmadı.

---

# Kotak TV 1.0.9

Expo SDK 54 / React Native / VLC + expo-video mobil IPTV oynatıcı (Android 8+).
Kendi M3U veya Xtream hesabınızla kullanılır. Kanal sağlayıcısı değildir.
Bu kaynak ZIP'i hazır APK içermez; APK Expo derlemesinden indirilir.

## Hazır APK'yı kullanma

1. Expo'da **1.0.9** sürümünün tamamlanan Android APK'sını indirin.
2. Telefonunuza kurun veya açık telefon emülatörüne APK'yı sürükleyin.
3. Alternatif: APK'yı ZIP'teki `APK-YUKLE.cmd` dosyasının üzerine bırakın.
4. Eski uygulamayı silmeden aynı imzalı APK'yı yükleyin. Hesabınız ve listeleriniz korunur.
5. Daha Fazla → Hakkında bölümünde sürüm 1.0.9 görünür.

## Kaynaktan çalıştırma

ZIP'i ayrı klasöre çıkarın, `KotakTV` klasöründe terminal açın:

```powershell
npm.cmd ci --include=dev
npm.cmd run check
npx.cmd expo run:android
```

Telefonda/emülatörde Expo Go yerine native Android uygulaması gerekir.
Yeni bir EAS APK derlemesi gerekiyorsa `GUNCELLE-UX.cmd` çalıştırılabilir.
Hazır APK indiriyorsanız tekrar derleme başlatmanız gerekmez.

## Video referansına göre arayüz

- Saf siyah zemin, mavi kontroller, kompakt üst sekmeler ve kapsül alt menü.
- Büyük sıra numaralı yatay Trend Filmler / Trend Diziler.
- Yeni Eklenen Filmler, Son Güncellenen Diziler ve İzlemeye Devam Et.
- Katalogda üç sütunlu afişler, arama ve iki/üç sütun geçişi.
- Başlık detayı: büyük afiş, tarih, puan, özet, İzle, kadro ve resimler.
  Film/dizi detayları mevcut IPTV sağlayıcısının tek başlık sorgusundan alınır.
- Tüm kategoriler sayfası, kategori araması ve ana ekranda gösterilecek kategori seçimi.
- EPG'de sabit kanal sütunu, kaydırılabilir saatler ve program hücreleri.
  Hücreye dokununca açıklama açılır; Bana Hatırlat ile süre seçilir.
- TV Kanalı alt sekmesinde doğrudan HLS/MP4 yayın adresi açılabilir.
  Oynatma listeleri video diye oynatılmaz; liste olarak eklenir.
- Tanıtım/özellik kartları ana ekrandan kaldırıldı; Daha Fazla bölümündedir.
- Yayını Paylaş, telefonun WhatsApp/Telegram/SMS vb. paylaşım menüsünü açar.
  Eş zamanlı oynatma, oda sunucusu veya paylaşım sunucusu yoktur.

## Açılış ve performans

İlk ağ isteği yalnız canlı kanal listesini alır. Kullanılabilir kanallar kategori
adları gelmeden yayınlanır. Film/dizi listesi ilk canlı ekran çizildikten sonra
ayrı yüklenir. Oynatmaya veya EPG'ye geçildiğinde VOD yüklemesi iptal edilir.
Tam XMLTV yalnız EPG/kanal programı/asistan gerektiğinde istenir; açılışı engellemez.
Katalog isteği toplam 20 saniye, VOD isteği toplam 25 saniyede kesilir; hata gösterilir.
Bunlar açılış süresi vaadi değil, üst bekleme sınırlarıdır.
Büyük JSON dizileri UI'ya sırayla çalışma zamanı vererek işlenir. Kanal ve EPG
önbelleği ayrı yazılır; rehber, tüm katalogla tekrar kaydedilmez. EPG takma adları
aynı veriyi tekrar yazmaz. Büyük listeler sanallaştırılır.
Xtream önbelleğinden oynatma adresi güvenli hesap kaydından yeniden oluşturulur.
Genel M3U listesinde bağlantılar değişmişse ağdan listeyi yenilemek gerekir.

## Verinin sınırları

IMDb puanı yalnız doğrulanmış IMDb alanından veya kullanıcı OMDb anahtarıyla
alınan eşleşmeden gösterilir. IMDb yoksa detayda sağlayıcı puanı açıkça ayrı etiketlenir;
sağlayıcı puanları IMDb trend alanına girmez. Canlı kanallar
film/dizi trendine girmez. Bu listeler global IMDb/TMDB trend kataloğu değildir.
Sağlayıcı görsel, tarih, kadro fotoğrafı veya özet vermezse içerik uydurulmaz.
Oyuncu isimleri varsa profil baş harfleri gösterilir; gerçek fotoğraf diye sunulmaz.
Video referansındaki filmler/afişler uygulamaya kopyalanmış bir demo değildir.

Program bilgisi sağlayıcının XMLTV veya kanal API verisine bağlıdır. Gzip XMLTV
açılır; XMLTV alınamazsa ekrandaki kanallar için kanal API akışı denenir.
EPG alarmı 5/10/15/30/60 veya özel dakika ile cihazın bildirim sistemine kaydedilir.
Telefonun izinleri/pil politikası bildirim zamanını etkiler. Yeni içerik kontrolü
uygulama açıkken yapılır; uygulama kapalıyken anlık kontrol garantisi verilmez.
Yerel konuşma tanıma Türkçe komutu kanal/film/dizi/EPG üzerinde eşleştirir.
Genel amaçlı LLM, maç tahmini, AI özet ve canlı çeviri bu sürümde bağlı değildir.
Mağaza satın alma ve doğrulanmış deneme/abonelik kilidi etkin değildir.

Android varsayılan oynatıcı VLC kullanır; mevcut ses ve altyazı parçaları seçilir.
Derlemede VLC C++ çalışma dosyası proje çıktısına açıkça seçilir; ortak Gradle
önbelleği değiştirilmez ve kopyalanan dosya baytları kontrol edilir.
PiP için oynatıcıdaki Sistem seçeneği expo-video motorunu açar. Özel Authorization
başlığı gerektiren kaynaklar başlık desteği için sistem motoruna gider.
Hata/donma halinde mavi yıldızla tekrar bağlanma denenir; ses, tam ekran ve 2/4 ekran vardır.
İnternet/kaynak/codec/cihaz kapasitesi nedeniyle kesintisiz 4K60 garantisi verilemez.
Google Cast/AirPlay mevcut cihaz desteğine bağlıdır. Özel HTTP başlığı gerektiren
kaynak varsayılan Cast alıcısına sunucusuz aktarılamıyorsa anlaşılır hata gösterilir.
Destek: kotaktv@gmail.com

## Doğrulama

`DOGRULAMA.txt` ve `VIDEO-INCELEME.md` dosyaları yapılan kontrolleri ve referans
karşılaştırmasını içerir. Gerçek IPTV hesabınızla Android ses/video ve fiziksel
cihaz bildirimleri bu ortamda denenmedi. Piksel düzeyinde eşitlik iddiası yoktur.

## 1.0.9 değişiklikleri

- Film İzle, sağlayıcıdan gerçek konteyner uzantısını ve doğrudan kaynağı sorgular.
- Ses parçası kapalı seçilmez; Türkçe varsa tercih edilir, alternatif ses seçilebilir.
- Altyazı menüsü yayındaki gerçek parçaları gösterir. AI çeviri ve maç analizi düğmeleri kaldırıldı.
- ANASAYFA / CANLI / FİLM / DİZİ; dizi kategorileri ayrı yatay gruplar ve filtreler.
- Katalogda IMDb en yüksek / yayın tarihi en yeni / yeni eklenen / A–Z sıralaması.
- Asistanda Enter ve Ara ve aç aynı aramayı başlatır; eksik katalog/EPG önce tamamlanır.
- Canlı takım maçı açılır, ilerideki maç ilgili EPG programına yönlendirilir.
- Çok bölümlü dizilerde bölüm ekranı sanallaştırılır.

Sağlayıcı IMDb, yayın tarihi, EPG veya Türkçe altyazı vermiyorsa bu veriler
uydurulmaz. Türkçe ses tanıma cihazın konuşma tanıma hizmetini ve mikrofon iznini
gerektirir. Bu sürüm için gerçek IPTV hesabınızda ses/video dinleme testi yapılmadı.


## 1.0.9: EPG, trend ve sarma düzeltmeleri

Güncel davranış ve gerçek test sınırları SURUM-1.0.9.txt içindedir. Ödeme ve 24 saat demo sunucu temeli billing-service/README.md içinde açıklanır. Bu APK gerçek ödeme veya zorunlu demo kilidi açmaz; mağaza/giriş/servis bağlantıları beklemektedir. IBAN ya da gizli anahtarları sohbete veya GitHub’a koymayın.

