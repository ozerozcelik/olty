import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TouchableOpacity } from '@/components/TouchableOpacity';
import { getPostTypeColors, getPostTypeEmoji, getPostTypeLabel } from '@/lib/posts';
import {
  addPostComment,
  getPostById,
  getPostComments,
  likePost,
  unlikePost,
} from '@/services/posts.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PostComment } from '@/types/app.types';
import { formatDate, formatTimeAgo } from '@/utils/date';

const getParamValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
};

const PostDetailScreen = (): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  const params = useLocalSearchParams<{ id: string }>();
  const postId = getParamValue(params.id);
  const [commentBody, setCommentBody] = useState<string>('');
  const postQuery = useQuery({
    queryKey: ['post', postId],
    queryFn: () => getPostById(postId),
    enabled: Boolean(postId),
  });
  const commentsQuery = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: () => getPostComments(postId),
    enabled: Boolean(postId),
  });
  const likeMutation = useMutation({
    mutationFn: async (isLiked: boolean) => (isLiked ? unlikePost(postId) : likePost(postId)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['post', postId] }),
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
      ]);
    },
  });
  const commentMutation = useMutation({
    mutationFn: (body: string) => addPostComment(postId, body),
    onSuccess: async (createdComment) => {
      queryClient.setQueryData<PostComment[]>(['post-comments', postId], (current) => [
        createdComment,
        ...(current ?? []),
      ]);
      setCommentBody('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['post', postId] }),
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
      ]);
    },
  });

  const post = postQuery.data;
  const badgeColors = post ? getPostTypeColors(post.type) : null;

  const handleSubmitComment = async (): Promise<void> => {
    const trimmed = commentBody.trim();

    if (!trimmed) {
      return;
    }

    try {
      await commentMutation.mutateAsync(trimmed);
    } catch (error) {
      Alert.alert('Yorum eklenemedi', error instanceof Error ? error.message : 'Bir hata oluştu.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons color="#F0F7F9" name="chevron-back" size={20} />
          </TouchableOpacity>
          <Text numberOfLines={1} style={styles.headerTitle}>Yazı Detayı</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {!post ? (
            <Text style={styles.emptyText}>
              {postQuery.isLoading ? 'Yazı yükleniyor...' : 'Yazı bulunamadı.'}
            </Text>
          ) : (
            <>
              {post.cover_image_url ? (
                <Image contentFit="cover" source={{ uri: post.cover_image_url }} style={styles.coverImage} />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderEmoji}>{getPostTypeEmoji(post.type)}</Text>
                </View>
              )}

              <View style={styles.card}>
                <View style={[styles.typeBadge, {
                  backgroundColor: badgeColors?.background,
                  borderColor: badgeColors?.border,
                }]}
                >
                  <Text style={[styles.typeBadgeText, { color: badgeColors?.text ?? '#7DD4E8' }]}>
                    {getPostTypeLabel(post.type)}
                  </Text>
                </View>

                <Text style={styles.title}>{post.title}</Text>

                <View style={styles.authorRow}>
                  <Image
                    contentFit="cover"
                    source={post.profiles?.avatar_url ? { uri: post.profiles.avatar_url } : undefined}
                    style={styles.avatar}
                  />
                  <View style={styles.authorMetaWrap}>
                    <Text style={styles.authorName}>@{post.profiles?.username ?? 'bilinmeyen'}</Text>
                    <Text style={styles.authorMeta}>{formatDate(post.created_at)} · {formatTimeAgo(post.created_at)}</Text>
                  </View>
                </View>

                <Text style={styles.body}>{post.body}</Text>

                {post.images.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.galleryRow}>
                      {post.images.map((uri) => (
                        <Image contentFit="cover" key={uri} source={{ uri }} style={styles.galleryImage} />
                      ))}
                    </View>
                  </ScrollView>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => void likeMutation.mutate(post.is_liked)}
                  style={styles.likeButton}
                >
                  <Ionicons
                    color={post.is_liked ? '#E8845A' : '#F0F7F9'}
                    name={post.is_liked ? 'heart' : 'heart-outline'}
                    size={20}
                  />
                  <Text style={styles.likeButtonText}>{post.like_count} beğeni</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.commentsCard}>
                <Text style={styles.commentsTitle}>Yorumlar</Text>
                {(commentsQuery.data ?? []).length ? (
                  <View style={styles.commentsList}>
                    {(commentsQuery.data ?? []).map((item) => (
                      <View key={item.id} style={styles.commentItem}>
                        <Image
                          contentFit="cover"
                          source={item.profiles?.avatar_url ? { uri: item.profiles.avatar_url } : undefined}
                          style={styles.commentAvatar}
                        />
                        <View style={styles.commentBodyWrap}>
                          <View style={styles.commentHeader}>
                            <Text style={styles.commentAuthor}>{item.profiles?.username ?? 'Bilinmeyen'}</Text>
                            <Text style={styles.commentMeta}>{formatTimeAgo(item.created_at)}</Text>
                          </View>
                          <Text style={styles.commentBody}>{item.body}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyComments}>Henüz yorum yok.</Text>
                )}
              </View>
            </>
          )}
        </ScrollView>

        <View style={[styles.commentComposer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            onChangeText={setCommentBody}
            placeholder={profile ? 'Yorum Yaz' : 'Yorum için giriş yap'}
            placeholderTextColor="rgba(240,247,249,0.45)"
            style={styles.commentInput}
            value={commentBody}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={commentMutation.isPending}
            onPress={() => void handleSubmitComment()}
            style={styles.commentButton}
          >
            <Text style={styles.commentButtonText}>Gönder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A2028',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
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
  headerTitle: {
    color: '#F0F7F9',
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyText: {
    color: 'rgba(240,247,249,0.65)',
    fontSize: 15,
    paddingTop: 40,
    textAlign: 'center',
  },
  coverImage: {
    aspectRatio: 4 / 3,
    borderRadius: 28,
    width: '100%',
  },
  placeholder: {
    alignItems: 'center',
    aspectRatio: 4 / 3,
    backgroundColor: '#0F2C35',
    borderRadius: 28,
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 54,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    padding: 20,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: '#F0F7F9',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
  },
  authorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  authorMetaWrap: {
    flex: 1,
  },
  authorName: {
    color: '#F0F7F9',
    fontSize: 14,
    fontWeight: '600',
  },
  authorMeta: {
    color: 'rgba(240,247,249,0.65)',
    fontSize: 12,
    marginTop: 2,
  },
  body: {
    color: '#F0F7F9',
    fontSize: 16,
    lineHeight: 26,
  },
  galleryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
  },
  galleryImage: {
    backgroundColor: '#0F2C35',
    borderRadius: 20,
    height: 180,
    width: 180,
  },
  likeButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  likeButtonText: {
    color: '#F0F7F9',
    fontSize: 14,
    fontWeight: '600',
  },
  commentsCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 20,
  },
  commentsTitle: {
    color: '#F0F7F9',
    fontSize: 18,
    fontWeight: '700',
  },
  commentsList: {
    gap: 12,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
  },
  commentAvatar: {
    backgroundColor: '#0F2C35',
    borderRadius: 18,
    height: 36,
    width: 36,
  },
  commentBodyWrap: {
    flex: 1,
  },
  commentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commentAuthor: {
    color: '#F0F7F9',
    fontSize: 13,
    fontWeight: '600',
  },
  commentMeta: {
    color: 'rgba(240,247,249,0.45)',
    fontSize: 11,
  },
  commentBody: {
    color: 'rgba(240,247,249,0.70)',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  emptyComments: {
    color: 'rgba(240,247,249,0.65)',
    fontSize: 14,
  },
  commentComposer: {
    alignItems: 'center',
    backgroundColor: '#0A2028',
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  commentInput: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    borderWidth: 1,
    color: '#F0F7F9',
    flex: 1,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  commentButton: {
    alignItems: 'center',
    backgroundColor: '#7DD4E8',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  commentButtonText: {
    color: '#0A2028',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default PostDetailScreen;
