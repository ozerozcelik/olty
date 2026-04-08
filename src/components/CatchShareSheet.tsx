import { Modal, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TouchableOpacity } from '@/components/TouchableOpacity';

interface CatchShareSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onShareInMessages: () => void;
  onShareExternally: () => void;
}

export const CatchShareSheet = ({
  visible,
  title,
  onClose,
  onShareInMessages,
  onShareExternally,
}: CatchShareSheetProps): JSX.Element => {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View className="flex-1 justify-end bg-black/35">
        <TouchableOpacity activeOpacity={0.8} className="flex-1" onPress={onClose} />
        <View className="rounded-t-[32px] bg-main px-5 pb-8 pt-5">
          <View className="mb-5 items-center">
            <View className="h-1.5 w-14 rounded-full bg-white/15" />
            <Text className="mt-4 text-xl font-semibold text-ink">Gönderiyi Paylaş</Text>
            <Text className="mt-2 text-center text-sm text-white/70">{title}</Text>
          </View>

          <View className="gap-3">
            <TouchableOpacity
              activeOpacity={0.8}
              className="flex-row items-center gap-3 rounded-[24px] border border-white/10 bg-white/10 px-4 py-4"
              onPress={onShareInMessages}
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-sea/10">
                <Ionicons color="#D4FF00" name="chatbubble-ellipses-outline" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-ink">Mesajla gönder</Text>
                <Text className="mt-1 text-sm text-white/70">
                  Uygulama içinde birine gönder
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              className="flex-row items-center gap-3 rounded-[24px] border border-white/10 bg-white/10 px-4 py-4"
              onPress={onShareExternally}
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-coral/10">
                <Ionicons color="#FF5500" name="share-social-outline" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-ink">Linki paylaş</Text>
                <Text className="mt-1 text-sm text-white/70">
                  Diğer uygulamalarda bağlantı olarak paylaş
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            className="mt-4 items-center rounded-[24px] border border-white/10 bg-white/10 px-4 py-4"
            onPress={onClose}
          >
            <Text className="text-base font-semibold text-ink">Vazgeç</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
