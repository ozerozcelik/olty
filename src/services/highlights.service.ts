import { supabase } from '@/lib/supabase';
import type { HighlightItem } from '@/types/app.types';

const MAX_HIGHLIGHTS = 9;

const getCurrentUserId = async (): Promise<string> => {
  const sessionResponse = await supabase.auth.getSession();
  const userId = sessionResponse.data.session?.user.id;

  if (!userId) {
    throw new Error('Oturum bulunamadı.');
  }

  return userId;
};

const getSpeciesNameMap = async (speciesIds: number[]): Promise<Map<number, string>> => {
  if (!speciesIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('fish_species')
    .select('id, name_tr')
    .in('id', speciesIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((item) => [item.id, item.name_tr]));
};

export const getHighlights = async (userId: string): Promise<HighlightItem[]> => {
  const { data: highlights, error } = await supabase
    .from('catch_highlights')
    .select('*')
    .eq('user_id', userId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  if (!highlights?.length) {
    return [];
  }

  const catchIds = highlights.map((item) => item.catch_id);
  const { data: catches, error: catchesError } = await supabase
    .from('catches')
    .select('id, photo_url, species_id, species_custom, length_cm, created_at')
    .in('id', catchIds);

  if (catchesError) {
    throw new Error(catchesError.message);
  }

  const speciesMap = await getSpeciesNameMap(
    Array.from(
      new Set((catches ?? []).map((item) => item.species_id).filter((item): item is number => item !== null)),
    ),
  );
  const catchMap = new Map((catches ?? []).map((item) => [item.id, item]));

  return highlights.reduce<HighlightItem[]>((items, item) => {
    const catchItem = catchMap.get(item.catch_id);

    if (!catchItem) {
      return items;
    }

    items.push({
      ...item,
      photo_url: catchItem.photo_url,
      species_name:
        catchItem.species_id !== null
          ? speciesMap.get(catchItem.species_id) ?? catchItem.species_custom ?? 'Tür belirtilmedi'
          : catchItem.species_custom ?? 'Tür belirtilmedi',
      length_cm: catchItem.length_cm,
      created_at: catchItem.created_at,
    });

    return items;
  }, []);
};

export const getAvailableHighlightCatches = async (): Promise<HighlightItem[]> => {
  const userId = await getCurrentUserId();
  const [highlights, catchesResponse] = await Promise.all([
    getHighlights(userId),
    supabase
      .from('catches')
      .select('id, photo_url, species_id, species_custom, length_cm, created_at')
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false }),
  ]);

  if (catchesResponse.error) {
    throw new Error(catchesResponse.error.message);
  }

  const highlightedIds = new Set(highlights.map((item) => item.catch_id));
  const catches = catchesResponse.data ?? [];
  const speciesMap = await getSpeciesNameMap(
    Array.from(
      new Set(catches.map((item) => item.species_id).filter((item): item is number => item !== null)),
    ),
  );

  return catches.reduce<HighlightItem[]>((items, item, index) => {
    if (highlightedIds.has(item.id)) {
      return items;
    }

    items.push({
      id: item.id,
      user_id: userId,
      catch_id: item.id,
      display_order: index,
      created_at: item.created_at,
      photo_url: item.photo_url,
      species_name:
        item.species_id !== null
          ? speciesMap.get(item.species_id) ?? item.species_custom ?? 'Tür belirtilmedi'
          : item.species_custom ?? 'Tür belirtilmedi',
      length_cm: item.length_cm,
    });

    return items;
  }, []);
};

export const addHighlight = async (catchId: string): Promise<void> => {
  const userId = await getCurrentUserId();
  const highlights = await getHighlights(userId);

  if (highlights.length >= MAX_HIGHLIGHTS) {
    throw new Error('En fazla 9 av öne çıkarılabilir.');
  }

  const { data: catchRow, error: catchError } = await supabase
    .from('catches')
    .select('id, user_id, is_public')
    .eq('id', catchId)
    .single();

  if (catchError) {
    throw new Error(catchError.message);
  }

  if (catchRow.user_id !== userId) {
    throw new Error('Yalnızca kendi avlarını öne çıkarabilirsin.');
  }

  if (!catchRow.is_public) {
    throw new Error('Sadece herkese açık avlar öne çıkarılabilir.');
  }

  const { error } = await supabase.from('catch_highlights').insert({
    user_id: userId,
    catch_id: catchId,
    display_order:
      highlights.length ? Math.max(...highlights.map((item) => item.display_order)) + 1 : 0,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const removeHighlight = async (catchId: string): Promise<void> => {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('catch_highlights')
    .delete()
    .eq('user_id', userId)
    .eq('catch_id', catchId);

  if (error) {
    throw new Error(error.message);
  }

  const remainingHighlights = await getHighlights(userId);
  await reorderHighlights(remainingHighlights.map((item) => item.catch_id));
};

export const reorderHighlights = async (orderedCatchIds: string[]): Promise<void> => {
  const userId = await getCurrentUserId();

  await Promise.all(
    orderedCatchIds.map(async (catchId, index) => {
      const { error } = await supabase
        .from('catch_highlights')
        .update({ display_order: index })
        .eq('user_id', userId)
        .eq('catch_id', catchId);

      if (error) {
        throw new Error(error.message);
      }
    }),
  );
};
