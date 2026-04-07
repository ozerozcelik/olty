import type { ReactNode } from 'react';

import { useAdminGuard } from '@/hooks/useAdminGuard';

interface AdminOnlyProps {
  children: ReactNode;
}

export const AdminOnly = ({ children }: AdminOnlyProps): JSX.Element | null => {
  const isAdmin = useAdminGuard();

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
};
