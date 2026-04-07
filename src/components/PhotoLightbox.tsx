import { Ionicons } from '@expo/vector-icons';
import {
  Image,
  Modal,
  StyleSheet,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PhotoLightboxProps {
  uri: string;
  visible: boolean;
  onClose: () => void;
}

export const PhotoLightbox = ({
  uri,
  visible,
  onClose,
}: PhotoLightboxProps): JSX.Element => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.container}>
        <View style={[StyleSheet.absoluteFillObject, styles.backdrop]} />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onClose}
          style={[styles.closeButton, { top: Math.max(insets.top, 16) + 8 }]}
        >
          <Ionicons color="#FFFFFF" name="close" size={24} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={1}
          className="flex-1"
          onPress={onClose}
          style={styles.imageFrame}
        >
          <Image resizeMode="contain" source={{ uri }} style={styles.image} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  backdrop: {
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  imageFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
