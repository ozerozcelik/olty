import PostHog from 'posthog-react-native';

import { publicEnv } from '@/lib/env';

let client: PostHog | null = null;

export const initAnalytics = (): void => {
  if (__DEV__) {
    return;
  }

  if (!publicEnv.posthogKey) {
    return;
  }

  client = new PostHog(publicEnv.posthogKey, {
    host: 'https://eu.posthog.com',
  });
};

export const track = (
  event: string,
  props?: Record<string, string | number | boolean>,
): void => {
  client?.capture(event, props);
};

export const trackScreen = (name: string): void => {
  client?.capture('$screen', { screen_name: name });
};
