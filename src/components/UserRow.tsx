import {
  useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect,
  useState } from 'react';
import { Image,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/TouchableOpacity';

import { LEVELS } from '@/lib/constants';
import { followUser, unfollowUser } from '@/services/social.service';
import type { ProfileRow } from '@/types/app.types';

interface UserRowProps {
  profile: ProfileRow;
  showFollowButton?: boolean;
  isFollowing?: boolean;
  onFollowToggle?: (userId: string, nowFollowing: boolean) => void;
}

const getLevelMeta = (level: number) => {
  return LEVELS.find((item) => item.level === level) ?? LEVELS[0];
};

const getLevelDotClassName = (level: number): string => {
  switch (level) {
    case 2:
      return 'bg-[#43A047]';
    case 3:
      return 'bg-[#1E88E5]';
    case 4:
      return 'bg-[#8E24AA]';
    case 5:
      return 'bg-[#F4511E]';
    default:
      return 'bg-[#78909C]';
  }
};

export const UserRow = ({
  profile,
  showFollowButton = true,
  isFollowing = false,
  onFollowToggle,
}: UserRowProps): JSX.Element => {
  const router = useRouter();
  const levelMeta = getLevelMeta(profile.level);
  const [following, setFollowing] = useState<boolean>(isFollowing);
  const followMutation = useMutation({ mutationFn: followUser });
  const unfollowMutation = useMutation({ mutationFn: unfollowUser });

  useEffect(() => {
    setFollowing(isFollowing);
  }, [isFollowing]);

  const handleToggleFollow = async (): Promise<void> => {
    const nextFollowing = !following;
    setFollowing(nextFollowing);

    try {
      if (following) {
        await unfollowMutation.mutateAsync(profile.id);
      } else {
        await followMutation.mutateAsync(profile.id);
      }

      onFollowToggle?.(profile.id, nextFollowing);
    } catch {
      setFollowing(following);
    }
  };

  return (
    <View className="flex-row items-center gap-3 rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.07)] px-4 py-4">
      <TouchableOpacity activeOpacity={0.8}
        className="flex-1 flex-row items-center gap-3"
        onPress={() => router.push(`/(tabs)/profile/${profile.username}`)}
      >
        <Image
          resizeMode="cover"
          source={profile.avatar_url ? { uri: profile.avatar_url } : undefined}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#0F2C35' }}
        />
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-[#F0F7F9]">@{profile.username}</Text>
          <Text className="text-sm text-[rgba(240,247,249,0.65)]">{profile.display_name ?? 'Balıkçı'}</Text>
        </View>
      </TouchableOpacity>

      <View className="mr-2 flex-row items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
        <View className={`h-2.5 w-2.5 rounded-full ${getLevelDotClassName(profile.level)}`} />
        <Text className="text-xs font-semibold text-white">{levelMeta.name}</Text>
      </View>

      {!showFollowButton ? null : (
        <TouchableOpacity
          activeOpacity={0.8}
          className={`rounded-full px-4 py-2 ${following ? 'border border-white/10 bg-[rgba(255,255,255,0.07)]' : 'bg-coral'}`}
          disabled={followMutation.isPending || unfollowMutation.isPending}
          onPress={() => void handleToggleFollow()}
        >
          <Text className={`text-sm font-semibold ${following ? 'text-[rgba(240,247,249,0.65)]' : 'text-white'}`}>
            {following ? 'Takipten Cik' : 'Takip Et'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
