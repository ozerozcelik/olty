import type { PostType } from '@/types/app.types';

export const POST_TYPE_OPTIONS: { label: string; value: 'all' | PostType }[] = [
  { label: 'Tümü', value: 'all' },
  { label: 'Taktik', value: 'tip' },
  { label: 'Hikaye', value: 'story' },
  { label: 'Ekipman', value: 'gear_review' },
  { label: 'Spot Rehberi', value: 'spot_guide' },
];

export const getPostTypeLabel = (type: PostType): string => {
  switch (type) {
    case 'story':
      return 'Hikaye';
    case 'gear_review':
      return 'Ekipman İncelemesi';
    case 'spot_guide':
      return 'Spot Rehberi';
    default:
      return 'Taktik';
  }
};

export const getPostTypeShortLabel = (type: PostType): string => {
  switch (type) {
    case 'story':
      return 'Hikaye';
    case 'gear_review':
      return 'Ekipman';
    case 'spot_guide':
      return 'Spot';
    default:
      return 'Taktik';
  }
};

export const getPostTypeEmoji = (type: PostType): string => {
  switch (type) {
    case 'story':
      return '📖';
    case 'gear_review':
      return '🛠️';
    case 'spot_guide':
      return '📍';
    default:
      return '🎣';
  }
};

export const getPostTypeColors = (type: PostType): { background: string; border: string; text: string } => {
  switch (type) {
    case 'story':
      return {
        background: 'rgba(59,130,246,0.16)',
        border: 'rgba(59,130,246,0.28)',
        text: '#60A5FA',
      };
    case 'gear_review':
      return {
        background: 'rgba(245,158,11,0.16)',
        border: 'rgba(245,158,11,0.3)',
        text: '#FBBF24',
      };
    case 'spot_guide':
      return {
        background: 'rgba(34,197,94,0.14)',
        border: 'rgba(34,197,94,0.24)',
        text: '#4ADE80',
      };
    default:
      return {
        background: 'rgba(0,208,132,0.14)',
        border: 'rgba(0,208,132,0.26)',
        text: '#00D084',
      };
  }
};
