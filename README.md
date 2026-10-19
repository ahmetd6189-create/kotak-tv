# Kotak TV 1.0.6

Expo SDK 54 / React Native kaynak projesi. Bu ZIP hazır APK içermez.

## Sırayla kurulum

1. Yeni ZIP'i ayrı klasöre çıkarın, `KotakTV` klasörünü açın.
2. `GUNCELLE-UX.cmd` dosyasını çalıştırın. Önce `npm.cmd ci --include=dev`, sonra
   Android production APK derlemesi başlatılır. Expo bağlantısından takip edin.
3. İşlem bitince APK'yı indirin. Yalnız `Kotak_Phone` açıkken APK'yı
   `APK-YUKLE.cmd` üzerine sürükleyin. Aynı imzalı mevcut uygulama güncellenir.
4. Hakkında ekranındaki sürüm **1.0.6** olmalı.
5. Önce **Daha Fazla → Ayarlar → Ses Testi** ile yerel test sesini dinleyin.
   Ardından canlı kanal ve filmi ayrı ayrı deneyin.

## Yeni takip/paylaşım/TV özellikleri

Güncel kurulum ve gerçek sınırlar için **SURUM-1.0.6.txt** dosyasını okuyun.
Takım, yeni bölüm ve yeni film takipleri eklendi. Yeni içerik kontrolü yalnız
uygulama açıkken yapılır; önceden kurulmuş EPG alarmını telefon işler. Android
Google Cast ve iOS AirPlay oynatıcıya eklendi. Gerçek TV/telefon test edilmedi.
Paylaşım bağlantısı native Kotak TV davetini açar. Gerçek alan adı doğrulaması,
mağaza sayfaları ve yayımlanmış servis olmadan mağaza yönlendirmesi etkin değildir.

## Bu sürümde değişenler

- Kanalın yanındaki takvim simgesi güncel programı ve sonraki yayınları açar.
  EPG ekranında Şimdi / Bu Akşam / 24 Saat / Hatırlatıcılar sekmeleri vardır.
  XMLTV adresi sağlayıcıdan çıkarılır veya EPG Kaynağı ayarından eklenir.
  EPG verisi yoksa program uydurulmaz.
- Zile basınca 5 / 10 / 30 dakika, 1 saat veya özel dakika seçilir. Bildirime
  dokununca kanal açılır. Geçmiş bir hatırlatma zamanı kabul edilmez.
  İkinci zil basışı hatırlatmayı kaldırır. Cihaz izni ve güç yönetimi etkilidir.
- Ana ekran kategorileri kullanıcı seçimine göre kaydedilir; yalnız işaretlenenler
  görünür. Listeler sanallaştırılır; yenileme katalog isteğini iptal edip yeniden başlatır.
- Trend Filmler / Trend Diziler yalnız IMDb puanı bilinen ve en az 7 olan
  VOD/dizilerden sıralanır. Canlı kanallar bu alanlara konmaz, dizi bölümleri tek
  başlıkta gruplanır. Bilinmeyen IMDb puanı uydurulmaz.
- Trend kartı önce afiş, yayın tarihi (varsa ay/yıl), IMDb puanı, tür ve özet
  içeren pencere açar. İzle düğmesi filmi veya dizi bölümlerini açar.
  Sağlayıcı veri vermiyorsa IMDb ayarında kendi OMDb anahtarı gerekir.
  Eşleştirme en fazla 20 film + 20 dizi ile sınırlıdır; tüm katalog/global IMDb
  sıralaması değildir. OMDb özetleri servisin sağladığı dilde olabilir.
- Ana ekrandaki sesli asistan gerçek cihaz konuşma tanımasını kullanır:
  “Bugün TRT1’de ne var?” EPG gösterir; “IMDb puanı yüksek aksiyon filmi öner”
  bilinen puanları türüne göre sıralar; “Galatasaray maçını aç” mevcut EPG’de
  şu anki maçın tek eşleşen kanalını açar. Henüz başlamayan maçın saatini gösterir.
  Kanal/film/dizi adıyla doğrudan arama da vardır. Bu, yerel katalog/EPG üzerinde
  çalışan komut motorudur; genel amaçlı LLM veya internette film arama servisi değildir.
