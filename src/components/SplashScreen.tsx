import { ActivityIndicator, Text, View } from 'react-native';

import { SPORT_THEME } from '@/lib/sport-theme';

export const SplashScreen = (): JSX.Element => {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: SPORT_THEME.bg,
      }}
    >
      <ActivityIndicator color={SPORT_THEME.active} size="large" />
      <Text style={{ color: SPORT_THEME.text, marginTop: 12, fontSize: 15, fontWeight: '600' }}>
        Yükleniyor...
      </Text>
    </View>
  );
};
