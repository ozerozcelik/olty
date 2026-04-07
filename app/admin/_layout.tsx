import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAdminGuard } from '@/hooks/useAdminGuard';

const AdminLayout = (): JSX.Element => {
  const router = useRouter();
  const isAdmin = useAdminGuard();

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/(tabs)');
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return <></>;
  }

  return <Stack />;
};

export default AdminLayout;
