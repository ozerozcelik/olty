# features.md — Özellik Detayları & İş Kuralları

## MVP Kapsamı (Phase 0-1)

Aşağıdaki özellikler ve kurallar MVP lansmanı için geçerlidir.
Phase 2+ özellikleri bu dosyada belirtilir ama henüz implement edilmez.

---

## 1. Kimlik Doğrulama & Profil

### Kayıt Akışı
1. E-posta + şifre VEYA Google/Apple OAuth
2. `username` seçimi: 3-30 karakter, `[a-z0-9_]`, unique kontrol realtime
3. Şehir seçimi (Türkiye il listesi dropdown)
4. Balıkçılık tipi seçimi (multi-select: olta, fly, kıyı, tekne)
5. KVKK onay ekranı — **zorunlu, atlanamaz** (`docs/kvkk.md`)
6. Onboarding: İlk catch log tutorial (3 adım, skip edilebilir ama XP kaybeder)

### Profil Sayfası
- Avatar, kullanıcı adı, biyografi (160 karakter), şehir, seviye rozeti
- Catch sayısı, takipçi/takip sayısı
- Kazanılan rozetler ızgara (ilk 6 görünür, tümünü gör butonu)
- Catch geçmişi masonry grid
- Kendi profil → düzenleme butonu; başkasının profili → takip/takipten çık

---

## 2. Catch Log

### Yeni Catch Oluşturma — Alan Listesi

```ts
interface NewCatchForm {
  photo?: File;                    // opsiyonel, max 5 MB, JPEG/PNG
  species_id?: number;             // fish_species dropdown
  species_custom?: string;         // species_id seçilmemişse
  length_cm?: number;              // 1-999.9 cm
  weight_g?: number;               // 1-99999 g
  location?: GeoPoint;             // harita pin veya GPS
  location_name?: string;          // kullanıcı yazabilir
  show_exact_location: boolean;    // default false
  is_catch_release: boolean;       // default false
  fishing_type?: FishingType;
  notes?: string;                  // max 500 karakter
  is_public: boolean;              // default true
}
```

### Fotoğraf Upload Pipeline

```
Kullanıcı fotoğraf seçer
  → expo-image-manipulator ile max 1200px & %80 JPEG kalitesi
  → blur-hash üretilir (önizleme için)
  → storage.service.uploadCatchPhoto() → Supabase Storage (R2)
  → URL DB'ye yazılır
```

Upload başarısız olursa catch yine de kaydedilebilir (foto olmadan).

### Konum Akışı

```
"Konumumu kullan" butonu
  → expo-location ile foreground permission iste
  → Alındıysa: harita pin otomatik oraya gider
  → Alınmadıysa: manuel pin veya şehir adı yeterli
  → show_exact_location = false (default): feed'de ±2km yuvarlanır
```

---

## 3. Sosyal Feed

### Feed Algoritması (MVP — sıralamaya dikkat)

MVP'de algoritma yok, sadece kronolojik sıralama:

```ts
// Phase 1: Takip edilenlerin catch'leri + kendi catch'leri, tarih desc
// Phase 2'de ML tabanlı sıralama devreye girer
const feed = await supabase
  .from('catches_public')
  .select('...')
  .in('user_id', [...followingIds, currentUserId])
  .order('created_at', { ascending: false })
  .range(offset, offset + 19);
```

**Yeni kullanıcı (0 takip):** "Keşfet" feed'i gösterilir (şehre göre filtreli).

### Feed Kartı Bileşenleri
- Kullanıcı avatar + kullanıcı adı + seviye rozeti + zaman damgası
- Catch fotoğrafı (blur-hash placeholder, lazy load)
- Tür adı, boyut/ağırlık (varsa), lokasyon adı, C&R rozeti (varsa)
- Beğeni butonu (optimistic), yorum sayısı, paylaş butonu
- Üç nokta menü: Kaydet / Bildir / Engelle

### Pagination
- Cursor-based: `created_at` değeri cursor
- Her sayfada 20 kayıt
- `useFeedStore` içinde cache; scroll pozisyonu korunur

---

## 4. Beğeni & Yorum

### Beğeni
- Optimistic update (bkz. `docs/gamification.md`)
- Double-tap fotoğrafa da beğeni ekler (Instagram pattern)
- Beğeni geri alınabilir

### Yorum
- Maksimum 280 karakter
- Mention desteği yok (Phase 2)
- Silme: sadece kendi yorumu veya kendi catch'indeki yorumlar
- Yükleme: ilk 3 yorum catch kartında, "tümünü gör" ayrı sayfada

