import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Image, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { SplashScreen } from '@/components/SplashScreen';
import { getFishdexOverview } from '@/services/fishdex.service';
import { getProfileById } from '@/services/profiles.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { FishdexSpeciesProgress } from '@/types/app.types';
import { formatDate } from '@/utils/date';
import { getFishCategoryAccent, getFishCategoryLabel } from '@/utils/fishdex';

const renderSpeciesCard = (
  router: ReturnType<typeof useRouter>,
  userId: string,
  item: FishdexSpeciesProgress,
): JSX.Element => {
  const accent = getFishCategoryAccent(item.species.category);
  const isLocked = !item.discovered;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      className={`mb-3 flex-1 overflow-hidden rounded-[24px] border ${
        isLocked ? 'border-white/10 bg-white/10' : 'border-white/10 bg-white/10'
      }`}
      onPress={() => router.push(`/profile/fishdex/species/${item.species.id}?userId=${userId}`)}
      style={{ opacity: isLocked ? 0.62 : 1 }}
    >
      {item.latestPhotoUrl && item.discovered ? (
        <Image
          resizeMode="cover"
          source={{ uri: item.latestPhotoUrl }}
          style={{ width: '100%', height: 126 }}
        />
      ) : (
        <View className="h-[126px] items-center justify-center" style={{ backgroundColor: `${accent}18` }}>
          <Text className="text-4xl font-semibold" style={{ color: accent }}>
            {item.species.name_tr.charAt(0)}
          </Text>
        </View>
      )}
      <View className="gap-2 px-4 py-4">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="flex-1 text-base font-semibold text-ink">{item.species.name_tr}</Text>
          <View className="rounded-full px-2 py-1" style={{ backgroundColor: `${accent}18` }}>
            <Text className="text-[11px] font-semibold" style={{ color: accent }}>
              {getFishCategoryLabel(item.species.category)}
            </Text>
          </View>
        </View>
        <Text className="text-xs leading-5 text-white/70">
          {item.discovered
            ? `${item.catchCount} kayıt • İlk av ${item.firstCaughtAt ? formatDate(item.firstCaughtAt) : 'bilinmiyor'}`
            : 'Henüz keşfedilmedi'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const FishdexScreen = (): JSX.Element => {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const currentProfile = useAuthStore((state) => state.profile);
  const profileQuery = useQuery({
    queryKey: ['fishdex-profile', userId],
    queryFn: () => getProfileById(userId),
    enabled: Boolean(userId),
  });
  const canViewFishdex =
    profileQuery.data &&
    (currentProfile?.id === userId || profileQuery.data.show_fishdex_public);
  const fishdexQuery = useQuery({
    queryKey: ['fishdex-overview', userId],
    queryFn: () => getFishdexOverview(userId),
    enabled: Boolean(userId) && Boolean(canViewFishdex),
  });

  if (!profileQuery.data || (canViewFishdex && !fishdexQuery.data)) {
    return <SplashScreen />;
  }

  if (!canViewFishdex) {
    return (
      <View className="flex-1 bg-main px-4 pt-4">
        <Stack.Screen options={{ title: 'Fishdex' }} />
        <View className="rounded-[28px] border border-white/10 bg-white/10 p-5">
          <Text className="text-xl font-semibold text-ink">Fishdex gizli</Text>
          <Text className="mt-2 text-sm leading-6 text-white/70">
            Bu kullanıcı Fishdex koleksiyonunu sadece kendisine açık tutuyor.
          </Text>
        </View>
      </View>
    );
  }

  const overview = fishdexQuery.data!;

  return (
    <View className="flex-1 bg-main">
      <Stack.Screen options={{ title: 'Fishdex' }} />
      <FlatList
        className="flex-1"
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
        data={overview.species}
        keyExtractor={(item) => item.species.id.toString()}
        ListHeaderComponent={
          <View className="gap-4 pb-6">
            <View className="rounded-[28px] border border-white/10 bg-white/10 p-5">
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-[#7A8B8F]">
                @{profileQuery.data.username} • Fishdex
              </Text>
              <Text className="mt-2 text-3xl font-semibold text-ink">
                {overview.discoveredSpecies} / {overview.totalSpecies}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/70">
                Yakaladığın her yeni tür burada renklenir. Yeni av kaydı ekledikçe Fishdex otomatik güncellenir.
              </Text>
              <View className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                <View
                  className="h-full rounded-full bg-sea"
                  style={{ width: `${overview.completionPercent}%` }}
                />
              </View>
              <View className="mt-4 flex-row gap-3">
                <View className="flex-1 rounded-2xl bg-white/5 px-4 py-4">
                  <Text className="text-xs uppercase tracking-[1px] text-white/45">Tamamlama</Text>
                  <Text className="mt-2 text-2xl font-semibold text-ink">%{overview.completionPercent}</Text>
                </View>
                <View className="flex-1 rounded-2xl bg-white/5 px-4 py-4">
                  <Text className="text-xs uppercase tracking-[1px] text-white/45">Sonraki Hedef</Text>
                  <Text className="mt-2 text-2xl font-semibold text-ink">
                    {overview.nextMilestone ?? 'Tamam'}
                  </Text>
                  <Text className="mt-1 text-xs text-white/70">
                    {overview.remainingToNextMilestone === null
                      ? 'Tum turler acildi'
                      : `${overview.remainingToNextMilestone} tür kaldı`}
                  </Text>
                </View>
              </View>
            </View>

            <View className="rounded-[28px] border border-white/10 bg-white/10 p-5">
              <Text className="text-lg font-semibold text-ink">Kategori ilerlemesi</Text>
              <View className="mt-4 flex-row flex-wrap gap-3">
                {overview.categoryProgress.map((item) => (
                  <View key={item.category} className="min-w-[108px] rounded-2xl bg-white/5 px-4 py-3">
                    <Text className="text-xs uppercase tracking-[1px] text-white/45">{item.label}</Text>
                    <Text className="mt-1 text-xl font-semibold text-ink">
                      {item.discovered}/{item.total}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <Text className="text-lg font-semibold text-ink">Tür koleksiyonu</Text>
          </View>
        }
        numColumns={2}
        renderItem={({ item }) => renderSpeciesCard(router, userId, item)}
      />
    </View>
  );
};

export default FishdexScreen;
