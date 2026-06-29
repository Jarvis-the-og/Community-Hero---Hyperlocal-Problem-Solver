'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useIssues } from '@/hooks/useIssues';
import { IssueCard } from '@/components/issue/IssueCard';
import { IssueCardSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, List, LogIn } from 'lucide-react';

export default function MyIssuesPage() {
  const { user, loading: authLoading, signIn } = useAuth();
  const issueFilters = useMemo(
    () => (user ? { reporterId: user.id } : undefined),
    [user?.id]
  );
  const { issues, loading, error } = useIssues(
    issueFilters,
    { enabled: !!user }
  );
  const isLoading = authLoading || loading;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">My Issues</h1>
      <p className="text-muted mb-8">Track your reported community issues</p>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <IssueCardSkeleton key={i} />)
        ) : !user ? (
          <div className="glass-card p-12 text-center">
            <LogIn className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted mb-5">Sign in to track the issues you reported.</p>
            <Button onClick={signIn}>Sign In</Button>
          </div>
        ) : error ? (
          <div className="glass-card p-12 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <p className="text-muted">{error}</p>
          </div>
        ) : issues.length > 0 ? (
          issues.map((issue, i) => <IssueCard key={issue.id} issue={issue} index={i} />)
        ) : (
          <div className="glass-card p-12 text-center">
            <List className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted">You haven&apos;t reported any issues yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
