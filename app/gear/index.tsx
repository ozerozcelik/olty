import {
  useQuery } from '@tanstack/react-query';
import { useRouter,
  type Href } from 'expo-router';
import { Alert,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { GearItemCard } from '@/components/GearItemCard';
import { deleteGearItem, getGearItems } from '@/services/gear.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { GearItemRow } from '@/types/app.types';

const GearScreen = (): JSX.Element => {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const gearQuery = useQuery({
    queryKey: ['user-gear', profile?.id],
    queryFn: () => getGearItems(profile?.id ?? ''),
    enabled: Boolean(profile?.id),
  });
  const sections = gearQuery.data ?? [];
  const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0);

  const handleDelete = (item: GearItemRow): void => {
    Alert.alert('Ekipman silinsin mi?', 'Bu islem geri alinamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteGearItem(item.id);
            await gearQuery.refetch();
          })();
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-main"
      contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-semibold text-ink">Ekipmanlarim</Text>
          <Text className="mt-1 text-sm text-white/70">{totalItems} ekipman kaydi</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          className="rounded-full bg-sea px-4 py-2"
          onPress={() => router.push('/gear/new')}
        >
          <Text className="text-sm font-semibold text-white">Ekle</Text>
        </TouchableOpacity>
      </View>

      {!totalItems ? (
        <View className="rounded-[28px] border border-white/10 bg-white/10 px-5 py-8">
          <Text className="text-center text-base leading-7 text-white/70">
            Henüz ekipman eklemedin. İlk setini kaydetmeye buradan başlayabilirsin.
          </Text>
        </View>
      ) : null}

      {sections.map((section) => (
        <View key={section.slug} className="gap-3">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-lg font-semibold text-ink">
              {section.icon} {section.name_tr}
            </Text>
            <Text className="text-xs text-white/45">{section.items.length} parça</Text>
          </View>

          {section.items.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {section.items.map((item) => (
                <GearItemCard
                  item={item}
                  key={item.id}
                  onLongPress={handleDelete}
                  onPress={(value) => router.push(`/gear/${value.id}` as Href)}
                />
              ))}
            </ScrollView>
          ) : (
            <View className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-4">
              <Text className="text-sm text-white/70">
                Henüz {section.name_tr.toLowerCase()} eklemedin
              </Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

export default GearScreen;
