import 'react-native-url-polyfill/auto';

import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { hasRequiredPublicEnv, publicEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';

const fallbackSupabaseUrl = 'https://invalid.supabase.co';
const fallbackSupabaseAnonKey = 'invalid-anon-key';
const supabaseUrl = hasRequiredPublicEnv ? publicEnv.supabaseUrl : fallbackSupabaseUrl;
const supabaseAnonKey = hasRequiredPublicEnv
  ? publicEnv.supabaseAnonKey
  : fallbackSupabaseAnonKey;
const isExpoGoIos =
  Constants.executionEnvironment === 'storeClient' && Platform.OS === 'ios';
const authStorageKey = 'fishgram.auth.token';
const secureStoreOptions = {
  keychainService: authStorageKey,
};

const secureSessionStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }

    return SecureStore.getItemAsync(key, secureStoreOptions);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value, secureStoreOptions);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }

    await SecureStore.deleteItemAsync(key, secureStoreOptions);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: !isExpoGoIos,
    persistSession: !isExpoGoIos,
    detectSessionInUrl: false,
    storage: isExpoGoIos ? undefined : secureSessionStorage,
    storageKey: authStorageKey,
  },
});
