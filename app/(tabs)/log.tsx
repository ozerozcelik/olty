import {
  useRouter,
  type Href } from 'expo-router';
import { StyleSheet, Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { T } from '@/lib/theme';

const FISH_ID_ROUTE = '/fish-id' as Href;
const POSTS_ROUTE = '/posts/new' as Href;
const LOCATION_ROUTE = '/locations/new' as Href;

const LogScreen = (): JSX.Element => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { paddingBottom: 32, paddingTop: Math.max(insets.top, 20) }]}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Yeni içerik başlat</Text>
        <Text style={styles.subtitle}>
          Avını kaydet, fotoğrafı AI ile tanıt ya da taktik yazısı paylaş.
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.buttonCoral}
          onPress={() => router.push('/catch/new')}
        >
          <Text style={styles.buttonTitle}>Av Ekle</Text>
          <Text style={styles.buttonDescription}>
            Fotoğraf, boy, ağırlık ve konum bilgilerini kendin gir.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.buttonSea}
          onPress={() => router.push(FISH_ID_ROUTE)}
        >
          <Text style={styles.buttonTitleDark}>AI ile Tanı</Text>
          <Text style={styles.buttonDescriptionDark}>
            Fotoğraf yükle, tür tahmini al ve sonucu av kaydına taşı.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.buttonOutline}
          onPress={() => router.push(LOCATION_ROUTE)}
        >
          <Text style={styles.buttonTitleLight}>Yer İmi Ekle</Text>
          <Text style={styles.buttonDescriptionLight}>
            Balık noktası, marina, dükkan veya tehlike kaydı oluştur.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.buttonOutline}
          onPress={() => router.push(POSTS_ROUTE)}
        >
          <Text style={styles.buttonTitleLight}>Yeni Yazı</Text>
          <Text style={styles.buttonDescriptionLight}>
            Taktik, hikaye, ekipman incelemesi veya spot rehberi paylaş.
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgCard,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: T.glassBorder,
    backgroundColor: T.glass,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: T.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: T.textSecondary,
  },
  buttonCoral: {
    marginTop: 24,
    borderRadius: 20,
    backgroundColor: T.coral,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  buttonSea: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: T.teal,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  buttonOutline: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.glassBorder,
    backgroundColor: T.glass,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTitleDark: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A1E26',
  },
  buttonTitleLight: {
    fontSize: 16,
    fontWeight: '600',
    color: T.textPrimary,
  },
  buttonDescription: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  buttonDescriptionDark: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(10,30,38,0.70)',
  },
  buttonDescriptionLight: {
    marginTop: 4,
    fontSize: 13,
    color: T.textSecondary,
  },
});

export default LogScreen;
