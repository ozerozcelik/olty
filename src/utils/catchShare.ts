import { Share } from 'react-native';

interface CatchShareInput {
  catchId: string;
  sharedByUsername?: string | null;
  speciesName?: string | null;
}

const FISHGRAM_WEB_BASE_URL = 'https://olty.app';
const FISHGRAM_APP_BASE_URL = 'olty://';
const CATCH_LINK_PATTERN =
  /(?:https:\/\/olty\.app\/catch\/|olty:\/\/catch\/)([0-9a-fA-F-]+)/i;

export const buildCatchShareUrl = (catchId: string): string =>
  `${FISHGRAM_WEB_BASE_URL}/catch/${catchId}`;

export const buildCatchDeepLink = (catchId: string): string =>
  `${FISHGRAM_APP_BASE_URL}catch/${catchId}`;

export const buildCatchShareTitle = (speciesName?: string | null): string =>
  speciesName ? `${speciesName} avı` : 'Olty gönderisi';

export const buildCatchShareMessage = ({
  catchId,
  sharedByUsername,
  speciesName,
}: CatchShareInput): string => {
  const shareLabel = speciesName
    ? `Paylaşılan gönderi: ${speciesName}`
    : 'Paylaşılan gönderi';
  const usernameLabel = sharedByUsername ? `Paylaşan: @${sharedByUsername}` : null;

  return [shareLabel, usernameLabel, buildCatchShareUrl(catchId)]
    .filter(Boolean)
    .join('\n');
};

export const shareCatchExternally = async (
  input: CatchShareInput,
): Promise<void> => {
  const url = buildCatchShareUrl(input.catchId);

  await Share.share({
    title: buildCatchShareTitle(input.speciesName),
    message: buildCatchShareMessage(input),
    url,
  });
};

export const extractCatchShareId = (value: string): string | null => {
  const match = value.match(CATCH_LINK_PATTERN);
  return match?.[1] ?? null;
};

export const isCatchShareMessage = (value: string | null | undefined): boolean =>
  Boolean(value && extractCatchShareId(value));

export const getCatchSharePreviewText = (value: string): string => {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !CATCH_LINK_PATTERN.test(line));

  return lines[0] ?? 'Paylaşılan gönderi';
};
