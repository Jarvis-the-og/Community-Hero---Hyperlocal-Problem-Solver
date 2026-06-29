'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, Notification } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export function useNotifications(pollInterval = 60000) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      const { notifications: data } = await api.getNotifications(token);
      setNotifications(data);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
    if (!token) return;
    const interval = setInterval(refresh, pollInterval);
    return () => clearInterval(interval);
  }, [refresh, pollInterval, token]);

  const markRead = async (id: string) => {
    if (!token) return;
    await api.markNotificationRead(id, token);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, loading, unreadCount, refresh, markRead };
}
