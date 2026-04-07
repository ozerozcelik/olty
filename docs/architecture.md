# architecture.md — Olty Teknik Mimari

## Database Şeması (Supabase / PostgreSQL)

### Tablolar

```sql
-- Kullanıcı profilleri (auth.users'ı extend eder)
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null check (length(username) between 3 and 30),
  display_name  text,
  avatar_url    text,
  bio           text check (length(bio) <= 160),
  city          text,
  fishing_type  text[] default '{}',  -- ['olta','fly','kıyı','tekne']
  total_xp      integer default 0,
  level         smallint default 1,   -- 1=Acemi 2=Balıkçı 3=Uzman 4=Usta 5=Kaptan
  follower_count  integer default 0,
  following_count integer default 0,
  catch_count     integer default 0,
  is_verified     boolean default false,
  kvkk_consent    boolean default false,
  marketing_consent boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Balık türleri referans tablosu
create table public.fish_species (
  id          serial primary key,
  name_tr     text not null,           -- Türkçe isim
  name_en     text,
  name_scientific text,
  category    text,                    -- 'tatlı_su' | 'deniz' | 'göç'
  image_url   text,
  is_active   boolean default true
);

-- Av kayıtları
create table public.catches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  species_id    integer references public.fish_species(id),
  species_custom text,                 -- species_id null ise serbest metin
  length_cm     numeric(5,1),
  weight_g      integer,
  photo_url     text,
  photo_blur_hash text,
  location      geography(point, 4326), -- tam koordinat, RLS ile korumalı
  location_name text,                  -- kullanıcının girdiği yer adı
  show_exact_location boolean default false,
  is_catch_release boolean default false,
  fishing_type  text,                  -- 'olta'|'fly'|'kıyı'|'tekne'|'buz'
  notes         text check (length(notes) <= 500),
  xp_earned     integer default 0,
  like_count    integer default 0,
  comment_count integer default 0,
  is_public     boolean default true,
  created_at    timestamptz default now()
);

-- Sosyal: takip sistemi
create table public.follows (
  follower_id   uuid not null references public.profiles(id) on delete cascade,
  following_id  uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- Beğeniler
create table public.likes (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  catch_id    uuid not null references public.catches(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (user_id, catch_id)
);

-- Yorumlar
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  catch_id    uuid not null references public.catches(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (length(body) between 1 and 280),
  created_at  timestamptz default now()
);

-- XP işlem geçmişi
create table public.xp_transactions (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount      integer not null,
  reason      text not null,           -- 'catch_log'|'catch_release'|'like_received'|'streak'
  ref_id      uuid,                    -- ilgili catch/comment id
  created_at  timestamptz default now()
);

-- Rozetler referans
create table public.badge_definitions (
  id          serial primary key,
  slug        text unique not null,    -- 'first_catch', 'ten_catches' vs
  name_tr     text not null,
  description_tr text,
  icon_url    text,
  xp_reward   integer default 0,
  category    text                     -- 'milestone'|'streak'|'species'|'eco'
);

-- Kullanıcı rozetleri
create table public.user_badges (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  badge_id    integer not null references public.badge_definitions(id),
  earned_at   timestamptz default now(),
  primary key (user_id, badge_id)
);

-- KVKK onay kaydı
create table public.user_consents (
  id          bigserial primary key,
  user_id     uuid references public.profiles(id) on delete set null,
  consent_type text not null,          -- 'kvkk'|'marketing'|'location'
  granted     boolean not null,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz default now()
);

-- Ekipman envanteri (Phase 1 sonu)
create table public.gear_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  category    text not null,           -- 'olta'|'misina'|'yem'|'makara'|'other'
  brand       text,
  model       text,
  tier        smallint default 1,      -- 1=Başlangıç 2=Orta 3=Üst 4=Efsane
  photo_url   text,
  notes       text,
  created_at  timestamptz default now()
);
```

### Kritik View'lar (RLS bypass olmadan public okuma)

```sql
-- Public feed için konum yuvarlanmış view
create view public.catches_public as
select
  c.id, c.user_id, c.species_id, c.species_custom,
  c.length_cm, c.weight_g, c.photo_url, c.photo_blur_hash,
  c.location_name,
  case
    when c.show_exact_location = true then c.location
    else ST_SnapToGrid(c.location::geometry, 0.02)::geography
  end as location,
  c.is_catch_release, c.fishing_type, c.notes,
  c.like_count, c.comment_count, c.xp_earned,
  c.created_at
from public.catches c
where c.is_public = true;
```

