# Kotak TV 1.0.7

Expo SDK 54 / React Native / expo-video mobil IPTV oynatıcı.
Kendi M3U veya Xtream hesabınızla kullanılır. Kanal sağlayıcısı değildir.
Bu kaynak ZIP'i hazır APK içermez; APK Expo derlemesinden indirilir.

## Hazır APK'yı kullanma

1. Expo'da **1.0.7** sürümünün tamamlanan Android APK'sını indirin.
2. Telefonunuza kurun veya açık telefon emülatörüne APK'yı sürükleyin.
3. Alternatif: APK'yı ZIP'teki `APK-YUKLE.cmd` dosyasının üzerine bırakın.
4. Eski uygulamayı silmeden aynı imzalı APK'yı yükleyin. Hesabınız ve listeleriniz korunur.
5. Daha Fazla → Hakkında bölümünde sürüm 1.0.7 görünür.

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
alınan eşleşmeden gösterilir. IMDb yoksa sağlayıcı puanı `★` ile ayrı etiketlenir;
yüksek sağlayıcı puanları trend alanına alternatif olabilir. Canlı kanallar
film/dizi trendine girmez. Bu listeler global IMDb/TMDB trend kataloğu değildir.
Sağlayıcı görsel, tarih, kadro fotoğrafı veya özet vermezse içerik uydurulmaz.
Oyuncu isimleri varsa profil baş harfleri gösterilir; gerçek fotoğraf diye sunulmaz.
Video referansındaki filmler/afişler uygulamaya kopyalanmış bir demo değildir.

Program bilgisi ve 24 saatlik rehber sağlayıcının XMLTV verisine bağlıdır.
EPG alarmı 5/10/15/30/60 veya özel dakika ile cihazın bildirim sistemine kaydedilir.
Telefonun izinleri/pil politikası bildirim zamanını etkiler. Yeni içerik kontrolü
uygulama açıkken yapılır; uygulama kapalıyken anlık kontrol garantisi verilmez.
Yerel konuşma tanıma Türkçe komutu kanal/film/dizi/EPG üzerinde eşleştirir.
Genel amaçlı LLM, maç tahmini, AI özet ve canlı çeviri bu sürümde bağlı değildir.
Mağaza satın alma ve doğrulanmış deneme/abonelik kilidi etkin değildir.

Oynatıcı expo-video kullanır; hata/donma halinde mavi yıldızla yeniden bağlanır.
Ses/altyazı seçimi, tam ekran, cihaz destekliyorsa PiP, 2/4 ekran vardır.
İnternet/kaynak/codec/cihaz kapasitesi nedeniyle kesintisiz 4K60 garantisi verilemez.
Google Cast/AirPlay mevcut cihaz desteğine bağlıdır. Özel HTTP başlığı gerektiren
kaynak varsayılan Cast alıcısına sunucusuz aktarılamıyorsa anlaşılır hata gösterilir.
Destek: kotaktv@gmail.com

## Doğrulama

`DOGRULAMA.txt` ve `VIDEO-INCELEME.md` dosyaları yapılan kontrolleri ve referans
karşılaştırmasını içerir. Gerçek IPTV hesabınızla Android ses/video ve fiziksel
cihaz bildirimleri bu ortamda denenmedi. Piksel düzeyinde eşitlik iddiası yoktur.
