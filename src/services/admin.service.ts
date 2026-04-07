import { supabase } from '@/lib/supabase';
import { getChallengeLeaderboard } from '@/services/weeklyChallenges.service';
import type {
  AdminStats,
  DailyQuestionRow,
  DailyQuestionUpsert,
  FishChallengeUpsert,
  ReportWithCatch,
  WeeklyChallengeInsert,
  WeeklyChallengeRow,
} from '@/types/app.types';
import { getTurkeyDateString } from '@/utils/date';

export const getAdminStats = async (): Promise<AdminStats> => {
  const today = getTurkeyDateString();
  const [questionResponse, fishResponse, challengeResponse, profileCountResponse] = await Promise.all([
    supabase.from('daily_questions').select('id').eq('date', today).maybeSingle(),
    supabase.from('daily_fish_challenges').select('id').eq('date', today).maybeSingle(),
    supabase
      .from('weekly_challenges')
      .select('title_tr')
      .gte('ends_at', new Date().toISOString())
      .order('week_start', { ascending: false })
      .maybeSingle(),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);

  if (questionResponse.error) throw new Error(questionResponse.error.message);
  if (fishResponse.error) throw new Error(fishResponse.error.message);
  if (challengeResponse.error) throw new Error(challengeResponse.error.message);
  if (profileCountResponse.error) throw new Error(profileCountResponse.error.message);

  return {
    hasTodayQuestion: Boolean(questionResponse.data),
    hasTodayFishChallenge: Boolean(fishResponse.data),
    currentWeeklyChallengeTitle: challengeResponse.data?.title_tr ?? null,
    activeUsers: profileCountResponse.count ?? 0,
  };
};

export const getTodayAdminQuestion = async (): Promise<DailyQuestionRow | null> => {
  const today = getTurkeyDateString();
  const { data, error } = await supabase.from('daily_questions').select('*').eq('date', today).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

export const upsertDailyQuestion = async (data: DailyQuestionUpsert): Promise<void> => {
  const today = getTurkeyDateString();
  const { error } = await supabase.from('daily_questions').upsert({
    date: today,
    question_tr: data.question_tr,
    question_type: data.question_type,
    options: data.options,
    correct_index: data.correct_index ?? null,
    reveal_at: data.reveal_at,
    source_note: data.source_note ?? null,
  }, { onConflict: 'date' });
  if (error) throw new Error(error.message);
};

export const deleteDailyQuestion = async (date: string): Promise<void> => {
  const { error } = await supabase.from('daily_questions').delete().eq('date', date);
  if (error) throw new Error(error.message);
};

export const getTodayFishChallengeAdmin = async () => {
  const today = getTurkeyDateString();
  const { data, error } = await supabase.from('daily_fish_challenges').select('*').eq('date', today).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

export const getRecentPhotoCatches = async (): Promise<{ id: string; photo_url: string; species_id: number | null; species_custom: string | null }[]> => {
  const { data, error } = await supabase
    .from('catches')
    .select('id, photo_url, species_id, species_custom')
    .not('photo_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).filter((item): item is { id: string; photo_url: string; species_id: number | null; species_custom: string | null } => typeof item.photo_url === 'string');
};

export const upsertFishChallenge = async (data: FishChallengeUpsert): Promise<void> => {
  const today = getTurkeyDateString();
  const { error } = await supabase.from('daily_fish_challenges').upsert({
    date: today,
    catch_id: data.catch_id ?? null,
    photo_url: data.photo_url,
    correct_species_id: data.correct_species_id ?? null,
    correct_species_name: data.correct_species_name,
    options: data.options,
    fun_fact_tr: data.fun_fact_tr ?? null,
  }, { onConflict: 'date' });
  if (error) throw new Error(error.message);
};

export const getCurrentWeeklyChallengeAdmin = async (): Promise<WeeklyChallengeRow | null> => {
  const { data, error } = await supabase
    .from('weekly_challenges')
    .select('*')
    .gte('ends_at', new Date().toISOString())
    .order('week_start', { ascending: false })
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

export const getWeeklyChallengeLeaderboard = async (challengeId: string) => {
  return getChallengeLeaderboard(challengeId);
};

export const finalizeWeeklyChallenge = async (challengeId: string): Promise<void> => {
  const { error } = await supabase.rpc('finalize_weekly_challenge', { challenge_id: challengeId });
  if (error) throw new Error(error.message);
};

export const createWeeklyChallenge = async (data: WeeklyChallengeInsert): Promise<void> => {
  const { error } = await supabase.from('weekly_challenges').insert(data);
  if (error) throw new Error(error.message);
};

export const getRecentReports = async (limit = 5): Promise<ReportWithCatch[]> => {
  const { data: reports, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const reporterIds = Array.from(new Set((reports ?? []).map((item) => item.reporter_id)));
  const catchIds = Array.from(new Set((reports ?? []).map((item) => item.catch_id)));
  const [profilesResponse, catchesResponse] = await Promise.all([
    reporterIds.length ? supabase.from('profiles').select('id, username').in('id', reporterIds) : Promise.resolve({ data: [], error: null }),
    catchIds.length ? supabase.from('catches').select('id, photo_url').in('id', catchIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResponse.error) throw new Error(profilesResponse.error.message);
  if (catchesResponse.error) throw new Error(catchesResponse.error.message);
  const profileMap = new Map((profilesResponse.data ?? []).map((item) => [item.id, item]));
  const catchMap = new Map((catchesResponse.data ?? []).map((item) => [item.id, item]));

  return (reports ?? []).map((item) => ({
    ...item,
    reporter: profileMap.get(item.reporter_id) ?? null,
    catches: catchMap.get(item.catch_id) ?? null,
  }));
};
