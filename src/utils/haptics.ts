/**
 * Haptic Feedback Utilities
 * Provides tactile feedback for user interactions
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Only trigger haptics on physical devices
const isHapticsAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Light haptic feedback - for subtle interactions
 * Use for: toggles, selections, navigation
 */
export const hapticLight = (): void => {
  if (isHapticsAvailable) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

/**
 * Medium haptic feedback - for standard interactions
 * Use for: button presses, card taps, confirms
 */
export const hapticMedium = (): void => {
  if (isHapticsAvailable) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

/**
 * Heavy haptic feedback - for significant actions
 * Use for: destructive actions, important confirms, pull-to-refresh
 */
export const hapticHeavy = (): void => {
  if (isHapticsAvailable) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
};

/**
 * Success haptic pattern
 * Use for: successful submissions, achievements, level ups
 */
export const hapticSuccess = (): void => {
  if (isHapticsAvailable) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

/**
 * Warning haptic pattern
 * Use for: validation warnings, approach limits
 */
export const hapticWarning = (): void => {
  if (isHapticsAvailable) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};

/**
 * Error haptic pattern
 * Use for: form errors, failed actions, invalid inputs
 */
export const hapticError = (): void => {
  if (isHapticsAvailable) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

/**
 * Selection changed haptic
 * Use for: picker changes, tab switches, segment controls
 */
export const hapticSelection = (): void => {
  if (isHapticsAvailable) {
    void Haptics.selectionAsync();
  }
};

/**
 * Custom haptic pattern for special events (like confetti)
 */
export const hapticCelebration = (): void => {
  if (isHapticsAvailable) {
    // Quick succession of haptics for celebration feel
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 100);
    setTimeout(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 200);
  }
};

/**
 * Like button haptic - special pattern for social interactions
 */
export const hapticLike = (): void => {
  if (isHapticsAvailable) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

// Export all haptics as a namespace
export const haptics = {
  light: hapticLight,
  medium: hapticMedium,
  heavy: hapticHeavy,
  success: hapticSuccess,
  warning: hapticWarning,
  error: hapticError,
  selection: hapticSelection,
  celebration: hapticCelebration,
  like: hapticLike,
} as const;
