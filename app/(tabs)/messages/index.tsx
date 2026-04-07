import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConversationListItem } from '@/components/ConversationListItem';
import { SplashScreen } from '@/components/SplashScreen';
import { getConversations } from '@/services/messages.service';

const MessagesScreen = (): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const query = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
  });

  if (!query.data && query.isLoading) {
    return <SplashScreen />;
  }

  return (
    <View
      className="flex-1 bg-sand px-4"
      style={{ paddingTop: Math.max(insets.top, 12) }}
    >
      <View className="mb-4 flex-row items-center gap-3">
        <Text className="text-2xl font-semibold text-ink">Mesajlar</Text>
      </View>

      <FlatList
        className="flex-1"
        contentContainerStyle={
          query.data?.length
            ? { gap: 12, paddingBottom: 32 }
            : { flexGrow: 1, alignItems: 'center', justifyContent: 'center' }
        }
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationListItem
            item={item}
            onPress={() =>
              router.push({
                pathname: '/messages/[conversationId]',
                params: { conversationId: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={<Text className="text-base text-white/70">Henüz mesajın yok</Text>}
      />
    </View>
  );
};

export default MessagesScreen;
