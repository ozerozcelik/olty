export const FISHDEX_MILESTONES = [5, 10, 25, 50, 80] as const;

export const getFishCategoryLabel = (value: string | null | undefined): string => {
  switch (value) {
    case 'deniz':
      return 'Deniz';
    case 'tatlı_su':
      return 'Tatlı Su';
    case 'göç':
      return 'Goc';
    default:
      return 'Diger';
  }
};

export const getFishCategoryAccent = (value: string | null | undefined): string => {
  switch (value) {
    case 'deniz':
      return '#2F7A8A';
    case 'tatlı_su':
      return '#5A7E3A';
    case 'göç':
      return '#C97A3D';
    default:
      return '#7A8B8F';
  }
};

export const getFishdexNextMilestone = (
  discoveredSpecies: number,
  totalSpecies: number,
): { nextMilestone: number | null; remainingToNextMilestone: number | null } => {
  const nextMilestone = FISHDEX_MILESTONES.find((value) => value > discoveredSpecies) ?? null;

  if (nextMilestone) {
    return {
      nextMilestone,
      remainingToNextMilestone: nextMilestone - discoveredSpecies,
    };
  }

  if (discoveredSpecies < totalSpecies) {
    return {
      nextMilestone: totalSpecies,
      remainingToNextMilestone: totalSpecies - discoveredSpecies,
    };
  }

  return {
    nextMilestone: null,
    remainingToNextMilestone: null,
  };
};
