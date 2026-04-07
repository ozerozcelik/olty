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

import { signInWithEmail } from '@/services/auth.service';

const COLORS = {
  bgDeep: '#0D2830',
  bgHero: '#0D3D4A',
  bgCard: 'rgba(125,212,232,0.06)',
  borderDefault: 'rgba(125,212,232,0.18)',
  borderActive: '#7DD4E8',
  teal: '#7DD4E8',
  tealGlow: 'rgba(125,212,232,0.12)',
  textPrimary: '#E8F7FA',
  textSecondary: 'rgba(125,212,232,0.50)',
  textTertiary: 'rgba(125,212,232,0.30)',
  coral: '#E8845A',
  error: '#E85A5A',
  divider: 'rgba(125,212,232,0.12)',
  socialText: 'rgba(125,212,232,0.65)',
};

const loginSchema = z.object({
  email: z.string().email('Gecerli bir e-posta gir'),
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
          {/* Badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🎣 Olty</Text>
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🎣</Text>
          </View>

          {/* Title */}
          <Text style={styles.heroTitle}>
            Tekrar{'\n'}<Text style={styles.heroTitleAccent}>hoş geldin.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>Av günlüğüne devam et</Text>
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
              {formState.isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
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
            <Text style={styles.socialButtonText}>🍎  Apple ile devam et</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSocialLogin('Google')}
            style={styles.socialButton}
          >
            <Text style={styles.socialButtonText}>G  Google ile devam et</Text>
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  badge: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.tealGlow,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 12,
    color: COLORS.teal,
    fontWeight: '500',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.tealGlow,
    borderWidth: 1.5,
    borderColor: 'rgba(125,212,232,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 32,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '500',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  heroTitleAccent: {
    color: COLORS.teal,
  },
  heroSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
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
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputContainerActive: {
    borderColor: COLORS.borderActive,
    backgroundColor: 'rgba(125,212,232,0.10)',
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
    color: COLORS.teal,
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
    marginTop: 4,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
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
    borderRadius: 14,
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
    color: COLORS.teal,
  },
});

export default LoginScreen;