### RLS Politikaları (özet)

```sql
-- profiles: herkes okur, sadece kendi profilini günceller
alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- catches: public olanları herkes okur, kendi catch'ini yönetir
alter table public.catches enable row level security;
create policy "catches_select" on public.catches for select
  using (is_public = true or auth.uid() = user_id);
create policy "catches_insert" on public.catches for insert
  with check (auth.uid() = user_id);
create policy "catches_update" on public.catches for update
  using (auth.uid() = user_id);
create policy "catches_delete" on public.catches for delete
  using (auth.uid() = user_id);

-- location: sadece sahibi tam koordinatı okuyabilir (view üzerinden)
create policy "catches_location_owner" on public.catches for select
  using (auth.uid() = user_id);
```

### Index'ler

```sql
create index idx_catches_user_id     on public.catches(user_id);
create index idx_catches_created_at  on public.catches(created_at desc);
create index idx_catches_location    on public.catches using gist(location);
create index idx_follows_follower    on public.follows(follower_id);
create index idx_follows_following   on public.follows(following_id);
create index idx_likes_catch_id      on public.likes(catch_id);
create index idx_xp_user_id          on public.xp_transactions(user_id, created_at desc);
```

---

## Routing (Expo Router v4)

```
app/
├── _layout.tsx              ← Root layout (ThemeProvider, QueryClient, AuthGuard)
├── index.tsx                ← Splash / redirect (auth durumuna göre)
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   ├── register.tsx
│   └── onboarding.tsx       ← İlk catch tutorial (yalnızca yeni kullanıcı)
└── (tabs)/
    ├── _layout.tsx          ← Tab bar tanımı
    ├── index.tsx            ← Feed (home)
    ├── explore.tsx          ← Keşfet + lider tablosu
    ├── log.tsx              ← Catch log modal trigger
    ├── notifications.tsx    ← Bildirimler
    └── profile/
        ├── index.tsx        ← Kendi profil
        └── [username].tsx   ← Başka kullanıcı profili

-- Modaller (tabs dışı, stack üstünde)
app/
├── catch/
│   ├── new.tsx              ← Yeni catch log formu
│   └── [id].tsx             ← Catch detay
├── settings/
│   ├── index.tsx
│   ├── privacy.tsx
│   └── account.tsx
└── gear/
    └── index.tsx            ← Ekipman envanteri
```

### AuthGuard Paterni

```tsx
// app/_layout.tsx
export default function RootLayout() {
  const { session, loading } = useAuthStore();

  if (loading) return <SplashScreen />;

  return (
    <Stack>
      {session ? (
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}
```

---

## Service Katmanı

Her Supabase sorgusu `src/services/` altında izole edilir.

```
src/services/
├── auth.service.ts        ← signIn, signUp, signOut, getSession
├── catches.service.ts     ← createCatch, getFeed, getCatchById, deleteCatch
├── profiles.service.ts    ← getProfile, updateProfile, searchUsers
├── social.service.ts      ← follow, unfollow, likeCatch, unlikeCatch, getComments
├── gamification.service.ts← awardXP, checkBadges, getLeaderboard
├── gear.service.ts        ← addGearItem, updateGearItem, deleteGearItem
└── storage.service.ts     ← uploadCatchPhoto, deletePhoto (R2 wrapper)
```

### Örnek Service Fonksiyonu

```ts
// src/services/catches.service.ts
import { supabase } from '@/lib/supabase';
import type { CatchInsert, CatchRow } from '@/types/database.types';

export async function createCatch(data: CatchInsert): Promise<CatchRow> {
  const { data: row, error } = await supabase
    .from('catches')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return row;
}

export async function getFeedCatches(
  cursor?: string,
  limit = 20
): Promise<CatchRow[]> {
  let query = supabase
    .from('catches_public')
    .select(`*, profiles(username, avatar_url, level)`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
```

---

## Tip Üretimi

```bash
pnpm db:types
# → supabase gen types typescript --project-id $PROJECT_ID > src/types/database.types.ts
```

`database.types.ts` asla elle düzenlenmez. Üretilmiş tipleri extend etmek için:

```ts
// src/types/app.types.ts
import type { Tables } from './database.types';

export type CatchRow    = Tables<'catches'>;
export type CatchInsert = Omit<CatchRow, 'id' | 'created_at' | 'xp_earned' | 'like_count' | 'comment_count'>;
export type ProfileRow  = Tables<'profiles'>;
```
