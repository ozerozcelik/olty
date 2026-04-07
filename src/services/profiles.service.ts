import { supabase } from '@/lib/supabase';
import type {
  CatchRow,
  GearCategoryItem,
  ProfileRow,
  ProfileStatsRow,
  ProfileUpdate,
  TopSpeciesRow,
} from '@/types/app.types';
import { getGearItems } from '@/services/gear.service';

export interface ProfileCatchItem extends CatchRow {
  species_name: string | null;
}

export interface ProfileDetails extends ProfileRow {
  badges: {
    badge_id: number;
    earned_at: string;
    badge_definitions: {
      name_tr: string;
      slug: string;
      description_tr: string | null;
      category: string | null;
      xp_reward: number;
    } | null;
  }[];
  catches: ProfileCatchItem[];
  gearSections: GearCategoryItem[];
  gearCount: number;
}

export const getProfileById = async (userId: string): Promise<ProfileRow> => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getProfileStats = async (userId: string): Promise<ProfileStatsRow> => {
  const { data, error } = await supabase
    .from('profile_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getTopSpecies = async (userId: string): Promise<TopSpeciesRow[]> => {
  const { data, error } = await supabase.rpc('get_top_species', { p_user_id: userId, p_limit: 3 });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};

export const getProfileByUsername = async (username: string): Promise<ProfileRow> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const updateProfile = async (
  userId: string,
  values: ProfileUpdate,
): Promise<ProfileRow> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(values)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const completeOnboarding = async (userId: string): Promise<ProfileRow> => {
  return updateProfile(userId, { onboarding_completed: true });
};

export const searchProfiles = async (query: string): Promise<ProfileRow[]> => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${normalizedQuery}%`)
    .order('follower_count', { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};

export const getProfileDetails = async (userId: string): Promise<ProfileDetails> => {
  const profile = await getProfileById(userId);
  const [
    { data: userBadges, error: badgesError },
    { data: catches, error: catchesError },
    gearSections,
  ] =
    await Promise.all([
      supabase
        .from('user_badges')
        .select('badge_id, earned_at')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false }),
      supabase
        .from('catches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      getGearItems(userId),
    ]);

  if (badgesError) {
    throw new Error(badgesError.message);
  }

  if (catchesError) {
    throw new Error(catchesError.message);
  }

  const speciesIds = Array.from(
    new Set((catches ?? []).map((item) => item.species_id).filter((item): item is number => item !== null)),
  );
  const speciesResponse = speciesIds.length
    ? await supabase.from('fish_species').select('id, name_tr').in('id', speciesIds)
    : { data: [], error: null };

  if (speciesResponse.error) {
    throw new Error(speciesResponse.error.message);
  }

  const badgeIds = (userBadges ?? []).map((item) => item.badge_id);
  const badgeDefinitions = badgeIds.length
    ? await supabase
        .from('badge_definitions')
        .select('id, name_tr, slug, description_tr, category, xp_reward')
        .in('id', badgeIds)
    : { data: [], error: null };

  if (badgeDefinitions.error) {
    throw new Error(badgeDefinitions.error.message);
  }

  const badgeMap = new Map(
    (badgeDefinitions.data ?? []).map((badge) => [badge.id, {
      name_tr: badge.name_tr,
      slug: badge.slug,
      description_tr: badge.description_tr,
      category: badge.category,
      xp_reward: badge.xp_reward,
    }]),
  );
  const speciesMap = new Map((speciesResponse.data ?? []).map((item) => [item.id, item.name_tr]));

  return {
    ...profile,
    badges: (userBadges ?? []).map((item) => ({
      badge_id: item.badge_id,
      earned_at: item.earned_at,
      badge_definitions: badgeMap.get(item.badge_id) ?? null,
    })),
    catches: (catches ?? []).map((item) => ({
      ...item,
      species_name: item.species_id ? speciesMap.get(item.species_id) ?? null : item.species_custom,
    })),
    gearSections,
    gearCount: gearSections.reduce((sum, section) => sum + section.items.length, 0),
  };
};
