import {
  Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams,
  useRouter,
  type Href } from 'expo-router';
import { Alert,
  Image,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { GEAR_TIERS } from '@/lib/constants';
import {
  deleteGearItem,
  getGearItemById,
  toggleFavorite,
} from '@/services/gear.service';
import { getProfileById } from '@/services/profiles.service';
import { useAuthStore } from '@/stores/useAuthStore';

const GearDetailScreen = (): JSX.Element => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const gearQuery = useQuery({
    queryKey: ['gear-item', id],
    queryFn: () => getGearItemById(id),
    enabled: Boolean(id),
  });
  const item = gearQuery.data;
  const ownerProfileQuery = useQuery({
    queryKey: ['gear-owner-profile', item?.user_id],
    queryFn: () => getProfileById(item!.user_id),
    enabled: Boolean(item?.user_id),
  });

  if (!item) {
    return <View className="flex-1 bg-sand" />;
  }

  const tier = GEAR_TIERS[item.tier as keyof typeof GEAR_TIERS] ?? GEAR_TIERS[1];
  const isOwnGear = item.user_id === profile?.id;
  const canViewGear = isOwnGear || ownerProfileQuery.data?.show_gear_public;

  if (!isOwnGear && ownerProfileQuery.data && !canViewGear) {
    return (
      <ScrollView
        className="flex-1 bg-sand"
        contentContainerStyle={{ gap: 18, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            activeOpacity={0.8}
            className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10"
            onPress={() => router.back()}
          >
            <Ionicons color="#F0F7F9" name="arrow-back" size={20} />
          </TouchableOpacity>
          <View className="w-11" />
        </View>

        <View className="rounded-[28px] border border-white/10 bg-white/10 p-5">
          <Text className="text-xl font-semibold text-ink">Ekipmanlar gizli</Text>
          <Text className="mt-2 text-sm leading-6 text-white/70">
            Bu kullanıcı ekipman detaylarını profiline kapattı.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const handleDelete = (): void => {
    Alert.alert('Ekipman silinsin mi?', 'Bu islem geri alinamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteGearItem(item.id);
            router.replace('/gear');
          })();
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-sand"
      contentContainerStyle={{ gap: 18, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
    >
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          activeOpacity={0.8}
          className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10"
          onPress={() => router.back()}
        >
          <Ionicons color="#F0F7F9" name="arrow-back" size={20} />
        </TouchableOpacity>
        {isOwnGear ? (
          <View className="flex-row gap-2">
            <TouchableOpacity
              activeOpacity={0.8}
              className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10"
              onPress={() => router.push(`/gear/edit/${item.id}` as Href)}
            >
              <Ionicons color="#F0F7F9" name="create-outline" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10"
              onPress={handleDelete}
            >
              <Ionicons color="#A6422B" name="trash-outline" size={20} />
            </TouchableOpacity>
          </View>
        ) : <View className="w-11" />}
      </View>

      <View className="overflow-hidden rounded-[32px] border border-white/10 bg-white/10">
        {item.photo_url ? (
          <Image
            resizeMode="cover"
            source={{ uri: item.photo_url }}
            style={{ width: '100%', height: 280 }}
          />
        ) : (
          <View className="h-[280px] items-center justify-center bg-white/5">
            <Text className="text-6xl">{item.categoryMeta?.icon ?? '🧰'}</Text>
          </View>
        )}
      </View>

      <View className="gap-4 rounded-[28px] border border-white/10 bg-white/10 p-5">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-2xl font-semibold text-ink">{item.name}</Text>
            <Text className="text-sm text-white/70">
              {item.categoryMeta?.name_tr ?? 'Ekipman'}
            </Text>
          </View>
          <View className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
            <Text className="text-xs font-semibold text-sea">{tier.name}</Text>
          </View>
        </View>

        {isOwnGear ? (
          <TouchableOpacity
            activeOpacity={0.8}
            className={`flex-row items-center justify-between rounded-2xl px-4 py-4 ${
              item.is_favorite ? 'border border-coral/40 bg-coral/15' : 'border border-white/10 bg-white/10'
            }`}
            onPress={() => void toggleFavorite(item.id, !item.is_favorite).then(() => gearQuery.refetch())}
          >
            <Text className="text-sm font-semibold text-ink">Favori olarak isaretle</Text>
            <Ionicons
              color={item.is_favorite ? '#D97B4A' : '#7A8B8F'}
              name={item.is_favorite ? 'heart' : 'heart-outline'}
              size={20}
            />
          </TouchableOpacity>
        ) : null}

        {[
          { label: 'Marka', value: item.brand },
          { label: 'Model', value: item.model },
          { label: 'Alis tarihi', value: item.purchase_date },
          {
            label: 'Alis fiyati',
            value: item.purchase_price !== null ? `${item.purchase_price} TL` : null,
          },
          { label: 'Notlar', value: item.notes },
        ]
          .filter((entry): entry is { label: string; value: string } => Boolean(entry.value))
          .map((entry) => (
            <View className="gap-1" key={entry.label}>
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/45">
                {entry.label}
              </Text>
              <Text className="text-base text-ink">{entry.value}</Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
};

export default GearDetailScreen;
