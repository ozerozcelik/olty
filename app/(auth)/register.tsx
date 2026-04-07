import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { OptionModal } from '@/components/OptionModal';
import { FISHING_TYPE_OPTIONS, TURKEY_CITIES } from '@/lib/constants';
import { checkUsernameAvailability, signUpWithEmail } from '@/services/auth.service';
import type { FishingType } from '@/types/app.types';

const COLORS = {
  bgDeep: '#0D2830',
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
  success: '#5AE88C',
};

const registerSchema = z.object({
  email: z.string().email('Geçerli bir e-posta gir'),
  password: z
    .string()
    .min(8, 'En az 8 karakter')
    .regex(/[A-Z]/, 'En az bir büyük harf gerekli')
    .regex(/[a-z]/, 'En az bir küçük harf gerekli')
    .regex(/[0-9]/, 'En az bir rakam gerekli'),
  username: z
    .string()
    .min(3, 'En az 3 karakter')
    .max(30, 'En fazla 30 karakter')
    .regex(/^[a-z0-9_]+$/, 'Sadece küçük harf, rakam ve _ kullanabilirsin'),
  city: z.string().min(1, 'Şehir seç'),
  fishingTypes: z.array(z.string()).min(1, 'En az bir balıkçılık tipi seç'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

const PRIVACY_PLACEHOLDER =
  'Olty; hesap oluşturma, profil oluşturma, av paylaşımı ve güvenlik amaçlarıyla e-posta, kullanıcı adı, profil bilgileri ve gerekli teknik verileri işler. Pazarlama izni isteğe bağlıdır, zorunlu değildir.';

const RegisterScreen = (): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isPasswordHidden, setIsPasswordHidden] = useState<boolean>(true);
  const [cityModalVisible, setCityModalVisible] = useState<boolean>(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string>('');
  const [marketingConsent, setMarketingConsent] = useState<boolean>(false);
  const [kvkkConsent, setKvkkConsent] = useState<boolean>(false);
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const { control, handleSubmit, setValue, watch, formState } = useForm<RegisterFormValues>({
    defaultValues: {
      email: '',
      password: '',
      username: '',
      city: '',
      fishingTypes: [],
    },
    resolver: zodResolver(registerSchema),
  });

  const username = watch('username');
  const selectedCity = watch('city');
  const selectedFishingTypes = watch('fishingTypes');

  useEffect(() => {
    const normalizedUsername = username.trim();
    const isEligible = /^[a-z0-9_]{3,30}$/.test(normalizedUsername);

    if (!isEligible) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    setUsernameStatus('checking');
    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const isAvailable = await checkUsernameAvailability(normalizedUsername);
          setUsernameStatus(isAvailable ? 'available' : 'taken');
          setUsernameMessage(isAvailable ? 'Kullanıcı adı uygun' : 'Bu kullanıcı adı alınmış');
        } catch {
          setUsernameStatus('idle');
          setUsernameMessage('');
        }
      })();
    }, 500);

    return () => clearTimeout(timeout);
  }, [username]);

  const usernameHint = useMemo((): string => {
    if (usernameStatus === 'checking') return 'Kullanıcı adı kontrol ediliyor...';
    return usernameMessage;
  }, [usernameMessage, usernameStatus]);

  const toggleFishingType = (value: string): void => {
    const currentValues = selectedFishingTypes;
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];

    setValue('fishingTypes', nextValues, { shouldValidate: true });
  };

  const onSubmit = async (values: RegisterFormValues): Promise<void> => {
    if (!kvkkConsent) {
      return;
    }

    if (usernameStatus === 'checking') {
      setSubmitError('Kullanıcı adı kontrol ediliyor. Lütfen birkaç saniye bekleyin.');
      return;
    }

    const normalizedUsername = values.username.trim();
    const isUsernameAvailable =
      usernameStatus === 'available'
        ? true
        : await checkUsernameAvailability(normalizedUsername);

    if (!isUsernameAvailable) {
      setUsernameStatus('taken');
      setUsernameMessage('Bu kullanıcı adı alınmış');
      setSubmitError('Lütfen farklı bir kullanıcı adı seç.');
      return;
    }

    try {
      setSubmitError('');
      const result = await signUpWithEmail(
        values.email.trim(),
        values.password,
        normalizedUsername,
        values.city,
        values.fishingTypes as FishingType[],
        { marketingConsent },
      );

      if (result.requiresEmailConfirmation) {
        setVerificationEmail(values.email.trim());
        return;
      }

      router.replace('/(auth)/onboarding');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Kayıt oluşturulamadı.';
      setSubmitError(message);
    }
  };

  if (verificationEmail) {
    return (
      <View style={styles.container}>
        <View style={styles.verificationContent}>
          <View style={styles.verificationHeader}>
            <View style={styles.verificationIcon}>
              <Text style={styles.verificationEmoji}>✉️</Text>
            </View>
            <View style={styles.verificationTextWrap}>
              <Text style={styles.verificationTitle}>E-postanı doğrula</Text>
              <Text style={styles.verificationDesc}>
                {verificationEmail} adresine bir doğrulama bağlantısı gönderildi. E-postayı
                onayladıktan sonra giriş yapıp devam edebilirsiniz.
              </Text>
            </View>
          </View>

          <View style={styles.verificationNote}>
            <Text style={styles.verificationNoteText}>
              Bağlantı gelmediyse spam klasörünü de kontrol edin. Doğrulama tamamlanmadan
              onboarding akışı başlatılmaz.
            </Text>
          </View>
        </View>

        <Link asChild href="/(auth)/login">
          <TouchableOpacity activeOpacity={0.85} style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>Giriş ekranına dön</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.container}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top + 12, 32), paddingBottom: Math.max(insets.bottom, 40) + 60 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Geri</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>
              Olty{`'`}ye{'\n'}<Text style={styles.titleAccent}>katıl.</Text>
            </Text>
            <Text style={styles.subtitle}>Balıkçılık profilini oluştur</Text>
          </View>

          {/* Form */}
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
                      placeholder="En az 8 karakter"
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

            {/* Username Field */}
            <Controller
              control={control}
              name="username"
              render={({ field, fieldState }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>KULLANICI ADI</Text>
                  <View style={[
                    styles.inputContainer,
                    field.value ? styles.inputContainerActive : null,
                  ]}>
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={(value) => field.onChange(value.toLowerCase())}
                      placeholder="ornek_kullanici"
                      placeholderTextColor={COLORS.textTertiary}
                      style={styles.inputText}
                      value={field.value}
                    />
                    {usernameStatus === 'available' ? (
                      <Ionicons color={COLORS.success} name="checkmark-circle" size={18} />
                    ) : null}
                  </View>
                  {fieldState.error?.message ? (
                    <Text style={styles.errorText}>{fieldState.error.message}</Text>
                  ) : null}
                  {usernameHint && !fieldState.error?.message ? (
                    <Text style={[
                      styles.hintText,
                      usernameStatus === 'taken' ? styles.hintError : styles.hintSuccess,
                    ]}>
                      {usernameHint}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            {/* City Picker */}
            <Controller
              control={control}
              name="city"
              render={({ fieldState }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>ŞEHİR</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setCityModalVisible(true)}
                    style={[
                      styles.inputContainer,
                      selectedCity ? styles.inputContainerActive : null,
                    ]}
                  >
                    <Text style={selectedCity ? styles.inputText : styles.placeholderText}>
                      {selectedCity || 'Şehir seç'}
                    </Text>
                    <Text style={styles.arrowIcon}>›</Text>
                  </TouchableOpacity>
                  {fieldState.error?.message ? (
                    <Text style={styles.errorText}>{fieldState.error.message}</Text>
                  ) : null}
                </View>
              )}
            />

            {/* Fishing Types */}
            <Controller
              control={control}
              name="fishingTypes"
              render={({ fieldState }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>BALIKÇILIK TİPİ</Text>
                  <View style={styles.pillRow}>
                    {FISHING_TYPE_OPTIONS.map((option) => {
                      const isSelected = selectedFishingTypes.includes(option.value);
                      return (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          key={option.value}
                          onPress={() => toggleFishingType(option.value)}
                          style={[styles.pill, isSelected && styles.pillSelected]}
                        >
                          <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {fieldState.error?.message ? (
                    <Text style={styles.errorText}>{fieldState.error.message}</Text>
                  ) : null}
                </View>
              )}
            />

            {/* KVKK Consent */}
            <View style={styles.kvkkBox}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setKvkkConsent((current) => !current)}
                style={styles.checkbox}
              >
                {kvkkConsent ? (
                  <Ionicons color={COLORS.teal} name="checkmark" size={14} />
                ) : null}
              </TouchableOpacity>
              <Text style={styles.kvkkText}>
                Kişisel verilerimin işlenmesine ilişkin{' '}
                <Text
                  onPress={() => setPrivacyModalVisible(true)}
                  style={styles.kvkkLink}
                >
                  KVKK Aydınlatma Metni
                </Text>
                {`'`}ni okudum ve kabul ediyorum.
              </Text>
            </View>

            {/* Marketing Consent */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setMarketingConsent((current) => !current)}
              style={styles.marketingRow}
            >
              <View style={[styles.checkboxSmall, marketingConsent && styles.checkboxSmallActive]}>
                {marketingConsent ? (
                  <Ionicons color={COLORS.teal} name="checkmark" size={12} />
                ) : null}
              </View>
              <Text style={styles.marketingText}>
                Kampanya ve duyurulardan haberdar olmak istiyorum.
              </Text>
            </TouchableOpacity>

            {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

            {/* CTA Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!kvkkConsent || formState.isSubmitting}
              onPress={handleSubmit((values) => void onSubmit(values))}
              style={[styles.ctaButton, (!kvkkConsent || formState.isSubmitting) && styles.ctaButtonDisabled]}
            >
              <Text style={styles.ctaButtonText}>
                {formState.isSubmitting ? 'Kaydediliyor...' : 'Hesap Oluştur'}
              </Text>
            </TouchableOpacity>

            {/* Login Link */}
            <Link asChild href="/(auth)/login">
              <TouchableOpacity activeOpacity={0.8} style={styles.ghostLink}>
                <Text style={styles.ghostLinkText}>
                  Zaten üye misin? <Text style={styles.ghostLinkAccent}>Giriş yap</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <OptionModal
        onClose={() => setCityModalVisible(false)}
        onSelect={(value) => setValue('city', value, { shouldValidate: true })}
        options={TURKEY_CITIES}
        selectedValue={selectedCity}
        title="Şehir seç"
        visible={cityModalVisible}
      />

      <Modal animationType="slide" transparent visible={privacyModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Aydınlatma Metni</Text>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setPrivacyModalVisible(false)}>
                <Text style={styles.modalClose}>Kapat</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBody}>{PRIVACY_PLACEHOLDER}</Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  scrollContent: {
    gap: 20,
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  headerSection: {
    gap: 6,
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  titleAccent: {
    color: COLORS.teal,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  formSection: {
    gap: 18,
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
  placeholderText: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  arrowIcon: {
    fontSize: 18,
    color: COLORS.textTertiary,
  },
  hintText: {
    fontSize: 11,
    paddingLeft: 2,
  },
  hintSuccess: {
    color: COLORS.success,
  },
  hintError: {
    color: COLORS.error,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    backgroundColor: 'rgba(125,212,232,0.04)',
  },
  pillSelected: {
    borderColor: COLORS.teal,
    backgroundColor: 'rgba(125,212,232,0.15)',
  },
  pillText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  pillTextSelected: {
    fontWeight: '500',
    color: COLORS.teal,
  },
  kvkkBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 11,
    paddingRight: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(125,212,232,0.12)',
    backgroundColor: 'rgba(125,212,232,0.05)',
  },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.teal,
    backgroundColor: 'rgba(125,212,232,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  kvkkText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  kvkkLink: {
    color: COLORS.teal,
  },
  marketingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 2,
  },
  checkboxSmall: {
    width: 15,
    height: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxSmallActive: {
    borderColor: COLORS.teal,
    backgroundColor: 'rgba(125,212,232,0.15)',
  },
  marketingText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textTertiary,
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
  ghostLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 11,
  },
  ghostLinkText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  ghostLinkAccent: {
    color: COLORS.teal,
  },
  // Verification screen
  verificationContent: {
    gap: 32,
  },
  verificationHeader: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 40,
  },
  verificationIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.tealGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationEmoji: {
    fontSize: 48,
  },
  verificationTextWrap: {
    alignItems: 'center',
    gap: 12,
  },
  verificationTitle: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  verificationDesc: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  verificationNote: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    backgroundColor: COLORS.bgCard,
  },
  verificationNoteText: {
    fontSize: 12,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  // Privacy modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  modalContent: {
    backgroundColor: COLORS.bgDeep,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalClose: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.teal,
  },
  modalBody: {
    fontSize: 13,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
});

export default RegisterScreen;
