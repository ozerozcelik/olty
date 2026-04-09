import {
  useRouter } from 'expo-router';
import { Image,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import type { LeaderboardEntry } from '@/types/app.types';

interface LeaderboardRowProps {
  item: LeaderboardEntry;
  metricLabel: string;
  isOwnRow: boolean;
}

const getRankClassName = (rank: number): string => {
  switch (rank) {
    case 1:
      return 'bg-[#E0A92B] text-white';
    case 2:
      return 'bg-[#AAB4C0] text-white';
    case 3:
      return 'bg-[#B46A43] text-white';
    default:
      return 'bg-white/10 text-white';
  }
};

export const LeaderboardRow = ({
  item,
  metricLabel,
  isOwnRow,
}: LeaderboardRowProps): JSX.Element => {
  const router = useRouter();

  return (
    <TouchableOpacity activeOpacity={0.8}
      className={`flex-row items-center gap-3 rounded-[24px] px-4 py-4 ${
        isOwnRow ? 'border border-coral/40 bg-[rgba(232,132,90,0.16)]' : 'border border-white/10 bg-[rgba(255,255,255,0.07)]'
      }`}
      onPress={() => router.push(`/(tabs)/profile/${item.username}`)}
    >
      <View className={`h-10 w-10 items-center justify-center rounded-full ${getRankClassName(item.rank).split(' ')[0]}`}>
        <Text className={`text-sm font-semibold ${getRankClassName(item.rank).split(' ')[1]}`}>#{item.rank}</Text>
      </View>
      <Image
        resizeMode="cover"
        source={item.avatarUrl ? { uri: item.avatarUrl } : undefined}
        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#0F2C35' }}
      />
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-[#F0F7F9]">@{item.username}</Text>
        <Text className="text-sm text-[rgba(240,247,249,0.65)]">{item.city ?? 'Şehir bilgisi yok'} • Lv {item.level}</Text>
      </View>
      <View className="items-end">
        <Text className="text-lg font-semibold text-[#D4FF00]">{item.value}</Text>
        <Text className="text-xs text-[rgba(240,247,249,0.55)]">{metricLabel}</Text>
      </View>
    </TouchableOpacity>
  );
};
