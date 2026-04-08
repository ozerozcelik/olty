import {
  Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { Modal,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { getAvailableHighlightCatches } from '@/services/highlights.service';
import { formatDate } from '@/utils/date';

interface AddHighlightModalProps {
  onClose: () => void;
  onSelect: (catchId: string) => void;
  visible: boolean;
}

export const AddHighlightModal = ({
  onClose,
  onSelect,
  visible,
}: AddHighlightModalProps): JSX.Element => {
  const query = useQuery({
    queryKey: ['available-highlights'],
    queryFn: getAvailableHighlightCatches,
    enabled: visible,
  });

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[80%] rounded-t-[32px] bg-main px-5 pb-8 pt-5">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-ink">Öne çıkar</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={onClose}>
              <Text className="text-sm font-semibold text-sea">Kapat</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-3 pb-4">
              {(query.data ?? []).length ? (
                (query.data ?? []).map((item) => (
                  <TouchableOpacity activeOpacity={0.8}
                    className="flex-row items-center gap-3 rounded-[24px] border border-white/10 bg-white/10 px-4 py-4"
                    key={item.catch_id}
                    onPress={() => onSelect(item.catch_id)}
                  >
                    {item.photo_url ? (
                      <Image
                        contentFit="cover"
                        source={{ uri: item.photo_url }}
                        style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#0F2C35' }}
                      />
                    ) : (
                      <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#0F2C35]">
                        <Text className="text-2xl">🐟</Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-ink">{item.species_name}</Text>
                      <Text className="mt-1 text-sm text-white/70">
                        {[
                          item.length_cm !== null ? `${item.length_cm} cm` : null,
                          formatDate(item.created_at),
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text className="text-center text-sm text-white/70">
                  Öne çıkarabilecek herkese açık av bulunamadı.
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
