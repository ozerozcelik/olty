import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  type Href,
  useRouter } from 'expo-router';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { useCallback } from 'react';

import { CatchHighlights } from '@/components/CatchHighlights';
import { GearItemCard } from '@/components/GearItemCard';
import { HashtagText } from '@/components/HashtagText';
import { PostCard } from '@/components/PostCard';
import { getXPProgress } from '@/lib/constants';
import { ProfileStats } from '@/components/ProfileStats';
import { T } from '@/lib/theme';
import { getUserFishingLocations } from '@/services/fishingLocations.service';
import { getPostsByUser, likePost, unlikePost } from '@/services/posts.service';
import type { ProfileDetails, ProfileCatchItem } from '@/services/profiles.service';
import { getProfileSocialLinks } from '@/utils/socialLinks';
import type { PostCardItem } from '@/types/app.types';

interface ProfileViewProps {
  profile: ProfileDetails;
  statsUserId?: string;
  isOwnProfile: boolean;
  isFollowing?: boolean;
  isFollowLoading?: boolean;
  isMessageLoading?: boolean;
  onMessagePress?: () => void;
  onOpenMessages?: () => void;
  onToggleFollow?: () => void;
  onSignOut?: () => void;
}

const renderCatchTile = (
  router: ReturnType<typeof useRouter>,
  item: ProfileCatchItem,
): JSX.Element => {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`/catch/${item.id}`)} style={styles.catchTile}>
      {item.photo_url ? (
        <Image
          cachePolicy="memory-disk"
          contentFit="cover"
          source={{ uri: item.photo_url }}
          style={{ width: '100%', height: 160 }}
        />
      ) : (
        <View style={styles.catchTilePlaceholder}>
          <Text style={styles.catchTilePlaceholderText}>Foto yok</Text>
        </View>
      )}
      <View pointerEvents="none" style={styles.catchTileOverlay}>
        <Text style={styles.catchTileTitle}>
          {item.species_name ?? 'Av kaydı'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const ProfileView = ({
  profile,
  statsUserId,
  isOwnProfile,
  isFollowing = false,
  isFollowLoading = false,
  isMessageLoading = false,
  onMessagePress,
  onOpenMessages,
  onToggleFollow,
  onSignOut,
}: ProfileViewProps): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const progress = getXPProgress(profile.total_xp);
  const socialLinks = getProfileSocialLinks(profile);
  const postsQuery = useQuery({
    queryKey: ['profile-posts', profile.id],
    queryFn: () => getPostsByUser(profile.id),
    enabled: Boolean(profile.id),
  });
  const locationsQuery = useQuery({
    queryKey: ['user-fishing-locations', profile.id],
    queryFn: () => getUserFishingLocations(profile.id),
    enabled: isOwnProfile && Boolean(profile.id),
  });
  const postLikeMutation = useMutation({ mutationFn: likePost });
  const postUnlikeMutation = useMutation({ mutationFn: unlikePost });

  const updatePostCache = useCallback((target: PostCardItem): void => {
    queryClient.setQueryData(['profile-posts', profile.id], (current: PostCardItem[] | undefined) => {
      if (!current) {
        return current;
      }
      return current.map((item) =>
        item.id === target.id
          ? {
              ...item,
              is_liked: !item.is_liked,
              like_count: item.like_count + (item.is_liked ? -1 : 1),
            }
          : item,
      );
    });
  }, [queryClient, profile.id]);

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

  const canShowCity = isOwnProfile || profile.show_city_public;
  const canShowBio = isOwnProfile || profile.show_bio_public;
  const canShowFishingTypes = isOwnProfile || profile.show_fishing_types_public;
  const canShowSocialLinks = isOwnProfile || profile.show_social_links_public;
  const canShowGear = isOwnProfile || profile.show_gear_public;
  const canShowFishdex = isOwnProfile || profile.show_fishdex_public;

  return (
    <FlatList
      style={styles.flatList}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: 40,
        paddingTop: Math.max(insets.top, 12),
      }}
      data={profile.catches}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.profileCard}>
            {isOwnProfile ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/settings')}
                style={styles.settingsButton}
              >
                <Ionicons color={T.textPrimary} name="settings-outline" size={18} />
              </TouchableOpacity>
            ) : null}
            <Image
              cachePolicy="memory-disk"
              contentFit="cover"
              source={profile.avatar_url ? { uri: profile.avatar_url } : undefined}
              style={styles.avatar}
            />
            <View style={styles.profileMetaRow}>
              <View style={styles.usernameSection}>
                <Text style={styles.username}>@{profile.username}</Text>
                {profile.display_name ? <Text style={styles.displayName}>{profile.display_name}</Text> : null}
                {canShowCity && profile.city ? (
                  <Text style={styles.metaText}>{profile.city}</Text>
                ) : null}
              </View>

              {canShowFishingTypes && profile.fishing_type.length ? (
                <View style={styles.fishingTypesWrapper}>
                  {profile.fishing_type.slice(0, 3).map((item) => (
                    <View key={item} style={styles.fishingTypePill}>
                      <Text style={styles.fishingTypeText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.actionRow}>
              {isOwnProfile ? (
                <>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push('/settings')}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonText}>Profili Düzenle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onOpenMessages}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>Mesajlar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isFollowLoading}
                    onPress={onToggleFollow}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonText}>{isFollowing ? 'Takipten Çık' : 'Takip Et'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isMessageLoading}
                    onPress={onMessagePress}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>Mesaj Gönder</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            {canShowBio && profile.bio?.trim() ? (
              <View style={styles.bioCard}>
                <Text style={styles.cardLabel}>
                  Biyografi
                </Text>
                <HashtagText style={styles.bioText} text={profile.bio} />
              </View>
            ) : isOwnProfile ? (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.bioCardEmpty}
                onPress={() => router.push('/settings')}
              >
                <Text style={styles.cardLabel}>
                  Biyografi
                </Text>
                <Text style={styles.cardDescription}>
                  Profiline kısacık bir bio ekle. Ne tuttuğunu, nasıl avlandığını veya seni anlatan bir şey yaz.
                </Text>
              </TouchableOpacity>
            ) : null}
            {(canShowSocialLinks && socialLinks.length > 0) || canShowFishdex ? (
              <View style={styles.featureGrid}>
                {canShowSocialLinks && socialLinks.length ? (
                  <View style={[styles.bioCard, styles.featureCard]}>
                    <Text style={styles.cardLabel}>
                      Sosyal Profiller
                    </Text>
                    <View style={styles.socialLinksRow}>
                      {socialLinks.slice(0, 2).map((item) => (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={styles.socialLinkPill}
                          key={item.key}
                          onPress={() => {
                            void Linking.openURL(item.url);
                          }}
                        >
                          <Ionicons color={T.teal} name="open-outline" size={16} />
                          <Text style={styles.socialLinkText}>{item.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : null}

                {canShowFishdex ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.bioCard, styles.featureCard]}
                    onPress={() => router.push(`/profile/fishdex/${profile.id}`)}
                  >
                    <Text style={styles.cardLabelSubtle}>
                      Koleksiyon
                    </Text>
                    <Text style={styles.fishdexTitle}>Fishdex</Text>
                    <Text style={styles.fishdexDescription}>
                      Türlerini koleksiyon görünümünde takip et.
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
            {canShowGear && profile.gearCount ? (
              <View style={styles.gearCard}>
                <View style={styles.gearHeaderRow}>
                  <View>
                    <Text style={styles.cardLabel}>
                      Ekipmanlar
                    </Text>
                    <Text style={styles.gearTitle}>
                      {profile.gearCount} ekipman
                    </Text>
                  </View>
                  {isOwnProfile ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.gearManageButton}
                      onPress={() => router.push('/gear')}
                    >
                      <Text style={styles.gearManageButtonText}>Yönet</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={styles.gearSectionsWrapper}>
                  {profile.gearSections
                    .filter((section) => section.items.length)
                    .slice(0, 2)
                    .map((section) => (
                      <View style={styles.gearSectionItem} key={section.slug}>
                        <View style={styles.gearSectionHeaderRow}>
                          <Text style={styles.gearSectionTitle}>
                            {section.icon} {section.name_tr}
                          </Text>
                          <Text style={styles.gearSectionCount}>{section.items.length}</Text>
                        </View>
                        <FlatList
                          data={section.items.slice(0, 4)}
                          horizontal
                          keyExtractor={(item) => item.id}
                          renderItem={({ item }) => (
                            <GearItemCard
                              item={item}
                              onPress={(value) => router.push(`/gear/${value.id}`)}
                            />
                          )}
                          showsHorizontalScrollIndicator={false}
                        />
                      </View>
                    ))}
                </View>
              </View>
            ) : isOwnProfile ? (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.bioCardEmpty}
                onPress={() => router.push('/gear/new')}
              >
                <Text style={styles.cardLabel}>
                  Ekipmanlar
                </Text>
                <Text style={styles.cardDescription}>
                  Kullandığın kamış, makine, misina ve diğer setlerini profiline ekle.
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.quickStatsGrid}>
            <TouchableOpacity activeOpacity={0.8} style={styles.followStatCard}>
              <Text style={styles.followStatLabel}>Av sayısı</Text>
              <Text style={styles.followStatValue}>{profile.catch_count}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8}
              onPress={() => router.push(`/profile/followers/${profile.id}`)}
              style={styles.followStatCard}
            >
              <Text style={styles.followStatLabel}>Takipçi</Text>
              <Text style={styles.followStatValue}>{profile.follower_count}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8}
              onPress={() => router.push(`/profile/following/${profile.id}`)}
              style={styles.followStatCard}
            >
              <Text style={styles.followStatLabel}>Takip</Text>
              <Text style={styles.followStatValue}>{profile.following_count}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dualPanelRow}>
            <View style={styles.xpCard}>
              <View style={styles.xpHeader}>
                <Text style={styles.xpTitle}>Seviye {profile.level}</Text>
                <Text style={styles.xpPercent}>%{progress.percent}</Text>
              </View>
              <View style={styles.xpTrack}>
                <LinearGradient
                  colors={['#00D084', '#3B82F6']}
                  end={{ x: 1, y: 0.5 }}
                  start={{ x: 0, y: 0.5 }}
                  style={[styles.xpFill, { width: `${Math.max(progress.percent, 8)}%` }]}
                />
              </View>
              <Text style={styles.xpSummary}>
                {progress.current} / {progress.next} XP
              </Text>
            </View>

            <View style={styles.badgesCard}>
              <View style={styles.badgesHeader}>
                <Text style={styles.badgesTitle}>Rozetler</Text>
                <TouchableOpacity activeOpacity={0.8}>
                  <Text style={styles.badgesActionText}>Tümü</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.badgesWrapper}>
                {profile.badges.slice(0, 4).map((item) => (
                  <View key={`${item.badge_id}-${item.earned_at}`} style={styles.earnedBadgePill}>
                    <Text style={styles.earnedBadgeText}>
                      {item.badge_definitions?.name_tr ?? 'Rozet'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {statsUserId ? <ProfileStats userId={statsUserId} /> : null}
          <CatchHighlights isOwnProfile={isOwnProfile} userId={profile.id} />

          {postsQuery.data?.length ? (
            <View style={styles.postsSection}>
              <Text style={styles.postsTitle}>Yazıları</Text>
              <View>
                {postsQuery.data.map((post) => (
                  <PostCard
                    isLiked={post.is_liked}
                    item={post}
                    key={post.id}
                    onComment={handlePostComment}
                    onLike={handleTogglePostLike}
                    onPress={(value) => router.push(`/posts/${value.id}` as Href)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {isOwnProfile ? (
            <View style={styles.locationsCard}>
              <View style={styles.locationsHeader}>
                <View>
                  <Text style={styles.cardLabel}>
                    Yer İmlerim
                  </Text>
                  <Text style={styles.locationsTitle}>
                    {locationsQuery.data?.length ?? 0} kayıt
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/locations' as Href)}
                  style={styles.locationsLinkButton}
                >
                  <Text style={styles.locationsLinkText}>Tümünü Gör</Text>
                </TouchableOpacity>
              </View>
              {locationsQuery.data?.length ? (
                <View style={styles.locationsListWrapper}>
                  {locationsQuery.data.slice(0, 3).map((item) => (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      key={item.id}
                      onPress={() => router.push('/locations' as Href)}
                      style={styles.locationPreviewRow}
                    >
                      <View style={styles.locationPreviewBadge}>
                        <Ionicons color={T.teal} name="bookmark" size={14} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.locationPreviewName}>{item.name}</Text>
                        <Text style={styles.locationPreviewMeta}>
                          {item.is_public ? 'Herkese Açık' : 'Sadece Ben'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.emptyLocationCard}
                  onPress={() => router.push('/locations/new' as Href)}
                >
                  <Text style={styles.cardDescription}>
                    Balık noktalarını, marinaları veya özel notlarını isim vererek kaydet.
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Av geçmişi</Text>
        </View>
      }
      ListFooterComponent={
        isOwnProfile && onSignOut ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.signOutButton}
            onPress={onSignOut}
          >
            <Text style={styles.signOutText}>Çıkış Yap</Text>
          </TouchableOpacity>
        ) : null
      }
      ListEmptyComponent={<Text style={styles.emptyText}>Henüz av kaydı yok.</Text>}
      numColumns={2}
      renderItem={({ item }) => renderCatchTile(router, item)}
    />
  );
};

const styles = StyleSheet.create({
  catchTile: {
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  catchTilePlaceholder: {
    alignItems: 'center',
    backgroundColor: T.bgCard,
    height: 152,
    justifyContent: 'center',
  },
  catchTilePlaceholderText: {
    color: T.textSecondary,
    fontSize: 13,
  },
  catchTileOverlay: {
    backgroundColor: 'rgba(5,6,8,0.90)',
    bottom: 0,
    left: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: 'absolute',
    right: 0,
  },
  catchTileTitle: {
    color: T.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 18,
    position: 'relative',
  },
  profileMetaRow: {
    width: '100%',
    gap: 12,
  },
  settingsButton: {
    alignItems: 'center',
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    top: 16,
    width: 40,
  },
  avatar: {
    backgroundColor: T.bgCard,
    borderColor: 'rgba(77,184,204,0.40)',
    borderRadius: 36,
    borderWidth: 2,
    height: 72,
    width: 72,
  },
  username: {
    color: T.textPrimary,
    fontSize: 19,
    fontWeight: '600',
  },
  displayName: {
    color: T.textSecondary,
    fontSize: 13,
  },
  metaText: {
    color: T.textTertiary,
    fontSize: 12,
  },
  fishingTypePill: {
    backgroundColor: T.tealGlow,
    borderColor: T.teal,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fishingTypeText: {
    color: T.teal,
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: T.tealGlow,
    borderColor: T.teal,
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: T.teal,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: T.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  followStatCard: {
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  dualPanelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  followStatValue: {
    color: T.teal,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  followStatLabel: {
    color: T.textTertiary,
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  xpCard: {
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 14,
    flex: 1,
  },
  xpHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpTitle: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  xpPercent: {
    color: T.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  xpTrack: {
    backgroundColor: T.bgDeep,
    borderRadius: 999,
    height: 12,
    overflow: 'hidden',
  },
  xpFill: {
    borderRadius: 999,
    height: '100%',
  },
  xpSummary: {
    color: T.textTertiary,
    fontSize: 14,
  },
  badgesCard: {
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 14,
    flex: 1,
  },
  badgesHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgesTitle: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  badgesActionText: {
    color: T.teal,
    fontSize: 13,
    fontWeight: '600',
  },
  earnedBadgePill: {
    alignItems: 'center',
    backgroundColor: T.tealGlow,
    borderColor: T.teal,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: '48%',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  earnedBadgeText: {
    color: T.teal,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  gearCard: {
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
  },
  gearTitle: {
    color: T.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  gearManageButton: {
    alignItems: 'center',
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  gearManageButtonText: {
    color: T.teal,
    fontSize: 13,
    fontWeight: '600',
  },
  gearSectionTitle: {
    color: T.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  gearSectionCount: {
    color: T.textSecondary,
    fontSize: 12,
  },
  postsSection: {
    gap: 12,
  },
  postsTitle: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  locationsCard: {
    backgroundColor: T.glass,
    borderColor: T.glassBorder,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  locationsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationsTitle: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
  },
  locationsLinkButton: {
    backgroundColor: T.tealGlow,
    borderColor: T.teal,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locationsLinkText: {
    color: T.teal,
    fontSize: 13,
    fontWeight: '700',
  },
  locationPreviewRow: {
    alignItems: 'center',
    backgroundColor: T.bgDeep,
    borderColor: T.glassBorder,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  locationPreviewBadge: {
    alignItems: 'center',
    backgroundColor: T.tealGlow,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  locationPreviewName: {
    color: T.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  locationPreviewMeta: {
    color: T.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  flatList: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    gap: 16,
    paddingBottom: 20,
  },
  usernameSection: {
    alignItems: 'center',
    gap: 4,
  },
  fishingTypesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bioCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.glassBorder,
    backgroundColor: T.bgDeep,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  bioCardEmpty: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: T.glassBorder,
    backgroundColor: T.bgDeep,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: T.textTertiary,
  },
  cardLabelSubtle: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: T.textSecondary,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: T.textSecondary,
    marginTop: 8,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 24,
    color: T.textSecondary,
    marginTop: 8,
  },
  socialLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  featureGrid: {
    width: '100%',
    flexDirection: 'column',
    gap: 10,
  },
  featureCard: {
    flex: 1,
    minHeight: 0,
  },
  socialLinkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.glassBorder,
    backgroundColor: T.glass,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  socialLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.teal,
  },
  fishdexTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: T.textPrimary,
    marginTop: 8,
  },
  fishdexDescription: {
    fontSize: 12,
    lineHeight: 20,
    color: T.textSecondary,
    marginTop: 4,
  },
  gearHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gearSectionsWrapper: {
    marginTop: 12,
    gap: 12,
  },
  gearSectionItem: {
    gap: 12,
  },
  gearSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  locationsListWrapper: {
    marginTop: 16,
    gap: 12,
  },
  emptyLocationCard: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: T.glassBorder,
    backgroundColor: T.bgDeep,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: T.textPrimary,
  },
  signOutButton: {
    marginTop: 16,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.redGlass,
    backgroundColor: T.redGlass,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: T.red,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    color: T.textSecondary,
  },
});
