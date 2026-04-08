import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { z } from 'zod';

import { SPORT_THEME } from '@/lib/sport-theme';
import { signInWithEmail } from '@/services/auth.service';

const COLORS = {
  bgDeep: SPORT_THEME.bg,
  bgHero: '#0A0C10',
  bgCard: 'rgba(255,255,255,0.04)',
  borderDefault: SPORT_THEME.border,
  borderActive: SPORT_THEME.active,
  volt: SPORT_THEME.active,
  voltGlow: 'rgba(212,255,0,0.16)',
  textPrimary: SPORT_THEME.text,
  textSecondary: SPORT_THEME.textMuted,
  textTertiary: 'rgba(139,146,165,0.65)',
  orange: SPORT_THEME.warning,
  error: '#F87171',
  divider: 'rgba(255,255,255,0.08)',
  socialText: 'rgba(255,255,255,0.88)',
};

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta gir'),
  password: z.string().min(1, 'Şifre gerekli'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginScreen = (): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isPasswordHidden, setIsPasswordHidden] = useState<boolean>(true);
  const [submitError, setSubmitError] = useState<string>('');
  const { control, handleSubmit, formState } = useForm<LoginFormValues>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    try {
      setSubmitError('');
      await signInWithEmail(values.email.trim(), values.password);
      router.replace('/(tabs)');
    } catch {
      // Generic error message to prevent email enumeration
      setSubmitError('E-posta veya şifre hatalı.');
    }
  };

  const handleSocialLogin = (provider: string): void => {
    Alert.alert('Yakında', `${provider} ile giriş yakında aktif olacak.`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      style={styles.container}
    >
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={[COLORS.bgHero, COLORS.bgDeep]}
          end={{ x: 0.3, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={[styles.heroSection, { paddingTop: Math.max(insets.top + 16, 48) }]}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>OLTY.</Text>
          </View>

          <Text style={styles.heroTitle}>
            TRACK THE STRIKE.{"\n"}
            <Text style={styles.heroTitleAccent}>OWN THE WATER.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>Hesabina gir ve performansini loglamaya devam et.</Text>
        </LinearGradient>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Email Field */}
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>E-POSTA</Text>
                <View style={[
                  styles.inputContainer,
                  field.value ? styles.inputContainerActive : null,
                ]}>
                  <TextInput
                    autoCapitalize="none"
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

          {/* Password Field */}
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>ŞİFRE</Text>
                <View style={[
                  styles.inputContainer,
                  field.value ? styles.inputContainerActive : null,
                ]}>
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={field.onChange}
                    placeholder="Şifren"
                    placeholderTextColor={COLORS.textTertiary}
                    secureTextEntry={isPasswordHidden}
                    style={[styles.inputText, { flex: 1 }]}
                    value={field.value}
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsPasswordHidden((current) => !current)}
                  >
                    <Ionicons
                      color={COLORS.textSecondary}
                      name={isPasswordHidden ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                    />
                  </TouchableOpacity>
                </View>
                {fieldState.error?.message ? (
                  <Text style={styles.errorText}>{fieldState.error.message}</Text>
                ) : null}
              </View>
            )}
          />

          {/* Forgot Password */}
          <Link asChild href="/(auth)/forgot-password">
            <TouchableOpacity activeOpacity={0.8} style={styles.forgotLink}>
              <Text style={styles.forgotLinkText}>Şifremi unuttum</Text>
            </TouchableOpacity>
          </Link>

          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

          {/* CTA Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={formState.isSubmitting}
            onPress={handleSubmit((values) => void onSubmit(values))}
            style={[styles.ctaButton, formState.isSubmitting && styles.ctaButtonDisabled]}
          >
            <Text style={styles.ctaButtonText}>
              {formState.isSubmitting ? 'Bağlanıyor...' : 'Giriş Yap'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>veya</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSocialLogin('Apple')}
            style={styles.socialButton}
          >
            <Text style={styles.socialButtonText}>Apple ile devam et</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSocialLogin('Google')}
            style={styles.socialButton}
          >
            <Text style={styles.socialButtonText}>Google ile devam et</Text>
          </TouchableOpacity>

          {/* Register Link */}
          <Link asChild href="/(auth)/register">
            <TouchableOpacity activeOpacity={0.8} style={styles.ghostLink}>
              <Text style={styles.ghostLinkText}>
                Hesabın yok mu? <Text style={styles.ghostLinkAccent}>Kayıt ol</Text>
              </Text>
            </TouchableOpacity>
          </Link>
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
  },
  // Hero Section
  heroSection: {
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginBottom: 28,
  },
  badgeText: {
    fontSize: 20,
    letterSpacing: 0.4,
    color: COLORS.volt,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: 0.5,
    color: COLORS.textPrimary,
    textAlign: 'left',
  },
  heroTitleAccent: {
    color: COLORS.textSecondary,
  },
  heroSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 14,
  },
  // Form Section
  formSection: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 32,
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
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputContainerActive: {
    borderColor: COLORS.borderActive,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  inputText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  forgotLinkText: {
    fontSize: 11,
    color: COLORS.volt,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.error,
    paddingLeft: 2,
  },
  ctaButton: {
    backgroundColor: COLORS.volt,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: COLORS.volt,
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0A0C10',
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },
  dividerText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginHorizontal: 12,
  },
  socialButton: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  socialButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.socialText,
  },
  ghostLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  ghostLinkText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  ghostLinkAccent: {
    color: COLORS.volt,
  },
});

export default LoginScreen;
