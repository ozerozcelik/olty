import { Ionicons } from '@expo/vector-icons';
import Mapbox, {
  Camera,
  PointAnnotation,
  RasterLayer,
  RasterSource,
  UserLocation,
  type Camera as MapboxCameraRef,
  type MapState,
  type ScreenPointPayload,
} from '@rnmapbox/maps';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Feature, Point } from 'geojson';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TouchableOpacity } from '@/components/TouchableOpacity';
import { GlassView } from '@/components/GlassView';
import { publicEnv } from '@/lib/env';
import { SPORT_THEME } from '@/lib/sport-theme';
import { getMapCatches } from '@/services/catches.service';
import {
  createFishingLocation,
  getFishingLocations,
  likeLocation,
  unlikeLocation,
} from '@/services/fishingLocations.service';
import { fetchSeaDepth } from '@/services/weather.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { FishingLocationMapItem, LocationType, MapCatchItem } from '@/types/app.types';
import { shareCatchExternally } from '@/utils/catchShare';
import { formatDate } from '@/utils/date';

type MapMode = 'uydu' | 'denizcilik' | 'batimetri';
type SeasonOption = 'İlkbahar' | 'Yaz' | 'Sonbahar' | 'Kış' | 'Tüm Yıl';
type LegacyLongPressEvent = Parameters<NonNullable<ComponentProps<typeof MapView>['onLongPress']>>[0];
type Coord = { latitude: number; longitude: number };
type DepthCard = Coord & { x: number; y: number; title: string; subtitle: string; loading: boolean };

const MAPBOX_TOKEN = publicEnv.mapboxAccessToken;
const TURKEY_REGION: Region = { latitude: 39, longitude: 35, latitudeDelta: 12, longitudeDelta: 12 };
const TILE_LAYERS = {
  seamark: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
  gebco: 'https://tiles.gebco.net/tiles/gebco_latest_2/{z}/{x}/{y}.png',
} as const;
const COLORS = {
  bg: SPORT_THEME.bg,
  surface: SPORT_THEME.surface,
  soft: 'rgba(255,255,255,0.06)',
  border: SPORT_THEME.border,
  text: SPORT_THEME.text,
  subtext: SPORT_THEME.textMuted,
  muted: 'rgba(139,146,165,0.68)',
  accent: SPORT_THEME.active,
  blue: '#5C87FF',
  coral: SPORT_THEME.warning,
} as const;
const MODES: { key: MapMode; label: string }[] = [
  { key: 'uydu', label: 'Uydu' },
  { key: 'denizcilik', label: 'Denizcilik' },
  { key: 'batimetri', label: 'Batimetri' },
];
const LOCATION_TYPES: { label: string; value: LocationType }[] = [
  { label: 'Spot', value: 'spot' },
  { label: 'Marina', value: 'marina' },
  { label: 'Dükkan', value: 'shop' },
  { label: 'Tehlike', value: 'hazard' },
  { label: 'Diğer', value: 'other' },
];
const SEASONS: SeasonOption[] = ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış', 'Tüm Yıl'];
const LOCATION_MARKERS: Record<LocationType, { emoji: string; color: string; border: string }> = {
  spot: { emoji: '📍', color: 'rgba(232,132,90,0.92)', border: 'rgba(232,132,90,0.62)' },
  marina: { emoji: '⚓', color: 'rgba(59,130,246,0.92)', border: 'rgba(59,130,246,0.62)' },
  shop: { emoji: '🟢', color: 'rgba(0,208,132,0.92)', border: 'rgba(0,208,132,0.55)' },
  hazard: { emoji: '⚠️', color: 'rgba(240,180,41,0.92)', border: 'rgba(240,180,41,0.60)' },
  other: { emoji: '📌', color: 'rgba(255,255,255,0.24)', border: 'rgba(255,255,255,0.18)' },
};

const locationTypeLabel = (type: LocationType): string =>
  ({ spot: 'Balık Noktası', marina: 'Marina', shop: 'Balıkçı Dükkanı', hazard: 'Tehlike', other: 'Diğer' })[type];

const depthCategoryLabel = (depth: number): string => {
  if (depth < 5) return 'Çok sığ';
  if (depth < 20) return 'Sığ';
  if (depth < 50) return 'Orta derinlik';
  return 'Derin';
};

