import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GlassView } from '@/components/GlassView';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { getNearbyCatches, getTrendingSpecies, getDailyStats } from '@/services/discovery.service';

// Premium Design System Colors
const COLORS = {
  main: '#0B1F2A',
  surface: '#0F2A36',
  surfaceAlt: '#153340',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.12)',
  textPrimary: '#EAF4F4',
  textSecondary: '#9DB5B5',
  textMuted: 'rgba(234,244,244,0.55)',
  water: '#2EC4B6',
  waterMuted: 'rgba(46,196,182,0.15)',
  cta: '#FF7A00',
  ctaMuted: 'rgba(255,122,0,0.15)',
  gold: '#FBBF24',
  goldMuted: 'rgba(251,191,36,0.15)',
};

interface EmptyFeedProps {
  followingCount: number;
  latitude?: number | null;
  longitude?: number | null;
}

interface TrendingSpecies {
  speciesId: number;
  speciesName: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

interface NearbyCatch {
  id: string;
  speciesName: string;
  locationName: string | null;
  distance: number;
  photoUrl: string | null;
  username: string;
}

interface DailyStats {
  totalCatches: number;
  activeUsers: number;
  topLocation: string | null;
}

const TrendingSpeciesCard = ({ species }: { species: TrendingSpecies }): React.ReactElement => {
  const trendIcon = species.trend === 'up' ? '📈' : species.trend === 'down' ? '📉' : '➡️';
  
  return (
    <GlassView borderRadius={14} intensity={15} style={styles.trendingCard}>
      <View style={styles.trendingEmojiWrap}>
        <Text style={styles.trendingEmoji}>🐟</Text>
      </View>
      <View style={styles.trendingInfo}>
        <Text style={styles.trendingName}>{species.speciesName}</Text>
        <Text style={styles.trendingCount}>{species.count} av bugün</Text>
      </View>
      <View style={styles.trendBadge}>
        <Text style={styles.trendingTrend}>{trendIcon}</Text>
      </View>
    </GlassView>
  );
};

const NearbyCatchCard = ({ item, onPress }: { item: NearbyCatch; onPress: () => void }): React.ReactElement => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
    <GlassView borderRadius={16} intensity={15} style={styles.nearbyCard}>
      {item.photoUrl ? (
        <Image
          contentFit="cover"
          source={{ uri: item.photoUrl }}
          style={styles.nearbyImage}
        />
      ) : (
        <View style={[styles.nearbyImage, styles.nearbyImagePlaceholder]}>
          <Text style={styles.nearbyImagePlaceholderText}>🐟</Text>
        </View>
      )}
      <View style={styles.nearbyInfo}>
        <Text style={styles.nearbySpecies}>{item.speciesName}</Text>
        <View style={styles.nearbyMetaRow}>
          <Ionicons color={COLORS.textMuted} name="location-outline" size={11} />
          <Text style={styles.nearbyMeta}>
            {item.distance.toFixed(1)} km
          </Text>
        </View>
      </View>
    </GlassView>
  </TouchableOpacity>
);

const DailyStatsCard = ({ stats }: { stats: DailyStats }): React.ReactElement => (
  <GlassView borderRadius={20} intensity={18} style={styles.statsCard}>
    <View style={styles.statsHeader}>
      <Ionicons color={COLORS.water} name="analytics-outline" size={20} />
      <Text style={styles.statsTitle}>Bugün Türkiye&apos;de</Text>
    </View>
    <View style={styles.statsGrid}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.totalCatches}</Text>
        <Text style={styles.statLabel}>Av Kaydedildi</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.activeUsers}</Text>
        <Text style={styles.statLabel}>Aktif Balıkçı</Text>
      </View>
    </View>
    {stats.topLocation && (
      <View style={styles.statsFooterRow}>
        <Ionicons color={COLORS.gold} name="trophy-outline" size={14} />
        <Text style={styles.statsFooter}>En popüler: {stats.topLocation}</Text>
      </View>
    )}
  </GlassView>
);

