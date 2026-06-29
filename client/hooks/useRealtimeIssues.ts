'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  doc,
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
import { Issue } from '@/lib/api';

export function useRealtimeIssues(filters?: { reporterId?: string }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    let q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'), limit(100));
    if (filters?.reporterId) {
      q = query(
        collection(db, 'issues'),
        where('reporterId', '==', filters.reporterId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setIssues(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Issue)));
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsubscribe;
  }, [filters?.reporterId]);

  return { issues, loading };
}

export function useRealtimeIssue(id: string) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured() || !id) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'issues', id),
      (snapshot) => {
        if (snapshot.exists()) {
          setIssue({ id: snapshot.id, ...snapshot.data() } as Issue);
        } else {
          setIssue(null);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsubscribe;
  }, [id]);

  return { issue, loading };
}
