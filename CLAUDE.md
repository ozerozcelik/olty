# CLAUDE.md — Olty MVP

## Project Identity
**App:** Olty — Hobi balıkçıları için sosyal + gamified platform  
**Stack:** React Native + Expo (SDK 52) + TypeScript + Supabase  
**Package manager:** pnpm  
**Target:** Android öncelikli (iOS Phase 1 sonunda), Türkiye pazarı, KVKK uyumlu

---

## Repo Structure
```
olty/
├── CLAUDE.md                  ← bu dosya
├── docs/
│   ├── architecture.md        ← DB şeması, API katmanı, klasör yapısı
│   ├── features.md            ← Özellik detayları ve iş kuralları
│   ├── gamification.md        ← XP, seviye, rozet sistemi kuralları
│   └── kvkk.md                ← Veri gizliliği gereksinimleri
├── app/                       ← Expo Router (file-based routing)
│   ├── (auth)/
│   ├── (tabs)/
│   └── _layout.tsx
├── src/
│   ├── components/            ← Paylaşılan UI bileşenleri
│   ├── screens/               ← Tam ekran view'ları
│   ├── hooks/                 ← Custom React hooks
│   ├── lib/
│   │   ├── supabase.ts        ← Supabase client (tek instance)
│   │   └── constants.ts       ← Uygulama sabitleri
│   ├── services/              ← API çağrıları (supabase queries)
│   ├── stores/                ← Zustand global state
│   ├── types/                 ← TypeScript tip tanımları
│   └── utils/                 ← Yardımcı fonksiyonlar
├── assets/
├── supabase/
│   ├── migrations/            ← SQL migration dosyaları
│   └── seed.sql
└── app.config.ts
```

> Detaylı mimari için `docs/architecture.md` oku.

---

## Tech Stack — Kesin Kararlar

| Katman | Kütüphane | Notlar |
|---|---|---|
| Framework | `expo` SDK 52 + `expo-router` v4 | File-based routing |
| Language | TypeScript strict mode | `any` yasak |
| State | `zustand` | Server state için `@tanstack/react-query` |
| Backend | `supabase` (EU Frankfurt) | Auth + DB + Storage + Realtime |
| Medya CDN | Cloudflare R2 | Supabase Storage bucket → R2 |
| Styling | `nativewind` v4 (Tailwind) | Inline style yasak |
| Navigation | `expo-router` | React Navigation doğrudan kullanılmaz |
| Forms | `react-hook-form` + `zod` | Manuel form state yasak |
| Notifications | `expo-notifications` + OneSignal | |
| Analytics | PostHog (self-hosted EU) | Firebase Analytics yasak |
| Icons | `@expo/vector-icons` (Ionicons) | |
| Image | `expo-image` | `<Image>` from RN yasak |
| Maps | `react-native-maps` | Fuzzy location: merkez ±2km |

---

## Coding Standards

### TypeScript
- Her fonksiyon için dönüş tipi explicit yaz
- `any` kesinlikle yasak, `unknown` + type guard kullan
- Supabase'den gelen tüm data için `types/database.ts` tiplerine bağla
- Interface > type (genişletilebilirlik için)

### Component Kuralları
- Functional component, arrow function
- Props interface component dosyasının üstünde tanımla
- `memo()` sadece kanıtlanmış performans sorununda kullan
- Maksimum 150 satır/component — daha uzunsa böl

### Dosya İsimlendirme
- Components: `PascalCase.tsx`
- Hooks: `useKebabCase.ts`
- Services: `kebab-case.service.ts`
- Types: `kebab-case.types.ts`
- Sabitler: `SCREAMING_SNAKE_CASE`

### Import Sırası
```ts
// 1. React / React Native
// 2. Expo kütüphaneleri
// 3. 3rd party
// 4. Internal (@ alias)
// 5. Relative
```

---

## Supabase Kuralları

```ts
// ✅ DOĞRU — singleton client
import { supabase } from '@/lib/supabase';

// ❌ YANLIŞ — yeni instance oluşturma
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(...);
```

- RLS her tabloda aktif — bypass etme
- `service_role` key client-side kod içinde ASLA kullanılmaz
- Realtime subscription: `useEffect` cleanup içinde `channel.unsubscribe()` zorunlu
- Auth: `supabase.auth.getSession()` → `useAuthStore`'da tutulur, component'lerde tekrar çağırılmaz

---

## State Yönetimi

```
Supabase (kaynak of truth)
    ↓
React Query (server cache, background sync)
    ↓
Zustand stores (UI state, auth, session)
    ↓
Component local state (sadece UI ephemeral)
```

**Store listesi:**
- `useAuthStore` — kullanıcı oturumu, profil
- `useFeedStore` — feed cache, pagination cursor
- `useGamificationStore` — XP, seviye, kazanılmamış rozetler (optimistic)

