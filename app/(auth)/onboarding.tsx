import {
  useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect,
  useRef,
  useState } from 'react';
import { Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { completeOnboarding } from '@/services/profiles.service';
import { useAuthStore } from '@/stores/useAuthStore';

const SPLASH_LOGO = require('../../assets/splash-icon.png');

type Step = 1 | 2 | 3;

interface StepContent {
  emoji: string;
  title: string;
  body: string;
}

const STEP_CONTENT: Record<Step, StepContent> = {
  1: {
    emoji: '🎣',
    title: "Olty'ye Hoş Geldin!",
    body: "Avlarını kaydet, deneyim kazan, Türkiye'nin en iyi balıkçılarıyla yarış.",
  },
  2: {
    emoji: '📸',
    title: 'Avını Fotoğrafla',
    body: 'Her av kaydı sana XP kazandırır. Fotoğraflı kayıtlar 3 kat daha fazla XP!',
  },
  3: {
    emoji: '🏅',
    title: 'Rozet ve Seviye Kazan',
    body: 'İlk avın için hemen 100 XP kazanıyorsun. Hadi başlayalım!',
  },
};

const OnboardingScreen = (): JSX.Element => {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const setProfile = useAuthStore((state) => state.setProfile);
  const [step, setStep] = useState<Step>(1);
  const [animatedXp, setAnimatedXp] = useState<number>(0);
  const xpValue = useRef<Animated.Value>(new Animated.Value(0)).current;

  useEffect(() => {
    const listenerId = xpValue.addListener(({ value }) => {
      setAnimatedXp(Math.round(value));
    });

    return () => {
      xpValue.removeListener(listenerId);
    };
  }, [xpValue]);

  useEffect(() => {
    if (step !== 2) {
      xpValue.setValue(0);
      setAnimatedXp(0);
      return;
    }

    Animated.timing(xpValue, {
      toValue: 30,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [step, xpValue]);

  const finishOnboarding = async (targetRoute: '/catch/new' | '/(tabs)'): Promise<void> => {
    if (!session?.user.id) {
      return;
    }

    const updatedProfile = await completeOnboarding(session.user.id);
    setProfile(updatedProfile);
    router.replace(targetRoute);
  };

  const content = STEP_CONTENT[step];

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.topSection}>
          <View style={styles.emojiCircle}>
            <Text style={styles.emoji}>🔐</Text>
          </View>
          <View style={styles.textSection}>
            <Text style={styles.title}>Oturum gerekli</Text>
            <Text style={styles.body}>
              Onboarding akışına devam etmek için önce hesabınızı doğrulayıp giriş yapmanız
              gerekiyor.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.primaryButton}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.primaryButtonText}>Giriş ekranına dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topContent}>
        <View style={styles.centerContent}>
          <Image
            contentFit="contain"
            source={SPLASH_LOGO}
            style={{ height: 52, width: 180 }}
          />
          <View style={styles.emojiCircleLarge}>
            <Text style={styles.emojiLarge}>{content.emoji}</Text>
          </View>
          <View style={styles.textSection}>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.body}>{content.body}</Text>
          </View>
          {step === 2 ? (
            <View style={styles.xpCard}>
              <Text style={styles.xpLabel}>Örnek XP</Text>
              <Text style={styles.xpValue}>+{animatedXp} XP</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.dotsRow}>
          {[1, 2, 3].map((item) => (
            <View
              key={item}
              style={[
                styles.dot,
                step === item ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {step < 3 ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.primaryButton}
            onPress={() => setStep((current) => (current + 1) as Step)}
          >
            <Text style={styles.primaryButtonText}>Devam et</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonsColumn}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.primaryButton}
              onPress={() => void finishOnboarding('/catch/new')}
            >
              <Text style={styles.primaryButtonText}>İlk Avımı Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={styles.skipButton} onPress={() => void finishOnboarding('/(tabs)')}>
              <Text style={styles.skipText}>Atla</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const COLORS = {
  background: '#0B1622',
  surface: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',
  text: '#F8FAFC',
  textMuted: 'rgba(255,255,255,0.70)',
  textSubtle: 'rgba(255,255,255,0.45)',
  accent: '#7DD4E8',
  coral: '#FF6B6B',
  accentBg: 'rgba(125,212,232,0.10)',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 64,
  },
  topSection: {
    gap: 24,
    paddingTop: 40,
  },
  topContent: {
    gap: 40,
  },
  centerContent: {
    alignItems: 'center',
    gap: 24,
    paddingTop: 24,
  },
  emojiCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  emojiCircleLarge: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: COLORS.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 48,
  },
  emojiLarge: {
    fontSize: 64,
  },
  textSection: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.text,
  },
  body: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 26,
    color: COLORS.textMuted,
  },
  xpCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  xpLabel: {
    textAlign: 'center',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: COLORS.textSubtle,
  },
  xpValue: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '600',
    color: COLORS.coral,
  },
  bottomSection: {
    gap: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    borderRadius: 999,
  },
  dotActive: {
    width: 32,
    height: 10,
    backgroundColor: COLORS.accent,
  },
  dotInactive: {
    width: 10,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  buttonsColumn: {
    gap: 16,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.coral,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.accent,
  },
});

export default OnboardingScreen;
