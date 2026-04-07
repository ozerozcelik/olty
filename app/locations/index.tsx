import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TouchableOpacity } from '@/components/TouchableOpacity';
import { getUserFishingLocations } from '@/services/fishingLocations.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { FishingLocationMapItem, LocationType } from '@/types/app.types';
import { formatDate } from '@/utils/date';
import {
  openLocationInMaps,
} from '@/utils/locationActions';
import { shareLocationExternally } from '@/utils/locationShare';

const typeLabel = (type: LocationType): string => {
  const labels: Record<LocationType, string> = {
    spot: 'Balık Noktası',
    marina: 'Marina',
    shop: 'Dükkan',
    hazard: 'Tehlike',
    other: 'Diğer',
  };

  return labels[type];
};

const typeIcon = (type: LocationType): keyof typeof Ionicons.glyphMap => {
  const icons: Record<LocationType, keyof typeof Ionicons.glyphMap> = {
    spot: 'location',
    marina: 'boat',
    shop: 'storefront',
    hazard: 'warning',
    other: 'bookmark',
  };

  return icons[type];
};

const LocationListItem = ({
  item,
  onOpenDetail,
}: {
  item: FishingLocationMapItem;
  onOpenDetail: () => void;
}): JSX.Element => {
  return (
    <View className="rounded-[24px] border border-white/10 bg-white/10 p-4">
      <TouchableOpacity activeOpacity={0.8} onPress={onOpenDetail}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Ionicons color="#7DD4E8" name={typeIcon(item.type)} size={16} />
              <Text className="flex-1 text-base font-semibold text-ink">{item.name}</Text>
            </View>
            <Text className="mt-2 text-sm text-white/70">
              {typeLabel(item.type)} • {item.is_public ? 'Herkese Açık' : 'Sadece Ben'}
            </Text>
            {item.description ? (
              <Text className="mt-2 text-sm leading-6 text-white/70" numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <Text className="mt-2 text-xs text-white/45">{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View className="mt-4 flex-row gap-2">
        <View className="flex-1">
          <TouchableOpacity
            activeOpacity={0.8}
            className="rounded-full border border-sea/30 bg-sea/15 px-4 py-3"
            onPress={() => void openLocationInMaps(item.latitude, item.longitude, item.name)}
          >
            <Text className="text-center text-sm font-semibold text-sea">Adrese Git</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          className="flex-1 rounded-full border border-white/10 bg-white/10 px-4 py-3"
          onPress={() =>
            void shareLocationExternally({
              locationId: item.id,
              locationName: item.name,
              sharedByUsername: item.username,
            })
          }
        >
          <Text className="text-center text-sm font-semibold text-ink">Paylaş</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          className="flex-1 rounded-full bg-coral px-4 py-3"
          onPress={() => onOpenDetail()}
        >
          <Text className="text-center text-sm font-semibold text-white">Detay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const LocationsIndexScreen = (): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const [search, setSearch] = useState<string>('');
  const query = useQuery({
    queryKey: ['user-fishing-locations', profile?.id],
    queryFn: () => getUserFishingLocations(profile?.id ?? ''),
    enabled: Boolean(profile?.id),
  });

  const filteredItems = useMemo((): FishingLocationMapItem[] => {
    const value = search.trim().toLocaleLowerCase('tr-TR');
    const items = query.data ?? [];

    if (!value) {
      return items;
    }

    return items.filter((item) =>
      item.name.toLocaleLowerCase('tr-TR').includes(value),
    );
  }, [query.data, search]);

  return (
    <>
      <Stack.Screen options={{ title: 'Yer İmlerim' }} />
      <View
        className="flex-1 bg-sand px-4"
        style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: 24 }}
      >
        <View className="mb-4 flex-row items-center gap-3 rounded-[24px] border border-white/10 bg-white/10 px-4 py-3">
          <Ionicons color="rgba(240,247,249,0.45)" name="search" size={18} />
          <TextInput
            className="flex-1 text-base text-ink"
            onChangeText={setSearch}
            placeholder="İsimle ara"
            placeholderTextColor="rgba(240,247,249,0.45)"
            value={search}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            className="rounded-full bg-coral px-4 py-2"
            onPress={() => router.push('/locations/new')}
          >
            <Text className="text-sm font-semibold text-white">Yeni</Text>
          </TouchableOpacity>
        </View>

        {query.isLoading ? (
          <View className="mt-10 items-center gap-3">
            <ActivityIndicator color="#7DD4E8" />
            <Text className="text-sm text-white/70">Yer imleri yükleniyor...</Text>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            data={filteredItems}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View className="rounded-[24px] border border-dashed border-white/10 bg-white/5 px-5 py-6">
                <Text className="text-base font-semibold text-ink">Yer imi bulunamadı</Text>
                <Text className="mt-2 text-sm leading-6 text-white/70">
                  {search.trim()
                    ? 'Aradığın isimde bir yer imi yok.'
                    : 'Henüz bir yer imi eklemedin.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <LocationListItem
                item={item}
                onOpenDetail={() => router.push(`/locations/${item.id}` as Href)}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
};

export default LocationsIndexScreen;
