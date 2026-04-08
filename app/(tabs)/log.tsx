import {
  useRouter,
  type Href } from 'expo-router';
import { StyleSheet, Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity } from '@/components/TouchableOpacity';
import { SPORT_THEME } from '@/lib/sport-theme';

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
    backgroundColor: SPORT_THEME.bg,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: SPORT_THEME.border,
    backgroundColor: SPORT_THEME.surface,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: SPORT_THEME.text,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: SPORT_THEME.textMuted,
  },
  buttonCoral: {
    marginTop: 24,
    borderRadius: 20,
    backgroundColor: SPORT_THEME.warning,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  buttonSea: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: SPORT_THEME.active,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  buttonOutline: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SPORT_THEME.border,
    backgroundColor: SPORT_THEME.surface,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SPORT_THEME.bg,
  },
  buttonTitleDark: {
    fontSize: 16,
    fontWeight: '600',
    color: SPORT_THEME.bg,
  },
  buttonTitleLight: {
    fontSize: 16,
    fontWeight: '600',
    color: SPORT_THEME.text,
  },
  buttonDescription: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(5,6,8,0.78)',
  },
  buttonDescriptionDark: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(5,6,8,0.78)',
  },
  buttonDescriptionLight: {
    marginTop: 4,
    fontSize: 13,
    color: SPORT_THEME.textMuted,
  },
});

export default LogScreen;
