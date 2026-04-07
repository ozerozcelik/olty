import { track } from '@/lib/analytics';
import { getLevelFromXP, LEVELS, XP_REWARDS } from '@/lib/constants';
import { EventBus } from '@/lib/eventBus';
import { getDailyGameStreak, getDailyStats } from '@/services/dailyGameStats.service';
import { supabase } from '@/lib/supabase';
import type { BadgeDefinitionRow, LeaderboardEntry, LeaderboardScope, LeaderboardType, ProfileRow } from '@/types/app.types';

type XpReason =
  | 'catch_log'
  | 'catch_release'
  | 'fishdex_discovery'
  | 'like_received'
  | 'comment_received'
  | 'streak'
  | 'badge_earned'
  | 'daily_game'
  | 'fish_id';

interface AwardXpParams {
  userId: string;
  amount: number;
  reason: XpReason;
  refId?: string;
}

interface LeaderboardProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  city: string | null;
  level: number;
  total_xp: number;
}

const getProfileById = async (userId: string): Promise<ProfileRow> => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw new Error(error.message);
  return data;
};

const getBadgeDefinitionBySlug = async (slug: string): Promise<BadgeDefinitionRow | null> => {
  const { data, error } = await supabase.from('badge_definitions').select('*').eq('slug', slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

const hasBadge = async (userId: string, slug: string): Promise<boolean> => {
  const badge = await getBadgeDefinitionBySlug(slug);
  if (!badge) return false;
  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId)
    .eq('badge_id', badge.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
};

const getStreak = async (userId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('catches')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const uniqueDays = Array.from(
    new Set((data ?? []).map((item) => new Date(item.created_at).toISOString().slice(0, 10))),
  );

  if (!uniqueDays.length) return 0;

  let streak = 1;
  for (let index = 1; index < uniqueDays.length; index += 1) {
    const current = new Date(uniqueDays[index - 1]);
    const previous = new Date(uniqueDays[index]);
    const diff = (current.getTime() - previous.getTime()) / 86400000;
    if (diff === 1) streak += 1;
    else break;
  }

  return streak;
};

const getDistinctSpeciesCount = async (userId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('catches')
    .select('species_id, species_custom')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  const uniqueSpecies = new Set(
    (data ?? []).map((item) => item.species_id?.toString() ?? item.species_custom ?? 'unknown'),
  );

  return uniqueSpecies.size;
};

const getCatchReleaseCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('catches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_catch_release', true);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
};

const hasSpeciesCatch = async (userId: string, speciesName: string): Promise<boolean> => {
  const { data: species, error: speciesError } = await supabase
    .from('fish_species')
    .select('id')
    .eq('name_tr', speciesName)
    .maybeSingle();

  if (speciesError) throw new Error(speciesError.message);
  if (!species) return false;

  const { data, error } = await supabase
    .from('catches')
    .select('id')
    .eq('user_id', userId)
    .eq('species_id', species.id)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return Boolean(data);
};

const allGearIsLegend = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('gear_items')
    .select('tier')
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length < 5) {
    return false;
  }

  return data.every((item) => item.tier === 4);
};

const grantBadge = async (userId: string, slug: string): Promise<void> => {
  const badge = await getBadgeDefinitionBySlug(slug);
  if (!badge) return;

  const alreadyEarned = await hasBadge(userId, slug);
  if (alreadyEarned) return;

  const { error } = await supabase.from('user_badges').insert({
    user_id: userId,
    badge_id: badge.id,
  });

  if (error) throw new Error(error.message);

  if (badge.xp_reward > 0) {
    await awardXP({
      userId,
      amount: badge.xp_reward,
      reason: 'badge_earned',
    });
  }

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'badge',
    title: 'Yeni rozet kazandin! ',
    body: `${badge.name_tr} rozetini kazandin.`,
    ref_id: badge.id.toString(),
    ref_type: 'badge',
  });

  EventBus.emit('BADGE_EARNED', {
    badgeName: badge.name_tr,
    badgeIcon: badge.icon_url,
  });
  track('badge_earned', { badge_slug: slug });
};

