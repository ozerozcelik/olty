import { Modal, ScrollView, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import type { TournamentCatchCandidate } from '@/types/app.types';
import { formatDate } from '@/utils/date';

interface TournamentCatchPickerModalProps {
  catches: TournamentCatchCandidate[];
  onClose: () => void;
  onSelect: (catchId: string) => void;
  visible: boolean;
}

export const TournamentCatchPickerModal = ({
  catches,
  onClose,
  onSelect,
  visible,
}: TournamentCatchPickerModalProps): JSX.Element => {
  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[80%] rounded-t-[32px] bg-main px-5 pb-8 pt-5">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-ink">Av seç</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={onClose}>
              <Text className="text-sm font-semibold text-sea">Kapat</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-3 pb-4">
              {catches.length ? (
                catches.map((item) => (
                  <TouchableOpacity activeOpacity={0.8}
                    className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-4"
                    key={item.id}
                    onPress={() => {
                      onSelect(item.id);
                      onClose();
                    }}
                  >
                    <Text className="text-base font-semibold text-ink">{item.speciesName}</Text>
                    <Text className="mt-1 text-sm text-white/70">
                      {[
                        item.lengthCm !== null ? `${item.lengthCm} cm` : null,
                        item.weightG !== null ? `${item.weightG} g` : null,
                        formatDate(item.createdAt),
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text className="text-center text-sm text-white/70">
                  Uygun av bulunamadı.
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
