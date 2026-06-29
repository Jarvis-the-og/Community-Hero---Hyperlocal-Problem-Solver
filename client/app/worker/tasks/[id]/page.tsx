'use client';

import { use, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  MapPin, Navigation, Camera, CheckCircle, Play, Pause, Loader2, ArrowLeft, Sparkles,
} from 'lucide-react';
import { api, Issue } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { IssueCardSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/empty-state';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/constants';

export default function WorkerTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuth();
  const { authorized } = useRoleGuard('worker');
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [aiResult, setAiResult] = useState<string | null>(null);
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { issue: data } = await api.getWorkerTask(id, token);
      setIssue(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized && token) load();
  }, [authorized, token, id]);

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      const { issue: updated } = await api.workerUpdateTask(id, action, notes || undefined, token);
      setIssue(updated);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const { issue: updated, aiVerification } = await api.workerUploadImages(id, type, Array.from(files), notes || undefined, token);
      setIssue(updated);
      if (aiVerification) {
        setAiResult(`${aiVerification.status} (${Math.round(aiVerification.confidence * 100)}% confidence): ${aiVerification.analysis}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const navigateToLocation = () => {
    if (!issue?.location) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${issue.location.lat},${issue.location.lng}`,
      '_blank'
    );
  };

  if (loading) return <div className="max-w-lg mx-auto px-4 py-6"><IssueCardSkeleton /></div>;
  if (error) return <div className="max-w-lg mx-auto px-4 py-6"><ErrorState message={error} onRetry={load} /></div>;
  if (!issue) return null;

  const isComplete = ['completed', 'ai_verified'].includes(issue.status);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-28">
      <Link href="/worker" className="text-sm text-muted hover:text-primary flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> All Tasks
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex gap-2 mb-3">
          <Badge variant={issue.priority as 'critical' | 'medium' | 'low'}>{issue.priority}</Badge>
          <Badge variant="info">{CATEGORY_LABELS[issue.category]}</Badge>
        </div>

        <h1 className="text-xl font-bold mb-2">{issue.title}</h1>
        <p className="text-sm text-muted mb-4">{issue.description}</p>

        <Card className="p-4 mb-4">
          <p className="text-sm flex items-start gap-2 mb-3">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            {issue.location?.address}
          </p>
          <Button className="w-full" variant="secondary" onClick={navigateToLocation}>
            <Navigation className="w-4 h-4" /> Navigate to Location
          </Button>
        </Card>

        {!isComplete && (
          <>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Work notes (optional)..."
              className="mb-4 min-h-[72px]"
            />

            <div className="grid grid-cols-2 gap-2 mb-4">
              {issue.status === 'assigned' && (
                <Button className="col-span-2" disabled={actionLoading} onClick={() => handleAction('start')}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Start Work
                </Button>
              )}
              {issue.status === 'in_progress' && (
                <>
                  <Button variant="outline" disabled={actionLoading} onClick={() => handleAction('pause')}>
                    <Pause className="w-4 h-4" /> Pause
                  </Button>
                  <Button variant="success" disabled={actionLoading} onClick={() => handleAction('complete')}>
                    <CheckCircle className="w-4 h-4" /> Complete
                  </Button>
                </>
              )}
              {issue.status === 'paused' && (
                <Button className="col-span-2" disabled={actionLoading} onClick={() => handleAction('start')}>
                  <Play className="w-4 h-4" /> Resume
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input ref={beforeRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e, 'before')} />
              <input ref={afterRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e, 'after')} />
              <Button variant="outline" disabled={uploading} onClick={() => beforeRef.current?.click()}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                Before Photo
              </Button>
              <Button variant="outline" disabled={uploading} onClick={() => afterRef.current?.click()}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                After Photo
              </Button>
            </div>
          </>
        )}

        {((issue.beforeImages?.length ?? 0) > 0 || (issue.afterImages?.length ?? 0) > 0) && (
          <div className="mt-4 space-y-3">
            {(issue.beforeImages?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs text-muted mb-1">Before</p>
                <div className="flex gap-2 overflow-x-auto">
                  {issue.beforeImages!.map((url, i) => (
                    <img key={i} src={url} alt="Before" className="h-24 rounded-lg object-cover" />
                  ))}
                </div>
              </div>
            )}
            {(issue.afterImages?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs text-muted mb-1">After</p>
                <div className="flex gap-2 overflow-x-auto">
                  {issue.afterImages!.map((url, i) => (
                    <img key={i} src={url} alt="After" className="h-24 rounded-lg object-cover" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {aiResult && (
          <Card className="p-3 mt-4 text-sm">
            <p className="flex items-center gap-2 font-medium mb-1">
              <Sparkles className="w-4 h-4 text-accent" /> AI Verification
            </p>
            <p className="text-muted">{aiResult}</p>
          </Card>
        )}

        {isComplete && (
          <Card className="p-4 mt-4 text-center">
            <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="font-medium">Task Completed</p>
            <p className="text-sm text-muted">{STATUS_LABELS[issue.status]}</p>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