export const EmptyFeed = ({
  followingCount,
  latitude,
  longitude,
}: EmptyFeedProps): React.ReactElement => {
  const router = useRouter();
  const hasLocation = typeof latitude === 'number' && typeof longitude === 'number';

  // Query trending species
  const trendingQuery = useQuery({
    queryKey: ['trending-species'],
    queryFn: getTrendingSpecies,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query nearby catches if location available
  const nearbyQuery = useQuery({
    queryKey: ['nearby-catches', latitude, longitude],
    queryFn: () => getNearbyCatches(latitude!, longitude!),
    enabled: hasLocation,
    staleTime: 5 * 60 * 1000,
  });

  // Query daily stats
  const statsQuery = useQuery({
    queryKey: ['daily-stats'],
    queryFn: getDailyStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const isLoading = trendingQuery.isLoading || statsQuery.isLoading;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Section with Fishing Theme */}
      <View style={styles.welcomeSection}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🎣</Text>
        </View>
        <Text style={styles.title}>
          {followingCount === 0 ? 'Sular Sakin... 🌊' : 'Akış Sessiz...'}
        </Text>
        <Text style={styles.subtitle}>
          {followingCount === 0
            ? 'Balıkçıları keşfet, takip et ve ilk avını paylaş!'
            : 'Takip ettiklerin henüz olta atmadı. Keşfete göz at!'}
        </Text>
      </View>

      {/* Action Buttons - Premium Style */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/explore')}
          style={styles.secondaryAction}
        >
          <Ionicons name="compass-outline" size={18} color={COLORS.water} />
          <Text style={styles.secondaryActionText}>Keşfet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/catch/new' as Href)}
          style={styles.primaryAction}
        >
          <Ionicons name="add-circle-outline" size={18} color="#FFF" />
          <Text style={styles.primaryActionText}>Avımı Kaydet</Text>
        </TouchableOpacity>
      </View>

      {/* Loading state */}
      {isLoading && (
        <View style={styles.loadingSection}>
          <ActivityIndicator color={COLORS.water} />
          <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
        </View>
      )}

      {/* Daily Stats */}
      {statsQuery.data && <DailyStatsCard stats={statsQuery.data} />}

      {/* Trending Species */}
      {trendingQuery.data && trendingQuery.data.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons color={COLORS.cta} name="flame-outline" size={18} />
            <Text style={styles.sectionTitle}>Trend Olan Türler</Text>
          </View>
          <View style={styles.trendingList}>
            {trendingQuery.data.slice(0, 5).map((species) => (
              <TrendingSpeciesCard key={species.speciesId} species={species} />
            ))}
          </View>
        </View>
      )}

      {/* Nearby Catches */}
      {hasLocation && nearbyQuery.data && nearbyQuery.data.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons color={COLORS.water} name="location-outline" size={18} />
            <Text style={styles.sectionTitle}>Yakınındaki Avlar</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.nearbyScroll}
          >
            {nearbyQuery.data.slice(0, 6).map((item) => (
              <NearbyCatchCard
                key={item.id}
                item={item}
                onPress={() => router.push(`/catch/${item.id}` as Href)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Suggestions - Premium Cards */}
      <View style={styles.suggestionsSection}>
        <View style={styles.sectionHeader}>
          <Ionicons color={COLORS.gold} name="bulb-outline" size={18} />
          <Text style={styles.sectionTitle}>Öneriler</Text>
        </View>
        <View style={styles.suggestionsList}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <GlassView borderRadius={16} intensity={15} style={styles.suggestionItem}>
              <View style={[styles.suggestionIcon, { backgroundColor: COLORS.waterMuted }]}>
                <Ionicons name="people-outline" size={20} color={COLORS.water} />
              </View>
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionTitle}>Balıkçıları Keşfet</Text>
                <Text style={styles.suggestionDesc}>Yakınındaki balıkçıları bul ve takip et</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </GlassView>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <GlassView borderRadius={16} intensity={15} style={styles.suggestionItem}>
              <View style={[styles.suggestionIcon, { backgroundColor: COLORS.goldMuted }]}>
                <Ionicons name="game-controller-outline" size={20} color={COLORS.gold} />
              </View>
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionTitle}>Günlük Oyunlar</Text>
                <Text style={styles.suggestionDesc}>XP kazan ve sıralamada yüksel</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </GlassView>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/fish-id' as Href)}
          >
            <GlassView borderRadius={16} intensity={15} style={styles.suggestionItem}>
              <View style={[styles.suggestionIcon, { backgroundColor: COLORS.ctaMuted }]}>
                <Ionicons name="camera-outline" size={20} color={COLORS.cta} />
              </View>
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionTitle}>AI Balık Tanıma</Text>
                <Text style={styles.suggestionDesc}>Fotoğrafla balık türünü öğren</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </GlassView>
          </TouchableOpacity>
        </View>
      </View>

      {/* Fishing-themed footer message */}
      <View style={styles.footerMessage}>
        <Text style={styles.footerEmoji}>🌊</Text>
        <Text style={styles.footerText}>İyi avlar dileriz!</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 28,
    paddingBottom: 100,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.waterMuted,
    borderWidth: 2,
    borderColor: COLORS.water,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 44,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.cta,
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryActionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.waterMuted,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.water,
  },
  secondaryActionText: {
    color: COLORS.water,
    fontSize: 15,
    fontWeight: '600',
  },
  loadingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  // Stats Card
  statsCard: {
    padding: 18,
    marginBottom: 28,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statsTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  statValue: {
    color: COLORS.water,
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  statsFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statsFooter: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  // Trending
  trendingList: {
    gap: 10,
  },
  trendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  trendingEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.waterMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  trendingEmoji: {
    fontSize: 22,
  },
  trendingInfo: {
    flex: 1,
  },
  trendingName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  trendingCount: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  trendBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingTrend: {
    fontSize: 16,
  },
  // Nearby
  nearbyScroll: {
    gap: 12,
  },
  nearbyCard: {
    width: 150,
    overflow: 'hidden',
  },
  nearbyImage: {
    width: '100%',
    height: 110,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  nearbyImagePlaceholder: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyImagePlaceholderText: {
    fontSize: 36,
  },
  nearbyInfo: {
    padding: 12,
  },
  nearbySpecies: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  nearbyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  nearbyMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  // Suggestions
  suggestionsSection: {
    marginTop: 4,
  },
  suggestionsList: {
    gap: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  suggestionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  suggestionDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  // Footer
  footerMessage: {
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 20,
  },
  footerEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
