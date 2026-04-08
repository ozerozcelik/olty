/**
 * AnimatedButton Component
 * Button with press animation and haptic feedback
 */

import React, { useCallback, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
  type TextStyle,
  type PressableProps,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radii, shadows, typography } from '@/lib/design-tokens';
import { hapticMedium, hapticLight } from '@/utils/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'coral' | 'sea';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AnimatedButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  /** Button label - can use title prop or children */
  title?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
}

const variantStyles: Record<ButtonVariant, { bg: readonly [string, string]; text: string; border?: string }> = {
  primary: {
    bg: ['#D4FF00', '#B8DB00'] as const,
    text: '#FFFFFF',
  },
  secondary: {
    bg: ['#3B82F6', '#2563EB'] as const,
    text: '#FFFFFF',
  },
  coral: {
    bg: ['#FF5500', '#D64600'] as const,
    text: '#FFFFFF',
  },
  sea: {
    bg: ['#D4FF00', '#E7FF66'] as const,
    text: '#050608',
  },
  outline: {
    bg: ['transparent', 'transparent'] as const,
    text: '#FFFFFF',
    border: colors.border.strong,
  },
  ghost: {
    bg: ['transparent', 'transparent'] as const,
    text: '#8B92A5',
  },
};

const sizeStyles: Record<ButtonSize, { height: number; paddingH: number; fontSize: number }> = {
  sm: { height: 36, paddingH: 16, fontSize: 13 },
  md: { height: 44, paddingH: 20, fontSize: 15 },
  lg: { height: 52, paddingH: 24, fontSize: 16 },
};

export const AnimatedButton = ({
  title,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  haptic = true,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedButtonProps): JSX.Element => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const variantConfig = variantStyles[variant];
  const sizeConfig = sizeStyles[size];
  
  // Support both title prop and children
  const buttonLabel = title ?? (typeof children === 'string' ? children : null);

  const handlePressIn = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      if (haptic) hapticLight();
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        damping: 20,
        stiffness: 400,
        useNativeDriver: true,
      }).start();
      onPressIn?.(e);
    },
    [scaleAnim, haptic, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 15,
        stiffness: 300,
        useNativeDriver: true,
      }).start();
      onPressOut?.(e);
    },
    [scaleAnim, onPressOut],
  );

  const handlePress = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      if (haptic) hapticMedium();
      onPress?.(e);
    },
    [haptic, onPress],
  );

  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';
  const showGradient = !isOutline && !isGhost;

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <Pressable
        disabled={disabled || loading}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      >
        {showGradient ? (
          <LinearGradient
            colors={disabled ? ['#4B5563', '#374151'] as const : variantConfig.bg}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={[
              styles.button,
              {
                height: sizeConfig.height,
                paddingHorizontal: sizeConfig.paddingH,
              },
              variant === 'primary' && !disabled && shadows.glow,
              variant === 'coral' && !disabled && shadows.glowCoral,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={variantConfig.text} size="small" />
            ) : (
              <>
                {icon && iconPosition === 'left' ? icon : null}
                <Text
                  style={[
                    styles.text,
                    { color: variantConfig.text, fontSize: sizeConfig.fontSize },
                    Boolean(icon && iconPosition === 'left') && styles.textWithIconLeft,
                    Boolean(icon && iconPosition === 'right') && styles.textWithIconRight,
                    textStyle,
                  ]}
                >
                  {buttonLabel}
                </Text>
                {icon && iconPosition === 'right' ? icon : null}
              </>
            )}
          </LinearGradient>
        ) : (
          <Animated.View
            style={[
              styles.button,
              {
                height: sizeConfig.height,
                paddingHorizontal: sizeConfig.paddingH,
                borderWidth: isOutline ? 1.5 : 0,
                borderColor: variantConfig.border,
              },
              disabled && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={variantConfig.text} size="small" />
            ) : (
              <>
                {icon && iconPosition === 'left' ? icon : null}
                <Text
                  style={[
                    styles.text,
                    {
                      color: disabled ? colors.text.tertiary : variantConfig.text,
                      fontSize: sizeConfig.fontSize,
                    },
                    Boolean(icon && iconPosition === 'left') && styles.textWithIconLeft,
                    Boolean(icon && iconPosition === 'right') && styles.textWithIconRight,
                    textStyle,
                  ]}
                >
                  {buttonLabel}
                </Text>
                {icon && iconPosition === 'right' ? icon : null}
              </>
            )}
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radii['4xl'],
    flexDirection: 'row',
    justifyContent: 'center',
  },
  text: {
    fontFamily: typography.fonts.semibold,
    fontWeight: '600',
  },
  textWithIconLeft: {
    marginLeft: 8,
  },
  textWithIconRight: {
    marginRight: 8,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});
