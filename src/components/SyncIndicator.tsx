import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useDraftStore } from '@/stores/useDraftStore';
import { syncAllPendingDrafts } from '@/services/sync.service';

const COLORS = {
  background: 'rgba(11,22,34,0.95)',
  online: '#00D084',
  offline: '#FB7185',
  syncing: '#3B82F6',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
};

export const SyncIndicator = (): React.ReactElement | null => {
  const { isOnline, isSyncing, pendingCount } = useDraftStore((state) => state.sync);
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (isSyncing) {
      animation = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      animation.start();
    } else {
      spinAnim.setValue(0);
    }

    return () => {
      animation?.stop();
    };
  }, [isSyncing, spinAnim]);

  // Don't show if online and no pending
  if (isOnline && pendingCount === 0) {
    return null;
  }

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handlePress = (): void => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      syncAllPendingDrafts();
    }
  };

  const getStatusColor = (): string => {
    if (!isOnline) return COLORS.offline;
    if (isSyncing) return COLORS.syncing;
    return COLORS.online;
  };

  const getStatusText = (): string => {
    if (!isOnline) {
      return pendingCount > 0
        ? `Çevrimdışı • ${pendingCount} taslak bekliyor`
        : 'Çevrimdışı';
    }
    if (isSyncing) {
      return 'Senkronize ediliyor...';
    }
    if (pendingCount > 0) {
      return `${pendingCount} taslak bekliyor`;
    }
    return 'Senkronize';
  };

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    if (!isOnline) return 'cloud-offline-outline';
    if (isSyncing) return 'sync-outline';
    if (pendingCount > 0) return 'cloud-upload-outline';
    return 'cloud-done-outline';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={styles.container}
    >
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]}>
        {isSyncing ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name={getIcon()} size={16} color={COLORS.text} />
          </Animated.View>
        ) : (
          <Ionicons name={getIcon()} size={16} color={COLORS.text} />
        )}
      </View>
      <Text style={styles.text}>{getStatusText()}</Text>
      {isOnline && pendingCount > 0 && !isSyncing && (
        <Ionicons
          name="chevron-forward"
          size={14}
          color={COLORS.textSecondary}
          style={styles.chevron}
        />
      )}
    </TouchableOpacity>
  );
};

// Compact version for header
export const SyncStatusDot = (): React.ReactElement | null => {
  const { isOnline, isSyncing, pendingCount } = useDraftStore((state) => state.sync);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (isSyncing || (!isOnline && pendingCount > 0)) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      animation?.stop();
    };
  }, [isSyncing, isOnline, pendingCount, pulseAnim]);

  // Don't show if everything is fine
  if (isOnline && pendingCount === 0) {
    return null;
  }

  const getColor = (): string => {
    if (!isOnline) return COLORS.offline;
    if (isSyncing) return COLORS.syncing;
    if (pendingCount > 0) return COLORS.syncing;
    return COLORS.online;
  };

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: getColor(), opacity: pulseAnim },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  indicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
