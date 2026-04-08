import {
  zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect,
  useMemo,
  useState } from 'react';
import { Controller,
  useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  type LatLng,
  type MapPressEvent,
} from 'react-native-maps';
import { z } from 'zod';

import { FormField } from '@/components/FormField';
import { SpeciesSelect } from '@/components/SpeciesSelect';
import { ToggleField } from '@/components/ToggleField';
import type { FishSpeciesOption } from '@/types/app.types';
import { getWeatherAndFishingConditions } from '@/services/weather.service';
import { CATCH_METHOD_OPTIONS } from '@/lib/constants';

const TURKEY_REGION = {
  latitude: 39,
  longitude: 35,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

const areCoordinatesEqual = (
  left: LatLng | null,
  right: LatLng | null,
): boolean => {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.latitude === right.latitude && left.longitude === right.longitude;
};

const MAX_PHOTOS = 5;

const catchFormSchema = z
  .object({
    photoUri: z.string().optional(),
    photoUris: z.array(z.string()).max(MAX_PHOTOS, `En fazla ${MAX_PHOTOS} fotoğraf yükleyebilirsiniz.`).optional(),
    speciesId: z.number().nullable(),
    speciesCustom: z.string().max(60, 'Tür alanı en fazla 60 karakter olabilir.').optional(),
    lengthCm: z.string().optional(),
    weightG: z.string().optional(),
    locationName: z.string().max(120, 'Konum adı en fazla 120 karakter olabilir.').optional(),
    isCatchRelease: z.boolean(),
    fishingMethod: z.string().optional(),
    baitName: z.string().max(80, 'Yem alanı en fazla 80 karakter olabilir.').optional(),
    notes: z.string().max(500, 'Notlar en fazla 500 karakter olabilir.').optional(),
    isPublic: z.boolean(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    showExactLocation: z.boolean(),
    showMeasurementsPublic: z.boolean(),
    showLocationPublic: z.boolean(),
    showMethodPublic: z.boolean(),
    showNotesPublic: z.boolean(),
    showConditionsPublic: z.boolean(),
    capturedAt: z.string().optional(),
    airTempC: z.number().nullable().optional(),
    pressureHpa: z.number().nullable().optional(),
    humidityPct: z.number().nullable().optional(),
    weatherCode: z.number().nullable().optional(),
    weatherLabel: z.string().optional(),
    windSpeedKmh: z.number().nullable().optional(),
    windDirectionDeg: z.number().nullable().optional(),
    windDirectionLabel: z.string().optional(),
    uvIndex: z.number().nullable().optional(),
    waveHeightM: z.number().nullable().optional(),
    waveDirectionDeg: z.number().nullable().optional(),
    seaTempC: z.number().nullable().optional(),
    seaDepthM: z.number().nullable().optional(),
    seaDepthSource: z.string().optional(),
    seaDepthIsApproximate: z.boolean().optional(),
    moonPhaseLabel: z.string().optional(),
    moonPhaseEmoji: z.string().optional(),
    fishingScore: z.number().nullable().optional(),
    fishingScoreLabel: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (values.speciesId === null && !values.speciesCustom?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tür seç veya özel tür gir.',
        path: ['speciesCustom'],
      });
    }

    if (values.fishingMethod === 'yemli_av' && !values.baitName?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Yemli av için kullandığın yemi yaz.',
        path: ['baitName'],
      });
    }
  });

export type CatchFormValues = z.infer<typeof catchFormSchema>;

interface CatchFormProps {
  title: string;
  submitLabel: string;
  initialValues: CatchFormValues;
  speciesOptions: FishSpeciesOption[];
  onSubmit: (values: CatchFormValues) => Promise<void>;
}

export const parseCatchNumber = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number(value.replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : null;
};

