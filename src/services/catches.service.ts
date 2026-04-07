import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { XP_REWARDS } from '@/lib/constants';
import { captureError } from '@/lib/sentry';
import { awardXP } from '@/services/gamification.service';
import type {
  CatchDetail,
  CatchFeedItem,
  CatchInsert,
  CatchPublicDetailRow,
  CatchPublicRow,
  CatchRow,
  CommentListItem,
  MapCatchItem,
} from '@/types/app.types';
import { parseCatchPoint } from '@/utils/location';

export const enrichFeedCatches = async (rows: CatchPublicRow[]): Promise<CatchFeedItem[]> => {
  if (!rows.length) {
    return [];
  }

  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
  const speciesIds = Array.from(
    new Set(rows.map((row) => row.species_id).filter((value): value is number => value !== null)),
  );
  const catchIds = rows.map((row) => row.id);
  const sessionResponse = await supabase.auth.getSession();
  const currentUserId = sessionResponse.data.session?.user.id;

  const [{ data: profiles }, { data: species }, likesResponse] = await Promise.all([
    supabase.from('profiles').select('id, username, avatar_url, level').in('id', userIds),
    speciesIds.length
      ? supabase.from('fish_species').select('id, name_tr').in('id', speciesIds)
      : Promise.resolve({ data: [], error: null }),
    currentUserId
      ? supabase.from('likes').select('catch_id').eq('user_id', currentUserId).in('catch_id', catchIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const speciesMap = new Map((species ?? []).map((item) => [item.id, item]));
  const likedCatchIds = new Set((likesResponse.data ?? []).map((item) => item.catch_id));

  return rows.map((row) => ({
    ...row,
    profiles: profileMap.get(row.user_id) ?? null,
    fish_species: row.species_id ? speciesMap.get(row.species_id) ?? null : null,
    is_liked: likedCatchIds.has(row.id),
  }));
};

export const createCatch = async (data: CatchInsert): Promise<CatchRow> => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('catch_count')
      .eq('id', data.user_id)
      .single();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { data: row, error } = await supabase.from('catches').insert(data).select('*').single();

    if (error) {
      throw new Error(error.message);
    }

    const baseXp = row.photo_url
      ? XP_REWARDS.CATCH_LOG_WITH_PHOTO
      : XP_REWARDS.CATCH_LOG_NO_PHOTO;

    try {
      await awardXP({
        userId: row.user_id,
        amount: baseXp,
        reason: 'catch_log',
        refId: row.id,
      });

      if ((profile.catch_count ?? 0) === 0) {
        await awardXP({
          userId: row.user_id,
          amount: XP_REWARDS.CATCH_FIRST_EVER,
          reason: 'catch_log',
          refId: row.id,
        });
      }

      if (row.is_catch_release) {
        await awardXP({
          userId: row.user_id,
          amount: XP_REWARDS.CATCH_RELEASE_BONUS,
          reason: 'catch_release',
          refId: row.id,
        });
      }

      if (row.species_id !== null) {
        const { count, error: speciesCountError } = await supabase
          .from('catches')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', row.user_id)
          .eq('species_id', row.species_id);

        if (speciesCountError) {
          throw new Error(speciesCountError.message);
        }

        if ((count ?? 0) === 1) {
          await awardXP({
            userId: row.user_id,
            amount: XP_REWARDS.FISHDEX_NEW_SPECIES,
            reason: 'fishdex_discovery',
            refId: row.id,
          });
        }
      }
    } catch (awardError: unknown) {
      captureError(awardError, {
        service: 'createCatch-awardXP',
        catchId: row.id,
        userId: row.user_id,
      });
      console.error('createCatch side effects failed:', awardError);
    }

    track('catch_logged', {
      has_photo: Boolean(row.photo_url),
      fishing_type: row.fishing_type ?? 'unknown',
      is_catch_release: row.is_catch_release,
    });

    return row;
  } catch (error: unknown) {
    captureError(error, { service: 'createCatch' });
    throw error;
  }
};

export const updateCatch = async (
  id: string,
  data: Partial<CatchInsert>,
): Promise<CatchRow> => {
  const currentCatch = await getCatchById(id);
  const shouldAwardReleaseBonus =
    data.is_catch_release === true && currentCatch.is_catch_release === false;

  const { data: updatedCatch, error } = await supabase
    .from('catches')
    .update(data)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (shouldAwardReleaseBonus) {
    await awardXP({
      userId: updatedCatch.user_id,
      amount: XP_REWARDS.CATCH_RELEASE_BONUS,
      reason: 'catch_release',
      refId: updatedCatch.id,
    });
  }

  return updatedCatch;
};

export const getFeedCatches = async (
  cursor?: string,
  limit = 20,
): Promise<CatchFeedItem[]> => {
  let query = supabase
    .from('catches_public')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return enrichFeedCatches(data ?? []);
};

export const getDiscoveryCatches = async (
  cursor?: string,
  limit = 20,
): Promise<CatchFeedItem[]> => {
  const sessionResponse = await supabase.auth.getSession();
  const currentUserId = sessionResponse.data.session?.user.id;
  const followingResponse = currentUserId
    ? await supabase.from('follows').select('following_id').eq('follower_id', currentUserId)
    : { data: [], error: null };

  if (followingResponse.error) {
    throw new Error(followingResponse.error.message);
  }

  const excludedUserIds = [
    ...new Set([currentUserId, ...(followingResponse.data ?? []).map((item) => item.following_id)].filter(Boolean)),
  ] as string[];

  let query = supabase
    .from('catches_public')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  if (excludedUserIds.length) {
    query = query.not('user_id', 'in', `(${excludedUserIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return enrichFeedCatches(data ?? []);
};

export const getMapCatches = async (): Promise<MapCatchItem[]> => {
  const { data, error } = await supabase
    .from('catches_public')
    .select('id, user_id, species_id, species_custom, length_cm, photo_url, location, created_at')
    .not('location', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];

  if (!rows.length) {
    return [];
  }

  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
  const speciesIds = Array.from(
    new Set(rows.map((row) => row.species_id).filter((value): value is number => value !== null)),
  );

  const [{ data: profiles, error: profilesError }, { data: species, error: speciesError }] =
    await Promise.all([
      supabase.from('profiles').select('id, username').in('id', userIds),
      speciesIds.length
        ? supabase.from('fish_species').select('id, name_tr').in('id', speciesIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (speciesError) {
    throw new Error(speciesError.message);
  }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
  const speciesMap = new Map((species ?? []).map((item) => [item.id, item.name_tr]));

  return rows.reduce<MapCatchItem[]>((items, row) => {
    const point = parseCatchPoint(row.location);

    if (point.latitude === null || point.longitude === null) {
      return items;
    }

    items.push({
      id: row.id,
      latitude: point.latitude,
      longitude: point.longitude,
      speciesName:
        row.species_id !== null
          ? speciesMap.get(row.species_id) ?? row.species_custom ?? 'Tür belirtilmedi'
          : row.species_custom ?? 'Tür belirtilmedi',
      lengthCm: row.length_cm,
      photoUrl: row.photo_url,
      username: profileMap.get(row.user_id) ?? 'Bilinmeyen',
      createdAt: row.created_at,
    });

    return items;
  }, []);
};

export const getCatchById = async (id: string): Promise<CatchRow> => {
  const { data, error } = await supabase.from('catches').select('*').eq('id', id).single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getCatchDetailById = async (id: string): Promise<CatchDetail> => {
  const sessionResponse = await supabase.auth.getSession();
  const currentUserId = sessionResponse.data.session?.user.id;
  const publicCatchResponse = await supabase
    .from('catches_public_detail')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (publicCatchResponse.error) {
    throw new Error(publicCatchResponse.error.message);
  }

  let catchRow: CatchRow | CatchPublicDetailRow | null = null;

  if (publicCatchResponse.data && publicCatchResponse.data.user_id !== currentUserId) {
    catchRow = publicCatchResponse.data;
  } else {
    const ownerCatchResponse = await supabase.from('catches').select('*').eq('id', id).single();

    if (ownerCatchResponse.error) {
      throw new Error(ownerCatchResponse.error.message);
    }

    catchRow = ownerCatchResponse.data;
  }

  if (!catchRow) {
    throw new Error('Av kaydı bulunamadı.');
  }

  const [{ data: profile }, { data: species }, { data: like }] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, avatar_url, level')
      .eq('id', catchRow.user_id)
      .maybeSingle(),
    catchRow.species_id
      ? supabase
          .from('fish_species')
          .select('name_tr')
          .eq('id', catchRow.species_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    currentUserId
      ? supabase
          .from('likes')
          .select('catch_id')
          .eq('catch_id', id)
          .eq('user_id', currentUserId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    ...catchRow,
    profiles: profile,
    fish_species: species,
    is_liked: Boolean(like),
  };
};

export const getCatchComments = async (
  catchId: string,
  cursor?: string,
): Promise<CommentListItem[]> => {
  let query = supabase
    .from('comments')
    .select('*')
    .eq('catch_id', catchId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const userIds = Array.from(new Set((data ?? []).map((item) => item.user_id)));
  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return (data ?? []).map((item) => ({
    ...item,
    profiles: profileMap.get(item.user_id) ?? null,
  }));
};

export const addComment = async (
  catchId: string,
  body: string,
): Promise<CommentListItem> => {
  const sessionResponse = await supabase.auth.getSession();
  const userId = sessionResponse.data.session?.user.id;

  if (!userId) {
    throw new Error('Oturum bulunamadı.');
  }

  const createdAt = new Date().toISOString();
  const { error } = await supabase.from('comments').insert({
    catch_id: catchId,
    user_id: userId,
    body,
    created_at: createdAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  return {
    id: `comment-${Date.now()}`,
    catch_id: catchId,
    user_id: userId,
    body,
    created_at: createdAt,
    profiles: profile,
  };
};

export const deleteCatch = async (id: string): Promise<void> => {
  const { error } = await supabase.from('catches').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};
