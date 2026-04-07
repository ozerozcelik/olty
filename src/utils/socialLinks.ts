import type { ProfileRow } from '@/types/app.types';

export const SOCIAL_LINK_FIELDS = [
  {
    key: 'instagram_url',
    label: 'Instagram',
    placeholder: '@kullanıcı veya instagram.com/kullanıcı',
  },
  {
    key: 'x_url',
    label: 'X',
    placeholder: '@kullanıcı veya x.com/kullanıcı',
  },
  {
    key: 'youtube_url',
    label: 'YouTube',
    placeholder: 'youtube.com/@kanal veya kanal linki',
  },
  {
    key: 'tiktok_url',
    label: 'TikTok',
    placeholder: '@kullanıcı veya tiktok.com/@kullanıcı',
  },
  {
    key: 'website_url',
    label: 'Website',
    placeholder: 'https://ornek.com',
  },
] as const;

export type SocialLinkField = (typeof SOCIAL_LINK_FIELDS)[number]['key'];

export const normalizeSocialLink = (
  value: string | undefined,
  field: SocialLinkField,
): string | null => {
  const trimmedValue = value?.trim() ?? '';

  if (!trimmedValue) {
    return null;
  }

  if (field === 'website_url') {
    if (/^https?:\/\//iu.test(trimmedValue)) {
      return trimmedValue;
    }

    return `https://${trimmedValue.replace(/^\/+/, '')}`;
  }

  const normalizedValue = trimmedValue
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?/iu, '')
    .replace(/\/+$/u, '');

  switch (field) {
    case 'instagram_url':
      return `https://instagram.com/${normalizedValue.replace(/^instagram\.com\//iu, '')}`;
    case 'x_url': {
      const username = normalizedValue.replace(/^(x|twitter)\.com\//iu, '');
      return `https://x.com/${username}`;
    }
    case 'youtube_url': {
      if (/^https?:\/\//iu.test(trimmedValue)) {
        return trimmedValue;
      }

      const channel = normalizedValue.replace(/^youtube\.com\//iu, '');
      return channel.startsWith('@')
        ? `https://youtube.com/${channel}`
        : `https://youtube.com/@${channel}`;
    }
    case 'tiktok_url': {
      const username = normalizedValue.replace(/^tiktok\.com\//iu, '').replace(/^@/, '');
      return `https://tiktok.com/@${username}`;
    }
    default:
      return trimmedValue;
  }
};

export const getProfileSocialLinks = (
  profile: Pick<
    ProfileRow,
    'instagram_url' | 'x_url' | 'youtube_url' | 'tiktok_url' | 'website_url'
  >,
): { key: SocialLinkField; label: string; url: string }[] =>
  SOCIAL_LINK_FIELDS.flatMap((field) => {
    const url = profile[field.key];

    if (!url) {
      return [];
    }

    return [{ key: field.key, label: field.label, url }];
  });
