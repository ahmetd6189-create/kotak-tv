# Kotak TV — ücretsiz Supabase altyapısı

## Şu anki gerçek durum

Kurulum dosyaları hazır. Yerel PostgreSQL (PGlite) ve HTTP davranış testleri geçti. Bulutta proje oluşturulduğu veya servisin dağıtıldığı henüz doğrulanmadı. Uygulamadaki giriş/demo kilidi ve mağaza ödemeleri henüz bu servise bağlı değil. Node/SQLite billing-service yerine bu Supabase altyapısı hedeflenir; iki ayrı sunucu çalıştırmak gerekmeyecek.

## Sıra

1. Supabase hesabını bağla; yalnız Free planındaki, Kotak TV için ayrılmış proje kullanılacak. Ücretli plan veya yükseltme yapılmayacak.
2. Bu migration ve `kotak-access` Edge Function dağıtılacak. Dağıtımdan sonra yetkisiz isteğin reddedildiği, tabloların herkese kapalı olduğu ve sunucu saatiyle 24 saat döndüğü bulutta doğrulanacak.
3. Sonraki aşamada telefona Supabase giriş oturumu ve demo kilidi bağlanacak. İlk doğrulanmış girişte başlatılan deneme tekrar kurulumda aynı hesapla yenilenmeyecek. APK'da gizli yönetici anahtarı bulunmayacak.
4. Ardından resmi Google Play/App Store satın alma entegrasyonları ve sunucu doğrulaması eklenecek. Bu sürüm henüz ödeme alamaz veya ödemeye göre Pro erişimi veremez.

## Güvenlik ve sınırlar

- Kullanıcı doğrulaması Supabase Auth `/auth/v1/user` üzerinden yapılır. İstemcinin gönderdiği kullanıcı kimliği, başlangıç tarihi, bitiş tarihi ve `verified` bayrağı yetki kaynağı değildir.
- Demo tabloları özel şemadadır; RLS açık, anon/authenticated doğrudan erişimi kapalıdır. Başlatma/okuma RPC'lerini yalnız sunucu anahtarı çağırabilir.
- `verify_jwt=false` yeni imza anahtarlarıyla uyum için kullanılır. Bu, giriş kontrolünün kaldırıldığı anlamına gelmez: handler her istekte Auth doğrulaması yapar, ardından yönetici anahtarıyla kullanıcıya özel RPC çağırır.
- Sunucu anahtarları yalnız Edge Function ortamındadır. `EXPO_PUBLIC_*` alanlarına, APK'ya, GitHub'a veya sohbete konmaz. Mobil uygulamaya yalnız proje URL'si ve publishable key verilecek.
- Tek demo kaydı/hesap, atomik ekleme ve tam24saat kuralı veritabanında uygulanır. Sonradan aynı hesapla yeniden yüklemek süreyi uzatmaz.
- Aynı cihazda farklı hesap açarak yeni demo almayı engelleyen cihaz doğrulaması henüz yoktur. Hesap silme/yeni hesap açma da yeni kimlik oluşturabilir. DeviceID ile yüzde100 garanti verilmez.
- Veritabanında dakikada30erişim sorgusu/hesap sınırı ve HTTP tarafında2KiB gövde sınırı vardır. Bunlar ücretsiz planın tüm kötüye kullanım ihtimallerini ortadan kaldırmaz.
- Video, IPTV linkleri ve sağlayıcı şifreleri buraya yüklenmez. Servis yalnız hesap/demo/abonelik için tasarlanır. EPG indirme motoru bu sunucudan geçirilmez.
- Abonelik tablosu sadece gelecek ödeme aşamasına hazırlıktır. Satın alma doğrulayıcısı, mağaza bildirimleri, iade/yenileme işlemleri ve görsel yönetim paneli henüz uygulanmadı.
- Supabase Free kota ve hareketsizlikte duraklatma sınırlarına tabidir; kesintisiz/sonsuz ücretsiz hizmet garantisi yoktur.

## Projeye uygulama

Tercihen Supabase bağlantısı üzerinden, Kotak TV'ye ait boş Free projeye uygulanır. Mevcut başka bir uygulamanın veritabanına karıştırılmaz.

CLI alternatifi (Supabase CLI resmi paketinden; giriş etkileşimlidir, token sohbete yazılmaz):

```powershell
npx.cmd supabase@latest login
npx.cmd supabase@latest link --project-ref PROJE_KIMLIGI
npx.cmd supabase@latest db push
npx.cmd supabase@latest functions deploy kotak-access
```

`PROJE_KIMLIGI` gerçek Supabase proje kimliğiyle değiştirilmelidir. Database parolası güvenli giriş ekranında verilir. Secret değerleri Supabase'in otomatik ortam değişkenlerinden okunur; legacy ve yeni anahtar türleri desteklenir.

Auth ayarlarında doğrulanmış e-posta/telefon hesabı gerekir; bu endpoint anonim oturumlara demo açmaz. E-posta doğrulama teslimatı/SMTP limitleri telefon girişi aşamasında ayrıca yapılandırılıp test edilecek.

## API sözleşmesi

POST `https://PROJE_KIMLIGI.supabase.co/functions/v1/kotak-access`

- `Authorization: Bearer <Supabase kullanıcı access_token>`
- `apikey: <projenin publishable key'i>`
- `Content-Type: application/json`
- `{"action":"trial"}` ilk denemeyi başlatır; tekrar çağrıda aynı bitişi döndürür.
- `{"action":"status"}` mevcut hakkı okur; yeni deneme başlatmaz.

Başarılı yanıt `verified, id, kind, expiresAt, verifiedAt, serverTime, active` alanlarını içerir. `expiresAt` ve `serverTime` UTC milisaniyedir. Süresi dolmuş kayıt silinmez; `active:false` döner. Hak yoksa404, geçersiz oturum401, doğrulanmamış hesap403, sorgu sınırı429, doğrulama servisi kullanılamıyorsa503döner. Sunucu saati istemci saatinden ayrı tutulacak; hata durumunda ücretli hak uydurulmayacak.

## Yerel kontroller

Önce proje kökünde `npm.cmd ci`, ardından:

```powershell
npm.cmd ci --prefix supabase
npm.cmd test --prefix supabase
npx.cmd tsc -p supabase/tsconfig.json
```

11test: kimlik doğrulaması, anonim hesap engeli, sahte süre/yetki alanlarının reddi,2KiB sınırı, servis hatası, sorgu sınırı, gerçek PostgreSQL'de24saat/idempotency/izinler/süresi dolmuş kaydın korunması. Buluttaki Supabase gateway ve gerçek mobil cihaz testinin yerine geçmez.

Resmi kaynaklar:
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/pricing
