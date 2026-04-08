import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';

import { ProfileView } from '@/components/ProfileView';
import { getOrCreateConversation } from '@/services/messages.service';
import { getProfileByUsername, getProfileDetails } from '@/services/profiles.service';
import { followUser, isFollowing, unfollowUser } from '@/services/social.service';
import { SplashScreen } from '@/components/SplashScreen';
import { SPORT_THEME } from '@/lib/sport-theme';

const OtherProfileScreen = (): JSX.Element => {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ['profile-by-username', username],
    queryFn: () => getProfileByUsername(username),
    enabled: Boolean(username),
    retry: 2,
  });
  const detailsQuery = useQuery({
    queryKey: ['profile-details', profileQuery.data?.id],
    queryFn: () => getProfileDetails(profileQuery.data?.id ?? ''),
    enabled: Boolean(profileQuery.data?.id),
    retry: 2,
  });
  const followingQuery = useQuery({
    queryKey: ['is-following', profileQuery.data?.id],
    queryFn: () => isFollowing(profileQuery.data?.id ?? ''),
    enabled: Boolean(profileQuery.data?.id),
  });
  const followMutation = useMutation({ mutationFn: followUser });
  const unfollowMutation = useMutation({ mutationFn: unfollowUser });
  const messageMutation = useMutation({ mutationFn: getOrCreateConversation });

  // Error state
  if (profileQuery.isError || detailsQuery.isError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: SPORT_THEME.bg, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>😔</Text>
        <Text style={{ color: SPORT_THEME.text, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
          Profil bulunamadı
        </Text>
        <Text style={{ color: SPORT_THEME.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
          Bu kullanıcı mevcut değil veya bağlantı hatası oluştu.
        </Text>
      </View>
    );
  }

  if (!detailsQuery.data) {
    return <SplashScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: SPORT_THEME.bg }}>
      <ProfileView
        isFollowLoading={followMutation.isPending || unfollowMutation.isPending}
        isFollowing={followingQuery.data ?? false}
        isMessageLoading={messageMutation.isPending}
        isOwnProfile={false}
        onMessagePress={() => {
          void (async () => {
            try {
              const conversation = await messageMutation.mutateAsync(detailsQuery.data.id);
              router.push({
                pathname: '/messages/[conversationId]',
                params: { conversationId: conversation.id },
              });
            } catch (error) {
              Alert.alert('Uyari', error instanceof Error ? error.message : 'Mesaj acilamadi.');
            }
          })();
        }}
        onToggleFollow={() => {
          const targetUserId = detailsQuery.data.id;
          const currentValue = followingQuery.data ?? false;
          queryClient.setQueryData(['is-following', targetUserId], !currentValue);
          void (async () => {
            try {
              if (currentValue) {
                await unfollowMutation.mutateAsync(targetUserId);
              } else {
                await followMutation.mutateAsync(targetUserId);
              }
            } catch {
              queryClient.setQueryData(['is-following', targetUserId], currentValue);
            }
          })();
        }}
        profile={detailsQuery.data}
        statsUserId={detailsQuery.data.id}
      />
    </View>
  );
};

export default OtherProfileScreen;
