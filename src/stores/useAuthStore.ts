import { create } from 'zustand';

import type { Session } from '@supabase/supabase-js';

import { hasRequiredPublicEnv } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { resetAnalytics } from '@/lib/analytics';
import { ensureProfileForSession } from '@/services/auth.service';
import type { ProfileRow } from '@/types/app.types';

interface AuthState {
  session: Session | null;
  profile: ProfileRow | null;
  loading: boolean;
  profileReady: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: ProfileRow | null) => void;
  setLoading: (loading: boolean) => void;
  setProfileReady: (profileReady: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  loading: true,
  profileReady: false,
  setSession: (session: Session | null): void => set({ session }),
  setProfile: (profile: ProfileRow | null): void => set({ profile }),
  setLoading: (loading: boolean): void => set({ loading }),
  setProfileReady: (profileReady: boolean): void => set({ profileReady }),
}));

const AUTH_TIMEOUT_MS = 5000;

const withTimeout = async <T>(promise: PromiseLike<T>, message: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const loadProfile = async (session: Session): Promise<void> => {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle(),
      'profile timeout'
    );

    if (error) {
      useAuthStore.getState().setProfile(null);
      return;
    }

    if (!data) {
      const profile = await withTimeout(
        ensureProfileForSession(session),
        'profile creation timeout'
      );
      useAuthStore.getState().setProfile(profile);
      return;
    }

    useAuthStore.getState().setProfile(data);
  } finally {
    useAuthStore.getState().setProfileReady(true);
  }
};

const initializeAuthStore = async (): Promise<void> => {
  if (!hasRequiredPublicEnv) {
    useAuthStore.getState().setSession(null);
    useAuthStore.getState().setProfile(null);
    useAuthStore.getState().setProfileReady(true);
    useAuthStore.getState().setLoading(false);
    return;
  }

  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      'auth timeout'
    );

    if (error) {
      useAuthStore.getState().setSession(null);
      useAuthStore.getState().setProfile(null);
      useAuthStore.getState().setProfileReady(true);
      useAuthStore.getState().setLoading(false);
      return;
    }

    useAuthStore.getState().setSession(data.session);

    if (data.session?.user.id) {
      useAuthStore.getState().setProfileReady(false);
      await loadProfile(data.session);
    } else {
      useAuthStore.getState().setProfile(null);
      useAuthStore.getState().setProfileReady(true);
    }
  } catch {
    useAuthStore.getState().setSession(null);
    useAuthStore.getState().setProfile(null);
    useAuthStore.getState().setProfileReady(true);
  } finally {
    useAuthStore.getState().setLoading(false);
  }
};

void initializeAuthStore();

if (hasRequiredPublicEnv) {
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);

    if (session?.user.id) {
      useAuthStore.getState().setProfileReady(false);
      void loadProfile(session);
      return;
    }

    // Reset analytics on logout
    resetAnalytics();
    useAuthStore.getState().setProfile(null);
    useAuthStore.getState().setProfileReady(true);
  });
}
