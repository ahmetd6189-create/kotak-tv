# Kotak TV: 24 saat demo ve ödeme temeli

**Durum:** Bu klasör dağıtılmamış bir Android sunucu temelidir. APK'da giriş, mağaza satın alma SDK'sı ve bu servise erişim henüz bağlanmadığından gerçek ödeme ve demo kilidi etkin değildir. iOS ödeme doğrulaması uygulanmadı. Yönetim için yalnız yetkili, salt okunur API var; görsel panel yok.

## Para nasıl gelecek?

IBAN veya banka şifresini sohbete göndermeyin. Google Play Console / App Store Connect içindeki resmi ödeme ve banka hesabı alanlarını hesap sahibi doldurur. Dijital Pro aboneliği için mağaza satın alması hedeflenir; bölgesel istisnalar ayrıca değerlendirilir. Aylık249TL/yıllık999TL hedef fiyattır, uygulama gerçek fiyatı mağazadan almalıdır.

Normal ödeme sonrası müşteriyi elle yetkilendirmezsiniz. Uygulama mağazadan aldığı purchaseToken'ı sunucuya gönderir; sunucu Google'a sorar, kullanıcı eşlemesini ve süreyi kontrol eder, tekil token kaydını oluşturur ve satın almayı onaylar. Pending/askıdaki ödeme hak açmaz. Token başka hesaba aktarılamaz. Mağazadan iade/süre değişikliği geldiğinde erişim tekrar doğrulanır. Mevcut GET uç noktası Google'dan tekrar doğrular; otomatik RTDN/Apple bildirimleri henüz eklenmedi.

## Denemenin tekrar başlamaması

Deneme, doğrulanmış hesabın sunucu kaydından başlar ve tam24saat sürer. Aynı hesapla silip yüklemek veya cihaz saatini değiştirmek süreyi yenilemez. Yeni hesap açarak aynı cihazda tekrar denemeyi engellemek henüz uygulanmadı: bunun için kimlik doğrulaması yanında Play Integrity/device recall veya iOS DeviceCheck/App Attest gerekir. Sadece DeviceID/AsyncStorage ile yüzde100 garanti verilmez. Device recall erişimi betadır ve ayrıca uygunluk gerektirir.

Mobil bildirim planlayıcısı doğrulanmış bitişe göre son3,2,1saatte bildirim kurar; izin verilmezse sistem bildirim göstermez. Yerel planlayıcı hazırdır, canlı hesap akışına bağlantısı beklemektedir.

## Kurulum ve gerekli hesap işlemleri

1. Node24+ ve kalıcı diskli küçük bir sunucu hazırlayın. Bu bir video/izleme sunucusu değildir; yayınları taşımaz, IPTV şifrelerini almaz.
2. RS256/JWKS destekli doğrulanmış bir giriş sağlayıcısı kurun. AUTH_ISSUER, AUTH_AUDIENCE ve HTTPS AUTH_JWKS_URL değerlerini sunucu ortamında tanımlayın.
3. Play Console'da com.kotaktv.app için `kotak_pro_monthly` ve `kotak_pro_yearly` aboneliklerini oluşturun. Hizmet hesabına gerekli AndroidPublisher erişimini verin. JSON anahtar dosyası yalnız sunucuda, APK/Git dışında tutulmalıdır.
4. `.env.example` alanlarını gerçek sunucu ortam değişkenleriyle sağlayın. Node kendiliğinden bu dosyayı yüklemez; ortamı barındırma panelinden tanımlayın veya özel.env dosyasıyla `node --env-file=/private/billing.env server.mjs` kullanın.
5. `npm test` ardından `npm start`. Sunucu127.0.0.1:8080 üzerinde açılır; dışarı HTTPS ters proxy üzerinden sunulmalıdır. SQLite dosyasını yedekleyin. Tek süreç/tek kalıcı disk içindir; yatay ölçekleme için ortak veritabanına geçilmelidir.
6. Mobil giriş ve Play Billing SDK entegrasyonu yapılmalı. Satın alma açılırken obfuscatedAccountId=`SHA256(issuer + '|' + subject)` verilmelidir. Anahtarları istemciye koymayın. `src/native/billing-client.ts` HTTPS API adaptörüdür, henüz App'e bağlanmadı.
7. Play internal test kanalında lisans testçisiyle satın alma, restore, pending, iptal, yenileme, iade ve yeniden yükleme uçtan uca sınanmalı. iOS için StoreKit ve App Store Server API/JWS doğrulaması ayrıca gerekir.
8. Yayına çıkmadan RTDN/yenileme/iade işleyicileri, cihaz doğrulaması, mobilde zorunlu giriş/erişim kontrolü, gizlilik/silme süreçleri, yönetici MFA ve üretim güvenlik incelemesi tamamlanmalıdır.

## API

Tüm uç noktalar `Authorization: Bearer <giriş sağlayıcısının JWT'si>` ister. İstemci `verified:true` diyerek hak açamaz. Sunucu imza/issuer/audience/expiry doğrular.

- POST /v1/trial: hesabın ilk24saatlik kaydını oluşturur; tekrar çağrıda aynı tarihi verir.
- GET /v1/entitlement: varsa mağaza hakkını yeniden doğrular, aksi halde mevcut denemeyi döndürür; yeni deneme başlatmaz.
- POST /v1/purchases/google: `{ "purchaseToken": "..." }`. Resmi Google API doğrulaması olmadan hak açılmaz.
- GET /v1/admin/accounts: ADMIN_SUBJECTS listesindeki issuer|subject hesaplarına son100kaydın salt okunur özeti. Satın alma token'ları dönmez. Yetki açma/değiştirme uç noktası yoktur.

Geliştirme testleri: 24saat sınırı, aynı hesabın denemeyi yenileyememesi, tekrarlı satın alma, token sahipliği, imza/issuer/audience/süre kontrolleri. Bunlar gerçek mağaza ve cihaz testinin yerini tutmaz.

Resmi kaynaklar (20Ekim2026 kontrolü):
- https://developer.android.com/google/play/billing/security
- https://developer.android.com/google/play/integrity/device-recall
- https://developer.apple.com/app-store/review/guidelines/#in-app-purchase
