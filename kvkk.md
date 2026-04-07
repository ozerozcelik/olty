# kvkk.md — KVKK Uyum Gereksinimleri

## Temel İlkeler

Olty, 6698 sayılı Kişisel Verilerin Korunması Kanunu'na (KVKK) tabidir.
Supabase EU (Frankfurt) region'da host edilir — bu GDPR ile de örtüşür.

**Tüm geliştirmeler bu kurallara uygun olmak zorundadır. "Sonra düzeltirim" kabul edilmez.**

---

## Kişisel Veri Kategorileri

| Veri | Kategori | Saklama | İşleme Amacı |
|---|---|---|---|
| E-posta | Kimlik | Hesap silinene kadar | Auth |
| Şifre hash | Kimlik | Hesap silinene kadar | Auth |
| Kullanıcı adı, profil bilgileri | Kimlik | Hesap silinene kadar | Platform işlevi |
| Konum (catch log) | Hassas | Catch silinene kadar | Sosyal paylaşım |
| IP adresi | Teknik | 90 gün | Güvenlik, fraud önleme |
| Push token | Teknik | Token geçerliliği | Bildirim |
| Analytics events | Davranışsal | 12 ay (anonim) | Ürün iyileştirme |

---

## Onay Akışı (Kayıt Ekranı)

```tsx
// Kayıt formunun son adımı — HİÇBİR ŞEY PRE-CHECKED GELMEMELİ
<ConsentScreen>
  {/* ZORUNLU — kabul edilmeden devam yok */}
  <Checkbox
    required
    label="Kişisel verilerimin işlenmesine ilişkin Aydınlatma Metni'ni okudum ve kabul ediyorum."
    link="/privacy-policy"
    onToggle={(val) => setKvkkConsent(val)}
  />

  {/* OPSİYONEL — pre-checked OLAMAZ */}
  <Checkbox
    label="Kampanya ve duyurulardan haberdar olmak istiyorum. (İsteğe bağlı)"
    onToggle={(val) => setMarketingConsent(val)}
  />
</ConsentScreen>
```

### Onay Kaydı (Her iki onay için ayrı kayıt)

```ts
// src/services/auth.service.ts — kayıt sonrası çağrılır
async function saveConsents(userId: string, consents: {
  kvkk: boolean;
  marketing: boolean;
}, meta: { ip: string; userAgent: string }): Promise<void> {
  const records = [
    { user_id: userId, consent_type: 'kvkk',      granted: consents.kvkk,      ...meta },
    { user_id: userId, consent_type: 'marketing',  granted: consents.marketing, ...meta },
    { user_id: userId, consent_type: 'location',   granted: false,              ...meta },
    // location consent → izin istendiğinde güncellenir
  ];

  await supabase.from('user_consents').insert(records);
}
```

---

## Konum Verisi

### Kurallar
- Konum izni **sadece catch log oluştururken** istenir (foreground only)
- Background location asla istenmez
- `expo-location` permission request: `Accuracy.Balanced` yeterli (pil tasarrufu)
- Ham koordinat `catches.location` alanında şifreli saklanır
- Public feed'de `catches_public` view üzerinden ±2km yuvarlanmış koordinat verilir
- Kullanıcı "tam konumu göster" toggle'ı açabilir (sadece kendi postu için)

### Permission İstek Metni (Türkçe)

```ts
// expo-location options
const locationPermissionText = {
  ios: {
    NSLocationWhenInUseUsageDescription:
      'Avını haritada göstermek ve yakınındaki diğer balıkçıları keşfetmek için konumuna ihtiyacımız var. Konum bilgin hiçbir zaman tam olarak paylaşılmaz.',
  },
  android: {
    // strings.xml içinde tanımlanır
  }
};
```

---

## Veri Silme (Hesap Silme)

### Yasal Yükümlülük
KVKK Madde 7: Kişisel veriler, işleme amacının ortadan kalkması halinde silinir.
Kullanıcı talep ettiğinde **30 gün içinde** tamamlanmalıdır.

### Silme Akışı

```sql
-- Cascade delete: profiles silininceye auth.users'a bağlı tüm veriler silinir
-- Aşağıdaki tablolar ON DELETE CASCADE ile bağlıdır:
-- catches, follows, likes, comments, xp_transactions, user_badges,
-- user_consents (set null), gear_items, user_push_tokens

-- Soft delete (30 gün bekletme)
create table public.deletion_requests (
  id          bigserial primary key,
  user_id     uuid not null,
  requested_at timestamptz default now(),
  scheduled_at timestamptz default now() + interval '30 days',
  completed_at timestamptz,
  status      text default 'pending'   -- 'pending'|'completed'|'cancelled'
);
```

```ts
// DELETE /api/user/me endpoint mantığı
export async function requestAccountDeletion(userId: string): Promise<void> {
  // 1. deletion_requests tablosuna kayıt
  await supabase.from('deletion_requests').insert({ user_id: userId });
  
  // 2. Kullanıcıyı bilgilendir (e-posta)
  await sendEmail(userId, 'deletion_confirmation');
  
  // 3. 30 gün sonra cron job gerçek silmeyi yapar
  // supabase/functions/process-deletions/index.ts
}
```

### UI Yeri
`Settings → Hesabım → Hesabı Sil` — en alta, kırmızı, "Bu işlem geri alınamaz" uyarısı + 2 kez onay

---

## Analytics Anonimleştirme

```ts
// PostHog event gönderimi — user_id yerine session_id
import PostHog from 'posthog-react-native';

// YANLIŞ ❌
posthog.identify(user.id, { email: user.email });

// DOĞRU ✓ — anonim session, user özelliği yok
posthog.capture('catch_logged', {
  species_category: catch.species?.category,   // tür kategorisi ok
  has_photo: !!catch.photo_url,
  fishing_type: catch.fishing_type,
  // user_id, email, username, koordinat GEÇMEMELİ
});
```

---

## Veri İşleme Sözleşmesi (Harici Servisler)

Aşağıdaki servislerle DPA (Data Processing Agreement) imzalanmalıdır:

| Servis | Veri İletimi | Durum |
|---|---|---|
| Supabase (Frankfurt EU) | DB, Auth, Storage | EU bölgesi ✓ |
| Cloudflare R2 | Medya dosyaları | DPA mevcut ✓ |
| PostHog (self-hosted EU) | Anonim analitik | Self-hosted ✓ |
| OpenWeather API | Şehir adı (konum yok) | Kişisel veri yok ✓ |
| OneSignal | Push token, cihaz bilgisi | DPA gerekli ⚠️ |
| Expo (EAS) | Build & OTA | Kod dağıtımı, kişisel veri yok ✓ |

---

## Checklist — Yeni Özellik Eklerken

Her yeni özellik PR'ında şu soruları yanıtla:

- [ ] Kişisel veri topluyor mu? → `user_consents` kaydı gerekiyor mu?
- [ ] Konum verisi kullanıyor mu? → Fuzzy location uygulandı mı?
- [ ] 3. parti servise veri gönderiyor mu? → DPA var mı?
- [ ] Analytics event var mı? → User ID geçmiyor mu?
- [ ] Veri saklama süresi tanımlandı mı?
- [ ] Veri silme cascade'e dahil mi?
