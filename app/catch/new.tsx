import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { CatchForm, type CatchFormValues, parseCatchNumber } from '@/components/CatchForm';
import { createCatch } from '@/services/catches.service';
import { getFishSpeciesOptions } from '@/services/fishdex.service';
import { moderateImage } from '@/services/moderation.service';
import { uploadCatchPhoto } from '@/services/storage.service';
import { submitCatchToChallenge } from '@/services/weeklyChallenges.service';
import { shouldSaveAsDraft } from '@/services/sync.service';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDraftStore } from '@/stores/useDraftStore';
import type { CatchInsert } from '@/types/app.types';
import { SplashScreen } from '@/components/SplashScreen';

const getRouteParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const normalizeSpeciesName = (value: string): string => {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const NewCatchScreen = (): JSX.Element => {
  const params = useLocalSearchParams<{
    challengeId?: string;
    photoUri?: string;
    speciesName?: string;
    speciesNameTr?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const challengeId = getRouteParam(params.challengeId);
  const photoUri = getRouteParam(params.photoUri);
  const speciesNameTr = getRouteParam(params.speciesNameTr);
  const speciesName = getRouteParam(params.speciesName);
  const prefilledSpeciesLabel = speciesNameTr || speciesName;
  const speciesQuery = useQuery({
    queryKey: ['fish-species-options'],
    queryFn: getFishSpeciesOptions,
  });
  const speciesOptions = speciesQuery.data ?? [];
  const matchedSpecies = prefilledSpeciesLabel
    ? speciesOptions.find(
        (item) =>
          normalizeSpeciesName(item.name) === normalizeSpeciesName(prefilledSpeciesLabel),
      )
    : undefined;

  if (!speciesQuery.data) {
    return <SplashScreen />;
  }

  const handleSubmit = async (values: CatchFormValues): Promise<void> => {
    if (!session?.user.id) {
      Alert.alert('Oturum bulunamadı', 'Devam etmek için yeniden giriş yap.');
      return;
    }

    // Check if offline - save as draft
    if (shouldSaveAsDraft()) {
      const addDraft = useDraftStore.getState().addDraft;
      addDraft({
        userId: session.user.id,
        photoUri: values.photoUri,
        speciesId: values.speciesId,
        speciesCustom: values.speciesCustom,
        lengthCm: values.lengthCm,
        weightG: values.weightG,
        locationName: values.locationName,
        isCatchRelease: values.isCatchRelease,
        fishingMethod: values.fishingMethod,
        baitName: values.baitName,
        notes: values.notes,
        isPublic: values.isPublic,
        latitude: values.latitude,
        longitude: values.longitude,
        showExactLocation: values.showExactLocation,
        showMeasurementsPublic: values.showMeasurementsPublic,
        showLocationPublic: values.showLocationPublic,
        showMethodPublic: values.showMethodPublic,
        showNotesPublic: values.showNotesPublic,
        showConditionsPublic: values.showConditionsPublic,
        capturedAt: values.capturedAt,
        airTempC: values.airTempC,
        pressureHpa: values.pressureHpa,
        humidityPct: values.humidityPct,
        weatherCode: values.weatherCode,
        weatherLabel: values.weatherLabel,
        windSpeedKmh: values.windSpeedKmh,
        windDirectionDeg: values.windDirectionDeg,
        windDirectionLabel: values.windDirectionLabel,
        uvIndex: values.uvIndex,
        waveHeightM: values.waveHeightM,
        waveDirectionDeg: values.waveDirectionDeg,
        seaTempC: values.seaTempC,
        seaDepthM: values.seaDepthM,
        seaDepthSource: values.seaDepthSource,
        seaDepthIsApproximate: values.seaDepthIsApproximate,
        moonPhaseLabel: values.moonPhaseLabel,
        moonPhaseEmoji: values.moonPhaseEmoji,
        fishingScore: values.fishingScore,
        fishingScoreLabel: values.fishingScoreLabel,
      });

      Alert.alert(
        'Taslak Kaydedildi',
        'Çevrimdışı olduğunuz için av kaydınız taslak olarak saklandı. İnternet bağlantısı sağlandığında otomatik olarak yüklenecektir.',
        [{ text: 'Tamam', onPress: () => router.replace('/(tabs)') }],
      );
      return;
    }

    let photoUrl: string | null = null;

    if (values.photoUri) {
      if (__DEV__) {
        console.log('Uploading photo, uri:', values.photoUri);
      }

      try {
        const moderationResult = await moderateImage(values.photoUri);

        if (!moderationResult.safe) {
          Alert.alert(
            'Uygunsuz İçerik',
            'Yüklediğiniz fotoğraf uygunsuz içerik barındırıyor ve paylaşılamaz.',
            [{ text: 'Tamam' }],
          );
          return;
        }

        photoUrl = await uploadCatchPhoto(values.photoUri, session.user.id);

        if (__DEV__) {
          console.log('Photo upload success:', photoUrl);
        }
      } catch (error: unknown) {
        if (__DEV__) {
          console.error('Photo upload failed:', error);
        }

        Alert.alert('Uyarı', 'Fotoğraf yüklenemedi. Av kaydı fotoğrafsız devam edecek.');
      }
    }

    const payload: CatchInsert = {
      user_id: session.user.id,
      species_id: values.speciesId,
      species_custom: values.speciesId ? null : values.speciesCustom ?? null,
      length_cm: parseCatchNumber(values.lengthCm),
      weight_g: parseCatchNumber(values.weightG),
      photo_url: photoUrl,
      photo_blur_hash: null,
      location:
        values.longitude !== null && values.latitude !== null
          ? `POINT(${values.longitude} ${values.latitude})`
          : null,
      location_name: values.locationName ?? null,
      show_exact_location: values.showExactLocation,
      show_measurements_public: values.showMeasurementsPublic,
      show_location_public: values.showLocationPublic,
      show_method_public: values.showMethodPublic,
      show_notes_public: values.showNotesPublic,
      show_conditions_public: values.showConditionsPublic,
      is_catch_release: values.isCatchRelease,
      fishing_type: values.fishingMethod ?? null,
      bait_name: values.fishingMethod === 'yemli_av' ? values.baitName?.trim() ?? null : null,
      notes: values.notes ?? null,
      is_public: values.isPublic,
      captured_at: values.capturedAt ?? null,
      air_temp_c: values.airTempC ?? null,
      pressure_hpa: values.pressureHpa ?? null,
      humidity_pct: values.humidityPct ?? null,
      weather_code: values.weatherCode ?? null,
      weather_label: values.weatherLabel ?? null,
      wind_speed_kmh: values.windSpeedKmh ?? null,
      wind_direction_deg: values.windDirectionDeg ?? null,
      wind_direction_label: values.windDirectionLabel ?? null,
      uv_index: values.uvIndex ?? null,
      wave_height_m: values.waveHeightM ?? null,
      wave_direction_deg: values.waveDirectionDeg ?? null,
      sea_temp_c: values.seaTempC ?? null,
      sea_depth_m: values.seaDepthM ?? null,
      sea_depth_source: values.seaDepthSource ?? null,
      sea_depth_is_approximate: values.seaDepthIsApproximate ?? false,
      moon_phase_label: values.moonPhaseLabel ?? null,
      moon_phase_emoji: values.moonPhaseEmoji ?? null,
      fishing_score: values.fishingScore ?? null,
      fishing_score_label: values.fishingScoreLabel ?? null,
    };

    try {
      const createdCatch = await createCatch(payload);

      if (challengeId) {
        await submitCatchToChallenge(
          challengeId,
          createdCatch.id,
          parseCatchNumber(values.lengthCm) ?? 1,
        );
      }

      await queryClient.invalidateQueries({ queryKey: ['feed-catches'] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile-details', session.user.id] }),
        queryClient.invalidateQueries({ queryKey: ['fishdex-overview', session.user.id] }),
      ]);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      console.error('Yeni av kaydı oluşturulamadı:', error);
      Alert.alert(
        'Av kaydedilemedi',
        error instanceof Error ? error.message : 'Bilinmeyen bir hata olustu.',
      );
    }
  };

  return (
    <CatchForm
      initialValues={{
        photoUri,
        speciesId: matchedSpecies ? matchedSpecies.id : null,
        speciesCustom: matchedSpecies ? undefined : prefilledSpeciesLabel,
        isCatchRelease: false,
        fishingMethod: undefined,
        baitName: undefined,
        isPublic: true,
        latitude: null,
        longitude: null,
        showExactLocation: false,
        showMeasurementsPublic: true,
        showLocationPublic: true,
        showMethodPublic: true,
        showNotesPublic: true,
        showConditionsPublic: true,
        capturedAt: undefined,
        airTempC: null,
        pressureHpa: null,
        humidityPct: null,
        weatherCode: null,
        weatherLabel: undefined,
        windSpeedKmh: null,
        windDirectionDeg: null,
        windDirectionLabel: undefined,
        uvIndex: null,
        waveHeightM: null,
        waveDirectionDeg: null,
        seaTempC: null,
        seaDepthM: null,
        seaDepthSource: undefined,
        seaDepthIsApproximate: false,
        moonPhaseLabel: undefined,
        moonPhaseEmoji: undefined,
        fishingScore: null,
        fishingScoreLabel: undefined,
      }}
      onSubmit={handleSubmit}
      speciesOptions={speciesOptions}
      submitLabel="Avı kaydet"
      title="Yeni av kaydı"
    />
  );
};

export default NewCatchScreen;
