import {
  type InfiniteData,
  useInfiniteQuery,
  useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect,
  useMemo,
  useRef } from 'react';
import { FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { NotificationRow } from '@/components/NotificationRow';
import { T } from '@/lib/theme';
import { getNotifications, markAllAsRead } from '@/services/notifications.service';
import { useNotificationStore } from '@/stores/useNotificationStore';
import type { NotificationListItem } from '@/types/app.types';

const PAGE_SIZE = 30;
type NotificationPages = InfiniteData<NotificationListItem[], string | undefined>;

const NotificationsScreen = (): JSX.Element => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const resetUnreadCount = useNotificationStore((state) => state.reset);
  const setUnreadCount = useNotificationStore((state) => state.setCount);
  const isAutoMarkingRef = useRef<boolean>(false);
  const notificationsQuery = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) => getNotifications(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1]?.created_at : undefined,
  });
  const notifications = useMemo(
    () => notificationsQuery.data?.pages.flat() ?? [],
    [notificationsQuery.data?.pages],
  );

  useEffect(() => {
    const unreadCount = notifications.filter((item) => !item.is_read).length;
    setUnreadCount(unreadCount);

    if (!unreadCount || isAutoMarkingRef.current) {
      return;
    }

    isAutoMarkingRef.current = true;
    void (async () => {
      try {
        await markAllAsRead();
        queryClient.setQueryData<NotificationPages>(['notifications'], (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            pages: current.pages.map((page) =>
              page.map((item) => ({
                ...item,
                is_read: true,
              })),
            ),
          };
        });
        resetUnreadCount();
      } finally {
        isAutoMarkingRef.current = false;
      }
    })();
  }, [notifications, queryClient, resetUnreadCount, setUnreadCount]);

  const handlePressNotification = (item: NotificationListItem): void => {
    if ((item.ref_type === 'conversation' || item.ref_type === 'message') && item.ref_id) {
      router.push({
        pathname: '/messages/[conversationId]',
        params: { conversationId: item.ref_id },
      });
      return;
    }

    if (item.ref_type === 'catch' && item.ref_id) {
      router.push(`/catch/${item.ref_id}`);
      return;
    }

    if (item.ref_type === 'profile' && item.actor?.username) {
      router.push(`/(tabs)/profile/${item.actor.username}`);
      return;
    }

    if (item.type === 'badge' || item.type === 'level_up') {
      router.push('/(tabs)/profile/index');
      return;
    }

    router.push('/(tabs)');
  };

  const handleMarkAllRead = async (): Promise<void> => {
    await markAllAsRead();
    queryClient.setQueryData<NotificationPages>(['notifications'], (current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        pages: current.pages.map((page) =>
          page.map((item) => ({
            ...item,
            is_read: true,
          })),
        ),
      };
    });
    resetUnreadCount();
  };

  return (
    <View
      style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Bildirimler</Text>
        <TouchableOpacity activeOpacity={0.8} onPress={() => void handleMarkAllRead()}>
          <Text style={styles.markAllRead}>Tümünü okundu işaretle</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={
          notifications.length
            ? { gap: 8, paddingBottom: 32 }
            : { flexGrow: 1, justifyContent: 'center' }
        }
        data={notifications}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Henüz bildirim yok</Text>
        }
        onEndReached={() => {
          if (notificationsQuery.hasNextPage && !notificationsQuery.isFetchingNextPage) {
            void notificationsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <NotificationRow item={item} onPress={handlePressNotification} />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: T.textPrimary,
  },
  markAllRead: {
    fontSize: 13,
    fontWeight: '600',
    color: T.teal,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: T.textTertiary,
  },
});

export default NotificationsScreen;