const getScopedProfiles = async (scope: LeaderboardScope): Promise<LeaderboardProfile[]> => {
  if (scope === 'country') {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, city, level, total_xp')
      .order('total_xp', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  const sessionResponse = await supabase.auth.getSession();
  const currentUserId = sessionResponse.data.session?.user.id;
  if (!currentUserId) return [];

  const currentProfile = await getProfileById(currentUserId);
  if (!currentProfile.city) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, city, level, total_xp')
    .eq('city', currentProfile.city);

  if (error) throw new Error(error.message);

  return data ?? [];
};

export const awardXP = async (params: AwardXpParams): Promise<void> => {
  const { error: transactionError } = await supabase.from('xp_transactions').insert({
    user_id: params.userId,
    amount: params.amount,
    reason: params.reason,
    ref_id: params.refId ?? null,
  });

  if (transactionError) {
    console.error('xp_transaction error:', JSON.stringify(transactionError));
    throw new Error(transactionError.message);
  }

  const { error: profileError } = await supabase.rpc('increment_xp', {
    p_user_id: params.userId,
    p_amount: params.amount,
  });

  if (profileError) {
    console.error('increment_xp error:', JSON.stringify(profileError));
    throw new Error(profileError.message);
  }

  try {
    await checkLevelUp(params.userId);
  } catch (levelError: unknown) {
    console.error('checkLevelUp failed (non-blocking):', levelError);
  }

  try {
    await checkBadges(params.userId, params.reason);
  } catch (badgeError: unknown) {
    console.error('checkBadges failed (non-blocking):', badgeError);
  }
};

export const checkLevelUp = async (userId: string): Promise<void> => {
  const profile = await getProfileById(userId);
  const newLevel = getLevelFromXP(profile.total_xp);

  if (profile.level === newLevel.level) return;

  const { error } = await supabase
    .from('profiles')
    .update({ level: newLevel.level })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'level_up',
    title: 'Seviye atladin! ',
    body: `Seviye ${newLevel.level} oldun: ${newLevel.name}`,
  });

  EventBus.emit('LEVEL_UP', {
    newLevel: newLevel.level,
    levelName: newLevel.name,
    totalXP: profile.total_xp,
  });
  track('level_up', { new_level: newLevel.level });
};