- Oynatıcı hata/ilerlememe halinde otomatik yeniden bağlanır. Ortada mavi dönen,
  büyüyüp küçülen yıldız gösterilir. İlk donma eşiği 8 saniye; bağlantı arası
  bekleme 4/8/16/30 saniye, sonrasında 30 saniyedir. Oynatıcı açıkken deneme
  sayısı sınırlanmaz. Kullanıcı duraklatması korunur; VOD kaldığı yere döner.
- Ses seviyesi, hoparlör ve ses oturumu açık ayarlanır; Türkçe/ilk ses parçası
  seçilir. Ses/Altyazı → Sesi Yenile ve Ayarlar → Ses Testi mevcuttur.
  Kullanıcının akışındaki gerçek ses/codec bu ortamda doğrulanmadı.
- Birlikte İzle mobil düğmesi gerçek oda API'sine bağlanır. `server/` içinde
  tek kullanımlık davet, yalnız bir konuk tarayıcı oturumu, kaynak proxy'si ve
  oynat/duraklat/sarma senkronizasyonu uygulanmıştır. Servis henüz yayımlanmadı;
  HTTPS adresi/hesap anahtarı olmadan davet üretilemez. Ayrıntı: server/README.md.
- Doğrulanmış deneme/abonelik son tarihi geldiğinde 48 saat kala bir, son gün
  24/16/8 saat kala üç bildirim ve uygulama içi süre mesajı planlanır.
  Gerçek mağaza doğrulama servisi/ödeme kurulmadığı için bu akış şu an etkin değildir.
  Ödeme alınmış veya deneme süresi doğrulanmış gibi davranılmaz.

## Veri ve cihaz sınırları

EPG, sağlayıcının XMLTV verisine bağlıdır; sıkıştırılmış ham .gz içeriği desteklenmez.
Program saatleri Türkiye saatidir. Sistemin yerel bildirimleri tam zamanında
iletmesi OS izinlerine ve pil ayarlarına bağlıdır. Ses tanıma için cihazın Google/
Apple konuşma hizmeti ve gerektiğinde internet gerekir; bu modül Expo Go'da değil,
yeni native APK'da çalışır. İçerik eşleştirmesi yerel kurallıdır; LLM sohbet servisi yoktur.

4K/60 FPS, MKV ses codec'leri ve çoklu yayınlar kaynak/canlı bağlantı/cihaz desteğine
bağlıdır. Yeni ses ayarları her kaynakta sesin kesin düzeldiğini kanıtlamaz.
Yerel Ses Testi internet/sağlayıcı olmadan bu ayrımı yapmaya yardımcı olur.

Kanal/EPG metadata önbelleği küçük kayıtlara ayrılır. Oynatma URL'leri ve başlıkları
bu önbelleğe yazılmaz; hesaplar SecureStore'dadır. İnternetsiz canlı video devam etmez.

AI maç tahmini, otomatik 1 dakikalık özet, ses çevirisi, mağaza satın alımı ve
7 günlük sunucu kilidi henüz bağlanmadı. SharePlay servisi henüz yayımlanmadı. Bunlar başarılı
çalışıyormuş gibi gösterilmez. Pro tasarımında aylık ₺249 / yıllık ₺999 seçenekleri vardır.

## Doğrulama

```powershell
npm.cmd ci --include=dev
npm.cmd run check
npm.cmd test
npm.cmd run test:ui
```

17 veri/ağ + 3 önbellek + 8 medya/asistan/kurtarma + 28 bileşen/cihaz
API akışı + 3 servis/senkronizasyon testi: **65 test**. Mikrofon ve bildirim API'leri testlerde taklit edilir.
Android native prebuild/izinler ve Android JS paketlemesi denetlenir; bu APK'nın
cihazda gerçek yayın sesi, gerçek konuşma, gerçek alarm ve piksel eşitliği bu
ortamda doğrulanmamıştır. Hazır APK veya mağaza yayını tamamlanmış ürün değildir.

Üretim girişi `index.ts` → `App.tsx`. Destek: kotaktv@gmail.com
