import { Stack } from 'expo-router';

const GearLayout = (): JSX.Element => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animation: 'slide_from_right',
      }}
    />
  );
};

export default GearLayout;
