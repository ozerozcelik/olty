import {
  Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams,
  useRouter } from 'expo-router';
import { useMutation,
  useQuery,
  useQueryClient } from '@tanstack/react-query';
import { useMemo,
  useEffect,
  useRef,
  useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import MapView, { Marker, type LatLng } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import '@/lib/nativewind';

import { CatchShareSheet } from '@/components/CatchShareSheet';
import { CommentItem } from '@/components/CommentItem';
import { HashtagText } from '@/components/HashtagText';
import { ZoomableImage } from '@/components/ZoomableImage';
import {
  addComment,
  deleteCatch,
  getCatchComments,
  getCatchDetailById,
} from '@/services/catches.service';
import { likeCatch, unlikeCatch } from '@/services/social.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CatchDetail, CommentListItem } from '@/types/app.types';
import { shareCatchExternally } from '@/utils/catchShare';
import { parseCatchPoint } from '@/utils/location';
import { formatTimeAgo } from '@/utils/date';
import { getWindDirectionLabel } from '@/services/weather.service';
import { getCatchMethodLabel } from '@/lib/constants';

const formatCapturedAt = (value: string | null): string | null => {
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

const hasEnvironmentSnapshot = (item: CatchDetail): boolean =>
  Boolean(
    item.captured_at
    || item.pressure_hpa !== null
    || item.wind_speed_kmh !== null
    || item.wave_height_m !== null
    || item.sea_temp_c !== null
    || item.sea_depth_m !== null
    || item.fishing_score !== null,
  );

const openCatchLocationInMaps = async (
  latitude: number,
  longitude: number,
  label?: string | null,
): Promise<void> => {
  const encodedLabel = encodeURIComponent(label?.trim() || 'Av konumu');
  const appleMapsUrl = `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodedLabel}`;
  const geoUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`;
  const browserFallbackUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const primaryUrl = Platform.OS === 'ios' ? appleMapsUrl : geoUrl;

  const supportedPrimary = await Linking.canOpenURL(primaryUrl);

  if (supportedPrimary) {
    await Linking.openURL(primaryUrl);
    return;
  }

  await Linking.openURL(browserFallbackUrl);
};

const CatchDetailScreen = (): JSX.Element => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((state) => state.session);
  const [commentBody, setCommentBody] = useState<string>('');
  const [replyToUsername, setReplyToUsername] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState<boolean>(false);
  const [shareVisible, setShareVisible] = useState<boolean>(false);
  const [keyboardInset, setKeyboardInset] = useState<number>(0);
  const commentInputRef = useRef<TextInput | null>(null);
  const detailQuery = useQuery({
    queryKey: ['catch-detail', id],
    queryFn: () => getCatchDetailById(id),
    enabled: Boolean(id),
  });
  const commentsQuery = useQuery({
    queryKey: ['catch-comments', id],
    queryFn: () => getCatchComments(id),
    enabled: Boolean(id),
  });
  const likeMutation = useMutation({ mutationFn: likeCatch });
  const unlikeMutation = useMutation({ mutationFn: unlikeCatch });
  const commentMutation = useMutation({ mutationFn: (body: string) => addComment(id, body) });
  const catchItem = detailQuery.data;

  const isOwnCatch = catchItem?.user_id === session?.user.id;
  const mapCoordinate = useMemo<LatLng | null>(
    () => {
      const point = parseCatchPoint(catchItem?.location ?? null);

      if (point.latitude === null || point.longitude === null) {
        return null;
      }

      return {
        latitude: point.latitude,
        longitude: point.longitude,
      };
    },
    [catchItem?.location],
  );

  const updateDetailCache = (item: CatchDetail): void => {
    queryClient.setQueryData(['catch-detail', id], {
      ...item,
      is_liked: !item.is_liked,
      like_count: item.like_count + (item.is_liked ? -1 : 1),
    });
  };

  const handleToggleLike = async (): Promise<void> => {
    if (!catchItem) {
      return;
    }

    updateDetailCache(catchItem);

    try {
      if (catchItem.is_liked) {
        await unlikeMutation.mutateAsync(catchItem.id);
      } else {
        await likeMutation.mutateAsync(catchItem.id);
      }
    } catch {
      updateDetailCache({ ...catchItem, is_liked: !catchItem.is_liked });
    }
  };

  const handleDelete = (): void => {
    if (!catchItem) {
      return;
    }

    Alert.alert('Av kaydı silinsin mi?', 'Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setMenuVisible(false);
            await deleteCatch(catchItem.id);
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['feed-catches'] }),
              queryClient.invalidateQueries({ queryKey: ['profile-details'] }),
              queryClient.invalidateQueries({ queryKey: ['fishdex-overview', catchItem.user_id] }),
              queryClient.invalidateQueries({ queryKey: ['catch-comments', id] }),
              queryClient.invalidateQueries({ queryKey: ['notifications'] }),
            ]);
            queryClient.removeQueries({ queryKey: ['catch-detail', id] });
            router.replace('/(tabs)');
          })();
        },
      },
    ]);
  };

  const withReplyPrefix = (value: string, username: string | null): string => {
    if (!username) {
      return value;
    }

    const prefix = `@${username}`;
    return value.startsWith(prefix) ? value : `${prefix} ${value}`;
  };

  const handleReplyPress = (item: CommentListItem): void => {
    const username = item.profiles?.username;

    if (!username) {
      return;
    }

    setReplyToUsername(username);
    setCommentBody((current) => {
      const nextValue = withReplyPrefix(current.trim(), username).trimStart();
      return current.trim() ? nextValue : `${nextValue} `;
    });
    commentInputRef.current?.focus();
  };

  const handleProfilePress = (item: CommentListItem): void => {
    const username = item.profiles?.username;

    if (!username) {
      return;
    }

    router.push(`/(tabs)/profile/${username}`);
  };

  const handleSendComment = async (): Promise<void> => {
    const trimmedBody = commentBody.trim();
    const submittedBody = withReplyPrefix(trimmedBody, replyToUsername);

    if (!submittedBody.trim()) {
      return;
    }

    setCommentBody('');
    const optimisticComment: CommentListItem = {
      id: `temp-${Date.now()}`,
      catch_id: id,
      user_id: session?.user.id ?? '',
      body: submittedBody,
      created_at: new Date().toISOString(),
      profiles: {
        username: useAuthStore.getState().profile?.username ?? 'Sen',
        avatar_url: useAuthStore.getState().profile?.avatar_url ?? null,
      },
    };

    queryClient.setQueryData(['catch-comments', id], (current: CommentListItem[] | undefined) => [
      optimisticComment,
      ...(current ?? []),
    ]);

    try {
      const createdComment = await commentMutation.mutateAsync(submittedBody);
      queryClient.setQueryData(['catch-comments', id], (current: CommentListItem[] | undefined) => [
        createdComment,
        ...(current ?? []).filter((item) => item.id !== optimisticComment.id),
      ]);
      await commentsQuery.refetch();
      setReplyToUsername(null);
    } catch {
      setCommentBody(submittedBody);
      queryClient.setQueryData(['catch-comments', id], (current: CommentListItem[] | undefined) =>
        (current ?? []).filter((item) => item.id !== optimisticComment.id),
      );
      Alert.alert('Uyarı', 'Yorum gönderilemedi.');
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if (!catchItem) {
    return (
      <View className="flex-1 items-center justify-center bg-main px-6">
        <Text className="text-base text-white/70">Av kaydı yükleniyor...</Text>
      </View>
    );
  }

  const speciesName = catchItem.fish_species?.name_tr ?? catchItem.species_custom ?? 'Tür belirtilmedi';
  const canShowMetrics = isOwnCatch || catchItem.show_measurements_public;
  const canShowLocation = isOwnCatch || catchItem.show_location_public;
  const canShowMethod = isOwnCatch || catchItem.show_method_public;
  const canShowNotes = isOwnCatch || catchItem.show_notes_public;
  const canShowConditions = isOwnCatch || catchItem.show_conditions_public;
  const metrics = [
    canShowMetrics && catchItem.length_cm ? `${catchItem.length_cm} cm` : null,
    canShowMetrics && catchItem.weight_g ? `${catchItem.weight_g} g` : null,
  ].filter(Boolean);
  const capturedAtLabel = formatCapturedAt(catchItem.captured_at);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-main"
      keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 12) : 0}
    >
      <FlatList
        className="flex-1"
        contentContainerStyle={{
          gap: 16,
          paddingHorizontal: 16,
          paddingBottom: 112 + keyboardInset,
        }}
        data={commentsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!isPhotoZoomed}
        ListHeaderComponent={
          <View className="gap-4 pb-2" style={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                activeOpacity={0.8}
                className="h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10"
                hitSlop={8}
                onPress={() => router.back()}
              >
                <Ionicons color="#F0F7F9" name="arrow-back" size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                className="h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10"
                hitSlop={8}
                onPress={() => setMenuVisible(true)}
              >
                <Ionicons color="#F0F7F9" name="ellipsis-horizontal" size={20} />
              </TouchableOpacity>
            </View>

            {catchItem.photo_url ? (
              <View className="gap-2">
                <ZoomableImage
                  onZoomStateChange={setIsPhotoZoomed}
                  uri={catchItem.photo_url}
                />
                <Text className="px-2 text-xs text-white/45">
                  Yakınlaştırmak için pinch yap veya iki kez dokun.
                </Text>
              </View>
            ) : null}

            <View className="gap-4 rounded-[28px] border border-white/10 bg-white/10 p-5">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1 flex-row items-center gap-3">
                  <Image
                    resizeMode="cover"
                    source={catchItem.profiles?.avatar_url ? { uri: catchItem.profiles.avatar_url } : undefined}
                    style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#0F2C35' }}
                  />
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-ink">
                      {catchItem.profiles?.username ?? 'Bilinmeyen kullanıcı'}
                    </Text>
                    <Text className="text-sm text-white/70">
                      Seviye {catchItem.profiles?.level ?? 1} • {formatTimeAgo(catchItem.created_at)}
                    </Text>
                  </View>
                </View>
                {catchItem.is_catch_release ? (
                  <View className="rounded-full bg-[#4CAF7D]/15 px-3 py-1">
                    <Text className="text-xs font-semibold text-[#7DE29A]">C&R</Text>
                  </View>
                ) : null}
              </View>

              <View className="gap-1">
                <Text className="text-2xl font-semibold text-ink">{speciesName}</Text>
                {metrics.length ? (
                  <Text className="text-sm text-white/70">{metrics.join(' • ')}</Text>
                ) : null}
              </View>

              {(catchItem.fishing_type
                || catchItem.bait_name
                || catchItem.is_catch_release
                || catchItem.is_public !== null
                || catchItem.show_exact_location !== null) ? (
                <View className="gap-3 rounded-[24px] bg-white/5 px-4 py-4">
                  <Text className="text-base font-semibold text-ink">Av Detayları</Text>
                  <View className="flex-row flex-wrap gap-3">
                    {canShowMethod && catchItem.fishing_type ? (
                      <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                          Av Yöntemi
                        </Text>
                        <Text className="mt-1 text-sm font-semibold text-ink">
                          {getCatchMethodLabel(catchItem.fishing_type)}
                        </Text>
                      </View>
                    ) : null}
                    {canShowMethod && catchItem.bait_name ? (
                      <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                          Yem
                        </Text>
                        <Text className="mt-1 text-sm font-semibold text-ink">
                          {catchItem.bait_name}
                        </Text>
                      </View>
                    ) : null}
                    <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                      <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                        C&R
                      </Text>
                      <Text className="mt-1 text-sm font-semibold text-ink">
                        {catchItem.is_catch_release ? 'Evet' : 'Hayır'}
                      </Text>
                    </View>
                    <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                      <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                        Paylaşım
                      </Text>
                      <Text className="mt-1 text-sm font-semibold text-ink">
                        {catchItem.is_public ? 'Herkese açık' : 'Özel'}
                      </Text>
                    </View>
                    {canShowLocation ? (
                      <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                          Konum Görünürlüğü
                        </Text>
                        <Text className="mt-1 text-sm font-semibold text-ink">
                          {catchItem.show_exact_location ? 'Kesin konum' : 'Yaklaşık konum'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {canShowLocation && (catchItem.location_name || mapCoordinate) ? (
                <View className="gap-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-ink">Konum</Text>
                    {mapCoordinate ? (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        className="rounded-full border border-white/10 bg-white/10 px-3 py-2"
                        onPress={() =>
                          void openCatchLocationInMaps(
                            mapCoordinate.latitude,
                            mapCoordinate.longitude,
                            catchItem.location_name,
                          )
                        }
                      >
                        <Text className="text-xs font-semibold text-sea">Haritada Aç</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {catchItem.location_name ? (
                    <Text className="text-sm text-white/70">{catchItem.location_name}</Text>
                  ) : null}
                  {mapCoordinate ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() =>
                        void openCatchLocationInMaps(
                          mapCoordinate.latitude,
                          mapCoordinate.longitude,
                          catchItem.location_name,
                        )
                      }
                    >
                      <MapView
                        className="h-40 overflow-hidden rounded-[24px]"
                        initialRegion={{
                          latitude: mapCoordinate.latitude,
                          longitude: mapCoordinate.longitude,
                          latitudeDelta: 0.06,
                          longitudeDelta: 0.06,
                        }}
                        pitchEnabled={false}
                        pointerEvents="none"
                        rotateEnabled={false}
                        scrollEnabled={false}
                        zoomEnabled={false}
                      >
                        <Marker coordinate={mapCoordinate} />
                      </MapView>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              {canShowNotes && catchItem.notes ? (
                <View className="gap-2">
                  <Text className="text-base font-semibold text-ink">Notlar</Text>
                  <HashtagText className="text-sm leading-7 text-white/70" text={catchItem.notes} />
                </View>
              ) : null}

              {canShowConditions ? (
                <View className="gap-3 rounded-[24px] bg-white/5 px-4 py-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-ink">Av Koşulları</Text>
                    {catchItem.fishing_score !== null ? (
                      <Text className="text-sm font-semibold text-sea">
                        {catchItem.fishing_score}/10 {catchItem.fishing_score_label ?? ''}
                      </Text>
                    ) : null}
                  </View>
                  {hasEnvironmentSnapshot(catchItem) ? (
                    <View className="flex-row flex-wrap gap-3">
                      {capturedAtLabel ? (
                        <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                            Çekim
                          </Text>
                          <Text className="mt-1 text-sm font-semibold text-ink">{capturedAtLabel}</Text>
                        </View>
                      ) : null}
                      {catchItem.pressure_hpa !== null ? (
                        <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                            Basınç
                          </Text>
                          <Text className="mt-1 text-sm font-semibold text-ink">{catchItem.pressure_hpa} hPa</Text>
                        </View>
                      ) : null}
                      {catchItem.wind_speed_kmh !== null ? (
                        <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                            Rüzgar
                          </Text>
                          <Text className="mt-1 text-sm font-semibold text-ink">
                            {catchItem.wind_speed_kmh} km/sa
                            {catchItem.wind_direction_deg !== null
                              ? ` • ${catchItem.wind_direction_label ?? getWindDirectionLabel(catchItem.wind_direction_deg)}`
                              : ''}
                          </Text>
                        </View>
                      ) : null}
                      {catchItem.air_temp_c !== null ? (
                        <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                            Hava
                          </Text>
                          <Text className="mt-1 text-sm font-semibold text-ink">{catchItem.air_temp_c}°C</Text>
                        </View>
                      ) : null}
                      {catchItem.sea_temp_c !== null ? (
                        <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                            Su
                          </Text>
                          <Text className="mt-1 text-sm font-semibold text-ink">{catchItem.sea_temp_c}°C</Text>
                        </View>
                      ) : null}
                      {catchItem.wave_height_m !== null ? (
                        <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                            Dalga
                          </Text>
                          <Text className="mt-1 text-sm font-semibold text-ink">{catchItem.wave_height_m} m</Text>
                        </View>
                      ) : null}
                      {catchItem.sea_depth_m !== null ? (
                        <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                            Derinlik
                          </Text>
                          <Text className="mt-1 text-sm font-semibold text-ink">
                            {catchItem.sea_depth_m} m
                            {catchItem.sea_depth_source ? ` • ${catchItem.sea_depth_source}` : ''}
                            {catchItem.sea_depth_is_approximate ? ' • tahmini' : ''}
                          </Text>
                        </View>
                      ) : null}
                      {catchItem.moon_phase_label ? (
                        <View className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                          <Text className="text-xs font-semibold uppercase tracking-[0.8px] text-white/45">
                            Ay Fazı
                          </Text>
                          <Text className="mt-1 text-sm font-semibold text-ink">
                            {catchItem.moon_phase_emoji ? `${catchItem.moon_phase_emoji} ` : ''}
                            {catchItem.moon_phase_label}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <Text className="text-sm leading-6 text-white/70">
                      Bu gönderi için kayıtlı av koşulu snapshot’ı yok.
                    </Text>
                  )}
                </View>
              ) : null}

              <View className="flex-row items-center justify-between">
                <TouchableOpacity activeOpacity={0.8} className="flex-row items-center gap-2" onPress={() => void handleToggleLike()}>
                  <Ionicons
                    color={catchItem.is_liked ? '#D97B4A' : '#7A8B8F'}
                    name={catchItem.is_liked ? 'heart' : 'heart-outline'}
                    size={22}
                  />
                  <Text className="text-sm font-medium text-ink">{catchItem.like_count} beğeni</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="flex-row items-center gap-2"
                  onPress={() => setShareVisible(true)}
                >
                  <Ionicons color="#7A8B8F" name="share-social-outline" size={20} />
                  <Text className="text-sm font-medium text-ink">Paylaş</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text className="px-1 text-lg font-semibold text-ink">Yorumlar</Text>
          </View>
        }
        renderItem={({ item }) => (
          <CommentItem
            item={item}
            onProfilePress={handleProfilePress}
            onReplyPress={handleReplyPress}
          />
        )}
      />

      <View
        className="border-t border-white/10 bg-main px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 + keyboardInset }}
      >
        {replyToUsername ? (
          <View className="mb-2 flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
            <Text className="text-sm text-white/70">Yanıt: @{replyToUsername}</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setReplyToUsername(null)}>
              <Text className="text-xs font-semibold text-sea">İptal</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View className="flex-row items-center gap-3 rounded-[24px] border border-white/10 bg-white/10 px-4 py-2">
          <TextInput
            className="flex-1 py-3 text-base text-ink"
            ref={commentInputRef}
            onChangeText={setCommentBody}
            placeholder="Yorum yaz..."
            placeholderTextColor="rgba(240,247,249,0.45)"
            value={commentBody}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            className="rounded-full bg-sea px-4 py-2"
            onPress={() => void handleSendComment()}
          >
            <Text className="text-sm font-semibold text-white">Gönder</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal animationType="fade" transparent visible={menuVisible}>
        <View className="flex-1 bg-black/20">
          <TouchableOpacity
            activeOpacity={0.8}
            className="absolute inset-0"
            onPress={() => setMenuVisible(false)}
          />
          <View
            className="self-end rounded-2xl border border-white/10 bg-main p-2"
            style={{ marginRight: 16, marginTop: Math.max(insets.top, 12) + 60 }}
          >
            {isOwnCatch ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="rounded-xl px-4 py-3"
                  onPress={() => {
                    setMenuVisible(false);
                    router.push(`/catch/edit/${id}`);
                  }}
                >
                  <Text className="font-semibold text-ink">Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="rounded-xl px-4 py-3"
                  onPress={handleDelete}
                >
                  <Text className="font-semibold text-[#A6422B]">Sil</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                className="rounded-xl px-4 py-3"
                onPress={() => {
                  setMenuVisible(false);
                  Alert.alert('Bildir', 'Bildirim akışı yakında eklenecek.');
                }}
              >
                <Text className="font-semibold text-ink">Bildir</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
      <CatchShareSheet
        onClose={() => setShareVisible(false)}
        onShareExternally={() => {
          void shareCatchExternally({
            catchId: catchItem.id,
            sharedByUsername: catchItem.profiles?.username,
            speciesName,
          }).finally(() => setShareVisible(false));
        }}
        onShareInMessages={() => {
          setShareVisible(false);
          router.push({
            pathname: '/messages/share/[catchId]',
            params: { catchId: catchItem.id },
          });
        }}
        title={speciesName}
        visible={shareVisible}
      />
    </KeyboardAvoidingView>
  );
};

export default CatchDetailScreen;
