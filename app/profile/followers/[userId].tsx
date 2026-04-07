import { useLocalSearchParams } from 'expo-router';

import { UserListScreen } from '@/components/UserListScreen';

const FollowersScreen = (): JSX.Element => {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return <UserListScreen mode="followers" userId={userId} />;
};

export default FollowersScreen;
