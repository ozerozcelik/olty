import { Ionicons } from '@expo/vector-icons';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  useRouter,
  type Href,
} from 'expo-router';
import {
  useMemo,
  useState,
  useCallback,
} from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CatchCard } from '@/components/CatchCard';
import { CommentsSheet } from '@/components/CommentsSheet';
import { EmptyFeed } from '@/components/EmptyFeed';
import { PostCard } from '@/components/PostCard';
import { SkeletonFeed } from '@/components/Skeleton';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { WeatherWidget } from '@/components/WeatherWidget';
import { T } from '@/lib/theme';
import { getFeedCatches } from '@/services/catches.service';
import { getPosts, likePost, unlikePost } from '@/services/posts.service';
import { likeCatch, unlikeCatch } from '@/services/social.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CatchFeedItem, PostCardItem } from '@/types/app.types';

const PAGE_SIZE = 20;
const FISH_ID_ROUTE = '/fish-id' as Href;
const POSTS_DETAIL_ROUTE = (id: string): Href => `/posts/${id}` as Href;

type FeedEntry =
  | { kind: 'catch'; created_at: string; id: string; item: CatchFeedItem }
  | { kind: 'post'; created_at: string; id: string; item: PostCardItem };

const FeedScreen = (): JSX.Element => {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [selectedCatchId, setSelectedCatchId] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: ['feed-catches'],
    queryFn: ({ pageParam }) => getFeedCatches(pageParam, PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1]?.created_at : undefined,
  });
  const postsQuery = useInfiniteQuery({
    queryKey: ['feed-posts'],
    queryFn: ({ pageParam }) => getPosts(undefined, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.length === 12 ? lastPage[lastPage.length - 1]?.created_at : undefined,
  });
  const catchItems = useMemo(() => query.data?.pages.flat() ?? [], [query.data?.pages]);
  const postItems = useMemo(() => postsQuery.data?.pages.flat() ?? [], [postsQuery.data?.pages]);
  const feedItems = useMemo<FeedEntry[]>(
    () =>
      [
        ...catchItems.map((item) => ({
          kind: 'catch' as const,
          created_at: item.created_at,
          id: `catch-${item.id}`,
          item,
        })),
        ...postItems.map((item) => ({
          kind: 'post' as const,
          created_at: item.created_at,
          id: `post-${item.id}`,
          item,
        })),
      ].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()),
    [catchItems, postItems],
  );
  const likeMutation = useMutation({ mutationFn: likeCatch });
  const unlikeMutation = useMutation({ mutationFn: unlikeCatch });
  const postLikeMutation = useMutation({ mutationFn: likePost });
  const postUnlikeMutation = useMutation({ mutationFn: unlikePost });

  const updateFeedCache = useCallback((target: CatchFeedItem): void => {
    queryClient.setQueryData(['feed-catches'], (current: typeof query.data) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        pages: current.pages.map((page) =>
          page.map((item) =>
            item.id === target.id
              ? {
                  ...item,
                  is_liked: !item.is_liked,
                  like_count: item.like_count + (item.is_liked ? -1 : 1),
                }
              : item,
          ),
        ),
      };
    });
  }, [queryClient]);

  const handleToggleLike = useCallback(async (item: CatchFeedItem): Promise<void> => {
    updateFeedCache(item);

    try {
      if (item.is_liked) {
        await unlikeMutation.mutateAsync(item.id);
      } else {
        await likeMutation.mutateAsync(item.id);
      }
    } catch {
      updateFeedCache({ ...item, is_liked: !item.is_liked });
    }
  }, [updateFeedCache, unlikeMutation, likeMutation]);

  const updatePostCache = useCallback((target: PostCardItem): void => {
    queryClient.setQueryData(['posts'], (current: typeof postsQuery.data) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        pages: current.pages.map((page) =>
          page.map((item) =>
            item.id === target.id
              ? {
                  ...item,
                  is_liked: !item.is_liked,
                  like_count: item.like_count + (item.is_liked ? -1 : 1),
                }
              : item,
          ),
        ),
      };
    });
  }, [queryClient]);

  const handleTogglePostLike = useCallback(async (item: PostCardItem): Promise<void> => {
    updatePostCache(item);

    try {
      if (item.is_liked) {
        await postUnlikeMutation.mutateAsync(item.id);
      } else {
        await postLikeMutation.mutateAsync(item.id);
      }
    } catch {
      updatePostCache({ ...item, is_liked: !item.is_liked });
    }
  }, [updatePostCache, postUnlikeMutation, postLikeMutation]);

  const handlePostComment = useCallback((item: PostCardItem) => {
    router.push(POSTS_DETAIL_ROUTE(item.id));
  }, [router]);

  const handleOpenComments = useCallback((value: CatchFeedItem) => {
    setSelectedCatchId(value.id);
  }, []);

  const handleOpenProfile = useCallback((value: CatchFeedItem) => {
    if (value.profiles?.username) {
      router.push(`/(tabs)/profile/${value.profiles.username}`);
    }
  }, [router]);

  const handlePostPress = useCallback((value: PostCardItem) => {
    router.push(POSTS_DETAIL_ROUTE(value.id));
  }, [router]);

  const handleCloseComments = useCallback(() => {
    setSelectedCatchId(null);
  }, []);

  // FlatList performance: estimated item height for better scroll performance
  const ESTIMATED_CATCH_CARD_HEIGHT = 420; // approximate height of CatchCard
  
  const getItemLayout = useCallback((_data: ArrayLike<FeedEntry> | null | undefined, index: number) => ({
    length: ESTIMATED_CATCH_CARD_HEIGHT,
    offset: ESTIMATED_CATCH_CARD_HEIGHT * index,
    index,
  }), []);

  const keyExtractor = useCallback((item: FeedEntry) => item.id, []);

  const handleEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
    if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
      void postsQuery.fetchNextPage();
    }
  }, [query, postsQuery]);

  const handleRefresh = useCallback(() => {
    void Promise.all([query.refetch(), postsQuery.refetch()]);
  }, [query, postsQuery]);

  const renderItem = useCallback(({ item }: { item: FeedEntry }) =>
    item.kind === 'catch' ? (
      <CatchCard
        item={item.item}
        onOpenComments={handleOpenComments}
        onOpenProfile={handleOpenProfile}
        onToggleLike={handleToggleLike}
      />
    ) : (
      <PostCard
        isLiked={item.item.is_liked}
        item={item.item}
        onComment={handlePostComment}
        onLike={handleTogglePostLike}
        onPress={handlePostPress}
      />
    ), [handleOpenComments, handleOpenProfile, handleToggleLike, handlePostPress, handleTogglePostLike, handlePostComment]);

  if (!feedItems.length && !query.isLoading && !postsQuery.isLoading) {
    return (
      <EmptyFeed
        followingCount={profile?.following_count ?? 0}
        latitude={null}
        longitude={null}
      />
    );
  }

  // İlk yükleme sırasında skeleton göster
  const isInitialLoading = query.isLoading || postsQuery.isLoading;

  return (
    <>
      <View style={styles.bgContainer} />
      <FlatList
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 32,
          paddingTop: 0,
        }}
        data={isInitialLoading ? [] : feedItems}
        getItemLayout={getItemLayout}
        initialNumToRender={5}
        keyExtractor={keyExtractor}
        ListEmptyComponent={isInitialLoading ? <SkeletonFeed /> : null}
        ListHeaderComponent={
          <>
            <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 56) }]}>
              <Text style={styles.wordmark}>OLTY</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/search')}
                  style={styles.searchButton}
                >
                  <Ionicons color={T.teal} name="search-outline" size={18} />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push(FISH_ID_ROUTE)}
                  style={styles.aiButton}
                >
                  <Text style={styles.aiButtonText}>AI Tanı</Text>
                </TouchableOpacity>
              </View>
            </View>
            <WeatherWidget />
          </>
        }
        maxToRenderPerBatch={10}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            onRefresh={handleRefresh}
            refreshing={query.isRefetching || postsQuery.isRefetching}
            tintColor={T.teal}
          />
        }
        removeClippedSubviews
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />
      <CommentsSheet
        catchId={selectedCatchId}
        onClose={handleCloseComments}
        visible={selectedCatchId !== null}
      />
    </>
  );
};

const styles = StyleSheet.create({
  bgContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: T.bg,
  },
  list: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
  wordmark: {
    color: T.teal,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  aiButton: {
    backgroundColor: T.coral,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: T.bg,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    alignItems: 'center',
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
    borderRadius: 48,
    borderWidth: 1,
    height: 96,
    justifyContent: 'center',
    width: 96,
  },
  emptyIcon: {
    fontSize: 42,
  },
  emptyTitle: {
    color: T.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyText: {
    color: T.textSecondary,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
    textAlign: 'center',
  },
  emptyActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryAction: {
    backgroundColor: T.coral,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryActionText: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default FeedScreen;
