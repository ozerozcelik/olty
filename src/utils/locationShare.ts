import { Share } from 'react-native';

interface LocationShareInput {
  locationId: string;
  locationName: string;
  sharedByUsername?: string | null;
}

const OLTY_WEB_BASE_URL = 'https://olty.app';
const OLTY_APP_BASE_URL = 'olty://';
const LOCATION_LINK_PATTERN =
  /(?:https:\/\/olty\.app\/locations\/|olty:\/\/locations\/)([0-9a-fA-F-]+)/i;

export const buildLocationShareUrl = (locationId: string): string =>
  `${OLTY_WEB_BASE_URL}/locations/${locationId}`;

export const buildLocationDeepLink = (locationId: string): string =>
  `${OLTY_APP_BASE_URL}locations/${locationId}`;

export const buildLocationShareMessage = ({
  locationId,
  locationName,
  sharedByUsername,
}: LocationShareInput): string => {
  const usernameLabel = sharedByUsername ? `Paylaşan: @${sharedByUsername}` : null;

  return [
    `Paylaşılan yer imi: ${locationName}`,
    usernameLabel,
    buildLocationShareUrl(locationId),
  ]
    .filter(Boolean)
    .join('\n');
};

export const shareLocationExternally = async (
  input: LocationShareInput,
): Promise<void> => {
  const url = buildLocationShareUrl(input.locationId);

  await Share.share({
    title: input.locationName,
    message: buildLocationShareMessage(input),
    url,
  });
};

export const extractLocationShareId = (value: string): string | null => {
  const match = value.match(LOCATION_LINK_PATTERN);
  return match?.[1] ?? null;
};

export const isLocationShareMessage = (value: string | null | undefined): boolean =>
  Boolean(value && extractLocationShareId(value));

export const getLocationSharePreviewText = (value: string): string => {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !LOCATION_LINK_PATTERN.test(line));

  return lines[0] ?? 'Paylaşılan yer imi';
};
