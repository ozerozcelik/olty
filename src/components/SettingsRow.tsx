import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

const COLORS = {
  surface: 'rgba(255,255,255,0.05)',
  text: '#F8FAFC',
  textMuted: 'rgba(240,247,249,0.45)',
  accent: '#7DD4E8',
};

interface SettingsRowProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export const SettingsRow = ({
  label,
  icon,
  onPress,
}: SettingsRowProps): JSX.Element => {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.row}>
      <View style={styles.left}>
        <Ionicons color={COLORS.accent} name={icon} size={20} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Ionicons color={COLORS.textMuted} name="chevron-forward" size={18} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
});
