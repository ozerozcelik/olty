import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

interface ConfettiBurstProps {
  visible: boolean;
}

const COLORS = ['#1A6B3C', '#0D7CC4', '#F2A71B', '#E53935', '#8E24AA'] as const;

const PARTICLES = Array.from({ length: 12 }, (_, index) => {
  const angle = (-100 + index * 16) * (Math.PI / 180);
  const distance = 72 + (index % 4) * 14;

  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    colorIndex: index % COLORS.length,
  };
});

const getParticleClassName = (index: number): string => {
  switch (PARTICLES[index]?.colorIndex) {
    case 0:
      return 'bg-[#1A6B3C]';
    case 1:
      return 'bg-[#0D7CC4]';
    case 2:
      return 'bg-[#F2A71B]';
    case 3:
      return 'bg-[#E53935]';
    default:
      return 'bg-[#8E24AA]';
  }
};

const ConfettiParticle = ({
  visible,
  index,
}: {
  visible: boolean;
  index: number;
}): JSX.Element => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.stopAnimation();

    if (!visible) {
      progress.setValue(0);
      return;
    }

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, visible]);

  const particle = PARTICLES[index];
  const animatedStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
    transform: [
      {
        translateX: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, particle.x],
        }),
      },
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, particle.y - 18],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.6],
        }),
      },
    ],
  };

  return (
    <Animated.View
      className={`absolute h-3 w-3 rounded-full ${getParticleClassName(index)}`}
      style={animatedStyle}
    />
  );
};

export const ConfettiBurst = ({ visible }: ConfettiBurstProps): JSX.Element => {
  if (!visible) {
    return <></>;
  }

  return (
    <View className="absolute left-1/2 top-10 h-1 w-1" pointerEvents="none">
      {PARTICLES.map((_particle, index) => (
        <ConfettiParticle index={index} key={`confetti-${index}`} visible={visible} />
      ))}
    </View>
  );
};
