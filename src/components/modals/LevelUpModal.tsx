import {
  useEffect,
  useRef,
  useState } from 'react';
import { Animated,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { LEVELS } from '@/lib/constants';
import { EventBus } from '@/lib/eventBus';

interface LevelUpPayload {
  newLevel: number;
  levelName: string;
  totalXP: number;
}

const getScaleValues = (): Animated.Value[] => {
  return [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)];
};

export const LevelUpModal = (): JSX.Element => {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<LevelUpPayload | null>(null);
  const starValues = useRef<Animated.Value[]>(getScaleValues()).current;

  useEffect(() => {
    const subscription = EventBus.on('LEVEL_UP', (data: unknown) => {
      if (
        typeof data !== 'object' ||
        data === null ||
        typeof (data as LevelUpPayload).newLevel !== 'number' ||
        typeof (data as LevelUpPayload).levelName !== 'string' ||
        typeof (data as LevelUpPayload).totalXP !== 'number'
      ) {
        return;
      }

      const nextPayload = data as LevelUpPayload;
      setPayload(nextPayload);
      setVisible(true);

      starValues.forEach((value) => value.setValue(0));
      Animated.stagger(
        100,
        starValues.map((value) =>
          Animated.timing(value, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ),
      ).start();
    });

    return () => {
      subscription.remove();
    };
  }, [starValues]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timeout = setTimeout(() => {
      setVisible(false);
    }, 4000);

    return () => {
      clearTimeout(timeout);
    };
  }, [visible]);

  if (!visible || !payload) {
    return <></>;
  }

  const levelMeta = LEVELS.find((item) => item.level === payload.newLevel) ?? LEVELS[0];

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-black/45 px-8">
      <View className="w-full rounded-[28px] border border-white/10 bg-[#16333B] px-6 py-8">
        <View className="items-center">
          <Text className="text-6xl">{levelMeta.badge}</Text>
          <Text className="mt-3 text-center text-2xl font-semibold text-ink">SEVİYE ATLADIN! 🎉</Text>
          <Text className="mt-2 text-3xl font-semibold text-sea">{payload.levelName}</Text>
          <View className="mt-5 h-16 w-40 items-center justify-center">
            {starValues.map((value, index) => {
              const translateX = index < 2 ? -42 + index * 24 : 18 + (index - 2) * 24;
              const translateY = index % 2 === 0 ? -10 : 12;

              return (
                <Animated.Text
                  key={`level-star-${index}`}
                  className="absolute text-3xl"
                  style={{
                    opacity: value,
                    transform: [
                      { translateX },
                      { translateY },
                      {
                        scale: value.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                        }),
                      },
                    ],
                  }}
                >
                  ✨
                </Animated.Text>
              );
            })}
          </View>
          <Text className="mt-2 text-sm text-white/70">XP&apos;in: {payload.totalXP}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            className="mt-6 rounded-full bg-coral px-6 py-3"
            onPress={() => setVisible(false)}
          >
            <Text className="text-base font-semibold text-white">Harika!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
