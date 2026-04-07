import { supabase } from '@/lib/supabase';
import type {
  FishingLocationInsert,
  FishingLocationMapItem,
  FishingLocationRow,
} from '@/types/app.types';
import { parseCatchPoint } from '@/utils/location';

const toGeographyPoint = (longitude: number, latitude: number): string =>
  `SRID=4326;POINT(${longitude} ${latitude})`;

const getCurrentUserId = async (): Promise<string> => {
  const sessionResponse = await supabase.auth.getSession();
  const userId = sessionResponse.data.session?.user.id;

  if (!userId) {
    throw new Error('Oturum bulunamadı.');
  }

  return userId;
};

const getCurrentUserIdOrNull = async (): Promise<string | null> => {
  const sessionResponse = await supabase.auth.getSession();
  return sessionResponse.data.session?.user.id ?? null;
};

const enrichLocations = async (rows: FishingLocationRow[]): Promise<FishingLocationMapItem[]> => {
  if (!rows.length) {
    return [];
  }

  const currentUserId = await getCurrentUserIdOrNull();
  const userIds = Array.from(new Set(rows.map((item) => item.user_id)));
  const [{ data: profiles, error: profilesError }, likesResponse] = await Promise.all([
    supabase.from('profiles').select('id, username').in('id', userIds),
    currentUserId
      ? supabase
        .from('location_likes')
        .select('location_id')
        .eq('user_id', currentUserId)
        .in('location_id', rows.map((item) => item.id))
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (likesResponse.error) {
    throw new Error(likesResponse.error.message);
  }

  const usernameMap = new Map((profiles ?? []).map((item) => [item.id, item.username]));
  const likedLocationIds = new Set((likesResponse.data ?? []).map((item) => item.location_id));

  return rows.reduce<FishingLocationMapItem[]>((items, row) => {
    const point = parseCatchPoint(row.location);

    if (point.latitude === null || point.longitude === null) {
      return items;
    }

    items.push({
      ...row,
      latitude: point.latitude,
      longitude: point.longitude,
      is_liked: likedLocationIds.has(row.id),
      username: usernameMap.get(row.user_id) ?? null,
    });

    return items;
  }, []);
};

export const getFishingLocations = async (): Promise<FishingLocationMapItem[]> => {
  const { data, error } = await supabase
    .from('fishing_locations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) {
    throw new Error(error.message);
  }

  return enrichLocations(data ?? []);
};

export const getUserFishingLocations = async (userId: string): Promise<FishingLocationMapItem[]> => {
  const { data, error } = await supabase
    .from('fishing_locations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return enrichLocations(data ?? []);
};

export const getFishingLocationById = async (
  id: string,
): Promise<FishingLocationMapItem> => {
  const { data, error } = await supabase
    .from('fishing_locations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const items = await enrichLocations([data]);
  const item = items[0];

  if (!item) {
    throw new Error('Yer imi bulunamadı.');
  }

  return item;
};

export const createFishingLocation = async (
  data: Omit<FishingLocationInsert, 'user_id'>,
): Promise<FishingLocationRow> => {
  const userId = await getCurrentUserId();
  const point = parseCatchPoint(data.location);

  if (point.latitude === null || point.longitude === null) {
    throw new Error('Yer imi konumu çözümlenemedi.');
  }

  const payload: FishingLocationInsert = {
    ...data,
    location: toGeographyPoint(point.longitude, point.latitude),
    user_id: userId,
  };

  const { data: row, error } = await supabase
    .from('fishing_locations')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return row;
};

export const deleteFishingLocation = async (id: string): Promise<void> => {
  const { error } = await supabase.from('fishing_locations').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};

export const likeLocation = async (id: string): Promise<void> => {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('location_likes').insert({
    location_id: id,
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const unlikeLocation = async (id: string): Promise<void> => {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('location_likes')
    .delete()
    .eq('location_id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
};
