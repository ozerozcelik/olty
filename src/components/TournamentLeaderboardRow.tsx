import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import type { TournamentLeaderboardEntry } from '@/types/app.types';

interface TournamentLeaderboardRowProps {
  item: TournamentLeaderboardEntry;
}

export const TournamentLeaderboardRow = ({
  item,
}: TournamentLeaderboardRowProps): JSX.Element => {
  return (
    <View className="flex-row items-center gap-3 rounded-[24px] border border-white/10 bg-white/10 px-4 py-4">
      <Text className="w-8 text-center text-lg font-semibold text-sea">#{item.rank}</Text>
      <Image
        contentFit="cover"
        source={item.avatarUrl ? { uri: item.avatarUrl } : undefined}
        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#0F2C35' }}
      />
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink">@{item.username}</Text>
        <Text className="text-sm text-white/70">{item.submittedCatchCount} gonderim</Text>
      </View>
      <Text className="text-lg font-semibold text-coral">{item.bestScore}</Text>
    </View>
  );
};
