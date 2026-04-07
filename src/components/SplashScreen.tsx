import { ActivityIndicator, Text, View } from 'react-native';

export const SplashScreen = (): JSX.Element => {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0B1622',
      }}
    >
      <ActivityIndicator color="#7DD4E8" size="large" />
      <Text style={{ color: '#F8FAFC', marginTop: 12, fontSize: 15, fontWeight: '600' }}>
        Yükleniyor...
      </Text>
    </View>
  );
};