---

## Önemli İş Kuralları

### Catch Log
- Fotoğraf zorunlu değil ama varsa max 5 MB, JPEG/PNG
- Konum: Tam koordinat DB'de şifreli saklanır, feed'de fuzzy (±2km) gösterilir
- Balık türü: `fish_species` tablosundan dropdown, "Diğer" seçeneği + serbest metin
- Boyut: cm (boy) + gram (ağırlık), ikisi de opsiyonel

### XP Sistemi
> Detay: `docs/gamification.md`

| Eylem | XP |
|---|---|
| İlk catch log | 100 |
| Catch log (fotoğraflı) | 30 |
| Catch log (fotoğrafsız) | 10 |
| Paylaşım beğenisi alma | 2 (max 20/gün) |
| Yorum alma | 5 |
| Catch & Release işaretleme | +15 bonus |
| Günlük giriş streak | 10×streak_gün |

### Seviye Eşikleri
`Acemi (0) → Balıkçı (500 XP) → Uzman (2000) → Usta (8000) → Kaptan (25000)`

### Konum Gizliliği (KRİTİK)
- Tam konum asla public endpoint'ten dönmez
- `get_catch_public` view: `ST_SnapToGrid(location, 0.02)` ile yuvarlanmış
- Kullanıcı "exact location" toggle açabilir (kendi postları için)

---

## KVKK Gereksinimleri
> Detay: `docs/kvkk.md`

- Kayıt sırasında: konum izni + pazarlama onayı ayrı ayrı checkbox
- `user_consents` tablosuna timestamp + IP ile kayıt
- Veri silme: `DELETE /api/user/me` → cascade, 30 gün içinde tamamlanmalı
- Analytics event'leri: kullanıcı ID yerine anonim session ID gönder

---

## Performans Kuralları

- FlatList: `getItemLayout` + `keyExtractor` her zaman tanımla
- Görsel: `expo-image` ile `contentFit="cover"`, `placeholder` blur-hash
- Heavy işlemler (görsel sıkıştırma): `expo-task-manager` ile background task
- Bundle size: `import { X } from 'lodash'` yasak → `import X from 'lodash/X'`

---

## Environment Variables

```bash
# .env.local (asla commit'leme)
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_POSTHOG_KEY=
EXPO_PUBLIC_ONESIGNAL_APP_ID=
EXPO_PUBLIC_CF_R2_PUBLIC_URL=

# Server-only (EAS secrets)
SUPABASE_SERVICE_ROLE_KEY=
```

`EXPO_PUBLIC_` prefix'i olmayan değişkenler client bundle'a dahil edilmez.

---

## Komutlar

```bash
pnpm start              # Expo dev server
pnpm android            # Android emulator
pnpm ios                # iOS simulator
pnpm typecheck          # tsc --noEmit (her değişiklik sonrası çalıştır)
pnpm lint               # ESLint
pnpm test               # Jest
pnpm db:types           # Supabase → TypeScript tip üretimi
pnpm db:migrate         # Supabase migration push
```

Supabase Edge Function deploy notu:
- `supabase functions deploy identify-fish`
- `supabase functions deploy moderate-image`
- `supabase secrets set ANTHROPIC_API_KEY=your_key_here`
- `supabase secrets set AWS_ACCESS_KEY_ID=your_key_here AWS_SECRET_ACCESS_KEY=your_secret_here AWS_REGION=eu-west-1`

Dashboard notlari:
- Supabase Auth dashboard'unda redirect URL'leri `olty://` ve `https://olty.app` olacak sekilde guncelle
- EAS dashboard'unda proje gorunen adini `Olty` olarak guncelle

---

## Sık Yapılan Hatalar (Yapma)

1. `console.log` production'da bırakma — `__DEV__` guard kullan
2. Supabase query'yi component içinde direkt yazma — service fonksiyonu yaz
3. `useEffect` dependency array'ini eksik bırakma
4. Navigation için `router.push` yerine `<Link>` kullanmayı unutma
5. Fotoğraf upload öncesi `expo-image-manipulator` ile boyut küçültmeyi atlamak (max 1200px)
6. `AsyncStorage`'a hassas veri yazmak — Supabase session otomatik yönetir
7. Android back button için `useFocusEffect` cleanup'ı eksik bırakmak

---

## Yardımcı Dosyalar

Bir özelliği implement etmeden önce oku:
- **Yeni ekran:** `docs/architecture.md#routing`
- **DB sorgusu:** `docs/architecture.md#database`
- **XP/rozet:** `docs/gamification.md`
- **Gizlilik/konum:** `docs/kvkk.md`
- **Yeni özellik kapsamı:** `docs/features.md`
