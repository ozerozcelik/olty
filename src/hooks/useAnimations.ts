/**
 * Animation Hooks and Utilities
 * Spring-based animations for natural motion
 */

import { useRef, useCallback } from 'react';
import { Animated, Easing, type ViewStyle } from 'react-native';

import { animations } from '@/lib/design-tokens';

// ============================================
// SPRING ANIMATION HOOK
// ============================================

interface SpringConfig {
  damping?: number;
  stiffness?: number;
  mass?: number;
  velocity?: number;
}

/**
 * Hook for spring-based scale animation
 */
export const useSpringScale = (
  initialValue = 1,
  config: SpringConfig = animations.spring.bouncy,
): {
  scale: Animated.Value;
  animateTo: (toValue: number, callback?: () => void) => void;
  pulse: () => void;
  pressIn: () => void;
  pressOut: () => void;
} => {
  const scale = useRef(new Animated.Value(initialValue)).current;

  const animateTo = useCallback(
    (toValue: number, callback?: () => void) => {
      Animated.spring(scale, {
        toValue,
        damping: config.damping ?? 12,
        stiffness: config.stiffness ?? 200,
        mass: config.mass ?? 0.8,
        useNativeDriver: true,
      }).start(callback);
    },
    [scale, config],
  );

  const pulse = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.15,
        damping: 10,
        stiffness: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 12,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale]);

  const pressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.95,
      damping: 20,
      stiffness: 400,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const pressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return { scale, animateTo, pulse, pressIn, pressOut };
};

// ============================================
// FADE ANIMATION HOOK
// ============================================

/**
 * Hook for fade in/out animations
 */
export const useFade = (
  initialValue = 0,
  duration = animations.timing.normal,
): {
  opacity: Animated.Value;
  fadeIn: (callback?: () => void) => void;
  fadeOut: (callback?: () => void) => void;
} => {
  const opacity = useRef(new Animated.Value(initialValue)).current;

  const fadeIn = useCallback(
    (callback?: () => void) => {
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(callback);
    },
    [opacity, duration],
  );

  const fadeOut = useCallback(
    (callback?: () => void) => {
      Animated.timing(opacity, {
        toValue: 0,
        duration,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(callback);
    },
    [opacity, duration],
  );

  return { opacity, fadeIn, fadeOut };
};

// ============================================
// SLIDE ANIMATION HOOK
// ============================================

type SlideDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Hook for slide in/out animations
 */
export const useSlide = (
  direction: SlideDirection = 'up',
  distance = 100,
  duration = animations.timing.normal,
): {
  translateValue: Animated.Value;
  slideIn: (callback?: () => void) => void;
  slideOut: (callback?: () => void) => void;
  getStyle: () => ViewStyle;
} => {
  const translateValue = useRef(new Animated.Value(distance)).current;

  const slideIn = useCallback(
    (callback?: () => void) => {
      Animated.spring(translateValue, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }).start(callback);
    },
    [translateValue],
  );

  const slideOut = useCallback(
    (callback?: () => void) => {
      Animated.timing(translateValue, {
        toValue: distance,
        duration,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(callback);
    },
    [translateValue, distance, duration],
  );

  const getStyle = useCallback((): ViewStyle => {
    const transformKey =
      direction === 'up' || direction === 'down' ? 'translateY' : 'translateX';
    const multiplier = direction === 'up' || direction === 'left' ? 1 : -1;
    
    return {
      transform: [
        { [transformKey]: Animated.multiply(translateValue, multiplier) } as unknown as { translateY: number } | { translateX: number },
      ],
    };
  }, [direction, translateValue]);

  return { translateValue, slideIn, slideOut, getStyle };
};

// ============================================
// SHAKE ANIMATION
// ============================================

/**
 * Hook for shake animation (error feedback)
 */
export const useShake = (): {
  shakeValue: Animated.Value;
  shake: () => void;
  getStyle: () => ViewStyle;
} => {
  const shakeValue = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeValue, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeValue, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeValue, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeValue, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeValue, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeValue, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeValue]);

  const getStyle = useCallback((): ViewStyle => ({
    transform: [{ translateX: shakeValue as unknown as number }],
  }), [shakeValue]);

  return { shakeValue, shake, getStyle };
};

// ============================================
// LIKE ANIMATION (Heart)
// ============================================

/**
 * Hook for like button animation
 */
export const useLikeAnimation = (): {
  scale: Animated.Value;
  animate: () => void;
  getStyle: () => ViewStyle;
} => {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.6,
        damping: 15,
        stiffness: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1.2,
        damping: 8,
        stiffness: 350,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 12,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale]);

  const getStyle = useCallback((): ViewStyle => ({
    transform: [{ scale: scale as unknown as number }],
  }), [scale]);

  return { scale, animate, getStyle };
};

// ============================================
// STAGGER ANIMATION HELPER
// ============================================

/**
 * Create staggered animation for list items
 */
export const createStaggerAnimation = (
  items: Animated.Value[],
  toValue: number,
  staggerDelay = 50,
  duration = animations.timing.normal,
): Animated.CompositeAnimation => {
  return Animated.stagger(
    staggerDelay,
    items.map((item) =>
      Animated.timing(item, {
        toValue,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ),
  );
};

/**
 * Hook for entrance stagger animation
 */
export const useStaggerEntrance = (
  itemCount: number,
  staggerDelay = 50,
): {
  values: Animated.Value[];
  animate: () => void;
  getItemStyle: (index: number) => ViewStyle;
} => {
  const values = useRef(
    Array.from({ length: itemCount }, () => new Animated.Value(0)),
  ).current;

  const animate = useCallback(() => {
    createStaggerAnimation(values, 1, staggerDelay).start();
  }, [values, staggerDelay]);

  const getItemStyle = useCallback(
    (index: number): ViewStyle => ({
      opacity: values[index] as unknown as number,
      transform: [
        {
          translateY: values[index].interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }) as unknown as number,
        },
      ],
    }),
    [values],
  );

  return { values, animate, getItemStyle };
};

// ============================================
// ROTATION ANIMATION
// ============================================

/**
 * Hook for continuous rotation (loading spinners)
 */
export const useRotation = (
  duration = 1000,
): {
  rotation: Animated.Value;
  start: () => void;
  stop: () => void;
  getStyle: () => ViewStyle;
} => {
  const rotation = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const start = useCallback(() => {
    animationRef.current = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animationRef.current.start();
  }, [rotation, duration]);

  const stop = useCallback(() => {
    animationRef.current?.stop();
    rotation.setValue(0);
  }, [rotation]);

  const getStyle = useCallback((): ViewStyle => ({
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }) as unknown as string,
      },
    ],
  }), [rotation]);

  return { rotation, start, stop, getStyle };
};
