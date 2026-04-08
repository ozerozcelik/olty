import {
  Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery,
  useQuery } from '@tanstack/react-query';
import { useEffect,
  useMemo,
  useState } from 'react';
import { useRouter,
  type Href,
  type RelativePathString } from 'expo-router';
import { FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { GlassView } from '@/components/GlassView';

import { DiscoveryCatchTile } from '@/components/DiscoveryCatchTile';
import { LeaderboardRow } from '@/components/LeaderboardRow';
import { UserRow } from '@/components/UserRow';
import { WeeklyChallengeCard } from '@/components/WeeklyChallengeCard';
import { DailyQuestionCard } from '@/components/daily/DailyQuestionCard';
import { FishIdCard } from '@/components/daily/FishIdCard';
import { useDebounce } from '@/hooks/useDebounce';
import { SPORT_THEME } from '@/lib/sport-theme';
import { getDiscoveryCatches } from '@/services/catches.service';
import { getLeaderboard } from '@/services/gamification.service';
import { searchProfiles } from '@/services/profiles.service';
import { isFollowing } from '@/services/social.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CatchFeedItem, LeaderboardScope, LeaderboardType, ProfileRow } from '@/types/app.types';

type ExploreTab = 'leaderboard' | 'discover' | 'games';
type LeaderboardTab = 'week' | 'month' | 'all';

const PAGE_SIZE = 20;
const POSTS_ROUTE = '/posts' as Href;

const getLeaderboardParams = (
  tab: LeaderboardTab,
): { type: LeaderboardType; metricLabel: string; periodDays?: number } => {
  switch (tab) {
    case 'month':
      return { type: 'weekly_catch_count', metricLabel: 'av', periodDays: 30 };
    case 'all':
      return { type: 'all_time_xp', metricLabel: 'XP' };
    default:
      return { type: 'weekly_catch_count', metricLabel: 'av', periodDays: 7 };
  }
};

const ExploreScreen = (): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ownProfile = useAuthStore((state) => state.profile);
  const [activeTab, setActiveTab] = useState<ExploreTab>('leaderboard');
  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>('week');
  const [scope, setScope] = useState<LeaderboardScope>('country');
  const [searchValue, setSearchValue] = useState<string>('');
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebounce(searchValue, 400);

  const leaderboardParams = getLeaderboardParams(leaderboardTab);
  const leaderboardQuery = useQuery({
    queryKey: ['explore-leaderboard', leaderboardTab, scope],
    queryFn: () =>
      getLeaderboard(leaderboardParams.type, scope, leaderboardParams.periodDays),
    enabled: activeTab === 'leaderboard',
  });
  const searchQuery = useQuery({
    queryKey: ['explore-search', debouncedSearch],
    queryFn: () => searchProfiles(debouncedSearch),
    enabled: activeTab === 'discover' && Boolean(debouncedSearch.trim()),
  });
  const discoveryQuery = useInfiniteQuery({
    queryKey: ['discovery-catches'],
    queryFn: ({ pageParam }) => getDiscoveryCatches(pageParam, PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.length === PAGE_SIZE ? lastPage[lastPage.length - 1]?.created_at : undefined,
    enabled: activeTab === 'discover' && !debouncedSearch.trim(),
  });
  const searchFollowingQuery = useQuery({
    queryKey: ['explore-search-following', searchQuery.data?.map((item) => item.id).join(',')],
    queryFn: async () => {
      const users = searchQuery.data ?? [];
      const states = await Promise.all(
        users.map(async (user) => ({ id: user.id, value: await isFollowing(user.id) })),
      );
      return Object.fromEntries(states.map((item) => [item.id, item.value]));
    },
    enabled: activeTab === 'discover' && Boolean(searchQuery.data?.length),
  });

  useEffect(() => {
    if (!searchQuery.data?.length || !searchFollowingQuery.data) {
      setFollowedUserIds(new Set());
      return;
    }

    const nextSet = new Set<string>();

    for (const user of searchQuery.data) {
      if (searchFollowingQuery.data[user.id]) {
        nextSet.add(user.id);
      }
    }

    setFollowedUserIds(nextSet);
  }, [searchFollowingQuery.data, searchQuery.data]);

  const leaderboardItems = leaderboardQuery.data ?? [];
  const discoveryItems = useMemo(() => discoveryQuery.data?.pages.flat() ?? [], [discoveryQuery.data?.pages]);
  const searchItems = searchQuery.data ?? [];

  const handleFollowToggle = (userId: string, nowFollowing: boolean): void => {
    setFollowedUserIds((current) => {
      const next = new Set(current);

      if (nowFollowing) {
        next.add(userId);
      } else {
        next.delete(userId);
      }

      return next;
    });
  };

  return (
    <View
      style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>EXPLORE</Text>
        <GlassView borderRadius={22} intensity={18} style={styles.iconButtonContent}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.iconButton}
            onPress={() => router.push('/search')}
          >
            <Ionicons color={SPORT_THEME.active} name="search-outline" size={20} />
          </TouchableOpacity>
        </GlassView>
      </View>

      <GlassView borderRadius={28} intensity={18} style={styles.glassCardContent}>
        <TouchableOpacity activeOpacity={0.8}
          style={styles.glassCardInner}
          onPress={() => router.push('../tournaments' as RelativePathString)}
        >
          <Text style={styles.cardTitle}>Turnuvalar</Text>
          <Text style={styles.cardSubtitle}>
            Aktif, yaklaşan ve biten etkinlikleri gör.
          </Text>
        </TouchableOpacity>
      </GlassView>

      <GlassView borderRadius={28} intensity={18} style={styles.glassCardContent}>
        <TouchableOpacity activeOpacity={0.8}
          style={styles.glassCardInner}
          onPress={() => router.push(POSTS_ROUTE)}
        >
          <Text style={styles.cardTitle}>Yazılar</Text>
          <Text style={styles.cardSubtitle}>
            Taktik yazıları, ekipman incelemeleri ve spot rehberleri.
          </Text>
        </TouchableOpacity>
      </GlassView>

      <View style={styles.segmentedControl}>
        <GlassView borderRadius={999} intensity={18} style={styles.glassSegmentContainer}>
          <TouchableOpacity activeOpacity={0.8}
            style={[styles.segmentButton, activeTab === 'leaderboard' ? styles.segmentButtonActive : null]}
            onPress={() => setActiveTab('leaderboard')}
          >
            <Text style={[styles.segmentText, activeTab === 'leaderboard' ? styles.segmentTextActive : null]}>
              Lider Tablosu
            </Text>
          </TouchableOpacity>
        </GlassView>
        <GlassView borderRadius={999} intensity={18} style={styles.glassSegmentContainer}>
          <TouchableOpacity activeOpacity={0.8}
            style={[styles.segmentButton, activeTab === 'discover' ? styles.segmentButtonActive : null]}
            onPress={() => setActiveTab('discover')}
          >
            <Text style={[styles.segmentText, activeTab === 'discover' ? styles.segmentTextActive : null]}>
              Keşfet
            </Text>
          </TouchableOpacity>
        </GlassView>
        <GlassView borderRadius={999} intensity={18} style={styles.glassSegmentContainer}>
          <TouchableOpacity activeOpacity={0.8}
            style={[styles.segmentButton, activeTab === 'games' ? styles.segmentButtonActive : null]}
            onPress={() => setActiveTab('games')}
          >
            <Text style={[styles.segmentText, activeTab === 'games' ? styles.segmentTextActive : null]}>
              Oyunlar
            </Text>
          </TouchableOpacity>
        </GlassView>
      </View>

      {activeTab === 'leaderboard' ? (
        <View style={styles.leaderboardContent}>
          <View style={styles.periodRow}>
            {[
              { key: 'week', label: 'Bu Hafta' },
              { key: 'month', label: 'Bu Ay' },
              { key: 'all', label: 'Tüm Zamanlar' },
            ].map((item) => (
              <GlassView key={item.key} borderRadius={999} intensity={18} style={styles.periodButtonContainer}>
                <TouchableOpacity activeOpacity={0.8}
                  style={[styles.periodButton, leaderboardTab === item.key ? styles.periodButtonActive : null]}
                  onPress={() => setLeaderboardTab(item.key as LeaderboardTab)}
                >
                  <Text style={[styles.periodButtonText, leaderboardTab === item.key ? styles.periodButtonTextActive : null]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </GlassView>
            ))}
          </View>

          <View style={styles.segmentedControl}>
            <GlassView borderRadius={999} intensity={18} style={styles.glassSegmentContainer}>
              <TouchableOpacity activeOpacity={0.8}
                style={[styles.segmentButton, scope === 'country' ? styles.segmentButtonActive : null]}
                onPress={() => setScope('country')}
              >
                <Text style={[styles.segmentText, scope === 'country' ? styles.segmentTextActive : null]}>
                  Türkiye
                </Text>
              </TouchableOpacity>
            </GlassView>
            <GlassView borderRadius={999} intensity={18} style={styles.glassSegmentContainer}>
              <TouchableOpacity activeOpacity={0.8}
                style={[styles.segmentButton, scope === 'city' ? styles.segmentButtonActive : null]}
                onPress={() => setScope('city')}
              >
                <Text style={[styles.segmentText, scope === 'city' ? styles.segmentTextActive : null]}>
                  {ownProfile?.city ?? 'Şehrim'}
                </Text>
              </TouchableOpacity>
            </GlassView>
          </View>

          <FlatList
            contentContainerStyle={
              leaderboardItems.length ? { gap: 12, paddingBottom: 32 } : { flexGrow: 1, justifyContent: 'center' }
            }
            data={leaderboardItems}
            keyExtractor={(item) => `${item.userId}-${item.rank}`}
            refreshControl={<RefreshControl onRefresh={() => void leaderboardQuery.refetch()} refreshing={leaderboardQuery.isRefetching} />}
            renderItem={({ item }) => (
              <LeaderboardRow
                isOwnRow={item.userId === ownProfile?.id}
                item={item}
                metricLabel={leaderboardParams.metricLabel}
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Henüz sıralama yok</Text>}
          />
        </View>
      ) : activeTab === 'games' ? (
        <ScrollView
          contentContainerStyle={styles.gamesContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gamesHeader}>
            <Text style={styles.gamesTitle}>Günlük Oyunlar</Text>
            <Text style={styles.gamesSubtitle}>
              Günün tahmini, balık kimdir ve haftalık meydan okuma burada.
            </Text>
          </View>
          <WeeklyChallengeCard />
          <DailyQuestionCard />
          <FishIdCard />
        </ScrollView>
      ) : (
        <View style={styles.discoverContent}>
          <GlassView borderRadius={16} intensity={18} style={styles.searchInputContainer}>
            <TextInput
              autoCapitalize="none"
              style={styles.searchInput}
              onChangeText={setSearchValue}
              placeholder="Kullanıcı ara"
              placeholderTextColor={SPORT_THEME.textMuted}
              value={searchValue}
            />
          </GlassView>

          {debouncedSearch.trim() ? (
            <FlatList
              contentContainerStyle={
                searchItems.length ? { gap: 12, paddingBottom: 32 } : { flexGrow: 1, justifyContent: 'center' }
              }
              data={searchItems}
              keyExtractor={(item) => item.id}
              refreshControl={<RefreshControl onRefresh={() => void searchQuery.refetch()} refreshing={searchQuery.isRefetching} />}
              renderItem={({ item }) => (
                <UserRow
                  isFollowing={followedUserIds.has(item.id)}
                  onFollowToggle={handleFollowToggle}
                  profile={item as ProfileRow}
                  showFollowButton={item.id !== ownProfile?.id}
                />
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>Sonuç bulunamadı</Text>}
            />
          ) : (
            <FlatList
              columnWrapperStyle={{ gap: 12 }}
              contentContainerStyle={
                discoveryItems.length ? { paddingBottom: 32 } : { flexGrow: 1, justifyContent: 'center' }
              }
              data={discoveryItems}
              keyExtractor={(item) => item.id}
              numColumns={2}
              onEndReached={() => {
                if (discoveryQuery.hasNextPage && !discoveryQuery.isFetchingNextPage) {
                  void discoveryQuery.fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.4}
              refreshControl={<RefreshControl onRefresh={() => void discoveryQuery.refetch()} refreshing={discoveryQuery.isRefetching} />}
              renderItem={({ item }) => <DiscoveryCatchTile item={item as CatchFeedItem} />}
              ListEmptyComponent={<Text style={styles.emptyText}>Keşfedilecek paylaşım yok</Text>}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPORT_THEME.bg,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: SPORT_THEME.active,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontStyle: 'italic',
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconButtonContent: {
    borderRadius: 22,
  },
  glassCard: {
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  glassCardContent: {
    marginBottom: 16,
  },
  glassCardInner: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  cardTitle: {
    color: SPORT_THEME.text,
    fontSize: 17,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: SPORT_THEME.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  segmentedControl: {
    borderRadius: 999,
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  segmentButton: {
    borderRadius: 999,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segmentButtonActive: {
    backgroundColor: SPORT_THEME.active,
  },
  glassSegmentContainer: {
    borderRadius: 999,
    flex: 1,
  },
  segmentText: {
    color: '#D6DCE8',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: '#050608',
    fontWeight: '600',
  },
  leaderboardContent: {
    flex: 1,
    gap: 16,
  },
  discoverContent: {
    flex: 1,
    gap: 16,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  periodButtonContainer: {
    borderRadius: 999,
    flex: 1,
  },
  periodButtonActive: {
    backgroundColor: SPORT_THEME.active,
    borderColor: SPORT_THEME.active,
  },
  periodButtonText: {
    color: '#D6DCE8',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  periodButtonTextActive: {
    color: '#050608',
  },
  searchInput: {
    borderRadius: 16,
    color: SPORT_THEME.text,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchInputContainer: {
    borderRadius: 16,
  },
  emptyText: {
    color: SPORT_THEME.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  gamesContent: {
    gap: 16,
    paddingBottom: 32,
  },
  gamesHeader: {
    marginBottom: 4,
  },
  gamesTitle: {
    color: SPORT_THEME.text,
    fontSize: 20,
    fontWeight: '700',
  },
  gamesSubtitle: {
    color: SPORT_THEME.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});

export default ExploreScreen;
