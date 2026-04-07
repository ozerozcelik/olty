import { supabase } from '@/lib/supabase';
import type { CommentListItem, CommentRow, ProfileRow } from '@/types/app.types';

interface ProfileListPage {
  items: ProfileRow[];
  nextCursor?: string;
}

const getCurrentUserId = async (): Promise<string> => {
  const sessionResponse = await supabase.auth.getSession();
  const userId = sessionResponse.data.session?.user.id;

  if (!userId) {
    throw new Error('Oturum bulunamadı.');
  }

  return userId;
};

export const likeCatch = async (catchId: string): Promise<void> => {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('likes').insert({
    catch_id: catchId,
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const unlikeCatch = async (catchId: string): Promise<void> => {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('catch_id', catchId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
};

export const followUser = async (targetUserId: string): Promise<void> => {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('follows').insert({
    follower_id: userId,
    following_id: targetUserId,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const unfollowUser = async (targetUserId: string): Promise<void> => {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('following_id', targetUserId);

  if (error) {
    throw new Error(error.message);
  }
};

export const isFollowing = async (targetUserId: string): Promise<boolean> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('following_id', targetUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
};

export const getFollowingUserIds = async (
  targetUserIds: string[],
): Promise<Set<string>> => {
  if (!targetUserIds.length) {
    return new Set<string>();
  }

  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .in('following_id', targetUserIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data ?? []).map((item) => item.following_id));
};

const getProfilesByIds = async (userIds: string[]): Promise<ProfileRow[]> => {
  if (!userIds.length) {
    return [];
  }

  const { data, error } = await supabase.from('profiles').select('*').in('id', userIds);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};

export const getFollowers = async (
  userId: string,
  cursor?: string,
): Promise<ProfileListPage> => {
  let query = supabase
    .from('follows')
    .select('follower_id, created_at')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const items = await getProfilesByIds((data ?? []).map((item) => item.follower_id));
  const nextCursor = data && data.length === 20 ? data[data.length - 1]?.created_at : undefined;

  return { items, nextCursor };
};

export const getFollowing = async (
  userId: string,
  cursor?: string,
): Promise<ProfileListPage> => {
  let query = supabase
    .from('follows')
    .select('following_id, created_at')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const items = await getProfilesByIds((data ?? []).map((item) => item.following_id));
  const nextCursor = data && data.length === 20 ? data[data.length - 1]?.created_at : undefined;

  return { items, nextCursor };
};

export const addComment = async (catchId: string, body: string): Promise<CommentRow> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('comments')
    .insert({ catch_id: catchId, user_id: userId, body })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const deleteComment = async (commentId: string): Promise<void> => {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);

  if (error) {
    throw new Error(error.message);
  }
};

export const getComments = async (
  catchId: string,
  cursor?: string,
): Promise<CommentRow[]> => {
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

  return data ?? [];
};

export const getCommentListItems = async (
  catchId: string,
  cursor?: string,
): Promise<CommentListItem[]> => {
  const comments = await getComments(catchId, cursor);
  const profiles = await getProfilesByIds(comments.map((item) => item.user_id));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return comments.map((item) => ({
    ...item,
    profiles: profileMap.has(item.user_id)
      ? {
          username: profileMap.get(item.user_id)?.username ?? 'Bilinmeyen kullanıcı',
          avatar_url: profileMap.get(item.user_id)?.avatar_url ?? null,
        }
      : null,
  }));
};

export const reportCatch = async (catchId: string, reason: string): Promise<void> => {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('reports').insert({
    reporter_id: userId,
    catch_id: catchId,
    reason,
  });

  if (error) {
    throw new Error(error.message);
  }
};
