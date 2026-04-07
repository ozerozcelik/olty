import { supabase } from '@/lib/supabase';
import { checkBadges } from '@/services/gamification.service';
import { uploadGearPhoto as uploadGearPhotoToStorage } from '@/services/storage.service';
import type {
  GearCategoryItem,
  GearCategoryRow,
  GearItemDetail,
  GearItemInsert,
  GearItemRow,
} from '@/types/app.types';

const getGearCategories = async (): Promise<GearCategoryRow[]> => {
  const { data, error } = await supabase
    .from('gear_categories')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};

export const getGearItems = async (userId: string): Promise<GearCategoryItem[]> => {
  if (!userId) {
    return [];
  }

  const [{ data: items, error: itemsError }, categories] = await Promise.all([
    supabase
      .from('gear_items')
      .select('*')
      .eq('user_id', userId)
      .order('is_favorite', { ascending: false })
      .order('created_at', { ascending: false }),
    getGearCategories(),
  ]);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const itemGroups = new Map<string, GearItemRow[]>();

  for (const item of items ?? []) {
    const list = itemGroups.get(item.category_slug) ?? [];
    list.push(item);
    itemGroups.set(item.category_slug, list);
  }

  return categories.map((category) => ({
    ...category,
    items: itemGroups.get(category.slug) ?? [],
  }));
};

export const getGearItemById = async (id: string): Promise<GearItemDetail> => {
  const { data: item, error } = await supabase
    .from('gear_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { data: category, error: categoryError } = await supabase
    .from('gear_categories')
    .select('*')
    .eq('slug', item.category_slug)
    .maybeSingle();

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  return {
    ...item,
    categoryMeta: category,
  };
};

export const createGearItem = async (data: GearItemInsert): Promise<GearItemRow> => {
  const { data: row, error } = await supabase
    .from('gear_items')
    .insert(data)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  try {
    await checkBadges(row.user_id, 'gear_update');
  } catch (badgeError) {
    console.error('checkBadges failed after gear insert:', badgeError);
  }

  return row;
};

export const updateGearItem = async (
  id: string,
  data: Partial<GearItemInsert>,
): Promise<GearItemRow> => {
  const { data: row, error } = await supabase
    .from('gear_items')
    .update(data)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  try {
    await checkBadges(row.user_id, 'gear_update');
  } catch (badgeError) {
    console.error('checkBadges failed after gear update:', badgeError);
  }

  return row;
};

export const deleteGearItem = async (id: string): Promise<void> => {
  const { error } = await supabase.from('gear_items').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
};

export const uploadGearPhoto = async (uri: string, userId: string): Promise<string> => {
  return uploadGearPhotoToStorage(uri, userId);
};

export const toggleFavorite = async (
  id: string,
  isFavorite: boolean,
): Promise<GearItemRow> => {
  const { data, error } = await supabase
    .from('gear_items')
    .update({ is_favorite: isFavorite })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
