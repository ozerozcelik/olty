import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';

import { track } from '@/lib/analytics';
import { captureError } from '@/lib/sentry';
import { supabase } from '@/lib/supabase';
import type {
  ConsentMeta,
  ConsentValues,
  FishingType,
  ProfileInsert,
  ProfileRow,
} from '@/types/app.types';

interface SignInResult {
  user: {
    id: string;
    email?: string;
  } | null;
}

interface SignUpOptions {
  marketingConsent?: boolean;
  consentMeta?: ConsentMeta;
}

export interface SignUpResult {
  profile: ProfileRow | null;
  session: Session | null;
  requiresEmailConfirmation: boolean;
}

const AUTH_TIMEOUT_MS = 5000;

const DEFAULT_CONSENT_META: ConsentMeta = {
  ip: '0.0.0.0',
  userAgent: `expo-${Platform.OS}`,
};

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

const PROFILE_TIMEOUT_MESSAGE = 'profile timeout';

interface SignupMetadata {
  username?: unknown;
  city?: unknown;
  fishingTypes?: unknown;
  marketingConsent?: unknown;
  kvkkConsent?: unknown;
}

const getSignupMetadata = (user: User): SignupMetadata => {
  return (user.user_metadata ?? {}) as SignupMetadata;
};

const getFishingTypes = (value: unknown): FishingType[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is FishingType => typeof item === 'string');
};

const createProfileForUser = async (
  userId: string,
  username: string,
  city: string | null,
  fishingTypes: FishingType[],
  marketingConsent: boolean,
  kvkkConsent: boolean,
): Promise<ProfileRow> => {
  const profilePayload: ProfileInsert = {
    id: userId,
    username,
    city,
    fishing_type: fishingTypes,
    kvkk_consent: kvkkConsent,
    marketing_consent: marketingConsent,
  };

  const { data: profile, error: profileError } = await withTimeout(
    supabase
      .from('profiles')
      .insert(profilePayload)
      .select('*')
      .single(),
    PROFILE_TIMEOUT_MESSAGE,
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  await saveConsents(
    userId,
    { kvkk: kvkkConsent, marketing: marketingConsent },
    DEFAULT_CONSENT_META,
  );

  return profile;
};

export const ensureProfileForSession = async (session: Session): Promise<ProfileRow | null> => {
  const userId = session.user.id;
  const { data: existingProfile, error: existingProfileError } = await withTimeout(
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    PROFILE_TIMEOUT_MESSAGE,
  );

  if (existingProfileError) {
    throw new Error(existingProfileError.message);
  }

  if (existingProfile) {
    return existingProfile;
  }

  const metadata = getSignupMetadata(session.user);
  const username =
    typeof metadata.username === 'string' ? metadata.username.trim().toLowerCase() : '';

  if (!username) {
    return null;
  }

  const city = typeof metadata.city === 'string' ? metadata.city : null;
  const fishingTypes = getFishingTypes(metadata.fishingTypes);
  const marketingConsent = Boolean(metadata.marketingConsent);
  const kvkkConsent = metadata.kvkkConsent !== false;

  return createProfileForUser(
    userId,
    username,
    city,
    fishingTypes,
    marketingConsent,
    kvkkConsent,
  );
};

export const saveConsents = async (
  userId: string,
  consents: ConsentValues,
  meta: ConsentMeta,
): Promise<void> => {
  const records = [
    {
      user_id: userId,
      consent_type: 'kvkk',
      granted: consents.kvkk,
      ip_address: meta.ip,
      user_agent: meta.userAgent,
    },
    {
      user_id: userId,
      consent_type: 'marketing',
      granted: consents.marketing,
      ip_address: meta.ip,
      user_agent: meta.userAgent,
    },
    {
      user_id: userId,
      consent_type: 'location',
      granted: false,
      ip_address: meta.ip,
      user_agent: meta.userAgent,
    },
  ];

  const { error } = await supabase.from('user_consents').insert(records);

  if (error) {
    throw new Error(error.message);
  }
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  username: string,
  city: string,
  fishingTypes: FishingType[],
  options?: SignUpOptions,
): Promise<SignUpResult> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          city,
          fishingTypes,
          marketingConsent: options?.marketingConsent ?? false,
          kvkkConsent: true,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    const userId = data.user?.id;

    if (!userId) {
      throw new Error('Kullanıcı oluşturulamadı.');
    }

    if (!data.session) {
      return {
        profile: null,
        session: null,
        requiresEmailConfirmation: true,
      };
    }

    const profile = await createProfileForUser(
      userId,
      username,
      city,
      fishingTypes,
      options?.marketingConsent ?? false,
      true,
    );

    track('register_completed', { fishing_type_count: fishingTypes.length });

    return {
      profile,
      session: data.session ?? null,
      requiresEmailConfirmation: false,
    };
  } catch (error: unknown) {
    captureError(error, { service: 'signUpWithEmail' });
    throw error;
  }
};

export const checkUsernameAvailability = async (
  username: string,
): Promise<boolean> => {
  const normalizedUsername = username.trim();

  if (!normalizedUsername) {
    return false;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', normalizedUsername)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return !data;
};

export const signInWithEmail = async (
  email: string,
  password: string,
): Promise<SignInResult> => {
  const { data, error } = await withTimeout(
    supabase.auth.signInWithPassword({
      email,
      password,
    }),
    'auth timeout'
  );

  if (error) {
    throw new Error(error.message);
  }

  return {
    user: data.user
      ? {
          id: data.user.id,
          email: data.user.email,
        }
      : null,
  };
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
};

export const updatePassword = async (password: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw new Error(error.message);
  }
};

export const requestAccountDeletion = async (userId: string): Promise<void> => {
  const { error } = await supabase.from('deletion_requests').insert({ user_id: userId });

  if (error) {
    throw new Error(error.message);
  }
};
