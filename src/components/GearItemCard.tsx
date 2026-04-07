import {
  Ionicons } from '@expo/vector-icons';
import { Image,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { GEAR_CATEGORIES, GEAR_TIERS } from '@/lib/constants';
import type { GearItemRow } from '@/types/app.types';

interface GearItemCardProps {
  item: GearItemRow;
  onLongPress?: (item: GearItemRow) => void;
  onPress?: (item: GearItemRow) => void;
}

const getTierBadgeClassName = (tier: number): string => {
  switch (tier) {
    case 2:
      return 'bg-[#43A047]/15';
    case 3:
      return 'bg-sea/15';
    case 4:
      return 'bg-[#F0B429]/15';
    default:
      return 'bg-white/10';
  }
};

const getTierTextClassName = (tier: number): string => {
  switch (tier) {
    case 2:
      return 'text-[#7DE29A]';
    case 3:
      return 'text-sea';
    case 4:
      return 'text-[#F0B429]';
    default:
      return 'text-white/70';
  }
};

export const GearItemCard = ({
  item,
  onLongPress,
  onPress,
}: GearItemCardProps): JSX.Element => {
  const tier = GEAR_TIERS[item.tier as keyof typeof GEAR_TIERS] ?? GEAR_TIERS[1];
  const category = GEAR_CATEGORIES.find((entry) => entry.value === item.category_slug);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      className="mr-3 w-52 rounded-[28px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.07)] p-4"
      onLongPress={onLongPress ? () => onLongPress(item) : undefined}
      onPress={onPress ? () => onPress(item) : undefined}
    >
      <View className="overflow-hidden rounded-[22px] bg-[#0F2C35]">
        {item.photo_url ? (
          <Image
            resizeMode="cover"
            source={{ uri: item.photo_url }}
            style={{ width: '100%', height: 140 }}
          />
        ) : (
          <View className="h-[140px] items-center justify-center">
            <Text className="text-4xl">{category?.icon ?? '🧰'}</Text>
          </View>
        )}
      </View>

      <View className="mt-4 gap-2">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-base font-semibold text-[#F0F7F9]">{item.name}</Text>
          {item.is_favorite ? (
            <Ionicons color="#D97B4A" name="heart" size={18} />
          ) : null}
        </View>

        <Text className="text-sm text-[rgba(240,247,249,0.65)]">
          {[item.brand, item.model].filter(Boolean).join(' • ') || category?.label || 'Ekipman'}
        </Text>

        <View className={`self-start rounded-full px-3 py-1.5 ${getTierBadgeClassName(item.tier)}`}>
          <Text className={`text-xs font-semibold ${getTierTextClassName(item.tier)}`}>
            {tier.name}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
