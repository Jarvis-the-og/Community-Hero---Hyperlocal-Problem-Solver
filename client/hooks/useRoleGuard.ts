'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function useRoleGuard(...allowedRoles: string[]) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      router.replace('/');
    }
  }, [user, loading, allowedRoles, router]);

  return { user, loading, authorized: user ? allowedRoles.includes(user.role) : false };
}
