# gamification.md — XP, Seviye & Rozet Sistemi

## XP Kazanım Kuralları

```ts
// src/lib/constants.ts içinde tanımlı
export const XP_REWARDS = {
  CATCH_LOG_WITH_PHOTO:    30,
  CATCH_LOG_NO_PHOTO:      10,
  CATCH_FIRST_EVER:        100,   // sadece bir kez
  CATCH_RELEASE_BONUS:     15,    // C&R işaretlenirse ek puan
  LIKE_RECEIVED:           2,     // günlük max 20 XP bu kaynaktan
  COMMENT_RECEIVED:        5,
  DAILY_STREAK_MULTIPLIER: 10,    // 10 × streak_gün_sayısı (max 50 XP/gün)
  BADGE_EARNED:            'badge_definitions.xp_reward alanından',
} as const;
```

### Günlük Limitler (spam önleme)

| Kaynak | Günlük Limit |
|---|---|
| Catch log XP | Sınırsız |
| Beğeni alınan XP | 20 XP |
| Yorum alınan XP | 30 XP |
| Streak XP | 50 XP |

---

## Seviye Sistemi

```ts
export const LEVELS = [
  { level: 1, name: 'Acemi',   minXP: 0,     badge: '🎣',  color: '#78909C' },
  { level: 2, name: 'Balıkçı', minXP: 500,   badge: '🐟',  color: '#43A047' },
  { level: 3, name: 'Uzman',   minXP: 2000,  badge: '🏅',  color: '#1E88E5' },
  { level: 4, name: 'Usta',    minXP: 8000,  badge: '⚓',  color: '#8E24AA' },
  { level: 5, name: 'Kaptan',  minXP: 25000, badge: '👑',  color: '#F4511E' },
] as const;

export function getLevelFromXP(xp: number) {
  return [...LEVELS].reverse().find(l => xp >= l.minXP) ?? LEVELS[0];
}

export function getXPProgress(xp: number): { current: number; next: number; percent: number } {
  const current = getLevelFromXP(xp);
  const nextLevel = LEVELS.find(l => l.level === current.level + 1);
  if (!nextLevel) return { current: xp, next: xp, percent: 100 };
  const progress = xp - current.minXP;
  const total = nextLevel.minXP - current.minXP;
  return { current: progress, next: total, percent: Math.floor((progress / total) * 100) };
}
```

---

## Rozet Tanımları (Seed Data)

```sql
-- supabase/seed.sql

insert into public.badge_definitions (slug, name_tr, description_tr, xp_reward, category) values
-- Milestone rozetleri
('first_catch',       'İlk Av',           'İlk balığını yakala',                   50,  'milestone'),
('ten_catches',       'Çaylak Balıkçı',   '10 av kaydı oluştur',                   75,  'milestone'),
('fifty_catches',     'Deneyimli',        '50 av kaydı oluştur',                   150, 'milestone'),
('hundred_catches',   'Usta Elleri',      '100 av kaydı oluştur',                  300, 'milestone'),

-- Streak rozetleri
('streak_3',          '3 Günlük Seri',    '3 gün üst üste av kaydı',               30,  'streak'),
('streak_7',          'Haftalık Avcı',    '7 gün üst üste av kaydı',               80,  'streak'),
('streak_30',         'Aylık Efendi',     '30 gün üst üste av kaydı',              250, 'streak'),

-- Tür rozetleri
('first_bass',        'Levrek Avcısı',    'İlk levreği yakala',                    40,  'species'),
('five_species',      'Meraklı Balıkçı',  '5 farklı tür yakala',                   100, 'species'),
('ten_species',       'Tür Koleksiyoncusu','10 farklı tür yakala',                 200, 'species'),

-- Çevre/Sürdürülebilirlik
('first_release',     'Serbest Bırakıcı', 'İlk C&R avını yap',                    60,  'eco'),
('ten_releases',      'Doğa Dostu',       '10 C&R avı yap',                        120, 'eco'),
('eco_warrior',       'Çevre Savaşçısı',  '50 C&R avı yap',                        300, 'eco'),

-- Sosyal
('first_follower',    'Fark Edildin',     'İlk takipçini kazan',                   20,  'social'),
('popular',           'Popüler',          '100 takipçiye ulaş',                    100, 'social');
```

