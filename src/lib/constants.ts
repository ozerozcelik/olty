export const XP_REWARDS = {
  CATCH_LOG_WITH_PHOTO: 30,
  CATCH_LOG_NO_PHOTO: 10,
  CATCH_FIRST_EVER: 100,
  CATCH_RELEASE_BONUS: 15,
  FISHDEX_NEW_SPECIES: 40,
  LIKE_RECEIVED: 2,
  COMMENT_RECEIVED: 5,
  DAILY_STREAK_MULTIPLIER: 10,
  DAILY_GAME_PARTICIPATE: 10,
  DAILY_GAME_CORRECT: 25,
  DAILY_GAME_STREAK_7: 80,
  DAILY_GAME_STREAK_30: 300,
  BADGE_EARNED: 'badge_definitions.xp_reward alanından',
} as const;

export const LEVELS = [
  { level: 1, name: 'Acemi', minXP: 0, badge: '🎣', color: '#78909C' },
  { level: 2, name: 'Balıkçı', minXP: 500, badge: '🐟', color: '#43A047' },
  { level: 3, name: 'Uzman', minXP: 2000, badge: '🏅', color: '#1E88E5' },
  { level: 4, name: 'Usta', minXP: 8000, badge: '⚓', color: '#8E24AA' },
  { level: 5, name: 'Kaptan', minXP: 25000, badge: '👑', color: '#F4511E' },
] as const;

export const getLevelFromXP = (xp: number) => {
  return [...LEVELS].reverse().find((level) => xp >= level.minXP) ?? LEVELS[0];
};

export const getXPProgress = (
  xp: number,
): { current: number; next: number; percent: number } => {
  const current = getLevelFromXP(xp);
  const nextLevel = LEVELS.find((level) => level.level === current.level + 1);

  if (!nextLevel) {
    return { current: xp, next: xp, percent: 100 };
  }

  const progress = xp - current.minXP;
  const total = nextLevel.minXP - current.minXP;

  return {
    current: progress,
    next: total,
    percent: Math.floor((progress / total) * 100),
  };
};

export const COMMON_FISH_SPECIES = [
  { id: 1, name: 'Levrek' },
  { id: 2, name: 'Cipura' },
  { id: 3, name: 'Lüfer' },
  { id: 4, name: 'Palamut' },
  { id: 5, name: 'Sazan' },
  { id: 6, name: 'Alabalık' },
  { id: 7, name: 'Mercan' },
  { id: 8, name: 'Kefal' },
  { id: 9, name: 'Sudak' },
  { id: 10, name: 'Orkinos' },
] as const;

export const TURKEY_CITIES = [
  'Adana',
  'Adıyaman',
  'Afyonkarahisar',
  'Ağrı',
  'Aksaray',
  'Amasya',
  'Ankara',
  'Antalya',
  'Ardahan',
  'Artvin',
  'Aydın',
  'Balıkesir',
  'Bartın',
  'Batman',
  'Bayburt',
  'Bilecik',
  'Bingöl',
  'Bitlis',
  'Bolu',
  'Burdur',
  'Bursa',
  'Çanakkale',
  'Çankırı',
  'Çorum',
  'Denizli',
  'Diyarbakır',
  'Düzce',
  'Edirne',
  'Elazığ',
  'Erzincan',
  'Erzurum',
  'Eskişehir',
  'Gaziantep',
  'Giresun',
  'Gümüşhane',
  'Hakkari',
  'Hatay',
  'Iğdır',
  'Isparta',
  'İstanbul',
  'İzmir',
  'Kahramanmaraş',
  'Karabük',
  'Karaman',
  'Kars',
  'Kastamonu',
  'Kayseri',
  'Kırıkkale',
  'Kırklareli',
  'Kırşehir',
  'Kilis',
  'Kocaeli',
  'Konya',
  'Kütahya',
  'Malatya',
  'Manisa',
  'Mardin',
  'Mersin',
  'Muğla',
  'Muş',
  'Nevşehir',
  'Niğde',
  'Ordu',
  'Osmaniye',
  'Rize',
  'Sakarya',
  'Samsun',
  'Şanlıurfa',
  'Siirt',
  'Sinop',
  'Şırnak',
  'Sivas',
  'Tekirdağ',
  'Tokat',
  'Trabzon',
  'Tunceli',
  'Uşak',
  'Van',
  'Yalova',
  'Yozgat',
  'Zonguldak',
] as const;

export const FISHING_TYPE_OPTIONS = [
  { label: 'Olta', value: 'olta' },
  { label: 'Fly Fishing', value: 'fly' },
  { label: 'Kıyı', value: 'kiyi' },
  { label: 'Tekne', value: 'tekne' },
] as const;

export const CATCH_METHOD_OPTIONS = [
  { label: 'LRF', value: 'lrf' },
  { label: 'Light Spin', value: 'light_spin' },
  { label: 'Spin', value: 'spin' },
  { label: 'Jigging', value: 'jigging' },
  { label: 'Yemli Av', value: 'yemli_av' },
  { label: 'Surf Casting', value: 'surf_casting' },
  { label: 'Şamandıra', value: 'samandira' },
  { label: 'Sırtı', value: 'sirti' },
] as const;

export const CATCH_METHOD_LABELS: Record<string, string> = {
  buz: 'Buz',
  fly: 'Fly',
  kiyi: 'Kıyı',
  olta: 'Olta',
  tekne: 'Tekne',
  lrf: 'LRF',
  light_spin: 'Light Spin',
  spin: 'Spin',
  jigging: 'Jigging',
  yemli_av: 'Yemli Av',
  surf_casting: 'Surf Casting',
  samandira: 'Şamandıra',
  sirti: 'Sırtı',
};

export const getCatchMethodLabel = (value: string): string => {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) {
    return value;
  }

  return (
    CATCH_METHOD_LABELS[normalizedValue]
    ?? `${normalizedValue.charAt(0).toUpperCase()}${normalizedValue.slice(1)}`
  );
};

export const GEAR_TIERS = {
  1: { name: 'Başlangıç', color: '#78909C', badge: null },
  2: { name: 'Orta', color: '#43A047', badge: 'gear_mid' },
  3: { name: 'İleri', color: '#1E88E5', badge: 'gear_pro' },
  4: { name: 'Efsane ✨', color: '#C9A227', badge: 'gear_legend' },
} as const;

export const GEAR_CATEGORIES = [
  { label: 'Olta Kamışı', value: 'rod', icon: '🎣' },
  { label: 'Makine', value: 'reel', icon: '⚙️' },
  { label: 'Misina', value: 'line', icon: '〰️' },
  { label: 'Yem/Suni Yem', value: 'lure', icon: '🪱' },
  { label: 'İğne', value: 'hook', icon: '🪝' },
  { label: 'Aksesuar', value: 'accessories', icon: '🧰' },
] as const;
