# SORBİ CRM - Modüler UI/Logic Sürümü

Bu paket mevcut SORBİ CRM görünümünü koruyarak kodu modüllere ayırır ve üç ana geliştirmeyi içerir:

1. **Tahsilat Takip** tablosu, Yaklaşan Yenilemeler ekranındaki gibi kompakt/Excel-benzeri satır düzenine geçirildi.
   - Müşteri avatarı + isim + TC aynı hücrede.
   - Telefon ayrı kolonda.
   - Ürün, poliçe no, taksit, tarih, tutar, durum ve aksiyonlar ayrı kolonlarda.
   - Avatar dairesine tıklayarak renk seçilebilir.
   - Tahsilat kaydı ana müşteriyle eşleşirse TC ve avatar rengi otomatik devralınır.

2. **Yaklaşan Yenilemeler avatar renk seçimi** aktif hale getirildi.
   - Yenileme satırındaki avatar dairesine tıklayın.
   - Hazır renklerden veya özel renk seçiciden renk belirleyin.
   - Yenileme ana müşteriyle bağlıysa renk diğer bağlı kayıtlara da senkronlanır.

3. **Poliçeleşti -> Yenileme otomasyonu** eklendi.
   - Yeni veya mevcut müşteri ilk kez `Poliçeleşti` durumuna geçirildiğinde sistem sorar:
     `Yaklaşan Yenilemeler'e otomatik eklensin mi?`
   - Onaylanırsa müşteri adı, telefon, ürün ve avatar rengi aktarılır.
   - Başlangıç tarihi o gün, yenileme tarihi varsayılan olarak 1 yıl sonrası atanır.
   - Poliçe no ve diğer bilgiler sonradan Yaklaşan Yenilemeler ekranından düzenlenebilir.
   - Aynı müşteri için ikinci kez otomatik yenileme kaydı oluşturulmaz.

## Dosya yapısı

```text
sorbi_crm_modular/
├── index.html
├── assets/
│   ├── css/
│   │   ├── base.css
│   │   ├── layout.css
│   │   ├── forms.css
│   │   ├── customers.css
│   │   ├── followups.css
│   │   ├── interactions.css
│   │   ├── renewals.css
│   │   ├── collections.css
│   │   ├── avatar-picker.css
│   │   ├── theme.css
│   │   └── responsive.css
│   └── js/
│       ├── core/
│       │   ├── config.js
│       │   ├── state.js
│       │   ├── storage.js
│       │   ├── demo.js
│       │   ├── dates.js
│       │   └── helpers.js
│       ├── ui/
│       │   ├── avatar-picker.js
│       │   ├── navigation.js
│       │   └── theme-events.js
│       ├── features/
│       │   ├── customers/
│       │   │   ├── list.js
│       │   │   └── crud.js
│       │   ├── renewals/
│       │   │   ├── list.js
│       │   │   └── crud.js
│       │   ├── collections/
│       │   │   ├── data.js
│       │   │   ├── filters-summary.js
│       │   │   ├── table.js
│       │   │   ├── actions.js
│       │   │   ├── modal.js
│       │   │   └── init.js
│       │   ├── followups.js
│       │   └── interactions.js
│       ├── integrations/
│       │   └── supabase-customers.js
│       └── app.js
└── README.md
```

## Kurulum

Bu paket mevcut projenin yerine kullanılacak şekilde hazırlanmıştır. `index.html` artık eski `app.js`, `style.css`, `collections.js`, `collection.css` dosyalarını yüklemez; yukarıdaki modüler dosyaları yükler.

**Logo dosyaları pakete dahil değildir.** Mevcut projenizde kullandığınız şu iki dosyayı yeni proje klasörünün kökünde tutun:

- `sorbi-logo-transparent.png`
- `Logo.pngkk.png`

LocalStorage anahtarları korunmuştur:

- `sorbi_customers`
- `sorbi_renewals`
- `sorbi_collections`
- `sorbi_theme`

Bu nedenle aynı origin/domain altında dosyaları değiştirirseniz mevcut local verileriniz korunur.

## Mimari not

Bu aşamada amaç build sistemi eklemek değil, mevcut saf HTML/CSS/JS projesini kontrol edilebilir hale getirmektir. Bu nedenle ES module/import yapısı yerine tarayıcıda doğrudan çalışan sıralı klasik script dosyaları kullanılmıştır. Sonraki aşamada React/Node veya gerçek backend mimarisine geçerken `core`, `features`, `ui`, `integrations` ayrımı korunabilir.
