'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Issue } from '@/lib/api';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CATEGORY_LABELS } from '@/constants';
import { MapPin, Users, Clock, Camera, Sparkles, Loader2 } from 'lucide-react';

interface AuthorityIssueCardProps {
  issue: Issue;
  onAssign?: (id: string) => void;
  onStartWork?: (id: string) => void;
  onResolve?: (id: string) => void;
  onRefresh?: () => void;
}

export function AuthorityIssueCard({
  issue,
  onAssign,
  onStartWork,
  onResolve,
  onRefresh,
}: AuthorityIssueCardProps) {
  const { token } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      await api.uploadResolutionImages(issue.id, type, Array.from(files), token);
      onRefresh?.();
    } finally {
      setUploading(false);
    }
  };

  const handleAiVerify = async () => {
    setVerifying(true);
    try {
      await api.verifyResolution(issue.id, token);
      onRefresh?.();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={issue.priority as 'critical' | 'medium' | 'low'}>
              {issue.priority}
            </Badge>
            <Badge variant="info">{CATEGORY_LABELS[issue.category]}</Badge>
          </div>
          <Link href={`/issues/${issue.id}`}>
            <h4 className="font-semibold hover:text-primary transition-colors">{issue.title}</h4>
          </Link>
        </div>
      </div>

      {issue.aiSummary && (
        <p className="text-xs text-muted bg-white/5 rounded-lg p-2 mb-3 line-clamp-2">
          AI: {issue.aiSummary}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-muted mb-3">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {issue.location?.address?.split(',')[0]}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {issue.verificationScore}% verified
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {issue.supportCount} supports
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {issue.status === 'community_verified' && onAssign && (
          <Button size="sm" variant="secondary" onClick={() => onAssign(issue.id)}>
            Assign
          </Button>
        )}
        {issue.status === 'assigned' && onStartWork && (
          <Button size="sm" onClick={() => onStartWork(issue.id)}>
            Start Work
          </Button>
        )}
        {issue.status === 'in_progress' && onResolve && (
          <Button size="sm" variant="success" onClick={() => onResolve(issue.id)}>
            Mark Resolved
          </Button>
        )}
        {issue.status === 'in_progress' && (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'after')} />
            <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              After Photo
            </Button>
          </>
        )}
        {issue.status === 'completed' && (
          <Button size="sm" variant="secondary" disabled={verifying} onClick={handleAiVerify}>
            {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI Verify
          </Button>
        )}
        <Link href={`/issues/${issue.id}`}>
          <Button size="sm" variant="outline">View Details</Button>
        </Link>
      </div>
    </Card>
  );
}

export function AnalyticsChart({ data, title }: { data: Record<string, number>; title: string }) {
  const max = Math.max(...Object.values(data), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="font-medium">{value}</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
