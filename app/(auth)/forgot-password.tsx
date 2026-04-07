import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { requestPasswordReset } from '@/services/auth.service';

const COLORS = {
  bgDeep: '#0D2830',
  bgCard: 'rgba(125,212,232,0.06)',
  borderDefault: 'rgba(125,212,232,0.18)',
  borderActive: '#7DD4E8',
  teal: '#7DD4E8',
  textPrimary: '#E8F7FA',
  textSecondary: 'rgba(125,212,232,0.50)',
  textTertiary: 'rgba(125,212,232,0.30)',
  coral: '#E8845A',
  error: '#E85A5A',
  success: '#5AE88C',
};

const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta gir'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordScreen = (): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [submitError, setSubmitError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const { control, handleSubmit, formState } = useForm<ForgotPasswordFormValues>({
    defaultValues: { email: '' },
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordFormValues): Promise<void> => {
    try {
      setSubmitError('');
      await requestPasswordReset(values.email.trim());
      setIsSuccess(true);
    } catch {
      // Always show success to prevent email enumeration
      setIsSuccess(true);
    }
  };

  if (isSuccess) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons color={COLORS.success} name="mail-outline" size={48} />
          </View>
          <Text style={styles.successTitle}>E-posta Gönderildi</Text>
          <Text style={styles.successText}>
            Eğer bu e-posta ile kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.
            Spam klasörünü de kontrol etmeyi unutma.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.back()}
            style={styles.ctaButton}
          >
            <Text style={styles.ctaButtonText}>Giriş Sayfasına Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons color={COLORS.teal} name="arrow-back" size={24} />
        </TouchableOpacity>

        <View style={styles.headerSection}>
          <Text style={styles.title}>Şifreni mi{'\n'}unuttun?</Text>
          <Text style={styles.subtitle}>
            E-posta adresini gir, sana şifre sıfırlama bağlantısı gönderelim.
          </Text>
        </View>

        <View style={styles.formSection}>
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>E-POSTA</Text>
                <View
                  style={[
                    styles.inputContainer,
                    field.value ? styles.inputContainerActive : null,
                  ]}
                >
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    onChangeText={field.onChange}
                    placeholder="ornek@mail.com"
                    placeholderTextColor={COLORS.textTertiary}
                    style={styles.inputText}
                    value={field.value}
                  />
                </View>
                {fieldState.error?.message ? (
                  <Text style={styles.errorText}>{fieldState.error.message}</Text>
                ) : null}
              </View>
            )}
          />

          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={formState.isSubmitting}
            onPress={handleSubmit((values) => void onSubmit(values))}
            style={[styles.ctaButton, formState.isSubmitting && styles.ctaButtonDisabled]}
          >
            <Text style={styles.ctaButtonText}>
              {formState.isSubmitting ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  headerSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  formSection: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.textSecondary,
    marginBottom: 1,
    paddingLeft: 2,
  },
  inputContainer: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  inputContainerActive: {
    borderColor: COLORS.borderActive,
    backgroundColor: 'rgba(125,212,232,0.10)',
  },
  inputText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.error,
    paddingLeft: 2,
  },
  ctaButton: {
    backgroundColor: COLORS.coral,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(90,232,140,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
});

export default ForgotPasswordScreen;
