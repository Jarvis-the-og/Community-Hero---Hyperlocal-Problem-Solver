'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/utils';

export function NotificationBell() {
  const { notifications, unreadCount, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} className="relative">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-white text-[10px] rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto glass-card !bg-background/95 !backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-50"
          >
            <div className="p-3 border-b border-white/10">
              <p className="font-semibold text-sm">Notifications</p>
            </div>
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-muted text-center">No notifications</p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={`p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                  onClick={() => markRead(n.id)}
                >
                  {n.issueId ? (
                    <Link href={`/issues/${n.issueId}`} onClick={() => setOpen(false)}>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted mt-1">{formatRelativeTime(n.createdAt)}</p>
                    </Link>
                  ) : (
                    <>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted mt-0.5">{n.message}</p>
                    </>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
