'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function useRoleGuard(...allowedRoles: string[]) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const requiredRole = allowedRoles.join(', ');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/auth?next=${encodeURIComponent(pathname || '/')}`);
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      router.replace(
        `/unauthorized?current=${encodeURIComponent(user.role)}&required=${encodeURIComponent(requiredRole)}`
      );
    }
  }, [user, loading, allowedRoles, router, pathname, requiredRole]);

  return { user, loading, authorized: user ? allowedRoles.includes(user.role) : false };
}
