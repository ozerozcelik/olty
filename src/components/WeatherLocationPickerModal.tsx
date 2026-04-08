import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { SPORT_THEME } from '@/lib/sport-theme';
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  type MapPressEvent,
} from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  resolveCurrentWeatherLocation,
  resolveWeatherLocationLabel,
} from '@/hooks/useWeather';
import type { WeatherLocationSelection } from '@/types/app.types';

const TURKEY_REGION = {
  latitude: 39,
  longitude: 35,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

const COLORS = {
  background: SPORT_THEME.bg,
  surface: 'rgba(255,255,255,0.04)',
  border: SPORT_THEME.border,
  text: SPORT_THEME.text,
  textMuted: SPORT_THEME.textMuted,
  textLabel: 'rgba(139,146,165,0.60)',
  accent: SPORT_THEME.active,
  coral: SPORT_THEME.warning,
  placeholder: '#8A958D',
};

interface WeatherLocationPickerModalProps {
  initialLocation: WeatherLocationSelection | null;
  onClose: () => void;
  onConfirm: (location: WeatherLocationSelection) => Promise<void>;
  visible: boolean;
}

export const WeatherLocationPickerModal = ({
  initialLocation,
  onClose,
  onConfirm,
  visible,
}: WeatherLocationPickerModalProps): JSX.Element => {
  const [searchValue, setSearchValue] = useState<string>('');
  const [pendingLocation, setPendingLocation] =
    useState<WeatherLocationSelection | null>(initialLocation);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setPendingLocation(initialLocation);
      setSearchValue(initialLocation?.label ?? '');
      // Delay map initialization to prevent crash
      const timer = setTimeout(() => setMapReady(true), 100);
      return () => clearTimeout(timer);
    } else {
      setMapReady(false);
    }
  }, [initialLocation, visible]);

  const handleSearch = async (): Promise<void> => {
    const trimmedValue = searchValue.trim();

    if (!trimmedValue) {
      return;
    }

    Keyboard.dismiss();
    setIsBusy(true);

    try {
      const geocoded = await Location.geocodeAsync(trimmedValue);
      const firstMatch = geocoded[0];

      if (firstMatch) {
        setPendingLocation({
          latitude: firstMatch.latitude,
          longitude: firstMatch.longitude,
          label: trimmedValue,
        });
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleUseCurrentLocation = async (): Promise<void> => {
    Keyboard.dismiss();
    setIsBusy(true);

    try {
      const currentLocation = await resolveCurrentWeatherLocation();
      setPendingLocation(currentLocation);
      setSearchValue(currentLocation.label);
    } finally {
      setIsBusy(false);
    }
  };

  const handleMapPress = (event: MapPressEvent): void => {
    const nextCoordinate = event.nativeEvent.coordinate;
    setPendingLocation({
      latitude: nextCoordinate.latitude,
      longitude: nextCoordinate.longitude,
      label: pendingLocation?.label ?? 'Seçilen Konum',
    });
  };

  const handleConfirm = async (): Promise<void> => {
    if (!pendingLocation) {
      return;
    }

    setIsBusy(true);

    try {
      const label = await resolveWeatherLocationLabel(
        pendingLocation.latitude,
        pendingLocation.longitude,
        pendingLocation.label,
      );
      await onConfirm({
        ...pendingLocation,
        label,
      });
      onClose();
    } finally {
      setIsBusy(false);
    }
  };

  const mapRegion = pendingLocation
    ? {
        latitude: pendingLocation.latitude,
        longitude: pendingLocation.longitude,
        latitudeDelta: 0.8,
        longitudeDelta: 0.8,
      }
    : TURKEY_REGION;

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Konum Seç</Text>
            <Text style={styles.subtitle}>
              Şehir ara, mevcut konumunu kullan veya haritada bir nokta seç.
            </Text>
          </View>

          <View style={styles.searchSection}>
            <TextInput
              onChangeText={setSearchValue}
              onSubmitEditing={() => void handleSearch()}
              placeholder="Şehir ara"
              placeholderTextColor={COLORS.placeholder}
              returnKeyType="search"
              style={styles.searchInput}
              value={searchValue}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => void handleSearch()}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Şehir Bul</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => void handleUseCurrentLocation()}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Mevcut Konumum</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.mapContainer}>
            {mapReady ? (
              <MapView
                initialRegion={mapRegion}
                onPress={handleMapPress}
                provider={PROVIDER_DEFAULT}
                style={styles.map}
              >
                {pendingLocation ? (
                  <Marker
                    coordinate={{
                      latitude: pendingLocation.latitude,
                      longitude: pendingLocation.longitude,
                    }}
                  />
                ) : null}
              </MapView>
            ) : (
              <View style={styles.mapLoading}>
                <ActivityIndicator color={COLORS.accent} size="large" />
                <Text style={styles.mapLoadingText}>Harita yükleniyor...</Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.selectionBox}>
              <Text style={styles.selectionLabel}>SEÇİLEN KONUM</Text>
              <Text style={styles.selectionValue}>
                {pendingLocation?.label ?? 'Henüz seçilmedi'}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={!pendingLocation || isBusy}
                onPress={() => void handleConfirm()}
                style={[styles.confirmBtn, (!pendingLocation || isBusy) && styles.confirmBtnDisabled]}
              >
                {isBusy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Onayla</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onClose}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textMuted,
  },
  searchSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
  searchInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    fontSize: 16,
    color: COLORS.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryBtn: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mapLoadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  selectionBox: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  selectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: COLORS.textLabel,
    textTransform: 'uppercase',
  },
  selectionValue: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionButtons: {
    marginTop: 16,
    gap: 12,
  },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: COLORS.coral,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});
