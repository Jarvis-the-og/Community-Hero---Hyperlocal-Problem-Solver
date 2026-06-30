'use client';

import { use, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, ThumbsUp, MessageSquare, CheckCircle, XCircle, Loader2,
} from 'lucide-react';
import { useIssue as useApiIssue } from '@/hooks/useIssues';
import { useRealtimeIssue } from '@/hooks/useRealtimeIssues';
import { isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { api, Comment, Verification } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { IssueTimeline } from '@/components/issue/IssueTimeline';
import { IssueMap } from '@/components/map/IssueMap';
import { IssueCardSkeleton } from '@/components/ui/skeleton';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/constants';
import { formatRelativeTime } from '@/lib/utils';
import { useEffect } from 'react';

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const apiResult = useApiIssue(id);
  const realtimeResult = useRealtimeIssue(id);
  const useRealtime = isFirebaseConfigured();
  const issue = useRealtime ? realtimeResult.issue ?? apiResult.issue : apiResult.issue;
  const loading = useRealtime ? realtimeResult.loading && apiResult.loading : apiResult.loading;
  const { token, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!id) return;
    // Silently ignore index-building or auth errors — these resolve on their own
    api.getComments(id, token).then(({ comments: c }) => setComments(c)).catch(() => {});
    api.getVerifications(id, token).then(({ verifications: v }) => setVerifications(v)).catch(() => {});
  }, [id, token]);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8"><IssueCardSkeleton /></div>;
  if (!issue) return <div className="max-w-4xl mx-auto px-4 py-8 text-center text-muted">Issue not found</div>;

  const isReporter = user?.id === issue.reporterId;

  const handleSupport = async () => {
    setSubmitting(true);
    try {
      await api.supportIssue(issue.id, token);
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (status: string) => {
    setVerifying(true);
    try {
      await api.submitVerification(issue.id, status, undefined, undefined, token);
      window.location.reload();
    } finally {
      setVerifying(false);
    }
  };

  const handleCitizenConfirm = async (confirmed: boolean) => {
    setVerifying(true);
    try {
      await api.confirmResolution(issue.id, confirmed, undefined, token);
      window.location.reload();
    } finally {
      setVerifying(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    setVerifying(true);
    try {
      await api.updateIssueStatus(issue.id, { status }, token);
      window.location.reload();
    } finally {
      setVerifying(false);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const { comment } = await api.addComment(issue.id, newComment, token);
      setComments([comment, ...comments]);
      setNewComment('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Badge variant={issue.priority as 'critical' | 'medium' | 'low'}>{issue.priority}</Badge>
          <Badge variant="info">{CATEGORY_LABELS[issue.category]}</Badge>
          <Badge>{STATUS_LABELS[issue.status]}</Badge>
        </div>

        <h1 className="text-3xl font-bold mb-2">{issue.title}</h1>
        <p className="text-muted flex items-center gap-2 mb-6">
          <MapPin className="w-4 h-4" />
          {issue.location?.address} · {formatRelativeTime(issue.createdAt)}
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            {issue.mediaUrls?.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {issue.mediaUrls.map((url, i) => (
                  <img key={i} src={url} alt="" className="rounded-lg w-full h-36 object-cover" />
                ))}
              </div>
            )}

            <Card className="p-4">
              <p className="text-foreground/90">{issue.description}</p>
              {issue.aiSummary && (
                <p className="text-sm text-muted mt-3 pt-3 border-t border-white/5">
                  AI Summary: {issue.aiSummary}
                </p>
              )}
            </Card>

            <div className="flex gap-2 flex-wrap">
              {/* Other users: support and verify */}
              {!isReporter && (
                <Button variant="secondary" onClick={handleSupport}>
                  <ThumbsUp className="w-4 h-4" />
                  Support ({issue.supportCount})
                </Button>
              )}
              {!isReporter && ['ai_categorized', 'reported'].includes(issue.status) && (
                <>
                  <Button variant="success" onClick={() => handleVerify('confirmed')} disabled={verifying}>
                    <CheckCircle className="w-4 h-4" /> Confirm
                  </Button>
                  <Button variant="destructive" onClick={() => handleVerify('rejected')} disabled={verifying}>
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </>
              )}
              {/* Reporter: confirm resolution when completed */}
              {isReporter && issue.status === 'completed' && issue.citizenConfirmed == null && (
                <div className="w-full glass-card p-4 space-y-2">
                  <p className="text-sm font-medium">Has this issue been resolved?</p>
                  <div className="flex gap-2">
                    <Button variant="success" onClick={() => handleCitizenConfirm(true)} disabled={verifying}>
                      <CheckCircle className="w-4 h-4" /> Yes, Resolved
                    </Button>
                    <Button variant="destructive" onClick={() => handleCitizenConfirm(false)} disabled={verifying}>
                      <XCircle className="w-4 h-4" /> Still Unresolved
                    </Button>
                  </div>
                </div>
              )}
              {/* Reporter only: mark resolved or cancel (before dept completes) */}
              {isReporter && !['completed', 'ai_verified', 'rejected'].includes(issue.status) && (
                <>
                  <Button variant="success" onClick={() => handleStatusUpdate('completed')} disabled={verifying}>
                    <CheckCircle className="w-4 h-4" /> Mark Resolved
                  </Button>
                  <Button variant="destructive" onClick={() => handleStatusUpdate('rejected')} disabled={verifying}>
                    <XCircle className="w-4 h-4" /> Cancel Report
                  </Button>
                </>
              )}
            </div>
          </div>

          <IssueMap
            issues={[issue]}
            center={{ lat: issue.location.lat, lng: issue.location.lng }}
            zoom={16}
            height="250px"
            showUserLocation={false}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Timeline</h3>
            <IssueTimeline timeline={issue.timeline || []} currentStatus={issue.status} />
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Comments
              </h3>
              <div className="flex gap-2 mb-4">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="min-h-[60px]"
                />
                <Button onClick={handleComment} disabled={submitting} size="icon" className="shrink-0">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '→'}
                </Button>
              </div>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="bg-white/5 rounded-lg p-3">
                    <p className="text-sm font-medium">{c.userName}</p>
                    <p className="text-sm text-muted mt-1">{c.content}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-sm text-muted text-center py-4">No comments yet</p>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Verification History</h3>
              <p className="text-xs text-muted mb-3">Community trust score: {issue.verificationScore}%</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {verifications.map((v) => (
                  <div key={v.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <span className="text-sm capitalize">{v.status}</span>
                    <span className="text-xs text-muted">{formatRelativeTime(v.createdAt)}</span>
                  </div>
                ))}
                {verifications.length === 0 && (
                  <p className="text-sm text-muted text-center py-4">No verifications yet</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
