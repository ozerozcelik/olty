import {
  useQuery } from '@tanstack/react-query';
import { useMemo,
  useState } from 'react';
import { useRouter,
  type RelativePathString } from 'expo-router';
import { FlatList,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { TournamentCard } from '@/components/TournamentCard';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import {
  getTournaments,
  isFinishedTournament,
  isLiveTournament,
  isUpcomingTournament,
} from '@/services/tournaments.service';

type TournamentTab = 'active' | 'upcoming' | 'finished';

const TournamentListScreen = (): JSX.Element => {
  const router = useRouter();
  const isAdmin = useAdminGuard();
  const [tab, setTab] = useState<TournamentTab>('active');
  const activeQuery = useQuery({
    queryKey: ['tournaments', 'active'],
    queryFn: () => getTournaments('active'),
  });
  const finishedQuery = useQuery({
    queryKey: ['tournaments', 'finished'],
    queryFn: () => getTournaments('finished'),
  });

  const items = useMemo(() => {
    switch (tab) {
      case 'upcoming':
        return (activeQuery.data ?? []).filter(isUpcomingTournament);
      case 'finished':
        return (finishedQuery.data ?? []).filter(isFinishedTournament);
      default:
        return (activeQuery.data ?? []).filter(isLiveTournament);
    }
  }, [activeQuery.data, finishedQuery.data, tab]);

  return (
    <View className="flex-1 bg-main px-4 pt-4">
      <View className="mb-4 flex-row items-center justify-between gap-3">
        <View>
          <Text className="text-3xl font-semibold text-ink">Turnuvalar</Text>
          <Text className="mt-1 text-sm text-white/70">Balıkçılık etkinliklerini takip et</Text>
        </View>
        {isAdmin ? (
          <TouchableOpacity
            activeOpacity={0.8}
            className="rounded-full bg-coral px-4 py-3"
            onPress={() => router.push('./new' as RelativePathString)}
          >
            <Text className="font-semibold text-white">Yeni</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="mb-4 flex-row rounded-full border border-white/10 bg-white/10 p-1">
        {[
          { key: 'active', label: 'Aktif' },
          { key: 'upcoming', label: 'Yaklaşan' },
          { key: 'finished', label: 'Bitti' },
        ].map((item) => (
          <TouchableOpacity activeOpacity={0.8}
            className={`flex-1 rounded-full px-4 py-3 ${tab === item.key ? 'bg-sea' : ''}`}
            key={item.key}
            onPress={() => setTab(item.key as TournamentTab)}
          >
            <Text className={`text-center font-semibold ${tab === item.key ? 'text-white' : 'text-ink'}`}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        contentContainerStyle={
          items.length
            ? { gap: 16, paddingBottom: 32 }
            : { flexGrow: 1, justifyContent: 'center' }
        }
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TournamentCard
            item={item}
            onPress={() => router.push(`./${item.id}` as RelativePathString)}
          />
        )}
        ListEmptyComponent={
          <Text className="text-center text-base text-white/70">Turnuva bulunamadı</Text>
        }
      />
    </View>
  );
};

export default TournamentListScreen;
