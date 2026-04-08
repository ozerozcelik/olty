import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { memo, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';

import { AnimatedLikeButton } from '@/components/AnimatedLikeButton';
import { CatchShareSheet } from '@/components/CatchShareSheet';
import { GlassView } from '@/components/GlassView';
import { HashtagText } from '@/components/HashtagText';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { getCatchMethodLabel } from '@/lib/constants';
import { T } from '@/lib/theme';
import type { CatchFeedItem } from '@/types/app.types';
import { shareCatchExternally } from '@/utils/catchShare';
import { formatTimeAgo } from '@/utils/date';
import { hapticLight } from '@/utils/haptics';

interface CatchCardProps {
  item: CatchFeedItem;
  onToggleLike: (item: CatchFeedItem) => void;
  onOpenComments: (item: CatchFeedItem) => void;
  onOpenProfile: (item: CatchFeedItem) => void;
}

const SPORT = {
  surface: '#11141A',
  surfaceSoft: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textMuted: '#8B92A5',
  accent: '#D4FF00',
  accentSoft: 'rgba(212,255,0,0.14)',
  orange: '#FF5500',
  orangeSoft: 'rgba(255,85,0,0.18)',
};

const CatchCardComponent = ({
  item,
  onToggleLike,
  onOpenComments,
  onOpenProfile,
}: CatchCardProps): JSX.Element => {
  const router = useRouter();
  const [lightboxVisible, setLightboxVisible] = useState<boolean>(false);
  const [shareVisible, setShareVisible] = useState<boolean>(false);
  
  const speciesName = useMemo(
    () => item.fish_species?.name_tr ?? item.species_custom ?? 'Tür belirtilmedi',
    [item.fish_species?.name_tr, item.species_custom]
  );
  
  const locationText = item.location_name?.trim() ?? '';
  
  const subtitle = useMemo(
    () => `Lv ${item.profiles?.level ?? 1} • ${formatTimeAgo(item.created_at)}`,
    [item.profiles?.level, item.created_at]
  );
  
  const handleToggleLike = useCallback(() => onToggleLike(item), [onToggleLike, item]);
  const handleOpenComments = useCallback(() => onOpenComments(item), [onOpenComments, item]);
  const handleOpenProfile = useCallback(() => onOpenProfile(item), [onOpenProfile, item]);
  const handleOpenLightbox = useCallback(() => setLightboxVisible(true), []);
  const handleCloseLightbox = useCallback(() => setLightboxVisible(false), []);
  const handleOpenShare = useCallback(() => setShareVisible(true), []);
  const handleCloseShare = useCallback(() => setShareVisible(false), []);

  // Data badges for structured catch info
  const renderDataBadges = (): JSX.Element => (
    <View style={styles.badgesContainer}>
      {item.weight_g ? (
        <View style={styles.dataBadge}>
          <Ionicons color={SPORT.accent} name="scale-outline" size={12} />
          <Text style={styles.badgeText}>{item.weight_g >= 1000 ? `${(item.weight_g / 1000).toFixed(1)} kg` : `${item.weight_g} g`}</Text>
        </View>
      ) : null}
      {item.length_cm ? (
        <View style={styles.dataBadge}>
          <Ionicons color={SPORT.accent} name="resize-outline" size={12} />
          <Text style={styles.badgeText}>{item.length_cm} cm</Text>
        </View>
      ) : null}
      {item.fishing_type ? (
        <View style={styles.dataBadgeAccent}>
          <Text style={styles.badgeTextAccent}>{getCatchMethodLabel(item.fishing_type)}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <>
      <GlassView borderRadius={20} intensity={50} style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!item.profiles?.username}
            onPress={handleOpenProfile}
            style={styles.headerButton}
          >
            <View style={styles.avatarRing}>
              <Image
                cachePolicy="memory-disk"
                contentFit="cover"
                source={item.profiles?.avatar_url ? { uri: item.profiles.avatar_url } : undefined}
                style={styles.avatar}
              />
            </View>
            <View style={styles.headerTextWrap}>
              <Text numberOfLines={1} style={styles.username}>
                {item.profiles?.username ?? 'Bilinmeyen kullanıcı'}
              </Text>
              <Text numberOfLines={1} style={styles.subtitle}>
                {subtitle}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Photo Section */}
        {item.photo_url ? (
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={handleOpenLightbox}
            style={styles.photoWrap}
          >
            <Image
              cachePolicy="memory-disk"
              contentFit="cover"
              source={{ uri: item.photo_url }}
              style={styles.photo}
            />

            {/* Catch & Release Badge */}
            {item.is_catch_release ? (
              <View style={styles.releaseBadge}>
                <Ionicons color="#FFFFFF" name="leaf" size={12} />
                <Text style={styles.releaseText}>C&R</Text>
              </View>
            ) : null}

            {/* Gradient Overlay with Catch Data */}
            <LinearGradient
              colors={['transparent', 'rgba(17,20,26,0.78)', 'rgba(5,6,8,0.95)']}
              locations={[0, 0.5, 1]}
              pointerEvents="none"
              style={styles.photoOverlay}
            >
              <View style={styles.photoOverlayContent}>
                {/* Species Name */}
                <Text numberOfLines={1} style={styles.speciesTitle}>
                  🐟 {speciesName}
                </Text>
                
                {/* Data Badges */}
                {renderDataBadges()}
                
                {/* Location */}
                {locationText ? (
                  <View style={styles.locationRow}>
                    <Ionicons color={SPORT.textMuted} name="location-outline" size={13} />
                    <Text numberOfLines={1} style={styles.locationText}>
                      {locationText}
                    </Text>
                  </View>
                ) : null}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          /* No Photo State */
          <View style={styles.noPhotoContainer}>
            <View style={styles.photoPlaceholder}>
              <Text style={styles.placeholderIcon}>🎣</Text>
              <Text style={styles.placeholderText}>Fotoğrafsız av</Text>
            </View>
            <View style={styles.noPhotoMeta}>
              <Text numberOfLines={1} style={styles.speciesTitle}>
                🐟 {speciesName}
              </Text>
              {renderDataBadges()}
              {locationText ? (
                <View style={styles.locationRow}>
                  <Ionicons color={SPORT.textMuted} name="location-outline" size={13} />
                  <Text numberOfLines={1} style={styles.locationText}>
                    {locationText}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Notes */}
        {item.notes ? (
          <View style={styles.notesWrap}>
            <HashtagText
              numberOfLines={3}
              style={styles.notesText}
              text={item.notes}
            />
          </View>
        ) : null}

        {/* Footer Actions */}
        <View style={styles.footer}>
          <AnimatedLikeButton
            isLiked={item.is_liked ?? false}
            likeCount={item.like_count}
            onPress={handleToggleLike}
            size={22}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              hapticLight();
              handleOpenComments();
            }}
            style={styles.footerAction}
          >
            <Ionicons color={SPORT.textMuted} name="chatbubble-outline" size={20} />
            <Text style={styles.footerText}>{item.comment_count}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              hapticLight();
              handleOpenShare();
            }}
            style={styles.footerAction}
          >
            <Ionicons color={SPORT.textMuted} name="share-social-outline" size={20} />
            <Text style={styles.footerText}>Paylaş</Text>
          </TouchableOpacity>
        </View>
      </GlassView>

      {item.photo_url ? (
        <PhotoLightbox
          onClose={handleCloseLightbox}
          uri={item.photo_url}
          visible={lightboxVisible}
        />
      ) : null}
      <CatchShareSheet
        onClose={handleCloseShare}
        onShareExternally={() => {
          void shareCatchExternally({
            catchId: item.id,
            sharedByUsername: item.profiles?.username,
            speciesName,
          }).finally(handleCloseShare);
        }}
        onShareInMessages={() => {
          handleCloseShare();
          router.push({
            pathname: '/messages/share/[catchId]',
            params: { catchId: item.id },
          });
        }}
        title={speciesName}
        visible={shareVisible}
      />
    </>
  );
};

