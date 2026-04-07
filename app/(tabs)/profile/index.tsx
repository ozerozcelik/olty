import { useRouter, type RelativePathString } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { ProfileView } from '@/components/ProfileView';
import { SkeletonProfileHeader, SkeletonFeed } from '@/components/Skeleton';
import { signOut } from '@/services/auth.service';
import { getProfileDetails } from '@/services/profiles.service';
import { useAuthStore } from '@/stores/useAuthStore';

const COLORS = {
  textPrimary: '#EAF4F4',
  textSecondary: '#9DB5B5',
  water: '#2EC4B6',
};

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
      <View className="flex-1 items-center justify-center bg-sand px-6">
        <Text style={{ fontSize: 48, marginBottom: 16 }}>😔</Text>
        <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
          Profil yüklenemedi
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
          Lütfen internet bağlantını kontrol et ve tekrar dene.
        </Text>
      </View>
    );
  }

  // Loading state
  if (!query.data) {
    return (
      <View className="flex-1 bg-sand p-4">
        <SkeletonProfileHeader />
        <View className="mt-6">
          <SkeletonFeed count={2} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
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

export default OwnProfileScreen;
