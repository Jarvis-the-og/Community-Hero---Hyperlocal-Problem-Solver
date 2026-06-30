'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle, Clock, Users, Building2, Sparkles, MapPin,
} from 'lucide-react';
import { api, AdminDashboard } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { StatCard } from '@/components/dashboard/StatCard';
import { AnalyticsChart } from '@/components/dashboard/AuthorityIssueCard';
import { StatsSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty-state';
import { IssueMap } from '@/components/map/IssueMap';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_LOCATION } from '@/constants';
import { useDeployment } from '@/hooks/useDeployment';

export default function AdminPage() {
  const deploy = useDeployment();
  const { token } = useAuth();
  const { authorized, loading: authLoading } = useRoleGuard('admin', 'authority');
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.getAdminDashboard(token);
      setDashboard(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized && token) load();
  }, [authorized, token]);

  if (authLoading || loading) return <div className="max-w-7xl mx-auto px-4 py-8"><StatsSkeleton /></div>;
  if (!authorized) return null;
  if (error) return <div className="max-w-7xl mx-auto px-4 py-8"><ErrorState message={error} onRetry={load} /></div>;
  if (!dashboard) return null;

  const { analytics, mapData } = dashboard;
  const filteredMap = mapData.filter((m) => {
    if (deptFilter && m.department !== deptFilter) return false;
    if (priorityFilter && m.priority !== priorityFilter) return false;
    return true;
  });

  const mapIssues = filteredMap.map((m) => ({
    id: m.id,
    title: m.title,
    category: m.category,
    priority: m.priority,
    status: m.status,
    location: { lat: m.lat, lng: m.lng },
    description: '',
    severity: m.priority,
    reporterId: '',
    reporterName: '',
    mediaUrls: [],
    aiConfidence: 0,
    supportCount: 0,
    verificationScore: 0,
    createdAt: '',
    updatedAt: '',
  }));

  const mapCenter = filteredMap[0]
    ? { lat: filteredMap[0].lat, lng: filteredMap[0].lng }
    : DEFAULT_LOCATION;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">{deploy.authorityName}</h1>
        </div>
        <p className="text-muted mb-8">City-wide governance dashboard</p>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Total Complaints" value={analytics.totalIssues} icon={AlertTriangle} index={0} />
          <StatCard label="Active" value={analytics.activeIssues ?? 0} icon={Clock} color="text-warning" index={1} />
          <StatCard label="Resolved" value={analytics.resolvedIssues} icon={CheckCircle} color="text-success" index={2} />
          <StatCard label="Critical" value={analytics.criticalCount} icon={AlertTriangle} color="text-destructive" index={3} />
          <StatCard label="Avg Resolution" value={`${analytics.avgRepairTimeHours}h`} icon={Clock} index={4} />
          <StatCard
            label="Citizen Satisfaction"
            value={analytics.citizenSatisfaction != null ? `${analytics.citizenSatisfaction}%` : 'N/A'}
            icon={Users}
            index={5}
          />
        </div>

        {analytics.aiInsights && analytics.aiInsights.length > 0 && (
          <div className="glass-card p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" /> AI Insights
            </h3>
            <ul className="space-y-2">
              {analytics.aiInsights.map((insight, i) => (
                <li key={i} className="text-sm text-muted flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="glass-card p-4 mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Live City Map
            </h3>
            <div className="flex gap-2 flex-wrap">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-secondary text-sm rounded-lg px-2 py-1 border border-white/10"
              >
                <option value="">All Departments</option>
                {Object.keys(analytics.departmentBreakdown || {}).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-secondary text-sm rounded-lg px-2 py-1 border border-white/10"
              >
                <option value="">All Priority</option>
                <option value="critical">Critical</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <IssueMap issues={mapIssues} center={mapCenter} zoom={12} height="400px" showUserLocation={false} />
          <p className="text-xs text-muted mt-2">{filteredMap.length} markers shown</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {analytics.departmentBreakdown && (
            <AnalyticsChart data={analytics.departmentBreakdown} title="Department Distribution" />
          )}
          {analytics.wardBreakdown && Object.keys(analytics.wardBreakdown).length > 1 && (
            <AnalyticsChart data={analytics.wardBreakdown} title="Ward Distribution" />
          )}
        </div>

        {analytics.departmentPerformance && analytics.departmentPerformance.length > 0 && (
          <div className="glass-card p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Department Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted border-b border-white/10">
                    <th className="text-left py-2">Department</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">Resolved</th>
                    <th className="text-right py-2">Pending</th>
                    <th className="text-right py-2">Rate</th>
                    <th className="text-right py-2">Avg Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.departmentPerformance
                    .sort((a, b) => b.resolutionRate - a.resolutionRate)
                    .map((dept, i) => (
                      <tr key={dept.name} className="border-b border-white/5">
                        <td className="py-2 flex items-center gap-2">
                          {i === 0 && <Badge variant="success">Top</Badge>}
                          {dept.name}
                        </td>
                        <td className="text-right py-2">{dept.total}</td>
                        <td className="text-right py-2">{dept.resolved}</td>
                        <td className="text-right py-2">{dept.pending}</td>
                        <td className="text-right py-2">{dept.resolutionRate}%</td>
                        <td className="text-right py-2">{dept.avgHours}h</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {analytics.peakReportingHours && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Peak Reporting Times</h3>
            <div className="flex items-end gap-1 h-24">
              {analytics.peakReportingHours.map(({ hour, count }) => {
                const max = Math.max(...analytics.peakReportingHours!.map((h) => h.count), 1);
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary/60 rounded-t"
                      style={{ height: `${(count / max) * 100}%`, minHeight: count ? '2px' : '0' }}
                    />
                    <span className="text-[9px] text-muted">{hour}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
