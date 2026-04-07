import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import NetInfo from '@react-native-community/netinfo';

export interface CatchDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'pending' | 'syncing' | 'failed' | 'synced';
  syncError?: string;
  retryCount: number;
  userId: string;
  // Form data
  photoUri?: string;
  speciesId: number | null;
  speciesCustom?: string;
  lengthCm?: string;
  weightG?: string;
  locationName?: string;
  isCatchRelease: boolean;
  fishingMethod?: string;
  baitName?: string;
  notes?: string;
  isPublic: boolean;
  latitude: number | null;
  longitude: number | null;
  showExactLocation: boolean;
  showMeasurementsPublic: boolean;
  showLocationPublic: boolean;
  showMethodPublic: boolean;
  showNotesPublic: boolean;
  showConditionsPublic: boolean;
  capturedAt?: string;
  // Weather conditions snapshot
  airTempC?: number | null;
  pressureHpa?: number | null;
  humidityPct?: number | null;
  weatherCode?: number | null;
  weatherLabel?: string;
  windSpeedKmh?: number | null;
  windDirectionDeg?: number | null;
  windDirectionLabel?: string;
  uvIndex?: number | null;
  waveHeightM?: number | null;
  waveDirectionDeg?: number | null;
  seaTempC?: number | null;
  seaDepthM?: number | null;
  seaDepthSource?: string;
  seaDepthIsApproximate?: boolean;
  moonPhaseLabel?: string;
  moonPhaseEmoji?: string;
  fishingScore?: number | null;
  fishingScoreLabel?: string;
}

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
}

interface DraftState {
  drafts: CatchDraft[];
  sync: SyncState;
  // Draft management
  addDraft: (draft: Omit<CatchDraft, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'retryCount'>) => string;
  updateDraft: (id: string, updates: Partial<CatchDraft>) => void;
  removeDraft: (id: string) => void;
  getDraft: (id: string) => CatchDraft | undefined;
  getPendingDrafts: () => CatchDraft[];
  // Sync management
  setOnlineStatus: (isOnline: boolean) => void;
  markSyncing: (id: string) => void;
  markSynced: (id: string) => void;
  markFailed: (id: string, error: string) => void;
  setSyncing: (isSyncing: boolean) => void;
  updateLastSync: () => void;
}

const generateDraftId = (): string => {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: [],
      sync: {
        isOnline: true,
        isSyncing: false,
        lastSyncAt: null,
        pendingCount: 0,
      },

      addDraft: (draftData) => {
        const id = generateDraftId();
        const now = new Date().toISOString();
        const draft: CatchDraft = {
          ...draftData,
          id,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
          retryCount: 0,
        };

        set((state) => ({
          drafts: [...state.drafts, draft],
          sync: {
            ...state.sync,
            pendingCount: state.sync.pendingCount + 1,
          },
        }));

        return id;
      },

      updateDraft: (id, updates) => {
        set((state) => ({
          drafts: state.drafts.map((draft) =>
            draft.id === id
              ? { ...draft, ...updates, updatedAt: new Date().toISOString() }
              : draft
          ),
        }));
      },

      removeDraft: (id) => {
        const draft = get().drafts.find((d) => d.id === id);
        const wasPending = draft?.syncStatus === 'pending' || draft?.syncStatus === 'failed';

        set((state) => ({
          drafts: state.drafts.filter((d) => d.id !== id),
          sync: {
            ...state.sync,
            pendingCount: wasPending
              ? Math.max(0, state.sync.pendingCount - 1)
              : state.sync.pendingCount,
          },
        }));
      },

      getDraft: (id) => {
        return get().drafts.find((d) => d.id === id);
      },

      getPendingDrafts: () => {
        return get().drafts.filter(
          (d) => d.syncStatus === 'pending' || d.syncStatus === 'failed'
        );
      },

      setOnlineStatus: (isOnline) => {
        set((state) => ({
          sync: { ...state.sync, isOnline },
        }));
      },

      markSyncing: (id) => {
        set((state) => ({
          drafts: state.drafts.map((draft) =>
            draft.id === id ? { ...draft, syncStatus: 'syncing' as const } : draft
          ),
        }));
      },

      markSynced: (id) => {
        set((state) => ({
          drafts: state.drafts.map((draft) =>
            draft.id === id ? { ...draft, syncStatus: 'synced' as const } : draft
          ),
          sync: {
            ...state.sync,
            pendingCount: Math.max(0, state.sync.pendingCount - 1),
          },
        }));
      },

      markFailed: (id, error) => {
        set((state) => ({
          drafts: state.drafts.map((draft) =>
            draft.id === id
              ? {
                  ...draft,
                  syncStatus: 'failed' as const,
                  syncError: error,
                  retryCount: draft.retryCount + 1,
                }
              : draft
          ),
        }));
      },

      setSyncing: (isSyncing) => {
        set((state) => ({
          sync: { ...state.sync, isSyncing },
        }));
      },

      updateLastSync: () => {
        set((state) => ({
          sync: { ...state.sync, lastSyncAt: new Date().toISOString() },
        }));
      },
    }),
    {
      name: 'olty-drafts',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        drafts: state.drafts,
        sync: {
          lastSyncAt: state.sync.lastSyncAt,
          pendingCount: state.drafts.filter(
            (d) => d.syncStatus === 'pending' || d.syncStatus === 'failed'
          ).length,
        },
      }),
    }
  )
);

// Network status listener - initialize on app start
export const initNetworkListener = (): (() => void) => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    useDraftStore.getState().setOnlineStatus(state.isConnected ?? true);
  });

  // Check initial status
  NetInfo.fetch().then((state) => {
    useDraftStore.getState().setOnlineStatus(state.isConnected ?? true);
  });

  return unsubscribe;
};
