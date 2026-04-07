import { BlurView } from '@react-native-community/blur';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

type BlurTint = 'dark' | 'light' | 'xlight' | 'prominent' | 'regular' | 'extraDark' | 'chromeMaterial' | 'material' | 'thickMaterial' | 'thinMaterial' | 'ultraThinMaterial' | 'chromeMaterialDark' | 'materialDark' | 'thickMaterialDark' | 'thinMaterialDark' | 'ultraThinMaterialDark' | 'chromeMaterialLight' | 'materialLight' | 'thickMaterialLight' | 'thinMaterialLight' | 'ultraThinMaterialLight';

interface GlassViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: BlurTint;
  borderRadius?: number;
  borderColor?: string;
}

export const GlassView = ({
  children,
  style,
  intensity = 40,
  tint = 'light',
  borderRadius = 24,
  borderColor = 'rgba(255,255,255,0.15)',
}: GlassViewProps): JSX.Element => {
  if (Platform.OS === 'android') {
    return (
      <View
        style={[
          styles.androidFallback,
          { borderRadius, borderColor },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      blurAmount={intensity}
      blurType={tint}
      reducedTransparencyFallbackColor="rgba(10,32,40,0.85)"
      style={[styles.blurView, { borderRadius, borderColor }, style]}
    >
      <View style={styles.innerContent}>
        {children}
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  blurView: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  innerContent: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  androidFallback: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    overflow: 'hidden',
  },
});
