const clean = (value: string | undefined): string => value?.trim() ?? '';

const values = {
  supabaseUrl: clean(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  posthogKey: clean(process.env.EXPO_PUBLIC_POSTHOG_KEY),
  oneSignalAppId: clean(process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID),
  cfR2PublicUrl: clean(process.env.EXPO_PUBLIC_CF_R2_PUBLIC_URL),
  mapboxAccessToken: clean(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN),
  sentryDsn: clean(process.env.EXPO_PUBLIC_SENTRY_DSN),
} as const;

const missingRequired = [
  !values.supabaseUrl ? 'EXPO_PUBLIC_SUPABASE_URL' : null,
  !values.supabaseAnonKey ? 'EXPO_PUBLIC_SUPABASE_ANON_KEY' : null,
].filter((value): value is string => value !== null);

export const publicEnv = Object.freeze({
  ...values,
  missingRequired,
});

export const hasRequiredPublicEnv = missingRequired.length === 0;

export const startupConfigError =
  missingRequired.length > 0
    ? `Eksik EAS/Expo build ayarlari: ${missingRequired.join(', ')}`
    : null;
