import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, Text, View } from 'react-native';

import { SplashScreen } from '@/components/SplashScreen';
import { getFishdexSpeciesDetail } from '@/services/fishdex.service';
import { getProfileById } from '@/services/profiles.service';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatDate } from '@/utils/date';
import { getFishCategoryAccent, getFishCategoryLabel } from '@/utils/fishdex';

const FishdexSpeciesDetailScreen = (): JSX.Element => {
  const params = useLocalSearchParams<{ speciesId: string; userId?: string }>();
  const speciesId = Number(params.speciesId);
  const userId = params.userId ?? '';
  const currentProfile = useAuthStore((state) => state.profile);
  const profileQuery = useQuery({
    queryKey: ['fishdex-profile', userId],
    queryFn: () => getProfileById(userId),
    enabled: Boolean(userId),
  });
  const canViewFishdex =
    profileQuery.data &&
    (currentProfile?.id === userId || profileQuery.data.show_fishdex_public);
  const detailQuery = useQuery({
    queryKey: ['fishdex-species-detail', userId, speciesId],
    queryFn: () => getFishdexSpeciesDetail(userId, speciesId),
    enabled: Boolean(userId) && Number.isFinite(speciesId) && Boolean(canViewFishdex),
  });

  if (!profileQuery.data || (canViewFishdex && !detailQuery.data)) {
    return <SplashScreen />;
  }

  if (!canViewFishdex) {
    return (
      <View className="flex-1 bg-sand px-4 pt-4">
        <Stack.Screen options={{ title: 'Fishdex' }} />
        <View className="rounded-[28px] border border-white/10 bg-white/10 p-5">
          <Text className="text-xl font-semibold text-ink">Fishdex gizli</Text>
          <Text className="mt-2 text-sm leading-6 text-white/70">
            Bu kullanıcı Fishdex detaylarını paylaşmıyor.
          </Text>
        </View>
      </View>
    );
  }

  const detail = detailQuery.data!;
  const accent = getFishCategoryAccent(detail.species.category);

  return (
    <ScrollView
      className="flex-1 bg-sand"
      contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
    >
      <Stack.Screen options={{ title: detail.species.name_tr }} />

      <View className="overflow-hidden rounded-[28px] border border-white/10 bg-white/10">
        {detail.latestPhotoUrl && detail.discovered ? (
          <Image
            resizeMode="cover"
            source={{ uri: detail.latestPhotoUrl }}
            style={{ width: '100%', height: 240 }}
          />
        ) : (
          <View className="h-[240px] items-center justify-center" style={{ backgroundColor: `${accent}18` }}>
            <Text className="text-7xl font-semibold" style={{ color: accent }}>
              {detail.species.name_tr.charAt(0)}
            </Text>
          </View>
        )}
        <View className="gap-3 p-5">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-3xl font-semibold text-ink">{detail.species.name_tr}</Text>
              {detail.species.name_scientific ? (
                <Text className="mt-1 text-sm italic text-white/70">
                  {detail.species.name_scientific}
                </Text>
              ) : null}
            </View>
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: `${accent}18` }}>
              <Text className="text-xs font-semibold" style={{ color: accent }}>
                {getFishCategoryLabel(detail.species.category)}
              </Text>
            </View>
          </View>

          <Text className="text-sm leading-6 text-white/70">
            {detail.species.description_tr ?? 'Bu tür için detaylı açıklama yakında eklenecek.'}
          </Text>
        </View>
      </View>

      <View className="rounded-[28px] border border-white/10 bg-white/10 p-5">
        <Text className="text-lg font-semibold text-ink">{profileQuery.data.username} için ilerleme</Text>
        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-white/5 px-4 py-4">
            <Text className="text-xs uppercase tracking-[1px] text-white/45">Durum</Text>
            <Text className="mt-2 text-xl font-semibold text-ink">
              {detail.discovered ? 'Keşfedildi' : 'Kilitli'}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl bg-white/5 px-4 py-4">
            <Text className="text-xs uppercase tracking-[1px] text-white/45">Kayıt</Text>
            <Text className="mt-2 text-xl font-semibold text-ink">{detail.catchCount}</Text>
          </View>
        </View>
        <View className="mt-3 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-white/5 px-4 py-4">
            <Text className="text-xs uppercase tracking-[1px] text-white/45">İlk Av</Text>
            <Text className="mt-2 text-sm font-semibold text-ink">
              {detail.firstCaughtAt ? formatDate(detail.firstCaughtAt) : 'Henüz yok'}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl bg-white/5 px-4 py-4">
            <Text className="text-xs uppercase tracking-[1px] text-white/45">En Buyuk</Text>
            <Text className="mt-2 text-sm font-semibold text-ink">
              {detail.biggestLengthCm ? `${detail.biggestLengthCm} cm` : 'Henüz yok'}
            </Text>
          </View>
        </View>
      </View>

      <View className="rounded-[28px] border border-white/10 bg-white/10 p-5">
        <Text className="text-lg font-semibold text-ink">Saha notlari</Text>
        <View className="mt-4 gap-4">
          <View className="rounded-2xl bg-white/5 px-4 py-4">
            <Text className="text-xs uppercase tracking-[1px] text-white/45">Habitat</Text>
            <Text className="mt-2 text-sm leading-6 text-white/70">
              {detail.species.habitat_tr ?? 'Habitat bilgisi yakında eklenecek.'}
            </Text>
          </View>
          <View className="rounded-2xl bg-white/5 px-4 py-4">
            <Text className="text-xs uppercase tracking-[1px] text-white/45">En İyi Dönem</Text>
            <Text className="mt-2 text-sm leading-6 text-white/70">
              {detail.species.best_season_tr ?? 'Mevsim bilgisi yakında eklenecek.'}
            </Text>
          </View>
          <View className="rounded-2xl bg-white/5 px-4 py-4">
            <Text className="text-xs uppercase tracking-[1px] text-white/45">Yem ve Teknik</Text>
            <Text className="mt-2 text-sm leading-6 text-white/70">
              {detail.species.bait_tr ?? 'Yem önerileri yakında eklenecek.'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default FishdexSpeciesDetailScreen;
