import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Stack, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { PROVIDER_DEFAULT, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TouchableOpacity } from '@/components/TouchableOpacity';
import { createFishingLocation } from '@/services/fishingLocations.service';
import { SPORT_THEME } from '@/lib/sport-theme';
import { useAuthStore } from '@/stores/useAuthStore';
import type { FishingLocationMapItem, LocationType } from '@/types/app.types';

type SeasonOption = 'İlkbahar' | 'Yaz' | 'Sonbahar' | 'Kış' | 'Tüm Yıl';

const TURKEY_REGION: Region = {
  latitude: 39,
  longitude: 35,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

const LOCATION_TYPES: { label: string; value: LocationType }[] = [
  { label: 'Spot', value: 'spot' },
  { label: 'Marina', value: 'marina' },
  { label: 'Dükkan', value: 'shop' },
  { label: 'Tehlike', value: 'hazard' },
  { label: 'Diğer', value: 'other' },
];

const SEASONS: SeasonOption[] = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış', 'Tüm Yıl'];

const styles = StyleSheet.create({
  mapCard: {
    backgroundColor: SPORT_THEME.surface,
    borderColor: SPORT_THEME.border,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoCard: {
    backgroundColor: SPORT_THEME.surface,
    borderColor: SPORT_THEME.border,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  map: {
    height: 240,
    width: '100%',
  },
  crosshairWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    left: '50%',
    marginLeft: -18,
    marginTop: -18,
    position: 'absolute',
    top: '50%',
  },
  crosshair: {
    alignItems: 'center',
    backgroundColor: 'rgba(5,6,8,0.90)',
    borderColor: 'rgba(212,255,0,0.55)',
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  fieldLabel: {
    color: SPORT_THEME.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textField: {
    backgroundColor: SPORT_THEME.surface,
    borderColor: SPORT_THEME.border,
    borderRadius: 18,
    borderWidth: 1,
    color: SPORT_THEME.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});

const NewLocationScreen = (): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  const [mapRegion, setMapRegion] = useState<Region>(TURKEY_REGION);
  const [locationName, setLocationName] = useState<string>('');
  const [locationDescription, setLocationDescription] = useState<string>('');
  const [locationFishSpecies, setLocationFishSpecies] = useState<string>('');
  const [locationBestSeason, setLocationBestSeason] = useState<SeasonOption>('Tüm Yıl');
  const [locationType, setLocationType] = useState<LocationType>('spot');
  const [locationIsPublic, setLocationIsPublic] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const loadUserLocation = async (): Promise<void> => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!isMounted) {
          return;
        }

        setMapRegion({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        });
      } catch {
        // leave default region
      }
    };

    void loadUserLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const createMutation = useMutation({
    mutationFn: async () =>
      createFishingLocation({
        name: locationName.trim(),
        description: locationDescription.trim() || null,
        type: locationType,
        location: `POINT(${mapRegion.longitude} ${mapRegion.latitude})`,
        photo_url: null,
        is_public: locationIsPublic,
        fish_species: locationFishSpecies
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        best_season: locationBestSeason,
      }),
    onSuccess: async (row) => {
      const nextLocation: FishingLocationMapItem = {
        ...row,
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
        is_liked: false,
        username: profile?.username ?? null,
      };

      queryClient.setQueryData<FishingLocationMapItem[]>(['fishing-locations'], (current) =>
        current ? [nextLocation, ...current] : [nextLocation],
      );
      queryClient.setQueryData<FishingLocationMapItem[]>(['user-fishing-locations', profile?.id], (current) =>
        current ? [nextLocation, ...current] : [nextLocation],
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['fishing-locations'] }),
        queryClient.invalidateQueries({ queryKey: ['user-fishing-locations', profile?.id] }),
      ]);

      router.replace('/locations' as Href);
    },
  });

  const handleSave = async (): Promise<void> => {
    if (!locationName.trim()) {
      Alert.alert('Eksik bilgi', 'Yer imi için bir isim gir.');
      return;
    }

    try {
      await createMutation.mutateAsync();
    } catch (error: unknown) {
      Alert.alert(
        'Yer imi kaydedilemedi',
        error instanceof Error ? error.message : 'Bir hata oluştu.',
      );
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Yer İmi Ekle' }} />
      <ScrollView
        className="flex-1 bg-main px-4"
        contentContainerStyle={{
          gap: 18,
          paddingBottom: 28,
          paddingTop: Math.max(insets.top, 16),
        }}
      >
        <View style={styles.mapCard}>
          <MapView
            initialRegion={mapRegion}
            onRegionChangeComplete={setMapRegion}
            provider={PROVIDER_DEFAULT}
            region={mapRegion}
            style={styles.map}
          />
          <View pointerEvents="none" style={styles.crosshairWrap}>
            <View style={styles.crosshair}>
              <Text style={{ color: '#D4FF00', fontSize: 20 }}>+</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text className="text-sm font-semibold text-white">Merkez Konum</Text>
          <Text className="mt-2 text-sm text-white/70">
            Haritayı kaydır, iğneyi istediğin noktaya getir.
          </Text>
          <Text className="mt-2 text-xs text-white/45">
            {mapRegion.latitude.toFixed(4)}, {mapRegion.longitude.toFixed(4)}
          </Text>
        </View>

        <View className="gap-3">
          <Text style={styles.fieldLabel}>Yer adı</Text>
          <TextInput
            onChangeText={setLocationName}
            placeholder="Örn. Sarıyer taşlık kıyı"
            placeholderTextColor="rgba(240,247,249,0.45)"
            style={styles.textField}
            value={locationName}
          />
        </View>

        <View className="gap-3">
          <Text style={styles.fieldLabel}>Tür</Text>
          <View className="flex-row flex-wrap gap-2">
            {LOCATION_TYPES.map((item) => {
              const isSelected = locationType === item.value;

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  className={`rounded-full border px-4 py-3 ${
                    isSelected ? 'border-coral bg-coral' : 'border-white/10 bg-[#11141A]'
                  }`}
                  key={item.value}
                  onPress={() => setLocationType(item.value)}
                >
                  <Text className={isSelected ? 'font-semibold text-white' : 'text-white/70'}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="gap-3">
          <Text style={styles.fieldLabel}>Açıklama</Text>
          <TextInput
            multiline
            onChangeText={setLocationDescription}
            placeholder="Dip yapısı, dikkat edilmesi gereken noktalar veya kısa not..."
            placeholderTextColor="rgba(240,247,249,0.45)"
            style={[styles.textField, { minHeight: 110, textAlignVertical: 'top' }]}
            value={locationDescription}
          />
        </View>

        <View className="gap-3">
          <Text style={styles.fieldLabel}>Türler</Text>
          <TextInput
            onChangeText={setLocationFishSpecies}
            placeholder="Levrek, çupra, lüfer"
            placeholderTextColor="rgba(240,247,249,0.45)"
            style={styles.textField}
            value={locationFishSpecies}
          />
        </View>

        <View className="gap-3">
          <Text style={styles.fieldLabel}>En iyi sezon</Text>
          <View className="flex-row flex-wrap gap-2">
            {SEASONS.map((item) => {
              const isSelected = locationBestSeason === item;

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  className={`rounded-full border px-4 py-3 ${
                    isSelected ? 'border-coral bg-coral' : 'border-white/10 bg-[#11141A]'
                  }`}
                  key={item}
                  onPress={() => setLocationBestSeason(item)}
                >
                  <Text className={isSelected ? 'font-semibold text-white' : 'text-white/70'}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="gap-3">
          <Text style={styles.fieldLabel}>Görünürlük</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              activeOpacity={0.8}
              className={`flex-1 rounded-2xl border px-4 py-3 ${
                locationIsPublic ? 'border-coral bg-coral' : 'border-white/10 bg-[#11141A]'
              }`}
              onPress={() => setLocationIsPublic(true)}
            >
              <Text className={`text-center font-semibold ${locationIsPublic ? 'text-white' : 'text-white/70'}`}>
                Herkese Açık
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              className={`flex-1 rounded-2xl border px-4 py-3 ${
                !locationIsPublic ? 'border-coral bg-coral' : 'border-white/10 bg-[#11141A]'
              }`}
              onPress={() => setLocationIsPublic(false)}
            >
              <Text className={`text-center font-semibold ${!locationIsPublic ? 'text-white' : 'text-white/70'}`}>
                Sadece Ben
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          className="items-center rounded-[20px] bg-coral px-5 py-4"
          disabled={createMutation.isPending}
          onPress={() => void handleSave()}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-base font-semibold text-white">Yer İmini Kaydet</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
};

export default NewLocationScreen;