const formatCapturedAt = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toLocaleString('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const CatchForm = ({
  title,
  submitLabel,
  initialValues,
  speciesOptions,
  onSubmit,
}: CatchFormProps): JSX.Element => {
  const { control, handleSubmit, setValue, watch, formState } = useForm<CatchFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(catchFormSchema),
  });
  const photoUri = watch('photoUri');
  const watchedPhotoUris = watch('photoUris');
  const speciesId = watch('speciesId');
  const fishingMethod = watch('fishingMethod');
  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const capturedAt = watch('capturedAt');
  const pressureHpa = watch('pressureHpa');
  const seaDepthM = watch('seaDepthM');
  const seaDepthSource = watch('seaDepthSource');
  const seaDepthIsApproximate = watch('seaDepthIsApproximate');
  const fishingScore = watch('fishingScore');
  const fishingScoreLabel = watch('fishingScoreLabel');
  const airTempC = watch('airTempC');
  const seaTempC = watch('seaTempC');
  const windSpeedKmh = watch('windSpeedKmh');
  const hasGpsLocation = latitude !== null && longitude !== null;
  const mapCoordinate = useMemo(
    () => (hasGpsLocation ? { latitude, longitude } : null),
    [hasGpsLocation, latitude, longitude],
  );
  const [mapModalVisible, setMapModalVisible] = useState<boolean>(false);
  const [selectedMapCoordinate, setSelectedMapCoordinate] = useState<LatLng | null>(mapCoordinate);
  const [isResolvingLocation, setIsResolvingLocation] = useState<boolean>(false);
  const [isHydratingContext, setIsHydratingContext] = useState<boolean>(false);
  
  // Calculate all photos (legacy photoUri + new photoUris)
  const allPhotos = useMemo(() => {
    const photoUris = watchedPhotoUris ?? [];
    const photos: string[] = [];
    if (photoUri) photos.push(photoUri);
    photos.push(...photoUris.filter(uri => uri !== photoUri));
    return photos;
  }, [photoUri, watchedPhotoUris]);
  const canAddMorePhotos = allPhotos.length < MAX_PHOTOS;

  useEffect(() => {
    if (!mapModalVisible) {
      setSelectedMapCoordinate((current) =>
        areCoordinatesEqual(current, mapCoordinate) ? current : mapCoordinate,
      );
    }
  }, [mapCoordinate, mapModalVisible]);

  const buildLocationLabel = (
    places: Location.LocationGeocodedAddress[],
  ): string | null => {
    const place = places[0];

    if (!place) {
      return null;
    }

    const parts = [
      place.street,
      place.district,
      place.city,
      place.region,
      place.country,
    ].filter(
      (value, index, array): value is string =>
        Boolean(value) && array.indexOf(value) === index,
    );

    return parts.join(', ') || null;
  };

  const setCoordinates = (
    nextLatitude: number,
    nextLongitude: number,
  ): void => {
    setValue('latitude', nextLatitude, { shouldDirty: true });
    setValue('longitude', nextLongitude, { shouldDirty: true });
  };

  const resolveLocationNameFromCoordinates = async (
    nextLatitude: number,
    nextLongitude: number,
  ): Promise<string | null> => {
    try {
      const places = await Location.reverseGeocodeAsync({
        latitude: nextLatitude,
        longitude: nextLongitude,
      });
      return buildLocationLabel(places);
    } catch {
      return null;
    }
  };

  const clearEnvironmentalValues = (): void => {
    setValue('airTempC', null, { shouldDirty: true });
    setValue('pressureHpa', null, { shouldDirty: true });
    setValue('humidityPct', null, { shouldDirty: true });
    setValue('weatherCode', null, { shouldDirty: true });
    setValue('weatherLabel', undefined, { shouldDirty: true });
    setValue('windSpeedKmh', null, { shouldDirty: true });
    setValue('windDirectionDeg', null, { shouldDirty: true });
    setValue('windDirectionLabel', undefined, { shouldDirty: true });
    setValue('uvIndex', null, { shouldDirty: true });
    setValue('waveHeightM', null, { shouldDirty: true });
    setValue('waveDirectionDeg', null, { shouldDirty: true });
    setValue('seaTempC', null, { shouldDirty: true });
    setValue('seaDepthM', null, { shouldDirty: true });
    setValue('seaDepthSource', undefined, { shouldDirty: true });
    setValue('seaDepthIsApproximate', false, { shouldDirty: true });
    setValue('moonPhaseLabel', undefined, { shouldDirty: true });
    setValue('moonPhaseEmoji', undefined, { shouldDirty: true });
    setValue('fishingScore', null, { shouldDirty: true });
    setValue('fishingScoreLabel', undefined, { shouldDirty: true });
  };

  const applyEnvironmentalValues = async (
    nextLatitude: number,
    nextLongitude: number,
    options?: {
      setCapturedNow?: boolean;
      keepTypedLocationName?: boolean;
    },
  ): Promise<void> => {
    const { setCapturedNow = false, keepTypedLocationName = false } = options ?? {};

    setCoordinates(nextLatitude, nextLongitude);

    if (setCapturedNow) {
      setValue('capturedAt', new Date().toISOString(), { shouldDirty: true });
    }

    clearEnvironmentalValues();
    setIsHydratingContext(true);

    try {
      const [resolvedLocationName, weather] = await Promise.all([
        resolveLocationNameFromCoordinates(nextLatitude, nextLongitude),
        getWeatherAndFishingConditions(nextLatitude, nextLongitude),
      ]);

      if (resolvedLocationName && !keepTypedLocationName) {
        setValue('locationName', resolvedLocationName, { shouldDirty: true });
      }

      setValue('airTempC', weather.temperature, { shouldDirty: true });
      setValue('pressureHpa', weather.pressure, { shouldDirty: true });
      setValue('humidityPct', weather.humidity, { shouldDirty: true });
      setValue('weatherCode', weather.weatherCode, { shouldDirty: true });
      setValue('weatherLabel', weather.weatherLabel, { shouldDirty: true });
      setValue('windSpeedKmh', weather.windSpeed, { shouldDirty: true });
      setValue('windDirectionDeg', weather.windDirection, { shouldDirty: true });
      setValue('windDirectionLabel', weather.windDirectionLabel, { shouldDirty: true });
      setValue('uvIndex', weather.uvIndex, { shouldDirty: true });
      setValue('waveHeightM', weather.waveHeight, { shouldDirty: true });
      setValue('waveDirectionDeg', weather.waveDirection, { shouldDirty: true });
      setValue('seaTempC', weather.seaTemp, { shouldDirty: true });
      setValue('seaDepthM', weather.seaDepth, { shouldDirty: true });
      setValue('seaDepthSource', weather.seaDepthSource ?? undefined, { shouldDirty: true });
      setValue('seaDepthIsApproximate', weather.seaDepthIsApproximate, { shouldDirty: true });
      setValue('moonPhaseLabel', weather.moonPhase.label, { shouldDirty: true });
      setValue('moonPhaseEmoji', weather.moonPhase.emoji, { shouldDirty: true });
      setValue('fishingScore', weather.fishingScore, { shouldDirty: true });
      setValue('fishingScoreLabel', weather.fishingScoreLabel, { shouldDirty: true });
    } finally {
      setIsHydratingContext(false);
    }
  };

  const handlePickImage = async (): Promise<void> => {
    if (!canAddMorePhotos) {
      Alert.alert('Limit', `En fazla ${MAX_PHOTOS} fotoğraf ekleyebilirsiniz.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - allPhotos.length,
      mediaTypes: 'images',
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map(asset => asset.uri).filter((uri): uri is string => Boolean(uri));
      if (newUris.length > 0) {
        // Set first photo as main if no main photo exists
        if (!photoUri) {
          setValue('photoUri', newUris[0], { shouldDirty: true });
        }
        // Add all new photos to photoUris
        const updatedUris = [...allPhotos, ...newUris].slice(0, MAX_PHOTOS);
        setValue('photoUris', updatedUris, { shouldDirty: true });
      }
    }
  };

  const handleTakePhoto = async (): Promise<void> => {
    if (!canAddMorePhotos) {
      Alert.alert('Limit', `En fazla ${MAX_PHOTOS} fotoğraf ekleyebilirsiniz.`);
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert('Kamera izni gerekli', 'Fotoğraf çekmek için kamera izni vermen gerekiyor.');
      return;
    }

    const capture = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      mediaTypes: 'images',
      quality: 1,
    });

    if (capture.canceled || !capture.assets[0]?.uri) {
      return;
    }

    const newUri = capture.assets[0].uri;
    
    // Set as main photo if no main exists
    if (!photoUri) {
      setValue('photoUri', newUri, { shouldDirty: true });
    }
    // Add to photoUris
    const updatedUris = [...allPhotos, newUri].slice(0, MAX_PHOTOS);
    setValue('photoUris', updatedUris, { shouldDirty: true });

    // Only hydrate context on first photo
    if (allPhotos.length === 0) {
      try {
        const locationPermission = await Location.requestForegroundPermissionsAsync();

        if (locationPermission.status !== 'granted') {
          setValue('capturedAt', new Date().toISOString(), { shouldDirty: true });
          Alert.alert(
            'Konum izni verilmedi',
            'Fotoğraf eklendi. Konum ve doğa koşulları otomatik doldurulamadı.',
          );
          return;
        }

        const lastKnownPosition = await Location.getLastKnownPositionAsync();
        const position =
          lastKnownPosition
          ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

        await applyEnvironmentalValues(position.coords.latitude, position.coords.longitude, {
          setCapturedNow: true,
        });
      } catch {
        setValue('capturedAt', new Date().toISOString(), { shouldDirty: true });
        Alert.alert(
          'Otomatik detaylar alınamadı',
          'Fotoğraf eklendi ama konum ve çevre koşulları doldurulamadı.',
        );
      }
    }
  };

  const handleRemovePhoto = (uriToRemove: string): void => {
    const remaining = allPhotos.filter(uri => uri !== uriToRemove);
    setValue('photoUris', remaining, { shouldDirty: true });
    // Update main photo if removed
    if (photoUri === uriToRemove) {
      setValue('photoUri', remaining[0] ?? undefined, { shouldDirty: true });
    }
  };

  const handleSetMainPhoto = (uri: string): void => {
    setValue('photoUri', uri, { shouldDirty: true });
  };

  const handleUseLocation = async (): Promise<void> => {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert('Konum izni gerekli', 'Konum eklemek için izin vermen gerekiyor.');
      return;
    }

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await applyEnvironmentalValues(
      position.coords.latitude,
      position.coords.longitude,
    );
  };

  const handleOpenMapPicker = (): void => {
    setSelectedMapCoordinate(mapCoordinate);
    setMapModalVisible(true);
  };

  const handleMapPress = (event: MapPressEvent): void => {
    setSelectedMapCoordinate(event.nativeEvent.coordinate);
  };

  const handleConfirmMapLocation = async (): Promise<void> => {
    if (!selectedMapCoordinate) {
      Alert.alert('Konum seç', 'Harita üzerinde bir nokta seçmelisin.');
      return;
    }

    setIsResolvingLocation(true);

    try {
      await applyEnvironmentalValues(
        selectedMapCoordinate.latitude,
        selectedMapCoordinate.longitude,
      );
      setMapModalVisible(false);
    } finally {
      setIsResolvingLocation(false);
    }
  };

  const handleLocationNameBlur = async (value: string): Promise<void> => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return;
    }

    try {
      const geocoded = await Location.geocodeAsync(trimmedValue);
      const firstMatch = geocoded[0];

      if (firstMatch) {
        await applyEnvironmentalValues(firstMatch.latitude, firstMatch.longitude, {
          keepTypedLocationName: true,
        });
      }
    } catch {
      return;
    }
  };

  const capturedAtLabel = formatCapturedAt(capturedAt);

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <Text style={styles.title}>{title}</Text>
        <View style={styles.photoContainer}>
          {allPhotos.length > 0 ? (
            <View style={styles.fullWidth}>
              {/* Main Photo */}
              <View style={styles.mainPhotoContainer}>
                <Image
                  resizeMode="contain"
                  source={{ uri: photoUri ?? allPhotos[0] }}
                  style={styles.mainPhoto}
                />
                {photoUri && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(photoUri)}
                  >
                    <Text style={styles.removePhotoButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              {/* Photo Strip */}
              {allPhotos.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.photoStrip}
                  contentContainerStyle={styles.photoStripContent}
                >
                  {allPhotos.map((uri, index) => (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      key={uri}
                      onPress={() => handleSetMainPhoto(uri)}
                      onLongPress={() => handleRemovePhoto(uri)}
                      style={[styles.thumbnailContainer, uri === photoUri ? styles.thumbnailActive : styles.thumbnailInactive]}
                    >
                      <Image
                        resizeMode="cover"
                        source={{ uri }}
                        style={styles.thumbnail}
                      />
                      {uri === photoUri && (
                        <View style={styles.mainBadge}>
                          <Text style={styles.mainBadgeText}>Ana</Text>
                        </View>
                      )}
                      <View style={styles.indexBadge}>
                        <Text style={styles.indexBadgeText}>{index + 1}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <Text style={styles.photoCountText}>
                {allPhotos.length}/{MAX_PHOTOS} fotoğraf • Silmek için basılı tut
              </Text>
            </View>
          ) : (
            <View style={styles.emptyPhotoPlaceholder}>
              <Text style={styles.emptyPhotoText}>Fotoğraf ekle (max {MAX_PHOTOS})</Text>
            </View>
          )}
          <View style={styles.photoButtonsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.photoButton, canAddMorePhotos ? styles.photoButtonPrimary : styles.photoButtonPrimaryDisabled]}
              disabled={!canAddMorePhotos}
              onPress={() => void handlePickImage()}
            >
              <Text style={styles.photoButtonText}>Fotoğraf seç</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.photoButton, canAddMorePhotos ? styles.photoButtonSecondary : styles.photoButtonSecondaryDisabled]}
              disabled={!canAddMorePhotos}
              onPress={() => void handleTakePhoto()}
            >
              <Text style={styles.photoButtonText}>Kamera ile çek</Text>
            </TouchableOpacity>
          </View>
        </View>
        {(capturedAtLabel || pressureHpa != null || seaDepthM != null || fishingScore != null) ? (
          <View style={styles.autoDetailsCard}>
            <View style={styles.autoDetailsHeader}>
              <Text style={styles.autoDetailsTitle}>Otomatik Detaylar</Text>
              {isHydratingContext ? <ActivityIndicator color="#2F6F7E" /> : null}
            </View>
            <Text style={styles.autoDetailsSubtitle}>
              Kameradan çekim veya seçilen konuma göre otomatik doldurulur.
            </Text>
            <View style={styles.autoDetailsGrid}>
              {capturedAtLabel ? (
                <View style={styles.detailChip}>
                  <Text style={styles.detailChipLabel}>
                    Çekim Saati
                  </Text>
                  <Text style={styles.detailChipValue}>{capturedAtLabel}</Text>
                </View>
              ) : null}
              {pressureHpa != null ? (
                <View style={styles.detailChip}>
                  <Text style={styles.detailChipLabel}>
                    Basınç
                  </Text>
                  <Text style={styles.detailChipValue}>{pressureHpa} hPa</Text>
                </View>
              ) : null}
              {windSpeedKmh != null ? (
                <View style={styles.detailChip}>
                  <Text style={styles.detailChipLabel}>
                    Rüzgar
                  </Text>
                  <Text style={styles.detailChipValue}>{windSpeedKmh} km/sa</Text>
                </View>
              ) : null}
              {airTempC != null ? (
                <View style={styles.detailChip}>
                  <Text style={styles.detailChipLabel}>
                    Hava
                  </Text>
                  <Text style={styles.detailChipValue}>{airTempC}°C</Text>
                </View>
              ) : null}
              {seaTempC != null ? (
                <View style={styles.detailChip}>
                  <Text style={styles.detailChipLabel}>
                    Su
                  </Text>
                  <Text style={styles.detailChipValue}>{seaTempC}°C</Text>
                </View>
              ) : null}
              {seaDepthM != null ? (
                <View style={styles.detailChip}>
                  <Text style={styles.detailChipLabel}>
                    Derinlik
                  </Text>
                  <Text style={styles.detailChipValue}>
                    {seaDepthM.toFixed(1)} m
                    {seaDepthSource ? ` • ${seaDepthSource}` : ''}
                    {seaDepthIsApproximate ? ' • tahmini' : ''}
                  </Text>
                </View>
              ) : null}
              {fishingScore != null ? (
                <View style={styles.detailChip}>
                  <Text style={styles.detailChipLabel}>
                    Balık Skoru
                  </Text>
                  <Text style={styles.detailChipValue}>
                    {fishingScore}/10 {fishingScoreLabel ?? ''}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
        <Controller
          control={control}
          name="speciesId"
          render={({ field }) => (
            <SpeciesSelect
              error={formState.errors.speciesCustom?.message}
              onSelect={(nextId) => {
                field.onChange(nextId);

                if (nextId !== null) {
                  setValue('speciesCustom', '', { shouldDirty: true, shouldValidate: true });
                }
              }}
              options={speciesOptions}
              selectedId={field.value}
            />
          )}
        />
        {speciesId === null ? <Controller control={control} name="speciesCustom" render={({ field }) => <FormField label="Tür adı" onChangeText={field.onChange} placeholder="Örnek: Yayın" value={field.value ?? ''} />} /> : null}
        <Controller control={control} name="lengthCm" render={({ field }) => <FormField keyboardType="numeric" label="Boy (cm)" onChangeText={field.onChange} placeholder="Örnek: 42.5" value={field.value ?? ''} />} />
        <Controller control={control} name="weightG" render={({ field }) => <FormField keyboardType="numeric" label="Ağırlık (g)" onChangeText={field.onChange} placeholder="Örnek: 1250" value={field.value ?? ''} />} />

        <Controller
          control={control}
          name="fishingMethod"
          render={({ field }) => (
            <View style={styles.fieldGap}>
              <Text style={styles.fieldLabel}>Av yöntemi</Text>
              <View style={styles.methodOptionsRow}>
                {CATCH_METHOD_OPTIONS.map((option) => {
                  const isSelected = field.value === option.value;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[styles.methodPill, isSelected ? styles.methodPillSelected : styles.methodPillUnselected]}
                      key={option.value}
                      onPress={() => {
                        field.onChange(option.value);

                        if (option.value !== 'yemli_av') {
                          setValue('baitName', '', { shouldDirty: true, shouldValidate: true });
                        }
                      }}
                    >
                      <Text style={isSelected ? styles.methodPillTextSelected : styles.methodPillTextUnselected}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        />
        {fishingMethod === 'yemli_av' ? (
          <Controller
            control={control}
            name="baitName"
            render={({ field, fieldState }) => (
              <View style={styles.fieldGap}>
                <FormField
                  label="Kullanılan yem"
                  onChangeText={field.onChange}
                  placeholder="Örnek: Mamun, sülünez, karides"
                  value={field.value ?? ''}
                />
                {fieldState.error?.message ? (
                  <Text style={styles.errorText}>{fieldState.error.message}</Text>
                ) : null}
              </View>
            )}
          />
        ) : null}

        <View style={styles.locationButtonsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.locationButtonPrimary}
            onPress={() => void handleUseLocation()}
          >
            <Text style={styles.locationButtonText}>GPS ile konum al</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.locationButtonSecondary}
            onPress={handleOpenMapPicker}
          >
            <Text style={styles.locationButtonText}>Haritadan Seç</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.locationHintText}>
          {hasGpsLocation
            ? 'Konum seçildi. Harita üzerinden kontrol edebilirsin.'
            : 'İstersen yalnızca yer adını da yazabilirsin.'}
        </Text>

        {mapCoordinate ? (
        <View style={styles.mapPreviewContainer}>
            <MapView
              style={styles.flex1}
              initialRegion={{
                latitude: mapCoordinate.latitude,
                longitude: mapCoordinate.longitude,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              }}
              pitchEnabled={false}
              provider={PROVIDER_DEFAULT}
              rotateEnabled={false}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={mapCoordinate} />
            </MapView>
          </View>
        ) : null}

        <Controller
          control={control}
          name="locationName"
          render={({ field }) => (
            <FormField
              label="Konum adı"
              onBlur={() => {
                field.onBlur();
                void handleLocationNameBlur(field.value ?? '');
              }}
              onChangeText={field.onChange}
              placeholder="Örnek: Riva sahili"
              value={field.value ?? ''}
            />
          )}
        />
        <Controller control={control} name="notes" render={({ field }) => <FormField label="Notlar" multiline onChangeText={field.onChange} placeholder="Av detaylarını yaz" value={field.value ?? ''} />} />
        <Controller control={control} name="isCatchRelease" render={({ field }) => <ToggleField label="Yakala ve bırak" onValueChange={field.onChange} value={field.value} />} />
        <Controller control={control} name="isPublic" render={({ field }) => <ToggleField label="Herkese açık paylaş" onValueChange={field.onChange} value={field.value} />} />
        <Controller
          control={control}
          name="showExactLocation"
          render={({ field }) => (
            <ToggleField
              label="Kesin konumu göster"
              onValueChange={field.onChange}
              value={field.value}
            />
          )}
        />
        <View style={styles.sharingDetailsCard}>
          <Text style={styles.sharingDetailsTitle}>Paylaşım detayları</Text>
          <Text style={styles.sharingDetailsDescription}>
            Bu seçimler yalnızca diğer kullanıcıların hangi detayları göreceğini belirler. Sen kendi arşivinde her zaman tam kaydı görürsün.
          </Text>
          <Controller
            control={control}
            name="showMeasurementsPublic"
            render={({ field }) => (
              <ToggleField
                label="Boy ve ağırlığı paylaş"
                onValueChange={field.onChange}
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="showLocationPublic"
            render={({ field }) => (
              <ToggleField
                label="Konum detaylarını paylaş"
                onValueChange={field.onChange}
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="showMethodPublic"
            render={({ field }) => (
              <ToggleField
                label="Av yöntemi ve yemi paylaş"
                onValueChange={field.onChange}
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="showNotesPublic"
            render={({ field }) => (
              <ToggleField
                label="Notlarımı paylaş"
                onValueChange={field.onChange}
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="showConditionsPublic"
            render={({ field }) => (
              <ToggleField
                label="Av koşullarını paylaş"
                onValueChange={field.onChange}
                value={field.value}
              />
            )}
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.submitButton, formState.isSubmitting && styles.submitButtonDisabled]}
          disabled={formState.isSubmitting}
          onPress={handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        >
          <Text style={styles.submitButtonText}>
            {formState.isSubmitting ? 'Kaydediliyor...' : submitLabel}
          </Text>
        </TouchableOpacity>
        {formState.errors.locationName ? <Text style={styles.errorText}>{formState.errors.locationName.message}</Text> : null}
        {formState.errors.notes ? <Text style={styles.errorText}>{formState.errors.notes.message}</Text> : null}
      </ScrollView>

      <Modal animationType="slide" visible={mapModalVisible}>
        <View style={styles.modalContainer}>
          <MapView
            style={styles.flex1}
            initialRegion={
              selectedMapCoordinate
                ? {
                    latitude: selectedMapCoordinate.latitude,
                    longitude: selectedMapCoordinate.longitude,
                    latitudeDelta: 0.3,
                    longitudeDelta: 0.3,
                  }
                : TURKEY_REGION
            }
            onPress={handleMapPress}
            provider={PROVIDER_DEFAULT}
          >
            {selectedMapCoordinate ? <Marker coordinate={selectedMapCoordinate} /> : null}
          </MapView>

          <View style={styles.mapModalHeader}>
            <Text style={styles.mapModalTitle}>Haritadan konum seç</Text>
            <Text style={styles.mapModalSubtitle}>
              Haritada bir noktaya dokunarak iğneni bırak.
            </Text>
          </View>

          <View style={styles.mapModalButtons}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.mapConfirmButton}
              onPress={() => void handleConfirmMapLocation()}
            >
              <Text style={styles.submitButtonText}>
                {isResolvingLocation ? 'Konum çözülüyor...' : 'Konumu Onayla'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.mapCancelButton}
              onPress={() => setMapModalVisible(false)}
            >
              <Text style={styles.mapCancelButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const COLORS = {
  background: '#050608',
  surface: 'rgba(255,255,255,0.05)',
  surfaceAlt: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',
  text: '#F8FAFC',
  textMuted: 'rgba(240,247,249,0.45)',
  accent: '#D4FF00',
  success: '#2F7A45',
  error: '#A6422B',
  sea: '#2F6F7E',
  coral: '#E05C45',
  ink: '#F8FAFC',
  seaTransparent: 'rgba(47,111,126,0.70)',
  seaTransparent80: 'rgba(47,111,126,0.80)',
  darkTeal: '#16333B',
  darkTealTransparent: 'rgba(22,51,59,0.50)',
  photoBackground: '#0F2C35',
  backgroundTransparent95: 'rgba(11,22,34,0.95)',
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollViewContent: {
    gap: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '600',
    color: COLORS.ink,
  },
  photoContainer: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.sea,
    backgroundColor: COLORS.surfaceAlt,
    padding: 16,
  },
  fullWidth: {
    width: '100%',
  },
  mainPhotoContainer: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: COLORS.photoBackground,
  },
  mainPhoto: {
    width: '100%',
    height: 240,
  },
  removePhotoButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.60)',
    padding: 8,
  },
  removePhotoButtonText: {
    color: COLORS.text,
    fontSize: 12,
  },
  photoStrip: {
    marginTop: 12,
  },
  photoStripContent: {
    gap: 8,
  },
  thumbnailContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  thumbnailActive: {
    borderWidth: 2,
    borderColor: COLORS.sea,
  },
  thumbnailInactive: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  thumbnail: {
    width: 64,
    height: 64,
  },
  mainBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.seaTransparent80,
    paddingVertical: 2,
  },
  mainBadgeText: {
    textAlign: 'center',
    fontSize: 10,
    color: COLORS.text,
  },
  indexBadge: {
    position: 'absolute',
    right: 2,
    top: 2,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.50)',
    paddingHorizontal: 4,
  },
  indexBadgeText: {
    fontSize: 10,
    color: COLORS.text,
  },
  photoCountText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.seaTransparent,
  },
  emptyPhotoPlaceholder: {
    paddingVertical: 20,
  },
  emptyPhotoText: {
    fontSize: 16,
    color: COLORS.sea,
  },
  photoButtonsRow: {
    marginTop: 16,
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  photoButtonPrimary: {
    backgroundColor: COLORS.sea,
  },
  photoButtonPrimaryDisabled: {
    backgroundColor: 'rgba(47,111,126,0.50)',
  },
  photoButtonSecondary: {
    backgroundColor: COLORS.darkTeal,
  },
  photoButtonSecondaryDisabled: {
    backgroundColor: COLORS.darkTealTransparent,
  },
  photoButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  autoDetailsCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  autoDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoDetailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.ink,
  },
  autoDetailsSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: 'rgba(255,255,255,0.70)',
  },
  autoDetailsGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailChip: {
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.textMuted,
  },
  detailChipValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  fieldGap: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.ink,
  },
  methodOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodPill: {
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  methodPillSelected: {
    backgroundColor: COLORS.sea,
  },
  methodPillUnselected: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  methodPillTextSelected: {
    fontWeight: '600',
    color: COLORS.text,
  },
  methodPillTextUnselected: {
    color: COLORS.ink,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
  },
  locationButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  locationButtonPrimary: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: COLORS.sea,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationButtonSecondary: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: COLORS.darkTeal,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  locationHintText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.70)',
  },
  mapPreviewContainer: {
    height: 150,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  flex1: {
    flex: 1,
  },
  sharingDetailsCard: {
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sharingDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.ink,
  },
  sharingDetailsDescription: {
    fontSize: 14,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.70)',
  },
  submitButton: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.coral,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.surfaceAlt,
  },
  submitButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mapModalHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 56,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundTransparent95,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.ink,
  },
  mapModalSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: 'rgba(255,255,255,0.70)',
  },
  mapModalButtons: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    gap: 12,
  },
  mapConfirmButton: {
    borderRadius: 16,
    backgroundColor: COLORS.coral,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  mapCancelButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  mapCancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.ink,
  },
});
