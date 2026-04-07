import { StyleSheet, Text, TextInput, View } from 'react-native';

const COLORS = {
  surface: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',
  text: '#F8FAFC',
  textMuted: 'rgba(240,247,249,0.45)',
};

interface FormFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  keyboardType?: 'default' | 'numeric';
  multiline?: boolean;
}

export const FormField = ({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  keyboardType = 'default',
  multiline = false,
}: FormFieldProps): JSX.Element => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onBlur={onBlur}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        style={[styles.input, multiline && styles.inputMultiline]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    fontSize: 16,
    color: COLORS.text,
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: 12,
  },
});
