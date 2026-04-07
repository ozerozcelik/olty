import { StyleSheet, Text, View } from 'react-native';

type AppConfigErrorScreenProps = {
  message: string;
};

export const AppConfigErrorScreen = ({
  message,
}: AppConfigErrorScreenProps): JSX.Element => {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Baslatma Hatasi</Text>
      <Text style={styles.title}>Uygulama build konfigurasyonu eksik.</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.hint}>
        EAS ortamına gerekli EXPO_PUBLIC_* değişkenlerini ekleyip Android build&apos;i yeniden alın.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#0B1622',
  },
  eyebrow: {
    color: '#7DD4E8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 12,
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  message: {
    marginTop: 14,
    color: '#F8FAFC',
    fontSize: 15,
    lineHeight: 22,
  },
  hint: {
    marginTop: 14,
    color: 'rgba(248,250,252,0.72)',
    fontSize: 14,
    lineHeight: 21,
  },
});
