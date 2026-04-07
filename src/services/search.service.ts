import { supabase } from '@/lib/supabase';
import { enrichFeedCatches } from '@/services/catches.service';
import type { CatchFeedItem, CatchPublicRow, ProfileRow } from '@/types/app.types';
import { getHashtagSearchQuery, getHashtagSearchTerm } from '@/utils/hashtags';

const escapeLike = (value: string): string => {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
};

export const searchUsers = async (query: string): Promise<ProfileRow[]> => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const safeQuery = escapeLike(normalizedQuery);
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`)
    .order('follower_count', { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};

export const searchCatches = async (query: string): Promise<CatchFeedItem[]> => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const hashtagSearchTerm = getHashtagSearchTerm(normalizedQuery);
  const safeQuery = escapeLike(normalizedQuery);
  const speciesResponse = await supabase
    .from('fish_species')
    .select('id')
    .ilike('name_tr', `%${safeQuery}%`)
    .limit(20);

  if (speciesResponse.error) {
    throw new Error(speciesResponse.error.message);
  }

  const speciesIds = (speciesResponse.data ?? []).map((item) => item.id);
  const commentCatchIdsResponse = hashtagSearchTerm
    ? await supabase
        .from('comments')
        .select('catch_id')
        .ilike('body', `%${escapeLike(getHashtagSearchQuery(hashtagSearchTerm))}%`)
        .limit(50)
    : { data: [] as { catch_id: string }[], error: null };

  if (commentCatchIdsResponse.error) {
    throw new Error(commentCatchIdsResponse.error.message);
  }

  const commentCatchIds = Array.from(
    new Set((commentCatchIdsResponse.data ?? []).map((item) => item.catch_id)),
  );

  const [textResponse, speciesCatchResponse, commentCatchResponse] = await Promise.all([
    supabase
      .from('catches_public')
      .select('*')
      .or(`species_custom.ilike.%${safeQuery}%,location_name.ilike.%${safeQuery}%,notes.ilike.%${safeQuery}%`)
      .order('created_at', { ascending: false })
      .limit(20),
    speciesIds.length
      ? supabase
          .from('catches_public')
          .select('*')
          .in('species_id', speciesIds)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as CatchPublicRow[], error: null }),
    commentCatchIds.length
      ? supabase
          .from('catches_public')
          .select('*')
          .in('id', commentCatchIds)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as CatchPublicRow[], error: null }),
  ]);

  if (textResponse.error) {
    throw new Error(textResponse.error.message);
  }

  if (speciesCatchResponse.error) {
    throw new Error(speciesCatchResponse.error.message);
  }

  if (commentCatchResponse.error) {
    throw new Error(commentCatchResponse.error.message);
  }

  const uniqueRows = new Map<string, CatchPublicRow>();

  for (const row of [
    ...(textResponse.data ?? []),
    ...(speciesCatchResponse.data ?? []),
    ...(commentCatchResponse.data ?? []),
  ]) {
    uniqueRows.set(row.id, row);
  }

  return enrichFeedCatches(
    [...uniqueRows.values()]
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, 20),
  );
};
