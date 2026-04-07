import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Olty',
  slug: 'fishgram',
  owner: 'ozerozcelik',
  scheme: 'olty',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#f6f3ea',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.olty.app',
    associatedDomains: ['applinks:olty.app'],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription:
        'Avini haritada gostermek ve yakinindaki diger balikcilari kesfetmek icin konumuna ihtiyacimiz var. Konum bilgin hicbir zaman tam olarak paylasilmaz.',
    },
  },
  android: {
    package: 'com.olty.app',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundColor: '#f6f3ea',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    intentFilters: [
      {
        action: 'VIEW',
        data: [{ scheme: 'olty' }, { host: 'olty.app', scheme: 'https' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png',
  },
  experiments: {
    typedRoutes: true,
  },
  plugins: [
    'expo-router',
    'expo-notifications',
    'expo-location',
    'expo-secure-store',
    '@sentry/react-native/expo',
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsVersion: '11.18.2',
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    oneSignalAppId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
    cfR2PublicUrl: process.env.EXPO_PUBLIC_CF_R2_PUBLIC_URL,
    mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    eas: {
      projectId: '3bfd9faf-72e4-4cc7-9e22-0c23d7178805',
    },
  },
};

export default config;
