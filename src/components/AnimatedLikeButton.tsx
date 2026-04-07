/**
 * AnimatedLikeButton Component
 * Heart button with satisfying animation and haptics
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '@/lib/design-tokens';
import { hapticLike } from '@/utils/haptics';

interface AnimatedLikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  onPress: () => void;
  size?: number;
  showCount?: boolean;
}

export const AnimatedLikeButton = ({
  isLiked,
  likeCount,
  onPress,
  size = 24,
  showCount = true,
}: AnimatedLikeButtonProps): JSX.Element => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const particleOpacity = useRef(new Animated.Value(0)).current;
  const particleScale = useRef(new Animated.Value(0.5)).current;
  const prevLiked = useRef(isLiked);

  // Animate when like state changes to true
  useEffect(() => {
    if (isLiked && !prevLiked.current) {
      // Heart bounce animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.6,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          damping: 8,
          stiffness: 350,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 12,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Particle burst animation
      particleOpacity.setValue(1);
      particleScale.setValue(0.5);
      Animated.parallel([
        Animated.timing(particleOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(particleScale, {
          toValue: 2,
          damping: 15,
          stiffness: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevLiked.current = isLiked;
  }, [isLiked, scaleAnim, particleOpacity, particleScale]);

  const handlePress = useCallback(() => {
    hapticLike();
    onPress();
  }, [onPress]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      damping: 20,
      stiffness: 400,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    if (!isLiked) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 15,
        stiffness: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [scaleAnim, isLiked]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.container}
    >
      <View style={styles.iconContainer}>
        {/* Particle ring effect */}
        <Animated.View
          style={[
            styles.particleRing,
            {
              opacity: particleOpacity,
              transform: [{ scale: particleScale }],
              width: size * 2,
              height: size * 2,
              borderRadius: size,
            },
          ]}
        />
        
        {/* Heart icon */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Ionicons
            color={isLiked ? colors.brand.primary : colors.text.secondary}
            name={isLiked ? 'heart' : 'heart-outline'}
            size={size}
          />
        </Animated.View>
      </View>
      
      {showCount && (
        <Text
          style={[
            styles.count,
            isLiked && styles.countActive,
          ]}
        >
          {likeCount}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleRing: {
    backgroundColor: 'transparent',
    borderColor: colors.brand.primary,
    borderWidth: 2,
    position: 'absolute',
  },
  count: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  countActive: {
    color: colors.brand.primary,
  },
});
