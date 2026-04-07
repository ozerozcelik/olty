import { supabase } from '@/lib/supabase';
import { uploadPostImageAsset } from '@/services/storage.service';
import type {
  CommentProfilePreview,
  PostCardItem,
  PostComment,
  PostDetail,
  PostInsert,
  PostRow,
  PostType,
  PostUpdate,
} from '@/types/app.types';

const PAGE_SIZE = 12;

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

const getProfilesByIds = async (
  userIds: string[],
): Promise<Map<string, { id: string; username: string; avatar_url: string | null; level: number }>> => {
  if (!userIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, level')
    .in('id', userIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((item) => [item.id, item]));
};

export const getPosts = async (
  type?: PostType,
  cursor?: string,
): Promise<PostCardItem[]> => {
  let query = supabase
    .from('posts')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (type) {
    query = query.eq('type', type);
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];

  if (!rows.length) {
    return [];
  }

  const currentUserId = await getCurrentUserIdOrNull();
  const userIds = Array.from(new Set(rows.map((item) => item.user_id)));
  const profileMap = await getProfilesByIds(userIds);
  const likedPostIds = currentUserId
    ? await (async () => {
      const { data: likes, error: likesError } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', rows.map((item) => item.id));

      if (likesError) {
        throw new Error(likesError.message);
      }

      return new Set((likes ?? []).map((item) => item.post_id));
    })()
    : new Set<string>();

  return rows.map((item) => ({
    ...item,
    profiles: profileMap.get(item.user_id) ?? null,
    is_liked: likedPostIds.has(item.id),
  }));
};

export const getPostsByUser = async (
  userId: string,
  cursor?: string,
): Promise<PostCardItem[]> => {
  let query = supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];

  if (!rows.length) {
    return [];
  }

  const currentUserId = await getCurrentUserIdOrNull();
  const profileMap = await getProfilesByIds([userId]);
  const likedPostIds = currentUserId
    ? await (async () => {
      const { data: likes, error: likesError } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', rows.map((item) => item.id));

      if (likesError) {
        throw new Error(likesError.message);
      }

      return new Set((likes ?? []).map((item) => item.post_id));
    })()
    : new Set<string>();

  return rows.map((item) => ({
    ...item,
    profiles: profileMap.get(item.user_id) ?? null,
    is_liked: likedPostIds.has(item.id),
  }));
};

export const getPostById = async (id: string): Promise<PostDetail> => {
  const currentUserId = await getCurrentUserIdOrNull();
  const { data, error } = await supabase.from('posts').select('*').eq('id', id).single();

  if (error) {
    throw new Error(error.message);
  }

  const [{ data: profile, error: profileError }, { data: like, error: likeError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, avatar_url, level')
      .eq('id', data.user_id)
      .maybeSingle(),
    currentUserId
      ? supabase
        .from('post_likes')
        .select('post_id')
        .eq('post_id', id)
        .eq('user_id', currentUserId)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (likeError) {
    throw new Error(likeError.message);
  }

  return {
    ...data,
    profiles: profile ?? null,
    is_liked: Boolean(like),
  };
};

export const createPost = async (data: PostInsert): Promise<PostRow> => {
  const userId = await getCurrentUserId();
  const payload: PostInsert = {
    ...data,
    user_id: userId,
  };

  const { data: row, error } = await supabase
    .from('posts')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return row;
};

export const updatePost = async (
  id: string,
  data: PostUpdate,
): Promise<PostRow> => {
  const { data: row, error } = await supabase
    .from('posts')
    .update(data)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return row;
};

export const deletePost = async (id: string): Promise<void> => {
  const { error } = await supabase.from('posts').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};

export const likePost = async (id: string): Promise<void> => {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('post_likes').insert({
    post_id: id,
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const unlikePost = async (id: string): Promise<void> => {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
};

const getCommentProfilesByIds = async (userIds: string[]): Promise<Map<string, CommentProfilePreview>> => {
  if (!userIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((item) => [
      item.id,
      {
        username: item.username,
        avatar_url: item.avatar_url,
      },
    ]),
  );
};

export const getPostComments = async (
  postId: string,
  cursor?: string,
): Promise<PostComment[]> => {
  let query = supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const profileMap = await getCommentProfilesByIds(
    Array.from(new Set(rows.map((item) => item.user_id))),
  );

  return rows.map((item) => ({
    ...item,
    profiles: profileMap.get(item.user_id) ?? null,
  }));
};

export const addPostComment = async (
  postId: string,
  body: string,
): Promise<PostComment> => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      user_id: userId,
      body,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const profileMap = await getCommentProfilesByIds([userId]);

  return {
    ...data,
    profiles: profileMap.get(userId) ?? null,
  };
};

export const uploadPostImage = async (uri: string, userId: string): Promise<string> => {
  return uploadPostImageAsset(uri, userId);
};
