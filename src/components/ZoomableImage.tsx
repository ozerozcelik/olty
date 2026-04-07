import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useCallback, useEffect } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface ZoomableImageProps {
  uri: string;
  height?: number;
  borderRadius?: number;
  onZoomStateChange?: (isZoomed: boolean) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_THRESHOLD = 1.01;
const isExpoGoIos =
  Constants.executionEnvironment === 'storeClient' && Platform.OS === 'ios';

const clamp = (value: number, min: number, max: number): number => {
  'worklet';

  return Math.min(Math.max(value, min), max);
};

const AnimatedView = Animated.createAnimatedComponent(View);

export const ZoomableImage = ({
  uri,
  height = 384,
  borderRadius = 32,
  onZoomStateChange,
}: ZoomableImageProps): JSX.Element => {
  const scale = useSharedValue(1);
  const scaleOffset = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateXOffset = useSharedValue(0);
  const translateYOffset = useSharedValue(0);
  const containerWidth = useSharedValue(0);
  const containerHeight = useSharedValue(height);
  const zoomedState = useSharedValue(false);

  const resetTransform = (): void => {
    'worklet';

    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  const emitZoomState = useCallback(
    (isZoomed: boolean): void => {
      onZoomStateChange?.(isZoomed);
    },
    [onZoomStateChange],
  );

  useEffect(() => {
    return () => {
      onZoomStateChange?.(false);
    };
  }, [onZoomStateChange]);

  const updateZoomState = (isZoomed: boolean): void => {
    'worklet';

    if (zoomedState.value === isZoomed) {
      return;
    }

    zoomedState.value = isZoomed;
    runOnJS(emitZoomState)(isZoomed);
  };

  const getMaxTranslateX = (): number => {
    'worklet';

    return Math.max(0, ((containerWidth.value * scale.value) - containerWidth.value) / 2);
  };

  const getMaxTranslateY = (): number => {
    'worklet';

    return Math.max(0, ((containerHeight.value * scale.value) - containerHeight.value) / 2);
  };

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      scaleOffset.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = clamp(scaleOffset.value * event.scale, MIN_SCALE, MAX_SCALE);

      scale.value = nextScale;
      translateX.value = clamp(translateX.value, -getMaxTranslateX(), getMaxTranslateX());
      translateY.value = clamp(translateY.value, -getMaxTranslateY(), getMaxTranslateY());
      updateZoomState(nextScale > ZOOM_THRESHOLD);
    })
    .onEnd(() => {
      if (scale.value <= ZOOM_THRESHOLD) {
        updateZoomState(false);
        resetTransform();
      }
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      translateXOffset.value = translateX.value;
      translateYOffset.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value <= ZOOM_THRESHOLD) {
        return;
      }

      translateX.value = clamp(
        translateXOffset.value + event.translationX,
        -getMaxTranslateX(),
        getMaxTranslateX(),
      );
      translateY.value = clamp(
        translateYOffset.value + event.translationY,
        -getMaxTranslateY(),
        getMaxTranslateY(),
      );
    })
    .onEnd(() => {
      if (scale.value <= ZOOM_THRESHOLD) {
        updateZoomState(false);
        resetTransform();
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const shouldZoomIn = scale.value <= ZOOM_THRESHOLD;

      if (shouldZoomIn) {
        scale.value = withSpring(2);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        updateZoomState(true);
        return;
      }

      updateZoomState(false);
      resetTransform();
    });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleLayout = (event: LayoutChangeEvent): void => {
    containerWidth.value = event.nativeEvent.layout.width;
    containerHeight.value = event.nativeEvent.layout.height;
  };

  return (
    <View
      className="overflow-hidden bg-[#DDE6E2]"
      onLayout={handleLayout}
      style={{ borderRadius, height }}
    >
      {isExpoGoIos ? (
        <View style={[StyleSheet.absoluteFillObject, styles.imageFrame]}>
          <Image contentFit="contain" source={{ uri }} style={styles.image} />
        </View>
      ) : (
        <GestureDetector gesture={Gesture.Simultaneous(doubleTapGesture, pinchGesture, panGesture)}>
          <AnimatedView style={[StyleSheet.absoluteFillObject, styles.imageFrame, imageStyle]}>
            <Image contentFit="contain" source={{ uri }} style={styles.image} />
          </AnimatedView>
        </GestureDetector>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  imageFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
