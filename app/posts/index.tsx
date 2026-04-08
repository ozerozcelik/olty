import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostCard } from '@/components/PostCard';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { POST_TYPE_OPTIONS } from '@/lib/posts';
import { getPosts, likePost, unlikePost } from '@/services/posts.service';
import type { PostCardItem, PostType } from '@/types/app.types';

const PAGE_SIZE = 12;
const POST_NEW_ROUTE = '/posts/new' as Href;

const PostsIndexScreen = (): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<'all' | PostType>('all');
  const postsQuery = useInfiniteQuery({
    queryKey: ['posts', selectedType],
    queryFn: ({ pageParam }) => getPosts(selectedType === 'all' ? undefined : selectedType, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1]?.created_at : undefined,
  });
  const postLikeMutation = useMutation({ mutationFn: likePost });
  const postUnlikeMutation = useMutation({ mutationFn: unlikePost });

  const items = useMemo(
    () => postsQuery.data?.pages.flat() ?? [],
    [postsQuery.data?.pages],
  );

  const updatePostCache = useCallback((target: PostCardItem): void => {
    queryClient.setQueryData(['posts', selectedType], (current: typeof postsQuery.data) => {
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
  }, [queryClient, selectedType, postsQuery]);

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
    router.push(`/posts/${item.id}` as Href);
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color="#F0F7F9" name="chevron-back" size={20} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Yazılar</Text>
          <Text style={styles.subtitle}>Taktikler, hikayeler ve spot notları</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(POST_NEW_ROUTE)} style={styles.newButton}>
          <Ionicons color="#0A2028" name="add" size={18} />
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {postsQuery.isLoading ? 'Yazılar yükleniyor...' : 'Henüz yazı yok.'}
          </Text>
        }
        ListHeaderComponent={
          <View style={styles.filterRow}>
            {POST_TYPE_OPTIONS.map((option) => {
              const active = option.value === selectedType;
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  key={option.value}
                  onPress={() => setSelectedType(option.value)}
                  style={[styles.filterPill, active ? styles.filterPillActive : null]}
                >
                  <Text style={[styles.filterPillText, active ? styles.filterPillTextActive : null]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        }
        onEndReached={() => {
          if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
            void postsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            onRefresh={() => void postsQuery.refetch()}
            refreshing={postsQuery.isRefetching}
            tintColor="#D4FF00"
          />
        }
        renderItem={({ item }) => (
          <PostCard
            isLiked={item.is_liked}
            item={item as PostCardItem}
            onComment={handlePostComment}
            onLike={handleTogglePostLike}
            onPress={(post) => router.push(`/posts/${post.id}` as Href)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A2028',
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: '#F0F7F9',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(240,247,249,0.65)',
    fontSize: 13,
    marginTop: 2,
  },
  newButton: {
    alignItems: 'center',
    backgroundColor: '#D4FF00',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  content: {
    paddingBottom: 32,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterPillActive: {
    backgroundColor: '#D4FF00',
    borderColor: '#D4FF00',
  },
  filterPillText: {
    color: 'rgba(240,247,249,0.65)',
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#0A2028',
  },
  emptyText: {
    color: 'rgba(240,247,249,0.65)',
    fontSize: 15,
    paddingTop: 40,
    textAlign: 'center',
  },
});

export default PostsIndexScreen;
