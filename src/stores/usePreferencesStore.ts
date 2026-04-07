import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type WindSpeedUnit = 'kmh' | 'kt';

interface PreferencesState {
  windSpeedUnit: WindSpeedUnit;
  setWindSpeedUnit: (windSpeedUnit: WindSpeedUnit) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      windSpeedUnit: 'kmh',
      setWindSpeedUnit: (windSpeedUnit: WindSpeedUnit): void => {
        set({ windSpeedUnit });
      },
    }),
    {
      name: 'olty-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        windSpeedUnit: state.windSpeedUnit,
      }),
    },
  ),
);
