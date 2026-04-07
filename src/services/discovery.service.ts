import { supabase } from '@/lib/supabase';

export interface TrendingSpecies {
  speciesId: number;
  speciesName: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface NearbyCatch {
  id: string;
  speciesName: string;
  locationName: string | null;
  distance: number;
  photoUrl: string | null;
  username: string;
}

export interface DailyStats {
  totalCatches: number;
  activeUsers: number;
  topLocation: string | null;
}

export const getTrendingSpecies = async (): Promise<TrendingSpecies[]> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    // Get today's catches with species
    const { data: todayData, error: todayError } = await supabase
      .from('catches')
      .select('species_id')
      .gte('created_at', todayIso)
      .not('species_id', 'is', null);

    if (todayError) {
      if (__DEV__) {
        console.error('Error fetching trending species:', todayError);
      }
      return [];
    }

    // Get species names
    const speciesIdsRaw = (todayData ?? []).map(r => r.species_id).filter((id): id is number => id !== null);
    const speciesIds = [...new Set(speciesIdsRaw)];
    
    if (speciesIds.length === 0) {
      return [];
    }

    const { data: speciesData } = await supabase
      .from('fish_species')
      .select('id, name_tr')
      .in('id', speciesIds);

    const speciesMap = new Map((speciesData ?? []).map(s => [s.id, s.name_tr]));

    // Count by species
    const speciesCounts = new Map<number, { name: string; count: number }>();
    for (const row of todayData ?? []) {
      const speciesId = row.species_id;
      if (speciesId) {
        const speciesName = speciesMap.get(speciesId) ?? 'Bilinmeyen';
        const existing = speciesCounts.get(speciesId);
        if (existing) {
          existing.count++;
        } else {
          speciesCounts.set(speciesId, { name: speciesName, count: 1 });
        }
      }
    }

    // Get yesterday's counts for trend comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = yesterday.toISOString();

    const { data: yesterdayData } = await supabase
      .from('catches')
      .select('species_id')
      .gte('created_at', yesterdayIso)
      .lt('created_at', todayIso)
      .not('species_id', 'is', null);

    const yesterdayCounts = new Map<number, number>();
    for (const row of yesterdayData ?? []) {
      if (row.species_id) {
        yesterdayCounts.set(row.species_id, (yesterdayCounts.get(row.species_id) ?? 0) + 1);
      }
    }

    // Build result with trend
    const result: TrendingSpecies[] = [];
    for (const [speciesId, data] of speciesCounts.entries()) {
      const yesterdayCount = yesterdayCounts.get(speciesId) ?? 0;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      
      if (data.count > yesterdayCount * 1.2) {
        trend = 'up';
      } else if (data.count < yesterdayCount * 0.8) {
        trend = 'down';
      }

      result.push({
        speciesId,
        speciesName: data.name,
        count: data.count,
        trend,
      });
    }

    // Sort by count descending
    return result.sort((a, b) => b.count - a.count);
  } catch (error) {
    if (__DEV__) {
      console.error('getTrendingSpecies error:', error);
    }
    return [];
  }
};

export const getNearbyCatches = async (
  _latitude: number,
  _longitude: number,
  _radiusKm: number = 50,
): Promise<NearbyCatch[]> => {
  // Without PostGIS RPC, just return recent public catches
  return getRecentPublicCatches();
};

const getRecentPublicCatches = async (): Promise<NearbyCatch[]> => {
  try {
    const { data, error } = await supabase
      .from('catches_public')
      .select('id, species_id, species_custom, location_name, photo_url, user_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      if (__DEV__) {
        console.error('Error fetching recent catches:', error);
      }
      return [];
    }

    // Get species names
    const speciesIdsRaw = (data ?? []).map(r => r.species_id).filter((id): id is number => id !== null);
    const speciesIds = [...new Set(speciesIdsRaw)];
    
    let speciesMap = new Map<number, string>();
    if (speciesIds.length > 0) {
      const { data: speciesData } = await supabase
        .from('fish_species')
        .select('id, name_tr')
        .in('id', speciesIds);
      
      speciesMap = new Map((speciesData ?? []).map(s => [s.id, s.name_tr]));
    }

    // Get usernames
    const userIds = [...new Set((data ?? []).map(r => r.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds);
    
    const usernameMap = new Map((profilesData ?? []).map(p => [p.id, p.username]));

    return (data ?? []).map((row) => ({
      id: row.id,
      speciesName: row.species_id ? (speciesMap.get(row.species_id) ?? 'Bilinmeyen') : (row.species_custom ?? 'Bilinmeyen'),
      locationName: row.location_name,
      distance: 0,
      photoUrl: row.photo_url,
      username: usernameMap.get(row.user_id) ?? 'anonim',
    }));
  } catch (error) {
    if (__DEV__) {
      console.error('getRecentPublicCatches error:', error);
    }
    return [];
  }
};

export const getDailyStats = async (): Promise<DailyStats> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    // Get today's catch count
    const { count: totalCatches, error: catchError } = await supabase
      .from('catches')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayIso);

    if (catchError) {
      if (__DEV__) {
        console.error('Error fetching daily stats:', catchError);
      }
    }

    // Get active users count
    const { data: usersData } = await supabase
      .from('catches')
      .select('user_id')
      .gte('created_at', todayIso);

    const uniqueUsers = new Set((usersData ?? []).map((r) => r.user_id));

    // Get top location
    const { data: locData } = await supabase
      .from('catches')
      .select('location_name')
      .gte('created_at', todayIso)
      .not('location_name', 'is', null)
      .limit(100);

    const locationCounts = new Map<string, number>();
    for (const row of locData ?? []) {
      if (row.location_name) {
        locationCounts.set(row.location_name, (locationCounts.get(row.location_name) ?? 0) + 1);
      }
    }

    let topLocation: string | null = null;
    let maxCount = 0;
    for (const [loc, count] of locationCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        topLocation = loc;
      }
    }

    return {
      totalCatches: totalCatches ?? 0,
      activeUsers: uniqueUsers.size,
      topLocation,
    };
  } catch (error) {
    if (__DEV__) {
      console.error('getDailyStats error:', error);
    }
    return {
      totalCatches: 0,
      activeUsers: 0,
      topLocation: null,
    };
  }
};
