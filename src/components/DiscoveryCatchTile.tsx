import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import React, { memo, useCallback } from 'react';
import { Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import type { CatchFeedItem } from '@/types/app.types';

interface DiscoveryCatchTileProps {
  item: CatchFeedItem;
}

const DiscoveryCatchTileComponent = ({ item }: DiscoveryCatchTileProps): JSX.Element => {
  const router = useRouter();
  const handlePress = useCallback(
    () => router.push(`/catch/${item.id}`),
    [router, item.id]
  );

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      className="mb-3 flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.07)]" 
      onPress={handlePress}
    >
      {item.photo_url ? (
        <Image
          cachePolicy="memory-disk"
          contentFit="cover"
          source={{ uri: item.photo_url }}
          style={{ width: '100%', height: 176, backgroundColor: '#0F2C35' }}
        />
      ) : (
        <View className="h-44 items-center justify-center bg-[#0F2C35]">
          <Text className="text-sm text-white/70">Fotoğraf yok</Text>
        </View>
      )}
      <View className="gap-1 px-3 py-3">
        <Text className="text-sm font-semibold text-[#F0F7F9]">{item.fish_species?.name_tr ?? item.species_custom ?? 'Av kaydı'}</Text>
        <Text className="text-xs text-[rgba(240,247,249,0.65)]">@{item.profiles?.username ?? 'bilinmeyen'}</Text>
      </View>
    </TouchableOpacity>
  );
};

// Custom comparison for memo
export const DiscoveryCatchTile = memo(DiscoveryCatchTileComponent, (prev, next) => {
  return prev.item.id === next.item.id;
});
