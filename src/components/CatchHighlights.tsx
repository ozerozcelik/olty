import {
  Image } from 'expo-image';
import { useMutation,
  useQuery,
  useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { GlassView } from '@/components/GlassView';

import { AddHighlightModal } from '@/components/AddHighlightModal';
import { addHighlight, getHighlights, removeHighlight } from '@/services/highlights.service';

interface CatchHighlightsProps {
  userId: string;
  isOwnProfile: boolean;
}

export const CatchHighlights = ({
  userId,
  isOwnProfile,
}: CatchHighlightsProps): JSX.Element => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const query = useQuery({
    queryKey: ['highlights', userId],
    queryFn: () => getHighlights(userId),
    enabled: Boolean(userId),
  });
  const addMutation = useMutation({
    mutationFn: addHighlight,
    onSuccess: async () => {
      setModalVisible(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['highlights', userId] }),
        queryClient.invalidateQueries({ queryKey: ['available-highlights'] }),
      ]);
    },
  });
  const removeMutation = useMutation({
    mutationFn: removeHighlight,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['highlights', userId] }),
        queryClient.invalidateQueries({ queryKey: ['available-highlights'] }),
      ]);
    },
  });
  const highlights = query.data ?? [];

  return (
    <GlassView borderRadius={28} intensity={18}>
      <View className="gap-3 p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-ink">Öne Çıkan Avlar</Text>
        <Text className="text-sm text-white/45">{highlights.length}/9</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3">
          {highlights.map((item) => (
            <TouchableOpacity activeOpacity={0.8}
              className="w-20"
              key={item.catch_id}
              onLongPress={
                isOwnProfile
                  ? () => {
                      Alert.alert('Öne çıkarmayı kaldır', 'Bu av öne çıkarılanlardan kaldırılacak.', [
                        { text: 'Vazgeç', style: 'cancel' },
                        {
                          text: 'Kaldir',
                          style: 'destructive',
                          onPress: () => {
                            void removeMutation.mutateAsync(item.catch_id);
                          },
                        },
                      ]);
                    }
                  : undefined
              }
              onPress={() => router.push(`/catch/${item.catch_id}`)}
            >
              {item.photo_url ? (
                <Image
                  contentFit="cover"
                  source={{ uri: item.photo_url }}
                  style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: '#0F2C35' }}
                />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-[20px] bg-[#0F2C35]">
                  <Text className="text-3xl">🐟</Text>
                </View>
              )}
              <Text className="mt-2 text-center text-xs font-semibold text-ink" numberOfLines={2}>
                {item.species_name}
              </Text>
            </TouchableOpacity>
          ))}

          {isOwnProfile && highlights.length < 9 ? (
            <TouchableOpacity activeOpacity={0.8} className="w-20" onPress={() => setModalVisible(true)}>
              <View className="h-20 w-20 items-center justify-center rounded-[20px] border border-dashed border-sea bg-white/5">
                <Text className="text-3xl font-semibold text-sea">+</Text>
              </View>
              <Text className="mt-2 text-center text-xs font-semibold text-sea">Ekle</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      {!highlights.length ? (
        <Text className="text-sm text-white/70">Henüz öne çıkarılan av yok.</Text>
      ) : null}

      <AddHighlightModal
        onClose={() => setModalVisible(false)}
        onSelect={(catchId) => {
          void addMutation.mutateAsync(catchId);
        }}
        visible={modalVisible}
      />
      </View>
    </GlassView>
  );
};
