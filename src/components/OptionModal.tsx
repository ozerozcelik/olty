import { BlurView } from '@react-native-community/blur';
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

const COLORS = {
  background: '#0B1622',
  surface: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',
  text: '#F8FAFC',
  accent: '#7DD4E8',
  accentMuted: 'rgba(125,212,232,0.10)',
};

interface OptionModalProps {
  title: string;
  visible: boolean;
  options: readonly string[];
  selectedValue?: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}

export const OptionModal = ({
  title,
  visible,
  options,
  selectedValue,
  onClose,
  onSelect,
}: OptionModalProps): JSX.Element => {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {Platform.OS === 'ios' ? (
            <BlurView
              blurAmount={30}
              blurType="dark"
              reducedTransparencyFallbackColor={COLORS.background}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={onClose}>
              <Text style={styles.closeBtn}>Kapat</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.optionList}>
              {options.map((option) => {
                const isSelected = selectedValue === option;

                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    key={option}
                    onPress={() => {
                      onSelect(option);
                      onClose();
                    }}
                    style={[styles.option, isSelected && styles.optionSelected]}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.40)',
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  optionList: {
    gap: 8,
    paddingBottom: 16,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  optionSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentMuted,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: COLORS.accent,
  },
});
