import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

const COLORS = {
  text: '#FFFFFF',
  accent: '#D4FF00',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.10)',
};

interface CheckboxFieldProps {
  checked: boolean;
  label: string;
  onPress: () => void;
  actionLabel?: string;
  onActionPress?: () => void;
}

export const CheckboxField = ({
  checked,
  label,
  onPress,
  actionLabel,
  onActionPress,
}: CheckboxFieldProps): JSX.Element => {
  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.checkboxWrap}>
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <Ionicons color="#FFFFFF" name="checkmark" size={16} /> : null}
        </View>
      </TouchableOpacity>
      <View style={styles.labelWrap}>
        <Text style={styles.label}>{label} </Text>
        {actionLabel && onActionPress ? (
          <TouchableOpacity activeOpacity={0.8} onPress={onActionPress}>
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkboxWrap: {
    paddingTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
  },
  labelWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    lineHeight: 24,
    color: COLORS.text,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 24,
    color: COLORS.accent,
  },
});
