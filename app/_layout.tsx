import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import Constants from 'expo-constants';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Redirect, Stack, useSegments } from 'expo-router';
import * as SplashScreenExpo from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppConfigErrorScreen } from '@/components/AppConfigErrorScreen';
import { SplashScreen } from '@/components/SplashScreen';
import { initAnalytics } from '@/lib/analytics';
import { handleDeepLink } from '@/lib/deepLinks';
import { startupConfigError } from '@/lib/env';
import { initSentry } from '@/lib/sentry';
import { syncUnreadNotificationsCount } from '@/services/notifications.service';
import {
  addNotificationListeners,
  cancelDailyGameReminder,
  registerForPushNotifications,
  scheduleDailyGameReminder,
} from '@/services/push.service';
import { startAutoSync, stopAutoSync } from '@/services/sync.service';
import { useAuthStore } from '@/stores/useAuthStore';
import { initNetworkListener } from '@/stores/useDraftStore';
import { useNotificationStore } from '@/stores/useNotificationStore';

initSentry();
initAnalytics();

// Keep splash screen visible while fonts load
SplashScreenExpo.preventAutoHideAsync();

const isExpoGo = Constants.executionEnvironment === 'storeClient';
const isExpoGoIos = isExpoGo && Platform.OS === 'ios';

const shouldHandleDeepLink = (url: string): boolean =>
  url.startsWith('olty://') || url.startsWith('https://olty.app');

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('../global.css');

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#050608',
    card: 'rgba(10,14,20,0.97)',
    primary: '#D4FF00',
    text: '#FFFFFF',
    border: 'rgba(255,255,255,0.12)',
    notification: '#FF5500',
  },
};

const AUTH_ROUTE_SEGMENTS = new Set([
  '(auth)',
  'login',
  'register',
  'forgot-password',
  'onboarding',
]);
const PUBLIC_ROUTE_SEGMENTS = new Set(['privacy', 'support']);

const stackScreenOptions = {
  headerShown: false,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animation: 'slide_from_right' as const,
};

const RootNavigator = (): JSX.Element => {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const loading = useAuthStore((state) => state.loading);
  const profileReady = useAuthStore((state) => state.profileReady);
  const segments = useSegments();

  if (loading || (session && !profileReady)) {
    return <SplashScreen />;
  }

  const rootSegment = segments[0];
  const isAuthRoute =
    typeof rootSegment === 'string' && AUTH_ROUTE_SEGMENTS.has(rootSegment);
  const isPublicRoute =
    typeof rootSegment === 'string' && PUBLIC_ROUTE_SEGMENTS.has(rootSegment);
  const isOnboardingRoute =
    rootSegment === 'onboarding' ||
    (isAuthRoute && (segments as string[]).includes('onboarding'));
  const isCatchRoute = rootSegment === 'catch';
  const isRootRoute = typeof rootSegment === 'undefined';
  const requiresOnboarding = Boolean(session && profile && !profile.onboarding_completed);

  if (!session && !isAuthRoute && !isRootRoute && !isPublicRoute) {
    return <Redirect href="/" />;
  }

  if (requiresOnboarding && !isOnboardingRoute && !isCatchRoute) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  if (session && isAuthRoute && !isOnboardingRoute) {
    return <Redirect href="/(tabs)" />;
  }

  if (session && !rootSegment) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={stackScreenOptions} />;
};

const AppRootLayoutInner = (): JSX.Element => {
  const [queryClient] = useState<QueryClient>(() => new QueryClient());
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const incrementUnreadCount = useNotificationStore((state) => state.increment);
  const resetUnreadCount = useNotificationStore((state) => state.reset);
  const setUnreadCount = useNotificationStore((state) => state.setCount);

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Hide splash screen when fonts are loaded
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreenExpo.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) {
      void onLayoutRootView();
    }
  }, [fontsLoaded, onLayoutRootView]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }: { url: string }) => {
      if (shouldHandleDeepLink(url)) {
        handleDeepLink(url);
      }
    });

    void Linking.getInitialURL().then((url: string | null) => {
      if (url && shouldHandleDeepLink(url)) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      resetUnreadCount();
      if (!isExpoGo) {
        void cancelDailyGameReminder();
      }
      return;
    }

    if (!profile) {
      return;
    }

    void (async () => {
      const count = await syncUnreadNotificationsCount();
      setUnreadCount(count);
    })();

    if (isExpoGo) {
      return;
    }

    void (async () => {
      try {
        await registerForPushNotifications();
        await scheduleDailyGameReminder();
      } catch {
        return;
      }
    })();

    let isActive = true;
    let subscriptions: { remove: () => void } | null = null;

    void (async () => {
      const nextSubscriptions = await addNotificationListeners(() => {
        incrementUnreadCount();
      });

      if (!isActive) {
        nextSubscriptions.remove();
        return;
      }

      subscriptions = nextSubscriptions;
    })();

    return () => {
      isActive = false;
      subscriptions?.remove();
    };
  }, [incrementUnreadCount, profile, resetUnreadCount, session, setUnreadCount]);

  // Initialize network listener and auto-sync for offline mode
  useEffect(() => {
    const unsubscribeNetwork = initNetworkListener();
    
    // Start auto-sync when user is authenticated
    if (session) {
      startAutoSync();
    }

    return () => {
      unsubscribeNetwork();
      stopAutoSync();
    };
  }, [session]);

  const RootContainer = isExpoGoIos ? View : GestureHandlerRootView;

  return (
    <RootContainer style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={navigationTheme}>
            <RootNavigator />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </RootContainer>
  );
};

const AppRootLayout = (): JSX.Element => {
  if (startupConfigError) {
    return <AppConfigErrorScreen message={startupConfigError} />;
  }

  return <AppRootLayoutInner />;
};

const RootLayout = (): JSX.Element => <AppRootLayout />;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A2028',
  },
});

export default RootLayout;
