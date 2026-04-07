import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { captureError } from '@/lib/sentry';
import { supabase } from '@/lib/supabase';

import type { NotificationResponse } from 'expo-notifications';

const DAILY_GAME_REMINDER_KEY = 'daily-game-reminder-id';
const isExpoGo = Constants.executionEnvironment === 'storeClient';
type NotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<NotificationsModule> | null = null;

const getNotificationsModule = async (): Promise<NotificationsModule> => {
  notificationsModulePromise ??= import('expo-notifications');
  return notificationsModulePromise;
};

export const savePushToken = async (userId: string, token: string): Promise<void> => {
  const { error } = await supabase.from('user_push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  );

  if (error) {
    throw new Error(error.message);
  }
};

export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    if (isExpoGo) {
      return null;
    }

    if (!Device.isDevice) {
      return null;
    }

    const sessionResponse = await supabase.auth.getSession();
    const userId = sessionResponse.data.session?.user.id;

    if (!userId) {
      return null;
    }

    const Notifications = await getNotificationsModule();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (finalStatus !== 'granted') {
      const requestPermissions = await Notifications.requestPermissionsAsync();
      finalStatus = requestPermissions.status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Varsayılan',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse.data;

    await savePushToken(userId, token);

    return token;
  } catch (error: unknown) {
    captureError(error, { service: 'registerForPushNotifications' });
    throw error;
  }
};

export const cancelDailyGameReminder = async (): Promise<void> => {
  if (isExpoGo) {
    return;
  }

  const identifier = await AsyncStorage.getItem(DAILY_GAME_REMINDER_KEY);

  if (!identifier) {
    return;
  }

  const Notifications = await getNotificationsModule();
  await Notifications.cancelScheduledNotificationAsync(identifier);
  await AsyncStorage.removeItem(DAILY_GAME_REMINDER_KEY);
};

export const scheduleDailyGameReminder = async (): Promise<void> => {
  if (isExpoGo) {
    return;
  }

  const sessionResponse = await supabase.auth.getSession();
  const userId = sessionResponse.data.session?.user.id;

  if (!userId) {
    return;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('notif_weather')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!profile.notif_weather) {
    await cancelDailyGameReminder();
    return;
  }

  const existingIdentifier = await AsyncStorage.getItem(DAILY_GAME_REMINDER_KEY);

  if (existingIdentifier) {
    return;
  }

  const Notifications = await getNotificationsModule();
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎯 Günün tahmini seni bekliyor!',
      body: 'Bugünün sorusunu cevapla, XP kazan.',
    },
    trigger: {
      hour: 8,
      minute: 0,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    },
  });

  await AsyncStorage.setItem(DAILY_GAME_REMINDER_KEY, identifier);
};

export const handleNotificationResponse = (response: NotificationResponse): void => {
  void (async () => {
    const data = response.notification.request.content.data;
    const type = typeof data.type === 'string' ? data.type : null;
    const refId = typeof data.ref_id === 'string' ? data.ref_id : null;
    const refType = typeof data.ref_type === 'string' ? data.ref_type : null;
    const conversationId =
      typeof data.conversation_id === 'string' ? data.conversation_id : refId;
    const actorUsername = typeof data.username === 'string' ? data.username : null;
    const actorId = typeof data.actor_id === 'string' ? data.actor_id : null;

    if ((type === 'message' || refType === 'conversation' || refType === 'message') && conversationId) {
      router.push({
        pathname: '/messages/[conversationId]',
        params: { conversationId },
      });
      return;
    }

    switch (type) {
      case 'like':
      case 'comment':
        if (refId) {
          router.push(`/catch/${refId}`);
          return;
        }
        break;
      case 'follow': {
        if (actorUsername) {
          router.push(`/(tabs)/profile/${actorUsername}`);
          return;
        }

        if (actorId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', actorId)
            .maybeSingle();

          if (profile?.username) {
            router.push(`/(tabs)/profile/${profile.username}`);
            return;
          }
        }
        break;
      }
      case 'badge':
      case 'level_up':
        router.push('/(tabs)/profile/index');
        return;
      default:
        break;
    }

    router.push('/(tabs)');
  })();
};

export const addNotificationListeners = async (
  onNotificationReceived: () => void,
): Promise<{ remove: () => void }> => {
  if (isExpoGo) {
    return { remove: () => undefined };
  }

  const Notifications = await getNotificationsModule();
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    handleNotificationResponse,
  );
  const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
    onNotificationReceived();
  });

  return {
    remove: () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    },
  };
};