---

## XP Verme Akışı

Tüm XP işlemleri `gamification.service.ts` üzerinden geçer. Doğrudan `profiles.total_xp` güncellenmez.

```ts
// src/services/gamification.service.ts

export async function awardXP(params: {
  userId: string;
  amount: number;
  reason: keyof typeof XP_REWARDS;
  refId?: string;
}): Promise<void> {
  // 1. xp_transactions'a kayıt ekle
  const { error: txError } = await supabase
    .from('xp_transactions')
    .insert({ user_id: params.userId, amount: params.amount,
               reason: params.reason, ref_id: params.refId });
  if (txError) throw txError;

  // 2. profiles.total_xp güncelle (atomic)
  const { error: profileError } = await supabase.rpc('increment_xp', {
    p_user_id: params.userId,
    p_amount: params.amount,
  });
  if (profileError) throw profileError;

  // 3. Seviye atladı mı kontrol et
  await checkLevelUp(params.userId);

  // 4. Rozet tetiklendi mi kontrol et
  await checkBadges(params.userId, params.reason);
}
```

```sql
-- supabase/migrations: atomic XP increment + level update
create or replace function increment_xp(p_user_id uuid, p_amount integer)
returns void language plpgsql security definer as $$
declare
  new_xp integer;
  new_level smallint;
begin
  update public.profiles
  set total_xp = total_xp + p_amount
  where id = p_user_id
  returning total_xp into new_xp;

  -- Seviye hesapla
  new_level := case
    when new_xp >= 25000 then 5
    when new_xp >= 8000  then 4
    when new_xp >= 2000  then 3
    when new_xp >= 500   then 2
    else 1
  end;

  update public.profiles set level = new_level where id = p_user_id;
end;
$$;
```

---

## Rozet Kontrol Mantığı

```ts
// Hangi rozeti hangi koşulda ver
export async function checkBadges(userId: string, trigger: string): Promise<void> {
  const profile = await getProfileById(userId);

  const checks: Array<{ slug: string; condition: boolean }> = [
    { slug: 'first_catch',    condition: trigger === 'catch_log' && profile.catch_count === 1 },
    { slug: 'ten_catches',    condition: trigger === 'catch_log' && profile.catch_count === 10 },
    { slug: 'fifty_catches',  condition: trigger === 'catch_log' && profile.catch_count === 50 },
    { slug: 'hundred_catches',condition: trigger === 'catch_log' && profile.catch_count === 100 },
    { slug: 'first_release',  condition: trigger === 'catch_release' },
    { slug: 'streak_7',       condition: trigger === 'streak' && await getStreak(userId) === 7 },
    { slug: 'streak_30',      condition: trigger === 'streak' && await getStreak(userId) === 30 },
  ];

  for (const check of checks) {
    if (!check.condition) continue;
    const alreadyEarned = await hasBadge(userId, check.slug);
    if (alreadyEarned) continue;

    await grantBadge(userId, check.slug);
  }
}
```

---

## Optimistic UI Kuralları

XP ve beğeni gibi hızlı feedback gerektiren işlemler optimistic update ile yapılır:

```ts
// useFeedStore içinde
likeCatch: (catchId: string) => {
  // 1. UI'da anında güncelle
  set(state => ({
    catches: state.catches.map(c =>
      c.id === catchId ? { ...c, like_count: c.like_count + 1, isLiked: true } : c
    )
  }));
  // 2. Supabase'e gönder (arka planda)
  likeCatchInDB(catchId).catch(() => {
    // 3. Hata olursa geri al
    set(state => ({
      catches: state.catches.map(c =>
        c.id === catchId ? { ...c, like_count: c.like_count - 1, isLiked: false } : c
      )
    }));
  });
}
```
