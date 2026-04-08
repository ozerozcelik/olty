import {
  useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Image,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { GlassView } from '@/components/GlassView';
import {
  getChallengeLeaderboard,
  getCurrentChallenge,
  hasUserEnteredChallenge,
} from '@/services/weeklyChallenges.service';
import { useAuthStore } from '@/stores/useAuthStore';

const getDaysRemaining = (endsAt: string): number => {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000));
};

const getChallengeProgress = (weekStart: string, endsAt: string): number => {
  const start = new Date(weekStart).getTime();
  const end = new Date(endsAt).getTime();
  const now = Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  return Math.min(1, Math.max(0, (now - start) / (end - start)));
};

export const WeeklyChallengeCard = (): JSX.Element | null => {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const challengeQuery = useQuery({
    queryKey: ['weekly-challenge'],
    queryFn: getCurrentChallenge,
  });
  const leaderboardQuery = useQuery({
    queryKey: ['weekly-challenge-leaderboard', challengeQuery.data?.id],
    queryFn: () => getChallengeLeaderboard(challengeQuery.data?.id ?? ''),
    enabled: Boolean(challengeQuery.data?.id),
  });
  const enteredQuery = useQuery({
    queryKey: ['weekly-challenge-entered', challengeQuery.data?.id],
    queryFn: () => hasUserEnteredChallenge(challengeQuery.data?.id ?? ''),
    enabled: Boolean(challengeQuery.data?.id),
  });

  if (!challengeQuery.data && !challengeQuery.isLoading) {
    return null;
  }

  if (challengeQuery.isLoading || !challengeQuery.data) {
    return (
      <GlassView borderRadius={28} intensity={18} style={{ marginBottom: 16, paddingHorizontal: 16, paddingVertical: 20 }}>
        <View className="h-5 w-40 rounded-full bg-white/10" />
        <View className="mt-4 h-16 w-full rounded-2xl bg-white/5" />
      </GlassView>
    );
  }

  const challenge = challengeQuery.data;
  const leaders = (leaderboardQuery.data ?? []).slice(0, 3);
  const ownEntry = (leaderboardQuery.data ?? []).find((item) => item.user_id === profile?.id);
  const challengeProgress = getChallengeProgress(challenge.week_start, challenge.ends_at);

  return (
    <GlassView borderRadius={28} intensity={18} style={{ marginBottom: 16, paddingHorizontal: 16, paddingVertical: 20 }}>
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-lg font-semibold text-[#F0F7F9]">🏆 Haftalık Meydan Okuma</Text>
        <Text className="text-sm font-medium text-sea">{getDaysRemaining(challenge.ends_at)} gün kaldı</Text>
      </View>
      <Text className="mt-4 text-xl font-semibold text-[#F0F7F9]">{challenge.title_tr}</Text>
      <Text className="mt-2 text-sm leading-6 text-[rgba(240,247,249,0.65)]">{challenge.description_tr}</Text>
      <View className="mt-4 h-2.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.10)]">
        <View className="h-full rounded-full bg-[#D4FF00]" style={{ width: `${Math.max(challengeProgress * 100, 8)}%` }} />
      </View>
      <View className="mt-4 flex-row items-center gap-2">
        {leaders.map((leader) => (
          <View className="flex-row items-center gap-2" key={`${leader.id}-${leader.user_id}`}>
            <Image
              resizeMode="cover"
              source={leader.profiles?.avatar_url ? { uri: leader.profiles.avatar_url } : undefined}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#0F2C35' }}
            />
            <Text className="text-sm font-medium text-[#F0F7F9]">@{leader.profiles?.username ?? 'oyuncu'}</Text>
          </View>
        ))}
      </View>
      {enteredQuery.data && ownEntry ? (
        <View className="mt-4 rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.07)] px-4 py-3">
          <Text className="text-sm font-semibold text-sea">Sıralaman: #{ownEntry.rank ?? '-'}</Text>
          <Text className="mt-1 text-sm text-[rgba(240,247,249,0.65)]">Skorun: {ownEntry.value ?? 0}</Text>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.8}
          className="mt-4 self-start rounded-full bg-coral px-5 py-3"
          onPress={() => router.push(`/catch/new?challengeId=${challenge.id}`)}
        >
          <Text className="text-sm font-semibold text-white">Katıl</Text>
        </TouchableOpacity>
      )}
    </GlassView>
  );
};
