import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { memo, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassView } from '@/components/GlassView';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { getPostTypeColors, getPostTypeEmoji, getPostTypeShortLabel } from '@/lib/posts';
import type { PostCardItem } from '@/types/app.types';
import { formatTimeAgo } from '@/utils/date';

interface PostCardProps {
  item: PostCardItem;
  onPress: (item: PostCardItem) => void;
  onLike?: (item: PostCardItem) => void;
  onComment?: (item: PostCardItem) => void;
  isLiked?: boolean;
}

const COLORS = {
  surface: '#0F2A36',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#EAF4F4',
  textSecondary: '#9DB5B5',
  textMuted: 'rgba(234,244,244,0.55)',
  placeholder: '#153340',
};

const getPostPreview = (body: string): string => {
  const normalized = body.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return 'Yaziyi acarak tum icerigi oku.';
  }

  const firstSentenceMatch = normalized.match(/.+?[.!?](?=\s|$)/);
  const firstSentence = firstSentenceMatch?.[0]?.trim();

  if (firstSentence && firstSentence.length <= 140) {
    return firstSentence;
  }

  const words = normalized.split(' ').slice(0, 18).join(' ');
  return words.length < normalized.length ? `${words}...` : words;
};

const PostCardComponent = ({ item, onPress, onLike, onComment, isLiked = false }: PostCardProps): JSX.Element => {
  const badgeColors = useMemo(() => getPostTypeColors(item.type), [item.type]);
  const previewText = useMemo(() => getPostPreview(item.body), [item.body]);
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  const handleLike = useCallback(() => onLike?.(item), [onLike, item]);
  const handleComment = useCallback(() => onComment?.(item), [onComment, item]);

  return (
    <GlassView borderRadius={24} intensity={18} style={styles.card}>
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={styles.cardInner}>
        {item.cover_image_url ? (
          <Image 
            cachePolicy="memory-disk" 
            contentFit="cover" 
            source={{ uri: item.cover_image_url }} 
            style={styles.coverImage} 
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderEmoji}>{getPostTypeEmoji(item.type)}</Text>
          </View>
        )}

      <View style={styles.content}>
        <View style={[styles.badge, {
          backgroundColor: badgeColors.background,
          borderColor: badgeColors.border,
        }]}
        >
          <Text style={[styles.badgeText, { color: badgeColors.text }]}>
            {getPostTypeShortLabel(item.type)}
          </Text>
        </View>

        <Text numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>

        <Text numberOfLines={3} style={styles.preview}>
          {previewText}
        </Text>

        <View style={styles.authorRow}>
          <Image
            cachePolicy="memory-disk"
            contentFit="cover"
            source={item.profiles?.avatar_url ? { uri: item.profiles.avatar_url } : undefined}
            style={styles.avatar}
          />
          <View style={styles.authorTextWrap}>
            <Text numberOfLines={1} style={styles.authorName}>
              @{item.profiles?.username ?? 'bilinmeyen'}
            </Text>
            <Text numberOfLines={1} style={styles.authorMeta}>
              {formatTimeAgo(item.created_at)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          activeOpacity={0.7} 
          onPress={handleLike} 
          style={styles.footerItem}
        >
          <Ionicons 
            color={isLiked ? '#FF6B6B' : COLORS.textMuted} 
            name={isLiked ? 'heart' : 'heart-outline'} 
            size={20} 
          />
          <Text style={[styles.footerText, isLiked && styles.footerTextLiked]}>
            {item.like_count}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          activeOpacity={0.7} 
          onPress={handleComment} 
          style={styles.footerItem}
        >
          <Ionicons color={COLORS.textMuted} name="chatbubble-outline" size={18} />
          <Text style={styles.footerText}>{item.comment_count}</Text>
        </TouchableOpacity>
      </View>
      </TouchableOpacity>
    </GlassView>
  );
};

// Custom comparison for memo
export const PostCard = memo(PostCardComponent, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.like_count === next.item.like_count &&
    prev.item.comment_count === next.item.comment_count &&
    prev.isLiked === next.isLiked &&
    prev.onPress === next.onPress &&
    prev.onLike === next.onLike &&
    prev.onComment === next.onComment
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardInner: {
    overflow: 'hidden',
  },
  coverImage: {
    aspectRatio: 4 / 3,
    width: '100%',
  },
  placeholder: {
    alignItems: 'center',
    aspectRatio: 4 / 3,
    backgroundColor: COLORS.placeholder,
    justifyContent: 'center',
    width: '100%',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  content: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  preview: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  authorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  avatar: {
    backgroundColor: COLORS.placeholder,
    borderRadius: 16,
    height: 32,
    width: 32,
  },
  authorTextWrap: {
    flex: 1,
  },
  authorName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  authorMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  footerTextLiked: {
    color: '#FF6B6B',
  },
});
