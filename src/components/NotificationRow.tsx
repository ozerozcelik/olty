import {
  Ionicons } from '@expo/vector-icons';
import {
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { GlassView } from '@/components/GlassView';
import { SPORT_THEME } from '@/lib/sport-theme';

import type { NotificationListItem } from '@/types/app.types';
import { formatTimeAgo } from '@/utils/date';

interface NotificationRowProps {
  item: NotificationListItem;
  onPress: (item: NotificationListItem) => void;
}

const getNotificationMeta = (
  type: NotificationListItem['type'],
): {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  backgroundColor: string;
} => {
  switch (type) {
    case 'like':
      return { icon: 'heart', iconColor: SPORT_THEME.warning, backgroundColor: 'rgba(255,85,0,0.20)' };
    case 'comment':
      return { icon: 'chatbubble', iconColor: SPORT_THEME.active, backgroundColor: 'rgba(212,255,0,0.20)' };
    case 'follow':
      return { icon: 'person-add', iconColor: '#7DE29A', backgroundColor: 'rgba(76,175,125,0.20)' };
    case 'badge':
      return { icon: 'ribbon', iconColor: '#F0B429', backgroundColor: 'rgba(240,180,41,0.16)' };
    case 'level_up':
      return { icon: 'trending-up', iconColor: SPORT_THEME.active, backgroundColor: 'rgba(212,255,0,0.16)' };
    case 'tournament':
      return { icon: 'trophy', iconColor: '#F0B429', backgroundColor: 'rgba(240,180,41,0.16)' };
    case 'daily_game':
      return { icon: 'game-controller', iconColor: '#B8A1FF', backgroundColor: 'rgba(124,77,255,0.16)' };
    case 'weekly_challenge':
      return { icon: 'flash', iconColor: '#F0B429', backgroundColor: 'rgba(240,180,41,0.16)' };
    default:
      return { icon: 'notifications', iconColor: SPORT_THEME.active, backgroundColor: 'rgba(212,255,0,0.16)' };
  }
};

export const NotificationRow = ({ item, onPress }: NotificationRowProps): JSX.Element => {
  const meta = getNotificationMeta(item.type);

  return (
    <GlassView borderRadius={24} intensity={18}>
      <TouchableOpacity
        activeOpacity={0.8}
        className="flex-row items-center gap-3 px-4 py-4"
        onPress={() => onPress(item)}
      >
      <View
        className="h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: meta.backgroundColor }}
      >
        <Ionicons color={meta.iconColor} name={meta.icon} size={20} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold text-[#FFFFFF]">{item.title}</Text>
        <Text className="text-sm leading-6 text-[rgba(139,146,165,0.78)]">{item.body}</Text>
        <Text className="text-xs text-[rgba(139,146,165,0.78)]">{formatTimeAgo(item.created_at)}</Text>
      </View>
      {!item.is_read ? <View className="h-2.5 w-2.5 rounded-full bg-[#FF5500]" /> : null}
      </TouchableOpacity>
    </GlassView>
  );
};
