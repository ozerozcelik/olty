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
import { getLevelFromXP, getXPProgress } from '@/lib/constants';
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
          style={{ width: '100%', height: 172 }}
        />
      ) : (
        <View style={styles.catchTilePlaceholder}>
          <Text style={styles.catchTilePlaceholderIcon}>{'\uD83C\uDFA3'}</Text>
          <Text style={styles.catchTilePlaceholderText}>Foto yok</Text>
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(5,6,8,0.95)']}
        style={styles.catchTileGradient}
      >
        <Text style={styles.catchTileTitle} numberOfLines={1}>
          {item.species_name ?? 'Av kaydı'}
        </Text>
      </LinearGradient>
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
  const levelInfo = getLevelFromXP(profile.total_xp);
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
      columnWrapperStyle={{ gap: 10 }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: 48,
        paddingTop: Math.max(insets.top, 12),
      }}
      data={profile.catches}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          {/* ═══ HERO SECTION ═══ */}
          <View style={styles.heroCard}>
            {/* Settings / Back */}
            {isOwnProfile ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/settings')}
                style={styles.settingsButton}
              >
                <Ionicons color={T.textPrimary} name="settings-outline" size={20} />
              </TouchableOpacity>
            ) : null}

            {/* Avatar with brand ring */}
            <View style={styles.avatarRing}>
              <Image
                cachePolicy="memory-disk"
                contentFit="cover"
                source={profile.avatar_url ? { uri: profile.avatar_url } : undefined}
                style={styles.avatar}
              />
            </View>

            {/* Username + Level Badge */}
            <View style={styles.nameRow}>
              <Text style={styles.username}>@{profile.username}</Text>
              <View style={[styles.levelBadge, { backgroundColor: levelInfo.color }]}>
                <Text style={styles.levelBadgeText}>Lv {profile.level}</Text>
              </View>
            </View>

            {profile.display_name ? (
              <Text style={styles.displayName}>{profile.display_name}</Text>
            ) : null}

            {canShowCity && profile.city ? (
              <View style={styles.locationRow}>
                <Ionicons color={T.textTertiary} name="location-outline" size={13} />
                <Text style={styles.locationText}>{profile.city}</Text>
              </View>
            ) : null}

            {/* Fishing Type Pills */}
            {canShowFishingTypes && profile.fishing_type.length ? (
              <View style={styles.fishingTypesWrapper}>
                {profile.fishing_type.slice(0, 3).map((item) => (
                  <View key={item} style={styles.fishingTypePill}>
                    <Text style={styles.fishingTypeText}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              {isOwnProfile ? (
                <>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push('/settings')}
                    style={styles.primaryButton}
                  >
                    <Ionicons color={T.bg} name="create-outline" size={16} />
                    <Text style={styles.primaryButtonText}>Profili Düzenle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onOpenMessages}
                    style={styles.secondaryButton}
                  >
                    <Ionicons color={T.textPrimary} name="chatbubble-outline" size={16} />
                    <Text style={styles.secondaryButtonText}>Mesajlar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isFollowLoading}
                    onPress={onToggleFollow}
                    style={isFollowing ? styles.secondaryButton : styles.primaryButton}
                  >
                    <Ionicons
                      color={isFollowing ? T.textPrimary : T.bg}
                      name={isFollowing ? 'checkmark-outline' : 'person-add-outline'}
                      size={16}
                    />
                    <Text style={isFollowing ? styles.secondaryButtonText : styles.primaryButtonText}>
                      {isFollowing ? 'Takipte' : 'Takip Et'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isMessageLoading}
                    onPress={onMessagePress}
                    style={styles.secondaryButton}
                  >
                    <Ionicons color={T.textPrimary} name="chatbubble-outline" size={16} />
                    <Text style={styles.secondaryButtonText}>Mesaj</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* ═══ STATS ROW ═══ */}
          <View style={styles.statsRow}>
            <TouchableOpacity activeOpacity={0.8} style={styles.statCard}>
              <Text style={styles.statValue}>{profile.catch_count}</Text>
              <Text style={styles.statLabel}>Av</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push(`/profile/followers/${profile.id}`)}
              style={styles.statCard}
            >
              <Text style={styles.statValue}>{profile.follower_count}</Text>
              <Text style={styles.statLabel}>Takipci</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push(`/profile/following/${profile.id}`)}
              style={styles.statCard}
            >
              <Text style={styles.statValue}>{profile.following_count}</Text>
              <Text style={styles.statLabel}>Takip</Text>
            </TouchableOpacity>
          </View>

          {/* ═══ XP + BADGES ROW ═══ */}
          <View style={styles.dualPanelRow}>
            <View style={styles.xpCard}>
              <View style={styles.xpHeader}>
                <View style={styles.xpLevelRow}>
                  <Text style={styles.xpLevelEmoji}>{levelInfo.badge}</Text>
                  <Text style={styles.xpTitle}>{levelInfo.name}</Text>
                </View>
                <Text style={styles.xpPercent}>{progress.percent}%</Text>
              </View>
              <View style={styles.xpTrack}>
                <LinearGradient
                  colors={[T.teal, T.coral]}
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
                <Text style={styles.badgeCount}>{profile.badges.length}</Text>
              </View>
              <View style={styles.badgesWrapper}>
                {profile.badges.length > 0 ? (
                  profile.badges.slice(0, 4).map((item) => (
                    <View key={`${item.badge_id}-${item.earned_at}`} style={styles.earnedBadgePill}>
                      <Text style={styles.earnedBadgeText}>
                        {item.badge_definitions?.name_tr ?? 'Rozet'}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyBadgeText}>Henuz rozet yok</Text>
                )}
              </View>
            </View>
          </View>

          {/* ═══ BIO ═══ */}
          {canShowBio && profile.bio?.trim() ? (
            <View style={styles.bioCard}>
              <Text style={styles.cardLabel}>Biyografi</Text>
              <HashtagText style={styles.bioText} text={profile.bio} />
            </View>
          ) : isOwnProfile ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.bioCardEmpty}
              onPress={() => router.push('/settings')}
            >
              <View style={styles.emptyCardIcon}>
                <Ionicons color={T.teal} name="pencil-outline" size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>Biyografi</Text>
                <Text style={styles.cardDescription}>
                  Profiline bir bio ekle — ne tuttugun, nasil avlandigin.
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* ═══ SOCIAL + FISHDEX ═══ */}
          {(canShowSocialLinks && socialLinks.length > 0) || canShowFishdex ? (
            <View style={styles.featureGrid}>
              {canShowSocialLinks && socialLinks.length ? (
                <View style={styles.featureCard}>
                  <Text style={styles.cardLabel}>Sosyal Profiller</Text>
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
                  style={styles.fishdexCard}
                  onPress={() => router.push(`/profile/fishdex/${profile.id}`)}
                >
                  <View style={styles.fishdexIconWrap}>
                    <Text style={styles.fishdexIcon}>{'\uD83D\uDCDA'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fishdexTitle}>Fishdex</Text>
                    <Text style={styles.fishdexDescription}>
                      Turlerini koleksiyon gorunumunde takip et.
                    </Text>
                  </View>
                  <Ionicons color={T.textTertiary} name="chevron-forward" size={18} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* ═══ GEAR ═══ */}
          {canShowGear && profile.gearCount ? (
            <View style={styles.gearCard}>
              <View style={styles.gearHeaderRow}>
                <View style={styles.gearHeaderLeft}>
                  <Text style={styles.cardLabel}>Ekipmanlar</Text>
                  <Text style={styles.gearTitle}>{profile.gearCount} ekipman</Text>
                </View>
                {isOwnProfile ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.gearManageButton}
                    onPress={() => router.push('/gear')}
                  >
                    <Text style={styles.gearManageButtonText}>Yonet</Text>
                    <Ionicons color={T.teal} name="chevron-forward" size={14} />
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
              <View style={styles.emptyCardIcon}>
                <Ionicons color={T.teal} name="construct-outline" size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>Ekipmanlar</Text>
                <Text style={styles.cardDescription}>
                  Kamis, makine, misina ve diger setlerini ekle.
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* ═══ STATS DETAIL + HIGHLIGHTS ═══ */}
          {statsUserId ? <ProfileStats userId={statsUserId} /> : null}
          <CatchHighlights isOwnProfile={isOwnProfile} userId={profile.id} />

          {/* ═══ POSTS ═══ */}
          {postsQuery.data?.length ? (
            <View style={styles.postsSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Yazilari</Text>
                <Text style={styles.sectionCount}>{postsQuery.data.length}</Text>
              </View>
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

          {/* ═══ LOCATIONS ═══ */}
          {isOwnProfile ? (
            <View style={styles.locationsCard}>
              <View style={styles.locationsHeader}>
                <View>
                  <Text style={styles.cardLabel}>Yer Imlerim</Text>
                  <Text style={styles.locationsTitle}>
                    {locationsQuery.data?.length ?? 0} kayit
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/locations' as Href)}
                  style={styles.locationsLinkButton}
                >
                  <Text style={styles.locationsLinkText}>Tumunu Gor</Text>
                  <Ionicons color={T.teal} name="chevron-forward" size={14} />
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
                          {item.is_public ? 'Herkese Acik' : 'Sadece Ben'}
                        </Text>
                      </View>
                      <Ionicons color={T.textTertiary} name="chevron-forward" size={16} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.emptyLocationCard}
                  onPress={() => router.push('/locations/new' as Href)}
                >
                  <Ionicons color={T.teal} name="add-circle-outline" size={22} />
                  <Text style={styles.cardDescription}>
                    Balik noktalarini kaydet.
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {/* ═══ CATCH HISTORY TITLE ═══ */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Av gecmisi</Text>
            <Text style={styles.sectionCount}>{profile.catches.length}</Text>
          </View>
        </View>
      }
      ListFooterComponent={
        isOwnProfile && onSignOut ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.signOutButton}
            onPress={onSignOut}
          >
            <Ionicons color={T.red} name="log-out-outline" size={18} />
            <Text style={styles.signOutText}>Cikis Yap</Text>
          </TouchableOpacity>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{'\uD83C\uDFA3'}</Text>
          <Text style={styles.emptyText}>Henuz av kaydi yok.</Text>
        </View>
      }
      numColumns={2}
      renderItem={({ item }) => renderCatchTile(router, item)}
    />
  );
};

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    gap: 12,
    paddingBottom: 16,
  },

  // ═══ HERO CARD ═══
  heroCard: {
    alignItems: 'center',
    backgroundColor: T.bgCard,
    borderColor: T.glassBorder,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
    position: 'relative',
  },
  settingsButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: T.glassBorder,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    top: 14,
    width: 44,
  },
  avatarRing: {
    alignItems: 'center',
    borderColor: T.teal,
    borderRadius: 48,
    borderWidth: 2.5,
    height: 96,
    justifyContent: 'center',
    padding: 3,
    width: 96,
  },
  avatar: {
    backgroundColor: T.bgCard,
    borderRadius: 44,
    height: 84,
    width: 84,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  username: {
    color: T.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  levelBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  displayName: {
    color: T.textSecondary,
    fontSize: 14,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  locationText: {
    color: T.textTertiary,
    fontSize: 12,
  },
  fishingTypesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  fishingTypePill: {
    backgroundColor: 'rgba(212,255,0,0.08)',
    borderColor: 'rgba(212,255,0,0.30)',
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
    marginTop: 8,
    width: '100%',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: T.teal,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: T.bg,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: T.glassBorder,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: T.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  // ═══ STATS ROW ═══
  statsRow: {
    alignItems: 'center',
    backgroundColor: T.bgCard,
    borderColor: T.glassBorder,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    paddingVertical: 16,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  statDivider: {
    backgroundColor: T.glassBorder,
    height: 28,
    width: 1,
  },
  statValue: {
    color: T.teal,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: T.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: 'uppercase',
  },

  // ═══ XP + BADGES ═══
  dualPanelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  xpCard: {
    backgroundColor: T.bgCard,
    borderColor: T.glassBorder,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    padding: 14,
  },
  xpHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpLevelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  xpLevelEmoji: {
    fontSize: 18,
  },
  xpTitle: {
    color: T.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  xpPercent: {
    color: T.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  xpTrack: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    height: 10,
    overflow: 'hidden',
  },
  xpFill: {
    borderRadius: 999,
    height: '100%',
  },
  xpSummary: {
    color: T.textTertiary,
    fontSize: 12,
  },
  badgesCard: {
    backgroundColor: T.bgCard,
    borderColor: T.glassBorder,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    padding: 14,
  },
  badgesHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgesTitle: {
    color: T.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  badgeCount: {
    backgroundColor: 'rgba(212,255,0,0.12)',
    borderRadius: 10,
    color: T.teal,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  earnedBadgePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,255,0,0.08)',
    borderColor: 'rgba(212,255,0,0.25)',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  earnedBadgeText: {
    color: T.teal,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyBadgeText: {
    color: T.textTertiary,
    fontSize: 12,
  },

  // ═══ BIO ═══
  bioCard: {
    backgroundColor: T.bgCard,
    borderColor: T.glassBorder,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
  },
  bioCardEmpty: {
    alignItems: 'center',
    backgroundColor: T.bgCard,
    borderColor: T.glassBorder,
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
  },
  emptyCardIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,255,0,0.10)',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardLabel: {
    color: T.textTertiary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardDescription: {
    color: T.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  bioText: {
    color: T.textSecondary,
    fontSize: 14,
    lineHeight: 24,
    marginTop: 8,
  },

  // ═══ SOCIAL + FISHDEX ═══
  featureGrid: {
    gap: 10,
    width: '100%',
  },
  featureCard: {
    backgroundColor: T.bgCard,
    borderColor: T.glassBorder,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  socialLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  socialLinkPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,255,0,0.08)',
    borderColor: 'rgba(212,255,0,0.25)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  socialLinkText: {
    color: T.teal,
    fontSize: 13,
    fontWeight: '600',
  },
  fishdexCard: {
    alignItems: 'center',
    backgroundColor: T.bgCard,
    borderColor: T.glassBorder,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fishdexIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,255,0,0.10)',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  fishdexIcon: {
    fontSize: 22,
  },
  fishdexTitle: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  fishdexDescription: {
    color: T.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  // ═══ GEAR ═══
  gearCard: {
    backgroundColor: T.bgCard,
    borderColor: T.glassBorder,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
  },
  gearHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gearHeaderLeft: {
    gap: 4,
  },
  gearTitle: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  gearManageButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,255,0,0.08)',
    borderColor: 'rgba(212,255,0,0.25)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  gearManageButtonText: {
    color: T.teal,
    fontSize: 13,
    fontWeight: '600',
  },
  gearSectionsWrapper: {
    gap: 12,
    marginTop: 14,
  },
  gearSectionItem: {
    gap: 10,
  },
  gearSectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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

  // ═══ POSTS ═══
  postsSection: {
    gap: 12,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionCount: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    color: T.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  // ═══ LOCATIONS ═══
  locationsCard: {
    backgroundColor: T.bgCard,
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
    alignItems: 'center',
    backgroundColor: 'rgba(212,255,0,0.08)',
    borderColor: 'rgba(212,255,0,0.25)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locationsLinkText: {
    color: T.teal,
    fontSize: 13,
    fontWeight: '700',
  },
  locationsListWrapper: {
    gap: 8,
    marginTop: 14,
  },
  locationPreviewRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: T.glassBorder,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  locationPreviewBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(212,255,0,0.10)',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
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
  emptyLocationCard: {
    alignItems: 'center',
    borderColor: T.glassBorder,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  // ═══ CATCH TILES ═══
  catchTile: {
    backgroundColor: T.bgCard,
    borderColor: T.glassBorder,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  catchTilePlaceholder: {
    alignItems: 'center',
    backgroundColor: T.bgCard,
    gap: 6,
    height: 172,
    justifyContent: 'center',
  },
  catchTilePlaceholderIcon: {
    fontSize: 28,
    opacity: 0.4,
  },
  catchTilePlaceholderText: {
    color: T.textTertiary,
    fontSize: 12,
  },
  catchTileGradient: {
    bottom: 0,
    justifyContent: 'flex-end',
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'absolute',
    right: 0,
  },
  catchTileTitle: {
    color: T.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },

  // ═══ FOOTER ═══
  signOutButton: {
    alignItems: 'center',
    borderColor: 'rgba(248,113,113,0.20)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  signOutText: {
    color: T.red,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 36,
    opacity: 0.5,
  },
  emptyText: {
    color: T.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
