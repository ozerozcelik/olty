import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Text, View } from 'react-native';

import { GlassView } from '@/components/GlassView';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import type { MessageItem } from '@/types/app.types';
import { formatTimeAgo } from '@/utils/date';
import {
  extractCatchShareId,
  getCatchSharePreviewText,
} from '@/utils/catchShare';
import {
  extractLocationShareId,
  getLocationSharePreviewText,
} from '@/utils/locationShare';

interface MessageBubbleProps {
  item: MessageItem;
  isOwnMessage: boolean;
}

export const MessageBubble = ({
  item,
  isOwnMessage,
}: MessageBubbleProps): JSX.Element => {
  const router = useRouter();
  const catchId = extractCatchShareId(item.body);
  const locationId = extractLocationShareId(item.body);
  const sharePreviewText = catchId ? getCatchSharePreviewText(item.body) : null;
  const locationPreviewText = locationId
    ? getLocationSharePreviewText(item.body)
    : null;

  const renderContent = (): JSX.Element => {
    if (catchId) {
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/catch/${catchId}`)}
        >
          <Text className={`text-base ${isOwnMessage ? 'text-white' : 'text-ink'}`}>
            {sharePreviewText}
          </Text>
          <View
            className={`mt-3 flex-row items-center justify-between rounded-[20px] border px-4 py-3 ${
              isOwnMessage
                ? 'border-white/20 bg-white/10'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <View className="flex-row items-center gap-3">
              <View
                className={`h-10 w-10 items-center justify-center rounded-full ${
                  isOwnMessage ? 'bg-white/15' : 'bg-sea/10'
                }`}
              >
                <Ionicons
                  color={isOwnMessage ? '#FFFFFF' : '#7DD4E8'}
                  name="share-social-outline"
                  size={18}
                />
              </View>
              <View>
                <Text className={`text-sm font-semibold ${isOwnMessage ? 'text-white' : 'text-ink'}`}>
                  Paylasilan gonderi
                </Text>
                <Text className={`text-xs ${isOwnMessage ? 'text-white/80' : 'text-white/70'}`}>
                  Dokun ve gonderiyi ac
                </Text>
              </View>
            </View>
            <Ionicons
              color={isOwnMessage ? '#FFFFFF' : '#F0F7F9'}
              name="open-outline"
              size={18}
            />
          </View>
        </TouchableOpacity>
      );
    }

    if (locationId) {
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/locations/${locationId}` as Href)}
        >
          <Text className={`text-base ${isOwnMessage ? 'text-white' : 'text-ink'}`}>
            {locationPreviewText}
          </Text>
          <View
            className={`mt-3 flex-row items-center justify-between rounded-[20px] border px-4 py-3 ${
              isOwnMessage
                ? 'border-white/20 bg-white/10'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <View className="flex-row items-center gap-3">
              <View
                className={`h-10 w-10 items-center justify-center rounded-full ${
                  isOwnMessage ? 'bg-white/15' : 'bg-sea/10'
                }`}
              >
                <Ionicons
                  color={isOwnMessage ? '#FFFFFF' : '#7DD4E8'}
                  name="location-outline"
                  size={18}
                />
              </View>
              <View>
                <Text className={`text-sm font-semibold ${isOwnMessage ? 'text-white' : 'text-ink'}`}>
                  Paylasilan yer imi
                </Text>
                <Text className={`text-xs ${isOwnMessage ? 'text-white/80' : 'text-white/70'}`}>
                  Dokun ve yer imini ac
                </Text>
              </View>
            </View>
            <Ionicons
              color={isOwnMessage ? '#FFFFFF' : '#F0F7F9'}
              name="open-outline"
              size={18}
            />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <Text className={`text-base ${isOwnMessage ? 'text-white' : 'text-ink'}`}>
        {item.body}
      </Text>
    );
  };

  return (
    <View className={`mb-3 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
      {isOwnMessage ? (
        <View className="max-w-[82%] rounded-[24px] bg-sea px-4 py-3">
          {renderContent()}
        </View>
      ) : (
        <GlassView
          borderRadius={24}
          intensity={18}
          style={{ maxWidth: '82%', paddingHorizontal: 16, paddingVertical: 12 }}
        >
          {renderContent()}
        </GlassView>
      )}
      <Text className="mt-1 px-2 text-xs text-white/45">{formatTimeAgo(item.created_at)}</Text>
    </View>
  );
};
