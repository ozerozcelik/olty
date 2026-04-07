import * as Sentry from '@sentry/react-native';

import { publicEnv } from '@/lib/env';

export const initSentry = (): void => {
  if (__DEV__) {
    return;
  }

  if (!publicEnv.sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: publicEnv.sentryDsn,
    tracesSampleRate: 0.2,
    environment: 'production',
  });
};

export const captureError = (
  error: unknown,
  context?: Record<string, unknown>,
): void => {
  if (__DEV__) {
    console.error(error);
    return;
  }

  Sentry.captureException(error, { extra: context });
};
