import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';

import { EventBus } from '@/lib/eventBus';

interface BadgePayload {
  badgeName: string;
  badgeIcon: string | null;
}

export const BadgeToast = (): JSX.Element => {
  const [payload, setPayload] = useState<BadgePayload | null>(null);
  const translateY = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    const subscription = EventBus.on('BADGE_EARNED', (data: unknown) => {
      if (
        typeof data !== 'object' ||
        data === null ||
        typeof (data as BadgePayload).badgeName !== 'string'
      ) {
        return;
      }

      setPayload(data as BadgePayload);
      translateY.setValue(120);
      Animated.sequence([
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.delay(3000),
        Animated.timing(translateY, { toValue: 120, duration: 220, useNativeDriver: true }),
      ]).start(() => setPayload(null));
    });

    return () => {
      subscription.remove();
    };
  }, [translateY]);

  if (!payload) {
    return <></>;
  }

  return (
    <Animated.View
      className="absolute bottom-6 left-4 right-4 z-50"
      pointerEvents="none"
      style={{ transform: [{ translateY }] }}
    >
      <View className="rounded-[24px] bg-[#16333B] px-4 py-4">
        <Text className="text-sm font-semibold text-white">🏅 Yeni rozet: {payload.badgeName}</Text>
      </View>
    </Animated.View>
  );
};
