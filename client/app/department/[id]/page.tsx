'use client';

import { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  MapPin, Loader2, Users, AlertTriangle, MessageSquare, ArrowLeft,
} from 'lucide-react';
import { api, DepartmentIssueDetail } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { IssueTimeline } from '@/components/issue/IssueTimeline';
import { IssueMap } from '@/components/map/IssueMap';
import { IssueCardSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty-state';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/constants';

export default function DepartmentIssuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuth();
  const { authorized } = useRoleGuard('department', 'authority', 'admin');
  const [data, setData] = useState<DepartmentIssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [workerId, setWorkerId] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [dashboard, setDashboard] = useState<{ workers: Array<{ id: string; displayName: string }> } | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [issueData, dash] = await Promise.all([
        api.getDepartmentIssue(id, token),
        api.getDepartmentDashboard({}, token),
      ]);
      setData(issueData);
      setDashboard(dash);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized && token) load();
  }, [authorized, token, id]);

  const handleAction = async (action: string, extra?: Record<string, string>) => {
    setActionLoading(true);
    try {
      await api.departmentAction(id, action, extra, token);
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleInternalComment = async () => {
    if (!internalNote.trim()) return;
    await api.addInternalComment(id, internalNote, token);
    setInternalNote('');
    await load();
  };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-8"><IssueCardSkeleton /></div>;
  if (error) return <div className="max-w-5xl mx-auto px-4 py-8"><ErrorState message={error} onRetry={load} /></div>;
  if (!data) return null;

  const { issue, verifications, internalComments, similarIssues } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/department" className="text-sm text-muted hover:text-primary flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Department
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant={issue.priority as 'critical' | 'medium' | 'low'}>{issue.priority}</Badge>
          <Badge variant="info">{CATEGORY_LABELS[issue.category]}</Badge>
          <Badge>{STATUS_LABELS[issue.status]}</Badge>
          {issue.department && <Badge variant="info">{issue.department}</Badge>}
        </div>

        <h1 className="text-2xl font-bold mb-6">{issue.title}</h1>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            {issue.mediaUrls?.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {issue.mediaUrls.map((url, i) => (
                  <img key={i} src={url} alt="" className="rounded-lg w-full h-32 object-cover" />
                ))}
              </div>
            )}

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Citizen Report</h3>
              <p className="text-sm">{issue.description}</p>
              {issue.aiSummary && (
                <p className="text-sm text-muted mt-3 pt-3 border-t border-white/5">
                  <strong>AI Summary:</strong> {issue.aiSummary}
                </p>
              )}
            </Card>

            <Card className="p-4 space-y-2 text-sm">
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {issue.location?.address}</p>
              <p>Confidence: {Math.round((issue.aiConfidence || 0) * 100)}%</p>
              <p>Verification: {issue.verificationScore}%</p>
              {(issue.hazards?.length ?? 0) > 0 && (
                <p className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                  {issue.hazards!.join(', ')}
                </p>
              )}
            </Card>

            <div className="flex flex-wrap gap-2">
              {['community_verified', 'ai_categorized', 'escalated'].includes(issue.status) && (
                <>
                  <Button size="sm" disabled={actionLoading} onClick={() => handleAction('accept')}>Accept</Button>
                  <Button size="sm" variant="destructive" disabled={actionLoading} onClick={() => handleAction('reject')}>Reject</Button>
                </>
              )}
              {['assigned', 'community_verified'].includes(issue.status) && (
                <div className="flex gap-2 items-center flex-wrap">
                  <select
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    className="h-8 text-xs bg-secondary border border-white/10 rounded px-2 min-w-[140px]"
                  >
                    <option value="">Select Worker...</option>
                    {dashboard?.workers?.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.displayName}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={actionLoading || !workerId}
                    onClick={() => handleAction('assign', { assignedTo: workerId, assignedWorkerName: dashboard?.workers.find(w => w.id === workerId)?.displayName || 'Worker' })}
                  >
                    Assign Worker
                  </Button>
                </div>
              )}
              {issue.status === 'assigned' && (
                <Button size="sm" disabled={actionLoading} onClick={() => handleAction('start')}>Start Work</Button>
              )}
              {issue.status === 'in_progress' && (
                <>
                  <Button size="sm" disabled={actionLoading} onClick={() => handleAction('pause')}>Pause</Button>
                  <Button size="sm" variant="success" disabled={actionLoading} onClick={() => handleAction('complete')}>Mark Completed</Button>
                </>
              )}
              {issue.status === 'paused' && (
                <Button size="sm" disabled={actionLoading} onClick={() => handleAction('start')}>Resume Work</Button>
              )}
              {!['rejected', 'ai_verified'].includes(issue.status) && (
                <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => handleAction('escalate')}>Escalate</Button>
              )}
            </div>
          </div>

          <IssueMap
            issues={[issue, ...similarIssues]}
            center={{ lat: issue.location.lat, lng: issue.location.lng }}
            zoom={15}
            height="280px"
            showUserLocation={false}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Timeline</h3>
            <IssueTimeline timeline={issue.timeline || []} currentStatus={issue.status} />
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Internal Comments
            </h3>
            <div className="flex gap-2 mb-4">
              <Textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Internal note..." className="min-h-[60px]" />
              <Button size="icon" onClick={handleInternalComment} disabled={!internalNote.trim()}>→</Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {internalComments.map((c) => (
                <div key={c.id} className="bg-white/5 rounded p-2 text-sm">
                  <p className="font-medium text-xs">{c.userName}</p>
                  <p className="text-muted">{c.content}</p>
                </div>
              ))}
              {internalComments.length === 0 && <p className="text-sm text-muted">No internal comments</p>}
            </div>
          </Card>
        </div>

        {similarIssues.length > 0 && (
          <Card className="p-4 mt-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Nearby Similar Complaints
            </h3>
            <div className="space-y-2">
              {similarIssues.map((s) => (
                <Link key={s.id} href={`/department/${s.id}`} className="block text-sm hover:text-primary">
                  {s.title} · {s.distance}m away · {STATUS_LABELS[s.status]}
                </Link>
              ))}
            </div>
          </Card>
        )}

        {issue.escalationHistory && issue.escalationHistory.length > 0 && (
          <Card className="p-4 mt-6">
            <h3 className="font-semibold mb-3">Escalation History</h3>
            {issue.escalationHistory.map((e, i) => (
              <div key={i} className="text-sm text-muted mb-1">
                Level {e.level}: {e.reason} · {new Date(e.timestamp).toLocaleString()}
              </div>
            ))}
          </Card>
        )}
      </motion.div>
    </div>
  );
}
