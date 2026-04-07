import { track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import type { WeeklyChallengeEntryWithProfile, WeeklyChallengeRow } from '@/types/app.types';
import { getTurkeyDateString } from '@/utils/date';

const getCurrentUserId = async (): Promise<string> => {
  const sessionResponse = await supabase.auth.getSession();
  const userId = sessionResponse.data.session?.user.id;

  if (!userId) {
    throw new Error('Oturum bulunamadı.');
  }

  return userId;
};

export const getCurrentChallenge = async (): Promise<WeeklyChallengeRow | null> => {
  const today = getTurkeyDateString();
  const { data, error } = await supabase
    .from('weekly_challenges')
    .select('*')
    .lte('week_start', today)
    .gte('ends_at', new Date().toISOString())
    .order('week_start', { ascending: false })
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getChallengeLeaderboard = async (
  challengeId: string,
): Promise<WeeklyChallengeEntryWithProfile[]> => {
  const { data: entries, error } = await supabase
    .from('weekly_challenge_entries')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('value', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const userIds = Array.from(new Set((entries ?? []).map((item) => item.user_id)));
  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase.from('profiles').select('id, username, avatar_url, level').in('id', userIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileMap = new Map((profiles ?? []).map((item) => [item.id, item]));

  return (entries ?? []).map((item, index) => ({
    ...item,
    rank: index + 1,
    profiles: profileMap.get(item.user_id) ?? null,
  }));
};

export const hasUserEnteredChallenge = async (challengeId: string): Promise<boolean> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('weekly_challenge_entries')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
};

export const submitCatchToChallenge = async (
  challengeId: string,
  catchId: string,
  value: number,
): Promise<void> => {
  const userId = await getCurrentUserId();
  const [challengeResponse, existingEntryResponse] = await Promise.all([
    supabase.from('weekly_challenges').select('*').eq('id', challengeId).single(),
    supabase
      .from('weekly_challenge_entries')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (challengeResponse.error) {
    throw new Error(challengeResponse.error.message);
  }

  if (existingEntryResponse.error) {
    throw new Error(existingEntryResponse.error.message);
  }

  const challenge = challengeResponse.data;
  const existingEntry = existingEntryResponse.data;
  const nextValue = existingEntry
    ? challenge.challenge_type === 'biggest_fish'
      ? Math.max(existingEntry.value ?? 0, value)
      : (existingEntry.value ?? 0) + 1
    : challenge.challenge_type === 'biggest_fish'
      ? value
      : 1;

  const { error } = await supabase.from('weekly_challenge_entries').upsert(
    {
      challenge_id: challengeId,
      user_id: userId,
      catch_id: catchId,
      value: nextValue,
    },
    { onConflict: 'challenge_id,user_id' },
  );

  if (error) {
    throw new Error(error.message);
  }

  track('challenge_entered', {});
};
