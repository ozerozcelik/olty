
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TouchableOpacity } from '@/components/TouchableOpacity';
import { getFishingLocationById } from '@/services/fishingLocations.service';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatDate } from '@/utils/date';
import { openLocationInMaps } from '@/utils/locationActions';
import { shareLocationExternally } from '@/utils/locationShare';

const LocationDetailScreen = (): JSX.Element => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const query = useQuery({
    queryKey: ['fishing-location', id],
    queryFn: () => getFishingLocationById(id),
    enabled: Boolean(id),
  });

  if (query.isLoading || !query.data) {
    return (
      <>
        <Stack.Screen options={{ title: 'Yer İmi' }} />
        <View className="flex-1 items-center justify-center bg-main">
          <ActivityIndicator color="#D4FF00" />
        </View>
      </>
    );
  }

  const item = query.data;

  return (
    <>
      <Stack.Screen options={{ title: item.name }} />
      <ScrollView
        className="flex-1 bg-main px-4"
        contentContainerStyle={{ gap: 16, paddingBottom: 32, paddingTop: Math.max(insets.top, 16) }}
      >
        <View className="rounded-[28px] border border-white/10 bg-white/10 px-5 py-5">
          <Text className="text-2xl font-semibold text-ink">{item.name}</Text>
          <Text className="mt-2 text-sm text-white/70">
            {item.type} • {item.is_public ? 'Herkese Açık' : 'Sadece Ben'}
          </Text>
          {item.description ? (
            <Text className="mt-4 text-sm leading-7 text-white/70">{item.description}</Text>
          ) : null}
          <Text className="mt-4 text-xs text-white/45">{formatDate(item.created_at)}</Text>
          <Text className="mt-2 text-xs text-white/45">
            {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
          </Text>
        </View>

        <View className="gap-3 rounded-[28px] border border-white/10 bg-white/10 px-5 py-5">
          <TouchableOpacity
            activeOpacity={0.8}
            className="rounded-full border border-sea/30 bg-sea/15 px-4 py-4"
            onPress={() => void openLocationInMaps(item.latitude, item.longitude, item.name)}
          >
            <Text className="text-center text-base font-semibold text-sea">Adrese Git</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            className="rounded-full border border-white/10 bg-white/10 px-4 py-4"
            onPress={() =>
              void shareLocationExternally({
                locationId: item.id,
                locationName: item.name,
                sharedByUsername: profile?.username ?? item.username,
              })
            }
          >
            <Text className="text-center text-base font-semibold text-ink">Dışa Paylaş</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            className="rounded-full bg-coral px-4 py-4"
            onPress={() =>
              router.push(
                `/messages/share-location/${item.id}` as Href,
              )
            }
          >
            <Text className="text-center text-base font-semibold text-white">Uygulama İçi Paylaş</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
};

export default LocationDetailScreen;