export const CatchCard = memo(CatchCardComponent, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.like_count === next.item.like_count &&
    prev.item.is_liked === next.item.is_liked &&
    prev.item.comment_count === next.item.comment_count &&
    prev.onToggleLike === next.onToggleLike &&
    prev.onOpenComments === next.onOpenComments &&
    prev.onOpenProfile === next.onOpenProfile
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    overflow: 'hidden',
    backgroundColor: SPORT.surfaceSoft,
    borderWidth: 1,
    borderColor: SPORT.border,
    borderRadius: 24,
  },
  header: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerButton: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  avatarRing: {
    borderColor: SPORT.border,
    borderRadius: 21,
    borderWidth: 1.5,
    padding: 1,
  },
  avatar: {
    backgroundColor: SPORT.surface,
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    color: SPORT.text,
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    color: SPORT.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  photoWrap: {
    aspectRatio: 4 / 3,
    position: 'relative',
    width: '100%',
  },
  photo: {
    height: '100%',
    width: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    backgroundColor: SPORT.surface,
  },
  placeholderIcon: {
    fontSize: 44,
  },
  placeholderText: {
    color: SPORT.textMuted,
    fontSize: 13,
    marginTop: 8,
  },
  noPhotoContainer: {
    backgroundColor: SPORT.surface,
  },
  photoOverlay: {
    bottom: 0,
    height: 110,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  photoOverlayContent: {
    bottom: 16,
    gap: 10,
    left: 16,
    position: 'absolute',
    right: 16,
  },
  releaseBadge: {
    alignItems: 'center',
    backgroundColor: T.greenGlass,
    borderWidth: 1,
    borderColor: T.green,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute',
    right: 12,
    top: 12,
  },
  releaseText: {
    color: T.green,
    fontSize: 11,
    fontWeight: '700',
  },
  noPhotoMeta: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  speciesTitle: {
    color: SPORT.text,
    fontSize: 20,
    fontWeight: '700',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dataBadge: {
    alignItems: 'center',
    backgroundColor: SPORT.accentSoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: SPORT.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  dataBadgeAccent: {
    backgroundColor: SPORT.orangeSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeTextAccent: {
    color: SPORT.orange,
    fontSize: 12,
    fontWeight: '600',
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  locationText: {
    color: SPORT.textMuted,
    fontSize: 13,
  },
  notesWrap: {
    backgroundColor: '#050608',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  notesText: {
    color: SPORT.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  footer: {
    borderTopColor: SPORT.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    height: 52,
  },
  footerAction: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  footerText: {
    color: SPORT.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
