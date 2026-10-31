# Kotak TV — dil ve UX kontrol kaydı

31 Ekim 2026. Bu kayıt APK yayını değildir. Kullanıcı talebi gereği ZIP hazırlanmadı.

## Bu değişiklikte yapılanlar

- Türkçe, İngilizce, Almanca, Fransızca, İspanyolca ve İtalyanca için ortak çeviri katmanı; 616 sözlük girdisi.
- Sayılı/süreli metinler, EPG başlıkları, giriş/PIN hata mesajları, oynatıcı, katalog ve erişilebilirlik etiketleri.
- Sağlayıcıdan gelen kanal/film/program adlarının çevrilmeden gösterilmesi.
- Tarih/saat gösteriminde seçili dil. Yayınların gerçek zamanları değiştirilmez.
- Bildirim oluşturulurken seçili dil; dil değişince gelecekteki Kotak bildirimlerinin aynı kimlik ve saatle güncellenmesi.
- Ses tanımanın seçili dil koduyla başlatılması; altı dilde örnek EPG/öneri/maç komutları için yerel komut çözümleme. Genel amaçlı bulut yapay zekâ entegrasyonu değildir.
- Çeviri anahtarı, parametre ve kaynak metin tarama denetimleri.

## Doğrulanan kontroller

- `npm run check`: başarılı.
- `npm test`: 17 IPTV + 46 çekirdek/önbellek testi geçti.
- Hesap testleri: 10 geçti.
- Yerel simge/yapılandırma testleri: 3 geçti.
- `npm run test:i18n`: 4 test geçti; taranan metinlerde sınıflandırılmamış çeviri adayı yok. Bu, tüm cihaz ekranlarının görsel doğrulaması anlamına gelmez.
- `npm run test:ui`: 64 bileşen/etkileşim testi geçti. Toplam 144 otomatik test.
- Expo Android JavaScript/Hermes dışa aktarımı: başarılı, 5.19 MB.

## Önceki kodda bulunan ve yeniden kontrol edilen davranışlar

- Tam ekranda varsayılan `cover`: görüntüyü esnetmeden kırpar. Kenar boşluklarını kaldırmak için görüntünün bir kısmı kesilebilir. Kaynağın içine kodlanmış siyah alanlar ayrı bir konudur.
- Oynatıcı kontrolleri 3,5 saniye sonra gizlenir; dokunmayla açılır.
- Dizi üst geri düğmesi, korumalı yetişkin oturumunda uygulamaya dönüşte PIN sonrası rotanın korunması.
- EPG tek başlık; geçmiş satırlar pasif; gelecek yayın hatırlatıcısı; sağlayıcı gönderiyorsa açıklama/tür/konuk bilgileri.
- Klasik/Modern seçimleri; çocuk profili dışında film/dizi kataloğu.
- En fazla üç takım; altı ülke/lig seçimi; takım rengi ve uygulama içi logo; Ayarlar’dan değişim.
- PIN ile çocuk profilinden çıkış, yanlış PIN sınırı ve izinli kategori seçimi.

## Tamamlandı denilmeyenler

- Bu ortamda fiziksel Android telefon/emülatör ve Android yerel derlemesi çalıştırılmadı. Gerçek VLC ses/codec, tam ekran, PiP, uygulama arka plandayken Android süreç davranışı ve telefon başlatıcı simgesi cihaz testi bekliyor.
- Kullanıcının gerçek IPTV hesabına bağlanılmadı; sağlayıcı EPG kapsamı, yayın hızı ve gecikme ölçülmedi. 3–5 saniyelik gecikmenin her cihazda kalktığı veya yayınların asla donmayacağı iddia edilmez.
- Sonraki kanalı gerçekten önceden oynatan akış ön yükleme ve sanal subwoofer/çift ses DSP özelliği uygulanmadı.
- Canlı maç analizi/otomatik canlı çeviri/özet servisi bağlı değil. Bu çeviri çalışması onları etkinleştirmez.
- Mağaza ödeme entegrasyonu bu değişikliğin kapsamında değildir.

Cihaz doğrulamasında: altı dilde ekran taşması; tam ekran döndürme/dokunma; film/diziye geri dönüş; PIN girişi; gerçek EPG hatırlatıcısının bildirim teslimi; takım simgesi; uzun IPTV listesinde sekme gecikmesi ölçülmelidir. Bu ölçümler tamamlanmadan “sorunsuz APK” denilmemelidir.
