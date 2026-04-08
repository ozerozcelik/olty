import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

const COLORS = {
  background: '#050608',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textMuted: '#8B92A5',
  error: '#FF5500',
};

interface AuthTextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences';
  error?: string;
  showToggle?: boolean;
  onToggleSecureEntry?: () => void;
}

export const AuthTextField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  error,
  showToggle = false,
  onToggleSecureEntry,
}: AuthTextFieldProps): JSX.Element => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureTextEntry}
          style={styles.input}
          value={value}
        />
        {showToggle ? (
          <TouchableOpacity activeOpacity={0.8} onPress={onToggleSecureEntry} style={styles.toggle}>
            <Ionicons
              color={COLORS.textMuted}
              name={secureTextEntry ? 'eye-off-outline' : 'eye-outline'}
              size={22}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  toggle: {
    marginLeft: 12,
  },
  error: {
    fontSize: 14,
    color: COLORS.error,
  },
});