const openLocationInMaps = async (latitude: number, longitude: number, label?: string | null): Promise<void> => {
  const encodedLabel = encodeURIComponent(label?.trim() || 'Konum');
  const geoUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`;
  const appleUrl = `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodedLabel}`;
  const primaryUrl = Platform.OS === 'ios' ? appleUrl : geoUrl;
  const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  if (await Linking.canOpenURL(primaryUrl)) {
    await Linking.openURL(primaryUrl);
    return;
  }
  await Linking.openURL(fallbackUrl);
};

const getModeLabel = (mode: MapMode, usingMapbox: boolean): string => {
  if (!usingMapbox) return 'Mapbox anahtarı yok, geçici görünüm açık.';
  return { uydu: 'Mapbox uydu', denizcilik: 'Uydu + seamark', batimetri: 'Uydu + batimetri' }[mode];
};

const MapScreen = (): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  const legacyMapRef = useRef<MapView>(null);
  const cameraRef = useRef<MapboxCameraRef>(null);
  const depthTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const centeredRef = useRef<boolean>(false);
  const usingMapbox = MAPBOX_TOKEN.length > 0;

  const [mapboxReady, setMapboxReady] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<Coord | null>(null);
  const [legacyRegion, setLegacyRegion] = useState<Region>(TURKEY_REGION);
  const [cameraCenter, setCameraCenter] = useState<Coord>({ latitude: TURKEY_REGION.latitude, longitude: TURKEY_REGION.longitude });
  const [selectedCatch, setSelectedCatch] = useState<MapCatchItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<FishingLocationMapItem | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('batimetri');
  const [showCatches, setShowCatches] = useState<boolean>(true);
  const [showLocations, setShowLocations] = useState<boolean>(true);
  const [layersOpen, setLayersOpen] = useState<boolean>(false);
  const [pinDropMode, setPinDropMode] = useState<boolean>(false);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [pendingPin, setPendingPin] = useState<Coord | null>(null);
  const [depthCard, setDepthCard] = useState<DepthCard | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [locationDescription, setLocationDescription] = useState<string>('');
  const [locationFishSpecies, setLocationFishSpecies] = useState<string>('');
  const [locationBestSeason, setLocationBestSeason] = useState<SeasonOption>('Tüm Yıl');
  const [locationType, setLocationType] = useState<LocationType>('spot');
  const [locationIsPublic, setLocationIsPublic] = useState<boolean>(true);

  const catchesQuery = useQuery({ queryKey: ['map-catches'], queryFn: getMapCatches });
  const locationsQuery = useQuery({ queryKey: ['fishing-locations'], queryFn: getFishingLocations });
  const activeCenter = usingMapbox ? cameraCenter : { latitude: legacyRegion.latitude, longitude: legacyRegion.longitude };
  const showSeamark = mapMode !== 'uydu';
  const showBathymetry = mapMode === 'batimetri';
  const previewBottom = Math.max(insets.bottom, 16) + 176;
  const fabBottom = Math.max(insets.bottom, 16) + 138;
  const modeBottom = Math.max(insets.bottom, 16) + 76;
  const pinBottom = Math.max(insets.bottom, 16) + 138;

  const statsText = useMemo((): string => {
    if (catchesQuery.isLoading || locationsQuery.isLoading) return 'Harita verileri yükleniyor...';
    const catchCount = showCatches ? catchesQuery.data?.length ?? 0 : 0;
    const locationCount = showLocations ? locationsQuery.data?.length ?? 0 : 0;
    return `${catchCount} av, ${locationCount} balık noktası gösteriliyor.`;
  }, [catchesQuery.data, catchesQuery.isLoading, locationsQuery.data, locationsQuery.isLoading, showCatches, showLocations]);

  const clearSelections = (): void => {
    setSelectedCatch(null);
    setSelectedLocation(null);
  };

  const dismissDepthCard = (): void => {
    if (depthTimerRef.current) clearTimeout(depthTimerRef.current);
    depthTimerRef.current = null;
    setDepthCard(null);
  };

  const scheduleDepthDismiss = (): void => {
    if (depthTimerRef.current) clearTimeout(depthTimerRef.current);
    depthTimerRef.current = setTimeout(() => setDepthCard(null), 5000);
  };

  const resetForm = (): void => {
    setFormVisible(false);
    setPinDropMode(false);
    setPendingPin(null);
    setLocationName('');
    setLocationDescription('');
    setLocationFishSpecies('');
    setLocationBestSeason('Tüm Yıl');
    setLocationType('spot');
    setLocationIsPublic(true);
  };

  useEffect(() => {
    let mounted = true;
    const loadLocation = async (): Promise<void> => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mounted) return;
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setUserLocation(next);
        setCameraCenter(next);
        setLegacyRegion((current) => ({ ...current, latitude: next.latitude, longitude: next.longitude }));
      } catch {}
    };
    void loadLocation();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!usingMapbox) return;
    const initMapbox = async (): Promise<void> => {
      try {
        await Mapbox.setAccessToken(MAPBOX_TOKEN);
        await Mapbox.setTelemetryEnabled(false);
        setMapboxReady(true);
      } catch (error) {
        console.warn('Mapbox initialization failed:', error);
        setMapboxReady(false);
      }
    };
    void initMapbox();
  }, [usingMapbox]);

  useEffect(() => {
    if (!userLocation || centeredRef.current) return;
    centeredRef.current = true;
    if (usingMapbox) {
      cameraRef.current?.setCamera({
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: 8.3,
        animationDuration: 900,
        animationMode: 'flyTo',
      });
    } else {
      legacyMapRef.current?.animateToRegion({ ...userLocation, latitudeDelta: 1.4, longitudeDelta: 1.4 }, 800);
    }
  }, [userLocation, usingMapbox]);

  useEffect(() => () => { if (depthTimerRef.current) clearTimeout(depthTimerRef.current); }, []);

  const createLocationMutation = useMutation({
    mutationFn: async () => {
      if (!pendingPin) throw new Error('Harita merkezi okunamadı.');
      return createFishingLocation({
        best_season: locationBestSeason,
        description: locationDescription.trim() || null,
        fish_species: locationFishSpecies.split(',').map((item) => item.trim()).filter(Boolean),
        is_public: locationIsPublic,
        location: `POINT(${pendingPin.longitude} ${pendingPin.latitude})`,
        name: locationName.trim(),
        photo_url: null,
        type: locationType,
      });
    },
    onSuccess: async (row) => {
      const point = pendingPin ?? activeCenter;
      const nextLocation: FishingLocationMapItem = { ...row, latitude: point.latitude, longitude: point.longitude, is_liked: false, username: profile?.username ?? null };
      queryClient.setQueryData<FishingLocationMapItem[]>(['fishing-locations'], (current) => current ? [nextLocation, ...current] : [nextLocation]);
      resetForm();
      setSelectedLocation(nextLocation);
      await queryClient.invalidateQueries({ queryKey: ['fishing-locations'] });
    },
  });

  const likeLocationMutation = useMutation({
    mutationFn: async (item: FishingLocationMapItem) => item.is_liked ? unlikeLocation(item.id) : likeLocation(item.id),
    onSuccess: async (_, item) => {
      const delta = item.is_liked ? -1 : 1;
      queryClient.setQueryData<FishingLocationMapItem[]>(['fishing-locations'], (current) =>
        (current ?? []).map((entry) => entry.id === item.id ? { ...entry, is_liked: !entry.is_liked, like_count: Math.max(0, entry.like_count + delta) } : entry));
      setSelectedLocation((current) => current && current.id === item.id ? { ...current, is_liked: !current.is_liked, like_count: Math.max(0, current.like_count + delta) } : current);
      await queryClient.invalidateQueries({ queryKey: ['fishing-locations'] });
    },
  });

  const goToUserLocation = (): void => {
    if (!userLocation) return;
    clearSelections();
    dismissDepthCard();
    if (usingMapbox) {
      cameraRef.current?.setCamera({ centerCoordinate: [userLocation.longitude, userLocation.latitude], zoomLevel: 10.2, animationDuration: 800, animationMode: 'flyTo' });
    } else {
      legacyMapRef.current?.animateToRegion({ ...userLocation, latitudeDelta: 0.18, longitudeDelta: 0.18 }, 600);
    }
  };

  const openFormAtCenter = (): void => {
    setPendingPin(activeCenter);
    setFormVisible(true);
  };

  const presentDepthCard = async (latitude: number, longitude: number, point: { x: number; y: number }): Promise<void> => {
    clearSelections();
    setDepthCard({
      latitude,
      longitude,
      x: Math.max(16, Math.min(point.x - 90, 180)),
      y: Math.max(126, point.y - 120),
      title: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      subtitle: 'Derinlik hesaplanıyor...',
      loading: true,
    });
    scheduleDepthDismiss();
    try {
      const result = await fetchSeaDepth(latitude, longitude);
      const subtitle = result.depth === null ? 'Kara' : `Derinlik: ~${Math.round(result.depth)} m • ${depthCategoryLabel(result.depth)}`;
      setDepthCard((current) => current ? { ...current, loading: false, subtitle } : current);
    } catch {
      setDepthCard((current) => current ? { ...current, loading: false, subtitle: 'Derinlik bilgisi alınamadı' } : current);
    }
    scheduleDepthDismiss();
  };

  const handleLegacyLongPress = async (event: LegacyLongPressEvent): Promise<void> => {
    const point = (event.nativeEvent as typeof event.nativeEvent & { position?: { x?: number; y?: number } }).position;
    await presentDepthCard(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude, { x: point?.x ?? 96, y: point?.y ?? 220 });
  };

  const handleMapboxLongPress = async (feature: Feature<Point, ScreenPointPayload>): Promise<void> => {
    const [longitude, latitude] = feature.geometry.coordinates;
    await presentDepthCard(latitude, longitude, { x: feature.properties.screenPointX, y: feature.properties.screenPointY });
  };

  const handleSaveLocation = async (): Promise<void> => {
    if (!locationName.trim()) {
      Alert.alert('Eksik bilgi', 'Yer imi için bir isim gir.');
      return;
    }
    try {
      await createLocationMutation.mutateAsync();
    } catch (error) {
      Alert.alert('Yer imi kaydedilemedi', error instanceof Error ? error.message : 'Bir hata oluştu.');
    }
  };

  return (
    <View style={styles.container}>
      {usingMapbox && mapboxReady ? (
        <Mapbox.MapView
          attributionEnabled
          compassEnabled
          localizeLabels={{ locale: 'tr' }}
          logoEnabled
          onCameraChanged={(state: MapState) => {
            const [longitude, latitude] = state.properties.center;
            setCameraCenter({ latitude, longitude });
          }}
          onLongPress={(feature) => void handleMapboxLongPress(feature)}
          onPress={() => { clearSelections(); dismissDepthCard(); }}
          scaleBarEnabled={false}
          style={styles.map}
          styleURL={String(Mapbox.StyleURL.SatelliteStreet)}
        >
          <Camera ref={cameraRef} defaultSettings={{ centerCoordinate: [TURKEY_REGION.longitude, TURKEY_REGION.latitude], zoomLevel: 4.2 }} maxZoomLevel={16} minZoomLevel={3} />
          <UserLocation minDisplacement={6} onUpdate={(location) => setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude })} visible />
          {showBathymetry ? (
            <RasterSource id="gebco" maxZoomLevel={14} minZoomLevel={0} tileSize={256} tileUrlTemplates={[TILE_LAYERS.gebco]}>
              <RasterLayer id="gebco-layer" style={{ rasterOpacity: 0.36, rasterResampling: 'linear' }} />
            </RasterSource>
          ) : null}
          {showSeamark ? (
            <RasterSource id="seamark" maxZoomLevel={18} minZoomLevel={0} tileSize={256} tileUrlTemplates={[TILE_LAYERS.seamark]}>
              <RasterLayer id="seamark-layer" style={{ rasterOpacity: 0.92, rasterResampling: 'linear' }} />
            </RasterSource>
          ) : null}
          {showCatches && (catchesQuery.data ?? []).map((item) => (
            <PointAnnotation anchor={{ x: 0.5, y: 0.5 }} coordinate={[item.longitude, item.latitude]} id={`catch-${item.id}`} key={item.id} onSelected={() => { setSelectedLocation(null); setSelectedCatch(item); }}>
              <View style={styles.catchMarker}><Text style={styles.markerText}>🎣</Text></View>
            </PointAnnotation>
          ))}
          {showLocations && (locationsQuery.data ?? []).map((item) => (
            <PointAnnotation anchor={{ x: 0.5, y: 0.5 }} coordinate={[item.longitude, item.latitude]} id={`location-${item.id}`} key={item.id} onSelected={() => { setSelectedCatch(null); setSelectedLocation(item); }}>
              <View style={[styles.locationMarker, { backgroundColor: LOCATION_MARKERS[item.type].color, borderColor: LOCATION_MARKERS[item.type].border }]}><Text style={styles.markerText}>{LOCATION_MARKERS[item.type].emoji}</Text></View>
            </PointAnnotation>
          ))}
        </Mapbox.MapView>
      ) : !usingMapbox ? (
        <MapView
          initialRegion={TURKEY_REGION}
          mapType="satellite"
          onLongPress={(event) => void handleLegacyLongPress(event)}
          onPress={() => { clearSelections(); dismissDepthCard(); }}
          onRegionChangeComplete={(region) => setLegacyRegion(region)}
          provider={PROVIDER_DEFAULT}
          ref={legacyMapRef}
          showsCompass
          showsUserLocation
          style={styles.map}
        >
          {showBathymetry ? <UrlTile opacity={0.34} shouldReplaceMapContent={false} urlTemplate={TILE_LAYERS.gebco} zIndex={1} /> : null}
          {showSeamark ? <UrlTile opacity={0.9} shouldReplaceMapContent={false} urlTemplate={TILE_LAYERS.seamark} zIndex={2} /> : null}
          {showCatches && (catchesQuery.data ?? []).map((item) => (
            <Marker coordinate={{ latitude: item.latitude, longitude: item.longitude }} key={item.id} onPress={() => { setSelectedLocation(null); setSelectedCatch(item); }}>
              <View style={styles.catchMarker}><Text style={styles.markerText}>🎣</Text></View>
            </Marker>
          ))}
          {showLocations && (locationsQuery.data ?? []).map((item) => (
            <Marker coordinate={{ latitude: item.latitude, longitude: item.longitude }} key={item.id} onPress={() => { setSelectedCatch(null); setSelectedLocation(item); }}>
              <View style={[styles.locationMarker, { backgroundColor: LOCATION_MARKERS[item.type].color, borderColor: LOCATION_MARKERS[item.type].border }]}><Text style={styles.markerText}>{LOCATION_MARKERS[item.type].emoji}</Text></View>
            </Marker>
          ))}
        </MapView>
      ) : (
        <View style={[styles.map, styles.loadingContainer]}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.loadingText}>Harita yükleniyor...</Text>
        </View>
      )}

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
        <View>
          <Text style={styles.title}>MAP</Text>
          <Text style={styles.subtitle}>{statsText}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.85} onPress={() => setLayersOpen((current) => !current)} style={styles.pill}>
          <Text style={styles.pillText}>Katmanlar</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.badge, { top: Math.max(insets.top, 20) + 92 }]}><Text style={styles.badgeText}>{getModeLabel(mapMode, usingMapbox)}</Text></View>

      {layersOpen ? (
        <TouchableOpacity activeOpacity={1} onPress={() => setLayersOpen(false)} style={styles.layersOverlay}>
          <GlassView borderRadius={18} intensity={18} style={{ position: 'absolute', right: 16, padding: 12, minWidth: 188, gap: 8, top: Math.max(insets.top, 20) + 108 }}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => setShowCatches((current) => !current)} style={styles.panelRow}>
              <Text style={styles.panelLabel}>🎣 Avlar</Text>
              <View style={[styles.switchTrack, showCatches ? styles.switchTrackActive : null]}><View style={[styles.switchThumb, showCatches ? styles.switchThumbActive : null]} /></View>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={() => setShowLocations((current) => !current)} style={styles.panelRow}>
              <Text style={styles.panelLabel}>📍 Balık Noktaları</Text>
              <View style={[styles.switchTrack, showLocations ? styles.switchTrackActive : null]}><View style={[styles.switchThumb, showLocations ? styles.switchThumbActive : null]} /></View>
            </TouchableOpacity>
          </GlassView>
        </TouchableOpacity>
      ) : null}

      {pinDropMode ? (
        <>
          <View pointerEvents="none" style={styles.crosshairWrap}><View style={styles.crosshairOuter}><View style={styles.crosshairInner} /></View></View>
          <GlassView borderRadius={18} intensity={18} style={{ position: 'absolute', alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 10, top: Math.max(insets.top, 20) + 144 }}><Text style={styles.floatingNoteText}>Konumu seçmek için haritayı kaydırın</Text></GlassView>
          <TouchableOpacity activeOpacity={0.88} onPress={openFormAtCenter} style={[styles.primaryFab, { bottom: pinBottom, alignSelf: 'center' }]}><Text style={styles.primaryFabText}>Buraya Ekle</Text></TouchableOpacity>
        </>
      ) : null}

      {depthCard ? (
        <GlassView borderRadius={16} intensity={18} style={{ position: 'absolute', maxWidth: 220, paddingHorizontal: 12, paddingVertical: 10, left: depthCard.x, top: depthCard.y }}>
          <TouchableOpacity activeOpacity={0.95} onPress={dismissDepthCard}>
            <Text style={styles.depthTitle}>{depthCard.title}</Text>
            <Text style={styles.depthSubtitle}>{depthCard.loading ? 'Derinlik hesaplanıyor...' : depthCard.subtitle}</Text>
          </TouchableOpacity>
        </GlassView>
      ) : null}

      {selectedCatch ? (
        <GlassView borderRadius={26} intensity={18} style={[styles.previewCard, { bottom: previewBottom }] }>
          <View style={styles.previewMedia}>
            {selectedCatch.photoUrl ? <Image contentFit="cover" source={{ uri: selectedCatch.photoUrl }} style={styles.previewImage} /> : <View style={styles.placeholder}><Text style={styles.placeholderEmoji}>🎣</Text><Text style={styles.placeholderText}>Fotoğraf yok</Text></View>}
          </View>
          <View style={styles.previewBody}>
            <View style={styles.tag}><Text style={styles.tagText}>İşaretli Av</Text></View>
            <Text style={styles.previewTitle}>{selectedCatch.speciesName}</Text>
            <Text style={styles.previewMeta}>{selectedCatch.lengthCm ? `${selectedCatch.lengthCm} cm • ` : ''}@{selectedCatch.username}</Text>
            <Text style={styles.previewMeta}>{formatDate(selectedCatch.createdAt)}</Text>
            <View style={styles.actions}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/catch/${selectedCatch.id}`)} style={[styles.actionBtn, styles.actionBtnMuted]}><Ionicons color={COLORS.text} name="eye-outline" size={18} /></TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} onPress={() => void openLocationInMaps(selectedCatch.latitude, selectedCatch.longitude, selectedCatch.speciesName)} style={styles.actionBtn}><Ionicons color="#FFFFFF" name="navigate-outline" size={18} /></TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} onPress={() => void shareCatchExternally({ catchId: selectedCatch.id, sharedByUsername: selectedCatch.username, speciesName: selectedCatch.speciesName })} style={styles.actionBtn}><Ionicons color="#FFFFFF" name="share-social-outline" size={18} /></TouchableOpacity>
            </View>
          </View>
        </GlassView>
      ) : null}

      {selectedLocation && !selectedCatch ? (
        <GlassView borderRadius={26} intensity={18} style={[styles.previewCard, { bottom: previewBottom }] }>
          <View style={[styles.previewMedia, styles.locationMedia]}>
            <View style={[styles.locationMarker, styles.locationPreviewMarker, { backgroundColor: LOCATION_MARKERS[selectedLocation.type].color, borderColor: LOCATION_MARKERS[selectedLocation.type].border }]}><Text style={styles.markerText}>{LOCATION_MARKERS[selectedLocation.type].emoji}</Text></View>
          </View>
          <View style={styles.previewBody}>
            <View style={styles.tag}><Text style={styles.tagText}>{selectedLocation.is_public ? 'Herkese Açık Yer İmi' : 'Kişisel Yer İmi'}</Text></View>
            <Text style={styles.previewTitle}>{selectedLocation.name}</Text>
            <Text style={styles.previewMeta}>{locationTypeLabel(selectedLocation.type)}</Text>
            {selectedLocation.description ? <Text numberOfLines={2} style={styles.previewDescription}>{selectedLocation.description}</Text> : null}
            <Text style={styles.previewMeta}>{selectedLocation.like_count} beğeni{selectedLocation.username ? ` • @${selectedLocation.username}` : ''}</Text>
            <View style={styles.actions}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => router.push({ pathname: '/locations/[id]', params: { id: selectedLocation.id } })} style={[styles.actionBtn, styles.actionBtnMuted]}><Ionicons color={COLORS.text} name="eye-outline" size={18} /></TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} onPress={() => void likeLocationMutation.mutate(selectedLocation)} style={styles.actionBtn}><Ionicons color="#FFFFFF" name={selectedLocation.is_liked ? 'heart' : 'heart-outline'} size={18} /></TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} onPress={() => void openLocationInMaps(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.name)} style={[styles.actionBtn, likeLocationMutation.isPending ? styles.disabled : null]}><Ionicons color="#FFFFFF" name="navigate-outline" size={18} /></TouchableOpacity>
            </View>
          </View>
        </GlassView>
      ) : null}

      <View style={[styles.modeWrap, { bottom: modeBottom }]}><View style={styles.modeRow}>
        {MODES.map((mode) => {
          const active = mode.key === mapMode;
          return <TouchableOpacity activeOpacity={0.85} key={mode.key} onPress={() => setMapMode(mode.key)} style={[styles.modePill, active ? styles.modePillActive : null]}><Text style={[styles.modeText, active ? styles.modeTextActive : null]}>{mode.label}</Text></TouchableOpacity>;
        })}
      </View></View>

      <View style={[styles.fabStack, { bottom: fabBottom }]}>
        <GlassView borderRadius={26} intensity={18} style={{ borderRadius: 26 }}>
          <TouchableOpacity activeOpacity={0.85} onPress={goToUserLocation} style={[styles.fab, !userLocation ? styles.disabled : null]}><Ionicons color={COLORS.blue} name="locate" size={22} /></TouchableOpacity>
        </GlassView>
        <GlassView borderRadius={26} intensity={18} style={{ borderRadius: 26 }}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => { clearSelections(); dismissDepthCard(); setLayersOpen(false); setPinDropMode(true); }} style={[styles.fab, styles.addFab]}><Ionicons color="#050608" name="add" size={26} /></TouchableOpacity>
        </GlassView>
      </View>

      <Modal animationType="slide" transparent visible={formVisible}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity activeOpacity={0.8} onPress={resetForm} style={styles.modalSpacer} />
          <View style={styles.sheet}>
            <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>Yeni Yer İmi</Text>
              <Text style={styles.sheetSubtitle}>Harita merkezindeki noktayı isimlendir, türünü seç ve sezon notunu ekle.</Text>
              <TextInput onChangeText={setLocationName} placeholder="İsim" placeholderTextColor={COLORS.muted} style={styles.input} value={locationName} />
              <View style={styles.selectorGroup}>{LOCATION_TYPES.map((item) => {
                const active = item.value === locationType;
                return <TouchableOpacity activeOpacity={0.85} key={item.value} onPress={() => setLocationType(item.value)} style={[styles.selector, active ? styles.selectorActive : null]}><Text style={[styles.selectorText, active ? styles.selectorTextActive : null]}>{item.label}</Text></TouchableOpacity>;
              })}</View>
              <TextInput multiline onChangeText={setLocationDescription} placeholder="Kısa açıklama" placeholderTextColor={COLORS.muted} style={[styles.input, styles.textArea]} textAlignVertical="top" value={locationDescription} />
              <TextInput onChangeText={setLocationFishSpecies} placeholder="Balık türleri (virgülle)" placeholderTextColor={COLORS.muted} style={styles.input} value={locationFishSpecies} />
              <Text style={styles.fieldLabel}>En iyi sezon</Text>
              <View style={styles.selectorGroup}>{SEASONS.map((season) => {
                const active = season === locationBestSeason;
                return <TouchableOpacity activeOpacity={0.85} key={season} onPress={() => setLocationBestSeason(season)} style={[styles.selector, active ? styles.selectorActive : null]}><Text style={[styles.selectorText, active ? styles.selectorTextActive : null]}>{season}</Text></TouchableOpacity>;
              })}</View>
              <TouchableOpacity activeOpacity={0.85} onPress={() => setLocationIsPublic((current) => !current)} style={styles.visibility}>
                <View><Text style={styles.visibilityTitle}>{locationIsPublic ? 'Herkese Açık' : 'Sadece Ben'}</Text><Text style={styles.visibilitySubtitle}>{locationIsPublic ? 'Bu yer imi diğer kullanıcılara da görünür.' : 'Bu yer imi sadece senin haritanda görünür.'}</Text></View>
                <View style={[styles.switchTrack, locationIsPublic ? styles.switchTrackActive : null]}><View style={[styles.switchThumb, locationIsPublic ? styles.switchThumbActive : null]} /></View>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} onPress={() => void handleSaveLocation()} style={styles.submit}><Text style={styles.submitText}>{createLocationMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}</Text></TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} onPress={resetForm} style={styles.cancel}><Text style={styles.cancelText}>Vazgeç</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  map: { flex: 1 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.text, fontSize: 16, fontWeight: '500' },
  header: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: COLORS.accent, fontSize: 28, fontWeight: '700', letterSpacing: 0.6, fontStyle: 'italic' },
  subtitle: { color: COLORS.subtext, fontSize: 13, marginTop: 4 },
  pill: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8 },
  pillText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  badge: { position: 'absolute', left: 16, alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  layersOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  panel: { position: 'absolute', right: 16, borderRadius: 18, padding: 12, minWidth: 188, gap: 8 },
  panelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  panelLabel: { color: COLORS.text, fontSize: 13 },
  switchTrack: { width: 32, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', paddingHorizontal: 2 },
  switchTrackActive: { backgroundColor: COLORS.blue },
  switchThumb: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF', alignSelf: 'flex-start' },
  switchThumbActive: { alignSelf: 'flex-end' },
  catchMarker: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,22,34,0.96)', borderWidth: 2.5, borderColor: 'rgba(59,130,246,0.82)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  locationMarker: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  markerText: { fontSize: 20 },
  crosshairWrap: { position: 'absolute', left: 0, right: 0, top: '48%', alignItems: 'center', justifyContent: 'center' },
  crosshairOuter: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.72)', alignItems: 'center', justifyContent: 'center' },
  crosshairInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.coral },
  floatingNote: { position: 'absolute', alignSelf: 'center', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  floatingNoteText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  primaryFab: { position: 'absolute', backgroundColor: COLORS.accent, borderRadius: 999, minHeight: 50, minWidth: 148, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, shadowColor: COLORS.accent, shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 6 },
  primaryFabText: { color: '#050608', fontSize: 15, fontWeight: '700' },
  depthCard: { position: 'absolute', maxWidth: 220, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  depthTitle: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  depthSubtitle: { color: COLORS.subtext, fontSize: 12, marginTop: 4 },
  preview: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', overflow: 'hidden', borderRadius: 26 },
  previewCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 26,
    backgroundColor: 'rgba(10,14,20,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  previewMedia: { width: 112, height: 116, backgroundColor: 'rgba(255,255,255,0.04)' },
  previewBody: { flex: 1, paddingHorizontal: 16, paddingVertical: 14 },
  previewImage: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 28 },
  placeholderText: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  tag: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,208,132,0.14)', borderWidth: 1, borderColor: 'rgba(0,208,132,0.28)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6 },
  tagText: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  previewTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  previewMeta: { color: COLORS.subtext, fontSize: 13, marginTop: 2 },
  previewDescription: { color: COLORS.subtext, fontSize: 13, lineHeight: 18, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.coral, borderWidth: 1, borderColor: 'rgba(232,132,90,0.60)' },
  actionBtnMuted: { backgroundColor: COLORS.soft, borderColor: COLORS.border },
  locationMedia: { alignItems: 'center', justifyContent: 'center' },
  locationPreviewMarker: { width: 54, height: 54 },
  modeWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  modeRow: { flexDirection: 'row', gap: 8, padding: 6, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  modePill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(10,22,34,0.88)' },
  modePillActive: { backgroundColor: COLORS.accent },
  modeText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  modeTextActive: { color: '#050608' },
  fabStack: { position: 'absolute', right: 16, alignItems: 'center', gap: 10 },
  fab: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  addFab: { backgroundColor: COLORS.accent, borderColor: 'rgba(212,255,0,0.60)' },
  disabled: { opacity: 0.55 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  modalSpacer: { flex: 1 },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 16, paddingTop: 18 },
  sheetContent: { gap: 12, paddingBottom: 28 },
  sheetTitle: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  sheetSubtitle: { color: COLORS.subtext, fontSize: 14, lineHeight: 20 },
  input: { minHeight: 50, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.text, fontSize: 15, paddingHorizontal: 14 },
  textArea: { minHeight: 110, paddingTop: 14 },
  fieldLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginTop: 2 },
  selectorGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selector: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  selectorActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  selectorText: { color: COLORS.subtext, fontSize: 12, fontWeight: '600' },
  selectorTextActive: { color: '#FFFFFF' },
  visibility: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14 },
  visibilityTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  visibilitySubtitle: { color: COLORS.subtext, fontSize: 12, marginTop: 4, maxWidth: 240 },
  submit: { minHeight: 52, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent, paddingHorizontal: 16, shadowColor: COLORS.accent, shadowOpacity: 0.32, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  submitText: { color: '#050608', fontSize: 15, fontWeight: '700' },
  cancel: { minHeight: 52, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16 },
  cancelText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
});

export default MapScreen;
