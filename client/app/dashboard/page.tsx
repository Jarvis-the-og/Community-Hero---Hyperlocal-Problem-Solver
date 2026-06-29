'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, DashboardData } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { AuthorityIssueCard } from '@/components/dashboard/AuthorityIssueCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatsSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty-state';
import { AlertTriangle, Clock, CheckCircle, Eye, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { token, user, signIn } = useAuth();
  const { loading: authLoading, authorized } = useRoleGuard('authority', 'admin');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboard(token);
      setDashboard(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized && token) load();
    else if (!authLoading && !user) setLoading(false);
  }, [authorized, token, authLoading, user]);

  const handleStatusUpdate = async (id: string, status: string) => {
    await api.updateIssueStatus(id, { status }, token);
    await load();
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <StatsSkeleton />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center glass-card p-12">
        <LogIn className="w-12 h-12 text-muted mx-auto mb-3" />
        <p className="text-muted mb-4">Sign in with authority access to view the dashboard.</p>
        <Button onClick={signIn}>Sign In</Button>
      </div>
    );
  }

  if (!authorized) return null;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-2">Authority Dashboard</h1>
        <p className="text-muted mb-8">Manage and resolve community issues</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Active" value={dashboard.stats.total} icon={Eye} index={0} />
          <StatCard label="Critical" value={dashboard.stats.critical} icon={AlertTriangle} color="text-destructive" index={1} />
          <StatCard label="In Progress" value={dashboard.stats.inProgress} icon={Clock} color="text-warning" index={2} />
          <StatCard label="Pending Verify" value={dashboard.stats.pendingVerification} icon={CheckCircle} color="text-accent" index={3} />
        </div>

        {[
          { label: 'Critical Issues', issues: dashboard.critical, color: 'border-red-500/20' },
          { label: 'Medium Priority', issues: dashboard.medium, color: 'border-orange-500/20' },
          { label: 'Low Priority', issues: dashboard.low, color: 'border-green-500/20' },
        ].map((section) => (
          <section key={section.label} className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{section.label}</h2>
            {section.issues.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {section.issues.map((issue) => (
                  <AuthorityIssueCard
                    key={issue.id}
                    issue={issue}
                    onAssign={(id) => handleStatusUpdate(id, 'assigned')}
                    onStartWork={(id) => handleStatusUpdate(id, 'in_progress')}
                    onResolve={(id) => handleStatusUpdate(id, 'completed')}
                    onRefresh={load}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm">No issues in this category</p>
            )}
          </section>
        ))}
      </motion.div>
    </div>
  );
}
