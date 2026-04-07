import * as Linking from 'expo-linking';
import { router } from 'expo-router';

export const handleDeepLink = (url: string): void => {
  const parsed = Linking.parse(url);
  const path = parsed.path ?? '';
  const segments = path.split('/').filter(Boolean);

  if (segments[0] === 'catch' && segments[1]) {
    router.push(`/catch/${segments[1]}`);
    return;
  }

  if (segments[0] === 'profile' && segments[1]) {
    router.push(`/(tabs)/profile/${segments[1]}`);
    return;
  }

  if (segments[0] === 'challenge' && segments[1]) {
    router.push(`/(tabs)?highlightChallenge=${segments[1]}`);
    return;
  }

  if (segments[0] === 'daily') {
    router.push('/(tabs)?scrollTo=daily');
    return;
  }

  router.push('/(tabs)');
};
