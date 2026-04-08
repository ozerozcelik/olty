import {
  Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams,
  useRouter } from 'expo-router';
import { useEffect,
  useMemo,
  useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MessageBubble } from '@/components/MessageBubble';
import { SplashScreen } from '@/components/SplashScreen';
import {
  getConversationById,
  getMessages,
  markAsRead,
  sendMessage,
} from '@/services/messages.service';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

const ConversationScreen = (): JSX.Element => {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState<string>('');
  const conversationQuery = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => getConversationById(conversationId),
    enabled: Boolean(conversationId),
  });
  const messagesQuery = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam }) => getMessages(conversationId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.length === 20 ? lastPage[lastPage.length - 1]?.created_at : undefined,
    enabled: Boolean(conversationId),
  });
  const sendMutation = useMutation({
    mutationFn: (nextBody: string) => sendMessage(conversationId, nextBody),
    onSuccess: async () => {
      setBody('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] }),
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] }),
        queryClient.invalidateQueries({ queryKey: ['conversations'] }),
      ]);
      await markAsRead(conversationId);
    },
  });
  const messages = useMemo(
    () => messagesQuery.data?.pages.flatMap((page) => page) ?? [],
    [messagesQuery.data?.pages],
  );

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    void (async () => {
      await markAsRead(conversationId);
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    })();
  }, [conversationId, queryClient]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void (async () => {
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['messages', conversationId] }),
              queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] }),
              queryClient.invalidateQueries({ queryKey: ['conversations'] }),
            ]);
            await markAsRead(conversationId);
          })();
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [conversationId, queryClient]);

  if (!conversationQuery.data || (!messagesQuery.data && messagesQuery.isLoading)) {
    return <SplashScreen />;
  }

  const handleSend = async (): Promise<void> => {
    const trimmedBody = body.trim();

    if (!trimmedBody || sendMutation.isPending) {
      return;
    }

    await sendMutation.mutateAsync(trimmedBody);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-main"
      keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 12) : 0}
    >
      <View className="border-b border-white/10 bg-main px-4 pb-4 pt-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity activeOpacity={0.8} className="rounded-full border border-white/10 bg-white/10 p-3" onPress={() => router.back()}>
            <Ionicons color="#F0F7F9" name="arrow-back" size={20} />
          </TouchableOpacity>
          <Image
            contentFit="cover"
            source={
              conversationQuery.data.otherParticipant.avatar_url
                ? { uri: conversationQuery.data.otherParticipant.avatar_url }
                : undefined
            }
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#0F2C35' }}
          />
          <View className="flex-1">
            <Text className="text-lg font-semibold text-ink">
              @{conversationQuery.data.otherParticipant.username}
            </Text>
            <Text className="text-sm text-white/70">Ozel mesaj</Text>
          </View>
        </View>
      </View>

      <FlatList
        inverted
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            isOwnMessage={item.sender_id === profile?.id}
            item={item}
          />
        )}
        ListEmptyComponent={
          <Text className="py-6 text-center text-sm text-white/70">Henüz mesaj yok</Text>
        }
        onEndReached={() => {
          if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
            void messagesQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.2}
      />

      <View
        className="border-t border-white/10 bg-main px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}
      >
        <View className="flex-row items-end gap-3 rounded-[24px] border border-white/10 bg-white/10 px-4 py-3">
          <TextInput
            className="max-h-28 flex-1 py-2 text-base text-ink"
            multiline
            onChangeText={setBody}
            placeholder="Mesaj yaz..."
            placeholderTextColor="rgba(240,247,249,0.45)"
            value={body}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            className={`rounded-full px-4 py-3 ${sendMutation.isPending ? 'bg-white/10' : 'bg-coral'}`}
            disabled={sendMutation.isPending}
            onPress={() => void handleSend()}
          >
            <Ionicons color="#FFFFFF" name="send" size={18} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ConversationScreen;
