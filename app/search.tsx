import {
  Ionicons } from '@expo/vector-icons';
import { useMutation,
  useQuery } from '@tanstack/react-query';
import { useLocalSearchParams,
  useRouter } from 'expo-router';
import { useEffect,
  useMemo,
  useState } from 'react';
import {
  FlatList,
  Image,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { useDebounce } from '@/hooks/useDebounce';
import { searchCatches, searchUsers } from '@/services/search.service';
import {
  followUser,
  getFollowingUserIds,
  unfollowUser,
} from '@/services/social.service';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CatchFeedItem, ProfileRow } from '@/types/app.types';
import { formatDate } from '@/utils/date';
import { getHashtagSearchTerm } from '@/utils/hashtags';

type SearchTab = 'users' | 'catches';

const SearchScreen = (): JSX.Element => {
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string | string[]; tab?: string | string[] }>();
  const ownProfile = useAuthStore((state) => state.profile);
  const initialQuery = Array.isArray(params.query) ? params.query[0] ?? '' : params.query ?? '';
  const initialTabParam = Array.isArray(params.tab) ? params.tab[0] ?? '' : params.tab ?? '';
  const initialTab: SearchTab =
    initialTabParam === 'users' || initialTabParam === 'catches'
      ? initialTabParam
      : getHashtagSearchTerm(initialQuery)
        ? 'catches'
        : 'users';
  const [activeTab, setActiveTab] = useState<SearchTab>(initialTab);
  const [searchValue, setSearchValue] = useState<string>(initialQuery);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set<string>());
  const debouncedSearch = useDebounce(searchValue, 350);
  const usersQuery = useQuery({
    queryKey: ['global-search-users', debouncedSearch],
    queryFn: () => searchUsers(debouncedSearch),
    enabled: activeTab === 'users' && Boolean(debouncedSearch.trim()),
  });
  const catchesQuery = useQuery({
    queryKey: ['global-search-catches', debouncedSearch],
    queryFn: () => searchCatches(debouncedSearch),
    enabled: activeTab === 'catches' && Boolean(debouncedSearch.trim()),
  });
  const followingQuery = useQuery({
    queryKey: ['global-search-following', usersQuery.data?.map((item) => item.id).join(',')],
    queryFn: async () => {
      return getFollowingUserIds((usersQuery.data ?? []).map((item) => item.id));
    },
    enabled: activeTab === 'users' && Boolean(usersQuery.data?.length),
  });
  const followMutation = useMutation({ mutationFn: followUser });
  const unfollowMutation = useMutation({ mutationFn: unfollowUser });

  useEffect(() => {
    setFollowingIds(followingQuery.data ?? new Set<string>());
  }, [followingQuery.data]);

  useEffect(() => {
    const nextQuery = Array.isArray(params.query) ? params.query[0] ?? '' : params.query ?? '';

    if (nextQuery !== searchValue) {
      setSearchValue(nextQuery);
    }
  }, [params.query, searchValue]);

  useEffect(() => {
    const nextTabParam = Array.isArray(params.tab) ? params.tab[0] ?? '' : params.tab ?? '';
    const nextTab: SearchTab =
      nextTabParam === 'users' || nextTabParam === 'catches'
        ? nextTabParam
        : getHashtagSearchTerm(params.query)
          ? 'catches'
          : 'users';

    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, params.query, params.tab]);

  const users = usersQuery.data ?? [];
  const catches = catchesQuery.data ?? [];
  const isEmptyQuery = !debouncedSearch.trim();

  const resultsSummary = useMemo((): string => {
    if (activeTab === 'users') {
      return `${users.length} kullanıcı bulundu`;
    }

    return `${catches.length} av bulundu`;
  }, [activeTab, catches.length, users.length]);

  const handleToggleFollow = async (profile: ProfileRow): Promise<void> => {
    const wasFollowing = followingIds.has(profile.id);
    const nextSet = new Set(followingIds);

    if (wasFollowing) {
      nextSet.delete(profile.id);
    } else {
      nextSet.add(profile.id);
    }

    setFollowingIds(nextSet);

    try {
      if (wasFollowing) {
        await unfollowMutation.mutateAsync(profile.id);
      } else {
        await followMutation.mutateAsync(profile.id);
      }
    } catch {
      setFollowingIds(followingIds);
    }
  };

  const renderUser = ({ item }: { item: ProfileRow }): JSX.Element => {
    const isOwnProfile = item.id === ownProfile?.id;
    const isFollowing = followingIds.has(item.id);

    return (
      <View className="flex-row items-center gap-3 rounded-[24px] border border-white/10 bg-white/10 px-4 py-4">
        <TouchableOpacity
          activeOpacity={0.8}
          className="flex-1 flex-row items-center gap-3"
          onPress={() => router.push(`/(tabs)/profile/${item.username}`)}
        >
          <Image
            resizeMode="cover"
            source={item.avatar_url ? { uri: item.avatar_url } : undefined}
            style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.10)' }}
          />
          <View className="flex-1 gap-1">
            <Text className="text-base font-semibold text-ink">@{item.username}</Text>
            <Text className="text-sm text-white/70">
              {item.display_name ?? 'Balıkçı'} • Seviye {item.level}
            </Text>
            <Text className="text-xs text-white/45">{item.catch_count} av kaydı</Text>
          </View>
        </TouchableOpacity>

        {isOwnProfile ? null : (
          <TouchableOpacity
            activeOpacity={0.8}
            className={`rounded-full px-4 py-2 ${isFollowing ? 'border border-white/10 bg-white/10' : 'bg-sea'}`}
            disabled={followMutation.isPending || unfollowMutation.isPending}
            onPress={() => void handleToggleFollow(item)}
          >
            <Text className={`text-sm font-semibold ${isFollowing ? 'text-white' : 'text-sand'}`}>
              {isFollowing ? 'Takipte' : 'Takip Et'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderCatch = ({ item }: { item: CatchFeedItem }): JSX.Element => {
    const speciesName = item.fish_species?.name_tr ?? item.species_custom ?? 'Tür belirtilmedi';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        className="flex-row gap-3 rounded-[24px] border border-white/10 bg-white/10 p-3"
        onPress={() => router.push(`/catch/${item.id}`)}
      >
        <View className="h-24 w-24 overflow-hidden rounded-[20px] bg-white/10">
          {item.photo_url ? (
            <Image
              resizeMode="cover"
              source={{ uri: item.photo_url }}
              style={{ width: 96, height: 96 }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons color="#D4FF00" name="image-outline" size={24} />
            </View>
          )}
        </View>
        <View className="flex-1 justify-center gap-1">
          <Text className="text-base font-semibold text-ink">{speciesName}</Text>
          <Text className="text-sm text-white/70">{item.location_name ?? 'Konum belirtilmedi'}</Text>
          <Text className="text-xs text-white/45">{formatDate(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-main px-4 pt-4">
      <View className="mb-4 flex-row items-center gap-3">
        <TouchableOpacity
          activeOpacity={0.8}
          className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10"
          onPress={() => router.back()}
        >
          <Ionicons color="#F0F7F9" name="arrow-back" size={20} />
        </TouchableOpacity>
        <Text className="flex-1 text-3xl font-semibold text-ink">Ara</Text>
      </View>

      <TextInput
        autoCapitalize="none"
        className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 text-base text-ink"
        onChangeText={setSearchValue}
        placeholder={activeTab === 'users' ? 'Kullanıcı ara' : 'Hashtag, tür, konum veya not ara'}
        placeholderTextColor="#8A958D"
        value={searchValue}
      />

      <View className="mb-4 mt-4 flex-row rounded-full border border-white/10 bg-white/10 p-1">
        <TouchableOpacity
          activeOpacity={0.8}
          className={`flex-1 rounded-full px-4 py-3 ${activeTab === 'users' ? 'bg-sea' : ''}`}
          onPress={() => setActiveTab('users')}
        >
          <Text className={`text-center font-semibold ${activeTab === 'users' ? 'text-sand' : 'text-white/70'}`}>
            Kullanıcılar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          className={`flex-1 rounded-full px-4 py-3 ${activeTab === 'catches' ? 'bg-sea' : ''}`}
          onPress={() => setActiveTab('catches')}
        >
          <Text className={`text-center font-semibold ${activeTab === 'catches' ? 'text-sand' : 'text-white/70'}`}>
            Avlar
          </Text>
        </TouchableOpacity>
      </View>

      {isEmptyQuery ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons color="#D4FF00" name="search-outline" size={36} />
          <Text className="mt-4 text-center text-base leading-7 text-white/70">
            Kullanıcı, hashtag, tür, konum veya not arayarak sonuçları burada görebilirsin.
          </Text>
        </View>
      ) : (
        <>
          <Text className="mb-3 text-sm text-white/70">{resultsSummary}</Text>
          {activeTab === 'users' ? (
            <FlatList
              contentContainerStyle={
                users.length
                  ? { gap: 12, paddingBottom: 32 }
                  : { flexGrow: 1, justifyContent: 'center' }
              }
              data={users}
              key="users"
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text className="text-center text-base text-white/70">Sonuç bulunamadı</Text>
              }
              renderItem={renderUser}
            />
          ) : (
            <FlatList
              contentContainerStyle={
                catches.length
                  ? { gap: 12, paddingBottom: 32 }
                  : { flexGrow: 1, justifyContent: 'center' }
              }
              data={catches}
              key="catches"
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text className="text-center text-base text-white/70">Sonuç bulunamadı</Text>
              }
              renderItem={renderCatch}
            />
          )}
        </>
      )}
    </View>
  );
};

export default SearchScreen;
