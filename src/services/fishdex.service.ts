import { supabase } from '@/lib/supabase';
import type {
  FishSpeciesOption,
  FishSpeciesRow,
  FishdexCategoryProgress,
  FishdexOverview,
  FishdexSpeciesDetail,
  FishdexSpeciesProgress,
} from '@/types/app.types';
import { getFishCategoryLabel, getFishdexNextMilestone } from '@/utils/fishdex';

interface FishdexCatchRow {
  species_id: number | null;
  length_cm: number | null;
  created_at: string;
  photo_url: string | null;
}

const sortSpecies = (items: FishSpeciesRow[]): FishSpeciesRow[] =>
  [...items].sort((left, right) => left.name_tr.localeCompare(right.name_tr, 'tr'));

const buildSpeciesProgress = (
  species: FishSpeciesRow[],
  catches: FishdexCatchRow[],
): FishdexSpeciesProgress[] => {
  const catchMap = new Map<number, FishdexCatchRow[]>();

  for (const item of catches) {
    if (item.species_id === null) {
      continue;
    }

    const list = catchMap.get(item.species_id) ?? [];
    list.push(item);
    catchMap.set(item.species_id, list);
  }

  return species
    .map((item) => {
      const speciesCatches = catchMap.get(item.id) ?? [];
      const sortedCatches = [...speciesCatches].sort(
        (left, right) =>
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
      );
      const biggestLengthCm = speciesCatches.reduce<number | null>(
        (current, catchItem) =>
          catchItem.length_cm === null
            ? current
            : current === null
              ? catchItem.length_cm
              : Math.max(current, catchItem.length_cm),
        null,
      );

      return {
        species: item,
        discovered: speciesCatches.length > 0,
        catchCount: speciesCatches.length,
        firstCaughtAt: sortedCatches[0]?.created_at ?? null,
        biggestLengthCm,
        latestPhotoUrl: [...speciesCatches]
          .reverse()
          .find((catchItem) => Boolean(catchItem.photo_url))
          ?.photo_url ?? null,
      };
    })
    .sort((left, right) => {
      if (left.discovered !== right.discovered) {
        return left.discovered ? -1 : 1;
      }

      return left.species.name_tr.localeCompare(right.species.name_tr, 'tr');
    });
};

const buildCategoryProgress = (species: FishdexSpeciesProgress[]): FishdexCategoryProgress[] => {
  const categoryMap = new Map<string, FishdexCategoryProgress>();

  for (const item of species) {
    const category = item.species.category ?? 'diger';
    const current = categoryMap.get(category) ?? {
      category,
      label: getFishCategoryLabel(item.species.category),
      discovered: 0,
      total: 0,
    };

    current.total += 1;

    if (item.discovered) {
      current.discovered += 1;
    }

    categoryMap.set(category, current);
  }

  return [...categoryMap.values()].sort((left, right) =>
    left.label.localeCompare(right.label, 'tr'),
  );
};

export const getActiveFishSpecies = async (): Promise<FishSpeciesRow[]> => {
  const { data, error } = await supabase
    .from('fish_species')
    .select('*')
    .eq('is_active', true);

  if (error) {
    throw new Error(error.message);
  }

  return sortSpecies(data ?? []);
};

export const getFishSpeciesOptions = async (): Promise<FishSpeciesOption[]> => {
  const species = await getActiveFishSpecies();

  return species.map((item) => ({
    id: item.id,
    name: item.name_tr,
    category: item.category,
  }));
};

export const getFishdexOverview = async (userId: string): Promise<FishdexOverview> => {
  const [species, catchesResponse] = await Promise.all([
    getActiveFishSpecies(),
    supabase
      .from('catches')
      .select('species_id, length_cm, created_at, photo_url')
      .eq('user_id', userId)
      .not('species_id', 'is', null),
  ]);

  if (catchesResponse.error) {
    throw new Error(catchesResponse.error.message);
  }

  const speciesProgress = buildSpeciesProgress(species, catchesResponse.data ?? []);
  const discoveredSpecies = speciesProgress.filter((item) => item.discovered).length;
  const totalSpecies = speciesProgress.length;
  const completionPercent = totalSpecies
    ? Math.round((discoveredSpecies / totalSpecies) * 100)
    : 0;
  const { nextMilestone, remainingToNextMilestone } = getFishdexNextMilestone(
    discoveredSpecies,
    totalSpecies,
  );

  return {
    userId,
    totalSpecies,
    discoveredSpecies,
    completionPercent,
    nextMilestone,
    remainingToNextMilestone,
    categoryProgress: buildCategoryProgress(speciesProgress),
    species: speciesProgress,
  };
};

export const getFishdexSpeciesDetail = async (
  userId: string,
  speciesId: number,
): Promise<FishdexSpeciesDetail> => {
  const [speciesResponse, catchesResponse] = await Promise.all([
    supabase.from('fish_species').select('*').eq('id', speciesId).single(),
    supabase
      .from('catches')
      .select('species_id, length_cm, created_at, photo_url')
      .eq('user_id', userId)
      .eq('species_id', speciesId)
      .order('created_at', { ascending: true }),
  ]);

  if (speciesResponse.error) {
    throw new Error(speciesResponse.error.message);
  }

  if (catchesResponse.error) {
    throw new Error(catchesResponse.error.message);
  }

  const progress = buildSpeciesProgress([speciesResponse.data], catchesResponse.data ?? [])[0];

  return {
    userId,
    species: progress.species,
    discovered: progress.discovered,
    catchCount: progress.catchCount,
    firstCaughtAt: progress.firstCaughtAt,
    biggestLengthCm: progress.biggestLengthCm,
    latestPhotoUrl: progress.latestPhotoUrl,
  };
};
