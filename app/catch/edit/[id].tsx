import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { CatchForm, type CatchFormValues, parseCatchNumber } from '@/components/CatchForm';
import { getCatchById, updateCatch } from '@/services/catches.service';
import { getFishSpeciesOptions } from '@/services/fishdex.service';
import { uploadCatchPhoto } from '@/services/storage.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CatchInsert } from '@/types/app.types';
import { parseCatchPoint } from '@/utils/location';
import { SplashScreen } from '@/components/SplashScreen';

const CatchEditScreen = (): JSX.Element => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const catchQuery = useQuery({
    queryKey: ['catch-edit', id],
    queryFn: () => getCatchById(id),
    enabled: Boolean(id),
  });
  const speciesQuery = useQuery({
    queryKey: ['fish-species-options'],
    queryFn: getFishSpeciesOptions,
  });

  if (!catchQuery.data || !speciesQuery.data) {
    return <SplashScreen />;
  }

  const catchRow = catchQuery.data;
  const point = parseCatchPoint(catchRow.location);

  const handleSubmit = async (values: CatchFormValues): Promise<void> => {
    if (!session?.user.id) {
      Alert.alert('Oturum bulunamadı', 'Devam etmek için yeniden giriş yap.');
      return;
    }

    let photoUrl = catchRow.photo_url;

    if (values.photoUri && values.photoUri !== catchRow.photo_url) {
      try {
        photoUrl = await uploadCatchPhoto(values.photoUri, session.user.id);
      } catch {
        Alert.alert('Uyarı', 'Fotoğraf yüklenemedi. Mevcut foto korunacak.');
      }
    }

    const payload: Partial<CatchInsert> = {
      species_id: values.speciesId,
      species_custom: values.speciesId ? null : values.speciesCustom ?? null,
      length_cm: parseCatchNumber(values.lengthCm),
      weight_g: parseCatchNumber(values.weightG),
      photo_url: photoUrl,
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

    await updateCatch(id, payload);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['catch-detail', id] }),
      queryClient.invalidateQueries({ queryKey: ['profile-details', session.user.id] }),
      queryClient.invalidateQueries({ queryKey: ['fishdex-overview', session.user.id] }),
    ]);
    router.replace(`/catch/${id}`);
  };

  return (
    <CatchForm
      initialValues={{
        photoUri: catchRow.photo_url ?? undefined,
        speciesId: catchRow.species_id,
        speciesCustom: catchRow.species_custom ?? undefined,
        lengthCm: catchRow.length_cm?.toString() ?? '',
        weightG: catchRow.weight_g?.toString() ?? '',
        locationName: catchRow.location_name ?? '',
        isCatchRelease: catchRow.is_catch_release,
        fishingMethod: catchRow.fishing_type ?? undefined,
        baitName: catchRow.bait_name ?? undefined,
        notes: catchRow.notes ?? '',
        isPublic: catchRow.is_public,
        latitude: point.latitude,
        longitude: point.longitude,
        showExactLocation: catchRow.show_exact_location,
        showMeasurementsPublic: catchRow.show_measurements_public,
        showLocationPublic: catchRow.show_location_public,
        showMethodPublic: catchRow.show_method_public,
        showNotesPublic: catchRow.show_notes_public,
        showConditionsPublic: catchRow.show_conditions_public,
        capturedAt: catchRow.captured_at ?? undefined,
        airTempC: catchRow.air_temp_c ?? null,
        pressureHpa: catchRow.pressure_hpa ?? null,
        humidityPct: catchRow.humidity_pct ?? null,
        weatherCode: catchRow.weather_code ?? null,
        weatherLabel: catchRow.weather_label ?? undefined,
        windSpeedKmh: catchRow.wind_speed_kmh ?? null,
        windDirectionDeg: catchRow.wind_direction_deg ?? null,
        windDirectionLabel: catchRow.wind_direction_label ?? undefined,
        uvIndex: catchRow.uv_index ?? null,
        waveHeightM: catchRow.wave_height_m ?? null,
        waveDirectionDeg: catchRow.wave_direction_deg ?? null,
        seaTempC: catchRow.sea_temp_c ?? null,
        seaDepthM: catchRow.sea_depth_m ?? null,
        seaDepthSource: catchRow.sea_depth_source ?? undefined,
        seaDepthIsApproximate: catchRow.sea_depth_is_approximate,
        moonPhaseLabel: catchRow.moon_phase_label ?? undefined,
        moonPhaseEmoji: catchRow.moon_phase_emoji ?? undefined,
        fishingScore: catchRow.fishing_score ?? null,
        fishingScoreLabel: catchRow.fishing_score_label ?? undefined,
      }}
      onSubmit={handleSubmit}
      speciesOptions={speciesQuery.data}
      submitLabel="Değişiklikleri kaydet"
      title="Av kaydını düzenle"
    />
  );
};

export default CatchEditScreen;
