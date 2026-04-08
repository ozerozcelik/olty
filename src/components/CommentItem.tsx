import { Image } from 'expo-image';
import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { HashtagText } from '@/components/HashtagText';
import type { CommentListItem } from '@/types/app.types';
import { formatTimeAgo } from '@/utils/date';

const COLORS = {
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textMuted: '#8B92A5',
  textFaint: 'rgba(139,146,165,0.72)',
  accent: '#D4FF00',
  avatarBg: '#0B0E14',
};

interface CommentItemProps {
  item: CommentListItem;
  onReplyPress?: (item: CommentListItem) => void;
  onProfilePress?: (item: CommentListItem) => void;
}

const CommentItemComponent = ({
  item,
  onProfilePress,
  onReplyPress,
}: CommentItemProps): JSX.Element => {
  const isProfilePressEnabled = Boolean(onProfilePress && item.profiles?.username);
  const handleProfilePress = useCallback(() => onProfilePress?.(item), [onProfilePress, item]);
  const handleReplyPress = useCallback(() => onReplyPress?.(item), [onReplyPress, item]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={!isProfilePressEnabled}
        onPress={handleProfilePress}
      >
        <Image
          cachePolicy="memory-disk"
          contentFit="cover"
          source={item.profiles?.avatar_url ? { uri: item.profiles.avatar_url } : undefined}
          style={styles.avatar}
        />
      </TouchableOpacity>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!isProfilePressEnabled}
            onPress={handleProfilePress}
            style={styles.usernameWrap}
          >
            <Text style={styles.username}>
              {item.profiles?.username ?? 'Bilinmeyen kullanıcı'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.time}>{formatTimeAgo(item.created_at)}</Text>
        </View>
        <HashtagText style={styles.body} text={item.body} />
        {onReplyPress ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleReplyPress}
            style={styles.replyBtn}
          >
            <Text style={styles.replyText}>Yanıtla</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

// Custom comparison for memo
export const CommentItem = memo(CommentItemComponent, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.body === next.item.body &&
    prev.onReplyPress === next.onReplyPress &&
    prev.onProfilePress === next.onProfilePress
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.avatarBg,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  usernameWrap: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  time: {
    fontSize: 12,
    color: COLORS.textFaint,
  },
  body: {
    fontSize: 14,
    lineHeight: 24,
    color: COLORS.textMuted,
  },
  replyBtn: {
    alignSelf: 'flex-start',
    paddingTop: 4,
  },
  replyText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
});
