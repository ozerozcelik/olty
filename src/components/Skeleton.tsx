/**
 * Skeleton Loading Components
 * Shimmer effect placeholders for loading states
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle, type DimensionValue } from 'react-native';

import { colors, radii } from '@/lib/design-tokens';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Base Skeleton component with shimmer animation
 */
export const Skeleton = ({
  width = '100%',
  height = 16,
  borderRadius = radii.md,
  style,
}: SkeletonProps): JSX.Element => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.08)',
            'transparent',
          ]}
          end={{ x: 1, y: 0 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

/**
 * Skeleton for avatar circles
 */
export const SkeletonAvatar = ({
  size = 40,
  style,
}: {
  size?: number;
  style?: ViewStyle;
}): JSX.Element => (
  <Skeleton
    borderRadius={size / 2}
    height={size}
    style={style}
    width={size}
  />
);

/**
 * Skeleton for text lines
 */
export const SkeletonText = ({
  lines = 1,
  lastLineWidth = '60%',
  lineHeight = 14,
  spacing = 8,
  style,
}: {
  lines?: number;
  lastLineWidth?: DimensionValue;
  lineHeight?: number;
  spacing?: number;
  style?: ViewStyle;
}): JSX.Element => (
  <View style={[{ gap: spacing }, style]}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        borderRadius={radii.sm}
        height={lineHeight}
        key={`skeleton-line-${index}`}
        width={index === lines - 1 ? lastLineWidth : '100%'}
      />
    ))}
  </View>
);

/**
 * Skeleton for CatchCard
 */
export const SkeletonCatchCard = (): JSX.Element => (
  <View style={styles.catchCard}>
    {/* Header */}
    <View style={styles.catchCardHeader}>
      <SkeletonAvatar size={40} />
      <View style={styles.catchCardHeaderText}>
        <Skeleton borderRadius={radii.sm} height={14} width={120} />
        <Skeleton borderRadius={radii.sm} height={12} style={{ marginTop: 4 }} width={80} />
      </View>
    </View>

    {/* Photo */}
    <Skeleton borderRadius={0} height={240} width="100%" />

    {/* Content */}
    <View style={styles.catchCardContent}>
      <Skeleton borderRadius={radii.sm} height={20} width="70%" />
      <Skeleton borderRadius={radii.sm} height={14} style={{ marginTop: 8 }} width="50%" />
    </View>

    {/* Footer */}
    <View style={styles.catchCardFooter}>
      <Skeleton borderRadius={radii.full} height={20} width={60} />
      <Skeleton borderRadius={radii.full} height={20} width={60} />
      <Skeleton borderRadius={radii.full} height={20} width={60} />
    </View>
  </View>
);

/**
 * Skeleton for PostCard
 */
export const SkeletonPostCard = (): JSX.Element => (
  <View style={styles.postCard}>
    <Skeleton borderRadius={radii['3xl']} height={180} width="100%" />
    <View style={styles.postCardContent}>
      <Skeleton borderRadius={radii.full} height={24} width={80} />
      <Skeleton borderRadius={radii.sm} height={18} style={{ marginTop: 12 }} width="90%" />
      <SkeletonText lastLineWidth="70%" lineHeight={14} lines={2} spacing={6} style={{ marginTop: 8 }} />
      <View style={styles.postCardAuthor}>
        <SkeletonAvatar size={32} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Skeleton borderRadius={radii.sm} height={13} width={100} />
          <Skeleton borderRadius={radii.sm} height={11} style={{ marginTop: 4 }} width={60} />
        </View>
      </View>
    </View>
  </View>
);

/**
 * Skeleton for WeatherWidget
 */
export const SkeletonWeatherWidget = (): JSX.Element => (
  <View style={styles.weatherWidget}>
    <View style={styles.weatherWidgetHeader}>
      <View>
        <Skeleton borderRadius={radii.sm} height={12} width={80} />
        <Skeleton borderRadius={radii.sm} height={18} style={{ marginTop: 6 }} width={140} />
      </View>
      <Skeleton borderRadius={radii.lg} height={48} width={80} />
    </View>
    <View style={styles.weatherWidgetScore}>
      <Skeleton borderRadius={radii['2xl']} height={100} width={100} />
      <View style={{ flex: 1, marginLeft: 16 }}>
        <Skeleton borderRadius={radii.sm} height={14} width="80%" />
        <Skeleton borderRadius={radii.sm} height={12} style={{ marginTop: 8 }} width="60%" />
        <Skeleton borderRadius={radii.sm} height={12} style={{ marginTop: 8 }} width="70%" />
      </View>
    </View>
    {/* Hourly timeline */}
    <View style={styles.weatherWidgetTimeline}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton borderRadius={radii.xl} height={80} key={i} width={68} />
      ))}
    </View>
  </View>
);

/**
 * Skeleton for Profile header
 */
export const SkeletonProfileHeader = (): JSX.Element => (
  <View style={styles.profileHeader}>
    <SkeletonAvatar size={80} />
    <View style={styles.profileHeaderInfo}>
      <Skeleton borderRadius={radii.sm} height={20} width={150} />
      <Skeleton borderRadius={radii.sm} height={14} style={{ marginTop: 8 }} width={100} />
    </View>
    <View style={styles.profileStats}>
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={styles.profileStatItem}>
          <Skeleton borderRadius={radii.sm} height={18} width={40} />
          <Skeleton borderRadius={radii.sm} height={12} style={{ marginTop: 4 }} width={50} />
        </View>
      ))}
    </View>
  </View>
);

/**
 * Skeleton for Feed (list of cards)
 */
export const SkeletonFeed = ({ count = 3 }: { count?: number }): JSX.Element => (
  <View style={{ gap: 16 }}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCatchCard key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.overlay.light,
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: 200,
  },
  catchCard: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.border.default,
    borderRadius: radii['4xl'],
    borderWidth: 1,
    overflow: 'hidden',
  },
  catchCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 16,
  },
  catchCardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  catchCardContent: {
    padding: 16,
  },
  catchCardFooter: {
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    padding: 12,
  },
  postCard: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.border.default,
    borderRadius: radii['4xl'],
    borderWidth: 1,
    overflow: 'hidden',
  },
  postCardContent: {
    padding: 16,
  },
  postCardAuthor: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 16,
  },
  weatherWidget: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.border.default,
    borderRadius: radii['4xl'],
    borderWidth: 1,
    padding: 16,
  },
  weatherWidgetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weatherWidgetScore: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  weatherWidgetTimeline: {
    flexDirection: 'row',
    gap: 10,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
  },
  profileHeaderInfo: {
    alignItems: 'center',
    marginTop: 16,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 20,
  },
  profileStatItem: {
    alignItems: 'center',
  },
});
