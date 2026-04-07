import {
  Image } from 'expo-image';
import {
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { GlassView } from '@/components/GlassView';

import type { ConversationItem } from '@/types/app.types';
import { formatTimeAgo } from '@/utils/date';
import { isCatchShareMessage } from '@/utils/catchShare';
import { isLocationShareMessage } from '@/utils/locationShare';

interface ConversationListItemProps {
  item: ConversationItem;
  onPress: () => void;
}

export const ConversationListItem = ({
  item,
  onPress,
}: ConversationListItemProps): JSX.Element => {
  const previewText = isCatchShareMessage(item.last_message)
    ? 'Paylasilan gonderi'
    : isLocationShareMessage(item.last_message)
      ? 'Paylasilan yer imi'
    : item.last_message ?? 'Mesajlasmaya basla';

  return (
    <GlassView borderRadius={24} intensity={18}>
      <TouchableOpacity activeOpacity={0.8}
        className="flex-row items-center gap-3 px-4 py-4"
        onPress={onPress}
      >
      <Image
        contentFit="cover"
        source={item.otherParticipant.avatar_url ? { uri: item.otherParticipant.avatar_url } : undefined}
        style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#0F2C35' }}
      />
      <View className="flex-1 gap-1">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-base font-semibold text-ink">
            @{item.otherParticipant.username}
          </Text>
          <Text className="text-xs text-white/45">
            {item.last_message_at ? formatTimeAgo(item.last_message_at) : ''}
          </Text>
        </View>
        <Text className="text-sm text-white/70" numberOfLines={1}>
          {previewText}
        </Text>
      </View>
      {item.unreadCount ? (
        <View className="min-w-[24px] rounded-full bg-coral px-2 py-1">
          <Text className="text-center text-xs font-semibold text-white">{item.unreadCount}</Text>
        </View>
      ) : null}
      </TouchableOpacity>
    </GlassView>
  );
};
