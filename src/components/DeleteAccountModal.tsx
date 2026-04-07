import { BlurView } from '@react-native-community/blur';
import {
  useState } from 'react';
import { Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

interface DeleteAccountModalProps {
  visible: boolean;
  loading: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteAccountModal = ({
  visible,
  loading,
  error,
  onClose,
  onConfirm,
}: DeleteAccountModalProps): JSX.Element => {
  const [confirmationText, setConfirmationText] = useState<string>('');

  const handleClose = (): void => {
    setConfirmationText('');
    onClose();
  };

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View style={styles.modalContainer}>
          {Platform.OS === 'ios' ? (
            <BlurView
              blurAmount={30}
              blurType="dark"
              reducedTransparencyFallbackColor="#16333B"
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View style={styles.modalContent}>
            <Text className="text-xl font-semibold text-[#A6422B]">Hesabı Sil</Text>
            <Text className="mt-3 text-base leading-7 text-white/70">
              Bu işlem geri alınamaz. Tüm avların ve rozetlerin silinecek.
            </Text>
            <Text className="mt-4 text-sm font-medium text-ink">
              Onaylamak için <Text className="font-semibold">SİL</Text> yaz.
            </Text>
            <TextInput
              autoCapitalize="characters"
              className="mt-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base text-ink"
              onChangeText={setConfirmationText}
              placeholder="SİL"
              placeholderTextColor="#8A958D"
              value={confirmationText}
            />
            {error ? <Text className="mt-3 text-sm text-[#A6422B]">{error}</Text> : null}
            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity
                activeOpacity={0.8}
                className="flex-1 items-center rounded-2xl border border-white/10 bg-white/10 px-4 py-4"
                onPress={handleClose}
              >
                <Text className="font-semibold text-ink">Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                className={`flex-1 items-center rounded-2xl px-4 py-4 ${
                  confirmationText === 'SİL' && !loading ? 'bg-[#A6422B]' : 'bg-[#E8B9AF]'
                }`}
                disabled={confirmationText !== 'SİL' || loading}
                onPress={() => {
                  void (async () => {
                    try {
                      await onConfirm();
                      setConfirmationText('');
                    } catch {
                      // Error is handled by parent via error prop
                    }
                  })();
                }}
              >
                <Text className="font-semibold text-white">Hesabı Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    width: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#16333B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  modalContent: {
    padding: 24,
  },
});
