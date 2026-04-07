import { formatDate } from '@/utils/date';

export const getTournamentScoringLabel = (value: string): string => {
  switch (value) {
    case 'weight':
      return 'Ağırlık';
    case 'count':
      return 'Adet';
    default:
      return 'Boy';
  }
};

export const formatTournamentDateRange = (
  startsAt: string,
  endsAt: string,
): string => {
  return `${formatDate(startsAt)} - ${formatDate(endsAt)}`;
};
