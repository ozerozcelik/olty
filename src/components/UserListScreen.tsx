import {
  Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery,
  useQuery,
  useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { SplashScreen } from '@/components/SplashScreen';
import { UserRow } from '@/components/UserRow';
import { getProfileById } from '@/services/profiles.service';
import { getFollowers, getFollowing, isFollowing } from '@/services/social.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { ProfileRow } from '@/types/app.types';

const USER_ROW_HEIGHT = 72;

interface UserListScreenProps {
  userId: string;
  mode: 'followers' | 'following';
}

export const UserListScreen = ({ userId, mode }: UserListScreenProps): JSX.Element => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const ownProfile = useAuthStore((state) => state.profile);
  const title = mode === 'followers' ? 'Takipciler' : 'Takip Edilenler';

  const profileQuery = useQuery({
    queryKey: ['list-profile', userId],
    queryFn: () => getProfileById(userId),
    enabled: Boolean(userId),
  });
  const listQuery = useInfiniteQuery({
    queryKey: ['user-list', mode, userId],
    queryFn: ({ pageParam }) =>
      mode === 'followers' ? getFollowers(userId, pageParam) : getFollowing(userId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(userId),
  });
  const followStateQuery = useQuery({
    queryKey: ['user-list-following-state', mode, userId],
    queryFn: async () => {
      const users = (listQuery.data?.pages.flatMap((page) => page.items) ?? []).filter(
        (item) => item.id !== ownProfile?.id,
      );
      const results = await Promise.all(
        users.map(async (user) => ({ id: user.id, value: await isFollowing(user.id) })),
      );
      return Object.fromEntries(results.map((item) => [item.id, item.value]));
    },
    enabled: Boolean(listQuery.data?.pages.length && ownProfile?.id),
  });
  const users = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [listQuery.data],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<ProfileRow> | null | undefined, index: number) => ({
      length: USER_ROW_HEIGHT,
      offset: USER_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const handleFollowToggle = useCallback(
    (itemId: string) => (_userId: string, nowFollowing: boolean) => {
      queryClient.setQueryData<Record<string, boolean> | undefined>(
        ['user-list-following-state', mode, userId],
        (current) => ({ ...(current ?? {}), [itemId]: nowFollowing }),
      );
    },
    [queryClient, mode, userId],
  );

  if (!profileQuery.data) {
    return <SplashScreen />;
  }

  return (
    <View className="flex-1 bg-sand px-4 pt-4">
      <View className="mb-4 flex-row items-center gap-3">
        <TouchableOpacity activeOpacity={0.8} className="rounded-full border border-white/10 bg-white/10 p-3" onPress={() => router.back()}>
          <Ionicons color="#F0F7F9" name="arrow-back" size={20} />
        </TouchableOpacity>
        <View>
          <Text className="text-2xl font-semibold text-ink">{title}</Text>
          <Text className="text-sm text-white/70">@{profileQuery.data.username}</Text>
        </View>
      </View>

      <FlatList
        className="flex-1"
        contentContainerStyle={
          users.length
            ? { gap: 12, paddingBottom: 32 }
            : { flexGrow: 1, alignItems: 'center', justifyContent: 'center' }
        }
        data={users}
        getItemLayout={getItemLayout}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl onRefresh={() => void listQuery.refetch()} refreshing={listQuery.isRefetching} />}
        renderItem={({ item }) => (
          <UserRow
            isFollowing={followStateQuery.data?.[item.id] ?? false}
            onFollowToggle={handleFollowToggle(item.id)}
            profile={item}
            showFollowButton={item.id !== ownProfile?.id}
          />
        )}
        ListEmptyComponent={<Text className="text-base text-white/70">Henüz kimse yok</Text>}
        ListFooterComponent={
          listQuery.isFetchingNextPage ? <ActivityIndicator className="py-4" size="small" /> : null
        }
        onEndReached={() => {
          if (listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
            void listQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.3}
      />
    </View>
  );
};
