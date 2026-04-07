import { supabase } from '@/lib/supabase';
import type {
  TournamentCatchCandidate,
  TournamentDetail,
  TournamentInsert,
  TournamentLeaderboardEntry,
  TournamentListItem,
  TournamentRow,
  TournamentStatus,
} from '@/types/app.types';

const PAGE_LIMIT = 50;

const getCurrentUserId = async (): Promise<string> => {
  const sessionResponse = await supabase.auth.getSession();
  const userId = sessionResponse.data.session?.user.id;

  if (!userId) {
    throw new Error('Oturum bulunamadı.');
  }

  return userId;
};

const getParticipantCountMap = async (
  tournamentIds: string[],
): Promise<Map<string, number>> => {
  if (!tournamentIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('tournament_participants')
    .select('tournament_id')
    .in('tournament_id', tournamentIds);

  if (error) {
    throw new Error(error.message);
  }

  const countMap = new Map<string, number>();
  (data ?? []).forEach((item) => {
    countMap.set(item.tournament_id, (countMap.get(item.tournament_id) ?? 0) + 1);
  });

  return countMap;
};

const getNowIso = (): string => new Date().toISOString();

const getTournamentScore = (
  scoringType: string,
  catchRow: { length_cm: number | null; weight_g: number | null },
): number => {
  switch (scoringType) {
    case 'weight':
      return catchRow.weight_g ?? 0;
    case 'count':
      return 1;
    default:
      return catchRow.length_cm ?? 0;
  }
};

const isTournamentLive = (tournament: TournamentRow): boolean => {
  const now = getNowIso();

  return (
    tournament.status === 'active' &&
    tournament.starts_at <= now &&
    tournament.ends_at >= now
  );
};

const isTournamentUpcoming = (tournament: TournamentRow): boolean => {
  const now = getNowIso();

  return tournament.status === 'active' && tournament.starts_at > now;
};

const isTournamentFinished = (tournament: TournamentRow): boolean => {
  const now = getNowIso();

  return tournament.status === 'finished' || tournament.ends_at < now;
};

export const getTournaments = async (
  status?: TournamentStatus,
): Promise<TournamentListItem[]> => {
  let query = supabase
    .from('tournaments')
    .select('*')
    .order('starts_at', { ascending: true })
    .limit(PAGE_LIMIT);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const countMap = await getParticipantCountMap(rows.map((row) => row.id));

  return rows.map((row) => ({
    ...row,
    participantCount: countMap.get(row.id) ?? 0,
  }));
};

export const getTournamentById = async (id: string): Promise<TournamentDetail> => {
  const currentUserId = await getCurrentUserId();
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const [
    participantCountMap,
    participantResponse,
    creatorResponse,
  ] = await Promise.all([
    getParticipantCountMap([id]),
    supabase
      .from('tournament_participants')
      .select('id')
      .eq('tournament_id', id)
      .eq('user_id', currentUserId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', tournament.created_by)
      .maybeSingle(),
  ]);

  if (participantResponse.error) {
    throw new Error(participantResponse.error.message);
  }

  if (creatorResponse.error) {
    throw new Error(creatorResponse.error.message);
  }

  return {
    ...tournament,
    participantCount: participantCountMap.get(id) ?? 0,
    isJoined: Boolean(participantResponse.data),
    canSubmitCatch: Boolean(participantResponse.data) && isTournamentLive(tournament),
    creator: creatorResponse.data,
  };
};

export const joinTournament = async (tournamentId: string): Promise<void> => {
  const currentUserId = await getCurrentUserId();
  const tournament = await getTournamentById(tournamentId);

  if (isTournamentFinished(tournament)) {
    throw new Error('Bitmis turnuvaya katilamazsin.');
  }

  if (
    tournament.max_participants !== null &&
    tournament.participantCount >= tournament.max_participants &&
    !tournament.isJoined
  ) {
    throw new Error('Turnuva kontenjani dolu.');
  }

  const { error } = await supabase.from('tournament_participants').insert({
    tournament_id: tournamentId,
    user_id: currentUserId,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const leaveTournament = async (tournamentId: string): Promise<void> => {
  const currentUserId = await getCurrentUserId();
  const { error } = await supabase
    .from('tournament_participants')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('user_id', currentUserId);

  if (error) {
    throw new Error(error.message);
  }
};

export const submitCatchToTournament = async (
  tournamentId: string,
  catchId: string,
): Promise<void> => {
  const currentUserId = await getCurrentUserId();
  const tournament = await getTournamentById(tournamentId);

  if (!tournament.isJoined) {
    throw new Error('Once turnuvaya katilmalisin.');
  }

  if (!isTournamentLive(tournament)) {
    throw new Error('Bu turnuva şu anda aktif değil.');
  }

  const { data: catchRow, error: catchError } = await supabase
    .from('catches')
    .select('id, user_id, length_cm, weight_g, created_at')
    .eq('id', catchId)
    .eq('user_id', currentUserId)
    .single();

  if (catchError) {
    throw new Error(catchError.message);
  }

  if (catchRow.created_at < tournament.starts_at || catchRow.created_at > tournament.ends_at) {
    throw new Error('Bu av turnuva tarihleri içinde değil.');
  }

  const score = getTournamentScore(tournament.scoring_type, catchRow);

  const { error } = await supabase.from('tournament_catches').insert({
    tournament_id: tournamentId,
    catch_id: catchId,
    user_id: currentUserId,
    score,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const getTournamentLeaderboard = async (
  tournamentId: string,
): Promise<TournamentLeaderboardEntry[]> => {
  const { data, error } = await supabase
    .from('tournament_catches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('score', { ascending: false })
    .order('submitted_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const grouped = new Map<
    string,
    { bestScore: number; submittedCatchCount: number }
  >();

  (data ?? []).forEach((item) => {
    const current = grouped.get(item.user_id);

    if (!current) {
      grouped.set(item.user_id, { bestScore: item.score, submittedCatchCount: 1 });
      return;
    }

    grouped.set(item.user_id, {
      bestScore: Math.max(current.bestScore, item.score),
      submittedCatchCount: current.submittedCatchCount + 1,
    });
  });

  const userIds = Array.from(grouped.keys());
  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileMap = new Map((profiles ?? []).map((item) => [item.id, item]));

  return userIds
    .map((userId) => ({
      userId,
      username: profileMap.get(userId)?.username ?? 'Bilinmeyen',
      avatarUrl: profileMap.get(userId)?.avatar_url ?? null,
      bestScore: grouped.get(userId)?.bestScore ?? 0,
      submittedCatchCount: grouped.get(userId)?.submittedCatchCount ?? 0,
    }))
    .sort((left, right) => right.bestScore - left.bestScore)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
};

export const createTournament = async (data: TournamentInsert): Promise<TournamentRow> => {
  const currentUserId = await getCurrentUserId();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', currentUserId)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile.is_admin) {
    throw new Error('Bu işlem için admin yetkisi gerekli.');
  }

  const now = getNowIso();
  const nextStatus: TournamentStatus = data.ends_at < now ? 'finished' : 'active';
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      ...data,
      created_by: currentUserId,
      status: nextStatus,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return tournament;
};

export const getTournamentCatchCandidates = async (
  tournamentId: string,
): Promise<TournamentCatchCandidate[]> => {
  const currentUserId = await getCurrentUserId();
  const tournament = await getTournamentById(tournamentId);
  const { data: submittedRows, error: submittedError } = await supabase
    .from('tournament_catches')
    .select('catch_id')
    .eq('tournament_id', tournamentId);

  if (submittedError) {
    throw new Error(submittedError.message);
  }

  let query = supabase
    .from('catches')
    .select('id, species_id, species_custom, length_cm, weight_g, created_at')
    .eq('user_id', currentUserId)
    .gte('created_at', tournament.starts_at)
    .lte('created_at', tournament.ends_at)
    .order('created_at', { ascending: false });

  const submittedCatchIds = (submittedRows ?? []).map((item) => item.catch_id);

  if (submittedCatchIds.length) {
    query = query.not('id', 'in', `(${submittedCatchIds.map((item) => `"${item}"`).join(',')})`);
  }

  const { data: catches, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const speciesIds = Array.from(
    new Set((catches ?? []).map((item) => item.species_id).filter((item): item is number => item !== null)),
  );
  const { data: species, error: speciesError } = speciesIds.length
    ? await supabase.from('fish_species').select('id, name_tr').in('id', speciesIds)
    : { data: [], error: null };

  if (speciesError) {
    throw new Error(speciesError.message);
  }

  const speciesMap = new Map((species ?? []).map((item) => [item.id, item.name_tr]));

  return (catches ?? []).map((item) => ({
    id: item.id,
    speciesName:
      item.species_id !== null
        ? speciesMap.get(item.species_id) ?? item.species_custom ?? 'Tür belirtilmedi'
        : item.species_custom ?? 'Tür belirtilmedi',
    lengthCm: item.length_cm,
    weightG: item.weight_g,
    createdAt: item.created_at,
  }));
};

export const isLiveTournament = isTournamentLive;
export const isUpcomingTournament = isTournamentUpcoming;
export const isFinishedTournament = isTournamentFinished;
