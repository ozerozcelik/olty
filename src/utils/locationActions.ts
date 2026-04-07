import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export const buildExternalLocationUrl = (
  latitude: number,
  longitude: number,
): string => `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

export const openLocationInMaps = async (
  latitude: number,
  longitude: number,
  label?: string | null,
): Promise<void> => {
  const encodedLabel = encodeURIComponent(label?.trim() || 'Konum');
  const appleMapsUrl = `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodedLabel}`;
  const geoUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`;
  const browserFallbackUrl = buildExternalLocationUrl(latitude, longitude);
  const primaryUrl = Platform.OS === 'ios' ? appleMapsUrl : geoUrl;
  const supportedPrimary = await Linking.canOpenURL(primaryUrl);

  if (supportedPrimary) {
    await Linking.openURL(primaryUrl);
    return;
  }

  await Linking.openURL(browserFallbackUrl);
};
