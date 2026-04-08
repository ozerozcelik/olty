import { useRouter, type RelativePathString } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { ProfileView } from '@/components/ProfileView';
import { SkeletonProfileHeader, SkeletonFeed } from '@/components/Skeleton';
import { SPORT_THEME } from '@/lib/sport-theme';
import { signOut } from '@/services/auth.service';
import { getProfileDetails } from '@/services/profiles.service';
import { useAuthStore } from '@/stores/useAuthStore';

const OwnProfileScreen = (): JSX.Element => {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const query = useQuery({
    queryKey: ['profile-details', profile?.id],
    queryFn: () => getProfileDetails(profile?.id ?? ''),
    enabled: Boolean(profile?.id),
    retry: 2,
  });

  // Error state
  if (query.isError) {
    return (
      <View style={styles.centeredState}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>😔</Text>
        <Text style={{ color: SPORT_THEME.text, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
          Profil yüklenemedi
        </Text>
        <Text style={{ color: SPORT_THEME.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
          Lütfen internet bağlantını kontrol et ve tekrar dene.
        </Text>
      </View>
    );
  }

  // Loading state
  if (!query.data) {
    return (
      <View style={styles.loadingState}>
        <SkeletonProfileHeader />
        <View className="mt-6">
          <SkeletonFeed count={2} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ProfileView
        isOwnProfile
        onOpenMessages={() => router.push('/messages' as RelativePathString)}
        onSignOut={() => {
          void (async () => {
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch {
              // Sign out error - session may already be invalid
              router.replace('/(auth)/login');
            }
          })();
        }}
        profile={query.data}
        statsUserId={query.data.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPORT_THEME.bg,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: SPORT_THEME.bg,
  },
  loadingState: {
    flex: 1,
    padding: 16,
    backgroundColor: SPORT_THEME.bg,
  },
});

export default OwnProfileScreen;
