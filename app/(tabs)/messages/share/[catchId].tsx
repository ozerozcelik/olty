import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ConversationListItem } from '@/components/ConversationListItem';
import { SplashScreen } from '@/components/SplashScreen';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { useDebounce } from '@/hooks/useDebounce';
import { getCatchDetailById } from '@/services/catches.service';
import {
  getConversations,
  getOrCreateConversation,
  sendMessage,
} from '@/services/messages.service';
import { searchUsers } from '@/services/search.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { ProfileRow } from '@/types/app.types';
import { buildCatchShareMessage } from '@/utils/catchShare';

const ShareCatchScreen = (): JSX.Element => {
  const { catchId } = useLocalSearchParams<{ catchId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ownProfile = useAuthStore((state) => state.profile);
  const [searchValue, setSearchValue] = useState<string>('');
  const debouncedSearch = useDebounce(searchValue, 300);
  const catchQuery = useQuery({
    queryKey: ['share-catch-detail', catchId],
    queryFn: () => getCatchDetailById(catchId),
    enabled: Boolean(catchId),
  });
  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    enabled: !debouncedSearch.trim(),
  });
  const usersQuery = useQuery({
    queryKey: ['share-users', debouncedSearch],
    queryFn: () => searchUsers(debouncedSearch),
    enabled: Boolean(debouncedSearch.trim()),
  });
  const shareMutation = useMutation({
    mutationFn: async (target: { conversationId?: string; userId?: string }) => {
      if (!catchQuery.data) {
        throw new Error('Gönderi yüklenemedi.');
      }

      const conversation = target.conversationId
        ? { id: target.conversationId }
        : await getOrCreateConversation(target.userId ?? '');
      const speciesName =
        catchQuery.data.fish_species?.name_tr
        ?? catchQuery.data.species_custom
        ?? 'Av kaydı';

      await sendMessage(
        conversation.id,
        buildCatchShareMessage({
          catchId,
          sharedByUsername: catchQuery.data.profiles?.username,
          speciesName,
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
        error instanceof Error ? error.message : 'Gönderi paylaşılamadı.',
      );
    },
  });

  const userResults = useMemo(
    () => (usersQuery.data ?? []).filter((item) => item.id !== ownProfile?.id),
    [ownProfile?.id, usersQuery.data],
  );

  if (!catchQuery.data) {
    return <SplashScreen />;
  }

  const speciesName =
    catchQuery.data.fish_species?.name_tr
    ?? catchQuery.data.species_custom
    ?? 'Av kaydı';
  const shareTargetLabel = debouncedSearch.trim() ? 'Kullanıcı seç' : 'Sohbet seç';

  const renderUser = ({ item }: { item: ProfileRow }): JSX.Element => (
    <TouchableOpacity
      activeOpacity={0.8}
      className="flex-row items-center gap-3 rounded-[24px] border border-white/10 bg-white/10 px-4 py-4"
      disabled={shareMutation.isPending}
      onPress={() => void shareMutation.mutateAsync({ userId: item.id })}
    >
      <Image
        contentFit="cover"
        source={item.avatar_url ? { uri: item.avatar_url } : undefined}
        style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.10)' }}
      />
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
        <Text className="text-2xl font-semibold text-ink">Gönderi Paylaş</Text>
      </View>

      <View className="mb-4 flex-row gap-3 rounded-[28px] border border-white/10 bg-white/10 p-4">
        <View className="h-20 w-20 overflow-hidden rounded-[20px] bg-white/10">
          {catchQuery.data.photo_url ? (
            <Image
              contentFit="cover"
              source={{ uri: catchQuery.data.photo_url }}
              style={{ width: 80, height: 80 }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons color="#7DD4E8" name="image-outline" size={24} />
            </View>
          )}
        </View>
        <View className="flex-1 justify-center gap-1">
          <Text className="text-lg font-semibold text-ink">{speciesName}</Text>
          <Text className="text-sm text-white/70">
            @{catchQuery.data.profiles?.username ?? 'bilinmeyen'}
          </Text>
          <Text className="text-sm text-white/70">
            {catchQuery.data.location_name ?? 'Konum belirtilmedi'}
          </Text>
        </View>
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

export default ShareCatchScreen;
