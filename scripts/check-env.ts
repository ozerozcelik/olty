const REQUIRED_VARS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
] as const;

const OPTIONAL_VARS = [
  'EXPO_PUBLIC_POSTHOG_KEY',
  'EXPO_PUBLIC_ONESIGNAL_APP_ID',
  'EXPO_PUBLIC_CF_R2_PUBLIC_URL',
  'EXPO_PUBLIC_SENTRY_DSN',
] as const;

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

for (const key of OPTIONAL_VARS) {
  if (!process.env[key]) {
    console.warn(`Optional env var is not set: ${key}`);
  }
}

console.log('Required env vars present');