---

## 5. Bildirimler

### Bildirim Tipleri (MVP)

| Tip | Tetikleyici | Push? | In-App? |
|---|---|---|---|
| `like` | Catch'in beğenilmesi | ✓ | ✓ |
| `comment` | Catch'e yorum | ✓ | ✓ |
| `follow` | Yeni takipçi | ✓ | ✓ |
| `badge` | Rozet kazanımı | ✓ | ✓ |
| `level_up` | Seviye atlama | ✓ | ✓ |
| `weather_tip` | Günlük hava/balık skoru | ✓ (08:00 yerel) | ✗ |

### Push Notification Kuralları
- Günde max 3 push (hava bildirimi + max 2 sosyal)
- Benzer bildirimler 15 dakika içinde gruplandırılır ("Ali ve 3 kişi beğendi")
- Kullanıcı kategori bazlı push kapatabilir (settings/notifications.tsx)

---

## 6. Lider Tablosu

### Tablolar (MVP)

```ts
type LeaderboardType = 
  | 'weekly_catch_count'   // Bu hafta en çok av
  | 'weekly_biggest_fish'  // Bu hafta en büyük balık (cm)
  | 'all_time_xp';         // Tüm zamanların XP sıralaması

// Filtreler
type LeaderboardScope = 'country' | 'city';
```

### Teknik: Materialized View

```sql
-- Her gün 00:00'da refresh edilir (cron job)
create materialized view public.leaderboard_weekly_catches as
select
  user_id,
  count(*) as catch_count,
  rank() over (order by count(*) desc) as rank
from public.catches
where created_at > now() - interval '7 days'
  and is_public = true
group by user_id;
```

---

## 7. Ekipman Envanteri (Phase 1 Sonu)

### Tier Sistemi

```ts
export const GEAR_TIERS = {
  1: { name: 'Başlangıç',  color: '#78909C', badge: null },
  2: { name: 'Orta',       color: '#43A047', badge: 'gear_mid' },
  3: { name: 'Üst Seviye', color: '#1E88E5', badge: 'gear_pro' },
  4: { name: 'Efsane',     color: '#F4511E', badge: 'gear_legend' },
} as const;
```

- Tier, kullanıcının kendi beyanı (doğrulama yok — Phase 3'te marka entegrasyonu)
- Tüm envanteri "Efsane" olarak işaretleyen kullanıcı "Gear Master" rozeti kazanır
  (en az 5 item, hepsi tier 4)

---

## 8. Hava & Balık Aktivite (Phase 1)

### Veri Kaynakları
- Hava: OpenWeather API (günlük plan yeterli, 1M call/ay ücretsiz)
- Balık aktivite skoru: kendi basit formül (MVP)

```ts
// Basit balık aktivite skoru algoritması (ML öncesi)
function calculateFishActivityScore(weather: WeatherData): number {
  let score = 50; // base
  
  // Basınç değişimi: düşüş = kötü, stabil = iyi
  if (weather.pressureTrend === 'falling') score -= 20;
  if (weather.pressureTrend === 'stable')  score += 15;
  
  // Rüzgar: çok güçlü kötü
  if (weather.windSpeed > 30) score -= 15;
  if (weather.windSpeed < 10) score += 10;
  
  // Sıcaklık: aşırı sıcak/soğuk kötü
  if (weather.temp > 32 || weather.temp < 5) score -= 10;
  
  // Bulutluluk: az bulutlu iyi
  if (weather.cloudCover < 30) score += 10;
  
  return Math.max(0, Math.min(100, score));
}
```

### UI
- Ana feed'de küçük "Bugünkü balık skoru" widget'ı
- Skora göre renk: yeşil (>70), sarı (40-70), kırmızı (<40)
- Tıklanınca 3 günlük detay bottom sheet

---

## Phase 2+ Özellikleri (Şimdi Implement Etme)

Aşağıdakiler bu dokümanda yer alır ama **MVP kapsamı dışındadır:**

- [ ] AI Balık Tanıma (Olty Lens) — `docs/features-phase2.md` (henüz yok)
- [ ] Eğitim Modülleri (Olty Academy)
- [ ] Sanal Turnuvalar & Event Sistemi
- [ ] Ekipman Marketplace
- [ ] Premium Abonelik
- [ ] Grup oluşturma & Spot paylaşımı
