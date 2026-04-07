import { StyleSheet, Switch, Text, View } from 'react-native';

const COLORS = {
  surface: 'rgba(255,255,255,0.05)',
  text: '#F8FAFC',
};

interface SettingsToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export const SettingsToggleRow = ({
  label,
  value,
  onValueChange,
}: SettingsToggleRowProps): JSX.Element => {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch onValueChange={onValueChange} value={value} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
});
