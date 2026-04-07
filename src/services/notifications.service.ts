import { supabase } from '@/lib/supabase';
import type { NotificationListItem } from '@/types/app.types';

const getCurrentUserId = async (): Promise<string> => {
  const sessionResponse = await supabase.auth.getSession();
  const userId = sessionResponse.data.session?.user.id;

  if (!userId) {
    throw new Error('Oturum bulunamadı.');
  }

  return userId;
};

export const getNotifications = async (cursor?: string): Promise<NotificationListItem[]> => {
  const userId = await getCurrentUserId();
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const actorIds = Array.from(
    new Set(
      (data ?? [])
        .flatMap((item) => {
          if (item.actor_id) {
            return [item.actor_id];
          }

          if (item.ref_type === 'profile' && item.ref_id) {
            return [item.ref_id];
          }

          return [];
        })
        .filter((item): item is string => Boolean(item)),
    ),
  );

  const actorResponse = actorIds.length
    ? await supabase.from('profiles').select('id, username, avatar_url').in('id', actorIds)
    : { data: [], error: null };

  if (actorResponse.error) {
    throw new Error(actorResponse.error.message);
  }

  const actorMap = new Map((actorResponse.data ?? []).map((item) => [item.id, item]));

  return (data ?? []).map((item) => ({
    ...item,
    actor:
      (item.actor_id ? actorMap.get(item.actor_id) : null)
      ?? (item.ref_type === 'profile' && item.ref_id ? actorMap.get(item.ref_id) : null)
      ?? null,
  }));
};

export const markAllAsRead = async (): Promise<void> => {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    throw new Error(error.message);
  }
};

export const getUnreadCount = async (): Promise<number> => {
  const userId = await getCurrentUserId();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
};

export const markAllNotificationsRead = async (): Promise<void> => {
  return markAllAsRead();
};

export const getUnreadNotificationsCount = async (): Promise<number> => {
  return getUnreadCount();
};

export const syncUnreadNotificationsCount = async (): Promise<number> => {
  return getUnreadCount();
};