export const checkBadges = async (userId: string, trigger: string): Promise<void> => {
  const profile = await getProfileById(userId);
  const [streak, releaseCount, speciesCount, hasLevrek, hasLegendGear, stats, gameStreak] = await Promise.all([
    trigger === 'streak' ? getStreak(userId) : Promise.resolve(0),
    trigger === 'catch_release' ? getCatchReleaseCount(userId) : Promise.resolve(0),
    trigger === 'catch_log' ? getDistinctSpeciesCount(userId) : Promise.resolve(0),
    trigger === 'catch_log' ? hasSpeciesCatch(userId, 'Levrek') : Promise.resolve(false),
    trigger === 'gear_update' ? allGearIsLegend(userId) : Promise.resolve(false),
    trigger === 'daily_game' || trigger === 'fish_id'
      ? getDailyStats(userId)
      : Promise.resolve({
          totalQuestionsAnswered: 0,
          totalQuestionsCorrect: 0,
          totalFishAnswered: 0,
          totalFishCorrect: 0,
        }),
    trigger === 'daily_game' || trigger === 'fish_id'
      ? getDailyGameStreak(userId)
      : Promise.resolve(0),
  ]);

  const checks: { slug: string; condition: boolean }[] = [
    { slug: 'first_catch', condition: trigger === 'catch_log' && profile.catch_count === 1 },
    { slug: 'ten_catches', condition: trigger === 'catch_log' && profile.catch_count === 10 },
    { slug: 'fifty_catches', condition: trigger === 'catch_log' && profile.catch_count === 50 },
    { slug: 'hundred_catches', condition: trigger === 'catch_log' && profile.catch_count === 100 },
    { slug: 'first_release', condition: trigger === 'catch_release' && releaseCount === 1 },
    { slug: 'ten_releases', condition: trigger === 'catch_release' && releaseCount === 10 },
    { slug: 'eco_warrior', condition: trigger === 'catch_release' && releaseCount === 50 },
    { slug: 'streak_3', condition: trigger === 'streak' && streak === 3 },
    { slug: 'streak_7', condition: trigger === 'streak' && streak === 7 },
    { slug: 'streak_30', condition: trigger === 'streak' && streak === 30 },
    { slug: 'first_bass', condition: trigger === 'catch_log' && hasLevrek },
    { slug: 'five_species', condition: trigger === 'catch_log' && speciesCount >= 5 },
    { slug: 'ten_species', condition: trigger === 'catch_log' && speciesCount >= 10 },
    { slug: 'twentyfive_species', condition: trigger === 'catch_log' && speciesCount >= 25 },
    { slug: 'fifty_species', condition: trigger === 'catch_log' && speciesCount >= 50 },
    { slug: 'fishdex_master', condition: trigger === 'catch_log' && speciesCount >= 80 },
    { slug: 'first_follower', condition: trigger === 'follow' && profile.follower_count === 1 },
    { slug: 'popular', condition: trigger === 'follow' && profile.follower_count === 100 },
    { slug: 'gear_legend', condition: trigger === 'gear_update' && hasLegendGear },
    { slug: 'daily_first_answer', condition: trigger === 'daily_game' && stats.totalQuestionsAnswered === 1 },
    { slug: 'daily_correct_3', condition: trigger === 'daily_game' && stats.totalQuestionsCorrect === 3 },
    { slug: 'daily_correct_7', condition: trigger === 'daily_game' && stats.totalQuestionsCorrect === 7 },
    { slug: 'fish_id_first', condition: trigger === 'fish_id' && stats.totalFishAnswered === 1 },
    { slug: 'fish_id_correct_5', condition: trigger === 'fish_id' && stats.totalFishCorrect === 5 },
    { slug: 'fish_id_correct_20', condition: trigger === 'fish_id' && stats.totalFishCorrect === 20 },
    { slug: 'daily_streak_7', condition: (trigger === 'daily_game' || trigger === 'fish_id') && gameStreak === 7 },
    { slug: 'daily_streak_30', condition: (trigger === 'daily_game' || trigger === 'fish_id') && gameStreak === 30 },
  ];

  for (const check of checks) {
    if (!check.condition) continue;
    await grantBadge(userId, check.slug);
  }
};

export const getLeaderboard = async (
  type: LeaderboardType,
  scope: LeaderboardScope,
  periodDays?: number,
): Promise<LeaderboardEntry[]> => {
  const scopedProfiles = await getScopedProfiles(scope);
  const profileMap = new Map(scopedProfiles.map((profile) => [profile.id, profile]));

  if (type === 'all_time_xp') {
    return scopedProfiles
      .sort((left, right) => right.total_xp - left.total_xp)
      .map((profile, index) => ({
        rank: index + 1,
        userId: profile.id,
        username: profile.username,
        avatarUrl: profile.avatar_url,
        city: profile.city,
        level: profile.level,
        value: profile.total_xp,
      }));
  }

  const days = periodDays ?? 7;
  const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data: catches, error } = await supabase
    .from('catches')
    .select('user_id, length_cm')
    .eq('is_public', true)
    .gte('created_at', periodStart);

  if (error) throw new Error(error.message);

  const allowedUserIds = new Set(scopedProfiles.map((profile) => profile.id));
  const weeklyStats = new Map<string, number>();

  for (const item of catches ?? []) {
    if (!allowedUserIds.has(item.user_id)) continue;
    const currentValue = weeklyStats.get(item.user_id) ?? 0;
    const nextValue =
      type === 'weekly_catch_count'
        ? currentValue + 1
        : Math.max(currentValue, item.length_cm ?? 0);
    weeklyStats.set(item.user_id, nextValue);
  }

  return [...weeklyStats.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([userId, value], index) => {
      const profile = profileMap.get(userId);
      return {
        rank: index + 1,
        userId,
        username: profile?.username ?? 'Bilinmeyen kullanıcı',
        avatarUrl: profile?.avatar_url ?? null,
        city: profile?.city ?? null,
        level: profile?.level ?? LEVELS[0].level,
        value,
      };
    });
};

export { LEVELS, XP_REWARDS };
