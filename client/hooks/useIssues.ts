'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, Issue } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export function useIssues(
  params?: Record<string, string>,
  options?: { enabled?: boolean }
) {
  const { token, loading: authLoading } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const enabled = options?.enabled ?? true;
  const queryString = useMemo(() => {
    if (!params) return '';
    return new URLSearchParams(
      Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
    ).toString();
  }, [params]);

  const fetchIssues = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!enabled) {
      setIssues([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (!token) {
      setIssues([]);
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      const queryParams = queryString
        ? Object.fromEntries(new URLSearchParams(queryString))
        : undefined;
      const { issues: data } = await api.getIssues(queryParams, token);
      setIssues(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  }, [authLoading, enabled, queryString, token]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  return { issues, loading, error, refetch: fetchIssues };
}

export function useNearbyIssues(lat: number, lng: number, radius = 5, enabled = true) {
  const { token } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setIssues([]);
      setLoading(false);
      return;
    }
    if (!lat || !lng) return;
    if (!token) {
      setIssues([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getNearbyIssues(lat, lng, radius, token)
      .then(({ issues: data }) => setIssues(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [enabled, lat, lng, radius, token]);

  return { issues, loading };
}

export function useIssue(id: string) {
  const { token } = useAuth();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    if (!token) {
      setIssue(null);
      setLoading(false);
      return;
    }
    api.getIssue(id, token)
      .then(({ issue: data }) => setIssue(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, token]);

  return { issue, loading };
}
