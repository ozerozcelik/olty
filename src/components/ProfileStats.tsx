import { useQuery } from '@tanstack/react-query';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GlassView } from '@/components/GlassView';
import { T } from '@/lib/theme';
import { getProfileStats, getTopSpecies } from '@/services/profiles.service';

interface ProfileStatsProps {
  userId: string;
}

interface StatTileProps {
  label: string;
  value: string;
}

const StatTile = ({ label, value }: StatTileProps): JSX.Element => {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
};

export const ProfileStats = ({ userId }: ProfileStatsProps): JSX.Element => {
  const query = useQuery({
    queryKey: ['profile-stats', userId],
    queryFn: async () => {
      const [stats, topSpecies] = await Promise.all([
        getProfileStats(userId),
        getTopSpecies(userId),
      ]);

      return { stats, topSpecies };
    },
    enabled: Boolean(userId),
  });

  if (!query.data) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Balıkçılık istatistikleri</Text>
        <Text style={styles.helperText}>
          {query.isError
            ? 'İstatistikler şu anda yüklenemedi.'
            : 'İstatistikler yükleniyor...'}
        </Text>
      </View>
    );
  }

  const { stats, topSpecies } = query.data;

  return (
    <GlassView borderRadius={20} intensity={18} style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Balıkçılık istatistikleri</Text>
        <Text style={styles.levelText}>Lv {stats.level}</Text>
      </View>

      <View style={styles.row}>
        <StatTile label="Toplam av" value={stats.catch_count.toLocaleString('tr-TR')} />
        <StatTile label="Tür" value={stats.unique_species_count.toLocaleString('tr-TR')} />
        <StatTile label="Sal bırak" value={stats.release_count.toLocaleString('tr-TR')} />
      </View>

      <View style={styles.row}>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>En büyük av</Text>
          <Text style={styles.statValue}>
            {stats.biggest_catch_cm.toLocaleString('tr-TR')} cm
          </Text>
          <Text style={styles.subValue}>
            {stats.biggest_catch_g.toLocaleString('tr-TR')} g
          </Text>
        </View>
        <StatTile
          label="Son 30 gün"
          value={stats.catches_last_30_days.toLocaleString('tr-TR')}
        />
      </View>

      <View style={styles.speciesSection}>
        <Text style={styles.sectionLabel}>En çok tuttuğu türler</Text>
        <View style={styles.speciesWrap}>
          {topSpecies.length ? (
            topSpecies.map((item) => (
              <View key={item.species_name} style={styles.speciesPill}>
                <Text style={styles.speciesText}>
                  {item.species_name} · {item.catch_count.toLocaleString('tr-TR')}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptySpeciesPill}>
              <Text style={styles.emptySpeciesText}>Henüz veri yok</Text>
            </View>
          )}
        </View>
      </View>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 20,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: T.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  levelText: {
    color: T.teal,
    fontSize: 14,
    fontWeight: '700',
  },
  helperText: {
    color: T.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  statTile: {
    backgroundColor: T.bgDeep,
    borderRadius: 16,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  statLabel: {
    color: T.textTertiary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statValue: {
    color: T.teal,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  subValue: {
    color: T.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  speciesSection: {
    gap: 10,
  },
  sectionLabel: {
    color: T.textTertiary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  speciesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speciesPill: {
    backgroundColor: T.tealGlow,
    borderColor: T.teal,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  speciesText: {
    color: T.teal,
    fontSize: 12,
    fontWeight: '600',
  },
  emptySpeciesPill: {
    backgroundColor: T.bgDeep,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emptySpeciesText: {
    color: T.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
});
