import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  bgDeep: '#0D2830',
  bgHero: '#0D3D4A',
  bgCard: 'rgba(125,212,232,0.06)',
  borderDefault: 'rgba(125,212,232,0.18)',
  teal: '#7DD4E8',
  tealGlow: 'rgba(125,212,232,0.12)',
  textPrimary: '#E8F7FA',
  textSecondary: 'rgba(125,212,232,0.50)',
  coral: '#E8845A',
};

export default function WelcomeScreen(): JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const openRoute = (path: '/login' | '/register'): void => {
    router.replace(path);
  };

  return (
    <View style={styles.container}>
      {/* Hero Card */}
      <LinearGradient
        colors={[COLORS.bgHero, '#0A2028']}
        style={[styles.heroCard, { paddingTop: Math.max(insets.top + 40, 80) }]}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🎣</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          <Text style={styles.titleAccent}>Olty</Text>
        </Text>
        <Text style={styles.subtitle}>
          Avlarını kaydet, ilerlemeni takip et,{'\n'}topluluğa katıl.
        </Text>
      </LinearGradient>

      {/* Bottom Section */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}>
        {/* Primary CTA */}
        <Pressable
          onPress={() => openRoute('/register')}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Hesap Oluştur</Text>
        </Pressable>

        {/* Secondary CTA */}
        <Pressable
          onPress={() => openRoute('/login')}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Giriş Yap</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  heroCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: COLORS.tealGlow,
    borderWidth: 1.5,
    borderColor: 'rgba(125,212,232,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoEmoji: {
    fontSize: 44,
  },
  title: {
    fontSize: 44,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  titleAccent: {
    color: COLORS.teal,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
    backgroundColor: COLORS.bgDeep,
  },
  primaryButton: {
    backgroundColor: COLORS.coral,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  secondaryButtonText: {
    color: COLORS.teal,
    fontWeight: '600',
    fontSize: 16,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
