'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home, Map, Plus, List, Trophy, LayoutDashboard, BarChart3,
  LogIn, LogOut, Shield, Menu, X, Building, Building2, HardHat,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { NAV_ITEMS, AUTHORITY_NAV, DEPARTMENT_NAV, WORKER_NAV } from '@/constants';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  Home, Map, Plus, List, Trophy, LayoutDashboard, BarChart3, Building, Building2, HardHat,
};

export function Navbar() {
  const pathname = usePathname();
  const { user, signIn, signOut, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await signIn();
    } catch (error: any) {
      console.error('Sign in error:', error?.message);
    } finally {
      setSigningIn(false);
    }
  };

  const isAuthority = user?.role === 'authority' || user?.role === 'admin';
  const isDepartment = user?.role === 'department';
  const isWorker = user?.role === 'worker';

  let roleNav: typeof NAV_ITEMS = [];
  if (isAuthority) roleNav = AUTHORITY_NAV;
  else if (isDepartment) roleNav = DEPARTMENT_NAV;
  else if (isWorker) roleNav = WORKER_NAV;

  const navItems = isWorker ? WORKER_NAV : [...NAV_ITEMS, ...roleNav];

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:block">
              Community <span className="gradient-text">Hero</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon];
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                      active
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted hover:text-foreground hover:bg-white/5'
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {item.label}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {!loading && user && <NotificationBell />}
            {!loading && (
              user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium">{user.displayName}</p>
                    <p className="text-xs text-muted">{user.points} pts</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={signOut}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button onClick={handleSignIn} size="sm" disabled={signingIn}>
                  <LogIn className="w-4 h-4" />
                  {signingIn ? 'Signing in...' : 'Sign In'}
                </Button>
              )
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="md:hidden pb-4 space-y-1"
          >
            {navItems.map((item) => {
              const Icon = iconMap[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
                    pathname === item.href ? 'bg-primary/20 text-primary' : 'text-muted'
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </Link>
              );
            })}
          </motion.nav>
        )}
      </div>
    </header>
  );
}
