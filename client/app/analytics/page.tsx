'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, Analytics } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { StatCard } from '@/components/dashboard/StatCard';
import { AnalyticsChart } from '@/components/dashboard/AuthorityIssueCard';
import { StatsSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty-state';
import { BarChart3, CheckCircle, Clock, Users } from 'lucide-react';

export default function AnalyticsPage() {
  const { token } = useAuth();
  const { authorized } = useRoleGuard('authority', 'admin', 'department');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { analytics: data } = await api.getAnalytics(token);
      setAnalytics(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized && token) load();
  }, [authorized, token]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <StatsSkeleton />
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

  if (!analytics) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-muted mb-8">Community issue insights and trends</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Issues" value={analytics.totalIssues} icon={BarChart3} index={0} />
          <StatCard label="Resolution Rate" value={`${analytics.resolutionRate}%`} icon={CheckCircle} color="text-success" index={1} />
          <StatCard label="Avg Repair Time" value={`${analytics.avgRepairTimeHours}h`} icon={Clock} color="text-warning" index={2} />
          <StatCard label="Active Users" value={analytics.activeUsers} icon={Users} index={3} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <AnalyticsChart data={analytics.categoryBreakdown} title="Issues by Category" />

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Priority Distribution</h3>
            <div className="space-y-4">
              {[
                { label: 'Critical', value: analytics.criticalCount, color: 'bg-red-500' },
                { label: 'Medium', value: analytics.mediumCount, color: 'bg-orange-500' },
                { label: 'Low', value: analytics.lowCount, color: 'bg-green-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="flex-1 text-sm">{item.label}</span>
                  <span className="font-bold">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-muted">Most Common Issue</p>
              <p className="text-lg font-semibold capitalize mt-1">
                {analytics.mostCommonIssue.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        </div>

        {analytics.issueTrends && (
          <div className="mt-8 glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Issue Trends (7 days)</h3>
            <div className="flex items-end gap-2 h-32">
              {Object.entries(analytics.issueTrends).map(([date, count]) => {
                const max = Math.max(...Object.values(analytics.issueTrends!), 1);
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-gradient-to-t from-primary to-accent rounded-t transition-all duration-500"
                      style={{ height: `${(count / max) * 100}%`, minHeight: count ? '4px' : '0' }}
                    />
                    <span className="text-[10px] text-muted">{date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {analytics.topContributors && analytics.topContributors.length > 0 && (
          <div className="mt-8 glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Top Contributors</h3>
            <div className="space-y-3">
              {analytics.topContributors.map((contributor, i) => (
                <div key={contributor.id} className="flex items-center gap-4">
                  <span className="text-lg font-bold text-muted w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium">{contributor.displayName}</p>
                    <p className="text-xs text-muted">Trust score: {contributor.trustScore}%</p>
                  </div>
                  <span className="font-bold text-primary">{contributor.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
