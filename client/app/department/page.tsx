'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  AlertTriangle, CheckCircle, Clock, XCircle, ArrowUp, Loader2,
} from 'lucide-react';
import { api, DepartmentDashboard, Issue } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatsSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/constants';
import { List } from 'lucide-react';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'escalated', label: 'Escalated' },
];

export default function DepartmentPage() {
  const { token, user } = useAuth();
  const { loading: authLoading, authorized } = useRoleGuard('department', 'authority', 'admin');
  const [dashboard, setDashboard] = useState<DepartmentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const data = await api.getDepartmentDashboard(params, token);
      setDashboard(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load department dashboard');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, priorityFilter]);

  useEffect(() => {
    if (authorized && token) load();
  }, [authorized, token, load]);

  if (authLoading || (loading && !dashboard)) {
    return <div className="max-w-7xl mx-auto px-4 py-8"><StatsSkeleton /></div>;
  }

  if (!authorized) return null;

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ErrorState message={error} onRetry={load} />
    </div>
  );

  if (!dashboard) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-1">{dashboard.department}</h1>
        <p className="text-muted mb-8">
          Department dashboard · {user?.displayName}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          <StatCard label="Total" value={dashboard.stats.total} icon={AlertTriangle} index={0} />
          <StatCard label="Pending" value={dashboard.stats.pending} icon={Clock} color="text-warning" index={1} />
          <StatCard label="Accepted" value={dashboard.stats.accepted} icon={CheckCircle} index={2} />
          <StatCard label="In Progress" value={dashboard.stats.inProgress} icon={Loader2} color="text-accent" index={3} />
          <StatCard label="Completed" value={dashboard.stats.completed} icon={CheckCircle} color="text-success" index={4} />
          <StatCard label="Rejected" value={dashboard.stats.rejected} icon={XCircle} color="text-destructive" index={5} />
          <StatCard label="Escalated" value={dashboard.stats.escalated} icon={ArrowUp} color="text-destructive" index={6} />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={statusFilter === tab.key ? 'default' : 'outline'}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {['', 'critical', 'medium', 'low'].map((p) => (
            <Button
              key={p}
              size="sm"
              variant={priorityFilter === p ? 'secondary' : 'ghost'}
              onClick={() => setPriorityFilter(p)}
            >
              {p || 'All Priority'}
            </Button>
          ))}
        </div>

        {dashboard.issues.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {dashboard.issues.map((issue) => (
              <DepartmentIssueRow key={issue.id} issue={issue} />
            ))}
          </div>
        ) : (
          <EmptyState icon={List} title="No complaints match your filters" />
        )}
      </motion.div>
    </div>
  );
}

function DepartmentIssueRow({ issue }: { issue: Issue }) {
  return (
    <Link href={`/department/${issue.id}`} className="glass-card p-4 block hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Badge variant={issue.priority as 'critical' | 'medium' | 'low'}>{issue.priority}</Badge>
        <Badge variant="info">{CATEGORY_LABELS[issue.category]}</Badge>
        <Badge>{STATUS_LABELS[issue.status]}</Badge>
      </div>
      <h4 className="font-semibold">{issue.title}</h4>
      <p className="text-xs text-muted mt-1 line-clamp-1">{issue.location?.address}</p>
      {issue.aiSummary && (
        <p className="text-xs text-muted mt-2 bg-white/5 rounded p-2 line-clamp-2">AI: {issue.aiSummary}</p>
      )}
    </Link>
  );
}
