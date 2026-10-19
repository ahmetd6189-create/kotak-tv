# Kotak birlikte izleme servisi

Bu klasör APK'dan ayrı çalışır. Henüz internete yayımlanmış değildir.
Node.js 22+; `npm ci` ve `npm start`. Gerekli sunucu ortam değişkenleri:

- KOTAK_SECRET: en az 32 karakter rastgele sunucu anahtarı; APK'ya konmaz.
- PUBLIC_ORIGIN: HTTPS servis adresi. TLS sonlandıran ters proxy / alan adı gerekir.
- STREAM_HOSTS: izin verilen sağlayıcı ve CDN host:port değerleri, virgülle ayrılmış.
- PORT: varsayılan 8080. Servis yalnız 127.0.0.1 üzerinde dinler.

Yönetici makinesinde `node create-host-token.mjs kullanici-id` yedi günlük hesap
anahtarı üretir. Bu bir geliştirme/yönetici provizyon yoludur; ürünün kullanıcı
giriş/yenileme sisteminin yerini tutmaz. Mobil Birlikte İzle ayarında HTTPS servis
adresi ve bu hesaba özel anahtar kaydedilir. Anahtar SecureStore'da tutulur.

Sunucu şu an izlenen akış için 15 dakika geçerli tek kullanımlık davet oluşturur.
Davet yalnız bir tarayıcı oturumuna dönüştürülür. Tarayıcı HttpOnly/Secure cookie
ile yalnız bu odanın manifest/segment/MP4 verisine ulaşır. Kaynak adresi ve hesap
şifresi tarayıcıya verilmez. HLS alt listeleri, anahtarları ve segmentleri aynı
proxy üzerinden geçer; MP4 byte-range korunur. Kaynak bağlantıları bellekte
AES-256-GCM ile tutulur; sunucu yeniden başlayınca odalar biter. Oda en fazla iki
saat sürer. Daveti alan kişi uygulama kurmadan Safari/Chrome'da oynatır; Safari
native HLS, diğer destekleyen tarayıcılar sabitlenmiş hls.js 1.7.3 kullanır.

Ana oynatıcı 1,5 saniyede bir durum yayınlar ve konuk komutunu alır. Konuk
oynat/duraklat/sarma komutunu odaya gönderir; VOD'da >2 saniye sapma düzeltilir.
Canlıda oynat/duraklat aktarılır; farklı HLS canlı pencere konumlarında kare
hassasiyetinde eşzamanlılık sağlanmaz. Uzun arka plan veya kopan ana cihazda
senkronizasyon sürdürülemez. Yayın codec'i tarayıcıda desteklenmelidir; bu servis
MKV/AC3 gibi codec'leri dönüştürmez. Sağlayıcının bağlantı sınırı hâlâ geçerlidir.

`npm test` gerçek yerel HTTP sunucularıyla daveti, ikinci kişinin reddini, akış
proxy'sini, kanal kapsamını, iki yönlü komutu ve oda iptalini sınar. Gerçek Safari,
Chrome, mobil cihaz veya uzak CDN ile uçtan uca oynatma henüz doğrulanmamıştır.

## Abonelik doğrulama bağlantısı

`createService({..., entitlementFor})` parametresi mağaza doğrulama servisinize
bağlanır. Varsayılan endpoint 503 döndürür; sahte üyelik/ödeme kabul edilmez.
Doğrulanmış sonuç örneği:
`{verified:true,id:"purchase-id",kind:"subscription",expiresAt:1793000000000,verifiedAt:1792000000000}`.
Tarihler epoch milisaniyedir; trial süresi de sunucuda hesaplanmalıdır.
Gerçek Google Play / App Store makbuz doğrulaması ve hesap girişi bu pakette
kurulu değildir. Abonelik kilidi/ödeme ekranı bu yüzden etkinleştirilmez.
Mobil bildirim planlayıcısı gerçek sonuç geldiğinde 48 saat kala bir; son gün
24,16,8 saat kala üç bildirim kurar. Uygulama açılışında süre mesajı gösterir.
Yenilemede eski plan iptal edilir. Bildirim izni ve işletim sistemi zamanlaması
etkilidir; uygulama kaldırılmış/hiç açılmamışken sunucu push altyapısı gerekir.

## 1.0.6: uygulamaya açılan paylaşım daveti

Yeni davet `/join/oda#tek-kullanimlik-davet` biçimindedir. Telefonun paylaş menüsü
WhatsApp/Telegram/SMS/Messenger dahil kurulu ve metin paylaşmayı destekleyen
uygulamaları listeler. Konuk native uygulamada tek kullanımlık daveti teslim alır,
oynatıcı ve oda komutlarını yalnız bu odaya ait geçici anahtarla kullanır; ana
kullanıcının hesap anahtarı konuğa verilmez. Eski `/watch` tarayıcı oynatıcısı yeni
paylaşımlarda kullanılmaz. Davet kurulumdan sonra yeniden açılmalıdır; mağaza
kurulumundan otomatik davet devamı (deferred linking) uygulanmamıştır.

Yayımlama için gerçek değerler:
- Mobil derlemede EXPO_PUBLIC_LINK_HOST: doğrulanacak HTTPS alan adı.
- Sunucuda ANDROID_SHA256: gerçek Android imza SHA256 parmak izi (virgüllü olabilir).
- APPLE_APP_ID: gerçek Apple TeamID.com.kotaktv.app.
- ANDROID_STORE_URL: yayımlanmış Google Play ürün adresi.
- IOS_STORE_URL: yayımlanmış App Store ürün adresi.

Sunucu Android assetlinks.json ve Apple apple-app-site-association dosyalarını
bu değerlerle servis eder. Değerler yoksa boş doğrulama listesi döner ve mevcut
olmayan mağazaya yönlendirme yapılmaz. Android intent fallback / iOS açma düğmesi
vardır; uygulama içi tarayıcılar doğrudan açmayı kısıtlayabilir. Native OS App/
Universal Links için alan adı ve imzanın gerçekten doğrulanması gerekir.

Google Cast'te doğrudan erişilen HLS/MP4 kaynağı TV'ye gönderilir. Özel HTTP
başlıkları isteyen yayınlar için `mode:cast` kaynak proxy'si iki saatlik, yalnız
ilgili odaya erişen yetki bağlantısı üretir. Manifest alt kaynakları aynı yetkiyi
taşır. TLS reverse proxy erişim günlüklerinde sorgu dizilerini kaydetmeyin.
Bu bağlantı tüm IPTV hesabını açmaz; yalnız o yayın içindir. Varsayılan Google
alıcı tüm codec/DRM türlerini oynatmaz; MKV aktarımı desteklenmiş gibi sunulmaz.
