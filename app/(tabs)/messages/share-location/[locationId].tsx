import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Text, TextInput, View } from 'react-native';

import { ConversationListItem } from '@/components/ConversationListItem';
import { SplashScreen } from '@/components/SplashScreen';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { useDebounce } from '@/hooks/useDebounce';
import { getFishingLocationById } from '@/services/fishingLocations.service';
import {
  getConversations,
  getOrCreateConversation,
  sendMessage,
} from '@/services/messages.service';
import { searchUsers } from '@/services/search.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { ProfileRow } from '@/types/app.types';
import { buildLocationShareMessage } from '@/utils/locationShare';

const ShareLocationScreen = (): JSX.Element => {
  const { locationId } = useLocalSearchParams<{ locationId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ownProfile = useAuthStore((state) => state.profile);
  const [searchValue, setSearchValue] = useState<string>('');
  const debouncedSearch = useDebounce(searchValue, 300);
  const locationQuery = useQuery({
    queryKey: ['share-location-detail', locationId],
    queryFn: () => getFishingLocationById(locationId),
    enabled: Boolean(locationId),
  });
  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    enabled: !debouncedSearch.trim(),
  });
  const usersQuery = useQuery({
    queryKey: ['share-location-users', debouncedSearch],
    queryFn: () => searchUsers(debouncedSearch),
    enabled: Boolean(debouncedSearch.trim()),
  });
  const shareMutation = useMutation({
    mutationFn: async (target: { conversationId?: string; userId?: string }) => {
      if (!locationQuery.data) {
        throw new Error('Yer imi yüklenemedi.');
      }

      const conversation = target.conversationId
        ? { id: target.conversationId }
        : await getOrCreateConversation(target.userId ?? '');

      await sendMessage(
        conversation.id,
        buildLocationShareMessage({
          locationId,
          locationName: locationQuery.data.name,
          sharedByUsername: ownProfile?.username ?? locationQuery.data.username,
        }),
      );

      return conversation.id;
    },
    onSuccess: async (conversationId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] }),
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] }),
        queryClient.invalidateQueries({ queryKey: ['conversations'] }),
      ]);
      router.replace({
        pathname: '/messages/[conversationId]',
        params: { conversationId },
      });
    },
    onError: (error) => {
      Alert.alert(
        'Uyarı',
        error instanceof Error ? error.message : 'Yer imi paylaşılamadı.',
      );
    },
  });

  const userResults = useMemo(
    () => (usersQuery.data ?? []).filter((item) => item.id !== ownProfile?.id),
    [ownProfile?.id, usersQuery.data],
  );

  if (!locationQuery.data) {
    return <SplashScreen />;
  }

  const shareTargetLabel = debouncedSearch.trim() ? 'Kullanıcı seç' : 'Sohbet seç';

  const renderUser = ({ item }: { item: ProfileRow }): JSX.Element => (
    <TouchableOpacity
      activeOpacity={0.8}
      className="flex-row items-center gap-3 rounded-[24px] border border-white/10 bg-white/10 px-4 py-4"
      disabled={shareMutation.isPending}
      onPress={() => void shareMutation.mutateAsync({ userId: item.id })}
    >
      <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-white/10">
        <Ionicons color="#7DD4E8" name="person" size={22} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-ink">@{item.username}</Text>
        <Text className="text-sm text-white/70">
          {item.display_name ?? 'Balıkçı'}
        </Text>
      </View>
      <View className="rounded-full bg-sea px-4 py-2">
        <Text className="text-sm font-semibold text-sand">Gönder</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-sand px-4 pt-4">
      <View className="mb-4 flex-row items-center gap-3">
        <TouchableOpacity
          activeOpacity={0.8}
          className="rounded-full border border-white/10 bg-white/10 p-3"
          onPress={() => router.back()}
        >
          <Ionicons color="#F0F7F9" name="arrow-back" size={20} />
        </TouchableOpacity>
        <Text className="text-2xl font-semibold text-ink">Yer İmi Paylaş</Text>
      </View>

      <View className="mb-4 rounded-[28px] border border-white/10 bg-white/10 p-4">
        <Text className="text-lg font-semibold text-ink">{locationQuery.data.name}</Text>
        <Text className="mt-2 text-sm text-white/70">
          {locationQuery.data.username ? `@${locationQuery.data.username}` : 'Yer imi'}
        </Text>
        <Text className="mt-2 text-sm text-white/70">
          {locationQuery.data.latitude.toFixed(4)}, {locationQuery.data.longitude.toFixed(4)}
        </Text>
      </View>

      <TextInput
        autoCapitalize="none"
        className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 text-base text-ink"
        onChangeText={setSearchValue}
        placeholder="Bir kullanıcı ara"
        placeholderTextColor="#8A958D"
        value={searchValue}
      />

      <Text className="mb-3 mt-4 text-sm text-white/70">{shareTargetLabel}</Text>

      {debouncedSearch.trim() ? (
        <FlatList
          contentContainerStyle={
            userResults.length
              ? { gap: 12, paddingBottom: 32 }
              : { flexGrow: 1, justifyContent: 'center' }
          }
          data={userResults}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text className="text-center text-base text-white/70">
              Kullanıcı bulunamadı
            </Text>
          }
          renderItem={renderUser}
        />
      ) : (
        <FlatList
          contentContainerStyle={
            conversationsQuery.data?.length
              ? { gap: 12, paddingBottom: 32 }
              : { flexGrow: 1, justifyContent: 'center' }
          }
          data={conversationsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text className="px-8 text-center text-base text-white/70">
              Henüz mesajlaşmadığın biri varsa üstten arayıp doğrudan gönderebilirsin.
            </Text>
          }
          renderItem={({ item }) => (
            <ConversationListItem
              item={item}
              onPress={() => {
                if (shareMutation.isPending) {
                  return;
                }

                void shareMutation.mutateAsync({ conversationId: item.id });
              }}
            />
          )}
        />
      )}
    </View>
  );
};

export default ShareLocationScreen;
