import {
  Image } from 'expo-image';
import {
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { GlassView } from '@/components/GlassView';
import type { TournamentListItem } from '@/types/app.types';
import { formatTournamentDateRange, getTournamentScoringLabel } from '@/utils/tournaments';

interface TournamentCardProps {
  item: TournamentListItem;
  onPress: () => void;
}

export const TournamentCard = ({
  item,
  onPress,
}: TournamentCardProps): JSX.Element => {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <GlassView borderRadius={28} intensity={18}>
      {item.cover_image_url ? (
        <Image
          contentFit="cover"
          source={{ uri: item.cover_image_url }}
          style={{ width: '100%', height: 180, backgroundColor: '#0F2C35' }}
        />
      ) : (
        <View className="h-40 items-center justify-center bg-[#0F2C35]">
          <Text className="text-base font-semibold text-sea">Turnuva</Text>
        </View>
      )}
      <View className="gap-2 p-5">
        <Text className="text-xl font-semibold text-ink">{item.title}</Text>
        <Text className="text-sm text-white/70">{formatTournamentDateRange(item.starts_at, item.ends_at)}</Text>
        <View className="flex-row flex-wrap gap-2">
          {item.city ? (
            <View className="rounded-full bg-white/5 px-3 py-1.5">
              <Text className="text-xs font-semibold text-ink">{item.city}</Text>
            </View>
          ) : null}
          <View className="rounded-full bg-sea/10 px-3 py-1.5">
            <Text className="text-xs font-semibold text-sea">
              {getTournamentScoringLabel(item.scoring_type)}
            </Text>
          </View>
          <View className="rounded-full bg-coral/15 px-3 py-1.5">
            <Text className="text-xs font-semibold text-coral">
              {item.participantCount} katilimci
            </Text>
          </View>
        </View>
      </View>
      </GlassView>
    </TouchableOpacity>
  );
};
