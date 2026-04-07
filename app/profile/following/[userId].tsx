import { useLocalSearchParams } from 'expo-router';

import { UserListScreen } from '@/components/UserListScreen';

const FollowingScreen = (): JSX.Element => {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return <UserListScreen mode="following" userId={userId} />;
};

export default FollowingScreen;
