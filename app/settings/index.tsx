import {
  zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { Stack,
  useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Controller,
  type FieldPath,
  useForm } from 'react-hook-form';
import { useState } from 'react';
import { ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { z } from 'zod';

import { AuthTextField } from '@/components/AuthTextField';
import { AdminOnly } from '@/components/AdminOnly';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { OptionModal } from '@/components/OptionModal';
import { PasswordChangeModal } from '@/components/PasswordChangeModal';
import { SettingsSection } from '@/components/SettingsSection';
import { SettingsRow } from '@/components/SettingsRow';
import { SettingsToggleRow } from '@/components/SettingsToggleRow';
import { FISHING_TYPE_OPTIONS, TURKEY_CITIES } from '@/lib/constants';
import { requestAccountDeletion, signOut, updatePassword } from '@/services/auth.service';
import { moderateImage } from '@/services/moderation.service';
import { updateProfile } from '@/services/profiles.service';
import { uploadAvatar } from '@/services/storage.service';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePreferencesStore } from '@/stores/usePreferencesStore';
import type { FishingType, ProfileRow, ProfileUpdate } from '@/types/app.types';
import { normalizeSocialLink, SOCIAL_LINK_FIELDS } from '@/utils/socialLinks';

const BIO_MAX_LENGTH = 160;
const BIO_SUGGESTIONS = [
  'Kiyi avcisi',
  'C&R tutkunu',
  'Spin ve shore jig',
  'Turnuva pesinde',
] as const;

const settingsSchema = z.object({
  displayName: z.string().max(50, 'En fazla 50 karakter').optional(),
  bio: z.string().max(BIO_MAX_LENGTH, `En fazla ${BIO_MAX_LENGTH} karakter`).optional(),
  city: z.string().min(1, 'Şehir seç'),
  fishingTypes: z.array(z.string()).min(1, 'En az bir balıkçılık tipi seç'),
  instagramUrl: z.string().max(255, 'En fazla 255 karakter').optional(),
  xUrl: z.string().max(255, 'En fazla 255 karakter').optional(),
  youtubeUrl: z.string().max(255, 'En fazla 255 karakter').optional(),
  tiktokUrl: z.string().max(255, 'En fazla 255 karakter').optional(),
  websiteUrl: z.string().max(255, 'En fazla 255 karakter').optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const SOCIAL_FORM_FIELD_MAP = {
  instagram_url: 'instagramUrl',
  x_url: 'xUrl',
  youtube_url: 'youtubeUrl',
  tiktok_url: 'tiktokUrl',
  website_url: 'websiteUrl',
} as const satisfies Record<
  (typeof SOCIAL_LINK_FIELDS)[number]['key'],
  FieldPath<SettingsFormValues>
>;

const getSettingsFormValues = (profile: ProfileRow): SettingsFormValues => ({
  displayName: profile.display_name ?? '',
  bio: profile.bio ?? '',
  city: profile.city ?? '',
  fishingTypes: profile.fishing_type ?? [],
  instagramUrl: profile.instagram_url ?? '',
  xUrl: profile.x_url ?? '',
  youtubeUrl: profile.youtube_url ?? '',
  tiktokUrl: profile.tiktok_url ?? '',
  websiteUrl: profile.website_url ?? '',
});

const SettingsScreen = (): JSX.Element => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  const setProfile = useAuthStore((state) => state.setProfile);
  const session = useAuthStore((state) => state.session);
  const windSpeedUnit = usePreferencesStore((state) => state.windSpeedUnit);
  const setWindSpeedUnit = usePreferencesStore((state) => state.setWindSpeedUnit);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [cityModalVisible, setCityModalVisible] = useState<boolean>(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string>('');
  const [notifLikes, setNotifLikes] = useState<boolean>(profile?.notif_likes ?? true);
  const [notifComments, setNotifComments] = useState<boolean>(profile?.notif_comments ?? true);
  const [notifFollows, setNotifFollows] = useState<boolean>(profile?.notif_follows ?? true);
  const [notifWeather, setNotifWeather] = useState<boolean>(profile?.notif_weather ?? true);
  const [locationPrivate, setLocationPrivate] = useState<boolean>(profile?.location_private ?? false);
  const [isPrivate, setIsPrivate] = useState<boolean>(profile?.is_private ?? false);
  const [showCityPublic, setShowCityPublic] = useState<boolean>(profile?.show_city_public ?? true);
  const [showBioPublic, setShowBioPublic] = useState<boolean>(profile?.show_bio_public ?? true);
  const [showFishingTypesPublic, setShowFishingTypesPublic] = useState<boolean>(
    profile?.show_fishing_types_public ?? true,
  );
  const [showSocialLinksPublic, setShowSocialLinksPublic] = useState<boolean>(
    profile?.show_social_links_public ?? true,
  );
  const [showGearPublic, setShowGearPublic] = useState<boolean>(profile?.show_gear_public ?? true);
  const [showFishdexPublic, setShowFishdexPublic] = useState<boolean>(
    profile?.show_fishdex_public ?? true,
  );
  const { control, handleSubmit, reset, setValue, watch, formState } = useForm<SettingsFormValues>({
    defaultValues: profile ? getSettingsFormValues(profile) : undefined,
    resolver: zodResolver(settingsSchema),
  });

  if (!profile || !session?.user.id) {
    return <View style={styles.emptyContainer} />;
  }

  const displayName = watch('displayName') ?? '';
  const bio = watch('bio') ?? '';
  const city = watch('city');
  const fishingTypes = watch('fishingTypes');
  const instagramUrl = watch('instagramUrl') ?? '';
  const xUrl = watch('xUrl') ?? '';
  const youtubeUrl = watch('youtubeUrl') ?? '';
  const tiktokUrl = watch('tiktokUrl') ?? '';
  const websiteUrl = watch('websiteUrl') ?? '';
  const avatarSource = avatarUri ?? profile.avatar_url ?? undefined;
  const remainingBioChars = BIO_MAX_LENGTH - bio.length;
  const hasChanges =
    Boolean(avatarUri) ||
    displayName !== (profile.display_name ?? '') ||
    bio !== (profile.bio ?? '') ||
    city !== (profile.city ?? '') ||
    JSON.stringify(fishingTypes) !== JSON.stringify(profile.fishing_type ?? []) ||
    normalizeSocialLink(instagramUrl, 'instagram_url') !== (profile.instagram_url ?? null) ||
    normalizeSocialLink(xUrl, 'x_url') !== (profile.x_url ?? null) ||
    normalizeSocialLink(youtubeUrl, 'youtube_url') !== (profile.youtube_url ?? null) ||
    normalizeSocialLink(tiktokUrl, 'tiktok_url') !== (profile.tiktok_url ?? null) ||
    normalizeSocialLink(websiteUrl, 'website_url') !== (profile.website_url ?? null) ||
    notifLikes !== profile.notif_likes ||
    notifComments !== profile.notif_comments ||
    notifFollows !== profile.notif_follows ||
    notifWeather !== profile.notif_weather ||
    locationPrivate !== profile.location_private ||
    isPrivate !== profile.is_private ||
    showCityPublic !== profile.show_city_public ||
    showBioPublic !== profile.show_bio_public ||
    showFishingTypesPublic !== profile.show_fishing_types_public ||
    showSocialLinksPublic !== profile.show_social_links_public ||
    showGearPublic !== profile.show_gear_public ||
    showFishdexPublic !== profile.show_fishdex_public;

  const pickAvatar = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: 'images',
      quality: 1,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0]?.uri ?? null);
    }
  };

  const toggleFishingType = (value: string): void => {
    const nextValues = fishingTypes.includes(value)
      ? fishingTypes.filter((item) => item !== value)
      : [...fishingTypes, value];

    setValue('fishingTypes', nextValues, { shouldValidate: true, shouldDirty: true });
  };

  const handleBioSuggestionPress = (suggestion: string): void => {
    const currentBio = (watch('bio') ?? '').trim();
    const nextBio = currentBio ? `${currentBio}\n${suggestion}` : suggestion;

    setValue('bio', nextBio.slice(0, BIO_MAX_LENGTH), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const saveSettings = async (values: SettingsFormValues): Promise<void> => {
    setSaveLoading(true);

    try {
      let avatarUrl = profile.avatar_url;

      if (avatarUri) {
        const moderationResult = await moderateImage(avatarUri);

        if (!moderationResult.safe) {
          Alert.alert(
            'Uygunsuz İçerik',
            'Yüklediğiniz fotoğraf uygunsuz içerik barındırıyor ve paylaşılamaz.',
            [{ text: 'Tamam' }],
          );
          return;
        }

        avatarUrl = await uploadAvatar(avatarUri, session.user.id);
      }

      const payload: ProfileUpdate = {
        avatar_url: avatarUrl,
        display_name: values.displayName?.trim() || null,
        bio: values.bio?.trim() || null,
        city: values.city,
        fishing_type: values.fishingTypes as FishingType[],
        instagram_url: normalizeSocialLink(values.instagramUrl, 'instagram_url'),
        x_url: normalizeSocialLink(values.xUrl, 'x_url'),
        youtube_url: normalizeSocialLink(values.youtubeUrl, 'youtube_url'),
        tiktok_url: normalizeSocialLink(values.tiktokUrl, 'tiktok_url'),
        website_url: normalizeSocialLink(values.websiteUrl, 'website_url'),
        notif_likes: notifLikes,
        notif_comments: notifComments,
        notif_follows: notifFollows,
        notif_weather: notifWeather,
        location_private: locationPrivate,
        is_private: isPrivate,
        show_city_public: showCityPublic,
        show_bio_public: showBioPublic,
        show_fishing_types_public: showFishingTypesPublic,
        show_social_links_public: showSocialLinksPublic,
        show_gear_public: showGearPublic,
        show_fishdex_public: showFishdexPublic,
      };

      const updatedProfile = await updateProfile(session.user.id, payload);
      setProfile(updatedProfile);
      queryClient.setQueryData(['profile-details', session.user.id], (current: unknown) => {
        if (!current || typeof current !== 'object') {
          return current;
        }

        return {
          ...(current as Record<string, unknown>),
          ...updatedProfile,
        };
      });
      queryClient.setQueryData(['profile-by-username', updatedProfile.username], updatedProfile);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile-details', session.user.id] }),
        queryClient.invalidateQueries({ queryKey: ['profile-by-username', updatedProfile.username] }),
      ]);
      setAvatarUri(null);
      reset(getSettingsFormValues(updatedProfile));
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePasswordSubmit = async (password: string): Promise<void> => {
    setPasswordLoading(true);
    setPasswordError('');

    try {
      await updatePassword(password);
      setPasswordModalVisible(false);
    } catch (error: unknown) {
      setPasswordError(error instanceof Error ? error.message : 'Şifre güncellenemedi.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAccountDeletion = async (): Promise<void> => {
    setDeleteLoading(true);
    setDeleteError('');

    try {
      await requestAccountDeletion(session.user.id);
      await signOut();
      setDeleteModalVisible(false);
      router.replace('/(auth)/login');
    } catch (error: unknown) {
      setDeleteError(error instanceof Error ? error.message : 'Silme talebi gönderilemedi.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderSaveButton = (): JSX.Element => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.headerSaveButton, hasChanges && !saveLoading && styles.headerSaveButtonActive]}
        disabled={!hasChanges || saveLoading}
        onPress={handleSubmit((values) => void saveSettings(values))}
      >
        {saveLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.headerSaveButtonText}>Kaydet</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerRight: renderSaveButton, title: 'Ayarlar' }} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <SettingsSection title="Profil">
          <TouchableOpacity activeOpacity={0.8} style={styles.avatarContainer} onPress={() => void pickAvatar()}>
            <View style={styles.avatarWrapper}>
              {avatarSource ? (
                <Image
                  onError={(e) => console.error('settings avatar error:', e.nativeEvent.error)}
                  resizeMode="cover"
                  source={{ uri: avatarSource }}
                  style={{ width: 96, height: 96 }}
                />
              ) : null}
            </View>
            <Text style={styles.avatarChangeText}>Avatarı değiştir</Text>
          </TouchableOpacity>

          <Controller
            control={control}
            name="displayName"
            render={({ field, fieldState }) => (
              <AuthTextField
                error={fieldState.error?.message}
                label="Görünen ad"
                onChangeText={field.onChange}
                placeholder="Adın nasıl görünsün?"
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name="bio"
            render={({ field, fieldState }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Biyografi</Text>
                <View style={styles.suggestionsRow}>
                  {BIO_SUGGESTIONS.map((suggestion) => (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.suggestionPill}
                      key={suggestion}
                      onPress={() => handleBioSuggestionPress(suggestion)}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.bioInput}
                  maxLength={BIO_MAX_LENGTH}
                  multiline
                  onChangeText={field.onChange}
                  placeholder="Kendinden kisaca bahset. Av tarzini, sevdigin turleri veya sehri yazabilirsin."
                  placeholderTextColor="rgba(240,247,249,0.45)"
                  textAlignVertical="top"
                  value={field.value ?? ''}
                />
                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>
                    Profil Onizleme
                  </Text>
                  <Text style={styles.previewUsername}>
                    @{profile.username}
                  </Text>
                  <Text style={styles.previewBio}>
                    {bio.trim() || 'Bio eklendiginde profilinde burada gorunecek.'}
                  </Text>
                </View>
                <View style={styles.charCountRow}>
                  <Text style={styles.errorText}>{fieldState.error?.message ?? ''}</Text>
                  <Text style={remainingBioChars <= 20 ? styles.charCountWarning : styles.charCount}>
                    {bio.length}/{BIO_MAX_LENGTH}
                  </Text>
                </View>
              </View>
            )}
          />

          <Controller
            control={control}
            name="city"
            render={({ fieldState }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Şehir</Text>
                <TouchableOpacity activeOpacity={0.8}
                  style={styles.selectButton}
                  onPress={() => setCityModalVisible(true)}
                >
                  <Text style={city ? styles.selectButtonTextSelected : styles.selectButtonText}>
                    {city || 'Şehir seç'}
                  </Text>
                </TouchableOpacity>
                {fieldState.error?.message ? (
                  <Text style={styles.errorText}>{fieldState.error.message}</Text>
                ) : null}
              </View>
            )}
          />

          <View style={styles.fieldContainerLarge}>
            <Text style={styles.fieldLabel}>Sosyal profiller</Text>
            <Text style={styles.fieldDescription}>
              Instagram, X, YouTube, TikTok veya web siteni ekleyebilirsin. Kullanıcı adı ya da tam link fark etmez.
            </Text>
            {SOCIAL_LINK_FIELDS.map((field) => {
              const formKey = SOCIAL_FORM_FIELD_MAP[field.key];

              return (
                <Controller
                  control={control}
                  key={field.key}
                  name={formKey}
                  render={({ field: controllerField, fieldState }) => (
                    <AuthTextField
                      autoCapitalize="none"
                      error={fieldState.error?.message}
                      label={field.label}
                      onChangeText={controllerField.onChange}
                      placeholder={field.placeholder}
                      value={controllerField.value ?? ''}
                    />
                  )}
                />
              );
            })}
          </View>

          <View style={styles.fieldContainerLarge}>
            <Text style={styles.fieldLabel}>Balıkçılık tipi</Text>
            <View style={styles.typesRow}>
              {FISHING_TYPE_OPTIONS.map((option) => {
                const isSelected = fishingTypes.includes(option.value);

                return (
                  <TouchableOpacity activeOpacity={0.8}
                    key={option.value}
                    style={[styles.typePill, isSelected && styles.typePillSelected]}
                    onPress={() => toggleFishingType(option.value)}
                  >
                    <Text style={isSelected ? styles.typePillTextSelected : styles.typePillText}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {formState.errors.fishingTypes?.message ? (
              <Text style={styles.errorText}>{formState.errors.fishingTypes.message}</Text>
            ) : null}
          </View>
        </SettingsSection>

        <SettingsSection title="Bildirim Ayarları">
          <SettingsToggleRow label="Beğeni bildirimleri" onValueChange={setNotifLikes} value={notifLikes} />
          <SettingsToggleRow label="Yorum bildirimleri" onValueChange={setNotifComments} value={notifComments} />
          <SettingsToggleRow label="Yeni takipçi bildirimleri" onValueChange={setNotifFollows} value={notifFollows} />
          <SettingsToggleRow label="Günlük hava durumu bildirimi" onValueChange={setNotifWeather} value={notifWeather} />
        </SettingsSection>

        <SettingsSection title="Hava ve Deniz">
          <View style={styles.fieldContainerLarge}>
            <Text style={styles.fieldLabel}>Rüzgar birimi</Text>
            <View style={styles.unitRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.unitButton, windSpeedUnit === 'kmh' && styles.unitButtonSelected]}
                onPress={() => setWindSpeedUnit('kmh')}
              >
                <Text style={windSpeedUnit === 'kmh' ? styles.unitButtonTextSelected : styles.unitButtonText}>
                  KM/SA
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.unitButton, windSpeedUnit === 'kt' && styles.unitButtonSelected]}
                onPress={() => setWindSpeedUnit('kt')}
              >
                <Text style={windSpeedUnit === 'kt' ? styles.unitButtonTextSelected : styles.unitButtonText}>
                  KT
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SettingsSection>

        <SettingsSection title="Gizlilik">
          <SettingsToggleRow label="Catch konumlarımı gizle" onValueChange={setLocationPrivate} value={locationPrivate} />
          <SettingsToggleRow label="Hesabım gizli olsun" onValueChange={setIsPrivate} value={isPrivate} />
        </SettingsSection>

        <SettingsSection title="Profil Görünürlüğü">
          <SettingsToggleRow
            label="Şehrimi göster"
            onValueChange={setShowCityPublic}
            value={showCityPublic}
          />
          <SettingsToggleRow
            label="Biyografimi göster"
            onValueChange={setShowBioPublic}
            value={showBioPublic}
          />
          <SettingsToggleRow
            label="Balıkçılık tipimi göster"
            onValueChange={setShowFishingTypesPublic}
            value={showFishingTypesPublic}
          />
          <SettingsToggleRow
            label="Sosyal profillerimi göster"
            onValueChange={setShowSocialLinksPublic}
            value={showSocialLinksPublic}
          />
          <SettingsToggleRow
            label="Ekipmanlarımı göster"
            onValueChange={setShowGearPublic}
            value={showGearPublic}
          />
          <SettingsToggleRow
            label="Fishdex koleksiyonumu göster"
            onValueChange={setShowFishdexPublic}
            value={showFishdexPublic}
          />
        </SettingsSection>

        <SettingsSection title="Hesap">
          <TouchableOpacity activeOpacity={0.8} style={styles.accountButton} onPress={() => setPasswordModalVisible(true)}>
            <Text style={styles.accountButtonText}>Şifremi Değiştir</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} style={styles.accountButton} onPress={() => router.push('/gear')}>
            <Text style={styles.accountButtonText}>Ekipmanlarım</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8}
            style={styles.dangerButton}
            onPress={() => {
              Alert.alert(
                'Dikkat',
                'Bu işlem geri alınamaz. Tüm avların ve rozetlerin silinecek.',
                [
                  { text: 'Vazgeç', style: 'cancel' },
                  { text: 'Devam et', style: 'destructive', onPress: () => setDeleteModalVisible(true) },
                ],
              );
            }}
          >
            <Text style={styles.dangerButtonText}>Hesabı Sil</Text>
          </TouchableOpacity>
        </SettingsSection>

        <AdminOnly>
          <SettingsSection title="Yönetici">
            <SettingsRow
              icon="shield-checkmark"
              label="Admin Paneli"
              onPress={() => router.push('/admin')}
            />
          </SettingsSection>
        </AdminOnly>

        <TouchableOpacity
          disabled={!hasChanges || saveLoading}
          onPress={handleSubmit((values) => void saveSettings(values))}
          style={[styles.saveButton, hasChanges && !saveLoading && styles.saveButtonActive]}
        >
          {saveLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Kaydet</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <OptionModal
        onClose={() => setCityModalVisible(false)}
        onSelect={(value) => setValue('city', value, { shouldDirty: true, shouldValidate: true })}
        options={TURKEY_CITIES}
        selectedValue={city}
        title="Şehir seç"
        visible={cityModalVisible}
      />

      <PasswordChangeModal
        error={passwordError}
        loading={passwordLoading}
        onClose={() => {
          setPasswordError('');
          setPasswordModalVisible(false);
        }}
        onSubmit={handlePasswordSubmit}
        visible={passwordModalVisible}
      />

      <DeleteAccountModal
        error={deleteError}
        loading={deleteLoading}
        onClose={() => {
          setDeleteError('');
          setDeleteModalVisible(false);
        }}
        onConfirm={handleAccountDeletion}
        visible={deleteModalVisible}
      />
    </>
  );
};

const COLORS = {
  background: '#0B1622',
  surface: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.10)',
  text: '#F8FAFC',
  textMuted: 'rgba(240,247,249,0.45)',
  accent: '#7DD4E8',
  error: '#A6422B',
  coral: '#FF6B6B',
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    gap: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 16,
  },
  headerSaveButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  headerSaveButtonActive: {
    backgroundColor: COLORS.accent,
  },
  headerSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  avatarContainer: {
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: '#0F2C35',
  },
  avatarChangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldContainerLarge: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  fieldDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.70)',
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  bioInput: {
    minHeight: 104,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.textMuted,
  },
  previewUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
  },
  previewBio: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.70)',
    marginTop: 8,
  },
  charCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  charCountWarning: {
    fontSize: 12,
    color: COLORS.coral,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
  },
  selectButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  selectButtonText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  selectButtonTextSelected: {
    fontSize: 16,
    color: COLORS.text,
  },
  typesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typePillSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
  },
  typePillText: {
    color: COLORS.text,
  },
  typePillTextSelected: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  unitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unitButtonSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
  },
  unitButtonText: {
    textAlign: 'center',
    fontWeight: '600',
    color: COLORS.text,
  },
  unitButtonTextSelected: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  accountButton: {
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  accountButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  dangerButton: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,107,107,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.coral,
  },
  saveButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  saveButtonActive: {
    backgroundColor: COLORS.accent,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default SettingsScreen;
