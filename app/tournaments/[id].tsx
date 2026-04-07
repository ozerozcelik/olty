import {
  Image } from 'expo-image';
import { useMutation,
  useQuery,
  useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams,
  useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { TournamentCatchPickerModal } from '@/components/TournamentCatchPickerModal';
import { TournamentLeaderboardRow } from '@/components/TournamentLeaderboardRow';
import {
  getTournamentById,
  getTournamentCatchCandidates,
  getTournamentLeaderboard,
  isLiveTournament,
  joinTournament,
  leaveTournament,
  submitCatchToTournament,
} from '@/services/tournaments.service';
import { formatTournamentDateRange, getTournamentScoringLabel } from '@/utils/tournaments';

const TournamentDetailScreen = (): JSX.Element => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard'>('overview');
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const tournamentQuery = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => getTournamentById(id),
    enabled: Boolean(id),
  });
  const leaderboardQuery = useQuery({
    queryKey: ['tournament-leaderboard', id],
    queryFn: () => getTournamentLeaderboard(id),
    enabled: Boolean(id),
  });
  const catchCandidatesQuery = useQuery({
    queryKey: ['tournament-catches', id],
    queryFn: () => getTournamentCatchCandidates(id),
    enabled: Boolean(id) && pickerVisible,
  });
  const joinMutation = useMutation({
    mutationFn: joinTournament,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tournament', id] }),
        queryClient.invalidateQueries({ queryKey: ['tournaments'] }),
      ]);
    },
  });
  const leaveMutation = useMutation({
    mutationFn: leaveTournament,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tournament', id] }),
        queryClient.invalidateQueries({ queryKey: ['tournaments'] }),
      ]);
    },
  });
  const submitMutation = useMutation({
    mutationFn: (catchId: string) => submitCatchToTournament(id, catchId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tournament', id] }),
        queryClient.invalidateQueries({ queryKey: ['tournament-leaderboard', id] }),
        queryClient.invalidateQueries({ queryKey: ['tournament-catches', id] }),
      ]);
    },
  });

  if (!tournamentQuery.data) {
    return <View className="flex-1 bg-sand" />;
  }

  const tournament = tournamentQuery.data;

  return (
    <View className="flex-1 bg-sand">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="relative">
          {tournament.cover_image_url ? (
            <Image
              contentFit="cover"
              source={{ uri: tournament.cover_image_url }}
              style={{ width: '100%', height: 240, backgroundColor: '#DDE6E2' }}
            />
          ) : (
            <View className="h-56 items-center justify-center bg-[#0F2C35]">
              <Text className="text-2xl font-semibold text-sea">{tournament.title}</Text>
            </View>
          )}
          <TouchableOpacity activeOpacity={0.8}
            className="absolute left-4 top-12 rounded-full border border-white/10 bg-sand/90 p-3"
            onPress={() => router.back()}
          >
            <Text className="font-semibold text-ink">Geri</Text>
          </TouchableOpacity>
        </View>

        <View className="gap-4 px-4 pt-4">
          <View className="rounded-[28px] border border-white/10 bg-white/10 p-5">
            <Text className="text-2xl font-semibold text-ink">{tournament.title}</Text>
            {tournament.description ? (
              <Text className="mt-3 text-sm leading-6 text-white/70">{tournament.description}</Text>
            ) : null}
            <Text className="mt-3 text-sm text-white/70">
              {formatTournamentDateRange(tournament.starts_at, tournament.ends_at)}
            </Text>
            <View className="mt-4 flex-row flex-wrap gap-2">
              {tournament.city ? (
                <View className="rounded-full bg-white/5 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-ink">{tournament.city}</Text>
                </View>
              ) : null}
              <View className="rounded-full bg-sea/10 px-3 py-1.5">
                <Text className="text-xs font-semibold text-sea">
                  {getTournamentScoringLabel(tournament.scoring_type)}
                </Text>
              </View>
              <View className="rounded-full bg-coral/15 px-3 py-1.5">
                <Text className="text-xs font-semibold text-coral">
                  {tournament.participantCount} katilimci
                </Text>
              </View>
            </View>
            {tournament.prize_description ? (
              <View className="mt-4 rounded-2xl bg-coral/15 px-4 py-4">
                <Text className="text-sm font-semibold text-coral">Odul</Text>
                <Text className="mt-1 text-sm text-white/70">{tournament.prize_description}</Text>
              </View>
            ) : null}
            <View className="mt-4 flex-row gap-3">
              {tournament.isJoined ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="flex-1 items-center rounded-2xl border border-white/10 bg-white/10 px-4 py-4"
                  onPress={() => void leaveMutation.mutateAsync(id)}
                >
                  <Text className="font-semibold text-ink">Ayril</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="flex-1 items-center rounded-2xl bg-sea px-4 py-4"
                  onPress={() => void joinMutation.mutateAsync(id)}
                >
                  <Text className="font-semibold text-white">Katil</Text>
                </TouchableOpacity>
              )}
              {tournament.canSubmitCatch ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  className="flex-1 items-center rounded-2xl bg-coral px-4 py-4"
                  onPress={() => setPickerVisible(true)}
                >
                  <Text className="font-semibold text-white">Av Gönder</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {!isLiveTournament(tournament) ? (
              <Text className="mt-3 text-sm text-white/70">
                Av gonderimi sadece aktif turnuva suresinde acilir.
              </Text>
            ) : null}
          </View>

          <View className="flex-row rounded-full border border-white/10 bg-white/10 p-1">
            <TouchableOpacity activeOpacity={0.8}
              className={`flex-1 rounded-full px-4 py-3 ${activeTab === 'overview' ? 'bg-sea' : ''}`}
              onPress={() => setActiveTab('overview')}
            >
              <Text className={`text-center font-semibold ${activeTab === 'overview' ? 'text-white' : 'text-ink'}`}>
                Genel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8}
              className={`flex-1 rounded-full px-4 py-3 ${activeTab === 'leaderboard' ? 'bg-sea' : ''}`}
              onPress={() => setActiveTab('leaderboard')}
            >
              <Text className={`text-center font-semibold ${activeTab === 'leaderboard' ? 'text-white' : 'text-ink'}`}>
                Liderlik
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'overview' ? (
            <View className="rounded-[28px] border border-white/10 bg-white/10 p-5">
              <Text className="text-lg font-semibold text-ink">Organizator</Text>
              <Text className="mt-2 text-sm text-white/70">
                @{tournament.creator?.username ?? 'bilinmeyen'}
              </Text>
              {tournament.fishing_type ? (
                <>
                  <Text className="mt-4 text-lg font-semibold text-ink">Av tarzi</Text>
                  <Text className="mt-2 text-sm text-white/70">{tournament.fishing_type}</Text>
                </>
              ) : null}
            </View>
          ) : (
            <View className="gap-3">
              {(leaderboardQuery.data ?? []).length ? (
                (leaderboardQuery.data ?? []).map((item) => (
                  <TournamentLeaderboardRow item={item} key={item.userId} />
                ))
              ) : (
                <View className="rounded-[28px] border border-white/10 bg-white/10 p-5">
                  <Text className="text-center text-sm text-white/70">Henüz skor yok</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <TournamentCatchPickerModal
        catches={catchCandidatesQuery.data ?? []}
        onClose={() => setPickerVisible(false)}
        onSelect={(catchId) => void submitMutation.mutateAsync(catchId)}
        visible={pickerVisible}
      />
    </View>
  );
};

export default TournamentDetailScreen;
