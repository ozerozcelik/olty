import { useAuthStore } from '@/stores/useAuthStore';

export const useAdminGuard = (): boolean => {
  const profile = useAuthStore((state) => state.profile);
  return profile?.is_admin === true;
};
