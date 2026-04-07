import { createCatch } from '@/services/catches.service';
import { moderateImage } from '@/services/moderation.service';
import { uploadCatchPhoto } from '@/services/storage.service';
import { useDraftStore, type CatchDraft } from '@/stores/useDraftStore';
import type { CatchInsert } from '@/types/app.types';

const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL_MS = 30000; // 30 seconds

let syncIntervalId: ReturnType<typeof setInterval> | null = null;

export const parseCatchNumber = (value: string | undefined): number | null => {
  if (!value || value.trim() === '') {
    return null;
  }

  const parsed = Number(value.replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
};

const draftToCatchInsert = (
  draft: CatchDraft,
  photoUrl: string | null
): CatchInsert => {
  return {
    user_id: draft.userId,
    photo_url: photoUrl,
    photo_blur_hash: null,
    species_id: draft.speciesId,
    species_custom: draft.speciesCustom ?? null,
    length_cm: parseCatchNumber(draft.lengthCm),
    weight_g: parseCatchNumber(draft.weightG),
    location:
      draft.longitude !== null && draft.latitude !== null
        ? `POINT(${draft.longitude} ${draft.latitude})`
        : null,
    location_name: draft.locationName ?? null,
    is_catch_release: draft.isCatchRelease,
    fishing_type: draft.fishingMethod ?? null,
    bait_name: draft.baitName ?? null,
    notes: draft.notes ?? null,
    is_public: draft.isPublic,
    show_exact_location: draft.showExactLocation,
    show_measurements_public: draft.showMeasurementsPublic,
    show_location_public: draft.showLocationPublic,
    show_method_public: draft.showMethodPublic,
    show_notes_public: draft.showNotesPublic,
    show_conditions_public: draft.showConditionsPublic,
    captured_at: draft.capturedAt ?? new Date().toISOString(),
    air_temp_c: draft.airTempC ?? null,
    pressure_hpa: draft.pressureHpa ?? null,
    humidity_pct: draft.humidityPct ?? null,
    weather_code: draft.weatherCode ?? null,
    weather_label: draft.weatherLabel ?? null,
    wind_speed_kmh: draft.windSpeedKmh ?? null,
    wind_direction_deg: draft.windDirectionDeg ?? null,
    wind_direction_label: draft.windDirectionLabel ?? null,
    uv_index: draft.uvIndex ?? null,
    wave_height_m: draft.waveHeightM ?? null,
    wave_direction_deg: draft.waveDirectionDeg ?? null,
    sea_temp_c: draft.seaTempC ?? null,
    sea_depth_m: draft.seaDepthM ?? null,
    sea_depth_source: draft.seaDepthSource ?? null,
    sea_depth_is_approximate: draft.seaDepthIsApproximate ?? false,
    moon_phase_label: draft.moonPhaseLabel ?? null,
    moon_phase_emoji: draft.moonPhaseEmoji ?? null,
    fishing_score: draft.fishingScore ?? null,
    fishing_score_label: draft.fishingScoreLabel ?? null,
  };
};

const syncSingleDraft = async (draft: CatchDraft): Promise<boolean> => {
  const store = useDraftStore.getState();

  // Skip if too many retries
  if (draft.retryCount >= MAX_RETRY_COUNT) {
    if (__DEV__) {
      console.log(`Draft ${draft.id} exceeded retry limit, skipping`);
    }
    return false;
  }

  store.markSyncing(draft.id);

  try {
    let photoUrl: string | null = null;

    // Upload photo if present
    if (draft.photoUri) {
      if (__DEV__) {
        console.log('Syncing draft photo:', draft.photoUri);
      }

      // Check moderation
      const moderationResult = await moderateImage(draft.photoUri);
      if (!moderationResult.safe) {
        store.markFailed(draft.id, 'Fotoğraf uygunsuz içerik barındırıyor');
        return false;
      }

      // Upload photo
      photoUrl = await uploadCatchPhoto(draft.photoUri, draft.userId);
    }

    // Create catch record
    const catchData = draftToCatchInsert(draft, photoUrl);
    await createCatch(catchData);

    // Mark as synced
    store.markSynced(draft.id);

    if (__DEV__) {
      console.log(`Draft ${draft.id} synced successfully`);
    }

    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    store.markFailed(draft.id, errorMessage);

    if (__DEV__) {
      console.error(`Draft ${draft.id} sync failed:`, error);
    }

    return false;
  }
};

export const syncAllPendingDrafts = async (): Promise<{
  synced: number;
  failed: number;
}> => {
  const store = useDraftStore.getState();

  // Check if online
  if (!store.sync.isOnline) {
    if (__DEV__) {
      console.log('Offline, skipping sync');
    }
    return { synced: 0, failed: 0 };
  }

  // Check if already syncing
  if (store.sync.isSyncing) {
    if (__DEV__) {
      console.log('Already syncing, skipping');
    }
    return { synced: 0, failed: 0 };
  }

  const pendingDrafts = store.getPendingDrafts();

  if (pendingDrafts.length === 0) {
    return { synced: 0, failed: 0 };
  }

  if (__DEV__) {
    console.log(`Starting sync for ${pendingDrafts.length} drafts`);
  }

  store.setSyncing(true);

  let synced = 0;
  let failed = 0;

  // Sync one at a time to avoid overwhelming the server
  for (const draft of pendingDrafts) {
    const success = await syncSingleDraft(draft);
    if (success) {
      synced++;
    } else {
      failed++;
    }
  }

  store.setSyncing(false);
  store.updateLastSync();

  if (__DEV__) {
    console.log(`Sync complete: ${synced} synced, ${failed} failed`);
  }

  return { synced, failed };
};

export const startAutoSync = (): void => {
  if (syncIntervalId) {
    return;
  }

  if (__DEV__) {
    console.log('Starting auto-sync');
  }

  // Initial sync
  syncAllPendingDrafts();

  // Periodic sync
  syncIntervalId = setInterval(() => {
    const store = useDraftStore.getState();
    if (store.sync.isOnline && store.sync.pendingCount > 0) {
      syncAllPendingDrafts();
    }
  }, SYNC_INTERVAL_MS);
};

export const stopAutoSync = (): void => {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;

    if (__DEV__) {
      console.log('Auto-sync stopped');
    }
  }
};

// Helper to check if we should save as draft (offline or user choice)
export const shouldSaveAsDraft = (): boolean => {
  const store = useDraftStore.getState();
  return !store.sync.isOnline;
};
